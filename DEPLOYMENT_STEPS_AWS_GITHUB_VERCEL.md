# Complete Deployment Pipeline: AWS → GitHub → Vercel

---

## 🏗️ ARCHITECTURE OVERVIEW

```
┌─────────────────────────────────────────────────────────────┐
│                   YOUR ZEFLASH SYSTEM                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  GitHub Repository                                          │
│  ├─ backend/              → AWS ECS (Backend)              │
│  ├─ battery-ml-lambda/    → AWS ECS (ML Service)           │
│  └─ Frontend Code         → Vercel (Hosting)               │
│                                                              │
│  AWS Infrastructure                                         │
│  ├─ ECR (Container Registry)                               │
│  ├─ ECS (Container Orchestration)                          │
│  ├─ RDS (Database)                                         │
│  ├─ S3 (File Storage)                                      │
│  ├─ Lambda (Serverless - /api/ml-proxy)                    │
│  └─ ALB (Load Balancer)                                    │
│                                                              │
│  Vercel Deployment                                         │
│  ├─ Frontend (Next.js/React)                               │
│  ├─ /api/ml-proxy (Serverless Function)                    │
│  └─ Environment Variables                                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 DEPLOYMENT STEPS (Point-Wise)

### PHASE 1: AWS INFRASTRUCTURE SETUP (One-Time)

#### 1.1 ECR (Elastic Container Registry)
- [ ] Go to AWS ECR Console
- [ ] Create repository: `zipbolt-backend`
- [ ] Create repository: `battery-ml`
- [ ] Save registry URLs: `070872471952.dkr.ecr.us-east-1.amazonaws.com`

#### 1.2 ECS (Elastic Container Service)
- [ ] Create ECS Cluster: `zipbolt-cluster`
- [ ] Create ECS Cluster: `battery-ml-cluster`
- [ ] For each cluster:
  - [ ] Create Task Definition (name, container image, ports, memory, CPU)
  - [ ] Create Service within cluster
  - [ ] Configure ALB (Application Load Balancer) targets
  - [ ] Set auto-scaling policies (optional)

#### 1.3 RDS (Database)
- [ ] Create PostgreSQL RDS instance
- [ ] Configure security groups (allow ECS inbound)
- [ ] Save connection string: `postgresql://user:pass@host/db`
- [ ] Set up automated backups

#### 1.4 S3 (Storage for ML Reports)
- [ ] Create S3 bucket: `battery-ml-results-070872471952`
- [ ] Configure bucket policy (allow ECS to write)
- [ ] Create folder: `/battery-reports/`

#### 1.5 IAM (Permissions)
- [ ] Create IAM user: `github-actions-zeflash`
- [ ] Attach policy: `AmazonEC2ContainerRegistryPowerUser` (ECR access)
- [ ] Attach policy: `AmazonECS_FullAccess` (ECS management)
- [ ] Create access keys for GitHub Actions
- [ ] Save Access Key ID and Secret Key

---

### PHASE 2: GITHUB SETUP

#### 2.1 Repository Configuration
- [ ] Clone repository locally: `git clone <repo>`
- [ ] Create branch strategy:
  - [ ] `main` → Automatic deployment to AWS/Vercel
  - [ ] `develop` → Testing branch
  - [ ] `feature/*` → Development branches

#### 2.2 GitHub Secrets (For AWS Deployment)
- [ ] Go to: Repository Settings → Secrets and variables → Actions
- [ ] Add secrets:
  - [ ] `AWS_ACCESS_KEY_ID` = (from IAM step 1.5)
  - [ ] `AWS_SECRET_ACCESS_KEY` = (from IAM step 1.5)
  - [ ] `AWS_REGION` = `us-east-1`

#### 2.3 GitHub Workflows (CI/CD)
- [ ] Verify workflow file: `.github/workflows/deploy-backend.yml`
  - [ ] Triggers: `push` to `main` + `backend/**` changed
  - [ ] Steps: Build Docker → Push ECR → Update ECS
