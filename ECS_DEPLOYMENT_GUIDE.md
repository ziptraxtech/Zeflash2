# ECS Deployment Guide for Battery ML API

## Overview
This guide walks you through deploying the ML service to AWS ECS, keeping the backend on EC2.

## Prerequisites
- AWS CLI configured
- AWS Account with ECR, ECS, Fargate access
- Your AWS Account ID
- EC2 instance running (with backend on port 3001)
- VPC and security groups set up

## Step 1: Create ECR Repository

```bash
aws ecr create-repository --repository-name battery-ml-api --region us-east-1
```

Get your AWS Account ID:
```bash
aws sts get-caller-identity --query Account --output text
```

## Step 2: Build and Push Docker Image

Replace `<AWS_ACCOUNT_ID>` with your actual Account ID:

```bash
# From the battery-ml-lambda directory
cd battery-ml-lambda

# Build the image
docker build -t battery-ml-api:latest .

# Tag for ECR
docker tag battery-ml-api:latest <AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/battery-ml-api:latest

# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com

# Push image
docker push <AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/battery-ml-api:latest
```

## Step 3: Create CloudWatch Log Group

```bash
aws logs create-log-group --log-group-name /ecs/battery-ml-api --region us-east-1
aws logs put-retention-policy --log-group-name /ecs/battery-ml-api --retention-in-days 7 --region us-east-1
```

## Step 4: Create ECS Cluster

```bash
aws ecs create-cluster --cluster-name battery-ml-cluster --region us-east-1
```

## Step 5: Register Task Definition

Update `ecs-task-definition.json`:
- Replace `<YOUR_AWS_ACCOUNT_ID>` with your Account ID
- Replace `EC2_PRIVATE_IP_OR_ALB` with your EC2 private IP or load balancer endpoint

```bash
# From the battery-ml-lambda directory
aws ecs register-task-definition \
  --cli-input-json file://ecs-task-definition.json \
  --region us-east-1
```

## Step 6: Create ECS Service

Get your:
- VPC ID: `aws ec2 describe-vpcs --query 'Vpcs[0].VpcId' --output text`
- Subnet IDs: `aws ec2 describe-subnets --query 'Subnets[*].SubnetId' --output text`
- Security Group ID (allows port 8000): Create one or use existing

```bash
aws ecs create-service \
  --cluster battery-ml-cluster \
  --service-name battery-ml-api-service \
  --task-definition battery-ml-api:1 \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxxxx],securityGroups=[sg-xxxxx],assignPublicIp=ENABLED}" \
  --region us-east-1
```

## Step 7: Create Network Load Balancer (Optional but Recommended)

```bash
# Create NLB
aws elbv2 create-load-balancer \
  --name battery-ml-nlb \
  --subnets subnet-xxxxx subnet-yyyyy \
  --scheme internet-facing \
  --type network \
  --region us-east-1

# Create target group
aws elbv2 create-target-group \
  --name battery-ml-targets \
  --protocol TCP \
  --port 8000 \
  --vpc-id vpc-xxxxx \
  --health-check-protocol TCP \
  --region us-east-1

# Register targets (get ECS task IP after service starts)
# Update the service to attach to load balancer
```

## Step 8: Update Environment Variables

### On EC2 Backend (.env)
```
# Backend running on EC2
BACKEND_API_URL=http://localhost:3001

# ML API now on ECS (get endpoint from ECS service or NLB DNS)
ML_BACKEND_URL=http://battery-ml-nlb-xxxxx.elb.us-east-1.amazonaws.com:8000
```

### In Vercel (.env variables)
```
VITE_ML_BACKEND_URL=http://battery-ml-nlb-xxxxx.elb.us-east-1.amazonaws.com:8000
ML_BACKEND_URL=http://battery-ml-nlb-xxxxx.elb.us-east-1.amazonaws.com:8000
```

### In ECS Task Definition
- Update `BACKEND_API_URL` to point to EC2 or EC2 backend ALB
- Example: `http://172.31.x.x:3001` or `http://backend-alb.elb.us-east-1.amazonaws.com:3001`

## Step 9: Security Group Configuration

### ECS Security Group (for ML service)
- **Inbound**: Allow port 8000 from anywhere or from EC2 security group
- **Outbound**: Allow port 3001 to EC2 backend

### EC2 Security Group (for Backend)
- **Inbound**: Allow port 3001 from ECS security group
- **Inbound**: Allow port 22 from your IP (SSH)

## Step 10: Monitor & Test

Check service status:
```bash
aws ecs describe-services \
  --cluster battery-ml-cluster \
  --services battery-ml-api-service \
  --region us-east-1
```

Get task IP:
```bash
aws ecs list-tasks \
  --cluster battery-ml-cluster \
  --service-name battery-ml-api-service \
  --region us-east-1

# Then describe task to get IP
aws ecs describe-tasks \
  --cluster battery-ml-cluster \
  --tasks <TASK_ARN> \
  --region us-east-1
```

Test the ML API:
```bash
curl http://<ECS_ENDPOINT>:8000/health
curl -X POST http://<ECS_ENDPOINT>:8000/docs
```

## Troubleshooting

### Tasks not starting?
```bash
# Check logs
aws logs tail /ecs/battery-ml-api --follow --region us-east-1
```

### Can't reach from EC2?
- Verify security groups allow traffic
- Check VPC routing
- Verify ECS task has public IP or is in same VPC

### High memory usage?
- Adjust `memory` in task definition (increase from 1024)
- Check if models are being loaded properly

## Cost Considerations
- Fargate pricing: ~$0.05/hour for 512 CPU, 1GB RAM (roughly $36-40/month)
- Data transfer between ECS and EC2: No cost if same VPC
- Consider scaling to 0 tasks when not in use

## Next Steps
1. Deploy to ECS
2. Update EC2 environment variables
3. Test inference workflow end-to-end
4. Monitor CloudWatch logs
5. Set up auto-scaling if needed
