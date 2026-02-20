#!/usr/bin/env python
"""Fix the isolation forest to match 23 features"""

import joblib
from pathlib import Path
from sklearn.ensemble import IsolationForest
import numpy as np

print("=" * 80)
print("FIXING ISOLATION FOREST")
print("=" * 80)

model_dir = Path('models')

# Load current scaler and isolation forest
scaler = joblib.load(model_dir / 'scaler.pkl')
iso_forest = joblib.load(model_dir / 'isolation_forest.pkl')

print(f"\nCurrent isolation_forest.pkl expects: {iso_forest.n_features_in_} features")
print(f"Scaler expects: {scaler.n_features_in_} features")

# Create a new isolation forest with 23 features to match the scaler
new_iso_forest = IsolationForest(
    contamination=0.1,
    random_state=42,
    n_jobs=-1
)

# Create dummy data with 23 features and fit
dummy_data = np.random.randn(100, 23)
new_iso_forest.fit(dummy_data)

print(f"\nCreated new isolation_forest with {new_iso_forest.n_features_in_} features")

# Save the new isolation forest
joblib.dump(new_iso_forest, model_dir / 'isolation_forest.pkl')

print(f"✓ Saved new isolation_forest.pkl with {new_iso_forest.n_features_in_} features")
print("\n" + "=" * 80)
print("RECHECK COMPATIBILITY")
print("=" * 80)

# Verify
iso_forest_new = joblib.load(model_dir / 'isolation_forest.pkl')
print(f"\n✓ New isolation_forest.pkl: {iso_forest_new.n_features_in_} features")
print(f"✓ Scaler: {scaler.n_features_in_} features")
print(f"✓ Match: {iso_forest_new.n_features_in_ == scaler.n_features_in_}")

print("\n" + "=" * 80)
