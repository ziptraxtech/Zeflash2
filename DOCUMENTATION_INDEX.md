# 📖 Local ML Testing - Documentation Index

## 🎯 Start Here

**New to this setup?** Start with **`LOCAL_TESTING_SUMMARY.md`**
- 5-minute overview
- Quick start instructions  
- What was created

---

## 📚 Documentation Guide

### For Getting Started (Pick One)

| Document | Best For | Time |
|----------|---------|------|
| **LOCAL_TESTING_SUMMARY.md** | Overview of entire setup | 5 min |
| **LOCAL_QUICK_START.md** | Quick checklist for each session | 2 min |
| **LOCAL_ML_SETUP_GUIDE.md** | Comprehensive setup guide | 15 min |

### For Detailed Information

| Document | Purpose | Use When |
|----------|---------|----------|
| **LOCAL_TESTING_GUIDE.md** | Complete testing reference | Need detailed info or troubleshooting |
| **DEPLOYMENT_CHECKLIST.md** | Production deployment guide | Ready to deploy to AWS |

### For Automation

| Script | Purpose | Run With |
|--------|---------|----------|
| **verify-setup.py** | Validates environment | `python verify-setup.py` |
| **test-integration.py** | Tests full pipeline | `python test-integration.py` |
| **start-dev-server.ps1** | Starts backend (Windows) | `.\start-dev-server.ps1` |
| **start-dev-server.sh** | Starts backend (Linux/macOS) | `bash start-dev-server.sh` |

---

## 📍 File Locations

### Where Everything Is

```
Zipbolt/
└── zeflash-new/
    ├── battery-ml-lambda/           # ML Backend
    │   ├── app_dev.py               # 🆕 Development FastAPI server
    │   ├── inference_dev.py         # 🆕 Development inference engine
    │   ├── local-config.py          # 🆕 Configuration management
    │   ├── local_data.json          # 🆕 Test data (sample)
    │   ├── models/                  # Your ML models (must provide)
    │   │   ├── autoencoder_converted.h5
    │   │   ├── scaler.pkl
    │   │   ├── isolation_forest.pkl
    │   │   ├── config.json
    │   │   └── feature_names.json
    │   ├── local_reports/           # 🆕 Auto-created (local reports)
    │   ├── requirements-dev.txt     # 🆕 Development dependencies
    │   ├── start-dev-server.ps1     # 🆕 Windows startup script
    │   ├── start-dev-server.sh      # 🆕 Linux/macOS startup script
    │   ├── verify-setup.py          # 🆕 Setup validation
    │   └── test-integration.py      # 🆕 Integration tests
    │
    ├── api/
    │   └── ml-proxy.js              # 🔄 Updated (auto-detects localhost)
    │
    ├── .env.local.example           # 🆕 Frontend env template
    ├── .env.local                   # Setup: copy from .env.local.example
    │
    ├── 📖 LOCAL_TESTING_SUMMARY.md        # Start here!
    ├── 📖 LOCAL_QUICK_START.md            # Quick reference
    ├── 📖 LOCAL_ML_SETUP_GUIDE.md         # Comprehensive guide
    ├── 📖 LOCAL_TESTING_GUIDE.md          # Detailed + troubleshooting
    └── 📖 DEPLOYMENT_CHECKLIST.md         # For AWS deployment
```

Legend: 🆕 = New file | 🔄 = Updated file | 📖 = Documentation

---

## 🚀 Typical Workflow

### First Time Setup (30 minutes)
1. Read → `LOCAL_TESTING_SUMMARY.md`
2. Read → `LOCAL_QUICK_START.md`  
3. Run → `python verify-setup.py`
4. Run → Start servers (`start-dev-server`)
5. Run → `python test-integration.py`

### Daily Development (5 minutes)
1. Check → `LOCAL_QUICK_START.md` (checklist)
2. Run → Start servers
3. Test in browser: `http://localhost:5173`

### Troubleshooting (10-20 minutes)
1. Check → `LOCAL_TESTING_GUIDE.md` (Troubleshooting section)
2. Run → `python verify-setup.py`
3. Check → Backend logs (Terminal 1)
4. Check → Frontend logs (Browser F12)

### Deploying to AWS (varies)
1. Read → `DEPLOYMENT_CHECKLIST.md`
2. Follow → Pre-deployment checklist
3. Follow → Configuration migration steps
4. Follow → Deployment steps

---

## 📋 Quick Reference Commands

### Setup
```bash
# One time
pip install -r battery-ml-lambda/requirements-dev.txt

# Verify
python battery-ml-lambda/verify-setup.py
```

### Running
```bash
# Terminal 1 - Backend
cd battery-ml-lambda
.\start-dev-server.ps1          # Windows
bash start-dev-server.sh        # Mac/Linux

# Terminal 2 - Frontend  
npm run dev

# Terminal 3 - Testing
python battery-ml-lambda/test-integration.py
```

