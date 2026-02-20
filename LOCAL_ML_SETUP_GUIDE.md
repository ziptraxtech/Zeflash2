# Local ML Testing Setup - Complete Guide

## What I've Set Up ✅

You now have a complete **local development environment** for testing your updated ML model before deploying to AWS. Here's what was created:

### Backend Files (battery-ml-lambda/)

1. **`local-config.py`** - Configuration management
   - Switches between local and AWS resources
   - Configurable model paths, storage, and database

2. **`app_dev.py`** - Development FastAPI application
   - CORS enabled for frontend requests
   - Local file storage for reports (instead of S3)
   - Same API as production (`/generate-report`, `/health`, `/config`)

3. **`inference_dev.py`** - Development inference engine
   - Supports both local JSON data and DynamoDB
   - Auto-detects and uses available features
   - Full logging for debugging

4. **`local_data.json`** - Sample test data
   - Pre-populated with battery telemetry for `device4`
   - Format matches your ML pipeline

5. **`requirements-dev.txt`** - Python dependencies
   - All needed packages for local development
   - Includes: FastAPI, TensorFlow, Pandas, etc.

6. **`start-dev-server.ps1`** (Windows)
   - Automated startup script
   - Sets environment variables
   - Validates dependencies
   - Starts development server

7. **`start-dev-server.sh`** (Linux/macOS)
   - Same functionality as PowerShell version

8. **`verify-setup.py`** - Setup validation
   - Checks all files are in place
   - Validates Python dependencies
   - Verifies model files exist

### Frontend Files (zeflash-new/)

1. **`api/ml-proxy.js`** - Updated ML proxy
   - Auto-detects development vs production mode
   - Automatically uses `http://localhost:8000` when in dev mode
   - Falls back to AWS load balancer in production

2. **`.env.local.example`** - Frontend environment template
   - Configure ML backend URL
   - Enable debug logging

3. **`LOCAL_TESTING_GUIDE.md`** - Complete testing documentation
   - Step-by-step setup instructions
   - API endpoint reference
   - Troubleshooting guide
   - Testing workflows

---

## Quick Start (5 Minutes) 🚀

### Terminal 1 - Start the ML Backend

```bash
# Navigate to ML backend directory
cd battery-ml-lambda

# Activate Python environment (Windows)
.\.venv\Scripts\Activate.ps1

# Or Linux/macOS
source .venv/bin/activate

# Install dependencies (first time only)
pip install -r requirements-dev.txt

# Verify setup
python verify-setup.py

# Start development server
# Windows:
.\start-dev-server.ps1

# Linux/macOS:
bash start-dev-server.sh
```

Expected output:
```
📋 Environment Configuration:
   ENV: development
   USE_LOCAL_DATA: true
   USE_LOCAL_STORAGE: true
🌐 Starting server on http://localhost:8000
```

### Terminal 2 - Start the Frontend

```bash
# Navigate to frontend directory
cd zeflash-new

# Create environment file (first time only)
cp .env.local.example .env.local

# Install dependencies (first time only)
npm install

# Start development server
npm run dev
```

Expected output:
```
✓ built in 450ms

➜  Local:   http://localhost:5173/
```

### Terminal 3 - Test the Integration (Optional)

```bash
# Test backend health
curl http://localhost:8000/health

# Generate a report
curl -X POST http://localhost:8000/generate-report \
  -H "Content-Type: application/json" \
  -d '{"device_id":"device4"}'

# View configuration
curl http://localhost:8000/config
```

---

## Key Features 🎯

### 1. **No AWS Credentials Needed**
   - Local JSON data instead of DynamoDB
   - Local file storage instead of S3
   - No AWS SDK calls required

### 2. **Hot Reload Development**
   - Backend: `uvicorn --reload` watches for changes
   - Frontend: Vite HMR updates instantly
   - No server restarts needed for small changes

### 3. **Intelligent Environment Switching**
   - Automatically detects dev vs production
   - Frontend proxy auto-configures to localhost in dev mode
   - Seamless transition to production deployment

### 4. **Comprehensive Logging**
   - Backend logs all ML operations
   - Frontend logs all API calls
   - Browser DevTools for full request debugging

### 5. **Full API Documentation**
   - OpenAPI/Swagger UI at `http://localhost:8000/docs`
   - Interactive API testing
   - Schema validation

---

## Directory Structure 📁

```
Zipbolt/zeflash-new/
├── battery-ml-lambda/
│   ├── models/                    # Your ML models
│   │   ├── autoencoder_converted.h5
│   │   ├── scaler.pkl
│   │   ├── isolation_forest.pkl
│   │   ├── config.json
│   │   └── feature_names.json
│   │
│   ├── local_reports/            # Local report storage (auto-created)
│   │   └── device4/
│   │       └── 20260209T123456Z.png
│   │
│   ├── # Development files
│   ├── app_dev.py                # Development app
│   ├── inference_dev.py          # Development inference
│   ├── local-config.py           # Configuration
│   ├── local_data.json           # Test data
│   ├── verify-setup.py           # Validation script
│   ├── start-dev-server.ps1      # Windows startup
│   ├── start-dev-server.sh       # Linux/macOS startup
│   └── requirements-dev.txt      # Dependencies
│
├── api/
│   └── ml-proxy.js               # Updated: auto-detects localhost
│
├── .env.local.example            # Frontend env template
├── .env.local                    # Frontend env (create from example)
├── LOCAL_TESTING_GUIDE.md        # Detailed testing guide
└── ...
```

---

## Testing Your Model 🧪

### Step 1: Prepare Test Data

Edit `battery-ml-lambda/local_data.json`:
- Add your test device IDs
- Include all features required by your models
- Use realistic battery telemetry values

