# 🚀 Zeflash Backend EC2 Deployment

This guide helps you deploy the Zeflash backend to your EC2 instance at **3.90.162.23** for your live Vercel website.

## 📋 Prerequisites

### On Your Local Machine
- Docker installed and running
- AWS CLI configured with your AWS credentials
- Terminal/PowerShell access

### On EC2 (3.90.162.23)
- Node.js 18+ OR Docker
- SSH access enabled
- Security group allows port 3000 inbound

## 🚀 Deployment Methods

### Method 1: Docker Deployment (Recommended)

**Step 1: Ensure Docker image is built**
```powershell
cd d:\Zeflash3\Zeflash2
docker build -f backend/Dockerfile.simple -t battery-backend-ec2:latest .
```

**Step 2: Tag and push to ECR**
```powershell
docker tag battery-backend-ec2:latest 070872471952.dkr.ecr.us-east-1.amazonaws.com/battery-ml:ec2-backend
docker push 070872471952.dkr.ecr.us-east-1.amazonaws.com/battery-ml:ec2-backend
```

**Step 3: On EC2, run the deployment script**
```bash
# SSH into your EC2 instance
ssh -i your-key.pem ec2-user@3.90.162.23

# Run one of these:

# Option A: Quick single command
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 070872471952.dkr.ecr.us-east-1.amazonaws.com

docker run -d \
  --name zeflash-backend \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e PORT=3000 \
  --restart unless-stopped \
  070872471952.dkr.ecr.us-east-1.amazonaws.com/battery-ml:ec2-backend

# Option B: Using docker-compose
docker compose -f docker-compose-ec2.yml up -d

# Option C: Using deployment script
chmod +x deploy-to-ec2.sh
./deploy-to-ec2.sh
```

**Step 4: Verify deployment**
```bash
# Check if container is running
docker ps | grep zeflash-backend

# Test health endpoint
curl http://localhost:3000/health

# View logs
docker logs -f zeflash-backend
```

### Method 2: Direct Node.js Deployment (No Docker)

**Step 1: On EC2, copy the backend source code**
```bash
# Option A: Clone your repository
git clone https://github.com/your-org/zeflash.git
cd zeflash/backend

# Option B: Or copy files via SCP from your machine
scp -i your-key.pem -r d:\Zeflash3\Zeflash2\backend/* ec2-user@3.90.162.23:/tmp/zeflash-backend/
```

**Step 2: Run the deployment script**
```bash
chmod +x deploy-nodejs-direct.sh
./deploy-nodejs-direct.sh
```

**Step 3: Verify service**
```bash
# Check service status
sudo systemctl status zeflash-backend

# View logs
tail -f /opt/zeflash-backend/logs/app.log

# Test health endpoint
curl http://localhost:3000/health
```

## 🔗 Update Vercel Frontend

Once backend is running on EC2:

### 1. Get your EC2 Public IP
```bash
curl http://169.254.169.254/latest/meta-data/public-ipv4
# Returns something like: 3.90.162.23
```

### 2. Update Environment Variables on Vercel

Go to **Vercel Dashboard → Your Project → Settings → Environment Variables**

Add or update:
```
VITE_API_BASE=http://3.90.162.23:3000
```

Or with a domain (if you have one):
```
VITE_API_BASE=https://api.yourdomain.com:3000
```

### 3. Redeploy on Vercel
- Go to Vercel Dashboard
- Click "Deploy" or trigger a new deployment
- Verify it works by testing the API in browser dev tools

## ✅ Verification Checklist

- [ ] Docker image built locally (`battery-backend-ec2:latest`)
- [ ] Image pushed to ECR (`070872471952.dkr.ecr.us-east-1.amazonaws.com/battery-ml:ec2-backend`)
- [ ] SSH access to EC2 (3.90.162.23) verified
- [ ] Security group allows port 3000 inbound
- [ ] Container/service running on EC2
- [ ] Health check passes: `curl http://3.90.162.23:3000/health`
- [ ] Vercel env variables updated
- [ ] Vercel redeployed
- [ ] Vercel app can fetch from EC2 backend

## 📊 Service Status Commands

```bash
# Check if running (Docker)
docker ps | grep zeflash-backend

# Check if running (systemd)
sudo systemctl status zeflash-backend

# View logs (Docker)
docker logs -f zeflash-backend

# View logs (systemd)  
tail -f /opt/zeflash-backend/logs/app.log

# Restart service (Docker)
docker restart zeflash-backend

# Restart service (systemd)
sudo systemctl restart zeflash-backend

# Stop service (Docker)
docker stop zeflash-backend

# Stop service (systemd)
sudo systemctl stop zeflash-backend
```

## 🔧 Troubleshooting

### Port 3000 already in use
```bash
# Find process using port 3000
sudo lsof -i :3000

# Kill process
sudo kill -9 <PID>
```

### ECR authentication fails
```bash
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  070872471952.dkr.ecr.us-east-1.amazonaws.com
```

### Container won't start
```bash
docker logs zeflash-backend
# or
tail -50 /opt/zeflash-backend/logs/error.log
```

### Can't connect from Vercel
1. Verify security group allows port 3000 from your IP
2. Check if backend is actually running: `curl http://3.90.162.23:3000/health`
3. Verify environment variable is correct in Vercel
4. Check CORS settings in backend if needed

## 📝 Files Included

- `deploy-to-ec2.sh` - Docker deployment script
- `deploy-nodejs-direct.sh` - Direct Node.js deployment script
- `docker-compose-ec2.yml` - Docker Compose configuration
- `EC2_DEPLOYMENT_GUIDE.md` - Additional deployment details
- This README

## 🆘 Need Help?

1. Check container/service logs
2. Verify AWS credentials are configured
3. Ensure EC2 security group allows port 3000
4. Test connection: `curl http://3.90.162.23:3000/health`
5. Review backend logs for specific errors

## 📦 What's Running

- **Backend Service:** Express.js API on port 3000
- **Health Check:** `/health` endpoint returns `{"status": "ok"}`
- **Environment:** NODE_ENV=production
- **Logging:** SystemD journal or Docker logs
- **Restart Policy:** Automatic restart on failure

---

**Once deployed, your frontend will connect to this backend for all API calls!** 🎉
