"""
Generate a sample critical battery health report visualization locally.
This shows what a device with 90%+ anomalies would look like.
"""

import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import Polygon

# Sample critical device data
device_id = "CRITICAL_DEVICE_SAMPLE"
anomaly_rate = 95.0  # 95% anomalies - CRITICAL
total_samples = 60
total_anomalies = 57  # 57 out of 60

# Anomaly breakdown by severity
anomalies = {
    "critical": 30,
    "high": 15,
    "medium": 8,
    "low": 4
}

# Determine status based on rate
status_color = '#c0392b'  # Dark Red
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

# Status badge at top
fig.text(0.5, 0.89, safety_level, 
         ha='center', fontsize=16, fontweight='bold', color='white',
         bbox=dict(boxstyle='round,pad=0.8', facecolor=badge_color, 
                  edgecolor='#000', linewidth=2, alpha=0.95))

# Create gauge
ax = fig.add_subplot(111, projection='polar')

# Remove axes
ax.set_theta_offset(np.pi)
ax.set_theta_direction(-1)
ax.set_xticks([])
ax.set_yticks([])
ax.spines['polar'].set_visible(False)
ax.set_ylim(0, 1.15)

# Gauge angles
theta = np.linspace(0, np.pi, 100)

# Draw zone backgrounds
zone_ranges = [
    (theta[:34], zone_colors[0]),
    (theta[33:67], zone_colors[1]),
    (theta[66:], zone_colors[2])
]

for zone_theta, zone_color in zone_ranges:
    ax.fill_between(zone_theta, 0, 1, color=zone_color, alpha=0.25, linewidth=0)

# Draw gauge boundaries
ax.plot(theta, np.ones_like(theta), color='#333', linewidth=2.5, zorder=3)
ax.plot([0, 0], [0.95, 1.02], color='#333', linewidth=1.5, zorder=3)
ax.plot([np.pi, np.pi], [0.95, 1.02], color='#333', linewidth=1.5, zorder=3)

# Draw tick marks and labels
tick_angles = [0, np.pi/4, np.pi/2, 3*np.pi/4, np.pi]
tick_labels = ['0%', '25%', '50%', '75%', '100%']

for angle, label in zip(tick_angles, tick_labels):
    ax.plot([angle, angle], [0.96, 1.01], color='#333', linewidth=1.5, zorder=3)
    label_dist = 1.12
    ax.text(angle, label_dist, label, ha='center', va='center', 
            fontsize=10, fontweight='bold', color='#333')

# Fill up to anomaly percentage
percentage_clamped = min(max(anomaly_rate, 0), 100)
fill_end_idx = int(percentage_clamped)
if fill_end_idx > 0:
    ax.fill_between(theta[0:fill_end_idx], 0, 1, color=fill_color, alpha=0.8, linewidth=0)

# Draw filled arc border
fill_theta = theta[0:fill_end_idx] if fill_end_idx > 0 else [0]
ax.plot(fill_theta, np.ones_like(fill_theta), color=fill_color, linewidth=3, zorder=4)

# Calculate needle position
needle_angle = np.pi * (percentage_clamped / 100)

# Draw pointer as filled triangle
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

# Draw center hub
circle = plt.Circle((0, 0), 0.08, transform=ax.transData, 
                   facecolor='#333', edgecolor='#000', linewidth=2, zorder=9)
ax.add_patch(circle)

# Main percentage display (in center of gauge)
ax.text(np.pi/2, 0.35, f"{percentage_clamped:.0f}%", 
        ha='center', va='center', fontsize=64, fontweight='900', 
        color=status_color, zorder=10)

# Status text on gauge
ax.text(np.pi/2, 0.15, status_text, 
        ha='center', va='center', fontsize=18, fontweight='bold', 
        color=status_color, zorder=10)

# Metrics below the gauge
fig.text(0.5, 0.27, f"Samples: {total_samples}", 
         ha='center', fontsize=14, color='#333', fontweight='600')

fig.text(0.5, 0.22, f"Anomalies: {total_anomalies}", 
         ha='center', fontsize=14, color='#e74c3c', fontweight='600')

fig.tight_layout(rect=[0, 0.15, 1, 0.88])

# Save the figure
output_path = "sample_critical_report.png"
fig.savefig(output_path, format='png', dpi=100, bbox_inches='tight', facecolor='#f8f9fa')
plt.close(fig)

print(f"✅ Sample critical report generated: {output_path}")
print(f"\nReport Details:")
print(f"  Device ID: {device_id}")
print(f"  Status: {status_text}")
print(f"  Anomaly Rate: {anomaly_rate}%")
print(f"  Total Samples: {total_samples}")
print(f"  Total Anomalies: {total_anomalies}")
print(f"  Breakdown:")
print(f"    - Critical: {anomalies['critical']}")
print(f"    - High: {anomalies['high']}")
print(f"    - Medium: {anomalies['medium']}")
print(f"    - Low: {anomalies['low']}")