### Testing
```bash
# API health check
curl http://localhost:8000/health

# Generate report
curl -X POST http://localhost:8000/generate-report \
  -H "Content-Type: application/json" \
  -d '{"device_id":"device4"}'

# Show config
curl http://localhost:8000/config
```

### API Docs
- **Swagger UI**: http://localhost:8000/docs
- **OpenAPI Schema**: http://localhost:8000/openapi.json

---

## 🆘 Troubleshooting Quick Links

### Backend Issues
- **"pip: command not found"** 
  → Activate venv first or use `python -m pip`
  
- **"No module named 'tensorflow'"**
  → Run: `pip install -r requirements-dev.txt`
  
- **"port 8000 already in use"**
  → Kill process or use different port in `local-config.py`
  
- **"Models not found"**
  → Ensure all 5 files in `models/` directory
  → See: `LOCAL_TESTING_GUIDE.md` → Troubleshooting

### Frontend Issues
- **"Cannot reach http://localhost:8000"**
  → Backend not running? Start it first
  → Check `.env.local` has `VITE_ML_BACKEND_URL=auto`
  
- **"npm: command not found"**
  → Install Node.js (https://nodejs.org)
  
- **"Module not found"**
  → Run: `npm install`

### Data Issues
- **"No valid features found"**
  → `local_data.json` missing required fields
  → Check: `models/feature_names.json`
  
- **"No Data" response**
  → Update `local_data.json` with test data
  → Or configure to use DynamoDB

See **`LOCAL_TESTING_GUIDE.md`** Section: Troubleshooting (detailed help)

---

## 📊 Success Indicators

✅ **When setup is complete, you should see:**

Terminal 1 (Backend):
```
✅ Loading models...
✅ Models loaded successfully
🌐 Starting server on http://0.0.0.0:8000
```

Terminal 2 (Frontend):
```
✓ built in 450ms
➜  Local:   http://localhost:5173/
```

Terminal 3 (Test):
```
✅ All tests passed!
Results: 6/6 tests passed
```

Browser:
```
http://localhost:5173 loads successfully
Reports generate and display correctly
```

---

## 🎓 Learning Path

### Complete Beginner
1. **Start**: Read `LOCAL_TESTING_SUMMARY.md` (overview)
2. **Quick Reference**: Use `LOCAL_QUICK_START.md` (checklist)
3. **Execute**: Follow Quick Start commands
4. **Test**: Open browser and test UI

### Intermediate (understand setup)
1. **Architecture**: Read `LOCAL_ML_SETUP_GUIDE.md` (detailed setup)
2. **Configuration**: Understand `local-config.py` options
3. **Testing**: Use `test-integration.py` to validate
4. **Modification**: Update `local_data.json` with your data

### Advanced (customization)
1. **Modify**: Edit `app_dev.py` and `inference_dev.py`
2. **Debug**: Add logging and breakpoints
3. **Extend**: Add new endpoints or features
4. **Deploy**: Follow `DEPLOYMENT_CHECKLIST.md`

---

## 💾 Key Directories

| Dir | Purpose | Can Edit? |
|-----|---------|----------|
| `models/` | ML model files | Use your updated models |
| `local_data.json` | Test data | Add your test cases |
| `local_reports/` | Generated reports | Read results here |
| `.venv/` | Python environment | Don't touch |
| `node_modules/` | JS dependencies | Don't touch |
| `dist/` | Frontend build | Auto-generated |

---

## ⚙️ Configuration Options

### Backend (`local-config.py`)
- `ENV`: "development" or "production"
- `USE_LOCAL_DATA`: true/false (use JSON or DynamoDB)
- `USE_LOCAL_STORAGE`: true/false (local reports or S3)
- `MODEL_DIR`: "models" (where to find ML files)
- `HOST`: "0.0.0.0" (server bind address)
- `PORT`: 8000 (server port)

### Frontend (`.env.local`)
- `VITE_ML_BACKEND_URL`: "auto" or explicit URL
- `VITE_DEBUG`: "true" or "false"

---

## 📞 Need Help?

### Debugging Process

1. **Read relevant guide**
   - General: `LOCAL_TESTING_GUIDE.md`
   - Specific issue: Troubleshooting section

2. **Run verification**
   ```bash
   python verify-setup.py
   python test-integration.py
   ```

3. **Check logs**
   - Backend: Terminal 1 output
   - Frontend: Browser DevTools (F12)

4. **Search documentation**
   - Ctrl+F in markdown files
   - Look for your error message

5. **Refer to examples**
   - API examples in `LOCAL_TESTING_GUIDE.md`
   - Sample data in `local_data.json`

---

## 🎯 Next Action

**Ready to get started?**

👉 **Open and read: `LOCAL_TESTING_SUMMARY.md`**

It has everything you need to begin in 5 minutes!

---

## 📋 Documentation Checklist

- [x] Setup guides created
- [x] Quick start checklist created
- [x] Troubleshooting guide created
- [x] Deployment guide created
- [x] Automation scripts created
- [x] This index created

**All documentation is complete! You're ready to test your model locally. 🚀**

