"""
AgriSense ML Microservice — Production Ready
Served via Gunicorn (wsgi.py). Do NOT run directly with python ml_service.py.
"""

import os
import sys
import logging
import contextlib

# ── Suppress TF noise BEFORE any imports ──────────────────────────────
os.environ['TF_CPP_MIN_LOG_LEVEL']  = '3'
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'
os.environ['PYTHONWARNINGS']        = 'ignore'

logging.getLogger('tensorflow').setLevel(logging.ERROR)
logging.getLogger('keras').setLevel(logging.ERROR)
logging.getLogger('absl').setLevel(logging.ERROR)


@contextlib.contextmanager
def suppress_output():
    with open(os.devnull, 'w') as devnull:
        old_stderr, old_stdout = sys.stderr, sys.stdout
        try:
            sys.stderr = devnull
            sys.stdout = devnull
            yield
        finally:
            sys.stderr = old_stderr
            sys.stdout = old_stdout


# ── TensorFlow import (silenced) ───────────────────────────────────────
with suppress_output():
    import tensorflow as tf
    tf.autograph.set_verbosity(0)
    from tensorflow import keras

# ── Standard imports ───────────────────────────────────────────────────
import io
import json
import warnings
import base64
import joblib
import traceback
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image

warnings.filterwarnings('ignore')

# ── Paths ──────────────────────────────────────────────────────────────
BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.environ.get('MODELS_DIR', os.path.join(BASE_DIR, 'ml_models'))

print(f"📁 Base directory: {BASE_DIR}")
print(f"📁 Models directory: {MODELS_DIR}")
print(f"📁 Models dir exists: {os.path.exists(MODELS_DIR)}")

app = Flask(__name__)
CORS(app)

# ══════════════════════════════════════════════════════════════════════
# CONSTANTS
# ══════════════════════════════════════════════════════════════════════
FRESH_AND_ROTTEN_CROPS = [
    'apple', 'banana', 'bellpepper', 'bittergourd', 'capsicum',
    'carrot', 'cucumber', 'mango', 'okra', 'orange',
    'potato', 'strawberry', 'tomato'
]

FRESH_ONLY_CROPS = [
    'pear', 'grapes', 'kiwi', 'watermelon', 'pomegranate',
    'pineapple', 'onion', 'lemon', 'radish', 'beetroot',
    'cabbage', 'lettuce', 'spinach', 'soybean', 'cauliflower',
    'chillipepper', 'turnip', 'corn', 'sweetcorn', 'sweetpotato',
    'paprika', 'jalapeno', 'ginger', 'garlic', 'peas', 'eggplant'
]

ALL_CROPS       = sorted(FRESH_AND_ROTTEN_CROPS + FRESH_ONLY_CROPS)
SPOILAGE_LABELS = ['0-1 days', '1-2 days', '2-4 days', '4-7 days', '7+ days']
STORAGE_TYPES   = ['freezer', 'refrigerator', 'room_temp']
IMG_SIZE        = (224, 224)

LABEL_TO_MIDPOINT = {
    '0-1 days': 0.5,
    '1-2 days': 1.5,
    '2-4 days': 3.0,
    '4-7 days': 5.5,
    '7+ days' : 10.0
}

# ══════════════════════════════════════════════════════════════════════
# LOAD MODELS AT STARTUP
# ══════════════════════════════════════════════════════════════════════