- [ ] Verify workflow file: `.github/workflows/deploy-ml.yml`
  - [ ] Triggers: `push` to `main` + `battery-ml-lambda/**` changed
  - [ ] Steps: Build Docker → Push ECR → Update ECS

#### 2.4 Environment Files
- [ ] Create `.env` in root (for templates)
- [ ] Create `.env.local` (for local secrets - NOT committed)
- [ ] Add `.env` to `.gitignore`
- [ ] Add `.env.local` to `.gitignore`

---

### PHASE 3: BACKEND DEPLOYMENT (AWS ECS)

#### 3.1 Prepare Code
- [ ] Update `backend/` code changes
- [ ] Test locally: `cd backend && npm run dev`
- [ ] Verify API endpoints work: `http://localhost:3001`

#### 3.2 Docker Build (Local or GitHub Actions)
- [ ] Build locally: `docker build -t zipbolt-backend:latest backend/`
- [ ] OR: Push to GitHub and let GitHub Actions build

#### 3.3 ECR Push
- [ ] (If manual) Login to ECR:
  ```
  aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 070872471952.dkr.ecr.us-east-1.amazonaws.com
  ```
- [ ] Tag image: `docker tag zipbolt-backend:latest 070872471952.dkr.ecr.us-east-1.amazonaws.com/zipbolt-backend:latest`
- [ ] Push: `docker push 070872471952.dkr.ecr.us-east-1.amazonaws.com/zipbolt-backend:latest`
- [ ] (If GitHub Actions) Automatic on push to `backend/**`

#### 3.4 ECS Update
- [ ] Go to ECS Cluster: `zipbolt-cluster`
- [ ] Click Service: `zipbolt-backend-service`
- [ ] Click "Force new deployment"
- [ ] ECS pulls latest image from ECR
- [ ] Containers restart with new code
- [ ] ALB health checks verify they're running

#### 3.5 Verify Deployment
- [ ] Get ALB URL from ECS service
- [ ] Test endpoint: `curl http://<ALB-URL>:3001/health`
- [ ] Check CloudWatch logs for errors

---

### PHASE 4: ML SERVICE DEPLOYMENT (AWS ECS)

#### 4.1 Prepare Code
- [ ] Update `battery-ml-lambda/` code (Python files)
- [ ] Update model files if changed
- [ ] Update `requirements.txt` if new dependencies
- [ ] Test locally: `python battery-ml-lambda/server.py`
- [ ] Verify predictions work: `http://localhost:8000/docs`

#### 4.2 Docker Build
- [ ] Build locally: `docker build -t battery-ml:latest battery-ml-lambda/`
- [ ] OR: Commit & push to GitHub, GitHub Actions builds

#### 4.3 ECR Push
- [ ] (If manual) Login: `aws ecr get-login-password ...`
- [ ] Tag: `docker tag battery-ml:latest 070872471952.dkr.ecr.us-east-1.amazonaws.com/battery-ml:latest`
- [ ] Push: `docker push 070872471952.dkr.ecr.us-east-1.amazonaws.com/battery-ml:latest`
- [ ] (If GitHub Actions) Automatic on push to `battery-ml-lambda/**`

#### 4.4 ECS Update
- [ ] Go to ECS Cluster: `battery-ml-cluster`
- [ ] Click Service: `battery-ml-service`
- [ ] "Force new deployment"
- [ ] ECS rolls out new container
- [ ] New model downloads if changed
- [ ] Service becomes available at ALB

#### 4.5 Verify Deployment
- [ ] Get ML service ALB URL
- [ ] Test health: `curl http://<ML-ALB-URL>:8000/health`
- [ ] Test prediction: `curl -X POST http://<ML-ALB-URL>:8000/predict`

---

### PHASE 5: FRONTEND DEPLOYMENT (Vercel)

#### 5.1 Connect GitHub to Vercel
- [ ] Go to Vercel.com → New Project
- [ ] Connect GitHub repository
- [ ] Select organization: `rohan-zipbolts-projects`
- [ ] Select repo: `zeflash`

