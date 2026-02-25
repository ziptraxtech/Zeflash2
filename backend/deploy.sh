#!/bin/bash
# deploy.sh — run this from your LOCAL machine to deploy backend to EC2
# Usage: ./backend/deploy.sh

EC2_IP="3.90.162.23"
EC2_USER="ec2-user"         # change to "ubuntu" if using Ubuntu AMI
SSH_KEY="~/.ssh/your-key.pem"  # ← UPDATE THIS to your actual .pem key path
REMOTE_DIR="/home/${EC2_USER}/zeflash-backend"

echo "🚀 Deploying Zeflash backend to EC2..."

# 1. Copy backend folder to EC2
rsync -avz --exclude='node_modules' --exclude='dist' --exclude='.env' \
  -e "ssh -i ${SSH_KEY}" \
  ./backend/ ${EC2_USER}@${EC2_IP}:${REMOTE_DIR}/

# 2. Copy .env separately
scp -i ${SSH_KEY} ./backend/.env ${EC2_USER}@${EC2_IP}:${REMOTE_DIR}/.env

# 3. SSH in and install/restart
ssh -i ${SSH_KEY} ${EC2_USER}@${EC2_IP} << 'ENDSSH'
  cd ~/zeflash-backend

  # Install Node.js 20 if not present
  if ! command -v node &> /dev/null; then
    curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
    sudo yum install -y nodejs
  fi

  # Install PM2 if not present
  if ! command -v pm2 &> /dev/null; then
    sudo npm install -g pm2
  fi

  # Install dependencies
  npm install

  # Generate Prisma client (for Linux)
  npx prisma generate

  # Build TypeScript
  npm run build

  # Start/restart with PM2
  pm2 delete zeflash-backend 2>/dev/null || true
  pm2 start dist/index.js --name zeflash-backend
  pm2 save
  pm2 startup

  echo "✅ Backend deployed and running on port 3001"
  pm2 status
ENDSSH

echo "✅ Deploy complete!"
echo "🌐 Backend running at http://${EC2_IP}:3001/health"
