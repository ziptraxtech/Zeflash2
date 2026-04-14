# Battery ML API - Deploy to ECS from Local Machine (Windows PowerShell)
# Run this from your Windows machine (C:\path\to\Zeflash3\Zeflash2)

$ErrorActionPreference = "Stop"

Write-Host "🚀 Starting Battery ML API ECS Deployment (Local - Windows)" -ForegroundColor Green
Write-Host "=============================================================" -ForegroundColor Green

# Configuration
$AWS_REGION = "us-east-1"
$REPO_NAME = "battery-ml"
$CLUSTER_NAME = "ml-cluster"
$SERVICE_NAME = "battery-ml-service-alb"
$TASK_FAMILY = "battery-ml-api"
$ECR_PATH = "battery-ml-lambda"

# Step 1: Get AWS Account ID
Write-Host ""
Write-Host "📋 Getting AWS Account ID..." -ForegroundColor Cyan
$AWS_ACCOUNT_ID = (aws sts get-caller-identity --query Account --output text)
Write-Host "✅ AWS Account ID: $AWS_ACCOUNT_ID" -ForegroundColor Green
Write-Host "✅ Region: $AWS_REGION" -ForegroundColor Green

# Step 2: Check if Docker is running
Write-Host ""
Write-Host "🐳 Checking Docker..." -ForegroundColor Cyan
try {
    docker info > $null 2>&1
    Write-Host "✅ Docker is running" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker is not running. Please start Docker Desktop." -ForegroundColor Red
    exit 1
}

# Step 3: Login to ECR
Write-Host ""
Write-Host "🔑 Logging into ECR..." -ForegroundColor Cyan
$ecr_login = aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"
Write-Host "✅ ECR login successful" -ForegroundColor Green

# Step 4: Build Docker image
Write-Host ""
Write-Host "🏗️ Building Docker image..." -ForegroundColor Cyan
Push-Location $ECR_PATH
docker build -t "$REPO_NAME:latest" .
Pop-Location
Write-Host "✅ Docker build complete" -ForegroundColor Green

# Step 5: Tag for ECR
Write-Host ""
Write-Host "🏷️ Tagging image for ECR..." -ForegroundColor Cyan
$ECR_REPO = "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$REPO_NAME"
$IMAGE_LATEST = "${ECR_REPO}:latest"
$TIMESTAMP = [int](Get-Date -UFormat %s)
$IMAGE_TIMESTAMPED = "${ECR_REPO}:${TIMESTAMP}"

docker tag "$REPO_NAME:latest" $IMAGE_LATEST
docker tag "$REPO_NAME:latest" $IMAGE_TIMESTAMPED

Write-Host "✅ Tagged: $IMAGE_LATEST" -ForegroundColor Green
Write-Host "✅ Tagged: $IMAGE_TIMESTAMPED" -ForegroundColor Green

# Step 6: Push to ECR
Write-Host ""
Write-Host "⬆️ Pushing image to ECR... (this may take 2-5 minutes)" -ForegroundColor Cyan
docker push $IMAGE_LATEST
docker push $IMAGE_TIMESTAMPED
Write-Host "✅ Image pushed to ECR" -ForegroundColor Green

# Step 7: Get image URI
$IMAGE_URI = $IMAGE_LATEST
Write-Host ""
Write-Host "📍 Image URI: $IMAGE_URI" -ForegroundColor Yellow

# Step 8: Get current task definition
Write-Host ""
Write-Host "📋 Retrieving current task definition..." -ForegroundColor Cyan
$CURRENT_TASK_DEF = (aws ecs describe-services --cluster $CLUSTER_NAME --services $SERVICE_NAME --region $AWS_REGION --query 'services[0].taskDefinition' --output text)
Write-Host "Current task definition: $CURRENT_TASK_DEF" -ForegroundColor Yellow

# Step 9: Get full task definition
aws ecs describe-task-definition --task-definition $CURRENT_TASK_DEF --region $AWS_REGION --query 'taskDefinition' | Out-File -Encoding UTF8 "$env:TEMP\task-def.json"

# Read, modify, and save
$content = Get-Content "$env:TEMP\task-def.json" | ConvertFrom-Json
$content.containerDefinitions[0].image = $IMAGE_URI

