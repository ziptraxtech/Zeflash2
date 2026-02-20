#!/usr/bin/env python
"""Check model and feature compatibility - simple version"""

import json
import joblib
import tensorflow as tf
from pathlib import Path
import os

print("=" * 80)
print("CHECKING MODEL & FEATURE COMPATIBILITY")
print("=" * 80)

model_dir = Path('models')

# 1. Check feature names
try:
    feature_names = json.loads((model_dir / 'feature_names.json').read_text())
    print("\n[OK] feature_names.json: {} features".format(len(feature_names)))
except Exception as e:
    print("\n[ERROR] feature_names.json: {}".format(e))
    feature_names = []

# 2. Check scaler
try:
    scaler = joblib.load(model_dir / 'scaler.pkl')
    scaler_features = getattr(scaler, 'n_features_in_', None)
    print("[OK] scaler.pkl: {} features expected".format(scaler_features))
except Exception as e:
    print("[ERROR] scaler.pkl: {}".format(e))
    scaler_features = None

# 3. Check isolation forest
try:
    iso_forest = joblib.load(model_dir / 'isolation_forest.pkl')
    iso_features = getattr(iso_forest, 'n_features_in_', None)
    print("[OK] isolation_forest.pkl: {} features expected".format(iso_features))
except Exception as e:
    print("[ERROR] isolation_forest.pkl: {}".format(e))
    iso_features = None

# 4. Check autoencoder model
try:
    model = tf.keras.models.load_model(model_dir / 'autoencoder_best.h5', compile=False)
    print("\n[OK] autoencoder_best.h5 loaded successfully")
    print("  Input shape: {}".format(model.input_shape))
    print("  Total layers: {}".format(len(model.layers)))
except Exception as e:
    print("\n[ERROR] autoencoder_best.h5: {}".format(e))
    model = None

# 5. Summary
print("\n" + "=" * 80)
print("COMPATIBILITY CHECK")
print("=" * 80)

all_match = all([
    len(feature_names) > 0,
    len(feature_names) == scaler_features if scaler_features else True,
    len(feature_names) == iso_features if iso_features else True,
    model and model.input_shape[1] == len(feature_names) if model else True,
])

if all_match:
    print("\n[SUCCESS] ALL COMPATIBLE! Model expects {} features".format(len(feature_names)))
else:
    print("\n[FAIL] COMPATIBILITY ISSUES FOUND:")
    print("  - feature_names.json: {} features".format(len(feature_names)))
    print("  - scaler.pkl: {} features".format(scaler_features))
    print("  - isolation_forest.pkl: {} features".format(iso_features))
    if model:
        print("  - autoencoder_best.h5: input shape {}".format(model.input_shape))

print("=" * 80)
