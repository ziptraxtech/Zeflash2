# ECS ML Deployment - Quick Reference

## 🎯 What's Happening
- **ML Service** (Python FastAPI): Moving from EC2 port 8000 → AWS ECS
- **Backend** (Node.js Express): Staying on EC2 port 3001
- **Frontend**: Calls backend, backend calls ECS ML service

## ⚡ Quick Steps (5 mins)

### 1. Get Your AWS Account ID
```bash
aws sts get-caller-identity --query Account --output text
# Outputs: 123456789012
```

### 2. Deploy ML to ECS (Automated)
```bash
cd battery-ml-lambda
chmod +x deploy-ml-to-ecs.sh
./deploy-ml-to-ecs.sh 123456789012 us-east-1
```

### 3. Wait for Tasks to Start
```bash
# Monitor task startup (takes ~2-3 minutes)
aws logs tail /ecs/battery-ml-api --follow --region us-east-1
```

### 4. Get the ECS Endpoint
```bash
# List tasks
aws ecs list-tasks --cluster battery-ml-cluster --region us-east-1

# Get task details (copy task ARN from above)
aws ecs describe-tasks --cluster battery-ml-cluster \
  --tasks arn:aws:ecs:us-east-1:123456789012:task/battery-ml-cluster/xxxxx \
  --region us-east-1

# Look for: "publicIp" in the output
# Your endpoint will be: http://<PUBLIC_IP>:8000
```

### 5. Test the Endpoint
```bash
# Should return 200 OK
curl http://<PUBLIC_IP>:8000/health
```

### 6. Update Backend Environment
Copy the ECS endpoint and update:

**EC2 Backend .env:**
```bash
ssh ec2-user@your-ec2-ip

# Edit your .env on EC2
sudo nano ~/zeflash/backend/.env

# Add/Update:
ML_BACKEND_URL=http://<ECS_PUBLIC_IP>:8000
```

### 7. Restart Backend on EC2
```bash
# On EC2
cd ~/zeflash/backend
npm start  # or your start command
```

### 8. Test the Full Flow
```bash
# Call backend which will call ECS ML service
curl http://ec2-public-ip:3001/api/credits
```

## 📊 Verify Everything Works

```bash
# 1. Check ECS service status
aws ecs describe-services --cluster battery-ml-cluster \
  --services battery-ml-api-service --region us-east-1

# 2. Check ECS logs
aws logs tail /ecs/battery-ml-api --follow

# 3. Check EC2 backend
ssh ec2-user@your-ec2-ip
# On EC2: curl localhost:3001/api/credits

# 4. Test from browser
# Visit: https://zeflash.app and try to get credits
```

## 🔧 If Things Break

### Tasks won't start?
```bash
# Check logs
aws logs tail /ecs/battery-ml-api --follow

# Common issues:
# - Security group blocks port 8000
# - Insufficient memory
# - Docker image not found in ECR
```

### Can't reach ECS from EC2?
```bash
# Check security groups
# - ECS security group: inbound port 8000 from EC2 SG or 0.0.0.0/0
# - Same VPC required, or public IP with SG rules

# On EC2, try:
curl http://<ecs-private-ip>:8000/health
```

### Backend can't reach ECS?
```bash
# Check backend logs on EC2
# Update ML_BACKEND_URL to ECS endpoint
# Verify network connectivity
curl -v http://<ecs-endpoint>:8000/health
```

## 💰 Cost Estimate
- ECS Fargate: ~$40/month (running 24/7)
- Data transfer: Free (same VPC)
- CloudWatch logs: ~$5/month

## 📈 Next Steps (After Confirming It Works)

1. **Set up Load Balancer** (Network Load Balancer)
   - Provides stable endpoint (no IP changes)
   - Better load distribution

2. **Auto-scaling**
   - Scale from 1→2 tasks during peak load
   - Scale down to 0 when not needed

3. **Database on EC2 → RDS**
   - Managed database
   - Automatic backups
   - Better reliability

4. **CDN for Frontend**
   - Faster content delivery
   - Global distribution

## 🎓 Understanding the Architecture

```
Internet
   ↓
Cloudflare/CDN
   ↓
Frontend (Deployed to Vercel/Netlify)
   ↓
ml-proxy.js (Vercel Edge)
   ↓
ECS Load Balancer (or direct public IP)
   ↓
ECS Fargate Task (ML API on port 8000)
   ├─ Calls Backend API →
   │
   └─→ EC2 Backend (Node.js on port 3001)
       ├─ PostgreSQL (Neon)
       └─ Razorpay API
```

## 📱 Troubleshooting Ports

| Service | Location | Port | Status |
|---------|----------|------|--------|
| ML API | ECS | 8000 | ✅ Now on ECS |
| Backend | EC2 | 3001 | ✅ Stays on EC2 |
| Database | External (Neon) | 5432 | ✅ External |
| Frontend | CDN/Vercel | 443 | ✅ CDN |

## 🚀 One-Liner to Deploy & Test

```bash
cd battery-ml-lambda && \
./deploy-ml-to-ecs.sh <AWS_ACCOUNT_ID> us-east-1 && \
echo "Waiting for tasks to start..." && \
sleep 120 && \
aws ecs list-tasks --cluster battery-ml-cluster --region us-east-1
```

---

**Questions?** Check ECS_DEPLOYMENT_GUIDE.md for detailed instructions.
