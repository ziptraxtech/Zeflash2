#!/bin/bash

# Local Development Server Startup Script (Linux/macOS)

echo "🚀 Starting Battery ML Local Development Server..."
echo ""

# Set environment variables for local development
export ENV="development"
export USE_LOCAL_DATA="true"
export USE_LOCAL_STORAGE="true"
export HOST="0.0.0.0"
export PORT="8000"

echo "📋 Environment Configuration:"
echo "   ENV: $ENV"
echo "   USE_LOCAL_DATA: $USE_LOCAL_DATA"
echo "   USE_LOCAL_STORAGE: $USE_LOCAL_STORAGE"
echo "   HOST: $HOST"
echo "   PORT: $PORT"
echo ""

# Check if required Python packages are installed
echo "✅ Checking dependencies..."
for package in fastapi uvicorn tensorflow pandas joblib matplotlib; do
    if python3 -c "import $package" 2>/dev/null; then
        echo "   ✓ $package"
    else
        echo "   ✗ $package (missing)"
    fi
done
echo ""

# Create local directories if they don't exist
mkdir -p "local_reports"
echo "📁 Local reports directory ready: ./local_reports"
echo ""

echo "🌐 Starting server on http://localhost:8000"
echo "📊 API docs will be available at http://localhost:8000/docs"
echo "🏥 Health check: http://localhost:8000/health"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Start the development server
python3 -m uvicorn app_dev:app --host 0.0.0.0 --port 8000 --reload
