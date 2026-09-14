# Zeflash Charger Report - Debugging Guide

## Problem Summary

You reported two main issues:
1. **Report keeps loading** - Modal gets stuck showing "Loading report..." 
2. **AI Health Report fails** - Shows S3 download error or doesn't generate

---

## Issue 1: Report Keeps Loading

### Root Cause Analysis

The `fetchChargerReport` function calls an external CMS API:
- **Endpoint**: `https://cms.charjkaro.in/commands/secure/api/v1/get/charger/time_lapsed`
- **Token Source**: `https://cms.charjkaro.in/admin/api/v1/zipbolt/token`

### Possible Reasons:

1. **Token Endpoint is Down**
   - The token endpoint may not be responding
   - Network timeout waiting for token

2. **CMS API Endpoint is Down**
   - The charger data endpoint is unreachable
   - Returns 5xx error

3. **Token Authorization Failure**
   - Token expires or becomes invalid
   - CORS issues with the external endpoint

4. **Network/Firewall Issues**
   - Your network blocks the CMS domain
   - Proxy/VPN interference

### How to Debug:

#### Step 1: Check Frontend Logs
Open browser DevTools (F12) → Console tab and look for:
```
[fetchChargerReport] 📥 Starting fetch for EVSE: ...
[fetchChargerReport] Getting token from: https://cms.charjkaro.in/admin/api/v1/zipbolt/token
[fetchChargerReport] ✅ Got token: ...
[fetchChargerReport] 🔗 Fetching from: https://cms.charjkaro.in/commands/secure/api/v1/get/charger/time_lapsed?...
[fetchChargerReport] Response status: ...
[fetchChargerReport] ❌ Fetch error: ...
```

#### Step 2: Test Token Endpoint Directly
Open browser console and run:
```javascript
// Test token endpoint
fetch('https://cms.charjkaro.in/admin/api/v1/zipbolt/token')
  .then(r => {
    console.log('Token Response Status:', r.status);
    return r.json();
  })
  .then(d => console.log('Token Response:', d))
  .catch(e => console.error('Token Error:', e));
```

**Expected Response:**
```json
{ "token": "some_token_string" }
```

#### Step 3: Test CMS API Directly
```javascript
// First get token
const tokenRes = await fetch('https://cms.charjkaro.in/admin/api/v1/zipbolt/token');
const tokenData = await tokenRes.json();
const token = tokenData.token;

// Then test charger data endpoint
fetch('https://cms.charjkaro.in/commands/secure/api/v1/get/charger/time_lapsed?role=Admin&operator=All&evse_id=YOUR_EVSE_ID&connector_id=1&page=1&limit=100', {
  method: 'GET',
  headers: {
    'Authorization': `basic ${token}`,
  }
})
  .then(r => {
    console.log('Charger Response Status:', r.status);
    return r.text();
  })
  .then(d => console.log('Charger Response:', d))
  .catch(e => console.error('Charger Error:', e));
```

**Expected Response:**
```json
[
  {
    "meterValue": [...],
    "createdat": "...",
    ...
  }
]
```

---

## Issue 2: AI Health Report Fails / S3 Error

### Root Cause Analysis

The flow for generating AI reports:

1. Frontend calls: `POST /generate-report`
2. Backend triggers ML service: `POST http://ML_BACKEND_URL/api/v1/inference/trigger`
3. ML service processes and returns S3 path
4. Backend constructs S3 URL and returns to frontend
5. Frontend displays image from S3

### Possible Reasons:

1. **ML Backend Not Running**
   - Service is down or crashed
   - Wrong ML backend URL configured

2. **S3 Bucket Access Denied**
   - IAM permissions issue
   - S3 bucket doesn't have public read access
   - CORS not configured properly

3. **S3 URL Construction Error**
   - Path format is incorrect
   - Wrong bucket name or region

4. **ML Service Returns No Data**
   - Not enough charging data available
   - Job times out or fails

### Current S3 Configuration

