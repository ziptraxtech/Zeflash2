# Quick Start - AWS & GitHub Actions Setup

## 🚨 URGENT: Security Issues Found

Your `.env` file contains exposed credentials. **These must be rotated immediately.**

---

## 📋 Immediate To-Do List (Next 1 Hour)

### Step 1: Revoke Exposed Credentials

```powershell
# 1. AWS Access Keys - DELETE exposed key
#    Go to: https://console.aws.amazon.com/iam/
#    → Users → Your User → Security credentials
#    → Delete: AKIARBACUDGIE5G7QWKR

# 2. Database - Reset password
#    Go to: https://console.neon.tech/
#    → Reset database password

# 3. Clerk - Revoke API key
#    Go to: https://dashboard.clerk.com/
#    → Revoke: sk_test_Qfuf5HEHWbvxxKXkNX3CX8vikuR4rzKrFjjXHpSQHq

# 4. Razorpay - Rotate keys
#    Go to: https://dashboard.razorpay.com/
#    → Rotate keys

# 5. Vercel - Revoke token
#    Go to: https://vercel.com/dashboard
#    → Revoke OIDC token
```

### Step 2: Create New AWS Access Keys

```powershell
# Go to: https://console.aws.amazon.com/iam/
# → Users → Create new access key
# → Keep credentials safe!

$newAccessKeyId = "AKIA..."          # Copy here
$newSecretAccessKey = "xxxx..."      # Copy here
```

### Step 3: Configure GitHub Secrets

```powershell
# Run the setup wizard:
.\setup-github-actions.ps1
```

**OR manually:**

1. Go to GitHub Repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Add these secrets:
   - `AWS_ACCESS_KEY_ID` = Your new key from Step 2
   - `AWS_SECRET_ACCESS_KEY` = Your new secret from Step 2
   - `AWS_REGION` = `us-east-1`

### Step 4: Create `.env.local`

```powershell
# Copy template to local file
cp .env.local.example .env.local

# Edit .env.local with new credentials (NEVER COMMIT THIS FILE)
code .env.local

# Verify it's in .gitignore
cat .gitignore | grep ".env"
```

### Step 5: Clean Up Git History

```bash
# Old credentials are in git history - they should be revoked
# (Already done in Step 1 above)

# For extra safety, in future use git-secrets hook:
git clone https://github.com/awslabs/git-secrets.git
cd git-secrets && git install
```

---

## ✅ File Checklist

- [ ] `.env.local` created with new credentials (NOT committed)
- [ ] `.env` contains only non-sensitive config
- [ ] `.gitignore` includes `.env` and `.env.local`
- [ ] GitHub Secrets configured (3 secrets added)
- [ ] AWS credentials rotated (old keys deleted)
- [ ] Database password reset
- [ ] API keys rotated (Clerk, Razorpay, Vercel)

---

## 📊 GitHub Actions Workflows

Both workflows are **correctly configured** to use GitHub Secrets:

### Deploy Backend
File: `.github/workflows/deploy-backend.yml`
- Builds and pushes to ECR
- Deploys to ECS service
- Triggered on: `main` and `production` branches

### Deploy ML
File: `.github/workflows/deploy-ml.yml`
- Builds and pushes ML container to ECR
- Deploys to ECS service
- Triggered on: `main` and `production` branches

**Status**: ✅ Ready once GitHub Secrets are set

---

## 🧪 Test After Setup

```bash
# 1. Test AWS credentials
aws sts get-caller-identity

# 2. Test ECR access
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 070872471952.dkr.ecr.us-east-1.amazonaws.com

# 3. Trigger GitHub Actions by pushing to main
git add .
git commit -m "Configure AWS and GitHub Actions"
git push origin main

# 4. Watch deployment
# Go to: GitHub → Actions tab
```

---

## 📚 Documentation Files Created

| File | Purpose |
|------|---------|
| `AWS_GITHUB_SETUP.md` | Complete AWS & GitHub Actions setup guide |
| `SECURITY_AUDIT_REPORT.md` | Detailed security audit and remediation steps |
| `setup-github-actions.ps1` | Automated setup wizard (PowerShell) |
| `.env.local.example` | Template for local environment variables |

---

## ⚠️ Common Issues & Solutions

### Issue: "GitHub Actions secret not found"
**Solution**: Make sure secrets are set in GitHub:
```
Settings → Secrets and variables → Actions
```

### Issue: "Unable to access ECR"
**Solution**: Create ECR repositories:
```bash
aws ecr create-repository --repository-name zipbolt-backend --region us-east-1
aws ecr create-repository --repository-name battery-ml --region us-east-1
```

### Issue: ".env file committed by mistake"
**Solution**: Remove from git history:
```bash
git rm --cached .env
git commit -m "Remove .env from tracking"
git push
```

---

## 🔐 Security Best Practices

1. **Never commit `.env`** ← Use `.env.local`
2. **Rotate credentials every 90 days** ← AWS recommendation
3. **Use separate keys per developer** ← Don't share
4. **Enable MFA on AWS account** ← Extra security
5. **Monitor CloudTrail** ← Audit all API calls
6. **Review deployments** ← Check GitHub Actions logs

---

## 🆘 Support

- **AWS Issues**: https://console.aws.amazon.com/support/
- **GitHub Issues**: https://github.com/support
- **Neon Database**: https://neon.tech/docs
- **Clerk Auth**: https://clerk.com/support

---

**Created**: April 12, 2026  
**Last Updated**: April 12, 2026

