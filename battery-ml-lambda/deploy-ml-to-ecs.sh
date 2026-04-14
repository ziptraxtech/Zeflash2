#!/bin/bash

# ECS Deployment Automation Script
# Usage: ./deploy-ml-to-ecs.sh <AWS_ACCOUNT_ID> <AWS_REGION>

set -e

AWS_ACCOUNT_ID=${1:?Error: AWS_ACCOUNT_ID must be provided}
AWS_REGION=${2:-us-east-1}
REPO_NAME="battery-ml-api"
CLUSTER_NAME="battery-ml-cluster"
SERVICE_NAME="battery-ml-api-service"
TASK_FAMILY="battery-ml-api"

echo "🚀 Starting ECS Deployment for Battery ML API"
echo "Account ID: $AWS_ACCOUNT_ID"
echo "Region: $AWS_REGION"

# Step 1: Create ECR Repository
echo "📦 Creating ECR Repository..."
aws ecr create-repository \
  --repository-name $REPO_NAME \
  --region $AWS_REGION 2>/dev/null || echo "Repository already exists"

# Step 2: Get ECR login
echo "🔑 Logging into ECR..."
aws ecr get-login-password --region $AWS_REGION | \
  docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

# Step 3: Build Docker image
echo "🏗️ Building Docker image..."
docker build -t $REPO_NAME:latest .

# Step 4: Tag for ECR
echo "🏷️ Tagging image for ECR..."
docker tag $REPO_NAME:latest $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$REPO_NAME:latest

# Step 5: Push to ECR
echo "⬆️ Pushing image to ECR..."
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$REPO_NAME:latest

# Step 6: Create CloudWatch Log Group
echo "📝 Creating CloudWatch Log Group..."
aws logs create-log-group --log-group-name /ecs/battery-ml-api --region $AWS_REGION 2>/dev/null || echo "Log group already exists"
aws logs put-retention-policy --log-group-name /ecs/battery-ml-api --retention-in-days 7 --region $AWS_REGION 2>/dev/null || echo "Retention policy already set"

# Step 7: Create ECS Cluster
echo "🎯 Creating ECS Cluster..."
aws ecs create-cluster --cluster-name $CLUSTER_NAME --region $AWS_REGION 2>/dev/null || echo "Cluster already exists"

# Step 8: Update task definition with current account ID
echo "📋 Updating task definition..."
sed "s/<YOUR_AWS_ACCOUNT_ID>/$AWS_ACCOUNT_ID/g" ecs-task-definition.json > /tmp/task-def-updated.json

# Step 9: Register task definition
echo "✅ Registering task definition..."
TASK_DEF=$(aws ecs register-task-definition \
  --cli-input-json file:///tmp/task-def-updated.json \
  --region $AWS_REGION \
  --query 'taskDefinition.taskDefinitionArn' \
  --output text)

echo "Task Definition registered: $TASK_DEF"

# Step 10: Get VPC and Subnet info
echo "🔍 Fetching VPC and Subnet information..."
VPC_ID=$(aws ec2 describe-vpcs --query 'Vpcs[0].VpcId' --output text --region $AWS_REGION)
SUBNET_ID=$(aws ec2 describe-subnets --query 'Subnets[0].SubnetId' --output text --region $AWS_REGION)
SG_ID=$(aws ec2 describe-security-groups --query 'SecurityGroups[0].GroupId' --output text --filter "Name=vpc-id,Values=$VPC_ID" --region $AWS_REGION)

echo "VPC: $VPC_ID"
echo "Subnet: $SUBNET_ID"
echo "Security Group: $SG_ID"

# Step 11: Create or update service
echo "⚙️ Creating/Updating ECS Service..."
aws ecs create-service \
  --cluster $CLUSTER_NAME \
  --service-name $SERVICE_NAME \
  --task-definition $TASK_DEF \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[$SUBNET_ID],securityGroups=[$SG_ID],assignPublicIp=ENABLED}" \
  --region $AWS_REGION 2>/dev/null || \
  aws ecs update-service \
    --cluster $CLUSTER_NAME \
    --service $SERVICE_NAME \
    --task-definition $TASK_DEF \
    --region $AWS_REGION

echo "✨ ECS Service created/updated successfully!"
echo ""
echo "📊 Service Details:"
echo "  Cluster: $CLUSTER_NAME"
echo "  Service: $SERVICE_NAME"
echo "  Task Definition: $TASK_DEF"
echo ""
echo "🔍 Monitor your service with:"
echo "  aws ecs describe-services --cluster $CLUSTER_NAME --services $SERVICE_NAME --region $AWS_REGION"
echo ""
echo "📝 View logs with:"
echo "  aws logs tail /ecs/battery-ml-api --follow --region $AWS_REGION"
echo ""
echo "⏳ Service is starting. Tasks should be running in 1-2 minutes..."
echo "Get task IP with: aws ecs list-tasks --cluster $CLUSTER_NAME --region $AWS_REGION"

# Cleanup
rm -f /tmp/task-def-updated.json

echo "✅ Deployment complete!"
