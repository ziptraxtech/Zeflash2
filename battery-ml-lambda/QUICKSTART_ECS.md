# Quick Start - Deploy to AWS ECS

## What I Need to Do RIGHT NOW

Your ML backend currently works on **localhost:8000** with **local file storage**. To deploy to AWS ECS with S3 storage (like your live website), follow these steps:

---

## ✅ Files Ready for You

I've prepared everything you need:

1. **[Dockerfile](Dockerfile)** - ✅ Updated to use `server.py`
2. **[task-definition.json](task-definition.json)** - ✅ Updated with S3 config (no LOCAL_REPORTS_DIR)
3. **[ecs-s3-policy.json](ecs-s3-policy.json)** - ✅ IAM policy for S3 access
4. **[deploy-to-ecs.ps1](deploy-to-ecs.ps1)** - ✅ PowerShell script to automate deployment
5. **[AWS_ECS_DEPLOYMENT.md](AWS_ECS_DEPLOYMENT.md)** - ✅ Complete step-by-step guide

---

## 🚀 Quick Deploy (3 Steps)

### Step 1: Install AWS CLI (if not already)

Download and install: https://aws.amazon.com/cli/

Then configure:
```powershell
aws configure
# Enter AWS Access Key ID
# Enter AWS Secret Access Key
# Enter region: us-east-1
# Enter output format: json
```

### Step 2: Create ECR Repository (one-time)

```powershell
aws ecr create-repository --repository-name battery-ml --region us-east-1
```

### Step 3: Run Deployment Script

```powershell
cd "D:\zeflash copy\Zipbolt\zeflash-new\battery-ml-lambda"
.\deploy-to-ecs.ps1
```

This script will:
- ✅ Build Docker image
- ✅ Push to AWS ECR
- ✅ Register ECS task definition
- ✅ Update service (if exists)

---

## 📝 What Changes After Deployment

### Before (Current - Localhost)
```
Frontend → http://localhost:8000/api/v1/inference
Backend → Saves images to: ./reports/
Images → Served from: http://localhost:8000/images/
```

### After (ECS + S3)
```
Frontend → http://<ECS_URL>:8000/api/v1/inference
Backend → Uploads images to: S3 bucket
Images → Served from: https://battery-ml-results-070872471952.s3.amazonaws.com/battery-reports/
```

**Key difference:** No more `LOCAL_REPORTS_DIR` environment variable → automatically uses S3

---

## 🔧 Create ECS Service (First Time Only)

If this is your first deployment, you need to create the ECS service. See [AWS_ECS_DEPLOYMENT.md](AWS_ECS_DEPLOYMENT.md) Step 5.

**Quick version:**

1. Get your VPC and Subnet IDs:
```powershell
aws ec2 describe-vpcs --region us-east-1
aws ec2 describe-subnets --region us-east-1
```

2. Create security group:
```powershell
aws ec2 create-security-group `
  --group-name battery-ml-sg `
  --description "Battery ML API" `
  --vpc-id vpc-XXXXXXXX `
  --region us-east-1

aws ec2 authorize-security-group-ingress `
  --group-id sg-XXXXXXXX `
  --protocol tcp `
  --port 8000 `
  --cidr 0.0.0.0/0 `
  --region us-east-1
```

3. Create ECS cluster:
```powershell
aws ecs create-cluster --cluster-name battery-ml-cluster --region us-east-1
```

4. Create service:
```powershell
aws ecs create-service `
  --cluster battery-ml-cluster `
  --service-name battery-ml-service `
  --task-definition battery-ml-task `
  --desired-count 1 `
  --launch-type FARGATE `
  --network-configuration "awsvpcConfiguration={subnets=[subnet-XXXXX,subnet-YYYYY],securityGroups=[sg-XXXXXXXX],assignPublicIp=ENABLED}" `
  --region us-east-1
```

---

## 🌐 Get Your Service URL

After deployment, get the public IP:

