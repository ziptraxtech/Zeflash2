#!/bin/bash

# Zeflash2 S3 Migration Deployment Script
# This script updates the backend with S3 image storage

set -e

echo "========================================="
echo "Deploying S3 Migration Update"
echo "========================================="

# Navigate to project directory
cd ~/Zeflash2

# Step 1: Pull latest code
echo "✅ Pulling latest code from GitHub..."
git fetch origin
git reset --hard origin/main

# Step 2: Install npm dependencies
echo "✅ Installing npm dependencies..."
cd backend
npm install

# Step 3: Build TypeScript
echo "✅ Building TypeScript..."
npm run build

# Step 4: Rebuild Docker image
echo "✅ Building Docker image..."
cd ..
docker build -f backend/Dockerfile -t battery-ml:ec2-backend .

# Step 5: Restart container with docker-compose
echo "✅ Restarting Docker container..."
docker-compose -f docker-compose-ec2.yml down
docker-compose -f docker-compose-ec2.yml up -d

# Step 6: Verify deployment
echo "✅ Verifying deployment..."
sleep 5
curl http://localhost:3000/health || echo "⚠️ Health check endpoint not ready yet"

echo ""
echo "========================================="
echo "✅ S3 Migration Deployment Complete!"
echo "========================================="
echo "Images will now be served from S3 bucket:"
echo "- Bucket: battery-ml-results-test"
echo "- Region: us-east-1"
echo "- Access: Presigned URLs (24-hour expiry)"
