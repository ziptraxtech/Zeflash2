"""
Generate sample battery health reports for all status levels.
Shows what the visualizations look like for different anomaly rates.
"""

import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import Polygon

def generate_report(device_id, anomaly_rate, total_samples, anomalies, output_filename):
    """Generate a battery health report visualization."""
    
    total_anomalies = sum(anomalies.values())
    
    # Determine health status
    if anomaly_rate < 10:
        status_color = '#27ae60'
        status_text = "SAFE"
        safety_level = "SAFE"
        badge_color = '#27ae60'
        fill_color = '#27ae60'
        zone_colors = ['#d5f4e6', '#80c997', '#27ae60']
    elif anomaly_rate < 33:
        status_color = '#52be80'
        status_text = "NORMAL"
        safety_level = "NORMAL"
        badge_color = '#52be80'
        fill_color = '#52be80'
        zone_colors = ['#d5f4e6', '#85c1e0', '#52be80']
    elif anomaly_rate < 50:
        status_color = '#f39c12'
        status_text = "WARNING"
        safety_level = "AT RISK"
        badge_color = '#f39c12'
        fill_color = '#f39c12'
        zone_colors = ['#fef5e7', '#f8b88b', '#f39c12']
    elif anomaly_rate < 75:
        status_color = '#e67e22'
        status_text = "CAUTION"
        safety_level = "HIGH RISK"
        badge_color = '#e67e22'
        fill_color = '#e67e22'
        zone_colors = ['#fdebd0', '#f5b7b1', '#e67e22']
    else:
        status_color = '#c0392b'
        status_text = "DANGER"
        safety_level = "DANGER"
        badge_color = '#c0392b'
        fill_color = '#c0392b'
        zone_colors = ['#fadbd8', '#f5b7b1', '#c0392b']
    
    # Create figure
    fig = plt.figure(figsize=(10, 11), facecolor='#f8f9fa')
    
    # Main title
    fig.text(0.5, 0.975, "Battery Health Report", 
             ha='center', fontsize=24, fontweight='bold', color='#1a1a1a')
    fig.text(0.5, 0.94, f"Device: {device_id}", 
             ha='center', fontsize=12, color='#666', style='italic')
    
    # Status badge
    fig.text(0.5, 0.89, safety_level, 
             ha='center', fontsize=16, fontweight='bold', color='white',
             bbox=dict(boxstyle='round,pad=0.8', facecolor=badge_color, 
                      edgecolor='#000', linewidth=2, alpha=0.95))
    
    # Create gauge
    ax = fig.add_subplot(111, projection='polar')
    ax.set_theta_offset(np.pi)
    ax.set_theta_direction(-1)
    ax.set_xticks([])
    ax.set_yticks([])
    ax.spines['polar'].set_visible(False)
    ax.set_ylim(0, 1.15)
    
    theta = np.linspace(0, np.pi, 100)
    
    # Draw zones
    zone_ranges = [
        (theta[:34], zone_colors[0]),
        (theta[33:67], zone_colors[1]),
        (theta[66:], zone_colors[2])
    ]
    
    for zone_theta, zone_color in zone_ranges:
        ax.fill_between(zone_theta, 0, 1, color=zone_color, alpha=0.25, linewidth=0)
    
    # Gauge boundaries
    ax.plot(theta, np.ones_like(theta), color='#333', linewidth=2.5, zorder=3)
    ax.plot([0, 0], [0.95, 1.02], color='#333', linewidth=1.5, zorder=3)
    ax.plot([np.pi, np.pi], [0.95, 1.02], color='#333', linewidth=1.5, zorder=3)
    
    # Tick marks
    tick_angles = [0, np.pi/4, np.pi/2, 3*np.pi/4, np.pi]
    tick_labels = ['0%', '25%', '50%', '75%', '100%']
    
    for angle, label in zip(tick_angles, tick_labels):
        ax.plot([angle, angle], [0.96, 1.01], color='#333', linewidth=1.5, zorder=3)
        ax.text(angle, 1.12, label, ha='center', va='center', 
                fontsize=10, fontweight='bold', color='#333')
    
    # Fill gauge
    percentage_clamped = min(max(anomaly_rate, 0), 100)
    fill_end_idx = int(percentage_clamped)
    if fill_end_idx > 0:
        ax.fill_between(theta[0:fill_end_idx], 0, 1, color=fill_color, alpha=0.8, linewidth=0)
    
    fill_theta = theta[0:fill_end_idx] if fill_end_idx > 0 else [0]
    ax.plot(fill_theta, np.ones_like(fill_theta), color=fill_color, linewidth=3, zorder=4)
    
    # Pointer
    needle_angle = np.pi * (percentage_clamped / 100)
    pointer_width = 0.08
    pointer_height = 0.28
    
    pointer_patch = Polygon(
        [[needle_angle - pointer_width, 0.85],
         [needle_angle + pointer_width, 0.85],
         [needle_angle, 0.88 + pointer_height]],
        transform=ax.transData,
        facecolor=status_color,
        edgecolor='#000',
        linewidth=1.5,
        zorder=8,
        closed=True
    )
    ax.add_patch(pointer_patch)
    
    # Center hub
    circle = plt.Circle((0, 0), 0.08, transform=ax.transData, 
                       facecolor='#333', edgecolor='#000', linewidth=2, zorder=9)
    ax.add_patch(circle)
    
    # Percentage display
    ax.text(np.pi/2, 0.35, f"{percentage_clamped:.0f}%", 
            ha='center', va='center', fontsize=64, fontweight='900', 
            color=status_color, zorder=10)
    
    # Status text
    ax.text(np.pi/2, 0.15, status_text, 
            ha='center', va='center', fontsize=18, fontweight='bold', 
            color=status_color, zorder=10)
    
    # Metrics
    fig.text(0.5, 0.27, f"Samples: {total_samples}", 
             ha='center', fontsize=14, color='#333', fontweight='600')
    
    fig.text(0.5, 0.22, f"Anomalies: {total_anomalies}", 
             ha='center', fontsize=14, color='#e74c3c', fontweight='600')
    
    fig.tight_layout(rect=[0, 0.15, 1, 0.88])
    
    # Save
    fig.savefig(output_filename, format='png', dpi=100, bbox_inches='tight', facecolor='#f8f9fa')
    plt.close(fig)
    
    return status_text, total_anomalies

