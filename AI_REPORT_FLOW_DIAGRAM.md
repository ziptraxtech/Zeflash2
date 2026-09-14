# 🎯 AI Report Generation Flow - Quick Reference

## User Journey

```
┌─────────────────────────────────────────────────────────────────┐
│  USER CLICKS "GET AI HEALTH REPORT" BUTTON                      │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
        ┌────────────────────────────────────┐
        │  fetchAIHealthReport()              │
        │  • Opens coupon modal               │
        │  • Sets aiLoading = false           │
        │  • Clears temp input                │
        └────────────┬───────────────────────┘
                     │
                     ▼
    ┌─────────────────────────────────────────┐
    │  COUPON MODAL DISPLAYED TO USER          │
    │  • User enters coupon (optional)         │
    │  • User sees pricing: ₹299               │
    │  • User can close or submit              │
    └────────────┬────────────────────────────┘
                 │
                 ▼ (User submits)
    ┌───────────────────────────────┐
    │ handleCouponSubmit()           │
    │ • Validates coupon             │
    │ • Checks user credits          │
    └────────────┬────────────────────┘
                 │
      ┌──────────┼──────────┬──────────┐
      │          │          │          │
      ▼          ▼          ▼          ▼
   FREE    CREDITS    NO COUPON   PAID
  COUPON   AVAILABLE  NO CREDITS  COUPON
      │          │          │          │
      └──────────┼──────────┴──────────┘
                 │
      ┌──────────┴──────────┐
      │                     │
      ▼                     ▼
  DIRECT CALL        PAYMENT FLOW
  proceedWithAI      (Razorpay)
  Report()               │
      │                  ▼
      │          Payment successful
      │                  │
      └──────────┬───────┘
                 │
                 ▼
    ┌─────────────────────────────────────┐
    │ proceedWithAIReport()                │
    │ • Sets aiLoading = true              │
    │ • Calls /generate-report API         │
    │ • With retry logic (3 attempts)      │
    │ • Timeout: 60 seconds                │
    │ • Exponential backoff                │
    └────────────┬────────────────────────┘
                 │
        ┌────────┴──────────────────┐
        │                           │
        ▼                           ▼
     SUCCESS                     FAIL (retry)
        │                           │
        ├─ Get S3 URL              └─ Wait 1s
        ├─ Get recommendations         ↓
        ├─ Get AI metrics          Retry 2
        │                           (if fail)
        ▼                           └─ Wait 2s
   Update State                        ↓
   • aiImageUrl ✅               Retry 3
   • aiLoading = false           (if fail)
   • recommendations ✅          └─ Wait 4s
   • aiReportData ✅                  ↓
        │                        Final Fail
        │                             │
        ▼                             ▼
   IMAGE DISPLAYS              ERROR MESSAGE
   • Spinner gone            • Specific error
   • Recommendations         • "Try again"
   • PDF download ready      • Console logs

   USER SEES FULL REPORT
   ✅ AI Analysis Image
   ✅ Recommendations
   ✅ Battery Health Status
   ✅ Download PDF option
```

---

## State Machine

```
                    ┌────────────────┐
                    │   CLOSED       │
                    │ aiLoading=null │
                    └────────┬────────┘
                             │
                     Click Get Report
                             │
                             ▼
                    ┌────────────────┐
                    │   MODAL OPEN   │
                    │ Waiting input  │
                    └────────┬────────┘
                             │
                        Submit
                             │
                             ▼
                    ┌────────────────────┐
                    │  LOADING           │
                    │ aiLoading=true     │
                    │ API call in flight │
                    └────────┬───────────┘
                             │
                    ┌────────┴────────┐
                    │                 │
              SUCCESS             FAILURE
                    │                 │
                    ▼                 ▼
           ┌────────────────┐  ┌────────────────┐
           │   SUCCESS      │  │    ERROR       │
           │ aiLoading=false│  │ aiLoading=false│
           │ aiImageUrl=URL │  │ aiError="msg"  │
           │ recs=array     │  │ Retry link     │
           └────────────────┘  └────────────────┘
                    │                 │
                    │            (Retry)
                    │                 │
                    └────────┬────────┘
                             │
                    Back to LOADING
```

---

## Request/Response Details

### Request
```
POST /generate-report
Content-Type: application/json
Authorization: Bearer <token> (optional)

{
  "evse_id": "string",           ← EVSE ID
  "connector_id": 1,             ← Connector number
  "coupon_code": "CODE123",      ← Free/paid coupon
  "station_name": "Station X",   ← For context
  "paid_for_report": false       ← Payment status
}
```

### Response (Success)
```
HTTP 200 OK
Content-Type: application/json

{
  "s3Url": "https://s3.../image.png",
  "recommendations": [
    "What we found...",
    "What this means...",
    "What you should do..."
  ],
  "totalSamples": 120,
  "totalAnomalies": 15,
  "anomalies": { ... },
  "status": "completed"
}
```

### Response (Error)
```
HTTP 4xx/5xx
Content-Type: application/json

{
  "error": "Specific error message"
}
```

---

## Console Logs to Monitor

When generating AI report, check console (F12) for:

```
✅ [proceedWithAIReport] ===== ATTEMPT 1/3 =====
✅ [proceedWithAIReport] Request payload: { evse_id, connector_id, ... }
✅ [proceedWithAIReport] Making POST to https://api.zeflash.app/generate-report
✅ [proceedWithAIReport] Response status: 200
✅ [proceedWithAIReport] Response body: { s3Url, recommendations, ... }
✅ [proceedWithAIReport] ✅ SUCCESS! Report generated
✅ [proceedWithAIReport] S3 URL: https://s3.../image.png
✅ [proceedWithAIReport] Recommendations: 3 items
✅ [proceedWithAIReport] ===== SUCCESS! =====
```

Or if failing:
```
❌ [proceedWithAIReport] ❌ Attempt 1 FAILED: <error message>
❌ [proceedWithAIReport] ⏳ Retrying in 1000ms...
❌ [proceedWithAIReport] ===== ALL RETRIES FAILED =====
❌ Final error: <specific error>
```

---

## Quick Troubleshooting

| Problem | Check | Fix |
|---------|-------|-----|
| No modal appears | `fetchAIHealthReport()` not called | Check button onClick handler |
| Modal appears but can't submit | `handleCouponSubmit()` issue | Check coupon validation logic |
| Spinner spins forever | API timeout | Check `/generate-report` endpoint |
| Image doesn't load | S3 URL issue | Verify S3 bucket & CORS |
| Recommendations empty | Backend not returning | Check ML model output |
| Payment fails | Razorpay config | Check payment integration |
| Credits don't deduct | API response not processed | Check `/credits` endpoint |

---

## Files Involved

| File | Purpose | Lines |
|------|---------|-------|
| ChargingStations.tsx | Main component | 2443 |
| proceedWithAIReport | AI gen logic | 475-625 |
| handleCouponSubmit | Validation | 242-275 |
| handleUseCredits | Credits flow | 282-350 |
| fetchAIHealthReport | Entry point | 625-631 |
| ReportModal | UI display | 1850-2050 |
| CouponModal | Payment UI | 2330-2430 |

---

## Success Criteria ✅

- [ ] Button visible and clickable
- [ ] Modal opens on click
- [ ] Can enter coupon code
- [ ] Can proceed without coupon
- [ ] Coupon validates correctly
- [ ] Payment shows for invalid coupons
- [ ] Loading spinner shows
- [ ] Console shows API call logs
- [ ] API responds with image URL
- [ ] Image displays on page
- [ ] Recommendations show
- [ ] No errors in console
- [ ] PDF download includes AI image

