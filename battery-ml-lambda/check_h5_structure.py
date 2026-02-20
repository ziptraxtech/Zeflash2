"""Check the structure of the autoencoder H5 file"""
import h5py
from pathlib import Path

h5_path = Path('models/autoencoder_final.h5')

print("=" * 80)
print(f"Checking: {h5_path}")
print("=" * 80)

with h5py.File(h5_path, 'r') as f:
    print("\nTop-level keys:")
    for key in f.keys():
        print(f"  - {key}")
    
    if 'model_weights' in f:
        print("\nModel weights structure:")
        model_weights = f['model_weights']
        for layer_name in model_weights.keys():
            print(f"\n  Layer: {layer_name}")
            layer_group = model_weights[layer_name]
            if hasattr(layer_group, 'keys'):
                for sub_key in layer_group.keys():
                    print(f"    - {sub_key}")
                    if hasattr(layer_group[sub_key], 'keys'):
                        for weight_name in layer_group[sub_key].keys():
                            shape = layer_group[sub_key][weight_name].shape
                            print(f"      * {weight_name}: {shape}")

print("\n" + "=" * 80)