```typescript
// In backend/src/routes/generateReport.ts
const s3Bucket = 'battery-ml-results-test';
const s3Region = 'us-east-1';
const s3Url = `https://${s3Bucket}.s3.${s3Region}.amazonaws.com/battery-reports/${evseId}_${connector_id}/battery_health_report.png`;
```

### How to Debug:

#### Step 1: Check Backend Logs
Look for:
```
[generateReport] ML Backend: http://zeflash-ml-alb-2095066601.us-east-1.elb.amazonaws.com
[generateReport] Using ML Backend: ...
[generateReport] TRIGGERING INFERENCE
[generateReport] Response status: ...
[generateReport] ✅ Job created: ...
[generateReport] Job ... status: completed
[generateReport] ✅ ML INFERENCE COMPLETE
[generateReport] Report S3 URL: https://battery-ml-results-test.s3.us-east-1.amazonaws.com/battery-reports/...
```

#### Step 2: Check ML Backend Status
```bash
# Test if ML backend is reachable (replace with your actual ML backend URL)
curl -X POST http://zeflash-ml-alb-2095066601.us-east-1.elb.amazonaws.com/api/v1/inference/trigger \
  -H "Content-Type: application/json" \
  -d '{"evse_id":"TEST","connector_id":1,"limit":60}'
```

Expected response should include `job_id`.

#### Step 3: Test S3 URL Accessibility
From browser console:
```javascript
// Test if S3 URL is publicly accessible
const s3Url = 'https://battery-ml-results-test.s3.us-east-1.amazonaws.com/battery-reports/YOUR_EVSE_ID_1/battery_health_report.png';
fetch(s3Url, { method: 'HEAD' })
  .then(r => console.log('S3 Status:', r.status))
  .catch(e => console.error('S3 Error:', e));

// Or try loading it in an image tag
const img = new Image();
img.src = s3Url;
img.onerror = () => console.error('Image failed to load');
img.onload = () => console.log('Image loaded successfully');
```

#### Step 4: Check S3 Bucket CORS Configuration
```bash
# AWS CLI command to check CORS
aws s3api get-bucket-cors --bucket battery-ml-results-test --region us-east-1
```

Should return CORS allowing `*` origins or your frontend domain.

---

## Solution Checklist

### For Issue 1 (Report Loading):

- [ ] Check if CMS token endpoint is responding (test in console)
- [ ] Verify token format is correct
- [ ] Check if CMS API endpoint is accessible
- [ ] Verify EVSE_ID and Connector_ID are correct
- [ ] Check browser console for specific error message
- [ ] Try from different network/without VPN

### For Issue 2 (AI Report Fails):

- [ ] Verify ML backend is running and accessible
- [ ] Check ML backend URL in backend environment variables:
  ```bash
  # In production, check:
  echo $ML_BACKEND_URL
  echo $BACKEND_API_URL
  ```
- [ ] Test S3 bucket is public and has CORS enabled
- [ ] Check if charging station actually has recent data
- [ ] Look at backend logs for inference job status
- [ ] Verify S3 bucket name and region are correct

---

## Environment Variables to Check

### Frontend (.env or config)
```
VITE_API_URL=http://localhost:3001  # or your backend URL
```

### Backend (.env)
```
ML_BACKEND_URL=http://zeflash-ml-alb-2095066601.us-east-1.elb.amazonaws.com
BACKEND_API_URL=http://3.90.162.23:3001
NODE_ENV=production
```

---

## Quick Fixes to Try

### If Token Endpoint is Failing:
Check if the CMS service needs authentication or has rate limiting.

### If S3 URL is not working:
1. Manually check if file exists:
   ```bash
   aws s3 ls s3://battery-ml-results-test/battery-reports/ --recursive
   ```

2. Make S3 bucket public (if not sensitive):
   ```bash
   aws s3api put-bucket-public-access-block \
     --bucket battery-ml-results-test \
     --public-access-block-configuration \
     "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false"
   ```

### If ML Backend is not found:
Check the actual deployment and update the URL in `generateReport.ts`.

---

## Console Output To Share

When reporting the issue, please share the console output from:

1. **Browser Console** (F12 → Console):
   - Look for `[fetchChargerReport]` logs
   - Look for `[proceedWithAIReport]` logs
   - Any `❌` error messages

2. **Backend Logs**:
   - Server output when report generation is attempted
   - Look for `[generateReport]` prefix
   - Any connection errors to ML backend

3. **Network Tab** (F12 → Network):
   - Request to token endpoint: status?
   - Request to CMS API: status?
   - Request to `/generate-report`: status + response?
   - Any failed image loads from S3?
