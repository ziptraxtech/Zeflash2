#!/bin/bash

# Zeflash Backend EC2 Deployment Script
# Deploys latest backend code to EC2 instance
# Usage: ./deploy-backend-ec2.sh

set -e

# Configuration
EC2_IP="3.90.162.23"
EC2_USER="ec2-user"
EC2_KEY="${EC2_KEY:~/.ssh/zeflash-backend.pem}"  # Set EC2_KEY env var or it defaults to ~/.ssh/zeflash-backend.pem
REPO_URL="https://github.com/ziptraxtech/Zeflash2.git"
REPO_DIR="/home/ec2-user/zeflash-backend"
DOCKER_COMPOSE_FILE="docker-compose-ec2.yml"

echo "=================================="
echo "🚀 Zeflash Backend EC2 Deployment"
echo "=================================="
echo ""
echo "Target: $EC2_IP"
echo "User: $EC2_USER"
echo "Repository: $REPO_URL"
echo ""

# Check SSH key exists
if [ ! -f "$EC2_KEY" ]; then
    echo "❌ ERROR: SSH key not found at $EC2_KEY"
    echo "Please set EC2_KEY environment variable pointing to your .pem file"
    exit 1
fi

echo "✓ SSH key found"
echo ""

# Test SSH connection
echo "🔌 Testing SSH connection..."
ssh -i "$EC2_KEY" -o ConnectTimeout=5 "$EC2_USER@$EC2_IP" echo "✓ SSH connection successful" || {
    echo "❌ ERROR: Cannot connect to EC2. Check IP and SSH key."
    exit 1
}

echo ""
echo "📦 Deploying to EC2..."
echo ""

# Execute deployment commands on EC2
ssh -i "$EC2_KEY" "$EC2_USER@$EC2_IP" << 'EOSSH'
set -e

echo "📂 Checking repository..."
if [ ! -d "/home/ec2-user/zeflash-backend" ]; then
    echo "   Cloning repository..."
    cd /home/ec2-user
    git clone https://github.com/ziptraxtech/Zeflash2.git zeflash-backend
else
    echo "   Repository exists, pulling latest code..."
    cd /home/ec2-user/zeflash-backend
    git fetch origin
    git reset --hard origin/main
fi

cd /home/ec2-user/zeflash-backend

echo ""
echo "📋 Latest commits:"
git log --oneline -5

echo ""
echo "🐳 Checking Docker..."
if ! command -v docker &> /dev/null; then
    echo "❌ ERROR: Docker not found"
    exit 1
fi
echo "   ✓ Docker found: $(docker --version)"

echo ""
echo "🛑 Stopping current containers..."
docker-compose -f docker-compose-ec2.yml down || true

echo ""
echo "🔨 Rebuilding Docker image..."
docker build -t battery-ml:ec2-backend ./backend

echo ""
echo "🚀 Starting containers..."
docker-compose -f docker-compose-ec2.yml up -d

echo ""
echo "⏳ Waiting for backend to be healthy..."
sleep 5

echo ""
echo "📋 Container status:"
docker-compose -f docker-compose-ec2.yml ps

echo ""
echo "✓ Backend deployment complete!"
echo ""
echo "📝 Logs (last 20 lines):"
docker logs --tail 20 zeflash-backend

EOSSH

echo ""
echo "=================================="
echo "✅ Deployment successful!"
echo "=================================="
echo ""
echo "Backend is now running at: http://3.90.162.23:3000"
echo "Load Balancer: zeflash-backend-api-347575614.us-east-1.elb.amazonaws.com"
echo ""
echo "🔍 To check logs in real-time:"
echo "   ssh -i $EC2_KEY $EC2_USER@$EC2_IP"
echo "   docker logs -f zeflash-backend"
echo ""
