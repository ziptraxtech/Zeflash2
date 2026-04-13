# Quick Start: Push Backend to EC2

## 🎯 Summary

You have created deployment scripts and configurations to push your Zeflash backend to EC2 at **3.90.162.23** for your live Vercel website.

## 📂 New Files Created

1. **EC2_DEPLOYMENT_README.md** ← Start here! Complete deployment guide
2. **deploy-to-ec2.sh** - Automated Docker deployment script
3. **deploy-nodejs-direct.sh** - Alternative direct Node.js deployment
4. **docker-compose-ec2.yml** - Docker Compose configuration
5. **.env.vercel.example** - Environment variables template for Vercel

## ⚡ Quick Steps

### Step 1: Build & Push Docker Image (Local Machine)

```powershell
cd d:\Zeflash3\Zeflash2

# Build Docker image
docker build -f backend/Dockerfile.simple -t battery-backend-ec2:latest .

# Push to ECR
docker tag battery-backend-ec2:latest 070872471952.dkr.ecr.us-east-1.amazonaws.com/battery-ml:ec2-backend
docker push 070872471952.dkr.ecr.us-east-1.amazonaws.com/battery-ml:ec2-backend
```

### Step 2: Deploy to EC2

SSH into your EC2 instance:

```bash
ssh -i your-key.pem ec2-user@3.90.162.23
```

**Option A: Using Docker (Quickest)**

```bash
# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 070872471952.dkr.ecr.us-east-1.amazonaws.com

# Run container
docker run -d \
  --name zeflash-backend \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e PORT=3000 \
  --restart unless-stopped \
  070872471952.dkr.ecr.us-east-1.amazonaws.com/battery-ml:ec2-backend

# Test
curl http://localhost:3000/health
```

**Option B: Using Node.js (No Docker Required)**

```bash
# Copy source code and run deployment script
chmod +x deploy-nodejs-direct.sh
./deploy-nodejs-direct.sh

# Verify
curl http://localhost:3000/health
```

### Step 3: Update Vercel

1. Go to Vercel Dashboard
2. Settings → Environment Variables
3. Add/Update:
   ```
   VITE_API_BASE=http://3.90.162.23:3000
   ```
4. Redeploy (or commit a change to trigger deployment)

### Step 4: Test

In browser dev tools, verify API calls work:
```
GET http://3.90.162.23:3000/health
```

## ✅ What You Get

- ✅ Backend running on port 3000 in EC2
- ✅ Automatic restart on failure
- ✅ Health check endpoint working
- ✅ Connected to your Vercel frontend
- ✅ Production deployment ready

## 🔍 Verify It's Working

```bash
# From your local machine or EC2:
curl -v http://3.90.162.23:3000/health

# Should return:
# {"status": "ok", "service": "zeflash-backend", "timestamp": "..."}
```

## 📚 Full Documentation

See **EC2_DEPLOYMENT_README.md** for:
- Detailed troubleshooting
- Multiple deployment methods
- Service management commands
- CORS and security configuration

## 🆘 Troubleshooting

If backend doesn't start:

```bash
# Check container logs
docker logs zeflash-backend

# Or check service logs
sudo systemctl status zeflash-backend
tail -f /opt/zeflash-backend/logs/error.log
```

If Vercel can't connect:
1. Verify security group allows port 3000
2. Test: `curl http://3.90.162.23:3000/health`
3. Check Vercel env variable spelling
4. Restart backend: `docker restart zeflash-backend`

---

**Next Steps:**
1. Build Docker image locally ✅ (script provided)
2. SSH into EC2 and run deployment
3. Update Vercel environment variables
4. Test the live connection

**Ready? Start with EC2_DEPLOYMENT_README.md!** 🚀