```powershell
# List tasks
aws ecs list-tasks --cluster battery-ml-cluster --service-name battery-ml-service --region us-east-1

# Describe task (replace TASK_ID)
aws ecs describe-tasks --cluster battery-ml-cluster --tasks <TASK_ID> --region us-east-1 --query 'tasks[0].attachments[0].details[?name==`networkInterfaceId`].value' --output text

# Get public IP (replace ENI_ID)
aws ec2 describe-network-interfaces --network-interface-ids <ENI_ID> --query 'NetworkInterfaces[0].Association.PublicIp' --output text
```

Your API URL: `http://<PUBLIC_IP>:8000`

---

## 🔄 Update Frontend to Use ECS

### Find where you call the ML API

In your React frontend, look for:

```typescript
// Current (localhost)
const ML_API_URL = "http://localhost:8000";

// Change to ECS
const ML_API_URL = "http://<PUBLIC_IP>:8000";
```

### If using environment variables

**Development (.env.local):**
```bash
VITE_ML_API_URL=http://localhost:8000
```

**Production (.env.production):**
```bash
VITE_ML_API_URL=http://<ECS_PUBLIC_IP>:8000
```

---

## ✅ Test Your Deployment

### 1. Test Health Check
```powershell
curl http://<PUBLIC_IP>:8000/health
```

### 2. Test ML Inference
```powershell
curl -X POST http://<PUBLIC_IP>:8000/api/v1/inference `
  -H "Content-Type: application/json" `
  -d '{\"evse_id\":\"122300103C03183\",\"connector_id\":1,\"limit\":60}'
```

### 3. Check S3 for Images
```powershell
aws s3 ls s3://battery-ml-results-070872471952/battery-reports/
```

---

## 📊 View Logs

```powershell
# Follow logs in real-time
aws logs tail /ecs/battery-ml --follow --region us-east-1

# Last 10 minutes
aws logs tail /ecs/battery-ml --since 10m --region us-east-1
```

---

## 🔁 Update After Code Changes

Whenever you change the code:

```powershell
cd "D:\zeflash copy\Zipbolt\zeflash-new\battery-ml-lambda"
.\deploy-to-ecs.ps1
```

This automatically:
1. Rebuilds Docker image
2. Pushes to ECR
3. Updates ECS service with new image

---

## 💰 Cost

**Running 24/7:**
- ECS Fargate (1 task, 1 vCPU, 2GB): ~$35-45/month
- S3 Storage (images): ~$0.02/month for 10,000 images
- **Total: ~$35-50/month**

**To save costs:**
- Stop service when not in use: `aws ecs update-service --cluster battery-ml-cluster --service battery-ml-service --desired-count 0`
- Start again when needed: `aws ecs update-service --cluster battery-ml-cluster --service battery-ml-service --desired-count 1`

---

## ❓ Troubleshooting

### Container keeps restarting
```powershell
aws logs tail /ecs/battery-ml --follow --region us-east-1
```
Check for errors in model loading or missing dependencies.

### Can't connect to service
- Ensure security group allows port 8000
- Ensure task has public IP assigned
- Check if task is in RUNNING state

### Images not appearing
- Check S3 bucket policy (public read for battery-reports/*)
- Verify backend logs show "Uploading to S3: ..."
- Test S3 URL directly in browser

---

## 🎯 Summary - What You Need

1. ✅ **AWS CLI configured** with your credentials
2. ✅ **Run deployment script**: `.\deploy-to-ecs.ps1`
3. ✅ **Create ECS service** (first time only)
4. ✅ **Get service URL** from AWS
5. ✅ **Update frontend** to use ECS URL
6. ✅ **Test** end-to-end

**Full details:** See [AWS_ECS_DEPLOYMENT.md](AWS_ECS_DEPLOYMENT.md)

---

## 📞 Need Help?

If you get stuck at any step, let me know which step and what error you're seeing!
