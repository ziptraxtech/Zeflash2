# AWS ECS Quick Deploy Script for Battery ML Backend
# Run this script after configuring AWS CLI

param(
    [switch]$SkipBuild,
    [switch]$SkipPush,
    [switch]$DeployOnly
)

$ErrorActionPreference = "Stop"

# Configuration
$AWS_REGION = "us-east-1"
$AWS_ACCOUNT_ID = "070872471952"
$ECR_REPO_NAME = "battery-ml"
$ECS_CLUSTER_NAME = "battery-ml-cluster"
$ECS_SERVICE_NAME = "battery-ml-service"
$TASK_FAMILY = "battery-ml-task"

$ECR_REPO_URI = "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO_NAME"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Battery ML Backend - AWS ECS Deployment" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Check if AWS CLI is installed
Write-Host "[1/8] Checking AWS CLI..." -ForegroundColor Yellow
try {
    $awsVersion = aws --version
    Write-Host "✅ AWS CLI found: $awsVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ AWS CLI not found. Please install AWS CLI first." -ForegroundColor Red
    exit 1
}

# Check if Docker is installed
if (-not $DeployOnly) {
    Write-Host "[2/8] Checking Docker..." -ForegroundColor Yellow
    try {
        $dockerVersion = docker --version
        Write-Host "✅ Docker found: $dockerVersion" -ForegroundColor Green
    } catch {
        Write-Host "❌ Docker not found. Please install Docker Desktop first." -ForegroundColor Red
        exit 1
    }
}

# Login to ECR
if (-not $DeployOnly -and -not $SkipPush) {
    Write-Host "[3/8] Logging into ECR..." -ForegroundColor Yellow
    try {
        aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REPO_URI
        Write-Host "✅ Successfully logged into ECR" -ForegroundColor Green
    } catch {
        Write-Host "❌ Failed to login to ECR. Check your AWS credentials." -ForegroundColor Red
        exit 1
    }
}

# Build Docker image
if (-not $DeployOnly -and -not $SkipBuild) {
    Write-Host "[4/8] Building Docker image..." -ForegroundColor Yellow
    try {
        docker build -t battery-ml:latest .
        Write-Host "✅ Docker image built successfully" -ForegroundColor Green
    } catch {
        Write-Host "❌ Failed to build Docker image" -ForegroundColor Red
        exit 1
    }
}

# Tag Docker image
if (-not $DeployOnly -and -not $SkipPush) {
    Write-Host "[5/8] Tagging Docker image..." -ForegroundColor Yellow
    docker tag battery-ml:latest ${ECR_REPO_URI}:latest
    Write-Host "✅ Image tagged" -ForegroundColor Green
}

# Push Docker image
if (-not $DeployOnly -and -not $SkipPush) {
    Write-Host "[6/8] Pushing Docker image to ECR..." -ForegroundColor Yellow
    try {
        docker push ${ECR_REPO_URI}:latest
        Write-Host "✅ Image pushed to ECR" -ForegroundColor Green
    } catch {
        Write-Host "❌ Failed to push image to ECR" -ForegroundColor Red
        exit 1
    }
}

# Register task definition
Write-Host "[7/8] Registering ECS task definition..." -ForegroundColor Yellow
try {
    aws ecs register-task-definition --cli-input-json file://task-definition.json --region $AWS_REGION
    Write-Host "✅ Task definition registered" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to register task definition" -ForegroundColor Red
    Write-Host "Make sure task-definition.json exists and is valid" -ForegroundColor Red
    exit 1
}

# Update ECS service (force new deployment)
Write-Host "[8/8] Updating ECS service..." -ForegroundColor Yellow
try {
    # Check if service exists
    $serviceExists = aws ecs describe-services --cluster $ECS_CLUSTER_NAME --services $ECS_SERVICE_NAME --region $AWS_REGION --query "services[0].status" --output text
    
    if ($serviceExists -eq "ACTIVE") {
        Write-Host "Service exists, forcing new deployment..." -ForegroundColor Cyan
        aws ecs update-service `
            --cluster $ECS_CLUSTER_NAME `
            --service $ECS_SERVICE_NAME `
            --force-new-deployment `
            --region $AWS_REGION
        Write-Host "✅ Service updated successfully" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Service does not exist. Please create it manually first." -ForegroundColor Yellow
        Write-Host "See AWS_ECS_DEPLOYMENT.md Step 5 for instructions" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️  Could not update service. It may not exist yet." -ForegroundColor Yellow
    Write-Host "See AWS_ECS_DEPLOYMENT.md Step 5 to create the service" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "✅ Deployment Complete!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. If service doesn't exist, create it using AWS_ECS_DEPLOYMENT.md Step 5" -ForegroundColor White
Write-Host "2. Get service URL from ECS console or run:" -ForegroundColor White
Write-Host "   aws ecs describe-services --cluster $ECS_CLUSTER_NAME --services $ECS_SERVICE_NAME --region $AWS_REGION" -ForegroundColor Gray
Write-Host "3. Update your frontend to use the ECS service URL" -ForegroundColor White
Write-Host "4. Test with: curl http://<SERVICE_URL>:8000/health" -ForegroundColor White
Write-Host ""
Write-Host "View logs:" -ForegroundColor Yellow
Write-Host "aws logs tail /ecs/battery-ml --follow --region $AWS_REGION" -ForegroundColor Gray
Write-Host ""
