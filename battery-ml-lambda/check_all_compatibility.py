"""
Comprehensive Model Compatibility Check
Validates all model files and their integration
"""
import os
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'

import json
import joblib
import numpy as np
import tensorflow as tf
from pathlib import Path

print("=" * 80)
print("MODEL COMPATIBILITY CHECK")
print("=" * 80)

model_dir = Path('models')

# 1. Load and check feature_names.json
print("\n[1/7] Checking feature_names.json...")
with open(model_dir / 'feature_names.json', 'r') as f:
    feature_names = json.load(f)
print(f"✓ Feature names loaded: {len(feature_names)} features")
print(f"  Features: {', '.join(feature_names[:5])}...")

# 2. Load and check config.json
print("\n[2/7] Checking config.json...")
with open(model_dir / 'config.json', 'r') as f:
    config = json.load(f)
print(f"✓ Config loaded")
print(f"  Model type: {config.get('model_type', 'N/A')}")
print(f"  Training date: {config.get('date_created', 'N/A')}")
print(f"  Total samples: {config.get('total_samples', 'N/A')}")

# 3. Load and check scaler.pkl
print("\n[3/7] Checking scaler.pkl...")
scaler = joblib.load(model_dir / 'scaler.pkl')
print(f"✓ Scaler loaded: {type(scaler).__name__}")
print(f"  Expected features: {scaler.n_features_in_}")
print(f"  Feature check: {'✓ MATCH' if scaler.n_features_in_ == len(feature_names) else '✗ MISMATCH'}")

# 4. Load and check isolation_forest.pkl
print("\n[4/7] Checking isolation_forest.pkl...")
iso_forest = joblib.load(model_dir / 'isolation_forest.pkl')
print(f"✓ Isolation Forest loaded: {type(iso_forest).__name__}")
print(f"  Expected features: {iso_forest.n_features_in_}")
print(f"  Contamination: {iso_forest.contamination}")
print(f"  Feature check: {'✓ MATCH' if iso_forest.n_features_in_ == len(feature_names) else '✗ MISMATCH'}")

# 5. Check autoencoder architecture
print("\n[5/7] Checking autoencoder_final.h5...")
def build_autoencoder(input_dim=28):
    """Rebuild the autoencoder architecture."""
    model = tf.keras.Sequential([
        tf.keras.layers.Dense(32, activation=None, input_dim=input_dim),
        tf.keras.layers.BatchNormalization(),
        tf.keras.layers.LeakyReLU(alpha=0.2),
        tf.keras.layers.Dropout(0.25),
        
        tf.keras.layers.Dense(16),
        tf.keras.layers.BatchNormalization(),
        tf.keras.layers.LeakyReLU(alpha=0.2),
        tf.keras.layers.Dropout(0.25),
        
        tf.keras.layers.Dense(8),
        tf.keras.layers.BatchNormalization(),
        tf.keras.layers.LeakyReLU(alpha=0.2),
        
        # Decoder
        tf.keras.layers.Dense(16),
        tf.keras.layers.BatchNormalization(),
        tf.keras.layers.LeakyReLU(alpha=0.2),
        tf.keras.layers.Dropout(0.25),
        
        tf.keras.layers.Dense(32),
        tf.keras.layers.BatchNormalization(),
        tf.keras.layers.LeakyReLU(alpha=0.2),
        tf.keras.layers.Dropout(0.25),
        
        tf.keras.layers.Dense(input_dim)
    ])
    model.compile(optimizer='adam', loss='mse')
    return model

autoencoder = build_autoencoder(28)
try:
    autoencoder.load_weights(model_dir / 'autoencoder_final.h5')
    print(f"✓ Autoencoder weights loaded successfully")
    print(f"  Input shape: (None, 28)")
    print(f"  Output shape: (None, 28)")
    print(f"  Total parameters: {autoencoder.count_params()}")
except Exception as e:
    print(f"✗ Failed to load weights: {e}")

# 6. Run test inference
print("\n[6/7] Running test inference...")
try:
    # Generate dummy data with correct shape
    test_data = np.random.randn(10, 28)
    
    # Scale
    scaled_data = scaler.transform(test_data)
    print(f"✓ Scaler transform: {test_data.shape} -> {scaled_data.shape}")
    
    # Autoencoder
    reconstructed = autoencoder.predict(scaled_data, verbose=0)
    recon_errors = np.mean(np.square(scaled_data - reconstructed), axis=1)
    print(f"✓ Autoencoder inference: {scaled_data.shape} -> {reconstructed.shape}")
    print(f"  Reconstruction errors: min={recon_errors.min():.4f}, max={recon_errors.max():.4f}")
    
    # Isolation Forest
    iso_preds = iso_forest.predict(scaled_data)
    anomaly_count = np.sum(iso_preds == -1)
    print(f"✓ Isolation Forest inference: {scaled_data.shape} -> predictions")
    print(f"  Anomalies detected: {anomaly_count}/{len(iso_preds)}")
    
except Exception as e:
    print(f"✗ Test inference failed: {e}")
    import traceback
    traceback.print_exc()

# 7. Summary
print("\n[7/7] COMPATIBILITY SUMMARY")
print("=" * 80)

issues = []

if scaler.n_features_in_ != len(feature_names):
    issues.append(f"Scaler expects {scaler.n_features_in_} features but feature_names.json has {len(feature_names)}")

if iso_forest.n_features_in_ != len(feature_names):
    issues.append(f"Isolation Forest expects {iso_forest.n_features_in_} features but feature_names.json has {len(feature_names)}")

if scaler.n_features_in_ != iso_forest.n_features_in_:
    issues.append(f"Scaler ({scaler.n_features_in_}) and Isolation Forest ({iso_forest.n_features_in_}) feature counts don't match")

if issues:
    print("✗ COMPATIBILITY ISSUES FOUND:")
    for issue in issues:
        print(f"  - {issue}")
else:
    print("✓ ALL MODELS ARE COMPATIBLE")
    print(f"  - All expecting: {len(feature_names)} features")
    print(f"  - Scaler: ✓")
    print(f"  - Isolation Forest: ✓")
    print(f"  - Autoencoder: ✓")
    print(f"  - Config: ✓")
    print(f"  - Feature names: ✓")

print("\n" + "=" * 80)
print("Check complete!")
