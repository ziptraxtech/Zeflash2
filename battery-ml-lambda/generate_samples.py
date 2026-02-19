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

def generate_sample_gauge(total_anomalies, device_id, filename):
    """Generate a sample gauge for given anomaly count."""
    
    # Determine status and color based on anomaly count
    if total_anomalies >= 50:
        color = "#DC143C"  # Dark Red
        status = "DANGER ⚠"
    elif total_anomalies >= 30:
        color = "#FF8C00"  # Orange
        status = "CAUTION ▲"
    elif total_anomalies >= 15:
        color = "#DAA520"  # Dark Yellow/Goldenrod
        status = "WARNING !"
    elif total_anomalies >= 5:
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
    
    # Calculate active angle based on anomaly count
    max_count = 100
    clamped_count = min(total_anomalies, max_count)
    active_angle = 180 - (clamped_count * 180 / max_count)
    
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
    
    # Anomalies count inside dial
    ax.text(
        0, 0.30,
        f"{total_anomalies}",
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
        bbox=dict(facecolor="white", edgecolor="none", pad=2),
        zorder=10
    )
    
    # Sample count (mock value)
    total_samples = 60
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
    
    # Tick labels at zone boundaries
    tick_values = [0, 5, 15, 30, 50, 100]
    for val in tick_values:
        tick_angle = 180 - (val * 180 / max_count)
        x = 1.1 * np.cos(np.radians(tick_angle))
        y = 1.1 * np.sin(np.radians(tick_angle))
        ax.text(x, y, str(val),
                ha="center", va="center",
                fontsize=7)
    
    plt.tight_layout()
    
    # Save
    filepath = os.path.join(output_dir, filename)
    fig.savefig(filepath, format='png', dpi=120, bbox_inches='tight', facecolor='white')
    plt.close(fig)
    
    print(f"✓ Generated: {filepath}")


# Generate samples for different scenarios
print("Generating sample gauge images...\n")

scenarios = [
    (0, "TestDevice_0", "01_safe_0_anomalies.png"),
    (3, "TestDevice_1", "02_safe_3_anomalies.png"),
    (7, "TestDevice_2", "03_normal_7_anomalies.png"),
    (12, "TestDevice_3", "04_normal_12_anomalies.png"),
    (18, "TestDevice_4", "05_warning_18_anomalies.png"),
    (25, "TestDevice_5", "06_warning_25_anomalies.png"),
    (35, "TestDevice_6", "07_caution_35_anomalies.png"),
    (45, "TestDevice_7", "08_caution_45_anomalies.png"),
    (60, "TestDevice_8", "09_danger_60_anomalies.png"),
    (85, "TestDevice_9", "10_danger_85_anomalies.png"),
]

for anomaly_count, device_name, filename in scenarios:
    generate_sample_gauge(anomaly_count, device_name, filename)

print(f"\n✅ All sample images generated in '{output_dir}/' directory!")
print(f"   Total: {len(scenarios)} images")
print("\nReview these images before deploying to AWS.")
