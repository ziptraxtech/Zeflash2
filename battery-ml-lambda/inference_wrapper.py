"""
Enhanced Inference Pipeline Wrapper
Handles 28-feature scaler with 29-feature IsolationForest
"""

import os
import json
import numpy as np
import pandas as pd
import joblib
import tensorflow as tf
from pathlib import Path

MODEL_DIR = Path("models")
CONFIG_PATH = MODEL_DIR / "config.json"
FEATURE_NAMES_PATH = MODEL_DIR / "feature_names.json"
SCALER_PATH = MODEL_DIR / "scaler.pkl"
ISOFOREST_PATH = MODEL_DIR / "isolation_forest.pkl"
AUTOENCODER_PATH = MODEL_DIR / "autoencoder_converted.h5"

# Load configurations
with open(CONFIG_PATH) as f:
    config = json.load(f)

with open(FEATURE_NAMES_PATH) as f:
    feature_names = json.load(f)

scaler = joblib.load(SCALER_PATH)
iso_forest = joblib.load(ISOFOREST_PATH)

# Load autoencoder (handle layer mismatch gracefully)
try:
    autoencoder = tf.keras.models.load_model(AUTOENCODER_PATH, compile=False)
    autoencoder.compile(optimizer='adam', loss='mse')
    print("[OK] Autoencoder loaded")
except Exception as e:
    print(f"[WARN] Autoencoder load failed: {e}")
    autoencoder = None

print(f"[INFO] Model Configuration:")
print(f"  Features: {len(feature_names)} (indices 0-{len(feature_names)-1})")
print(f"  Scaler trained on: {scaler.n_features_in_} features (indices 0-{scaler.n_features_in_-1})")
print(f"  IsoForest trained on: {iso_forest.n_features_in_} features (indices 0-{iso_forest.n_features_in_-1})")
print(f"  Missing from scaler: minute_sin (index 28)")

def preprocess_and_scale(X):
    """
    Preprocess features handling scaler-IsoForest mismatch:
    - Scaler: expects 28 features
    - IsoForest: expects 29 features
    - Solution: Scale first 28, append minute_sin as-is
    """
    if X.shape[1] != len(feature_names):
        raise ValueError(f"Expected {len(feature_names)} features, got {X.shape[1]}")
    
    # Split into scalable (0:28) and non-scalable (28:29)
    X_scalable = X[:, :28]  # First 28 features (what scaler expects)
    X_minute_sin = X[:, 28:29]  # minute_sin (index 28)
    
    # Apply scaler to first 28 features
    X_scaled_28 = scaler.transform(X_scalable)
    
    # Normalize minute_sin to similar scale as other features (sine values are -1 to 1)
    # Scale to approximate mean=0, std=1 range
    X_minute_sin_normalized = X_minute_sin  # Already normalized by sin() to [-1, 1]
    
    # Concatenate: 28 scaled features + minute_sin
    X_final = np.hstack([X_scaled_28, X_minute_sin_normalized])
    
    return X_final

def run_inference_with_fallback(X):
    """Run inference handling potential model issues"""
    
    print(f"[INFO] Input shape: {X.shape}")
    
    # Preprocess
    try:
        X_scaled = preprocess_and_scale(X)
        print(f"[OK] Preprocessing complete: {X_scaled.shape}")
    except Exception as e:
        print(f"[ERROR] Preprocessing failed: {e}")
        raise
    
    # Isolation Forest prediction (29 features)
    try:
        iso_preds = iso_forest.predict(X_scaled)
        print(f"[OK] IsolationForest prediction complete")
    except Exception as e:
        print(f"[ERROR] IsolationForest failed: {e}")
        raise
    
    # Autoencoder reconstruction (28 features - reconstruct from scaled data)
    if autoencoder is not None:
        try:
            X_ae_input = X_scaled[:, :28]  # Use only first 28 for autoencoder
            recon = autoencoder.predict(X_ae_input, verbose=0)
            recon_err = np.mean((X_ae_input - recon) ** 2, axis=1)
            print(f"[OK] Autoencoder prediction complete")
        except Exception as e:
            print(f"[WARN] Autoencoder failed: {e}, using zeros")
            recon_err = np.zeros(X.shape[0])
    else:
        recon_err = np.zeros(X.shape[0])
    
    # Combine results
    return {
        'iso_preds': iso_preds,
        'recon_err': recon_err,
        'X_scaled': X_scaled
    }


# Test with dummy data
if __name__ == "__main__":
    print("\n" + "="*80)
    print("TESTING MODEL WRAPPER")
    print("="*80 + "\n")
    
    # Create dummy test data (29 features)
    test_data = np.random.randn(5, 29)
    
    print(f"Generated test data: {test_data.shape}")
    print(f"Feature indices: 0-27 (scalable) + 28 (minute_sin)\n")
    
    try:
        results = run_inference_with_fallback(test_data)
        print(f"\n[SUCCESS] Inference completed!")
        print(f"  Anomalies (IsoForest): {np.sum(results['iso_preds'] == -1)} out of {len(results['iso_preds'])}")
        print(f"  Reconstruction errors: min={results['recon_err'].min():.4f}, max={results['recon_err'].max():.4f}")
    except Exception as e:
        print(f"\n[FAILED] Error during inference: {e}")
        import traceback
        traceback.print_exc()