### Step 2: Generate a Report

**Via API:**
```bash
curl -X POST http://localhost:8000/generate-report \
  -H "Content-Type: application/json" \
  -d '{"device_id":"device4"}'
```

**Via Frontend:**
1. Open http://localhost:5173
2. Navigate to Battery Reports section
3. Click "Generate Report"

### Step 3: Check Output

**Reports stored at:**
```
battery-ml-lambda/local_reports/device4/20260209T123456Z.png
```

**API Response:**
```json
{
  "device_id": "device4",
  "status": "Stable",
  "anomalies": {"critical": 0, "high": 2, "medium": 0, "low": 8},
  "generated_at": "2026-02-09T12:34:56.789123+00:00",
  "image_url": "http://localhost:8000/reports/device4/20260209T123456Z.png"
}
```

---

## Configuration 🔧

### Backend Environment Variables

Edit `battery-ml-lambda/local-config.py`:

```python
# Development (local testing)
ENV = "development"
USE_LOCAL_DATA = True          # Use local_data.json
USE_LOCAL_STORAGE = True       # Store reports locally
HOST = "0.0.0.0"
PORT = 8000
DEBUG = True

# Production (AWS deployment)
ENV = "production"
USE_LOCAL_DATA = False         # Use DynamoDB
USE_LOCAL_STORAGE = False      # Use S3
RESULTS_BUCKET = "your-bucket"
```

### Frontend Environment File

Create/edit `zeflash-new/.env.local`:

```env
# Auto-detect (recommended)
VITE_ML_BACKEND_URL=auto

# Or specify explicitly
VITE_ML_BACKEND_URL=http://localhost:8000

# Enable debug logging
VITE_DEBUG=true
```

---

## Common Workflows 📋

### Testing a New Model Version

1. Replace model files in `battery-ml-lambda/models/`
2. Restart backend server (if not hot-reloading)
3. Generate report via API or UI
4. Check results in local reports directory

### Debugging Inference Issues

1. Check backend logs for detailed error messages
2. Use http://localhost:8000/docs to inspect data
3. Add print statements to `inference_dev.py`
4. View reports in `battery-ml-lambda/local_reports/`

### Testing Frontend Integration

1. Check browser DevTools (F12) > Network tab
2. Verify requests go to `http://localhost:8000`
3. Check console for proxy initialization logs
4. Inspect response data in Network tab

---

## Troubleshooting 🔧

### Backend Won't Start

```
❌ Error: No module named 'tensorflow'
```

**Solution:**
```bash
pip install -r requirements-dev.txt
```

### Models Not Found

```
❌ FileNotFoundError: Autoencoder not found at models/autoencoder_converted.h5
```

**Solution:**
1. Ensure models are in `battery-ml-lambda/models/`
2. Check file names exactly match those referenced
3. Copy from S3 if needed

### Frontend Can't Connect to Backend

```
❌ Error: Cannot reach http://localhost:8000
```

**Solutions:**
1. Verify backend is running: `curl http://localhost:8000/health`
2. Check port 8000 is free
3. Verify `.env.local` has `VITE_ML_BACKEND_URL=auto`

### Reports Not Appearing

**Solutions:**
1. Check `local_data.json` has correct device ID
2. Verify features in test data match `feature_names.json`
3. Check file permissions on `battery-ml-lambda/local_reports/`

---

## Next Steps 🎯

✅ **Local Testing (You are here)**
- Test model output on localhost
- Verify inference pipeline
- Debug any issues

→ **Prepare for Production**
- Update models if needed
- Test with production data (if available)
- Prepare AWS credentials

→ **Deploy to AWS**
- Follow `RELEASE_BUILD_GUIDE.md`
- Set environment variables for production
- Deploy backend to Lambda/ECS
- Update frontend to point to AWS ALB

→ **Monitor Production**
- Check CloudWatch logs
- Monitor model accuracy
- Set up alerts for anomalies

---

## Files Reference 📚

| File | Purpose |
|------|---------|
| `app_dev.py` | Main FastAPI server |
| `inference_dev.py` | ML inference logic |
| `local-config.py` | Configuration management |
| `local_data.json` | Test battery data |
| `verify-setup.py` | Setup validation script |
| `start-dev-server.ps1` | Windows startup script |
| `start-dev-server.sh` | Linux/macOS startup script |
| `requirements-dev.txt` | Python dependencies |
| `api/ml-proxy.js` | Frontend API proxy (updated) |
| `.env.local.example` | Frontend env template |
| `LOCAL_TESTING_GUIDE.md` | Detailed testing guide |

---

## Support & Documentation 📖

- **Detailed Guide**: See `LOCAL_TESTING_GUIDE.md`
- **API Docs**: http://localhost:8000/docs (Swagger UI)
- **OpenAPI Schema**: http://localhost:8000/openapi.json
- **Backend Logs**: Terminal where dev server runs
- **Frontend Logs**: Browser DevTools Console (F12)

---

## Tips & Best Practices 💡

1. **Keep terminals organized:**
   - Terminal 1: Backend (port 8000)
   - Terminal 2: Frontend (port 5173)
   - Terminal 3: Testing commands

2. **Monitor both logs:**
   - Backend errors appear in Terminal 1
   - Frontend errors in browser console

3. **Test edge cases:**
   - Empty data
   - Missing features
   - Invalid device IDs
   - Extreme values

4. **Use Swagger UI:**
   - Test API endpoints without curl
   - View request/response schemas
   - Generate curl commands

5. **Commit your progress:**
   - Test data changes
   - Configuration updates
   - Bug fixes

---

**Ready to test your model? Start with the Quick Start section above! 🚀**

