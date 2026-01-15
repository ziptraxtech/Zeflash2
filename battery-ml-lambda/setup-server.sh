#!/bin/bash

# Server Setup Script - Run this on EC2 instance

echo "======================================"
echo "Setting up Battery ML Backend Server"
echo "======================================"

# Update system
echo "Updating system packages..."
sudo apt-get update
sudo apt-get upgrade -y

# Install Python and pip
echo "Installing Python 3.12..."
sudo apt-get install -y python3.12 python3.12-venv python3-pip

# Install system dependencies
echo "Installing system dependencies..."
sudo apt-get install -y build-essential libssl-dev libffi-dev python3-dev

# Create application directory
echo "Creating application directory..."
cd /home/ubuntu
mkdir -p battery-ml-backend
cd battery-ml-backend

# Install application (will be uploaded via SCP)
echo "Application files will be uploaded..."

# Create virtual environment
echo "Creating virtual environment..."
python3.12 -m venv venv
source venv/bin/activate

# Install Python packages
echo "Installing Python packages..."
pip install --upgrade pip
pip install fastapi==0.111.0
pip install uvicorn[standard]==0.30.0
pip install numpy==1.26.4
pip install h5py==3.7.0
pip install scikit-learn==1.3.2
pip install pandas==2.1.4
pip install joblib==1.3.2
pip install boto3
pip install requests
pip install matplotlib==3.8.2
pip install python-dotenv

# Note: TensorFlow will be skipped on lightweight EC2 instances
# The code already handles this gracefully

# Create systemd service
echo "Creating systemd service..."
sudo bash -c 'cat > /etc/systemd/system/battery-ml.service <<EOF
[Unit]
Description=Battery ML Backend API
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/battery-ml-backend
Environment="PATH=/home/ubuntu/battery-ml-backend/venv/bin"
ExecStart=/home/ubuntu/battery-ml-backend/venv/bin/uvicorn server:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF'

echo "Server setup complete!"
echo "Upload your application files and .env, then run:"
echo "sudo systemctl start battery-ml"
echo "sudo systemctl enable battery-ml"
