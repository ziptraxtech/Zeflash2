"""
Quick test script for new model
"""
import numpy as np
import tensorflow as tf
from tensorflow import keras
import pickle
import json

print("Testing new model...")

# Load model without compiling (avoid metric issues)
model = keras.models.load_model('models/autoencoder_best.h5', compile=False)
print(f"✓ Model loaded: {model.input_shape} -> {model.output_shape}")

# Load scaler
with open('models/scaler.pkl', 'rb') as f:
    scaler = pickle.load(f)
print(f"✓ Scaler loaded: {scaler.n_features_in_} features")

# Load config
with open('models/config.json', 'r') as f:
    config = json.load(f)
print(f"✓ Config loaded: {config['total_samples']} samples, created {config['date_created']}")

# Test prediction with dummy data
test_data = np.random.randn(1, 28)  # 28 features
scaled_data = scaler.transform(test_data)
prediction = model.predict(scaled_data, verbose=0)
reconstruction_error = np.mean(np.square(scaled_data - prediction))

print(f"\n✓ Test prediction successful!")
print(f"  Reconstruction error: {reconstruction_error:.6f}")
print(f"  Threshold: {config['autoencoder_threshold']:.6f}")
print(f"  Status: {'ANOMALY' if reconstruction_error > config['autoencoder_threshold'] else 'NORMAL'}")
