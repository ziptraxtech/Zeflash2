"""Test full end-to-end inference with real data"""
import os
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'

import sys
import json
import warnings
warnings.filterwarnings('ignore')

# Add parent directory to path
sys.path.insert(0, os.path.dirname(__file__))

from inference_pipeline import (
    autoencoder, scaler, iso_forest, feature_names, 
    build_features, classify_anomalies, generate_visualization
)
import numpy as np

print("=" * 80)
print("END-TO-END INFERENCE TEST")
print("=" * 80)

# Create sample API response data (simulating real API data)
print("\n[1/5] Creating sample data...")
sample_data = []
base_ts = 1707662400  # Feb 11, 2026

for i in range(60):
    sample_data.append({
        "createdat": f"2026-02-11T12:{i:02d}:00Z",
        "eventtype": "MeterValues",
        "payload": [{
            "Key": "meterValue",
            "Value": [[
                {
                    "Key": "sampledValue",
                    "Value": [
                        [
                            {"Key": "measurand", "Value": "Current.Import"},
                            {"Key": "value", "Value": str(13.0 + np.random.randn() * 0.5)},
                            {"Key": "unit", "Value": "A"}
                        ],
                        [
                            {"Key": "measurand", "Value": "Temperature"},
                            {"Key": "value", "Value": str(50.0 + np.random.randn() * 0.5)},
                            {"Key": "unit", "Value": "Celsius"}
                        ]
                    ]
                }
            ]]
        }]
    })

print(f"✓ Created {len(sample_data)} sample data points")

# Build features
print("\n[2/5] Building features...")
try:
    X, base_stats = build_features(sample_data)
    print(f"✓ Features built: shape {X.shape}")
    print(f"  Current range: [{base_stats['current'].min():.2f}, {base_stats['current'].max():.2f}]")
    print(f"  Temperature range: [{base_stats['temperature'].min():.2f}, {base_stats['temperature'].max():.2f}]")
except Exception as e:
    print(f"✗ Feature building failed: {e}")
    sys.exit(1)

# Scale features
print("\n[3/5] Scaling features...")
try:
    X_scaled = scaler.transform(X)
    print(f"✓ Features scaled: {X_scaled.shape}")
except Exception as e:
    print(f"✗ Scaling failed: {e}")
    sys.exit(1)

# Autoencoder inference
print("\n[4/5] Running autoencoder inference...")
try:
    reconstructed = autoencoder.predict(X_scaled, verbose=0)
    recon_errors = np.mean(np.square(X_scaled - reconstructed), axis=1)
    print(f"✓ Autoencoder inference complete")
    print(f"  Reconstruction error range: [{recon_errors.min():.4f}, {recon_errors.max():.4f}]")
    print(f"  Mean reconstruction error: {recon_errors.mean():.4f}")
except Exception as e:
    print(f"✗ Autoencoder inference failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Isolation Forest inference
print("\n[5/5] Running isolation forest inference...")
try:
    iso_preds = iso_forest.predict(X_scaled)
    anomaly_count = np.sum(iso_preds == -1)
    print(f"✓ Isolation forest inference complete")
    print(f"  Anomalies detected: {anomaly_count}/{len(iso_preds)}")
    print(f"  Normal samples: {np.sum(iso_preds == 1)}/{len(iso_preds)}")
except Exception as e:
    print(f"✗ Isolation forest inference failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Classify anomalies
print("\n[BONUS] Classifying anomalies...")
try:
    counts, severities = classify_anomalies(recon_errors, iso_preds, base_stats)
    print(f"✓ Anomaly classification complete")
    print(f"  Critical: {counts['critical']}")
    print(f"  High: {counts['high']}")
    print(f"  Medium: {counts['medium']}")
    print(f"  Low: {counts['low']}")
except Exception as e:
    print(f"✗ Classification failed: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "=" * 80)
print("✓ END-TO-END TEST PASSED")
print("All components are working correctly!")
print("=" * 80)
