# Local Development Server Startup Script
# This sets up environment variables and starts the FastAPI development server

Write-Host "🚀 Starting Battery ML Local Development Server..." -ForegroundColor Green
Write-Host ""

# Set environment variables for local development
$env:ENV = "development"
$env:USE_LOCAL_DATA = "true"
$env:USE_LOCAL_STORAGE = "true"
$env:HOST = "0.0.0.0"
$env:PORT = "8000"

Write-Host "📋 Environment Configuration:" -ForegroundColor Cyan
Write-Host "   ENV: $($env:ENV)"
Write-Host "   USE_LOCAL_DATA: $($env:USE_LOCAL_DATA)"
Write-Host "   USE_LOCAL_STORAGE: $($env:USE_LOCAL_STORAGE)"
Write-Host "   HOST: $($env:HOST)"
Write-Host "   PORT: $($env:PORT)"
Write-Host ""

# Check if required Python packages are installed
Write-Host "✅ Checking dependencies..." -ForegroundColor Cyan
$requiredPackages = @("fastapi", "uvicorn", "tensorflow", "pandas", "joblib", "matplotlib")
foreach ($package in $requiredPackages) {
    try {
        python -c "import $package" 2>$null
        Write-Host "   ✓ $package" -ForegroundColor Green
    } catch {
        Write-Host "   ✗ $package (missing)" -ForegroundColor Red
    }
}
Write-Host ""

# Create local directories if they don't exist
$localReportsDir = Join-Path (Get-Location) "local_reports"
if (-not (Test-Path $localReportsDir)) {
    New-Item -ItemType Directory -Path $localReportsDir -Force | Out-Null
    Write-Host "📁 Created local reports directory: $localReportsDir" -ForegroundColor Green
}

Write-Host ""
Write-Host "🌐 Starting server on http://localhost:8000" -ForegroundColor Green
Write-Host "📊 API docs will be available at http://localhost:8000/docs" -ForegroundColor Green
Write-Host "🏥 Health check: http://localhost:8000/health" -ForegroundColor Green
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

# Start the development server
python -m uvicorn app_dev:app --host 0.0.0.0 --port 8000 --reload
