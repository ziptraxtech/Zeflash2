# AWS & GitHub Actions Setup Guide

## ⚠️ CRITICAL SECURITY ISSUES FOUND

Your `.env` file contains exposed credentials:
- AWS Access Keys
- Database credentials  
- API keys and secrets
- Vercel tokens

**ACTION REQUIRED**: These credentials must be revoked immediately in your AWS account.

---

## Part 1: Secure Credential Management

### Step 1: Revoke Exposed Credentials

⚠️ **URGENT**: Your AWS credentials are exposed. Follow these steps:

1. Go to [AWS IAM Console](https://console.aws.amazon.com/iam/)
2. Click **Users** → Find your user
3. Click **Security credentials** tab
4. Delete the exposed access key: `AKIARBACUDGIE5G7QWKR`
5. Create a **NEW** access key pair
6. Do NOT commit credentials to Git again

### Step 2: Create `.env.local` (Never commit to Git)

Create a `.env.local` file in the root directory with your LOCAL credentials:

```bash
# .env.local (NEVER commit to Git)
AWS_ACCESS_KEY_ID=your-new-access-key-here
AWS_SECRET_ACCESS_KEY=your-new-secret-key-here
AWS_DEFAULT_REGION=us-east-1
AWS_REGION=us-east-1
AWS_ACCOUNT_ID=070872471952

# Database
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

# API Keys
CLERK_SECRET_KEY="sk_test_..."
VITE_RAZORPAY_KEY_ID="rzp_live_..."
VITE_RAZORPAY_KEY_SECRET="..."

# Other URLs
BACKEND_API_URL="http://localhost:3001"
VITE_API_URL="http://localhost:3001"
ML_BACKEND_URL="http://127.0.0.1:8000"
VITE_ML_API_URL="/api/ml-proxy"
```

### Step 3: Update `.env` to Template (Safe to commit)

Replace `.env` with safe template values:

```bash
# .env (Safe to commit - use placeholders)
AWS_DEFAULT_REGION="us-east-1"
AWS_REGION="us-east-1"
DYNAMODB_TABLE_NAME="zeflash-users"
S3_BUCKET="battery-ml-results-070872471952"
S3_PREFIX="battery-reports/"

BACKEND_API_URL="http://localhost:3001"
VITE_API_URL="http://localhost:3001"
ML_BACKEND_URL="http://127.0.0.1:8000"
VITE_ML_API_URL="/api/ml-proxy"
```

### Step 4: Update `.gitignore`

Ensure these files are NEVER committed:

```bash
# .gitignore (add these lines)
.env
.env.local
.env.*.local
.env.production.local
.env.development.local
*.key
.aws/credentials
.aws/config
```

---

## Part 2: GitHub Actions Setup

### Step 1: Add GitHub Secrets

1. Go to Your GitHub Repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret** and add these:

```
AWS_ACCESS_KEY_ID          → Your new AWS access key
AWS_SECRET_ACCESS_KEY      → Your new AWS secret key
AWS_REGION                 → us-east-1
ECR_REGISTRY_ALIAS         → (optional, for faster ECR login)
```

### Step 2: Create IAM Policy for GitHub Actions

Create a restrictive IAM policy for GitHub Actions deployment:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken",
        "ecr:BatchGetImage",
        "ecr:GetDownloadUrlForLayer",
        "ecr:PutImage",
        "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart",
        "ecr:CompleteLayerUpload"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "ecs:DescribeServices",
        "ecs:DescribeTaskDefinition",
        "ecs:DescribeContainerInstances",
        "ecs:UpdateService",
        "ecs:RegisterTaskDefinition"
      ],
      "Resource": [
        "arn:aws:ecs:us-east-1:070872471952:service/zipbolt-cluster/*",
        "arn:aws:ecs:us-east-1:070872471952:task-definition/*"
      ]
    }
  ]
}
```

### Step 3: Verify GitHub Actions Workflows

Your workflows are correctly set up:

✅ `backend/.github/workflows/deploy-backend.yml` - Uses secrets properly
✅ `battery-ml-lambda/.github/workflows/deploy-ml.yml` - Uses secrets properly

The workflows reference:
- `${{ secrets.AWS_ACCESS_KEY_ID }}`
- `${{ secrets.AWS_SECRET_ACCESS_KEY }}`

These will be pulled from GitHub Secrets you added in Step 1.

---

## Part 3: Local Development Setup

### Windows PowerShell Setup

```powershell
# 1. Set AWS credentials environment variables
$env:AWS_ACCESS_KEY_ID = "your-key-id"
$env:AWS_SECRET_ACCESS_KEY = "your-secret-key"
$env:AWS_DEFAULT_REGION = "us-east-1"

# 2. Verify AWS CLI is configured
aws sts get-caller-identity

