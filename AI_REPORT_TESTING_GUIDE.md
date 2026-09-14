# AI Report Generation - Testing & Debugging Guide

## ✅ Current Status

**AI Report Generation is FULLY IMPLEMENTED and READY TO TEST**

### What's Working:
- ✅ Direct AI report generation (bypasses payment)
- ✅ Coupon/Payment flow integration  
- ✅ ML inference with retry logic (3 attempts)
- ✅ S3 image handling and caching
- ✅ Error handling with user-friendly messages
- ✅ Console logging for debugging

---

## 🚀 Quick Start - Testing AI Report Generation

### Method 1: Direct Generation (EASIEST - No Payment)

1. **Open ChargingStations page**
   - Navigate to stations view

2. **Click on any station** to see available chargers
   - Look for charging stations in the grid

3. **Click "View Report"** button on any charger
   - A modal will open showing charging data

4. **Click "Generate Now (No Payment)"** button
   - ⚡ NEW button added for direct generation
   - Blue button with lightning icon at bottom
   - No need for payment/coupon

5. **Watch the console** (F12 → Console tab)
   - You'll see: `[proceedWithAIReport] ===== ATTEMPT 1/3 =====`
   - Logs show: Request payload, Response status, S3 URL
   - Final message: `[proceedWithAIReport] ===== SUCCESS! =====`

6. **Wait for image to load**
   - AI analysis image appears in modal
   - Recommendations display below
   - Battery health stats shown in cards

---

## 🔍 Console Debugging - What to Look For

### SUCCESS Scenario:
```
✅ [proceedWithAIReport] ===== ATTEMPT 1/3 =====
✅ [proceedWithAIReport] Request payload: { evse_id, connector_id, ... }
✅ [proceedWithAIReport] Making POST to https://api.zeflash.app/generate-report
✅ [proceedWithAIReport] Response status: 200
✅ [proceedWithAIReport] Response body: { s3Url, recommendations, ... }
✅ [proceedWithAIReport] ✅ SUCCESS! Report generated
✅ [proceedWithAIReport] S3 URL: https://s3.../battery-reports/...image.png
✅ [proceedWithAIReport] Recommendations: 3 items
✅ [proceedWithAIReport] ===== SUCCESS! =====
```

### FAILURE with Retry:
```
❌ [proceedWithAIReport] ❌ Attempt 1 FAILED: <error message>
❌ [proceedWithAIReport] ⏳ Retrying in 1000ms...
✅ [proceedWithAIReport] ===== ATTEMPT 2/3 =====
(retries with exponential backoff: 1s → 2s → 4s)
```

### COMMON ERRORS:
```
❌ "No recent charging data available" 
   → Charger needs actual charging sessions
   
❌ "Request timeout - ML service is taking too long"
   → ML inference in progress, try again
   
❌ "Failed to load AI report image. The image may still be generating"
   → S3 image still being created, wait and retry
   
❌ "Backend server error - no valid response received"
   → API issue, try again later
```

---

## 📊 Step-by-Step Manual Testing

### Test Case 1: Basic Report Generation
**Expected Result:** Report generates successfully with image and recommendations

**Steps:**
1. Open browser DevTools (F12)
2. Go to ChargingStations page
3. Find any active charger
4. Click "View Report" 
5. Wait for charging data to load
6. Click "Generate Now (No Payment)"
7. Observe console logs

**Pass Criteria:**
- ✅ Console shows "SUCCESS" message
- ✅ Image loads in the modal
- ✅ Recommendations appear
- ✅ Stats cards display (Current, Energy, Power, Temp)

---

### Test Case 2: Retry Logic
**Expected Result:** Failed request retries automatically up to 3 times

**Steps:**
1. Trigger report generation
2. Look for console log showing ATTEMPT X/3
3. If it fails, watch for automatic retry
4. Should show exponential backoff (1s, 2s, 4s delays)

**Pass Criteria:**
- ✅ See "ATTEMPT 1/3", "ATTEMPT 2/3", etc.
- ✅ Retries happen automatically
- ✅ Final attempt shows either SUCCESS or ALL RETRIES FAILED

---

### Test Case 3: Timeout Handling
**Expected Result:** Request times out after 60 seconds with appropriate error

**Steps:**
1. Trigger report generation
2. Wait 60 seconds without response
3. Check console for timeout log

**Pass Criteria:**
- ✅ Console shows: `⏱️ Request timeout after 60 seconds`
- ✅ User sees: "Request timeout - ML service is taking too long"
- ✅ Automatic retry occurs

---

### Test Case 4: Image Loading Fallback
**Expected Result:** If image fails to load from S3, fallback URL is used

