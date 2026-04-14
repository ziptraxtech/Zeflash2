#!/bin/bash

# ============================================================
# Battery ML API - Complete Deployment to ECS
# Run this from EC2 in battery-ml-lambda directory
# ============================================================

set -e

echo "🚀 Starting Battery ML API Deployment"
echo "======================================"

# Step 1: Get AWS Account ID
echo "📋 Getting AWS Account ID..."
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION="us-east-1"
REPO_NAME="battery-ml"
CLUSTER_NAME="ml-cluster"
SERVICE_NAME="battery-ml-service-alb"
TASK_FAMILY="battery-ml-api"

echo "✅ AWS Account ID: $AWS_ACCOUNT_ID"
echo "✅ Region: $AWS_REGION"
echo "✅ Repository: $REPO_NAME"

# Step 2: Login to ECR
echo ""
echo "🔑 Logging into ECR..."
aws ecr get-login-password --region $AWS_REGION | \
  docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

# Step 3: Build Docker image
echo ""
echo "🏗️ Building Docker image..."
docker build -t $REPO_NAME:latest .
echo "✅ Docker build complete"

# Step 4: Tag for ECR
echo ""
echo "🏷️ Tagging image for ECR..."
docker tag $REPO_NAME:latest $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$REPO_NAME:latest
docker tag $REPO_NAME:latest $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$REPO_NAME:$(date +%s)

# Step 5: Push to ECR
echo ""
echo "⬆️ Pushing image to ECR..."
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$REPO_NAME:latest
echo "✅ Image pushed to ECR"

# Step 6: Get latest image digest
echo ""
echo "🔍 Getting image digest..."
IMAGE_URI="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$REPO_NAME:latest"
IMAGE_DIGEST=$(aws ecr describe-images --repository-name $REPO_NAME --query "imageDetails[0].imageDigest" --output text)
echo "✅ Image URI: $IMAGE_URI"

# Step 7: Register new task definition
echo ""
echo "📋 Registering new task definition..."

# Create temporary task definition with current image
cat > /tmp/task-def-$$.json << EOF
{
  "family": "$TASK_FAMILY",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "containerDefinitions": [
    {
      "name": "battery-ml-api",
      "image": "$IMAGE_URI",
      "essential": true,
      "portMappings": [
        {
          "containerPort": 8000,
          "hostPort": 8000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "PYTHONUNBUFFERED",
          "value": "1"
        },
        {
          "name": "PORT",
          "value": "8000"
        },
        {
          "name": "TOKEN_ENDPOINT",
          "value": "https://cms.charjkaro.in/admin/api/v1/zipbolt/token"
        },
        {
          "name": "API_BASE_URL",
          "value": "https://cms.charjkaro.in/commands/secure/api/v1/get/charger/time_lapsed"
        },
        {
          "name": "BACKEND_API_URL",
          "value": "http://localhost:3001"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/battery-ml-api",
          "awslogs-region": "$AWS_REGION",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": [
          "CMD-SHELL",
          "curl -f http://localhost:8000/health || exit 1"
        ],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ],
  "executionRoleArn": "arn:aws:iam::$AWS_ACCOUNT_ID:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::$AWS_ACCOUNT_ID:role/ecsTaskRole"
}
EOF

TASK_DEF_ARN=$(aws ecs register-task-definition \
  --cli-input-json file:///tmp/task-def-$$.json \
  --region $AWS_REGION \
  --query 'taskDefinition.taskDefinitionArn' \
  --output text)

echo "✅ Task definition registered: $TASK_DEF_ARN"

# Step 8: Update ECS service
echo ""
echo "⚙️ Updating ECS service..."
aws ecs update-service \
  --cluster $CLUSTER_NAME \
  --service $SERVICE_NAME \
  --task-definition $TASK_DEF_ARN \
  --region $AWS_REGION

echo "✅ ECS service updated"

# Step 9: Wait for service to stabilize
echo ""
echo "⏳ Waiting for service to stabilize (60 seconds)..."
sleep 60

# Step 10: Check service status
echo ""
echo "📊 Checking service status..."
aws ecs describe-services \
  --cluster $CLUSTER_NAME \
  --services $SERVICE_NAME \
  --region $AWS_REGION \
  --query 'services[0].[serviceName,status,runningCount,desiredCount]' \
  --output table

# Step 11: Get task details
echo ""
echo "🔍 Getting task details..."
TASK_ARN=$(aws ecs list-tasks --cluster $CLUSTER_NAME --service-name $SERVICE_NAME --region $AWS_REGION --query 'taskArns[0]' --output text)

if [ ! -z "$TASK_ARN" ]; then
  echo "Task ARN: $TASK_ARN"
  aws ecs describe-tasks \
    --cluster $CLUSTER_NAME \
    --tasks $TASK_ARN \
    --region $AWS_REGION \
    --query 'tasks[0].[lastStatus,taskDefinitionArn,attachments[0].details[?name==`publicIp`].value[0]]' \
    --output table
  
  PUBLIC_IP=$(aws ecs describe-tasks \
    --cluster $CLUSTER_NAME \
    --tasks $TASK_ARN \
    --region $AWS_REGION \
    --query 'tasks[0].attachments[0].details[?name==`publicIp`].value[0]' \
    --output text)
  
  if [ ! -z "$PUBLIC_IP" ] && [ "$PUBLIC_IP" != "None" ]; then
    echo ""
    echo "✨ ML API is running!"
    echo "🌐 Public IP: $PUBLIC_IP"
    echo "📍 Health endpoint: http://$PUBLIC_IP:8000/health"
    echo "📍 API docs: http://$PUBLIC_IP:8000/docs"
    echo ""
    echo "Test it with:"
    echo "  curl http://$PUBLIC_IP:8000/health"
  fi
fi

# Cleanup
rm -f /tmp/task-def-$$.json

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📝 Next steps:"
echo "  1. Update EC2 backend .env with: ML_BACKEND_URL=http://<PUBLIC_IP>:8000"
echo "  2. Start backend on EC2"
echo "  3. Test the full flow"
echo ""
echo "📊 Monitor logs with:"
echo "  aws logs tail /ecs/battery-ml-api --follow --region us-east-1"
