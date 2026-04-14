# Architecture Migration: EC2 Port Conflict → ECS Separation

## ❌ Current Problem (Everything on EC2)

```
EC2 Instance (172.31.31.231)
├─ Port 22: SSH
├─ Port 3001: Backend (Node.js)
│  ├─ Database queries to Neon
│  └─ Calls localhost:8000 for ML
├─ Port 8000: ML API (Python/Uvicorn) ⚠️ PROBLEM!
│  ├─ Auto-restarts unexpectedly
│  ├─ Port conflicts
│  └─ Can't run both services reliably
└─ Port 5432: Unused (DB is external)

Issue: 
- Two services fighting over resources
- ML service keeps restarting
- Can't scale independently
- Tight resource coupling
```

## ✅ New Architecture (EC2 + ECS Separation)

```
┌─────────────────────────────────────────────────────────┐
│                    Internet / CDN                         │
└────────────────────┬────────────────────────────────────┘
                     │
        ┌────────────┴──────────────┐
        │                           │
        ▼                           ▼
   Frontend                    ml-proxy.js
   (Vercel/CDN)              (Vercel Function)
        │                           │
        └───────────┬───────────────┘
                    │
                    ▼
            EC2 Backend API
        (Port 3001 - Express)
            ├─ GET /api/credits ──→ Returns user credits
            ├─ POST /api/inference ──→ Deducts credits
            │                         & calls ECS ML API
            └─ Database: Neon PostgreSQL


            ┌──────────────────────────┐
            │   AWS ECS (Fargate)      │
            │  battery-ml-api-service  │
            │                          │
            │  Task: Python/Uvicorn    │
            │  CPU: 512 mCPU           │
            │  Memory: 1GB             │
            │  Port: 8000              │
            │  Auto-scaling: Yes       │
            │  Restarts: Managed       │
            │  Logs: CloudWatch        │
            └──────────────────────────┘


EC2 Instance              AWS ECS (Fargate)
(172.31.31.231)          (battery-ml-api)
├─ Port 22: SSH          │
├─ Port 3001:            │  ┌─────────────┐
│  Backend ◄─────────────┼─►│    ML API   │
│  ◄─────────────────────┼──►  Port 8000  │
└─                       │  └─────────────┘
                         │
                    CloudWatch
                    (Logs)

Key Benefits:
✅ No port conflicts
✅ Independent scaling
✅ ML restarts don't affect backend
✅ Better resource utilization
✅ Production-grade monitoring
✅ Auto-restart on failure
✅ Zero-downtime deployments
```

## 📋 Environment Variable Changes

### EC2 Backend (.env)

**Before:**
```env
# Everything local
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://...@neon.tech/...
ML_BACKEND_URL=http://localhost:8000
```

**After:**
```env
# Backend stays same
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://...@neon.tech/...

# ML now points to ECS
ML_BACKEND_URL=http://battery-ml-nlb-xxxxx.elb.us-east-1.amazonaws.com:8000
# OR direct task IP: http://10.0.x.x:8000 (but changes on redeploy)
```

### ML Service (.env on ECS)

**Before (EC2):**
```env
PORT=8000
BACKEND_API_URL=http://localhost:3001
PYTHONUNBUFFERED=1
```

**After (ECS):**
```env
PORT=8000
# Points to EC2 backend (same VPC or public IP)
BACKEND_API_URL=http://172.31.31.231:3001
# OR: BACKEND_API_URL=http://3.90.162.23:3001 (EC2 public IP)
PYTHONUNBUFFERED=1
```

### Frontend (vercel.json / .env)

**Before:**
```env
VITE_ML_BACKEND_URL=http://3.90.162.23:8000
```

**After:**
```env
# Points to ECS endpoint
VITE_ML_BACKEND_URL=http://battery-ml-nlb-xxxxx.elb.us-east-1.amazonaws.com:8000
```

## 🔀 Request Flow Comparison

### Current Flow (Broken)
```
Browser
  │
  └─→ EC2 Port 3001 (Backend)
       │
       └─→ EC2 Port 8000 (ML) ⚠️ CONFLICT!
```

### New Flow
```
Browser
  │
  ├─→ Frontend (CDN) ✅
  │
  ├─→ ml-proxy.js (Vercel Edge) ✅
  │
  └─→ EC2 Port 3001 (Backend)
       │
       └─→ ECS Port 8000 (ML) ✅
            │
            └─→ EC2 Port 3001 (save results) ✅
```

## 📊 Deployment Steps

| Step | Before | After |
|------|--------|-------|
| 1 | Start ML on EC2:8000 | Deploy ML to ECS |
| 2 | Start Backend on EC2:3001 | Backend stays on EC2:3001 |
| 3 | Port conflicts | No conflicts |
| 4 | Manual restarts needed | Managed by ECS |
| 5 | Single machine bottleneck | Independent scaling |
| 6 | No monitoring | CloudWatch logs |
| 7 | No auto-recovery | Auto-restart on failure |

## 💻 Command Reference

### Deploy ML to ECS
```bash
cd battery-ml-lambda
./deploy-ml-to-ecs.sh <AWS_ACCOUNT_ID> us-east-1
```

### Get ECS Endpoint
```bash
aws ecs describe-services \
  --cluster battery-ml-cluster \
  --services battery-ml-api-service \
  --region us-east-1 \
  --query 'services[0].taskDefinition'
```

### Update EC2 Backend
```bash
ssh ec2-user@3.90.162.23
# Edit .env with ECS endpoint
nano .env
# Add: ML_BACKEND_URL=http://<ECS_IP>:8000
# Restart backend
npm start
```

### Test Connectivity
```bash
# From EC2, test ECS:
curl http://ecs-ip:8000/health

# From browser, test full flow:
https://zeflash.app/api/credits
```

## 🎯 Success Criteria

✅ ML API responds on ECS:8000
✅ Backend on EC2:3001 can reach ECS
✅ No port conflicts
✅ Inference requests work end-to-end
✅ CloudWatch logs show activity
✅ Services restart automatically on failure

## 🚨 Rollback Plan

If issues arise:

```bash
# Stop ECS service
aws ecs update-service \
  --cluster battery-ml-cluster \
  --service battery-ml-api-service \
  --desired-count 0 \
  --region us-east-1

# Restart ML on EC2 (if needed)
cd ~/zeflash/battery-ml-lambda
source venv/bin/activate
python3 server.py --port 8001  # Use different port
```

Then update backend to use new port.

## 📝 Final Checklist

- [ ] AWS Account ID ready
- [ ] Docker installed locally
- [ ] AWS CLI configured
- [ ] ECS deployment script ready
- [ ] Network connectivity verified
- [ ] Security groups updated
- [ ] Environment variables ready
- [ ] Backend code updated
- [ ] Tests passing
- [ ] Monitoring configured
