"""
Generate sample gauge visualizations for different anomaly scenarios
"""

import io
import numpy as np
import matplotlib.pyplot as plt
from matplotlib.patches import Wedge, Circle
import os

def generate_test_gauge(total_anomalies, total_samples, device_id, output_path):
    """Generate a gauge visualization for testing."""
    
    # Determine status and color based on anomaly count (not percentage)
    if total_anomalies >= 50:
        color = "#FFB6C1"  # Light Red
        status = "DANGER ⚠"
    elif total_anomalies >= 30:
        color = "#87CEEB"  # Light Blue
        status = "CAUTION ▲"
    elif total_anomalies >= 15:
        color = "#FFFACD"  # Light Yellow
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
    
    # 5 equal color zones (0 LEFT → 100 RIGHT), each occupying 36° (180/5)
    zones = [
        (0, 5, "#4CAF50", 180, 144),      # Green: 0-5 anomalies
        (5, 15, "#90EE90", 144, 108),     # Light Green: 5-15 anomalies
        (15, 30, "#FFFACD", 108, 72),     # Light Yellow: 15-30 anomalies
        (30, 50, "#87CEEB", 72, 36),      # Light Blue: 30-50 anomalies
        (50, 100, "#FFB6C1", 36, 0),      # Light Red: 50-100 anomalies
    ]
    
    for start_count, end_count, zone_color, start_angle, end_angle in zones:
        wedge = Wedge(
            center=(0, 0),
            r=1,
            theta1=end_angle,
            theta2=start_angle,
            width=0.28,
            facecolor=zone_color,
            alpha=0.25,
        )
        ax.add_patch(wedge)
    
    # Calculate active angle based on anomaly count
    max_count = 100
    clamped_count = min(total_anomalies, max_count)
    active_angle = 180 - (clamped_count * 180 / max_count)
    
    # Active arc (filled from 0 to current count)
    active_wedge = Wedge(
        center=(0, 0),
        r=1,
        theta1=active_angle,
        theta2=180,
        width=0.28,
        facecolor=color,
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
    
    # Anomalies count inside dial (large text)
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
    
    # Detailed Stats (stacked below status)
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
    
    # Tick labels at zone boundaries (count values: 0, 5, 15, 30, 50, 100)
    tick_values = [0, 5, 15, 30, 50, 100]
    for val in tick_values:
        tick_angle = 180 - (val * 180 / max_count)
        x = 1.1 * np.cos(np.radians(tick_angle))
        y = 1.1 * np.sin(np.radians(tick_angle))
        ax.text(x, y, str(val),
                ha="center", va="center",
                fontsize=7)
    
    plt.tight_layout()
    
    # Save to file
    fig.savefig(output_path, format='png', dpi=120, bbox_inches='tight', facecolor='white')
    plt.close(fig)
    
    print(f"✓ Generated: {output_path}")
    return output_path


if __name__ == "__main__":
    # Create output directory
    output_dir = "sample_gauges"
    os.makedirs(output_dir, exist_ok=True)
    
    # Test scenarios with different anomaly counts
    scenarios = [
        {"anomalies": 2, "samples": 60, "device": "Device_SAFE", "description": "Safe - 2 anomalies (Green zone)"},
        {"anomalies": 5, "samples": 60, "device": "Device_NORMAL_LOW", "description": "Normal (boundary) - 5 anomalies (Light Green zone)"},
        {"anomalies": 9, "samples": 55, "device": "Device_NORMAL", "description": "Normal - 9 anomalies (Light Green zone)"},
        {"anomalies": 15, "samples": 48, "device": "Device_WARNING_LOW", "description": "Warning (boundary) - 15 anomalies (Light Yellow zone)"},
        {"anomalies": 22, "samples": 60, "device": "Device_WARNING", "description": "Warning - 22 anomalies (Light Yellow zone)"},
        {"anomalies": 30, "samples": 52, "device": "Device_CAUTION_LOW", "description": "Caution (boundary) - 30 anomalies (Light Blue zone)"},
        {"anomalies": 38, "samples": 60, "device": "Device_CAUTION", "description": "Caution - 38 anomalies (Light Blue zone)"},
        {"anomalies": 50, "samples": 60, "device": "Device_DANGER_LOW", "description": "Danger (boundary) - 50 anomalies (Light Red zone)"},
        {"anomalies": 68, "samples": 60, "device": "Device_DANGER", "description": "Danger - 68 anomalies (Light Red zone)"},
        {"anomalies": 100, "samples": 60, "device": "Device_CRITICAL", "description": "Critical - 100 anomalies (Light Red zone)"},
    ]
    
    print("=" * 70)
    print("GENERATING SAMPLE GAUGE VISUALIZATIONS")
    print("=" * 70)
    print()
    
    for scenario in scenarios:
        output_path = os.path.join(output_dir, f"{scenario['device']}.png")
        generate_test_gauge(
            total_anomalies=scenario["anomalies"],
            total_samples=scenario["samples"],
            device_id=scenario["device"],
            output_path=output_path
        )
        print(f"  {scenario['description']}")
        print()
    
    print("=" * 70)
    print(f"✓ ALL SAMPLES GENERATED in '{output_dir}' folder")
    print("=" * 70)
