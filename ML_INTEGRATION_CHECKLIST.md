# ML Frontend Integration - Quick Test Checklist

## Pre-Flight Checks ✈️

### Database
- [ ] Prisma schema updated: `npx prisma db push` ran successfully
- [ ] Report table has new fields: `anomalies`, `totalSamples`, `totalAnomalies`
- [ ] Database connection verified in backend/.env

### Backend
- [ ] `backend/.env` created with DATABASE_URL and DIRECT_URL
- [ ] ML_BACKEND_URL set to `http://127.0.0.1:8000` for development
- [ ] generateReport.ts updated with new response format
- [ ] No TypeScript errors in backend code

### Frontend  
- [ ] AIReport.tsx shows real ML data (not mock data)
- [ ] mlData state properly stores anomaly results
- [ ] No TypeScript errors in frontend code

### Environment
- [ ] Root `.env` has DIRECT_URL and ML_BACKEND_URL
- [ ] Backend `.env` properly configured
- [ ] Neon database credentials valid

## Startup Sequence 🚀

### Terminal 1: ML Backend
```bash
cd battery-ml-lambda
python run_server_local.py
# ✅ Should see: "Uvicorn running on http://127.0.0.1:8000"
```

### Terminal 2: Node Backend
```bash
cd backend
npm run dev
# ✅ Should see: "Server running on http://localhost:3001"
# ✅ Should see logs for schema check
```

### Terminal 3: React Frontend
```bash
npm run dev
# ✅ Should see: "Local: http://localhost:5173"
```

## Integration Test 🧪

### Test 1: Browser Navigation
- [ ] Open `http://localhost:5173/report/TEST_EVSE_1`
- [ ] Page loads without errors
- [ ] "Generate Report" button visible

### Test 2: Generate First Report
- [ ] Click "Generate Report"
- [ ] "Generating..." spinner appears
- [ ] Page stays open (don't navigate away)
- [ ] Wait 30-120 seconds

### Test 3: Results Display
- [ ] Report displays without "Loading..." state
- [ ] Real data appears (not mock percentages):
  - `totalAnomalies` > 0 (unless normal data)
  - Anomaly breakdown shows (critical, high, medium, low counts)
  - Severity matches anomaly percentage

### Test 4: Data Verification
- [ ] Summary text includes real percentage (e.g., "38.3%")
- [ ] Severity badge reflects real data:
  - ≥40% anomalies → "Immediate Action Required" (red)
  - ≥25% → "Degradation Accelerating" (yellow)
  - ≥10% → "Moderate Irregularities" (yellow)
  - <10% → "Stable" (green)
- [ ] Recommended actions match severity level

### Test 5: Database Verification
```bash
# Connect to Neon and check:
SELECT id, evseId, connector, status, anomalies, totalSamples, totalAnomalies 
FROM "Report" 
ORDER BY createdAt DESC 
LIMIT 1;

# ✅ Should show:
# - status = 'completed'
# - anomalies = JSON object with breakdown
# - totalSamples = 60+
# - totalAnomalies = number > 0
```

### Test 6: API Response Verification
**In Browser DevTools (Network Tab):**
1. Generate a new report
2. Find `POST /api/generate-report` request
3. Check Response tab for:
```json
{
  "reportId": "...",
  "status": "completed",
  "anomalies": {
    "critical": 0,
    "high": 3,
    "medium": 5,
    "low": 10
  },
  "totalSamples": 60,
  "totalAnomalies": 8,
  "s3Url": "https://...",
  "generatedAt": "2026-..."
}
```

## Troubleshooting 🔧

### Issue: "ML job timed out after 120s"
- [ ] Check if `python run_server_local.py` is still running
- [ ] Check ML backend logs for errors
- [ ] Verify port 8000 is accessible: `curl http://127.0.0.1:8000/health`

### Issue: "Insufficient credits"
- [ ] Check user credit balance in database
- [ ] Verify credits table has entries
- [ ] Check credit deduction logic in backend

### Issue: "report generation failed" 
- [ ] Check backend logs for API errors
- [ ] Verify Neon database connection
- [ ] Check S3 bucket permissions for ML reports

### Issue: "Display shows mock data, not real data"
- [ ] Verify mlData state is being set (React DevTools)
- [ ] Check API response in Network tab
- [ ] Verify AIReport.tsx was updated correctly
- [ ] Clear browser cache and reload

### Issue: "Database sync failed"
- [ ] Run: `npx prisma db push` in backend folder
- [ ] Verify DIRECT_URL is correct (no pooler suffix)
- [ ] Check Neon connection string format

## Success Indicators ✅

You know it works when you see:
1. ✅ Real anomaly percentages in UI (not "5-7" mock ranges)
2. ✅ Database Report records have anomalies JSON column populated
3. ✅ API response includes full anomaly breakdown
4. ✅ Severity badge color changes based on real anomaly %
5. ✅ Recommendations change based on real severity
6. ✅ No console errors in browser DevTools
7. ✅ No errors in backend/ML terminal logs

## Performance Baseline

Expected timing for one report generation:
- API call: 5-10ms (network)
- ML inference: 15-60 seconds (model processing)
- Database write: 50-100ms
- **Total: ~30-120s** (depends on ML server load)

---

## Command Reference

```bash
# Python ML Backend Health Check
curl http://127.0.0.1:8000/api/v1/inference/status/test-job

# Backend Database Sync
cd backend && npx prisma db push

# Backend Start
cd backend && npm run dev

# Frontend Start
npm run dev

# Check Neon Connection
psql "postgresql://... your DATABASE_URL ..."
```

---

Generated: 2026-02-25
Last Updated: After ML Frontend Integration