#### 5.2 Configure Vercel Project
- [ ] Project name: `zeflash` (or as you prefer)
- [ ] Framework: `Next.js` or `Vite` (as per your setup)
- [ ] Build command: `npm run build`
- [ ] Output directory: `dist/` or `.next/`
- [ ] Root directory: `./` (if monorepo, set to frontend root)

#### 5.3 Set Environment Variables in Vercel
- [ ] Go to Project Settings → Environment Variables
- [ ] Add variables:
  - [ ] `VITE_API_URL` = AWS Backend ALB URL
  - [ ] `VITE_ML_API_URL` = `/api/ml-proxy` (Vercel function)
  - [ ] `VITE_CLERK_PUBLISHABLE_KEY` = Clerk key
  - [ ] `VITE_RAZORPAY_KEY_ID` = Razorpay key
  - [ ] `DATABASE_URL` (if needed on frontend - usually not)

#### 5.4 Deploy Frontend
- [ ] (Automatic) Push code to `main` branch
- [ ] Vercel automatically:
  - [ ] Detects changes
  - [ ] Runs build command
  - [ ] Deploys to CDN
  - [ ] Assigns URL: `https://zeflash.vercel.app`

#### 5.5 Verify Frontend Deployment
- [ ] Open: `https://zeflash.vercel.app`
- [ ] Check console for API errors
- [ ] Test login functionality
- [ ] Test report generation

---

### PHASE 6: API PROXY (Vercel Serverless Function)

#### 6.1 Create Vercel Function
- [ ] Create file: `api/ml-proxy.js` or `api/ml-proxy.ts`
- [ ] Function receives requests from frontend
- [ ] Forwards to AWS ML backend: `http://<ML-ALB>:8000`

#### 6.2 Proxy Configuration
```javascript
// api/ml-proxy.js
export default async function handler(req, res) {
  const ML_BACKEND = process.env.VITE_ML_BACKEND_URL;
  const response = await fetch(`${ML_BACKEND}${req.url}`, {
    method: req.method,
    headers: req.headers,
    body: req.body
  });
  const data = await response.json();
  return res.status(response.status).json(data);
}
```

#### 6.3 Environment Variable
- [ ] Set in Vercel: `VITE_ML_BACKEND_URL` = AWS ML ALB URL
- [ ] Frontend calls: `/api/ml-proxy` (relative to Vercel)
- [ ] Proxy forwards to: AWS ML backend

#### 6.4 Test Proxy
- [ ] Frontend: `POST /api/ml-proxy/predict`
- [ ] Vercel forwards: `POST http://<ML-ALB>:8000/predict`
- [ ] Receives response and returns to frontend

---

### PHASE 7: CONTINUOUS DEPLOYMENT WORKFLOW

#### 7.1 Backend Update Flow
```
1. Edit code: backend/src/...
2. Test locally: npm run dev (port 3001)
3. Commit: git commit -m "Update backend"
4. Push: git push origin main
5. GitHub Actions triggers (file path: backend/**)
6. Build Docker image
7. Push to ECR
8. ECS updates service
9. New containers start
10. Deployed! ✅
Time: 2-3 minutes automatic
```

#### 7.2 ML Model Update Flow
```
1. Update code: battery-ml-lambda/inference_pipeline.py
2. Test locally: python server.py (port 8000)
3. Commit: git commit -m "Update model"
4. Push: git push origin main
5. GitHub Actions triggers (file path: battery-ml-lambda/**)
6. Build Docker image with new code
7. Push to ECR
8. ECS updates ML service
9. New model containers deploy
10. Deployed! ✅
Time: 2-5 minutes (depends on Docker layer caching)
```

#### 7.3 Frontend Update Flow
```
1. Edit code: src/components/.../
2. Test locally: npm run dev (port 5173)
3. Commit: git commit -m "Update UI"
4. Push: git push origin main
5. Vercel detects push
6. Vercel builds: npm run build
7. Vercel deploys to CDN
8. Frontend available at zeflash.vercel.app
9. Deployed! ✅
Time: 1-2 minutes automatic
```

