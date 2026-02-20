# 📊 Visual Architecture Guide

## System Architecture (Local Testing)

```
┌─────────────────────────────────────────────────────────────┐
│                     Developer Machine                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Browser (http://localhost:5173)                            │
│  ┌──────────────────────────────┐                          │
│  │  React App (Vite)            │                          │
│  │  - Battery Reports Component │                          │
│  │  - Report Display            │                          │
│  └──────────────────────────────┘                          │
│           ↓                                                 │
│  ┌──────────────────────────────┐                          │
│  │  ml-proxy.js                 │                          │
│  │  (Auto-detects localhost)    │                          │
│  └──────────────────────────────┘                          │
│           ↓                                                 │
│  ┌──────────────────────────────┐                          │
│  │  FastAPI Server (port 8000)  │                          │
│  │  app_dev.py                  │                          │
│  │  - /generate-report          │                          │
│  │  - /health                   │                          │
│  │  - /config                   │                          │
│  │  - /reports/{id}/{file}      │                          │
│  └──────────────────────────────┘                          │
│           ↓                                                 │
│  ┌──────────────────────────────┐                          │
│  │  Inference Engine            │                          │
│  │  inference_dev.py            │                          │
│  │  - Load models               │                          │
│  │  - Fetch data                │                          │
│  │  - Run inference             │                          │
│  └──────────────────────────────┘                          │
│           ↓                                                 │
│  ┌──────────────────────────────────────┐                  │
│  │  Models & Data                       │                  │
│  │  ├─ models/                          │                  │
│  │  │  ├─ autoencoder_converted.h5      │                  │
│  │  │  ├─ scaler.pkl                    │                  │
│  │  │  ├─ isolation_forest.pkl          │                  │
│  │  │  ├─ config.json                   │                  │
│  │  │  └─ feature_names.json            │                  │
│  │  ├─ local_data.json (test data)      │                  │
│  │  └─ local_reports/ (generated)       │                  │
│  └──────────────────────────────────────┘                  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow

```
User Request (Browser)
    ↓
Frontend (React)
    ↓ POST /generate-report
ml-proxy.js (localhost:8000)
    ↓
FastAPI Backend
    ↓
Load ML Models (TensorFlow, Joblib)
    ↓
Read Test Data (local_data.json)
    ↓
Feature Extraction & Normalization
    ↓
Autoencoder Reconstruction Error
    ↓
Isolation Forest Anomaly Detection
    ↓
Generate Bar Chart (matplotlib)
    ↓
Save PNG (local_reports/)
    ↓ HTTP Response
Browser displays report
    ↓
