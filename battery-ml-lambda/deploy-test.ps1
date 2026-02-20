# AWS ECS Safe Test Deployment Script
# Deploys to TEST environment without affecting live site

param(
    [switch]$SkipBuild,
    [switch]$CreateBucket
)

$ErrorActionPreference = "Stop"

# Configuration
$AWS_REGION = "us-east-1"
$AWS_ACCOUNT_ID = "070872471952"
$ECR_REPO_NAME = "battery-ml"
$ECS_CLUSTER_NAME = "ml-cluster"
$TEST_SERVICE_NAME = "battery-ml-service-test"
$TEST_TASK_FAMILY = "battery-ml-task-test"
$TEST_BUCKET = "battery-ml-results-test"
$PROD_BUCKET = "battery-ml-results-070872471952"

$ECR_REPO_URI = "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO_NAME"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Battery ML - SAFE TEST DEPLOYMENT" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "⚠️  This deploys to TEST environment only" -ForegroundColor Yellow
Write-Host "   Service: $TEST_SERVICE_NAME" -ForegroundColor Gray
Write-Host "   Bucket:  $TEST_BUCKET" -ForegroundColor Gray
Write-Host "   LIVE SITE: Not affected" -ForegroundColor Green
Write-Host ""

# Check if AWS CLI is installed
Write-Host "[1/9] Checking AWS CLI..." -ForegroundColor Yellow
try {
    $awsVersion = aws --version
    Write-Host "✅ AWS CLI found: $awsVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ AWS CLI not found. Please install AWS CLI first." -ForegroundColor Red
    exit 1
}

