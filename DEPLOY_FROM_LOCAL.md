# Deploy ML to ECS from Your Local Machine

This is much simpler! Deploy from your machine, then just start the backend on EC2.

## Prerequisites

✅ Docker Desktop installed and running
✅ AWS CLI configured (with credentials)
✅ AWS Account ID

## Step 1: Make Sure Docker is Running

On Windows: Start **Docker Desktop**

## Step 2: Run the Deployment Script

### Windows PowerShell:
```powershell
cd d:\Zeflash3\Zeflash2
.\deploy-ml-from-local.ps1
```

### Mac/Linux:
```bash
cd ~/path/to/Zeflash3/Zeflash2
chmod +x deploy-ml-from-local.sh
./deploy-ml-from-local.sh
```

## What It Does

✅ Builds Docker image locally
✅ Pushes to ECR (battery-ml repo)
✅ Updates ECS task definition
✅ Restarts the service
✅ Waits for tasks to start
✅ **Shows you the public IP** of the running ML service

## Expected Output

```
✨ ML API is running!
=======================================
🌐 Public IP: 3.90.162.23 (example)
📍 Health endpoint: http://3.90.162.23:8000/health
📍 API docs: http://3.90.162.23:8000/docs
=======================================
```

## Step 3: Update Backend on EC2

Once you have the public IP:

```bash
# SSH to EC2
ssh -i your-key.pem ec2-user@3.90.162.23

# Go to backend directory
cd ~/zeflash/backend

# Edit .env
nano .env

# Add/Update this line:
ML_BACKEND_URL=http://<PUBLIC_IP>:8000

# For example:
ML_BACKEND_URL=http://3.90.162.23:8000
```

## Step 4: Start Backend

Still on EC2:

```bash
npm start
```

## Step 5: Test

Visit your website and test the credits/inference flow. It should work now! 🎉

## Troubleshooting

### Docker not found
- Start Docker Desktop
- Wait 30 seconds
- Try again

### AWS credentials error
- Check: `aws sts get-caller-identity`
- Should show your Account ID

### Image push fails
- Check ECR repo exists: `aws ecr describe-repositories --region us-east-1`
- Should show: `battery-ml`

### ECS service not updating
- Check service exists: `aws ecs describe-services --cluster ml-cluster --services battery-ml-service-alb --region us-east-1`
- Check EC2 role has permissions (mentioned in script output)

### Still can't see running task
- Wait another 60 seconds (tasks take time to boot)
- Check ECS logs: `aws logs tail /ecs/battery-ml-api --follow --region us-east-1`

## What's Different?

**Before:** You had to deploy from EC2, which needed AWS CLI and IAM permissions
**Now:** You deploy from your machine, EC2 just runs the backend

This is faster, simpler, and avoids IAM issues!

## That's It! 🚀
