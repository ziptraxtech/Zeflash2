# AWS ECS Deployment Guide

## Overview

Your ML backend is currently running on `localhost:8000` with images saved to local filesystem. To deploy to AWS ECS where your live website images are stored, follow these steps.

**What will change:**
- Backend: `localhost:8000` → ECS service URL (e.g., `https://api.your-domain.com`)
- Image storage: Local filesystem → S3 bucket (`battery-ml-results-070872471952`)
- Images accessible via: Public S3 URLs (already configured with CORS)

---

## Prerequisites

✅ AWS Account with access to:
- **ECR** (Elastic Container Registry)
- **ECS** (Elastic Container Service) 
- **S3** (already setup: `battery-ml-results-070872471952`)
- **IAM** (for task roles)

✅ AWS CLI installed and configured:
```bash
aws configure
# Enter your AWS Access Key ID
# Enter your AWS Secret Access Key
# Enter region: us-east-1
```

✅ Docker installed on your machine

---

## Step 1: Prepare Your Code

### 1.1 Check Current Configuration

Your `inference_pipeline.py` already has S3 support:
```python
S3_BUCKET = "battery-ml-results-070872471952"
S3_PREFIX = "battery-reports/"
LOCAL_REPORTS_DIR = os.environ.get("LOCAL_REPORTS_DIR", None)  # If set, uses local mode
```

### 1.2 Update Dockerfile (if needed)

Your Dockerfile looks good but verify these commands:
```dockerfile
# Current Dockerfile uses:
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
```

**IMPORTANT**: Your Dockerfile currently uses `app:app`, but you're running `server.py` locally. 

**Fix this:**

Option A: Change Dockerfile to use server.py:
```dockerfile
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]
```

Option B: Keep using app.py (Lambda version, requires DynamoDB)

**For your use case, use Option A (server.py) since you're using the API-based approach.**

---

## Step 2: Build and Push Docker Image

### 2.1 Create ECR Repository (if not exists)

```bash
aws ecr create-repository \
  --repository-name battery-ml \
  --region us-east-1
```

Output:
```json
{
  "repository": {
    "repositoryUri": "070872471952.dkr.ecr.us-east-1.amazonaws.com/battery-ml"
  }
}
```

### 2.2 Login to ECR

```bash
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 070872471952.dkr.ecr.us-east-1.amazonaws.com
```

### 2.3 Build Docker Image

```bash
cd "D:\zeflash copy\Zipbolt\zeflash-new\battery-ml-lambda"

docker build -t battery-ml:latest .
```

### 2.4 Tag and Push Image

```bash
# Tag the image
docker tag battery-ml:latest 070872471952.dkr.ecr.us-east-1.amazonaws.com/battery-ml:latest

# Push to ECR
docker push 070872471952.dkr.ecr.us-east-1.amazonaws.com/battery-ml:latest
```

---

## Step 3: Update ECS Task Definition

### 3.1 Update task-definition.json

Your existing `task-definition.json` needs these changes:

**CRITICAL CHANGES:**

1. **Remove `LOCAL_REPORTS_DIR`** - This forces S3 mode
2. **Update environment variables** for server.py
3. **Ensure IAM role has S3 permissions**

```json
{
  "family": "battery-ml-task",
  "taskRoleArn": "arn:aws:iam::070872471952:role/ecsTaskExecutionRole",
  "executionRoleArn": "arn:aws:iam::070872471952:role/ecsTaskExecutionRole",
  "networkMode": "awsvpc",
  "cpu": "1024",
  "memory": "2048",
  "requiresCompatibilities": ["FARGATE"],
  "containerDefinitions": [
    {
      "name": "battery-ml-container",
      "image": "070872471952.dkr.ecr.us-east-1.amazonaws.com/battery-ml:latest",
      "portMappings": [
        {
          "containerPort": 8000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "AWS_DEFAULT_REGION",
          "value": "us-east-1"
        },
        {
          "name": "S3_BUCKET",
          "value": "battery-ml-results-070872471952"
        },
        {
          "name": "S3_PREFIX",
          "value": "battery-reports/"
        },
        {
          "name": "TOKEN_ENDPOINT",
          "value": "https://cms.charjkaro.in/admin/api/v1/zipbolt/token"
        },
        {
          "name": "API_BASE_URL",
          "value": "https://uat.cms.gaadin.live/commands/secure/api/v1/get/charger/time_lapsed"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/battery-ml",
          "awslogs-create-group": "true",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:8000/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
```

