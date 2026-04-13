#!/bin/bash

# Zeflash Backend EC2 Deployment Script
# This script deploys the backend to EC2

set -e

echo "=========================================="
echo "Zeflash Backend EC2 Deployment"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BACKEND_PORT=3000
AWS_REGION="us-east-1"
AWS_ACCOUNT_ID="070872471952"
ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
IMAGE_NAME="battery-ml"
IMAGE_TAG="ec2-backend"
CONTAINER_NAME="zeflash-backend"

echo -e "${YELLOW}Step 1: Login to ECR${NC}"
aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_REGISTRY}

echo -e "${YELLOW}Step 2: Pull latest backend image from ECR${NC}"
docker pull ${ECR_REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}

echo -e "${YELLOW}Step 3: Stop existing container (if running)${NC}"
docker stop ${CONTAINER_NAME} 2>/dev/null || true
docker rm ${CONTAINER_NAME} 2>/dev/null || true

echo -e "${YELLOW}Step 4: Run new container${NC}"
docker run -d \
  --name ${CONTAINER_NAME} \
  -p ${BACKEND_PORT}:3000 \
  -e NODE_ENV=production \
  -e PORT=3000 \
  -e ML_BACKEND_URL="http://localhost:8000" \
  -e S3_BUCKET="battery-ml-results-test" \
  -e AWS_REGION=${AWS_REGION} \
  --log-driver awslogs \
  --log-opt awslogs-group=/ec2/zeflash-backend \
  --log-opt awslogs-region=${AWS_REGION} \
  --log-opt awslogs-stream-prefix=ec2 \
  ${ECR_REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}

echo -e "${GREEN}✅ Container started!${NC}"

echo -e "${YELLOW}Step 5: Verify container is running${NC}"
sleep 2
if docker ps | grep -q ${CONTAINER_NAME}; then
  echo -e "${GREEN}✅ Container is running!${NC}"
  
  # Wait for health check
  echo -e "${YELLOW}Waiting for health check...${NC}"
  for i in {1..30}; do
    if curl -s http://localhost:${BACKEND_PORT}/health > /dev/null 2>&1; then
      echo -e "${GREEN}✅ Backend is healthy!${NC}"
      break
    fi
    echo "Attempt $i/30..."
    sleep 1
  done
else
  echo -e "${RED}❌ Container failed to start!${NC}"
  docker logs ${CONTAINER_NAME}
  exit 1
fi

echo -e "${GREEN}=========================================="
echo "Deployment Complete!"
echo "Backend running at: http://$(hostname -I | awk '{print $1}'):${BACKEND_PORT}"
echo "Health check: curl http://localhost:${BACKEND_PORT}/health"
echo "==========================================${NC}"
