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
    #tf.get_logger().setLevel('ERROR')
    tf.autograph.set_verbosity(0)
    from tensorflow import keras

# ── Standard imports ───────────────────────────────────────────────────
import io
import json
import warnings
warnings.filterwarnings('ignore')

import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image
import base64
import joblib
import pandas as pd

# ── Paths ──────────────────────────────────────────────────────────────
BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, 'ml_models')

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

FEATURE_COLS = [
    'crop_encoded', 'storage_encoded', 'freshness_score',
    'temperature', 'humidity', 'has_rotten_data',
    'heat_index', 'freshness_tier', 'spoilage_risk'
]

# ══════════════════════════════════════════════════════════════════════
# LOAD MODELS AT STARTUP
# ══════════════════════════════════════════════════════════════════════
print("🔄 Loading ML models...")

# ── XGBoost + Encoders ─────────────────────────────────────────────────
try:
    xgb_model  = joblib.load(os.path.join(MODELS_DIR, 'xgboost_spoilage.pkl'))
    scaler     = joblib.load(os.path.join(MODELS_DIR, 'scaler.pkl'))
    le_crop    = joblib.load(os.path.join(MODELS_DIR, 'label_encoder_crop.pkl'))
    le_storage = joblib.load(os.path.join(MODELS_DIR, 'label_encoder_storage.pkl'))
    le_label   = joblib.load(os.path.join(MODELS_DIR, 'label_encoder_label.pkl'))
    print("✅ XGBoost + encoders loaded")
except Exception as e:
    print(f"❌ XGBoost load error: {e}")
    xgb_model = scaler = le_crop = le_storage = le_label = None

# ── CNN Model ──────────────────────────────────────────────────────────
cnn_model = None
try:
    cnn_path = os.path.join(MODELS_DIR, 'best_model.keras')
    if not os.path.exists(cnn_path):
        print("⚠️  best_model.keras not found – CNN disabled")
    else:
        with suppress_output():
            cnn_model = keras.models.load_model(cnn_path, compile=False)

        # Fix models saved without a built input shape
        if cnn_model.input_shape is None or (
            isinstance(cnn_model.input_shape, (list, tuple)) and None in list(cnn_model.input_shape)[1:]
            and list(cnn_model.input_shape)[1] is None   # H is None means not built
        ):
            cnn_model.build((None, *IMG_SIZE, 3))

        # Warm-up pass — catches shape mismatches immediately
        dummy = np.zeros((1, *IMG_SIZE, 3), dtype=np.float32)
        with suppress_output():
            _ = cnn_model.predict(dummy, verbose=0)

        print(f"✅ CNN loaded | input={cnn_model.input_shape} | output={cnn_model.output_shape}")

except Exception as e:
    print(f"❌ CNN load error: {e}")
    cnn_model = None

print("🚀 AgriSense ML Service ready!\n")


# ══════════════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ══════════════════════════════════════════════════════════════════════

def build_cnn_class_map(n_classes: int) -> dict:
    """Alphabetical class map matching ImageDataGenerator flow_from_directory order."""
    class_names = (
        [f"Fresh_{c.capitalize()}"  for c in sorted(ALL_CROPS)] +
        [f"Rotten_{c.capitalize()}" for c in sorted(FRESH_AND_ROTTEN_CROPS)]
    )
    class_names_sorted = sorted(class_names)
    return {i: name for i, name in enumerate(class_names_sorted)}


