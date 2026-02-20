# Local ML Model Testing Guide

This guide explains how to test your Battery ML model locally before deploying to production on AWS.

## Overview

The local testing setup allows you to:
- ✅ Run the ML inference server on localhost (port 8000)
- ✅ Use local JSON data for testing (no DynamoDB required)
- ✅ Store reports locally (no S3 uploads)
- ✅ Test the full pipeline without AWS credentials
- ✅ Quickly iterate and develop

## Architecture

```
┌─────────────────┐
│  React Frontend │  Port 5173
│   (Vite Dev)    │
└────────┬────────┘
         │
         ↓
┌─────────────────────────────────┐
│  API Route (ml-proxy.js)        │  Detects dev mode → localhost:8000
│  - Auto-detects dev/prod        │
└────────┬────────────────────────┘
         │
         ↓
┌─────────────────────────────────┐
│  FastAPI Server (app_dev.py)    │  Port 8000
│  - Local data (JSON)            │
│  - Local storage (filesystem)   │
│  - ML inference                 │
└────────┬────────────────────────┘
         │
         ↓
┌─────────────────────────────────┐
│  Models & Data                  │
│  - inference_dev.py             │
│  - local_data.json              │
│  - /models/ (TF, joblib)        │
│  - /local_reports/              │
└─────────────────────────────────┘
```

## Quick Start

### 1. Set Up Backend (ML Server)

Navigate to the battery-ml-lambda directory:

```bash
cd Zipbolt\zeflash-new\battery-ml-lambda
```

**Activate Python environment:**

Windows:
```bash
.\.venv\Scripts\Activate.ps1
```

Linux/macOS:
```bash
source .venv/bin/activate
```

**Install dependencies:**

```bash
pip install -r requirements.txt
```

**Verify models are in place:**

```
battery-ml-lambda/
├── models/
│   ├── autoencoder_converted.h5
│   ├── scaler.pkl
│   ├── isolation_forest.pkl
│   ├── config.json
│   └── feature_names.json
```

**Start the development server:**

Windows:
```bash
.\start-dev-server.ps1
```

Linux/macOS:
```bash
bash start-dev-server.sh
```

You should see:
```
✅ Loading models...
✅ Models loaded successfully
🚀 Uvicorn running on http://0.0.0.0:8000
```

**Test the backend:**

```bash
# Health check
curl http://localhost:8000/health

# Config check
curl http://localhost:8000/config

# Generate report (POST)
curl -X POST http://localhost:8000/generate-report \
  -H "Content-Type: application/json" \
  -d '{"device_id":"device4"}'
```

### 2. Set Up Frontend (React App)

In a new terminal, navigate to the frontend:

```bash
cd Zipbolt\zeflash-new
```

**Create .env.local file:**

```bash
# Copy the example
cp .env.local.example .env.local
```

**.env.local content:**

```
VITE_ML_BACKEND_URL=auto
VITE_DEBUG=true
```

**Install dependencies:**

```bash
npm install
```

**Start the dev server:**

```bash
npm run dev
```

You should see:
```
  VITE v... ready in 123 ms

  ➜  Local:   http://localhost:5173/
  ➜  press h to show help
```

### 3. Test the Complete Flow

1. Open browser: **http://localhost:5173**
2. Navigate to Battery Reports or relevant ML-dependent page
3. Click "Generate Report"
4. Check console logs (F12) for:
   - ✅ "🚀 ML Backend configured: http://localhost:8000"
   - ✅ "🔄 Proxy: POST http://localhost:8000/generate-report"
   - ✅ "✅ Response status: 200"

5. Reports appear in the UI from local storage

---

## Configuration

### Backend Configuration (battery-ml-lambda/)

Edit `local-config.py` to customize:

```python
# Use local JSON or DynamoDB
USE_LOCAL_DATA = True  # Set to False for DynamoDB

# Store reports locally or in S3
USE_LOCAL_STORAGE = True  # Set to False for S3

# Model directory
MODEL_DIR = "models"

# Server
HOST = "0.0.0.0"
PORT = 8000
DEBUG = True
```

### Test Data (local_data.json)

Format:
```json
{
  "device4": [
    {
      "ts": 1707000000,
      "voltage": 3.8,
      "current": 2.5,
      "temperature": 25,
      "capacity": 2800,
      "cycles": 150,
      "soh": 95.2
    }
  ]
}
```

Features must match `models/feature_names.json`.

### Frontend Configuration (.env.local)

```env
# Auto-detect based on Vite dev mode
VITE_ML_BACKEND_URL=auto

# Or specify explicitly
VITE_ML_BACKEND_URL=http://localhost:8000

# Debug logging
VITE_DEBUG=true
```

---

## API Endpoints

### Health Check
```bash
GET http://localhost:8000/health
```

Response:
```json
{
  "status": "ok",
  "mode": "local",
  "environment": "development"
}
```

### Configuration
```bash
GET http://localhost:8000/config
```

Response:
```json
{
  "environment": "development",
  "use_local_storage": true,
  "use_local_data": true,
  "model_dir": "./models",
  "storage_dir": "./local_reports"
}
```

### Generate Report
```bash
POST http://localhost:8000/generate-report
Content-Type: application/json

{
  "device_id": "device4"
}
```