**Steps:**
1. Generate report successfully
2. If image fails to load initially
3. Observe error handling

**Pass Criteria:**
- ✅ Error message shows: "Failed to load AI report image"
- ✅ Retry button appears in error message
- ✅ Can click to download S3 URL directly

---

## 🔧 File Locations & Key Functions

### Main Component:
- **File:** `src/components/ChargingStations.tsx`
- **Lines:** 2443 total

### Key Functions:
| Function | Line | Purpose |
|----------|------|---------|
| `fetchAIHealthReport()` | 625 | Entry point - Opens coupon modal |
| `handleCouponSubmit()` | 242 | Validates coupon/payment |
| `proceedWithAIReport()` | 475 | **Main AI generation logic** |
| `proceedWithPayment()` | Line ~350 | Payment integration |
| `handleUseCredits()` | Line ~280 | Credits-based generation |

### API Endpoint:
```
POST ${API_URL}/generate-report
```

**Required Payload:**
```json
{
  "evse_id": "string",
  "connector_id": number,
  "coupon_code": "string (optional)",
  "station_name": "string (optional)",
  "paid_for_report": boolean
}
```

**Expected Response:**
```json
{
  "s3Url": "https://s3.../image.png",
  "recommendations": ["rec1", "rec2", "rec3"],
  "totalSamples": number,
  "totalAnomalies": number,
  "anomalies": {},
  "status": "completed"
}
```

---

## 🛠️ Troubleshooting

### Problem: Button doesn't appear
**Solution:** 
- Make sure `reportModal.open === true`
- Check that charging data loaded successfully
- Button only shows in "AI Health Report" section

### Problem: Clicking button does nothing
**Solution:**
- Check console for errors
- Make sure `reportModal.aiLoading !== true`
- Try refreshing page and retrying
- Check network tab for failed requests

### Problem: Image won't load
**Solution:**
- Check S3 URL in console logs
- Verify URL is accessible (paste in browser)
- Try the "Generate Now (No Payment)" button again
- Wait a few seconds for S3 to complete image generation

### Problem: Getting timeout errors repeatedly
**Solution:**
- ML service might be overloaded
- Try again in 2-3 minutes
- Check if charger has recent charging data
- Look for "No recent charging data" error specifically

### Problem: Stuck on "Generating Report..."
**Solution:**
- Wait full 60 seconds (ML inference takes time)
- If still stuck, check console for errors
- Try refreshing and generating again
- Report may have succeeded but image still loading

---

## 📈 Performance Expectations

| Metric | Target | Notes |
|--------|--------|-------|
| First Request | 5-15s | ML inference time |
| Retry Delay 1 | 1 sec | Exponential backoff |
| Retry Delay 2 | 2 sec | Exponential backoff |
| Retry Delay 3 | 4 sec | Final before timeout |
| Total Timeout | 60 sec | Per request |
| Image Load | 2-5s | S3 delivery |
| Total Time | ~20-80s | Start to finish |

---

## 🎯 What Changed Today

### Added Features:
1. ✅ **Direct Generation Button**
   - "Generate Now (No Payment)" button
   - Bypasses coupon modal entirely
   - Perfect for testing
   - Line ~1945 in ChargingStations.tsx

2. ✅ **Debug Logging**
   - Extensive console logs throughout
   - Tracks every step of the process
   - Helps diagnose issues quickly

3. ✅ **Retry Logic**
   - Automatic 3 attempts with backoff
   - Graceful failure messages
   - No manual retry needed

### Code Location:
```typescript
// Direct generation triggering line:
onClick={() => {
  console.log('[DEBUG] Direct AI Report Generation triggered');
  setReportModal((prev) => ({ ...prev, aiLoading: true, aiError: '', aiImageUrl: '' }));
  proceedWithAIReport(reportModal.evseId, `${reportModal.evseId}_${reportModal.connectorId}`, '', reportModal.stationName);
}}
```

---

## ✨ Next Steps

1. **Test the new button** - Click "Generate Now (No Payment)"
2. **Watch the console** - Open DevTools and monitor logs
3. **Verify image loads** - Confirm AI analysis image appears
4. **Check recommendations** - Verify text recommendations display
5. **Test error handling** - Try on charger with no data

---

## 📞 Support

For debugging:
1. Open DevTools (F12)
2. Go to Console tab
3. Look for `[proceedWithAIReport]` logs
4. Share the full log output if issues occur

**Success Indicators:**
- ✅ Console shows "SUCCESS" message
- ✅ Image visible in modal
- ✅ No red error boxes
- ✅ Recommendations displayed

---

**AI Report Generation Ready for Testing! 🚀**