def cnn_predict_image(image_bytes: bytes):
    """
    Run CNN inference on raw image bytes.
    Returns: (crop_name, is_fresh, freshness_score, confidence, top_predictions)
    """
    if cnn_model is None:
        return 'unknown', True, 0.75, 0.75, []

    try:
        img = Image.open(io.BytesIO(image_bytes)).convert('RGB').resize(IMG_SIZE)
        arr = np.expand_dims(np.array(img, dtype=np.float32) / 255.0, axis=0)

        probs        = cnn_model.predict(arr, verbose=0)[0]
        idx_to_class = build_cnn_class_map(len(probs))

        top_idx  = int(np.argmax(probs))
        top_conf = float(probs[top_idx])
        top_name = idx_to_class.get(top_idx, 'Unknown')

        is_fresh  = not top_name.startswith('Rotten_')
        crop_name = top_name.replace('Fresh_', '').replace('Rotten_', '').lower()

        # Freshness score = P(fresh) / (P(fresh) + P(rotten))
        fresh_idx  = next((k for k, v in idx_to_class.items() if v == f"Fresh_{crop_name.capitalize()}"),  None)
        rotten_idx = next((k for k, v in idx_to_class.items() if v == f"Rotten_{crop_name.capitalize()}"), None)

        if fresh_idx is not None and rotten_idx is not None:
            total           = float(probs[fresh_idx]) + float(probs[rotten_idx])
            freshness_score = float(probs[fresh_idx]) / max(total, 1e-6)
        elif fresh_idx is not None:
            freshness_score = float(probs[fresh_idx])
        else:
            freshness_score = 0.9 if is_fresh else 0.2

        top_preds = [
            {'label': idx_to_class.get(int(i), 'Unknown'),
             'confidence': round(float(probs[i]) * 100, 1)}
            for i in np.argsort(probs)[::-1][:3]
        ]

        return crop_name, is_fresh, round(freshness_score, 3), round(top_conf, 3), top_preds

    except Exception as e:
        print(f"❌ CNN predict error: {e}")
        return 'unknown', True, 0.75, 0.75, []


def build_features(crop, freshness_score, temperature, humidity, storage_type) -> np.ndarray:
    """Build the 9-feature vector matching the training pipeline."""
    crop = crop.lower().strip()

    try:
        crop_enc = int(le_crop.transform([crop])[0])
    except Exception:
        try:
            classes  = list(le_crop.classes_)
            partial  = [c for c in classes if crop in c or c in crop]
            crop_enc = int(le_crop.transform([partial[0] if partial else classes[0]])[0])
        except Exception:
            crop_enc = 0

        storage_map = {
        'room_temp'      : 'room_temp',
        'refrigerator'   : 'refrigerator',
        'cold_storage'   : 'refrigerator',
        'freezer'        : 'freezer',
        'frozen'         : 'freezer',
    }
    storage_clean = storage_map.get(storage_type.lower().strip(), 'room_temp')

    try:
        storage_enc = int(le_storage.transform([storage_clean])[0])
    except Exception:
        storage_enc = 0

    has_rotten   = 1 if crop in FRESH_AND_ROTTEN_CROPS else 0
    heat_index   = temperature * 1.8 + 32 + humidity * 0.1
    fresh_tier   = 2 if freshness_score > 0.66 else (1 if freshness_score > 0.33 else 0)
    spoilage_risk = (1 - freshness_score) * (temperature / 40) * (humidity / 100)

    features = np.array([[
        crop_enc, storage_enc, freshness_score,
        temperature, humidity, has_rotten,
        heat_index, fresh_tier, spoilage_risk
    ]])

    try:
        features = scaler.transform(features)
    except Exception as e:
        print(f"⚠️  Scaler error: {e}")

    return features


def xgb_predict(crop, freshness_score, temperature, humidity, storage_type):
    """
    Run XGBoost prediction.
    Returns: (predicted_label, estimated_days, confidence, all_probabilities)
    """
    if xgb_model is None:
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

        return label, days, round(conf, 3), prob_dict

    except Exception as e:
        print(f"❌ XGBoost predict error: {e}")
        return '2-4 days', 3.0, 0.5, {}


def generate_recommendations(crop, freshness_score, days_remaining, storage_type, temperature, humidity):
    """Generate storage and handling recommendations."""
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
        'apple':       {'temp': '0–4°C',  'humidity': '90–95%', 'storage': 'Refrigerator'},
        'banana':      {'temp': '12–14°C', 'humidity': '90–95%', 'storage': 'Room temp (unripe), Refrigerator (ripe)'},
        'tomato':      {'temp': '12–15°C', 'humidity': '85–90%', 'storage': 'Room temp (unripe), Refrigerator (ripe)'},
        'potato':      {'temp': '7–10°C',  'humidity': '90–95%', 'storage': 'Cool dark place'},
        'carrot':      {'temp': '0–4°C',   'humidity': '95–100%','storage': 'Refrigerator'},
        'cucumber':    {'temp': '10–12°C', 'humidity': '90–95%', 'storage': 'Refrigerator'},
        'strawberry':  {'temp': '0–2°C',   'humidity': '90–95%', 'storage': 'Refrigerator'},
        'mango':       {'temp': '10–13°C', 'humidity': '85–90%', 'storage': 'Room temp (unripe), Refrigerator (ripe)'},
        'orange':      {'temp': '3–8°C',   'humidity': '85–90%', 'storage': 'Refrigerator'},
        'bellpepper':  {'temp': '7–10°C',  'humidity': '90–95%', 'storage': 'Refrigerator'},
        'onion':       {'temp': '0–4°C',   'humidity': '65–70%', 'storage': 'Cool dry place'},
        'spinach':     {'temp': '0–2°C',   'humidity': '95–100%','storage': 'Refrigerator'},
        'lettuce':     {'temp': '0–2°C',   'humidity': '95–100%','storage': 'Refrigerator'},
        'cabbage':     {'temp': '0–2°C',   'humidity': '95–100%','storage': 'Refrigerator'},
    }

    crop_lower = crop.lower()
    if crop_lower in optimal:
        info = optimal[crop_lower]
        recs.append(
            f"📦 Optimal for {crop.capitalize()}: {info['temp']}, "
            f"{info['humidity']} humidity, {info['storage']}."
        )

    return recs


