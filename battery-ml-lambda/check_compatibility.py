#!/usr/bin/env python
"""Check model and feature compatibility"""

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
    print(f"\n✓ feature_names.json: {len(feature_names)} features")
    print(f"  Features: {feature_names}")
except Exception as e:
    print(f"\n✗ feature_names.json ERROR: {e}")
    feature_names = []

# 2. Check scaler
try:
    scaler = joblib.load(model_dir / 'scaler.pkl')
    scaler_features = getattr(scaler, 'n_features_in_', None)
    print(f"\n✓ scaler.pkl: {scaler_features} features expected")
except Exception as e:
    print(f"\n✗ scaler.pkl ERROR: {e}")
    scaler_features = None

# 3. Check isolation forest
try:
    iso_forest = joblib.load(model_dir / 'isolation_forest.pkl')
    iso_features = getattr(iso_forest, 'n_features_in_', None)
    print(f"✓ isolation_forest.pkl: {iso_features} features expected")
except Exception as e:
    print(f"✗ isolation_forest.pkl ERROR: {e}")
    iso_features = None

# 4. Check autoencoder model
try:
    model = tf.keras.models.load_model(model_dir / 'autoencoder_best.h5', compile=False)
    print(f"\n✓ autoencoder_best.h5 loaded successfully")
    print(f"  Input shape: {model.input_shape}")
    print(f"  Total layers: {len(model.layers)}")
    print(f"  Model summary:")
    for i, layer in enumerate(model.layers):
        if hasattr(layer, 'units'):
            print(f"    Layer {i}: {layer.__class__.__name__} (units={layer.units})")
        else:
            print(f"    Layer {i}: {layer.__class__.__name__}")
except Exception as e:
    print(f"\n✗ autoencoder_best.h5 ERROR: {e}")
    model = None

# 5. Check config
try:
    config = json.loads((model_dir / 'config.json').read_text())
    config_features = len(config.get('feature_names', []))
    print(f"\n✓ config.json: {config_features} features declared" if config_features > 0 else "\n✓ config.json loaded")
except Exception as e:
    print(f"\n✗ config.json ERROR: {e}")

# 6. Summary
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
    print(f"\n✓ ALL COMPATIBLE! Model expects {len(feature_names)} features")
else:
    print(f"\n✗ COMPATIBILITY ISSUES FOUND:")
    print(f"  - feature_names.json: {len(feature_names)} features")
    print(f"  - scaler.pkl: {scaler_features} features")
    print(f"  - isolation_forest.pkl: {iso_features} features")
    if model:
        print(f"  - autoencoder_best.h5: input shape {model.input_shape}")
    
    if scaler_features and len(feature_names) != scaler_features:
        print(f"\n  ERROR: Scaler mismatch! feature_names={len(feature_names)}, scaler={scaler_features}")
    if iso_features and len(feature_names) != iso_features:
        print(f"  ERROR: Isolation Forest mismatch! feature_names={len(feature_names)}, iso_forest={iso_features}")
    if model and model.input_shape[1] != len(feature_names):
        print(f"  ERROR: Model input mismatch! feature_names={len(feature_names)}, model={model.input_shape[1]}")

print("=" * 80)