def load_models():
    """Load all models with detailed error reporting."""
    global xgb_model, scaler, le_crop, le_storage, le_label, cnn_model, CNN_CLASS_MAP
    
    import sys
    
    print("\n" + "="*70, file=sys.stderr)
    print("🔄 LOADING ML MODELS", file=sys.stderr)
    print("="*70, file=sys.stderr)
    print(f"📁 Base directory: {BASE_DIR}", file=sys.stderr)
    print(f"📁 Models directory: {MODELS_DIR}", file=sys.stderr)
    print(f"📁 Models dir exists: {os.path.exists(MODELS_DIR)}", file=sys.stderr)
    
    if not os.path.exists(MODELS_DIR):
        print(f"❌ MODELS DIRECTORY NOT FOUND: {MODELS_DIR}", file=sys.stderr)
        return
    
    # ── XGBoost and Encoders ───────────────────────────────────────────
    xgb_path      = os.path.join(MODELS_DIR, 'xgboost_spoilage.pkl')
    scaler_path   = os.path.join(MODELS_DIR, 'scaler.pkl')
    le_crop_path  = os.path.join(MODELS_DIR, 'label_encoder_crop.pkl')
    le_storage_path = os.path.join(MODELS_DIR, 'label_encoder_storage.pkl')
    le_label_path = os.path.join(MODELS_DIR, 'label_encoder_label.pkl')
    
    print(f"\n📦 XGBoost Files:", file=sys.stderr)
    print(f"   XGBoost: {os.path.exists(xgb_path)} - {xgb_path}", file=sys.stderr)
    print(f"   Scaler: {os.path.exists(scaler_path)} - {scaler_path}", file=sys.stderr)
    print(f"   LE Crop: {os.path.exists(le_crop_path)} - {le_crop_path}", file=sys.stderr)
    print(f"   LE Storage: {os.path.exists(le_storage_path)} - {le_storage_path}", file=sys.stderr)
    print(f"   LE Label: {os.path.exists(le_label_path)} - {le_label_path}", file=sys.stderr)
    
    try:
        print("\n⏳ Loading XGBoost model...", file=sys.stderr)
        xgb_model = joblib.load(xgb_path)
        print("✅ XGBoost loaded", file=sys.stderr)
        
        print("⏳ Loading Scaler...", file=sys.stderr)
        scaler = joblib.load(scaler_path)
        print(f"✅ Scaler loaded (features: {scaler.n_features_in_})", file=sys.stderr)
        
        print("⏳ Loading Label Encoders...", file=sys.stderr)
        le_crop = joblib.load(le_crop_path)
        print(f"✅ LE Crop loaded ({len(le_crop.classes_)} classes)", file=sys.stderr)
        
        le_storage = joblib.load(le_storage_path)
        print(f"✅ LE Storage loaded ({list(le_storage.classes_)})", file=sys.stderr)
        
        le_label = joblib.load(le_label_path)
        print(f"✅ LE Label loaded ({list(le_label.classes_)})", file=sys.stderr)
        
    except Exception as e:
        print(f"❌ XGBoost/Encoders load error: {e}", file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
    
    # ── CNN Model ──────────────────────────────────────────────────────
    cnn_path = os.path.join(MODELS_DIR, 'best_model.keras')
    class_file = os.path.join(MODELS_DIR, 'class_indices.json')
    
    print(f"\n📦 CNN Files:", file=sys.stderr)
    print(f"   CNN Model: {os.path.exists(cnn_path)} - {cnn_path}", file=sys.stderr)
    print(f"   Class Indices: {os.path.exists(class_file)} - {class_file}", file=sys.stderr)
    
    try:
        if not os.path.exists(cnn_path):
            print("⚠️  best_model.keras NOT FOUND", file=sys.stderr)
            return
        
        print("⏳ Loading CNN model...", file=sys.stderr)
        with suppress_output():
            cnn_model = keras.models.load_model(cnn_path, compile=False)
            dummy = np.zeros((1, *IMG_SIZE, 3), dtype=np.float32)
            _ = cnn_model.predict(dummy, verbose=0)
        
        n_output = cnn_model.output_shape[-1]
        print(f"✅ CNN loaded (output neurons: {n_output})", file=sys.stderr)
        
        # Load class indices
        if not os.path.exists(class_file):
            print("❌ class_indices.json NOT FOUND", file=sys.stderr)
            print("   Creating fallback class map...", file=sys.stderr)
            
            # Generate fallback
            class_names = []
            for crop in sorted(ALL_CROPS):
                class_names.append(f"Fresh_{crop.capitalize()}")
            for crop in sorted(FRESH_AND_ROTTEN_CROPS):
                class_names.append(f"Rotten_{crop.capitalize()}")
            
            class_names_sorted = sorted(class_names)
            CNN_CLASS_MAP = {i: name for i, name in enumerate(class_names_sorted[:n_output])}
            print(f"   Generated {len(CNN_CLASS_MAP)} classes", file=sys.stderr)
        else:
            print("⏳ Loading class_indices.json...", file=sys.stderr)
            with open(class_file, 'r') as f:
                class_indices = json.load(f)
            
            CNN_CLASS_MAP = {int(v): k for k, v in class_indices.items()}
            print(f"✅ Class map loaded ({len(CNN_CLASS_MAP)} classes)", file=sys.stderr)
            
            if len(CNN_CLASS_MAP) != n_output:
                print(f"⚠️  WARNING: class_indices={len(CNN_CLASS_MAP)}, model outputs={n_output}", file=sys.stderr)
        
        print(f"   Sample classes: {list(CNN_CLASS_MAP.values())[:3]}...", file=sys.stderr)
        
    except Exception as e:
        print(f"❌ CNN load error: {e}", file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
    
    print("\n" + "="*70, file=sys.stderr)
    print("✅ MODEL LOADING COMPLETE", file=sys.stderr)
    print(f"   XGBoost: {xgb_model is not None}", file=sys.stderr)
    print(f"   CNN: {cnn_model is not None}", file=sys.stderr)
    print(f"   Class Map: {len(CNN_CLASS_MAP)} classes", file=sys.stderr)
    print("="*70 + "\n", file=sys.stderr)


# Initialize model variables
xgb_model  = None
scaler     = None
le_crop    = None
le_storage = None
le_label   = None
cnn_model  = None
CNN_CLASS_MAP = {}

# Load models
load_models()


# ══════════════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ══════════════════════════════════════════════════════════════════════

def cnn_predict_image(image_bytes: bytes):
    """
    Run CNN inference.  Returns (crop, is_fresh, freshness_score, confidence, top_preds, error).
    """
    if cnn_model is None or not CNN_CLASS_MAP:
        return 'unknown', None, 0.0, 0.0, [], "CNN model or class map not loaded"

    try:
        img = Image.open(io.BytesIO(image_bytes)).convert('RGB').resize(IMG_SIZE)
        arr = np.expand_dims(np.array(img, dtype=np.float32) / 255.0, axis=0)

        probs = cnn_model.predict(arr, verbose=0)[0]

        if len(probs) != len(CNN_CLASS_MAP):
            return ('unknown', None, 0.0, 0.0, [],
                    f"Model outputs {len(probs)} classes but class map has {len(CNN_CLASS_MAP)}")

        top_idx  = int(np.argmax(probs))
        top_conf = float(probs[top_idx])
        top_name = CNN_CLASS_MAP.get(top_idx, 'Unknown')

        print(f"🔍 CNN Prediction: {top_name} ({top_conf*100:.1f}%)")

        is_fresh  = not top_name.startswith('Rotten_')
        crop_name = top_name.replace('Fresh_', '').replace('Rotten_', '').lower()

        # ── Freshness score (relative to same crop) ────────────────
        fresh_key  = f"Fresh_{crop_name.capitalize()}"
        rotten_key = f"Rotten_{crop_name.capitalize()}"
        
        fresh_idx  = next((k for k, v in CNN_CLASS_MAP.items() if v == fresh_key),  None)
        rotten_idx = next((k for k, v in CNN_CLASS_MAP.items() if v == rotten_key), None)

        if fresh_idx is not None and rotten_idx is not None:
            p_fresh = float(probs[fresh_idx])
            p_rotten = float(probs[rotten_idx])
            total = p_fresh + p_rotten
            freshness_score = p_fresh / max(total, 1e-6)
        elif fresh_idx is not None:
            # Fresh-only crop: use confidence directly
            freshness_score = top_conf if is_fresh else 0.3
        else:
            # No fresh class found (shouldn't happen)
            freshness_score = 0.5

        top_preds = [
            {
                'label': CNN_CLASS_MAP.get(int(i), 'Unknown'),
                'confidence': round(float(probs[i]) * 100, 1)
            }
            for i in np.argsort(probs)[::-1][:5]
        ]

        print(f"   Crop: {crop_name} | Fresh: {is_fresh} | Score: {freshness_score:.2f}")

        return crop_name, is_fresh, round(freshness_score, 3), round(top_conf, 3), top_preds, None

    except Exception as e:
        print(f"❌ CNN prediction error: {e}")
        traceback.print_exc()
        return 'unknown', None, 0.0, 0.0, [], str(e)


def build_features(crop, freshness_score, temperature, humidity, storage_type) -> np.ndarray:
    """Build feature vector for XGBoost (MUST MATCH TRAINING ORDER)."""
    
    crop = crop.lower().strip()
    
    # ── Encode crop ────────────────────────────────────────────────
    try:
        crop_enc = int(le_crop.transform([crop])[0])
    except ValueError:
        # Crop not in training set — find closest match
        print(f"⚠️  Crop '{crop}' not in encoder, searching for match...")
        classes = list(le_crop.classes_)
        partial = [c for c in classes if crop in c or c in crop]
        if partial:
            crop_enc = int(le_crop.transform([partial[0]])[0])
            print(f"   Using: {partial[0]}")
        else:
            crop_enc = 0  # Fallback to first class
            print(f"   Fallback to: {classes[0]}")

    # ── Encode storage ─────────────────────────────────────────────
    storage_map = {
        'room_temp': 'room_temp',
        'refrigerator': 'refrigerator',
        'cold_storage': 'refrigerator',
        'freezer': 'freezer',
        'frozen': 'freezer',
    }
    storage_clean = storage_map.get(storage_type.lower().strip(), 'room_temp')
    
    try:
        storage_enc = int(le_storage.transform([storage_clean])[0])
    except ValueError:
        print(f"⚠️  Storage '{storage_clean}' not in encoder")
        storage_enc = 0

    # ── Engineered features (MUST MATCH TRAINING) ──────────────────
    has_rotten    = 1 if crop in FRESH_AND_ROTTEN_CROPS else 0
    heat_index    = temperature * 1.8 + 32 + humidity * 0.1
    fresh_tier    = 2 if freshness_score > 0.66 else (1 if freshness_score > 0.33 else 0)
    spoilage_risk = (1 - freshness_score) * (temperature / 40.0) * (humidity / 100.0)

    # ── CRITICAL: Feature order must match training ────────────────
    features = np.array([[
        crop_enc,           # 0
        storage_enc,        # 1
        freshness_score,    # 2
        temperature,        # 3
        humidity,           # 4
        has_rotten,         # 5
        heat_index,         # 6
        fresh_tier,         # 7
        spoilage_risk       # 8
    ]], dtype=np.float64)

    print(f"🔧 Features before scaling: {features[0]}")

    # ── Scale features ─────────────────────────────────────────────
    try:
        if scaler is not None:
            if scaler.n_features_in_ != features.shape[1]:
                print(f"⚠️  Feature count mismatch: model expects {scaler.n_features_in_}, got {features.shape[1]}")
            features = scaler.transform(features)
            print(f"🔧 Features after scaling: {features[0]}")
    except Exception as e:
        print(f"❌ Scaler error: {e}")
        traceback.print_exc()
    
    return features


def xgb_predict(crop, freshness_score, temperature, humidity, storage_type):
    """XGBoost spoilage prediction."""
    if xgb_model is None or le_label is None:
        print("⚠️  XGBoost model or label encoder not loaded")
        return '2-4 days', 3.0, 0.5, {}
    
    try:
        features = build_features(crop, freshness_score, temperature, humidity, storage_type)
        probs    = xgb_model.predict_proba(features)[0]
        pred_idx = int(np.argmax(probs))
        label    = le_label.inverse_transform([pred_idx])[0]
        conf     = float(probs[pred_idx])
        days     = LABEL_TO_MIDPOINT.get(label, 3.0)
        
        prob_dict = {
            le_label.inverse_transform([i])[0]: round(float(p) * 100, 1)
            for i, p in enumerate(probs)
        }
        
        print(f"📊 XGBoost: {label} ({conf*100:.1f}%) | Days: {days}")
        print(f"   Probabilities: {prob_dict}")
        
        return label, days, round(conf, 3), prob_dict
        
    except Exception as e:
        print(f"❌ XGBoost predict error: {e}")
        traceback.print_exc()
        return '2-4 days', 3.0, 0.5, {}


def generate_recommendations(crop, freshness_score, days_remaining, storage_type, temperature, humidity):
    """Generate actionable recommendations."""
    recs = []
    
    if days_remaining <= 1:
        recs.append("⚠️ Use immediately or freeze to prevent spoilage.")
    elif days_remaining <= 3:
        recs.append("🕐 Consume within the next 1–3 days for best quality.")
    else:
        recs.append("✅ Produce is in good condition. Continue current storage.")
    
    if temperature > 30:
        recs.append("🌡️ High temperature detected — move to refrigerator or cooler area.")
    if humidity > 80:
        recs.append("💧 High humidity — ensure ventilation to prevent mold growth.")
    if humidity < 30:
        recs.append("💨 Low humidity — store in sealed container to prevent drying.")
    if storage_type == 'room_temp' and days_remaining <= 2:
        recs.append("🧊 Consider refrigerating to extend shelf life.")
    if freshness_score < 0.3:
        recs.append("🔍 Inspect closely before consuming — signs of spoilage likely.")

    optimal = {
        'apple':      {'temp': '0–4°C',   'humidity': '90–95%',  'storage': 'Refrigerator'},
        'banana':     {'temp': '12–14°C',  'humidity': '90–95%',  'storage': 'Room temp (unripe), Refrigerator (ripe)'},
        'tomato':     {'temp': '12–15°C',  'humidity': '85–90%',  'storage': 'Room temp (unripe), Refrigerator (ripe)'},
        'potato':     {'temp': '7–10°C',   'humidity': '90–95%',  'storage': 'Cool dark place'},
        'carrot':     {'temp': '0–4°C',    'humidity': '95–100%', 'storage': 'Refrigerator'},
        'cucumber':   {'temp': '10–12°C',  'humidity': '90–95%',  'storage': 'Refrigerator'},
        'strawberry': {'temp': '0–2°C',    'humidity': '90–95%',  'storage': 'Refrigerator'},
        'mango':      {'temp': '10–13°C',  'humidity': '85–90%',  'storage': 'Room temp (unripe), Refrigerator (ripe)'},
        'orange':     {'temp': '3–8°C',    'humidity': '85–90%',  'storage': 'Refrigerator'},
        'pomegranate':{'temp': '5–7°C',    'humidity': '90–95%',  'storage': 'Refrigerator'},
        'onion':      {'temp': '0–4°C',    'humidity': '65–70%',  'storage': 'Cool dry place'},
    }
    
    crop_lower = crop.lower()
    if crop_lower in optimal:
        info = optimal[crop_lower]
        recs.append(f"📦 Optimal for {crop.capitalize()}: {info['temp']}, {info['humidity']} humidity, {info['storage']}.")
    
    return recs


# ══════════════════════════════════════════════════════════════════════
# API ROUTES
# ══════════════════════════════════════════════════════════════════════

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'healthy',
        'models': {
            'xgboost': xgb_model is not None,
            'cnn':     cnn_model is not None,
            'scaler':  scaler is not None,
            'le_crop': le_crop is not None,
            'le_storage': le_storage is not None,
            'le_label': le_label is not None,
            'cnn_classes': len(CNN_CLASS_MAP),
            'cnn_output':  cnn_model.output_shape[-1] if cnn_model else 0,
        },
        'paths': {
            'base_dir': BASE_DIR,
            'models_dir': MODELS_DIR,
            'models_dir_exists': os.path.exists(MODELS_DIR),
        }
    })


