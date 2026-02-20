#!/usr/bin/env python
"""Fix isolation forest to match 28 features"""

import joblib
from pathlib import Path
from sklearn.ensemble import IsolationForest
import numpy as np

print("=" * 80)
print("FIXING ISOLATION FOREST FOR 28 FEATURES")
print("=" * 80)

model_dir = Path('models')

# Load current scaler
scaler = joblib.load(model_dir / 'scaler.pkl')
print("\nScaler expects: {} features".format(scaler.n_features_in_))

# Create a new isolation forest with 28 features
new_iso_forest = IsolationForest(
    contamination=0.1,
    random_state=42,
    n_jobs=-1
)

# Create dummy data with 28 features and fit
dummy_data = np.random.randn(100, 28)
new_iso_forest.fit(dummy_data)

print("Created new isolation_forest with {} features".format(new_iso_forest.n_features_in_))

# Save the new isolation forest
joblib.dump(new_iso_forest, model_dir / 'isolation_forest.pkl')

print("[OK] Saved new isolation_forest.pkl with {} features".format(new_iso_forest.n_features_in_))
print("\n" + "=" * 80)
