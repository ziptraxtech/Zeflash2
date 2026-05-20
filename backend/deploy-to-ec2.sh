#!/bin/bash
# Deploy backend to EC2 instance
# Usage: ./backend/deploy-to-ec2.sh

set -e

EC2_IP="3.90.162.23"
EC2_USER="ubuntu"
SSH_KEY="$HOME/.ssh/battery-ml-key.pem"
REMOTE_DIR="/home/${EC2_USER}/zeflash"
REMOTE_BACKEND="$REMOTE_DIR/backend"

echo "🚀 Deploying Zeflash backend to EC2 ($EC2_IP)..."

# Check if SSH key exists
if [ ! -f "$SSH_KEY" ]; then
  echo "❌ SSH key not found at $SSH_KEY"
  exit 1
fi

# 1. Create remote directory if it doesn't exist
echo "📁 Creating remote directory..."
ssh -i "$SSH_KEY" "$EC2_USER@$EC2_IP" "mkdir -p $REMOTE_BACKEND"

# 2. Copy backend files to EC2 (excluding node_modules and dist to save bandwidth)
echo "📤 Uploading backend files..."
rsync -avz --exclude='node_modules' --exclude='dist' --exclude='.env' \
  -e "ssh -i $SSH_KEY" \
  ./backend/ "$EC2_USER@$EC2_IP:$REMOTE_BACKEND/"

# 3. Copy .env file separately
echo "🔐 Uploading .env..."
if [ -f "./backend/.env" ]; then
  scp -i "$SSH_KEY" ./backend/.env "$EC2_USER@$EC2_IP:$REMOTE_BACKEND/.env"
  echo "✅ .env copied"
else
  echo "⚠️  ./backend/.env not found, skipping"
fi

# 4. SSH in and build/restart
echo "🔨 Building and restarting on EC2..."
ssh -i "$SSH_KEY" "$EC2_USER@$EC2_IP" << 'ENDSSH'
set -e

echo "📂 Working directory: $(pwd)"
cd ~/zeflash/backend

echo "📦 Installing dependencies..."
npm install

echo "🔧 Generating Prisma client..."
npx prisma generate

echo "🏗️  Building TypeScript..."
npm run build

echo "🛑 Stopping old service..."
pm2 delete zeflash-backend 2>/dev/null || true

# Alternatively, use systemd:
# sudo systemctl stop zeflash-backend 2>/dev/null || true

echo "▶️  Starting service with PM2..."
pm2 start dist/index.js --name zeflash-backend --time
pm2 save
pm2 startup

# Alternatively, use systemd:
# sudo systemctl start zeflash-backend

echo "✅ Backend deployment complete!"
ps aux | grep 'zeflash-backend' | grep -v grep

ENDSSH

echo "✅ Deployment successful!"
echo "Backend should now be running on http://$EC2_IP:3001"
