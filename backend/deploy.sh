#!/bin/bash
# deploy.sh — run this from your LOCAL machine to deploy backend to EC2
# Usage: ./backend/deploy.sh

EC2_IP="3.90.162.23"
EC2_USER="ubuntu"
SSH_KEY="$HOME/.ssh/battery-ml-key.pem"
REMOTE_DIR="/home/${EC2_USER}/zeflash-backend"

echo "🚀 Deploying Zeflash backend to EC2..."

# 1. Copy backend folder to EC2
rsync -avz --exclude='node_modules' --exclude='dist' --exclude='.env' \
  -e "ssh -i ${SSH_KEY}" \
  ./backend/ ${EC2_USER}@${EC2_IP}:${REMOTE_DIR}/

# 2. Copy .env separately — but never overwrite the server's with an empty or
#    missing local file. Doing so wipes RAZORPAY_*, DATABASE_URL and the Clerk
#    keys, and the backend will not restart.
if [ -s ./backend/.env ]; then
  echo "📋 Copying local backend/.env to server..."
  scp -i ${SSH_KEY} ./backend/.env ${EC2_USER}@${EC2_IP}:${REMOTE_DIR}/.env
else
  echo "⚠️  Local backend/.env is missing or empty — keeping the server's existing .env."
fi

# 3. SSH in and install/restart
ssh -i ${SSH_KEY} ${EC2_USER}@${EC2_IP} << 'ENDSSH'
  cd ~/zeflash-backend

  # Install Node.js 20 if not present
  if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
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
