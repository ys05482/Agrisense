import os
import joblib
import json

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, 'ml_models')

print(f"Base dir: {BASE_DIR}")
print(f"Models dir: {MODELS_DIR}")
print(f"Models dir exists: {os.path.exists(MODELS_DIR)}")

files = [
    'xgboost_spoilage.pkl',
    'scaler.pkl',
    'label_encoder_crop.pkl',
    'label_encoder_storage.pkl',
    'label_encoder_label.pkl',
    'best_model.keras',
    'class_indices.json'
]

print("\n📂 Checking files:")
for f in files:
    path = os.path.join(MODELS_DIR, f)
    exists = os.path.exists(path)
    size = os.path.getsize(path) if exists else 0
    print(f"  {'✅' if exists else '❌'} {f:30s} ({size:,} bytes)")

if os.path.exists(MODELS_DIR):
    print(f"\n📁 All files in {MODELS_DIR}:")
    for f in os.listdir(MODELS_DIR):
        print(f"  - {f}")