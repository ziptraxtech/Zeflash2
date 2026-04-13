#!/bin/bash

# Zeflash Backend EC2 Deployment - Node.js Direct Install
# This script deploys the backend directly on EC2 using Node.js (no Docker required)

set -e

echo "=========================================="
echo "Zeflash Backend Direct Node.js Deployment"
echo "==========================================="

# Configuration
APP_DIR="/opt/zeflash-backend"
BACKEND_PORT=3000
NODE_VERSION="20"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Step 1: Install system dependencies
echo -e "${YELLOW}Installing system dependencies...${NC}"
sudo yum update -y
sudo yum install -y nodejs npm git curl

# Step 2: Create app directory
echo -e "${YELLOW}Creating application directory...${NC}"
sudo mkdir -p ${APP_DIR}
sudo chown -R $USER:$USER ${APP_DIR}

# Step 3: Clone or copy source code
echo -e "${YELLOW}Setting up backend code...${NC}"
cd ${APP_DIR}

# Option A: If code is already copied
# mkdir -p src/routes src/middleware src/lib src/services
# Copy all source files here

# Option B: If cloning from git (uncomment and update)
# git clone https://your-repo.git .
# cd backend

# For now, assuming source is copied - create start script
mkdir -p src logs

# Step 4: Install dependencies
echo -e "${YELLOW}Installing npm dependencies...${NC}"
npm install

# Step 5: Build TypeScript
echo -e "${YELLOW}Building TypeScript...${NC}"
npm run build

# Step 6: Create systemd service
echo -e "${YELLOW}Creating systemd service...${NC}"
sudo tee /etc/systemd/system/zeflash-backend.service > /dev/null <<EOF
[Unit]
Description=Zeflash Backend Service
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=${APP_DIR}
Environment="NODE_ENV=production"
Environment="PORT=${BACKEND_PORT}"
Environment="ML_BACKEND_URL=http://localhost:8000"
Environment="S3_BUCKET=battery-ml-results-test"
Environment="AWS_REGION=us-east-1"
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=10
StandardOutput=append:${APP_DIR}/logs/app.log
StandardError=append:${APP_DIR}/logs/error.log

[Install]
WantedBy=multi-user.target
EOF

# Step 7: Start service
echo -e "${YELLOW}Starting service...${NC}"
sudo systemctl daemon-reload
sudo systemctl enable zeflash-backend
sudo systemctl start zeflash-backend

# Step 8: Verify
echo -e "${YELLOW}Verifying service...${NC}"
sleep 3

if sudo systemctl is-active --quiet zeflash-backend; then
  echo -e "${GREEN}✅ Backend service is running!${NC}"
  echo -e "${GREEN}Backend URL: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):${BACKEND_PORT}${NC}"
  echo ""
  echo -e "${YELLOW}Useful commands:${NC}"
  echo "  View logs: tail -f ${APP_DIR}/logs/app.log"
  echo "  Health check: curl http://localhost:${BACKEND_PORT}/health"
  echo "  Stop service: sudo systemctl stop zeflash-backend"
  echo "  Service status: sudo systemctl status zeflash-backend"
else
  echo -e "${RED}❌ Service failed to start!${NC}"
  echo -e "${YELLOW}Check logs:${NC}"
  sudo systemctl status zeflash-backend
  tail -50 ${APP_DIR}/logs/error.log
  exit 1
fi