@app.route('/predict/image', methods=['POST'])
def predict_image():
    try:
        data = request.get_json(force=True)
        if 'image' not in data:
            return jsonify({'error': 'Missing "image" field'}), 400

        img_b64 = data['image']
        if ',' in img_b64:
            img_b64 = img_b64.split(',', 1)[1]
        image_bytes = base64.b64decode(img_b64)

        temperature  = float(data.get('temperature', 25))
        humidity     = float(data.get('humidity', 60))
        storage_type = data.get('storage_type', 'room_temp')

        print(f"\n📸 Image prediction request | Temp: {temperature}°C | Humidity: {humidity}% | Storage: {storage_type}")

        # ── CNN Prediction ────────────────────────────────────────
        crop, is_fresh, freshness_score, cnn_conf, top_preds, cnn_error = cnn_predict_image(image_bytes)

        if cnn_error:
            print(f"❌ CNN error: {cnn_error}")
            return jsonify({
                'success': False,
                'error': f'CNN prediction failed: {cnn_error}',
                'fallback': True,
                'prediction': {
                    'crop':                'Unknown',
                    'is_fresh':            None,
                    'freshness_score':     0.0,
                    'freshness_percent':   0.0,
                    'cnn_confidence':      0.0,
                    'top_predictions':     [],
                    'predicted_spoilage':  'Unknown',
                    'refrigerated_estimate': 'N/A',
                    'days_estimate':       0,
                    'spoilage_confidence': 0.0,
                    'spoilage_probabilities': {},
                    'recommendations':    ['⚠️ Could not analyze image. Please check model files and try again.'],
                }
            }), 200

        # ── XGBoost Main Prediction ───────────────────────────────
        label, days, xgb_conf, probs = xgb_predict(
            crop, freshness_score, temperature, humidity, storage_type
        )

        # ── Refrigerated Counterfactual ───────────────────────────
        _, refrig_days, _, _ = xgb_predict(
            crop, freshness_score, 4.0, 90.0, 'refrigerator'
        )

        recommendations = generate_recommendations(
            crop, freshness_score, days, storage_type, temperature, humidity
        )

        return jsonify({
            'success': True,
            'prediction': {
                'crop':                  crop.capitalize(),
                'is_fresh':              is_fresh,
                'freshness_score':       round(freshness_score * 100, 1),
                'freshness_percent':     round(freshness_score * 100, 1),
                'cnn_confidence':        round(cnn_conf * 100, 1),
                'top_predictions':       top_preds,
                'predicted_spoilage':    label,
                'refrigerated_estimate': f"{refrig_days:.1f} days",
                'days_estimate':         days,
                'spoilage_confidence':   round(xgb_conf * 100, 1),
                'spoilage_probabilities': probs,
                'recommendations':       recommendations,
            }
        })

    except Exception as e:
        print(f"❌ Prediction error: {e}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@app.route('/predict/sensor', methods=['POST'])
def predict_sensor():
    try:
        data = request.get_json(force=True)
        required = ['crop', 'temperature', 'humidity', 'storage_type']
        missing  = [f for f in required if f not in data]
        if missing:
            return jsonify({'error': f'Missing fields: {missing}'}), 400

        crop            = data['crop']
        freshness_score = float(data.get('freshness_score', 0.75))
        temperature     = float(data['temperature'])
        humidity        = float(data['humidity'])
        storage_type    = data['storage_type']

        print(f"\n🌡️ Sensor prediction | Crop: {crop} | Fresh: {freshness_score} | Temp: {temperature}°C | Humidity: {humidity}%")

        label, days, conf, probs = xgb_predict(
            crop, freshness_score, temperature, humidity, storage_type
        )
        recommendations = generate_recommendations(
            crop, freshness_score, days, storage_type, temperature, humidity
        )

        return jsonify({
            'success': True,
            'prediction': {
                'crop':            crop.capitalize(),
                'freshness_score': round(freshness_score * 100, 1),
                'spoilage_label':  label,
                'estimated_days':  days,
                'confidence':      round(conf * 100, 1),
                'probabilities':   probs,
                'recommendations': recommendations,
            }
        })
    except Exception as e:
        print(f"❌ Sensor prediction error: {e}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@app.route('/crops', methods=['GET'])
def list_crops():
    return jsonify({
        'all_crops':        ALL_CROPS,
        'fresh_and_rotten': FRESH_AND_ROTTEN_CROPS,
        'fresh_only':       FRESH_ONLY_CROPS,
        'storage_types':    STORAGE_TYPES,
        'spoilage_labels':  SPOILAGE_LABELS,
    })


@app.route('/debug/classes', methods=['GET'])
def debug_classes():
    """Debug endpoint to verify class mapping."""
    return jsonify({
        'cnn_loaded':         cnn_model is not None,
        'cnn_output_neurons': cnn_model.output_shape[-1] if cnn_model else 0,
        'class_map_size':     len(CNN_CLASS_MAP),
        'class_map':          {str(k): v for k, v in sorted(CNN_CLASS_MAP.items())},
        'xgboost_loaded':     xgb_model is not None,
        'crop_classes':       list(le_crop.classes_) if le_crop else [],
        'storage_classes':    list(le_storage.classes_) if le_storage else [],
        'label_classes':      list(le_label.classes_) if le_label else [],
        'scaler_features':    scaler.n_features_in_ if scaler else 0,
    })


# ══════════════════════════════════════════════════════════════════════
if __name__ == '__main__':
    print("\n⚠️  Running in DEVELOPMENT mode.\n")
    print("📍 Visit http://localhost:5001/health to check model status")
    print("📍 Visit http://localhost:5001/debug/classes to see class mapping\n")
    app.run(host='0.0.0.0', port=5001, debug=True)