**Key changes explained:**
- ✅ Removed `LOCAL_REPORTS_DIR` (now uses S3)
- ✅ Added `S3_BUCKET` and `S3_PREFIX` env vars
- ✅ Added health check endpoint
- ✅ Added TOKEN_ENDPOINT and API_BASE_URL

---

## Step 4: Update IAM Role for S3 Access

Your ECS task needs permission to write to S3.

### 4.1 Create IAM Policy for S3 Access

Create file: `ecs-s3-policy.json`
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:PutObjectAcl",
        "s3:GetObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::battery-ml-results-070872471952",
        "arn:aws:s3:::battery-ml-results-070872471952/*"
      ]
    }
  ]
}
```

### 4.2 Attach Policy to ECS Task Role

```bash
# Create the policy
aws iam create-policy \
  --policy-name BatteryMLS3Access \
  --policy-document file://ecs-s3-policy.json

# Attach to your ECS task role
aws iam attach-role-policy \
  --role-name ecsTaskExecutionRole \
  --policy-arn arn:aws:iam::070872471952:policy/BatteryMLS3Access
```

---

## Step 5: Deploy to ECS

### 5.1 Register Task Definition

```bash
aws ecs register-task-definition \
  --cli-input-json file://task-definition.json \
  --region us-east-1
```

### 5.2 Create ECS Cluster (if not exists)

```bash
aws ecs create-cluster \
  --cluster-name battery-ml-cluster \
  --region us-east-1
```

### 5.3 Create ECS Service

You'll need:
- VPC ID
- Subnet IDs (minimum 2 for Fargate)
- Security Group ID (allow inbound 8000)

**Get your VPC and Subnets:**
```bash
# List VPCs
aws ec2 describe-vpcs --region us-east-1

# List Subnets
aws ec2 describe-subnets --region us-east-1
```

**Create Security Group:**
```bash
# Create security group
aws ec2 create-security-group \
  --group-name battery-ml-sg \
  --description "Security group for Battery ML API" \
  --vpc-id vpc-XXXXXXXX \
  --region us-east-1

# Add inbound rule for port 8000
aws ec2 authorize-security-group-ingress \
  --group-id sg-XXXXXXXX \
  --protocol tcp \
  --port 8000 \
  --cidr 0.0.0.0/0 \
  --region us-east-1
```

**Create ECS Service:**
```bash
aws ecs create-service \
  --cluster battery-ml-cluster \
  --service-name battery-ml-service \
  --task-definition battery-ml-task \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-XXXXX,subnet-YYYYY],securityGroups=[sg-XXXXXXXX],assignPublicIp=ENABLED}" \
  --region us-east-1
```

---

## Step 6: Setup Load Balancer (Recommended)

For production, use an Application Load Balancer (ALB) to get a stable URL.

### 6.1 Create Target Group

```bash
aws elbv2 create-target-group \
  --name battery-ml-tg \
  --protocol HTTP \
  --port 8000 \
  --vpc-id vpc-XXXXXXXX \
  --target-type ip \
  --health-check-path /health \
  --health-check-interval-seconds 30 \
  --region us-east-1
```

### 6.2 Create Load Balancer

```bash
aws elbv2 create-load-balancer \
  --name battery-ml-alb \
  --subnets subnet-XXXXX subnet-YYYYY \
  --security-groups sg-XXXXXXXX \
  --scheme internet-facing \
  --type application \
  --ip-address-type ipv4 \
  --region us-east-1
```

### 6.3 Create Listener

```bash
aws elbv2 create-listener \
  --load-balancer-arn arn:aws:elasticloadbalancing:us-east-1:070872471952:loadbalancer/app/battery-ml-alb/XXXXXXXXXX \
  --protocol HTTP \
  --port 80 \
  --default-actions Type=forward,TargetGroupArn=arn:aws:elasticloadbalancing:us-east-1:070872471952:targetgroup/battery-ml-tg/XXXXXXXXXX
