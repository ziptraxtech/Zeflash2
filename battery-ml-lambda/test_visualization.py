"""Test the visualization generation"""
import os
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'

import sys
sys.path.insert(0, os.path.dirname(__file__))

from inference_pipeline import generate_visualization, config
import json

print("=" * 80)
print("VISUALIZATION TEST")
print("=" * 80)

# Create a sample result
result = {
    "status": "Degradation Accelerating",
    "anomalies": {
        "critical": 5,
        "high": 25,
        "medium": 10,
        "low": 5
    },
    "total_samples": 56,
    "recommendations": ["Check battery", "Monitor temperature"]
}

device_id = "032300130C03074_1"

print("\nGenerating visualization...")
print(f"Device: {device_id}")
print(f"Status: {result['status']}")
print(f"Anomalies: {result['anomalies']}")
print(f"\nDevices in config: {len(config.get('device_verdicts', {}))}")

# Generate visualization
buf = generate_visualization(result, device_id)

# Save to test file
output_path = "test_gauge_output.png"
with open(output_path, 'wb') as f:
    f.write(buf.getvalue())

print(f"\n[OK] Visualization saved to: {output_path}")
print(f"  File size: {len(buf.getvalue())} bytes")
print("\nOpen the file to view the gauge meters!")
print("=" * 80)
