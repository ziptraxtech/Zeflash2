# GitHub Actions Setup Guide for Zipbolt Deployment

This guide walks you through setting up automated GitHub Actions for deploying the backend and ML service to AWS ECS.

## Prerequisites

Before starting, ensure you have:
- AWS Account with access to create ECR repositories and ECS services
- GitHub repository set up
- AWS IAM user with appropriate permissions

## Step 1: Create AWS Resources

### 1.1 Create ECR Repositories

```bash
# Login to AWS
aws configure

# Create ECR repository for backend
aws ecr create-repository \
  --repository-name zipbolt-backend \
  --region us-east-1

# Create ECR repository for ML service
aws ecr create-repository \
  --repository-name zipbolt-ml-service \
  --region us-east-1
```

### 1.2 Create ECS Cluster (if not already created)

```bash
# Create ECS cluster
aws ecs create-cluster --cluster-name zipbolt-cluster --region us-east-1
```

### 1.3 Create Task Definitions

You'll need to create task definitions in the AWS ECS console or via CLI:

**For Backend Task Definition (`zipbolt-backend`):**
- Memory: 512 MB
- CPU: 256
- Container Port: 3001
- Environment Variables:
  - `DATABASE_URL`: Your Neon DB connection string
  - `CLERK_SECRET_KEY`: Your Clerk secret
  - `RAZORPAY_KEY_SECRET`: Your Razorpay secret
  - `ML_BACKEND_URL`: https://your-ml-service-domain/api
  - `S3_BUCKET`: Your S3 bucket name
  - `NODE_ENV`: production

**For ML Service Task Definition (`zipbolt-ml-inference`):**
- Memory: 2048 MB (2 GB for ML models)
- CPU: 1024
- Container Port: 8000
- Environment Variables:
  - `BACKEND_API_URL`: https://your-backend-domain/api
  - `S3_BUCKET`: Your S3 bucket name
  - `AWS_ACCESS_KEY_ID`: AWS credentials
  - `AWS_SECRET_ACCESS_KEY`: AWS credentials

## Step 2: Create ECS Services

```bash
# Create backend service
aws ecs create-service \
  --cluster zipbolt-cluster \
  --service-name zipbolt-backend-service \
  --task-definition zipbolt-backend:1 \
  --desired-count 2 \
  --launch-type EC2 \
  --region us-east-1

# Create ML service
aws ecs create-service \
  --cluster zipbolt-cluster \
  --service-name zipbolt-ml-service \
  --task-definition zipbolt-ml-inference:1 \
  --desired-count 2 \
  --launch-type EC2 \
  --region us-east-1
```

## Step 3: Add GitHub Secrets

1. Go to your GitHub repository → **Settings** → **Secrets and variables** → **Actions**

2. Click **New repository secret** and add these secrets:

### Required AWS Credentials:
- **AWS_ACCESS_KEY_ID**: Your AWS access key
- **AWS_SECRET_ACCESS_KEY**: Your AWS secret key

### Optional but Recommended:
- **AWS_ACCOUNT_ID**: Your AWS account ID (for reference)
- **ECR_REGION**: us-east-1 (or your region)

**How to get AWS credentials:**
1. Go to AWS IAM Console
2. Create a new user with programmatic access
3. Attach policy: `AmazonEC2ContainerRegistryFullAccess` + `AmazonECS_FullAccess`
4. Download the access key and secret key
5. Add them to GitHub Secrets

## Step 4: Configure Task Health Checks (Optional but Recommended for Zero-Downtime)

In AWS ECS console for each service:

1. Go to **Cluster** → **Service** → **Update Service**
2. Set **Desired count** to 2 (run 2 instances for rolling deployment)
3. Set **Minimum healthy percent** to 50 (keeps 1 running during deploy)
4. Set **Maximum percent** to 200 (allows 2 instances during deploy)
5. Update **Deployment configuration** to rolling

## Step 5: Commit and Push

```bash
# Add the GitHub Actions workflows
git add .github/workflows/
git add backend/Dockerfile
git commit -m "feat: Add GitHub Actions CI/CD for AWS ECS deployment"
git push origin main
```

## Step 6: Monitor Deployments

1. Go to your GitHub repository
2. Click **Actions** tab
3. You should see workflow runs for "Deploy Backend to AWS ECS" and "Deploy ML Service to AWS ECS"
4. Click on a workflow to see detailed logs

## Automatic Deployment Triggers

The workflows automatically deploy when you push changes to:

- **Backend**: Any changes to `backend/**` directory
- **ML Service**: Any changes to `battery-ml-lambda/**` directory
- **Workflows**: Changes to `.github/workflows/*.yml` files

## Manual Deployment

To manually trigger a deployment without code changes:

1. Go to **Actions** tab
2. Select the workflow (e.g., "Deploy Backend to AWS ECS")
3. Click **Run workflow**
4. Select your branch and click **Run**

## Troubleshooting

### Problem: Workflow fails with "Invalid credentials"
- **Solution**: Check that AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY are correctly set in GitHub Secrets

### Problem: "Repository not found in ECR"
- **Solution**: Make sure ECR repositories exist in AWS (`zipbolt-backend` and `zipbolt-ml-service`)

### Problem: "Task definition not found"
- **Solution**: Create the task definitions in AWS ECS console before deployment

### Problem: Service doesn't become healthy
- **Solution**: 
  - Check CloudWatch logs for the task
  - Verify environment variables are correct
  - Check security group allows traffic on the correct ports (3001 for backend, 8000 for ML)

## Environment Variables Reference

### Backend (.env)
```
DATABASE_URL=postgresql://user:password@neon-endpoint/database
CLERK_SECRET_KEY=your_clerk_secret
RAZORPAY_KEY_SECRET=your_razorpay_secret
ML_BACKEND_URL=https://ml-service.example.com/api
S3_BUCKET=battery-ml-results-test
NODE_ENV=production
```

### ML Service (environment variables in task definition)
```
BACKEND_API_URL=https://backend.example.com/api
S3_BUCKET=battery-ml-results-test
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
```

## Frontend Deployment

The frontend (Vite React app) is automatically deployed to Vercel via GitHub webhook. It deploys automatically when you push to `main` branch (if Vercel is connected to your GitHub).

To set up Vercel deployment:
1. Connect your GitHub repo to Vercel (vercel.com → Import Project)
2. Select the root directory
3. Set environment variables in Vercel dashboard
4. That's it! It auto-deploys on every push to main

## Zero-Downtime Deployment

Current Configuration:
- ✓ 2 instances running per service (desired count = 2)
- ✓ Minimum healthy = 1 (keeps service running during update)
- ✓ Maximum = 2 (allows rolling updates)
- ✓ Deployment strategy = Rolling updates
- ✓ Health check enabled

This ensures:
- While deploying, at least 1 instance stays healthy
- New instance is tested before old one is removed
- ~30 seconds of minimal latency during healthy check
- No complete downtime

## Next Steps

1. Create AWS resources using commands in Step 1
2. Add GitHub Secrets (Step 3)
3. Create task definitions in AWS ECS console (Step 1.3)
4. Create services (Step 2)
5. Commit and push changes
6. Monitor first deployment in GitHub Actions tab

## Support

For issues with:
- **GitHub Actions**: Check workflow run logs in Actions tab
- **AWS ECS**: Check CloudWatch logs and ECS task logs
- **Database**: Check Neon dashboard
- **Deployment strategy**: Review AWS ECS documentation

---

**Note**: Update the environment variables and AWS resource names to match your actual AWS setup.