```

### 6.4 Update ECS Service with Load Balancer

```bash
aws ecs update-service \
  --cluster battery-ml-cluster \
  --service battery-ml-service \
  --load-balancers targetGroupArn=arn:aws:elasticloadbalancing:us-east-1:070872471952:targetgroup/battery-ml-tg/XXXXXXXXXX,containerName=battery-ml-container,containerPort=8000 \
  --region us-east-1
```

---

## Step 7: Get Your Service URL

### Option A: Without Load Balancer (Direct ECS)

```bash
# Get task details
aws ecs list-tasks \
  --cluster battery-ml-cluster \
  --service-name battery-ml-service \
  --region us-east-1

# Get task IP
aws ecs describe-tasks \
  --cluster battery-ml-cluster \
  --tasks arn:aws:ecs:us-east-1:070872471952:task/battery-ml-cluster/XXXXXXXXXX \
  --region us-east-1 \
  --query 'tasks[0].attachments[0].details[?name==`networkInterfaceId`].value' \
  --output text

# Get public IP from network interface
aws ec2 describe-network-interfaces \
  --network-interface-ids eni-XXXXXXXXXX \
  --query 'NetworkInterfaces[0].Association.PublicIp' \
  --output text
```

Your API URL: `http://<PUBLIC_IP>:8000`

### Option B: With Load Balancer

```bash
# Get load balancer DNS
aws elbv2 describe-load-balancers \
  --names battery-ml-alb \
  --query 'LoadBalancers[0].DNSName' \
  --output text \
  --region us-east-1
```

Your API URL: `http://<ALB_DNS_NAME>`

---

## Step 8: Update Your Frontend

### 8.1 Find Your Frontend API Configuration

Look for where you're calling the ML API in your React app:

```typescript
// Current (localhost):
const API_URL = "http://localhost:8000";

// Update to ECS:
const API_URL = "http://battery-ml-alb-XXXXXXXXXX.us-east-1.elb.amazonaws.com"
// OR
const API_URL = "http://<ECS_PUBLIC_IP>:8000"
```

### 8.2 Update Environment Variables

If you're using environment variables:

**For Development (.env.local):**
```bash
VITE_ML_API_URL=http://localhost:8000
```

**For Production (.env.production):**
```bash
VITE_ML_API_URL=http://battery-ml-alb-XXXXXXXXXX.us-east-1.elb.amazonaws.com
```

### 8.3 Use Custom Domain (Optional)

If you have a domain:

1. Create CNAME record pointing to ALB DNS
   ```
   api.zeflash.com → battery-ml-alb-XXXXXXXXXX.us-east-1.elb.amazonaws.com
   ```

2. Update frontend:
   ```typescript
   const API_URL = "https://api.zeflash.com"
   ```

3. Add HTTPS certificate to ALB (recommended)

---

## Step 9: Test Your Deployment

### 9.1 Test Health Endpoint

```bash
curl http://<YOUR_ECS_URL>:8000/health
```

Expected response:
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2026-02-13T10:30:00Z"
}
```

### 9.2 Test ML Inference

```bash
curl -X POST http://<YOUR_ECS_URL>:8000/api/v1/inference \
  -H "Content-Type: application/json" \
  -d '{
    "evse_id": "122300103C03183",
    "connector_id": 1,
    "limit": 60
  }'
```

Expected response:
```json
{
  "job_id": "abc-123-def",
  "status": "pending",
  "message": "Inference job queued"
}
```

### 9.3 Check Job Status

```bash
curl http://<YOUR_ECS_URL>:8000/api/v1/job/abc-123-def
```

### 9.4 Verify S3 Image Upload

Once job completes, check S3:
```bash
aws s3 ls s3://battery-ml-results-070872471952/battery-reports/
```

You should see folders for each device_id with images inside.

**Image URLs will be:**
```
https://battery-ml-results-070872471952.s3.us-east-1.amazonaws.com/battery-reports/<device_id>/battery_health_report.png
```

---

## Step 10: Monitor Your Service

### View Logs in CloudWatch

```bash
# List log streams
aws logs describe-log-streams \
  --log-group-name /ecs/battery-ml \
  --region us-east-1