# ══════════════════════════════════════════════════════════════════════
# API ROUTES
# ══════════════════════════════════════════════════════════════════════

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status':  'healthy',
        'models': {
            'xgboost': xgb_model is not None,
            'cnn':     cnn_model is not None,
            'scaler':  scaler is not None,
        }
    })


@app.route('/predict/image', methods=['POST'])
def predict_image():
    """
    Accepts JSON with base64-encoded image.
    Optionally accepts temperature, humidity, storage_type for combined prediction.
    """
    try:
        data = request.get_json(force=True)

        if 'image' not in data:
            return jsonify({'error': 'Missing "image" field (base64-encoded)'}), 400

        # Decode image
        img_b64 = data['image']
        if ',' in img_b64:
            img_b64 = img_b64.split(',', 1)[1]
        image_bytes = base64.b64decode(img_b64)

        # CNN prediction
        crop, is_fresh, freshness_score, cnn_conf, top_preds = cnn_predict_image(image_bytes)

        # Optional: combined XGBoost prediction
        temperature  = float(data.get('temperature', 25))
        humidity     = float(data.get('humidity', 60))
        storage_type = data.get('storage_type', 'room_temp')

        label, days, xgb_conf, probs = xgb_predict(
            crop, freshness_score, temperature, humidity, storage_type
        )

        recommendations = generate_recommendations(
            crop, freshness_score, days, storage_type, temperature, humidity
        )

        return jsonify({
            'success': True,
            'prediction': {
                'crop':             crop.capitalize(),
                'is_fresh':         is_fresh,
                'freshness_score':  round(freshness_score * 100, 1),
                'cnn_confidence':   round(cnn_conf * 100, 1),
                'top_predictions':  top_preds,
                'spoilage_label':   label,
                'estimated_days':   days,
                'xgb_confidence':   round(xgb_conf * 100, 1),
                'probabilities':    probs,
                'recommendations':  recommendations,
            }
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/predict/sensor', methods=['POST'])
def predict_sensor():
    """
    Accepts JSON with crop, freshness_score, temperature, humidity, storage_type.
    Returns XGBoost spoilage prediction.
    """
    try:
        data = request.get_json(force=True)

        required = ['crop', 'temperature', 'humidity', 'storage_type']
        missing  = [f for f in required if f not in data]
        if missing:
            return jsonify({'error': f'Missing fields: {missing}'}), 400

        crop             = data['crop']
        freshness_score  = float(data.get('freshness_score', 0.75))
        temperature      = float(data['temperature'])
        humidity         = float(data['humidity'])
        storage_type     = data['storage_type']

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
        return jsonify({'error': str(e)}), 500


@app.route('/crops', methods=['GET'])
def list_crops():
    """Return all supported crops."""
    return jsonify({
        'all_crops':            ALL_CROPS,
        'fresh_and_rotten':     FRESH_AND_ROTTEN_CROPS,
        'fresh_only':           FRESH_ONLY_CROPS,
        'storage_types':        STORAGE_TYPES,
        'spoilage_labels':      SPOILAGE_LABELS,
    })


# ══════════════════════════════════════════════════════════════════════
# DEV-ONLY ENTRYPOINT (never used in production)
# ══════════════════════════════════════════════════════════════════════
if __name__ == '__main__':
    print("\n⚠️  Running in DEVELOPMENT mode. Use gunicorn for production:\n"
          "    gunicorn -c gunicorn_config.py wsgi:app\n")
    app.run(host='0.0.0.0', port=5001, debug=True)