# Generate reports for all status levels
print("=" * 60)
print("GENERATING SAMPLE BATTERY HEALTH REPORTS")
print("=" * 60)
print()

samples = [
    {
        "device_id": "SAFE_DEVICE",
        "anomaly_rate": 5.0,
        "total_samples": 60,
        "anomalies": {"critical": 0, "high": 1, "medium": 1, "low": 1},
        "filename": "sample_safe_report.png"
    },
    {
        "device_id": "NORMAL_DEVICE",
        "anomaly_rate": 18.0,
        "total_samples": 60,
        "anomalies": {"critical": 2, "high": 3, "medium": 3, "low": 3},
        "filename": "sample_normal_report.png"
    },
    {
        "device_id": "WARNING_DEVICE",
        "anomaly_rate": 40.0,
        "total_samples": 60,
        "anomalies": {"critical": 5, "high": 8, "medium": 7, "low": 4},
        "filename": "sample_warning_report.png"
    },
    {
        "device_id": "CAUTION_DEVICE",
        "anomaly_rate": 65.0,
        "total_samples": 60,
        "anomalies": {"critical": 15, "high": 12, "medium": 9, "low": 3},
        "filename": "sample_caution_report.png"
    },
    {
        "device_id": "CRITICAL_DEVICE",
        "anomaly_rate": 95.0,
        "total_samples": 60,
        "anomalies": {"critical": 30, "high": 15, "medium": 8, "low": 4},
        "filename": "sample_critical_report.png"
    }
]

for sample in samples:
    status, total_anom = generate_report(
        sample["device_id"],
        sample["anomaly_rate"],
        sample["total_samples"],
        sample["anomalies"],
        sample["filename"]
    )
    print(f"✅ {status:12s} - {sample['anomaly_rate']:5.1f}% anomalies - {sample['filename']}")

print()
print("=" * 60)
print("All sample reports generated successfully!")
print("=" * 60)
print()
print("Files created:")
for sample in samples:
    print(f"  • {sample['filename']}")
