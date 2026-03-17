# Zeflash2 Production Deployment

## ✅ What's Ready for Production

### GitHub Actions Workflows
- ✅ `deploy-backend.yml` - Auto-deploys backend on code push
- ✅ `deploy-ml.yml` - Auto-deploys ML service on code push
- ✅ Backend Dockerfile - Multi-stage production build
- ✅ ML Dockerfile - Python 3.10 with ML dependencies
- ✅ All hardcoded credentials removed
- ✅ All secrets protected in .env files

### Infrastructure Configuration
- ✅ AWS Account: `070872471952`
- ✅ Region: `us-east-1`
- ✅ ECR Repositories: `zipbolt-backend`, `battery-ml`
- ✅ ECS Cluster: `zipbolt-cluster`, `battery-ml-cluster`
- ✅ Load Balancers: Auto-configured with health checks
- ✅ S3 Bucket: `battery-ml-results-test` (use `battery-ml-results-prod` for production)

### Database & Storage
- ✅ Neon PostgreSQL configured
- ✅ All tables created and verified
- ✅ Prisma migrations ready
- ✅ S3 upload functionality tested
- ✅ Database persistence verified

---

## 🔐 REQUIRED: GitHub Secrets Setup

Add these two secrets to your GitHub repository:
- `Settings → Secrets and variables → Actions`

```
Secret 1: AWS_ACCESS_KEY_ID
Secret 2: AWS_SECRET_ACCESS_KEY
```

These are used by both workflows to deploy your code to AWS.

**Get AWS Credentials:**
1. Go to AWS IAM Console
2. Create user: `github-actions-zeflash`
3. Attach policies: ECR, ECS, S3 access
4. Create access keys
5. Add to GitHub Secrets

---

## 📝 Environment Variables

All services use environment variables from `.env` files (already in `.gitignore`):

**Backend (.env)**
- DATABASE_URL - Neon pooled connection
- DIRECT_URL - Neon direct connection (migrations)
- CLERK_SECRET_KEY - Authentication key
- RAZORPAY_KEY_ID & KEY_SECRET - Payment processing
- PORT - 3001
- NODE_ENV - production

**ML Service (.env)**
- AWS_DEFAULT_REGION - us-east-1
- S3_BUCKET - battery-ml-results-prod
- S3_PREFIX - battery-reports/
- TOKEN_ENDPOINT - CMS API endpoint
- BACKEND_API_URL - Backend service URL

---

## 🚀 Deployment Steps

1. **Add AWS Credentials to GitHub**
   - Create IAM user with ECR, ECS, S3 permissions
   - Generate access keys
   - Add as GitHub Secrets

2. **Create Production Database**
   - Sign up at neon.tech
   - Create production project
   - Get pooled & direct connection strings
   - Add to backend/.env

3. **Create Production S3 Bucket**
   ```
   Bucket: battery-ml-results-prod
   Region: us-east-1
   Allow ECS role to write
   ```

4. **Test Locally**
   ```bash
   npm run dev          # Backend on :3001
   python server.py     # ML on :8000
   ```

5. **Push to GitHub**
   ```bash
   git push origin production
   ```

6. **Watch Deployment**
   - GitHub Actions: https://github.com/ziptraxtech/Zeflash2/actions
   - AWS ECR: New images appear in registry
   - AWS ECS: Services update with new version

---

## 📋 Security Checklist

- ✅ No AWS keys in code (all in .env files)
- ✅ No database passwords in code (all in .env files)
- ✅ .env files in .gitignore
- ✅ GitHub Actions uses secrets, not hardcoded values
- ✅ Workflows use IAM roles, not personal credentials
- ✅ All test files excluded from git
- ✅ Docker images don't bake in secrets

---

## 🔍 Verification

**Check Backend Health:**
```bash
curl http://backend-url/health
```

**Check ML Service Health:**
```bash
curl http://ml-url/health
```

**Check Database:**
```bash
curl http://backend-url/api/inference/stats
```

**Check S3 Upload:**
```bash
aws s3 ls s3://battery-ml-results-prod/
```

---

## 📚 Documentation Files

Read these for detailed setup:

1. **PRODUCTION_DEPLOYMENT_GUIDE.md**
   - Detailed AWS setup
   - Neon database configuration
   - S3 bucket setup
   - ECS task definitions
   - Monitoring & verification

2. **GITHUB_ACTIONS_SECRETS_SETUP.md**
   - GitHub Secrets configuration
   - IAM user setup
   - Workflow variables
   - Troubleshooting

3. **PRODUCTION_SECURITY_CHECKLIST.md**
   - Complete pre-deployment checklist
   - Security verification steps
   - Testing procedures

---

## 🎯 Quick Start

```bash
# 1. Clone repo
git clone https://github.com/ziptraxtech/Zeflash2.git
cd zeflash-new

# 2. Add GitHub Secrets (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
# Go to: https://github.com/ziptraxtech/Zeflash2/settings/secrets/actions

# 3. Create .env files locally
cp backend/.env.example backend/.env
cp battery-ml-lambda/.env.example battery-ml-lambda/.env

# 4. Fill in production values in .env files
# (Database, API keys, S3 bucket, etc.)

# 5. Test locally
npm run dev

# 6. Push to production
git push origin production

# 7. Watch GitHub Actions deploy your code!
```

---

## 💬 Support

For detailed setup instructions, read:
- `PRODUCTION_DEPLOYMENT_GUIDE.md` - Complete setup guide
- `GITHUB_ACTIONS_SECRETS_SETUP.md` - Secrets configuration
- `PRODUCTION_SECURITY_CHECKLIST.md` - Pre-deployment checklist

All files included in this repository.