# Output should show your AWS account:
# {
#     "UserId": "...",
#     "Account": "070872471952",
#     "Arn": "arn:aws:iam::070872471952:user/..."
# }

# 3. Test ECR login
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 070872471952.dkr.ecr.us-east-1.amazonaws.com

# Output: Login Succeeded
```

### Linux/macOS Setup

```bash
# 1. Configure AWS credentials
aws configure
# Enter:
# AWS Access Key ID: your-key-id
# AWS Secret Access Key: your-secret-key
# Default region name: us-east-1

# 2. Verify setup
aws sts get-caller-identity

# 3. Test ECR login
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 070872471952.dkr.ecr.us-east-1.amazonaws.com
```

---

## Part 4: Troubleshooting Common GitHub Actions Errors

### Error: "Unable to assume role"

**Cause**: AWS credentials not set in GitHub Secrets

**Fix**:
```bash
# Yes, verify secrets are set in GitHub
# Settings → Secrets and variables → Actions

# Check the secret values exist:
# AWS_ACCESS_KEY_ID ✓
# AWS_SECRET_ACCESS_KEY ✓
```

### Error: "Access Denied to ECR"

**Cause**: IAM user doesn't have ECR permissions

**Fix**:
1. Go to [IAM Console](https://console.aws.amazon.com/iam/)
2. Click **Users**
3. Select your user
4. Click **Add permissions** → **Attach policies directly**
5. Search for and attach: `AmazonEC2ContainerRegistryPowerUser`

### Error: "ECS Service not found"

**Cause**: ECS cluster/service not yet created

**Fix**: Deploy manually first using `deploy-to-ecs.ps1`:
```powershell
cd battery-ml-lambda
.\deploy-to-ecs.ps1
```

---

## Part 5: AWS Resources Required

Before GitHub Actions can deploy, ensure these exist in AWS:

### For Backend:

```
✓ ECR Repository: zipbolt-backend
✓ ECS Cluster: zipbolt-cluster
✓ ECS Service: zipbolt-backend-service
✓ ECS Task Definition: zipbolt-backend
✓ CloudWatch Log Group: /ecs/zipbolt-backend
```

### For ML Service:

```
✓ ECR Repository: battery-ml
✓ ECS Cluster: battery-ml-cluster
✓ ECS Service: battery-ml-service
✓ ECS Task Definition: battery-ml-task
✓ CloudWatch Log Group: /ecs/battery-ml
```

### Create ECR Repository (if missing):

```bash
# Backend
aws ecr create-repository --repository-name zipbolt-backend --region us-east-1

# ML
aws ecr create-repository --repository-name battery-ml --region us-east-1
```

---

## Part 6: Testing the Setup

### Test 1: Local Backend Deployment

```bash
cd backend
docker build -t zipbolt-backend:latest .
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 070872471952.dkr.ecr.us-east-1.amazonaws.com
docker tag zipbolt-backend:latest 070872471952.dkr.ecr.us-east-1.amazonaws.com/zipbolt-backend:latest
docker push 070872471952.dkr.ecr.us-east-1.amazonaws.com/zipbolt-backend:latest
```

### Test 2: Local ML Deployment

```bash
cd battery-ml-lambda
docker build -t battery-ml:latest .
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 070872471952.dkr.ecr.us-east-1.amazonaws.com
docker tag battery-ml:latest 070872471952.dkr.ecr.us-east-1.amazonaws.com/battery-ml:latest
docker push 070872471952.dkr.ecr.us-east-1.amazonaws.com/battery-ml:latest
```

### Test 3: Trigger GitHub Actions

```bash
# Push to main branch to trigger workflow
git add .
git commit -m "Deploy to AWS"
git push origin main

# Monitor in: GitHub → Actions tab
```

---

## Checklist: Before Deployment

- [ ] Created new AWS access keys (revoked old ones)
- [ ] Added secrets to GitHub (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
- [ ] Updated `.env.local` with new credentials (NOT in Git)
- [ ] Updated `.env` with safe template values
- [ ] Updated `.gitignore` to exclude `.env` files
- [ ] Created ECR repositories
- [ ] Created ECS clusters, services, and task definitions
- [ ] Tested local Docker build and push
- [ ] GitHub Actions workflows are enabled
- [ ] Tested deployment via GitHub Actions

---

## Security Best Practices

1. **Never commit `.env` files** - Use `.env.local` and `.gitignore`
2. **Rotate credentials regularly** - AWS recommends every 90 days
3. **Use IAM roles** - For production, use IAM roles instead of access keys
4. **Enable MFA** - On your AWS account
5. **Use separate keys** - Don't share keys between developers
6. **Audit access** - Use CloudTrail to monitor API calls
7. **Use GitHub Secrets** - Never hardcode credentials in workflows
8. **Review pull requests** - Check for exposed credentials before merge