# Create test S3 bucket if requested
if ($CreateBucket) {
    Write-Host "[2/9] Creating test S3 bucket..." -ForegroundColor Yellow
    try {
        # Create bucket
        aws s3 mb s3://$TEST_BUCKET --region $AWS_REGION
        Write-Host "✅ Test bucket created: $TEST_BUCKET" -ForegroundColor Green
        
        # Copy CORS from production bucket
        Write-Host "   Copying CORS configuration..." -ForegroundColor Gray
        aws s3api get-bucket-cors --bucket $PROD_BUCKET | Out-File -FilePath "cors-temp.json" -Encoding utf8
        aws s3api put-bucket-cors --bucket $TEST_BUCKET --cors-configuration file://cors-temp.json
        Remove-Item "cors-temp.json"
        
        # Make bucket public (like production)
        Write-Host "   Setting public access..." -ForegroundColor Gray
        aws s3api put-public-access-block --bucket $TEST_BUCKET --public-access-block-configuration "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false"
        
        # Create bucket policy (modify from production)
        $bucketPolicy = @"
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::$TEST_BUCKET/battery-reports/*"
    }
  ]
}
"@
        $bucketPolicy | Out-File -FilePath "bucket-policy-temp.json" -Encoding utf8
        aws s3api put-bucket-policy --bucket $TEST_BUCKET --policy file://bucket-policy-temp.json
        Remove-Item "bucket-policy-temp.json"
        
        Write-Host "✅ Test bucket configured" -ForegroundColor Green
    } catch {
        Write-Host "⚠️  Bucket might already exist or error occurred" -ForegroundColor Yellow
        Write-Host "   Continuing with deployment..." -ForegroundColor Gray
    }
} else {
    Write-Host "[2/9] Skipping bucket creation (use -CreateBucket flag to create)" -ForegroundColor Gray
}

# Check if Docker is installed
if (-not $SkipBuild) {
    Write-Host "[3/9] Checking Docker..." -ForegroundColor Yellow
    try {
        $dockerVersion = docker --version
        Write-Host "✅ Docker found: $dockerVersion" -ForegroundColor Green
    } catch {
        Write-Host "❌ Docker not found. Please install Docker Desktop first." -ForegroundColor Red
        exit 1
    }
}

# Login to ECR
if (-not $SkipBuild) {
    Write-Host "[4/9] Logging into ECR..." -ForegroundColor Yellow
    try {
        aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REPO_URI
        Write-Host "✅ Successfully logged into ECR" -ForegroundColor Green
    } catch {
        Write-Host "❌ Failed to login to ECR. Check your AWS credentials." -ForegroundColor Red
        exit 1
    }
}

# Build Docker image
if (-not $SkipBuild) {
    Write-Host "[5/9] Building Docker image..." -ForegroundColor Yellow
    try {
        docker build -t battery-ml:test .
        Write-Host "✅ Docker image built successfully" -ForegroundColor Green
    } catch {
        Write-Host "❌ Failed to build Docker image" -ForegroundColor Red
        exit 1
    }
}

# Tag Docker image
if (-not $SkipBuild) {
    Write-Host "[6/9] Tagging Docker image as :test..." -ForegroundColor Yellow
    docker tag battery-ml:test ${ECR_REPO_URI}:test
    Write-Host "✅ Image tagged" -ForegroundColor Green
}

# Push Docker image
if (-not $SkipBuild) {
    Write-Host "[7/9] Pushing Docker image to ECR..." -ForegroundColor Yellow
    try {
        docker push ${ECR_REPO_URI}:test
        Write-Host "✅ Image pushed to ECR (tag: test)" -ForegroundColor Green
    } catch {
        Write-Host "❌ Failed to push image to ECR" -ForegroundColor Red
        exit 1
    }
}

# Register task definition
Write-Host "[8/9] Registering ECS task definition..." -ForegroundColor Yellow
try {
    aws ecs register-task-definition --cli-input-json file://task-definition-test.json --region $AWS_REGION
    Write-Host "✅ Task definition registered: $TEST_TASK_FAMILY" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to register task definition" -ForegroundColor Red
    Write-Host "Make sure task-definition-test.json exists and is valid" -ForegroundColor Red
    exit 1
}

# Update or create ECS service
Write-Host "[9/9] Updating ECS test service..." -ForegroundColor Yellow
try {
    # Check if service exists
    $serviceStatus = aws ecs describe-services --cluster $ECS_CLUSTER_NAME --services $TEST_SERVICE_NAME --region $AWS_REGION --query "services[0].status" --output text 2>$null
    
    if ($serviceStatus -eq "ACTIVE") {
        Write-Host "   Test service exists, forcing new deployment..." -ForegroundColor Cyan
        aws ecs update-service `
            --cluster $ECS_CLUSTER_NAME `
            --service $TEST_SERVICE_NAME `
            --task-definition $TEST_TASK_FAMILY `
            --force-new-deployment `
            --region $AWS_REGION
        Write-Host "✅ Test service updated successfully" -ForegroundColor Green
    } else {
        Write-Host "   Test service does not exist. Creating it..." -ForegroundColor Yellow
        Write-Host ""
        Write-Host "   You need to provide:" -ForegroundColor Yellow
        Write-Host "   - VPC Subnet IDs (at least 2)" -ForegroundColor Gray
        Write-Host "   - Security Group ID (must allow port 8000)" -ForegroundColor Gray
        Write-Host ""
        Write-Host "   Example command:" -ForegroundColor Cyan
        Write-Host "   aws ecs create-service \"  -ForegroundColor Gray
        Write-Host "     --cluster $ECS_CLUSTER_NAME \"  -ForegroundColor Gray
        Write-Host "     --service-name $TEST_SERVICE_NAME \"  -ForegroundColor Gray
        Write-Host "     --task-definition $TEST_TASK_FAMILY \"  -ForegroundColor Gray
        Write-Host "     --desired-count 1 \"  -ForegroundColor Gray
        Write-Host "     --launch-type FARGATE \"  -ForegroundColor Gray
        Write-Host "     --network-configuration 'awsvpcConfiguration={subnets=[subnet-XXX,subnet-YYY],securityGroups=[sg-XXX],assignPublicIp=ENABLED}' \"  -ForegroundColor Gray
        Write-Host "     --region $AWS_REGION" -ForegroundColor Gray
        Write-Host ""
        Write-Host "   See SAFE_DEPLOYMENT_GUIDE.md for details" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️  Could not update service automatically" -ForegroundColor Yellow
    Write-Host "   See SAFE_DEPLOYMENT_GUIDE.md for manual service creation" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "✅ TEST Deployment Complete!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Test Environment:" -ForegroundColor Yellow
Write-Host "  Service:  $TEST_SERVICE_NAME" -ForegroundColor White
Write-Host "  S3:       s3://$TEST_BUCKET" -ForegroundColor White
Write-Host "  Logs:     /ecs/battery-ml-test" -ForegroundColor White
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Get test service URL:" -ForegroundColor White
Write-Host "   aws ecs list-tasks --cluster $ECS_CLUSTER_NAME --service $TEST_SERVICE_NAME" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Test health endpoint:" -ForegroundColor White
Write-Host "   curl http://<TEST_IP>:8000/health" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Run inference test:" -ForegroundColor White
Write-Host "   curl -X POST http://<TEST_IP>:8000/api/v1/inference \" -ForegroundColor Gray
Write-Host "     -H 'Content-Type: application/json' \" -ForegroundColor Gray
Write-Host "     -d '{\"evse_id\":\"122300103C03183\",\"connector_id\":1,\"limit\":60}'" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Check images in TEST bucket:" -ForegroundColor White
Write-Host "   aws s3 ls s3://$TEST_BUCKET/battery-reports/ --recursive" -ForegroundColor Gray
Write-Host ""
Write-Host "5. View logs:" -ForegroundColor White
Write-Host "   aws logs tail /ecs/battery-ml-test --follow" -ForegroundColor Gray
Write-Host ""
Write-Host "⚠️  Remember: This is TEST environment" -ForegroundColor Yellow
Write-Host "   Your live website is NOT affected" -ForegroundColor Green
Write-Host "   When ready, see SAFE_DEPLOYMENT_GUIDE.md for production migration" -ForegroundColor Cyan
Write-Host ""
