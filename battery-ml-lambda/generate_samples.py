"""
Generate sample gauge images for different anomaly scenarios
"""

import io
import os
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Wedge, Circle

# Create output directory
output_dir = "sample_gauges"
os.makedirs(output_dir, exist_ok=True)

def generate_sample_gauge(total_anomalies, total_samples, device_id, filename):
    """Generate a sample gauge for given anomaly count and total samples."""
    
    # Calculate anomaly percentage
    anomaly_percentage = (total_anomalies / total_samples * 100) if total_samples > 0 else 0
    
    # Determine status and color based on anomaly percentage
    if anomaly_percentage >= 50:
        color = "#DC143C"  # Dark Red
        status = "DANGER ⚠"
    elif anomaly_percentage >= 30:
        color = "#FF8C00"  # Orange
        status = "WARNING !"
    elif anomaly_percentage >= 15:
        color = "#DAA520"  # Dark Yellow/Goldenrod
        status = "CAUTION ▲"
    elif anomaly_percentage >= 5:
        color = "#90EE90"  # Light Green
        status = "NORMAL"
    else:
        color = "#4CAF50"  # Green
        status = "SAFE ✔"
    
    # Create figure
    fig, ax = plt.subplots(figsize=(6, 5), facecolor='white')
    
    # Axis setup
    ax.set_xlim(-1.3, 1.3)
    ax.set_ylim(-0.9, 1.3)
    ax.set_aspect("equal")
    ax.axis("off")
    
    # Calculate active angle based on anomaly percentage
    clamped_percentage = min(anomaly_percentage, 100)
    active_angle = 180 - (clamped_percentage * 180 / 100)
    
    # Draw black background for entire gauge (unfilled portion)
    black_background = Wedge(
        center=(0, 0),
        r=1,
        theta1=0,
        theta2=180,
        width=0.28,
        facecolor='#2C2C2C',  # Dark gray/black
        edgecolor='#666666',
        linewidth=1,
    )
    ax.add_patch(black_background)
    
    # Draw zone boundary lines (thin lines at 36° intervals)
    zone_boundaries = [144, 108, 72, 36]
    for boundary_angle in zone_boundaries:
        angle_rad = np.radians(boundary_angle)
        x1 = 0.72 * np.cos(angle_rad)
        y1 = 0.72 * np.sin(angle_rad)
        x2 = 1.0 * np.cos(angle_rad)
        y2 = 1.0 * np.sin(angle_rad)
        ax.plot([x1, x2], [y1, y2], color='#444444', linewidth=1, zorder=2)
    
    # Active arc (filled from 0 to current count with zone color)
    active_wedge = Wedge(
        center=(0, 0),
        r=1,
        theta1=active_angle,
        theta2=180,
        width=0.28,
        facecolor=color,
        edgecolor='white',
        linewidth=2,
        alpha=1,
    )
    ax.add_patch(active_wedge)
    
    # Needle
    needle_length = 0.62
    needle_x = needle_length * np.cos(np.radians(active_angle))
    needle_y = needle_length * np.sin(np.radians(active_angle))
    
    ax.plot([0, needle_x], [0, needle_y],
            linewidth=2, color="black", zorder=4)
    
    center_circle = Circle((0, 0), 0.07, color="black", zorder=5)
    ax.add_patch(center_circle)
    
    # Device Name at top
    ax.text(
        0, 1.20,
        device_id,
        ha="center",
        fontsize=14,
        fontweight="bold"
    )
    
    # Anomaly percentage inside dial
    ax.text(
        0, 0.30,
        f"{anomaly_percentage:.1f}%",
        ha="center",
        fontsize=32,
        fontweight="bold",
        color=color
    )
    
    ax.text(
        0, 0.12,
        "ANOMALIES",
        ha="center",
        fontsize=10,
        color="gray"
    )
    
    # Status below dial
    ax.text(
        0, -0.20,
        status,
        ha="center",
        fontsize=18,
        fontweight="bold",
        color=color,
        bbox=dict(facecolor="white", edgecolor=color, linewidth=2.5, pad=8, boxstyle='round,pad=0.5'),
        zorder=10
    )
    
    # Sample count
    ax.text(
        0, -0.45,
        f"Samples: {total_samples}",
        ha="center",
        fontsize=10,
        color="gray"
    )
    
    ax.text(
        0, -0.55,
        f"Anomalies: {total_anomalies}",
        ha="center",
        fontsize=10,
        color="gray"
    )
    
    # Tick labels at zone boundaries (percentage values)
    tick_values = [0, 5, 15, 30, 50, 100]
    for val in tick_values:
        tick_angle = 180 - (val * 180 / 100)
        x = 1.1 * np.cos(np.radians(tick_angle))
        y = 1.1 * np.sin(np.radians(tick_angle))
        ax.text(x, y, f"{val}%",
                ha="center", va="center",
                fontsize=7)
    
    plt.tight_layout()
    
    # Save
    filepath = os.path.join(output_dir, filename)
    fig.savefig(filepath, format='png', dpi=120, bbox_inches='tight', facecolor='white')
    plt.close(fig)
    
    print(f"✓ Generated: {filepath}")


# Generate samples for different percentage scenarios
print("Generating sample gauge images...\n")

scenarios = [
    # (anomalies, total_samples, device_name, filename)
    (0, 60, "TestDevice_0", "01_safe_0pct.png"),          # 0.0%
    (2, 60, "TestDevice_1", "02_safe_3pct.png"),          # 3.3%
    (4, 60, "TestDevice_2", "03_normal_7pct.png"),        # 6.7%
    (8, 60, "TestDevice_3", "04_normal_13pct.png"),       # 13.3%
    (10, 60, "TestDevice_4", "05_caution_17pct.png"),     # 16.7%
    (15, 60, "TestDevice_5", "06_caution_25pct.png"),     # 25.0%
    (20, 60, "TestDevice_6", "07_warning_33pct.png"),     # 33.3%
    (27, 60, "TestDevice_7", "08_warning_45pct.png"),     # 45.0%
    (33, 60, "TestDevice_8", "09_danger_55pct.png"),      # 55.0%
    (50, 60, "TestDevice_9", "10_danger_83pct.png"),      # 83.3%
]

for anomaly_count, sample_count, device_name, filename in scenarios:
    generate_sample_gauge(anomaly_count, sample_count, device_name, filename)

print(f"\n✅ All sample images generated in '{output_dir}/' directory!")
print(f"   Total: {len(scenarios)} images")
print("\nReview these images before deploying to AWS.")
