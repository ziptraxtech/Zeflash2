# ✅ Troubleshooting Checklist

## Before Testing

- [ ] Backend `.env` file exists at `backend/.env`
- [ ] Backend installed: `cd backend && npm install`
- [ ] Frontend installed: `npm install`
- [ ] Database running (if using PostgreSQL locally)

## Starting Services

```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: ML Backend (if available)
cd battery-ml-lambda
python app.py

# Terminal 3: Frontend  
npm run dev
```

- [ ] Backend running on http://localhost:3001
- [ ] ML Backend running on http://localhost:8000 (optional)
- [ ] Frontend running on http://localhost:5173 or http://localhost:3000

## Testing Report Generation

1. [ ] Open app in browser
2. [ ] Find a charging station
3. [ ] Click "Get AI Health Report"
4. [ ] Open Browser DevTools (F12)
5. [ ] Check Console tab for logs

### Expected Success Flow

```
[proceedWithAIReport] ===== ATTEMPT 1/3 =====
[proceedWithAIReport] 🚀 Starting AI report generation for EVSE_ID
[proceedWithAIReport] 📤 Request payload: {...}
[proceedWithAIReport] Making POST to http://localhost:3001/generate-report
[proceedWithAIReport] Response status: 200
[proceedWithAIReport] ✅ Got response: {s3Url, recommendations, ...}
[proceedWithAIReport] ===== SUCCESS! =====
```

- [ ] Report modal shows AI health image
- [ ] Recommendations appear below image
- [ ] No error messages

## Error Scenarios

### ❌ "Cannot reach backend server"

**Cause:** Backend not running or wrong URL

**Fix:**
```bash
# Check backend running
lsof -i :3001

# If not running:
cd backend && npm run dev

# Test endpoint:
curl http://localhost:3001/health
```

- [ ] Backend starts successfully
- [ ] Port 3001 is listening
- [ ] Health check returns 200

### ❌ "Cannot connect to ML backend"

**Cause:** ML service not running on port 8000

**Fix:**
```bash
# Check ML service running
lsof -i :8000

# If not running (optional):
cd battery-ml-lambda && python app.py

# Test ML endpoint:
curl http://localhost:8000/api/v1/health
```

- [ ] ML service started (or skip if not using locally)
- [ ] Port 8000 is listening
- [ ] Health check returns 200

### ❌ "Retrying in 2 seconds..."

**Cause:** Temporary network glitch or backend slow

**Expected Behavior:** System retries automatically

**What to do:**
- [ ] Wait for retry to complete
- [ ] Check backend logs for errors
- [ ] Check if ML service is responsive

### ❌ "Timeout after 2 minutes"

**Cause:** ML inference taking too long

**Fix:**
```bash
# Check ML service logs for:
# - Excessive processing time
# - Memory issues
# - Data loading problems

# Restart ML service:
cd battery-ml-lambda && python app.py
```

- [ ] ML service restarted
- [ ] System resource usage checked (CPU, RAM, disk)
- [ ] ML service responding quickly to health check

### ❌ "S3 URL error" / "Download failed"

**Cause:** ML backend didn't return s3_path properly

**Fix:**
```bash
# Check backend logs for S3 path construction
cd backend && npm run dev

# Look for: "[generateReport] Report S3 URL:"
# Should show valid AWS S3 URL

# Test S3 bucket access:
curl -I https://battery-ml-results-test.s3.us-east-1.amazonaws.com/
```

- [ ] Backend logs show valid S3 URL
- [ ] S3 bucket is accessible
- [ ] AWS credentials configured if needed

## Database Issues

### If using PostgreSQL

```bash
# Check PostgreSQL running
lsof -i :5432

# Or with psql:
psql -U postgres -h localhost -c "SELECT 1"

# Check connection string in .env:
DATABASE_URL=postgresql://user:password@localhost:5432/zeflash
```

- [ ] PostgreSQL running on port 5432
- [ ] Connection string in `backend/.env` is correct
- [ ] Database `zeflash` exists

## Performance Testing

### Monitor while testing

**Terminal with system monitor:**
```bash
watch -n 1 'lsof -i TCP -s TCP:LISTEN'
```

- [ ] Check backend memory usage
- [ ] Check ML service memory/CPU usage
- [ ] Check network latency (DevTools Network tab)

### Response time targets

- Backend response: < 5 seconds
- ML inference: < 120 seconds (2 min timeout)
- Image load: < 10 seconds
- Total flow: < 3 minutes

## Success Indicators

Once working, you should see:

✅ Report modal opens with loading spinner
✅ AI Health image loads (from S3)
✅ Recommendations display below image
✅ No error messages in console
✅ No red logs in browser console
✅ Backend logs show `✅ Report generated` or similar

## Debug Commands

Run these to verify everything:

```bash
# Check all services
lsof -i TCP -s TCP:LISTEN | grep -E "3001|8000|5173"

# Test API connectivity
curl -X POST http://localhost:3001/generate-report \
  -H "Content-Type: application/json" \
  -d '{"evse_id":"test","connector_id":1}'

# View backend logs live
cd backend && npm run dev 2>&1 | grep -i report

# View frontend bundle size
cd frontend && npm run build && du -sh dist/
```

## Still Stuck?

1. [ ] Collect browser console logs (F12)
2. [ ] Collect backend logs
3. [ ] Run health check: `bash health-check.sh`
4. [ ] Test with curl commands above
5. [ ] Share these when asking for help

---

**Pro Tip:** Enable all console logging in browser:
```javascript
// Paste in browser console (F12):
window.DEBUG = true;
```

This will show you every step of the process! 🚀