Response:
```json
{
  "device_id": "device4",
  "status": "Stable",
  "anomalies": {
    "critical": 0,
    "high": 2,
    "medium": 0,
    "low": 8
  },
  "generated_at": "2026-02-09T12:34:56.789123+00:00",
  "image_key": "battery-reports/device4/20260209T123456Z.png",
  "image_url": "http://localhost:8000/reports/device4/20260209T123456Z.png"
}
```

### Get Report
```bash
GET http://localhost:8000/reports/{device_id}/{filename}
```

Returns PNG report stored locally.

---

## Environment Variables

### Backend (battery-ml-lambda/)

| Variable | Default | Purpose |
|----------|---------|---------|
| `ENV` | development | Set to "production" for deployment |
| `USE_LOCAL_DATA` | true | Use local JSON data (vs DynamoDB) |
| `USE_LOCAL_STORAGE` | true | Store reports locally (vs S3) |
| `MODEL_DIR` | ./models | Path to ML models |
| `HOST` | 0.0.0.0 | Server bind address |
| `PORT` | 8000 | Server port |
| `BATTERY_TABLE_NAME` | BatteryChargingData | DynamoDB table (if USE_LOCAL_DATA=false) |
| `RESULTS_BUCKET_NAME` | battery-ml-results-... | S3 bucket (if USE_LOCAL_STORAGE=false) |

### Frontend (zeflash-new/)

| Variable | Default | Purpose |
|----------|---------|---------|
| `VITE_ML_BACKEND_URL` | auto | ML backend URL (auto=localhost in dev) |
| `VITE_DEBUG` | false | Enable debug logging |

---

## Troubleshooting

### Backend won't start

**Error: Cannot find models**
```
FileNotFoundError: Autoencoder not found at ./models/autoencoder_converted.h5
```

**Solution:**
1. Ensure models exist in `battery-ml-lambda/models/`
2. Check `local-config.py` points to correct path
3. Copy models from S3: `aws s3 cp s3://your-bucket/models ./models --recursive`

**Error: No module named 'tensorflow'**

```bash
pip install tensorflow<=2.14
pip install joblib pandas scikit-learn
```

### Frontend can't reach backend

**Error in browser console**: "Cannot reach http://localhost:8000"

**Solutions:**
1. Verify backend is running: `curl http://localhost:8000/health`
2. Check if port 8000 is in use: `netstat -an | grep 8000`
3. Verify VITE_ML_BACKEND_URL: Open DevTools > Network, check request URL
4. Check CORS: Backend should show CORS headers

### Model prediction errors

**Error: "ValueError: No valid features found"**

**Solution:**
1. Ensure `local_data.json` has all required features
2. Check `models/feature_names.json` for required fields
3. Add missing features to test data

---

## Testing Workflow

### Manual Testing

1. **Backend only:**
   ```bash
   curl -X POST http://localhost:8000/generate-report \
     -H "Content-Type: application/json" \
     -d '{"device_id":"device4"}'
   ```

2. **Full stack:**
   - Start backend (port 8000)
   - Start frontend (port 5173)
   - Click "Generate Report" in UI
   - Check browser DevTools network tab

3. **Reports:**
   - Check file system: `battery-ml-lambda/local_reports/device4/`
   - Each report is a PNG file named `{timestamp}.png`

### Automated Testing

Create a test script:

```python
# test_local.py
import requests
import json

BASE_URL = "http://localhost:8000"

# Health check
resp = requests.get(f"{BASE_URL}/health")
assert resp.status_code == 200
print("✅ Health check passed")

# Config check
resp = requests.get(f"{BASE_URL}/config")
data = resp.json()
assert data["environment"] == "development"
print("✅ Config check passed")

# Generate report
resp = requests.post(
    f"{BASE_URL}/generate-report",
    json={"device_id": "device4"}
)
assert resp.status_code == 200
report = resp.json()
assert report["status"] in ["Stable", "Degradation Detected"]
print(f"✅ Report generated: {report['status']}")

print("\n✅ All tests passed!")
```

Run:
```bash
python test_local.py
```

---

## Switching to Production

When ready to deploy to AWS:

1. **Update environment variables:**
   ```bash
   # Backend
   ENV=production
   USE_LOCAL_DATA=false
   USE_LOCAL_STORAGE=false
   BATTERY_TABLE_NAME=<your-table>
   RESULTS_BUCKET_NAME=<your-bucket>
   AWS_REGION=us-east-1
   ```

2. **Frontend:** No changes needed - ml-proxy.js auto-detects

3. **Deploy backend to AWS Lambda/ECS**

4. **Update ml-proxy.js if needed:**
   ```javascript
   VITE_ML_BACKEND_URL=https://your-aws-elb-url
   ```

---

## Next Steps

- ✅ Test locally with sample data
- ✅ Verify model predictions are correct
- ✅ Test error handling with edge cases
- ✅ Monitor backend logs during frontend testing
- ✅ Deploy to AWS following DEPLOYMENT_GUIDE.md

---

## Support

- **Backend Logs:** Check terminal output where you ran `start-dev-server`
- **Frontend Logs:** Browser DevTools Console (F12)
- **API Docs:** http://localhost:8000/docs (Swagger UI)
- **OpenAPI Schema:** http://localhost:8000/openapi.json

