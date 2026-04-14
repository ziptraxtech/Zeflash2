#!/bin/bash

# ============================================================
# Battery ML API - Deploy to ECS from Local Machine
# Run this from your computer (not EC2)
# ============================================================

set -e

echo "🚀 Starting Battery ML API ECS Deployment (Local)"
echo "====================================================="

# Configuration
AWS_REGION="us-east-1"
REPO_NAME="battery-ml"
CLUSTER_NAME="ml-cluster"
SERVICE_NAME="battery-ml-service-alb"
TASK_FAMILY="battery-ml-api"
ECR_PATH="battery-ml-lambda"

# Step 1: Get AWS Account ID
echo "📋 Getting AWS Account ID..."
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo "✅ AWS Account ID: $AWS_ACCOUNT_ID"
echo "✅ Region: $AWS_REGION"

# Step 2: Check if Docker is running
echo ""
echo "🐳 Checking Docker..."
if ! docker info > /dev/null 2>&1; then
  echo "❌ Docker is not running. Please start Docker Desktop."
  exit 1
fi
echo "✅ Docker is running"

# Step 3: Login to ECR
echo ""
echo "🔑 Logging into ECR..."
aws ecr get-login-password --region $AWS_REGION | \
  docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com
echo "✅ ECR login successful"

# Step 4: Build Docker image
echo ""
echo "🏗️ Building Docker image..."
cd $ECR_PATH
docker build -t $REPO_NAME:latest .
echo "✅ Docker build complete"

# Step 5: Tag for ECR
echo ""
echo "🏷️ Tagging image for ECR..."
docker tag $REPO_NAME:latest $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$REPO_NAME:latest
TIMESTAMP=$(date +%s)
docker tag $REPO_NAME:latest $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$REPO_NAME:$TIMESTAMP
echo "✅ Tagged: $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$REPO_NAME:latest"
echo "✅ Tagged: $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$REPO_NAME:$TIMESTAMP"

# Step 6: Push to ECR
echo ""
echo "⬆️ Pushing image to ECR... (this may take 2-5 minutes)"
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$REPO_NAME:latest
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$REPO_NAME:$TIMESTAMP
echo "✅ Image pushed to ECR"

# Step 7: Get image URI
IMAGE_URI="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$REPO_NAME:latest"
echo ""
echo "📍 Image URI: $IMAGE_URI"

# Step 8: Create EC2 IAM role policy (if needed)
echo ""
echo "🔐 Ensuring EC2 role has ECS permissions..."
# This is informational - you'll need to add permissions manually
echo "⚠️  If EC2 role doesn't have permissions, add these policies:"
echo "   - AmazonEC2ContainerRegistryPowerUser"
echo "   - AmazonECS_FullAccess"

# Step 9: Update ECS service with new image
echo ""
echo "📋 Updating ECS task definition..."

# Get current task definition
CURRENT_TASK_DEF=$(aws ecs describe-services \
  --cluster $CLUSTER_NAME \
  --services $SERVICE_NAME \
  --region $AWS_REGION \
  --query 'services[0].taskDefinition' \
  --output text)

echo "Current task definition: $CURRENT_TASK_DEF"

# Retrieve and update task definition
aws ecs describe-task-definition \
  --task-definition $CURRENT_TASK_DEF \
  --region $AWS_REGION \
  --query 'taskDefinition' > /tmp/task-def.json

# Update image in task definition
sed -i.bak "s|\"image\": \".*\"|\"image\": \"$IMAGE_URI\"|g" /tmp/task-def.json

# Remove fields that can't be in the update request
jq 'del(.taskDefinitionArn, .revision, .status, .requiresAttributes, .compatibilities, .registeredAt, .registeredBy)' /tmp/task-def.json > /tmp/task-def-clean.json

# Register new task definition
echo "📋 Registering new task definition..."
NEW_TASK_DEF=$(aws ecs register-task-definition \
  --cli-input-json file:///tmp/task-def-clean.json \
  --region $AWS_REGION \
  --query 'taskDefinition.taskDefinitionArn' \
  --output text)

echo "✅ New task definition: $NEW_TASK_DEF"

# Step 10: Update service
echo ""
echo "⚙️ Updating ECS service..."
aws ecs update-service \
  --cluster $CLUSTER_NAME \
  --service $SERVICE_NAME \
  --task-definition $NEW_TASK_DEF \
  --region $AWS_REGION

echo "✅ ECS service update initiated"

# Step 11: Wait for deployment
echo ""
echo "⏳ Waiting for new tasks to start (60 seconds)..."
sleep 60

# Step 12: Get service status
echo ""
echo "📊 Checking service status..."
aws ecs describe-services \
  --cluster $CLUSTER_NAME \
  --services $SERVICE_NAME \
  --region $AWS_REGION \
  --query 'services[0].[serviceName,status,runningCount,desiredCount]' \
  --output table

# Step 13: Get task public IP
echo ""
echo "🔍 Getting ECS task details..."
TASK_ARN=$(aws ecs list-tasks \
  --cluster $CLUSTER_NAME \
  --service-name $SERVICE_NAME \
  --region $AWS_REGION \
  --query 'taskArns[0]' \
  --output text)

if [ ! -z "$TASK_ARN" ]; then
  echo "Task ARN: $TASK_ARN"
  
  # Get task details
  TASK_INFO=$(aws ecs describe-tasks \
    --cluster $CLUSTER_NAME \
    --tasks $TASK_ARN \
    --region $AWS_REGION \
    --query 'tasks[0]')
  
  # Extract details
  LAST_STATUS=$(echo $TASK_INFO | jq -r '.lastStatus')
  PUBLIC_IP=$(echo $TASK_INFO | jq -r '.attachments[0].details[] | select(.name=="publicIp") | .value')
  
  echo "Status: $LAST_STATUS"
  
  if [ ! -z "$PUBLIC_IP" ] && [ "$PUBLIC_IP" != "null" ]; then
    echo ""
    echo "✨ ML API is running!"
    echo "======================================="
    echo "🌐 Public IP: $PUBLIC_IP"
    echo "📍 Health endpoint: http://$PUBLIC_IP:8000/health"
    echo "📍 API docs: http://$PUBLIC_IP:8000/docs"
    echo "======================================="
    echo ""
    echo "Next steps:"
    echo "1. SSH to EC2: ssh -i key.pem ec2-user@3.90.162.23"
    echo "2. Update backend .env:"
    echo "   ML_BACKEND_URL=http://$PUBLIC_IP:8000"
    echo "3. Start backend:"
    echo "   cd ~/zeflash/backend && npm start"
    echo ""
  else
    echo "⏳ Task is still starting. Check IP in a few seconds with:"
    echo "   aws ecs describe-tasks --cluster $CLUSTER_NAME --tasks $TASK_ARN --region $AWS_REGION"
  fi
fi

# Cleanup
rm -f /tmp/task-def.json /tmp/task-def.json.bak /tmp/task-def-clean.json

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📊 Monitor logs in real-time:"
echo "  aws logs tail /ecs/battery-ml-api --follow --region us-east-1"