# View logs
aws logs tail /ecs/battery-ml --follow --region us-east-1
```

### Check ECS Service Status

```bash
aws ecs describe-services \
  --cluster battery-ml-cluster \
  --services battery-ml-service \
  --region us-east-1
```

---

## Quick Reference Commands

### Update Code (after changes)

```bash
# 1. Rebuild Docker image
docker build -t battery-ml:latest .

# 2. Tag
docker tag battery-ml:latest 070872471952.dkr.ecr.us-east-1.amazonaws.com/battery-ml:latest

# 3. Push
docker push 070872471952.dkr.ecr.us-east-1.amazonaws.com/battery-ml:latest

# 4. Force new deployment
aws ecs update-service \
  --cluster battery-ml-cluster \
  --service battery-ml-service \
  --force-new-deployment \
  --region us-east-1
```

### Scale Service

```bash
# Scale up
aws ecs update-service \
  --cluster battery-ml-cluster \
  --service battery-ml-service \
  --desired-count 2 \
  --region us-east-1

# Scale down
aws ecs update-service \
  --cluster battery-ml-cluster \
  --service battery-ml-service \
  --desired-count 1 \
  --region us-east-1
```

### Stop Service

```bash
aws ecs update-service \
  --cluster battery-ml-cluster \
  --service battery-ml-service \
  --desired-count 0 \
  --region us-east-1
```

---

## Troubleshooting

### Issue: Container keeps restarting

**Check logs:**
```bash
aws logs tail /ecs/battery-ml --follow --region us-east-1
```

**Common causes:**
- Missing model files in Docker image
- Wrong CMD in Dockerfile (should be `server:app` not `app:app`)
- Port 8000 not exposed
- Missing environment variables

### Issue: Can't connect to service

**Check security group:**
```bash
aws ec2 describe-security-groups \
  --group-ids sg-XXXXXXXX \
  --region us-east-1
```

Ensure port 8000 is open for inbound traffic.

### Issue: Images not showing up

**Check S3 permissions:**
```bash
aws s3api get-bucket-policy \
  --bucket battery-ml-results-070872471952
```

Ensure public read access is enabled for `battery-reports/*`

**Check CORS:**
```bash
aws s3api get-bucket-cors \
  --bucket battery-ml-results-070872471952
```

---

## Cost Estimate

**ECS Fargate (1 task, 1 vCPU, 2GB RAM):**
- ~$35-45/month (24/7)
- ~$1-2/day

**S3 Storage:**
- $0.023 per GB/month
- Images ~100KB each → 10,000 images = 1GB = $0.02/month

**ALB (Optional):**
- ~$16-18/month

**Total: ~$50-60/month**

---

## Next Steps - Production Ready

1. **Setup Auto Scaling** - Scale based on CPU/memory
2. **Add HTTPS** - Use AWS Certificate Manager + ALB HTTPS listener
3. **Setup CI/CD** - GitHub Actions to auto-deploy on push
4. **Add Monitoring** - CloudWatch alarms for errors/high CPU
5. **Setup CloudFront** - CDN for S3 images (faster loading)
6. **Add API Authentication** - Protect your API endpoints

---

## Summary

✅ **What you have:**
- Dockerfile ready
- S3 bucket configured
- Code that works with S3
- Task definition template

✅ **What you need to do:**
1. Fix Dockerfile CMD to use `server:app`
2. Build and push Docker image to ECR
3. Update IAM role for S3 access
4. Deploy to ECS
5. Get service URL
6. Update frontend to use ECS URL instead of localhost
7. Test end-to-end

✅ **Result:**
- Backend runs on ECS 24/7
- Images stored in S3 (public access)
- Frontend displays images from S3 URLs
- Same functionality as localhost, but cloud-hosted

Need help with any specific step? Let me know!
