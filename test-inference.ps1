# Test Script: Trigger Inference and Check Database

Write-Host "🚀 Starting Inference Test" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green

# Test data
$evseId = "FLX_HDCHIN22"
$connectorId = 1
$limit = 100

Write-Host "`n📡 Step 1: Triggering Inference..." -ForegroundColor Cyan
Write-Host "  EVSE ID: $evseId"
Write-Host "  Connector: $connectorId"
Write-Host "  Limit: $limit"

$inferenceUrl = "http://battery-ml-alb-1652817744.us-east-1.elb.amazonaws.com/api/v1/inference/trigger"
$payload = @{
    evse_id = $evseId
    connector_id = $connectorId
    limit = $limit
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri $inferenceUrl -Method POST -ContentType "application/json" -Body $payload -UseBasicParsing
    $result = $response.Content | ConvertFrom-Json
    $jobId = $result.job_id
    Write-Host "✅ Inference triggered successfully" -ForegroundColor Green
    Write-Host "   Job ID: $jobId" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to trigger inference: $_" -ForegroundColor Red
    exit 1
}

Write-Host "`n⏳ Step 2: Polling Job Status..." -ForegroundColor Cyan
$maxAttempts = 60  # 2 minutes
$attempt = 0
$statusUrl = "http://battery-ml-alb-1652817744.us-east-1.elb.amazonaws.com/api/v1/inference/status/$jobId"

while ($attempt -lt $maxAttempts) {
    Start-Sleep -Seconds 2
    $attempt++
    
    try {
        $statusResponse = Invoke-WebRequest -Uri $statusUrl -UseBasicParsing
        $status = $statusResponse.Content | ConvertFrom-Json
        
        Write-Host "   Attempt $attempt - Status: $($status.status) - Progress: $($status.progress)%" -ForegroundColor Yellow
        
        if ($status.status -eq "completed") {
            Write-Host "✅ Inference completed!" -ForegroundColor Green
            break
        } elseif ($status.status -eq "failed") {
            Write-Host "❌ Inference failed: $($status.message)" -ForegroundColor Red
            exit 1
        }
    } catch {
        Write-Host "   Polling... (attempt $attempt)" -ForegroundColor Gray
    }
}

Write-Host "`n💾 Step 3: Checking Neon Database..." -ForegroundColor Cyan
Start-Sleep -Seconds 2

$deviceId = "${evseId}_${connectorId}"
$dbUrl = "http://localhost:3001/api/inference/results/$deviceId"

try {
    $dbResponse = Invoke-WebRequest -Uri $dbUrl -UseBasicParsing
    $dbData = $dbResponse.Content | ConvertFrom-Json
    
    if ($dbResponse.StatusCode -eq 200 -and $dbData.data) {
        Write-Host "✅ Data found in database!" -ForegroundColor Green
        Write-Host "   Device ID: $($dbData.data.deviceId)" -ForegroundColor Green
        Write-Host "   Status: $($dbData.data.status)" -ForegroundColor Green
        Write-Host "   S3 URL: $($dbData.data.s3Url)" -ForegroundColor Green
        Write-Host "   Created: $($dbData.data.createdAt)" -ForegroundColor Green
        Write-Host "`n✅ FULL TEST PASSED - Data successfully stored!" -ForegroundColor Green
    } else {
        Write-Host "⚠️  No data found in database yet" -ForegroundColor Yellow
        Write-Host "   Response: $($dbResponse.Content)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Error querying database: $_" -ForegroundColor Red
}

Write-Host "`n📁 Step 4: Checking Local Report Files..." -ForegroundColor Cyan
$reportsDir = "d:\zeflash copy\Zipbolt\zeflash-new\battery-ml-lambda\reports\${deviceId}"
if (Test-Path $reportsDir) {
    $files = Get-ChildItem $reportsDir
    Write-Host "✅ Report files found:" -ForegroundColor Green
    foreach ($file in $files) {
        Write-Host "   - $($file.Name) ($($file.Length) bytes)" -ForegroundColor Green
    }
} else {
    Write-Host "⚠️  No local report files found at $reportsDir" -ForegroundColor Yellow
}

Write-Host "`n======================================" -ForegroundColor Green
Write-Host "✅ Test Complete!" -ForegroundColor Green
