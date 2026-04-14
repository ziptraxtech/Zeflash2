# Deploy ML to ECS from EC2 - Simple Steps

## Run this on your EC2 instance:

```bash
# SSH into EC2
ssh -i your-key.pem ec2-user@3.90.162.23

# Go to battery-ml-lambda directory
cd ~/zeflash/battery-ml-lambda

# Make script executable
chmod +x deploy-to-ecs-complete.sh

# Run the deployment (this will do EVERYTHING)
./deploy-to-ecs-complete.sh
```

## What this script does:
✅ Builds Docker image locally
✅ Pushes to ECR (battery-ml repo)
✅ Registers new ECS task definition
✅ Updates battery-ml-service-alb service in ECS
✅ Waits for tasks to start
✅ Shows you the public IP of the running task

## Output you'll see:
```
✅ AWS Account ID: 707247471952
✅ Docker build complete
✅ Image pushed to ECR
✅ Task definition registered
✅ ECS service updated
✅ ML API is running!
🌐 Public IP: 10.0.x.x or 3.xxx.xxx.xxx
📍 Health endpoint: http://<PUBLIC_IP>:8000/health
```

## After deployment:
1. Copy the **Public IP** from the output
2. SSH back to EC2
3. Update backend .env:
   ```bash
   cd ~/zeflash/backend
   nano .env
   # Add: ML_BACKEND_URL=http://<PUBLIC_IP>:8000
   ```
4. Start backend:
   ```bash
   npm start
   ```

## Troubleshooting:
- **Docker not found?** Install: `sudo apt-get install docker.io`
- **ECR login failed?** Check AWS credentials: `aws sts get-caller-identity`
- **Permission denied?** Run: `sudo usermod -aG docker $USER` then logout/login
- **Image push failed?** Check ECR repo exists: `aws ecr describe-repositories --query 'repositories[*].repositoryName'`

## Monitor logs in real-time:
```bash
aws logs tail /ecs/battery-ml-api --follow --region us-east-1
```

That's it! 🚀