# Remove fields that can't be in the update request
$updatable_fields = @("family","networkMode","requiresCompatibilities","cpu","memory","containerDefinitions","executionRoleArn","taskRoleArn","volumes")
$updated = @{}
foreach ($field in $updatable_fields) {
    if ($content.$field) {
        $updated[$field] = $content.$field
    }
}

$updated | ConvertTo-Json -Depth 10 | Out-File -Encoding UTF8 "$env:TEMP\task-def-clean.json"

# Step 10: Register new task definition
Write-Host ""
Write-Host "📋 Registering new task definition..." -ForegroundColor Cyan
$NEW_TASK_DEF = (aws ecs register-task-definition --cli-input-json "file://$env:TEMP\task-def-clean.json" --region $AWS_REGION --query 'taskDefinition.taskDefinitionArn' --output text)
Write-Host "✅ New task definition: $NEW_TASK_DEF" -ForegroundColor Green

# Step 11: Update service
Write-Host ""
Write-Host "⚙️ Updating ECS service..." -ForegroundColor Cyan
aws ecs update-service --cluster $CLUSTER_NAME --service $SERVICE_NAME --task-definition $NEW_TASK_DEF --region $AWS_REGION | Out-Null
Write-Host "✅ ECS service update initiated" -ForegroundColor Green

# Step 12: Wait for deployment
Write-Host ""
Write-Host 'Waiting for new tasks to start (60 sec)...' -ForegroundColor Cyan
Start-Sleep -Seconds 60

# Step 13: Get service status
Write-Host ""
Write-Host "📊 Checking service status..." -ForegroundColor Cyan
aws ecs describe-services --cluster $CLUSTER_NAME --services $SERVICE_NAME --region $AWS_REGION --query 'services[0].[serviceName,status,runningCount,desiredCount]' --output table

# Step 14: Get task public IP
Write-Host ""
Write-Host "🔍 Getting ECS task details..." -ForegroundColor Cyan
$TASK_ARN = (aws ecs list-tasks --cluster $CLUSTER_NAME --service-name $SERVICE_NAME --region $AWS_REGION --query 'taskArns[0]' --output text)

if ($TASK_ARN) {
    Write-Host "Task ARN: $TASK_ARN" -ForegroundColor Yellow
    
    $task_json = aws ecs describe-tasks --cluster $CLUSTER_NAME --tasks $TASK_ARN --region $AWS_REGION | ConvertFrom-Json
    $LAST_STATUS = $task_json.tasks[0].lastStatus
    $PUBLIC_IP = $task_json.tasks[0].attachments[0].details | Where-Object { $_.name -eq "publicIp" } | Select-Object -ExpandProperty value
    
    Write-Host "Status: $LAST_STATUS" -ForegroundColor Yellow
    
    if ($PUBLIC_IP) {
        Write-Host ""
        Write-Host "✨ ML API is running!" -ForegroundColor Green
        Write-Host "=======================================" -ForegroundColor Green
        Write-Host "🌐 Public IP: $PUBLIC_IP" -ForegroundColor Cyan
        $IP8000 = "$PUBLIC_IP`:8000"
        Write-Host "📍 Health endpoint: http://$IP8000/health" -ForegroundColor Cyan
        Write-Host "📍 API docs: http://$IP8000/docs" -ForegroundColor Cyan
        Write-Host "=======================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Yellow
        Write-Host "1. SSH to EC2: ssh -i key.pem ec2-user@3.90.162.23" -ForegroundColor Yellow
        Write-Host "2. Update backend .env:" -IPColor Yellow
        Write-Host "   ML_BACKEND_URL=http://$PUBLIC_IP:8000" -ForegroundColor Yellow
        Write-Host "3. Start backend:" -ForegroundColor Yellow
        Write-Host "   cd ~/zeflash/backend" -ForegroundColor Yellow
        Write-Host "   npm start" -ForegroundColor Yellow
        Write-Host ""
    } else {
        Write-Host "⏳ Task is still starting. Check IP in a few seconds." -ForegroundColor Yellow
    }
}

# Cleanup
Remove-Item "$env:TEMP\task-def.json" -ErrorAction SilentlyContinue
Remove-Item "$env:TEMP\task-def-clean.json" -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "✅ Deployment complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Monitor logs in real-time:" -ForegroundColor Yellow
Write-Host "  aws logs tail /ecs/battery-ml-api --follow --region us-east-1" -ForegroundColor Yellow