---

## 🔄 ROLLBACK STEPS (If Something Goes Wrong)

#### Rollback Backend
- [ ] Go to ECS Service: `zipbolt-backend-service`
- [ ] Click "Update Service"
- [ ] Select previous Task Definition revision
- [ ] "Force new deployment"
- [ ] Service uses old container

#### Rollback ML Service
- [ ] Go to ECS Service: `battery-ml-service`
- [ ] Select previous Task Definition
- [ ] "Force new deployment"
- [ ] Previous model version active again

#### Rollback Frontend
- [ ] Go to Vercel → Deployments
- [ ] Find previous deployment
- [ ] Click "Promote to Production"
- [ ] Frontend reverts instantly

---

## ✅ DEPLOYMENT CHECKLIST

### Before First Deployment
- [ ] AWS account created
- [ ] ECR repositories created (both)
- [ ] ECS clusters created (both)
- [ ] RDS database configured
- [ ] IAM user created with access keys
- [ ] GitHub Secrets configured (3 secrets)
- [ ] Vercel project connected to GitHub
- [ ] Environment variables set in Vercel

### For Each Code Change
- [ ] Test locally (npm run dev / python server.py)
- [ ] Code review (if team)
- [ ] Commit with clear message: `git commit -m "..."`
- [ ] Push to main: `git push origin main`
- [ ] Monitor deployments:
  - [ ] GitHub Actions tab (Backend/ML)
  - [ ] Vercel Deployments tab (Frontend)
- [ ] Test deployed version in AWS/Vercel
- [ ] Verify logs in CloudWatch (for errors)

### Verification After Deployment
- [ ] Backend: `curl http://<ALB>:3001/health`
- [ ] ML Service: `curl http://<ML-ALB>:8000/health`
- [ ] Frontend: Visit `https://zeflash.vercel.app`
- [ ] Test full flow: Login → Generate Report → Check Results

---

## 📊 DEPLOYMENT TIMES

| Component | Manual Time | GitHub Actions | Vercel |
|-----------|------------|-----------------|--------|
| Backend | 5-10 min | 2-3 min auto ⭐ | N/A |
| ML Service | 5-10 min | 2-5 min auto ⭐ | N/A |
| Frontend | N/A | N/A | 1-2 min auto ⭐ |
| **Total** | 10-20 min | **5-10 min** | **5-10 min** |

---

## 🚨 TROUBLESHOOTING

### GitHub Actions Failure
- [ ] Check workflow logs: GitHub → Actions tab
- [ ] Verify AWS credentials in GitHub Secrets
- [ ] Check Docker build logs
- [ ] Verify ECR repository exists

### ECS Service Not Updating
- [ ] Check CloudWatch logs: CloudWatch → Log Groups
- [ ] Verify security groups allow traffic
- [ ] Verify task definition has correct image URI
- [ ] Check Task definition CPU/Memory allocation

### Vercel Build Failure
- [ ] Check Vercel build logs: Vercel.com → Deployments
- [ ] Verify environment variables are set
- [ ] Check `npm run build` succeeds locally
- [ ] Verify API URLs are correct

### Frontend Can't Connect to Backend
- [ ] Check ALB URL is correct
- [ ] Verify security groups allow HTTPS/HTTP
- [ ] Check CORS settings in backend
- [ ] Verify firewall rules

---

## 🎯 NEXT ACTIONS

### Immediate (This Week)
- [ ] Verify all AWS infrastructure exists
- [ ] Test GitHub Actions on a branch
- [ ] Test Vercel deployment on a branch
- [ ] Run through full flow: code push → tests → deploy

### Short-term (This Month)
- [ ] Set up monitoring and alerts
- [ ] Configure CloudWatch dashboards
- [ ] Set up error tracking (Sentry, etc.)
- [ ] Document runbooks for team

### Long-term (Next Quarter)
- [ ] Add infrastructure as code (Terraform)
- [ ] Set up staging environment (pre-prod)
- [ ] Implement canary deployments
- [ ] Add comprehensive automated tests

