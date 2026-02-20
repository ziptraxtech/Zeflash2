import os
import sys
from PIL import Image

# Check the two generated images
device1_path = "reports/122300103C03183_1/battery_health_report.png"
device2_path = "reports/122300103C03202_2/battery_health_report.png"

print("=" * 60)
print("COMPARING GENERATED REPORTS")
print("=" * 60)

if os.path.exists(device1_path):
    img1 = Image.open(device1_path)
    print(f"\nDevice 1 (122300103C03183_1):")
    print(f"  File size: {os.path.getsize(device1_path):,} bytes")
    print(f"  Image dimensions: {img1.size}")
    print(f"  Image mode: {img1.mode}")
else:
    print(f"\nDevice 1: File not found")

if os.path.exists(device2_path):
    img2 = Image.open(device2_path)
    print(f"\nDevice 2 (122300103C03202_2):")
    print(f"  File size: {os.path.getsize(device2_path):,} bytes")
    print(f"  Image dimensions: {img2.size}")
    print(f"  Image mode: {img2.mode}")
else:
    print(f"\nDevice 2: File not found")

# Compare pixels if both exist
if os.path.exists(device1_path) and os.path.exists(device2_path):
    img1_data = list(img1.getdata())
    img2_data = list(img2.getdata())
    
    if img1_data == img2_data:
        print("\n⚠️  WARNING: Images are IDENTICAL (same pixel data)")
    else:
        different_pixels = sum(1 for p1, p2 in zip(img1_data, img2_data) if p1 != p2)
        total_pixels = len(img1_data)
        diff_percent = (different_pixels / total_pixels) * 100
        print(f"\n✓ Images are DIFFERENT:")
        print(f"  Different pixels: {different_pixels:,} / {total_pixels:,} ({diff_percent:.2f}%)")