✅ Done!
```

## File Dependency Tree

```
zeflash-new/
├── 📌 Key Files (Must Exist)
│   ├── package.json (dependencies)
│   ├── vite.config.ts
│   ├── index.html
│   └── .env.local (created from .env.local.example)
│
├── 🆕 API Files (New/Updated)
│   └── api/
│       └── ml-proxy.js ← Automatically detects localhost:8000
│
├── src/
│   ├── components/
│   │   ├── BatteryReport.tsx → calls ml-proxy
│   │   └── ChargingStations.tsx → calls ml-proxy
│   └── ... (other components)
│
├── battery-ml-lambda/ ← Backend (Python)
│   │
│   ├── 🆕 app_dev.py              ← Main development app
│   │   ├── imports: inference_dev
│   │   ├── imports: local_config
│   │   └── endpoints: /generate-report, /health, /config
│   │
│   ├── 🆕 inference_dev.py        ← ML logic
│   │   ├── imports: tensorflow, joblib, pandas
│   │   ├── loads: models/*
│   │   ├── fetches: local_data.json
│   │   └── runs: inference pipeline
│   │
│   ├── 🆕 local-config.py         ← Configuration
│   │   ├── ENV settings
│   │   ├── Path management
│   │   └── Feature flags
│   │
│   ├── 🆕 local_data.json         ← Test data
│   │   ├── device4: [records...]
│   │   └── matches: models/feature_names.json
│   │
│   ├── 📂 models/                 ← ML Models (YOU provide)
│   │   ├── autoencoder_converted.h5 ← Must exist!
│   │   ├── scaler.pkl             ← Must exist!
│   │   ├── isolation_forest.pkl   ← Must exist!
│   │   ├── config.json            ← Must exist!
│   │   └── feature_names.json     ← Must exist!
│   │
│   ├── 📂 local_reports/          ← Generated reports (auto-created)
│   │   └── device4/
│   │       └── 20260209T123456Z.png
│   │
│   ├── 🆕 start-dev-server.ps1    ← Windows startup
│   │   └── runs: uvicorn app_dev:app --reload
│   │
│   ├── 🆕 start-dev-server.sh     ← Linux/macOS startup
│   │   └── runs: uvicorn app_dev:app --reload
│   │
│   ├── 🆕 verify-setup.py         ← Setup validation
│   │   ├── checks: models exist
│   │   ├── checks: dependencies installed
│   │   └── validates: configuration
│   │
│   ├── 🆕 test-integration.py     ← End-to-end testing
│   │   ├── tests: backend health
│   │   ├── tests: inference
│   │   ├── tests: storage
│   │   └── tests: frontend connectivity
│   │
│   └── 🆕 requirements-dev.txt    ← Python dependencies
│       ├── fastapi==0.104.1
│       ├── tensorflow<=2.14.0
│       ├── pandas==2.0.3
│       └── ... (all ML dependencies)
│
├── 📖 Documentation Files
│   ├── README_LOCAL_TESTING.md         ← Start here! 👈
│   ├── DOCUMENTATION_INDEX.md          ← File guide
│   ├── LOCAL_TESTING_SUMMARY.md        ← 5-min overview
│   ├── LOCAL_QUICK_START.md            ← Checklist
│   ├── LOCAL_ML_SETUP_GUIDE.md         ← Comprehensive
│   ├── LOCAL_TESTING_GUIDE.md          ← Detailed + Help
│   └── DEPLOYMENT_CHECKLIST.md         ← For AWS
│
└── 📂 .venv/                      ← Python Virtual Environment
    └── Scripts/, Lib/, etc.
```

## Configuration Layers

```
┌─────────────────────────────────────────────────┐
│    Environment Detection                        │
├─────────────────────────────────────────────────┤
│                                                 │
│  If VITE_DEV = true (development build)         │
│    → ml-proxy.js uses http://localhost:8000    │
│                                                 │
│  If VITE_DEV = false (production build)         │
│    → ml-proxy.js uses AWS load balancer URL    │
│                                                 │
└─────────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────────┐
│    Backend Configuration (.env variables)       │
├─────────────────────────────────────────────────┤
│                                                 │
│  Development (local-config.py):                 │
│    ENV="development"                            │
│    USE_LOCAL_DATA=true    → local_data.json    │
│    USE_LOCAL_STORAGE=true → local_reports/    │
│                                                 │
│  Production (set ENV="production"):             │
│    USE_LOCAL_DATA=false   → DynamoDB           │
│    USE_LOCAL_STORAGE=false → S3 bucket         │
│                                                 │
└─────────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────────┐
│    App Initialization                           │
├─────────────────────────────────────────────────┤
│                                                 │
│  Read config → Create directories               │
│           → Load models → Ready to serve        │
│                                                 │
└─────────────────────────────────────────────────┘
```

## Execution Timeline

```
Session Start:
├─ Terminal 1: start-dev-server
│  ├─ Activate Python environment
│  ├─ Load local-config.py
│  ├─ Create local_reports/ directory
│  ├─ Load models (print progress)
│  └─ Start uvicorn on port 8000
│     └─ Ready for requests ✅
│
├─ Terminal 2: npm run dev
│  ├─ Build React app
│  ├─ Load Vite dev server
│  ├─ Load ml-proxy.js
│  │  └─ Detect DEV=true → localhost:8000
│  └─ Start on port 5173
│     └─ Ready for browser ✅
│
└─ Browser: Open http://localhost:5173
   ├─ Load React app
   ├─ Display Battery Reports component
   └─ Ready for user interaction ✅


User Clicks "Generate Report":
├─ Frontend: POST to /api/generate-report
├─ ml-proxy.js: Route to http://localhost:8000/generate-report
├─ Backend: Receive request
├─ App.py: Call run_inference()
├─ Inference.py: Load models
├─ Models: Autoencoder + Isolation Forest
├─ Data: Read local_data.json
├─ Process: Feature scaling, Inference, Anomaly detection
├─ Generate: matplotlib bar chart
├─ Store: Save PNG to local_reports/device4/
├─ Respond: Return JSON with image URL
├─ Frontend: Display report and image
└─ User: Sees results! ✅
```

## Port Usage

```
Port 5173  ← Frontend (Vite Dev Server)
   │
   ├─ Serves React app
   ├─ Handles HMR (hot reload)
   └─ Serves static assets

Port 8000  ← Backend (FastAPI Dev Server)
   │
   ├─ /health → Backend status
   ├─ /config → Current configuration  
   ├─ /docs → Swagger UI
   ├─ /generate-report → Main endpoint
   ├─ /reports/{id}/{file} → Serve stored reports
   └─ All other requests → 404

Port 3000  ← (Optional) Production frontend
Port 80    ← (Optional) Production backend via ALB
```

## Monitoring in Development

```
Terminal 1 (Backend Logs):
2026-02-09 12:00:00,000 INFO     startup.py Starting development server
2026-02-09 12:00:00,100 INFO     app:12 ✅ Loading models...
2026-02-09 12:00:00,500 INFO     app:15 ✅ Models loaded successfully
2026-02-09 12:00:00,600 INFO     uvicorn Started server process [12345]
2026-02-09 12:00:01,000 INFO     inference 📥 Fetching data from local file...
2026-02-09 12:00:01,500 INFO     inference 🤖 Running inference...
2026-02-09 12:00:02,000 INFO     app Generated report: device4
2026-02-09 12:00:02,500 INFO     uvicorn "POST /generate-report HTTP/1.1" 200

Browser Console (Frontend Logs):
🚀 ML Backend configured: http://localhost:8000
🔄 Proxy: POST http://localhost:8000/generate-report
✅ Response status: 200
Report received: {"status": "Stable", "anomalies": {...}}
```

## This Setup Enables

```
✅ Quick Testing
   └─ No AWS setup required
   └─ Instant feedback loop
   └─ 5-minute startup

✅ Full Debugging
   └─ See all logs locally
   └─ Check file outputs
   └─ Inspect requests/responses

✅ Easy Modification
   └─ Edit test data
   └─ Change model files
   └─ Update configurations

✅ Smooth Deployment
   └─ Test exactly what ships
   └─ Same inference code
   └─ Same API contracts
   └─ Transition to AWS seamless
```

---

**Diagram Summary:**
- **Data flows** from browser → frontend → backend → models → storage → display
- **Files depend** on config → models → test data → inference
- **Ports separate** frontend (5173) from backend (8000)
- **Auto-detection** switches between local and AWS based on build mode

**Ready to test? Start with `README_LOCAL_TESTING.md`! 🚀**
