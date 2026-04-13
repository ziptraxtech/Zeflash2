# Local Testing Guide - Fix Applied

## What Was Wrong ❌
The backend had an **operator precedence bug** that was defaulting to AWS Lambda instead of localhost:8000 when testing.

## What I Fixed ✅
1. Fixed ternary operator in `generateReport.ts` to properly use localhost by default
2. Set explicit `ML_BACKEND_URL="http://127.0.0.1:8000"` in `backend/.env`  
3. Added error handling that tells you if the ML server isn't running

## How to Test Locally (Now Working!)

### Step 1: Start ML Backend (FIRST!)
```bash
# Terminal 1
cd battery-ml-lambda
python run_server_local.py
```
✅ You should see: `Uvicorn running on http://127.0.0.1:8000`

**Wait** a few seconds for it to fully initialize.

### Step 2: Start Node Backend (SECOND!)
```bash
# Terminal 2
cd backend
npm run dev
```
✅ You should see logs like:
```
[generateReport] ML Backend: http://127.0.0.1:8000
[generateReport] Using default endpoint for NODE_ENV=development
Server running on port 3001
```

### Step 3: Start Frontend (THIRD!)
```bash
# Terminal 3
npm run dev
```
✅ Opens: `http://localhost:5173`

### Step 4: Generate a Test Report
1. Open: `http://localhost:5173/report/TEST_CHARGER_1`
2. Click **"Generate Report"** button
3. Wait 30-120 seconds (it's running on your local ML model)

### Step 5: Verify It's Using Local ML ✅
**Expected Behavior:**
- Report generates from **localhost:8000** ✅
- Shows **real anomaly results** in UI
- S3 URL in response is from AWS (for plots) but inference is LOCAL

**How to Verify in Browser DevTools:**
1. Open DevTools (F12)
2. Go to Network tab
3. Generate report
4. Look at `POST /generate-report` response:
   - Should have `totalAnomalies > 0` ✅ (from local model)
   - Should have `anomalies: {critical, high, medium, low}` ✅

**Check Backend Logs:**
```
[generateReport] Triggering inference: POST http://127.0.0.1:8000/api/v1/inference/trigger
[generateReport] Job created: [job-id]
[generateReport] Job [job-id] status: processing
[generateReport] Job [job-id] status: completed
[generateReport] ML result: { status: 'completed', anomalies: {...} }
```

## If Local ML Doesn't Start

### Error: `ECONNREFUSED`
```
Cannot connect to ML backend at http://127.0.0.1:8000
Please ensure the ML server is running: python run_server_local.py
```
**Fix:** Make sure Terminal 1 (ML Backend) is running and you see the Uvicorn message.

### Error: `ModuleNotFoundError: No module named 'tensorflow'`
```bash
# Install ML dependencies
cd battery-ml-lambda
pip install -r requirements.txt
```

### Port 8000 Already in Use
```bash
# Kill process on port 8000
lsof -i :8000  # Find PID
kill -9 <PID>  # Kill it
python run_server_local.py  # Try again
```

## Testing Checklist ✅

- [ ] ML Backend running: `http://127.0.0.1:8000`
- [ ] Node Backend running: `http://localhost:3001`
- [ ] React Frontend running: `http://localhost:5173`
- [ ] Generate Report button works
- [ ] Report shows **real anomaly %** (not AWS Lambda results)
- [ ] Backend logs show `http://127.0.0.1:8000` endpoint
- [ ] No "Cannot connect to ML backend" errors

## After Testing - Switching to Production

Once you've verified local testing works, you can point to AWS:

```bash
# In backend/.env
ML_BACKEND_URL="http://battery-ml-alb-1652817744.us-east-1.elb.amazonaws.com"
NODE_ENV="production"
```

Then restart backend: `npm run dev`

---

**Last Updated**: 2026-04-07
**Status**: Local ML Testing Fixed ✅
