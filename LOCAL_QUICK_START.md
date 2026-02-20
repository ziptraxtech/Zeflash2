# Local ML Testing - Quick Reference Checklist

## 📋 Pre-Requisites

- [ ] Python 3.8+ installed
- [ ] Node.js 16+ installed  
- [ ] Git installed
- [ ] Virtual environment created (`.venv`)
- [ ] Models files in `battery-ml-lambda/models/`

## 🔧 One-Time Setup

### Backend Setup
- [ ] Navigate to `battery-ml-lambda/`
- [ ] Activate venv: `.\.venv\Scripts\Activate.ps1` (Windows) or `source .venv/bin/activate`
- [ ] Install dependencies: `pip install -r requirements-dev.txt`
- [ ] Verify setup: `python verify-setup.py`
- [ ] Test data ready in `local_data.json`

### Frontend Setup
- [ ] Navigate to `zeflash-new/`
- [ ] Create `.env.local` from `.env.local.example`
- [ ] Install dependencies: `npm install` (first time only)

## 🚀 Starting the Servers (Every Session)

### Terminal 1 - Backend
```bash
cd Zipbolt/zeflash-new/battery-ml-lambda
# Activate venv
# Windows:
.\.venv\Scripts\Activate.ps1
# Linux/macOS:
source .venv/bin/activate

# Start server
# Windows:
.\start-dev-server.ps1
# Linux/macOS:
bash start-dev-server.sh
```
✅ Wait for: "Uvicorn running on http://0.0.0.0:8000"

### Terminal 2 - Frontend
```bash
cd Zipbolt/zeflash-new
npm run dev
```
✅ Wait for: "Local: http://localhost:5173"

### Terminal 3 - Verify (Optional)
```bash
# Run integration tests
cd Zipbolt/zeflash-new/battery-ml-lambda
python test-integration.py
```
✅ Should show: "All tests passed"

## 🧪 Testing Workflows

### Quick API Test
```bash
# Health check
curl http://localhost:8000/health

# Generate report
curl -X POST http://localhost:8000/generate-report \
  -H "Content-Type: application/json" \
  -d '{"device_id":"device4"}'

# View config
curl http://localhost:8000/config
```

### Full UI Test
1. Open http://localhost:5173
2. Navigate to Battery Reports
3. Click "Generate Report"
4. Check that report appears

### API Documentation
- Visit http://localhost:8000/docs (Swagger UI)
- Test endpoints interactively

## 📊 Check Your Results

### Backend Output
- **Reports stored in**: `battery-ml-lambda/local_reports/{device_id}/`
- **Format**: PNG files with timestamp names (e.g., `20260209T123456Z.png`)

### Frontend Output
- **Report images display** in the UI
- **URLs look like**: `http://localhost:8000/reports/device4/{timestamp}.png`

### Logs
- **Backend logs**: Terminal 1 output
- **Frontend logs**: Browser DevTools Console (F12)
- **API logs**: Check http://localhost:8000/docs

## 🔧 Configuration Changes

### To Use Different Test Data
1. Edit `battery-ml-lambda/local_data.json`
2. Add device IDs and records
3. Reload backend or restart server

### To Use Your Updated Model
1. Replace files in `battery-ml-lambda/models/`
2. Restart backend server
3. Generate new report

### To Test with Real DynamoDB
1. Set in `battery-ml-lambda/local-config.py`:
   ```python
   USE_LOCAL_DATA = False
   ```
2. Configure AWS credentials
3. Restart backend

### To Test with Real S3
1. Set in `battery-ml-lambda/local-config.py`:
   ```python
   USE_LOCAL_STORAGE = False
   RESULTS_BUCKET = "your-bucket-name"
   ```
2. Configure AWS credentials
3. Restart backend

## ❌ Troubleshooting Quick Links

| Problem | Solution |
|---------|----------|
| Backend won't start | Run `pip install -r requirements-dev.txt` |
| Models not found | Check files exist in `battery-ml-lambda/models/` |
| Frontend can't connect | Ensure backend running on port 8000 |
| Port already in use | Kill process or use different port |
| Test data errors | Check `local_data.json` format |
| Permission denied (sh) | Run `chmod +x start-dev-server.sh` |

See `LOCAL_TESTING_GUIDE.md` for detailed help.

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| `LOCAL_ML_SETUP_GUIDE.md` | Complete setup guide (comprehensive) |
| `LOCAL_TESTING_GUIDE.md` | Testing guide (includes troubleshooting) |
| `battery-ml-lambda/verify-setup.py` | Automated setup validation |
| `battery-ml-lambda/test-integration.py` | Full integration tests |

## 🎯 When Ready to Deploy

1. ✅ Verify model works locally
2. ✅ Update `local-config.py` for production:
   ```python
   ENV = "production"
   USE_LOCAL_DATA = False
   USE_LOCAL_STORAGE = False
   ```
3. ✅ Follow `RELEASE_BUILD_GUIDE.md` for AWS deployment
4. ✅ Update `VITE_ML_BACKEND_URL` in frontend to AWS ALB URL

## 💡 Tips

- Keep 2-3 terminals open (backend, frontend, testing)
- Monitor both backend and frontend logs
- Use Swagger UI at http://localhost:8000/docs for API testing
- Test edge cases (empty data, missing features, extreme values)
- Keep test data fresh and realistic
- Commit setup files to version control

## 📞 Need Help?

1. Check `LOCAL_TESTING_GUIDE.md` Troubleshooting section
2. Review backend logs in Terminal 1
3. Check frontend logs in browser DevTools (F12)
4. Run `verify-setup.py` to validate environment
5. Run `test-integration.py` to test full pipeline

---

**You're all set! 🎉 Start with the "Starting the Servers" section above.**
