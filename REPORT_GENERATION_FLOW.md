# Report Generation Flow - Complete Summary

## Overview
This document outlines the **end-to-end report generation process** for the Zeflash battery health analysis system, including where reports are stored (S3), how they're accessed, and how users download them.

---

## 1. User Initiates Report Generation

### Entry Point: `ChargingStations.tsx` → `fetchChargerReport()`
- User clicks **"Generate AI Report"** or **"Refresh Report"** button on a charger card
- The frontend makes a **POST request** to backend endpoint: `POST /generate-report`

**Request Payload:**
```javascript
{
  evse_id: string,           // Charger ID
  connector_id: number,       // Connector port (1-4)
  email?: string,            // Optional user email
  coupon_code?: string,       // Optional coupon for free reports
  station_name?: string,      // Optional charging station name
  paid_for_report?: boolean   // Whether user paid via Razorpay
}
```

---

## 2. Backend Request Handler: `generateReport.ts`

### Authentication & Authorization
```
POST /generate-report (with optionalAuth middleware)
└── Checks: Unauthenticated user? → Must use paid_for_report OR valid coupon
└── Authenticated user? → Can use credits, coupons, or paid reports
└── No credits? → Returns 402 (insufficient credits)
```

### Payment Method Validation
| Method | Requires Auth | Credit Deduction | Notes |
|--------|---|---|---|
| **Paid via Razorpay** | No | ❌ No | `paid_for_report: true` flag |
| **Free Coupon** | No | ❌ No | Hardcoded: ZEFLASHCODERS, TESTCHARJ, ZIPTRAX |
| **Partner Coupon** | No | ❌ No | Tracked in DB, limited quantity |
| **Credits** | Yes | ✅ Yes | Deducts 1 credit per report |
| **Unauthenticated** | No | N/A | Must use paid or coupon |

### Create Report Record in Database
```prisma
report {
  id: string
  userId?: string          // Optional (null for guest/unauthenticated users)
  evseId: string
  connector: number
  status: 'processing'     // Will be updated to 'completed' or 'failed'
  couponCode?: string      // If used
  createdAt: timestamp
}
```

---

## 3. Trigger ML Inference: Backend → ML Service

### ML Service Endpoint
```
POST /api/v1/inference/trigger
└── Endpoint: http://zeflash-ml-alb-2095066601.us-east-1.elb.amazonaws.com
    (or local: http://127.0.0.1:8000 in dev)
```

**Request Body:**
```json
{
  "evse_id": "string",
  "connector_id": number,
  "limit": 60,             // Data points to analyze
  "station_name": "string" // Optional
}
```

**Response:**
```json
{
  "job_id": "string"  // Unique ML job identifier
}
```

---

## 4. Poll ML Job Status: Backend Waits

### Status Polling
```
GET /api/v1/inference/status/{job_id}
└── Poll interval: 3 seconds
└── Timeout: 120 seconds (2 minutes)
└── Status values: 'pending' → 'running' → 'completed' / 'failed'
```

### Completed Job Response
```json
{
  "status": "completed",
  "result": {
    "status": "success",
    "anomalies": {
      "critical": 2,
      "high": 5,
      "medium": 12,
      "low": 8
    },
    "total_samples": 127,
    "total_anomalies": 27,
    "s3_path": "battery-reports/{device_id}/battery_health_report.png",
    "s3_bucket": "battery-ml-results-test",
    "recommendations": ["Recommendation 1", "Recommendation 2", ...]
  }
}
```

---

## 5. Report Storage: S3 Configuration

### S3 Bucket Details
| Property | Value |
|---|---|
| **Bucket Name** | `battery-ml-results-test` |
| **Region** | `us-east-1` |
| **Access** | Public (HTTP URLs) |

### S3 Report Path Structure
```
battery-ml-results-test/
└── battery-reports/
    └── {device_id}/
        └── battery_health_report.png    // AI-generated health visualization
        ├── metadata.json                // (if saved by ML)
        └── anomalies.json               // (if saved by ML)
```

### Example S3 URLs
```
https://battery-ml-results-test.s3.us-east-1.amazonaws.com/battery-reports/CDR-001/battery_health_report.png
https://battery-ml-results-test.s3.us-east-1.amazonaws.com/battery-reports/HK-002_1/battery_health_report.png
```

---

## 6. Update Report Record: Backend Saves S3 URL

### Construct S3 URL (Backend)
```typescript
// If ML returns s3_path:
const s3Url = `https://battery-ml-results-test.s3.us-east-1.amazonaws.com/${result.s3_path}`;

// Fallback (if s3_path is missing):
const s3Url = `https://battery-ml-results-test.s3.us-east-1.amazonaws.com/battery-reports/${evse_id}_${connector_id}/battery_health_report.png`;
```

### Update Database Record
```prisma
report {
  id: string
  status: 'completed'              // ← Changed from 'processing'
  s3Url: string                    // ← Full S3 URL from above
  anomalies: { critical, high, medium, low }
  totalSamples: number
  totalAnomalies: number
  recommendations: string[]
  updatedAt: timestamp
}
```

---

## 7. Return Report to Frontend: Backend Response

### Success Response (200 OK)
```json
{
  "reportId": "uuid",
  "status": "success",
  "anomalies": {
    "critical": 2,
    "high": 5,
    "medium": 12,
    "low": 8
  },
  "totalSamples": 127,
  "totalAnomalies": 27,
  "s3Url": "https://battery-ml-results-test.s3.us-east-1.amazonaws.com/battery-reports/{device_id}/battery_health_report.png",
  "evseId": "CDR-001",
  "connector": 1,
  "generatedAt": "2025-10-01T15:30:00Z",
  "recommendations": [
    "Replace battery within 2-4 weeks",
    "Schedule maintenance check",
    ...
  ]
}
```

### Error Response (422 / 500)
```json
{
  "error": "Unable to generate report: No recent charging data available",
  "detail": "The charger must have recent charging sessions to analyze",
  "reportId": "uuid"  // For credit refund tracking
}
```

---

## 8. Display Report: Frontend Processing

### Step 1: Store Report in React State
```typescript
// In ChargingStations.tsx
setReportModal({
  open: true,
  data: reportData,           // Full response from backend
  aiImageUrl: reportData.s3Url,
  evseId: evse_id,
  connectorId: connector_id,
  recommendations: reportData.recommendations,
  aiReportData: {
    totalAnomalies: reportData.totalAnomalies,
    anomalies: reportData.anomalies
  }
});
```

### Step 2: Resolve Image URL
```typescript
// resolveReportImageUrl() in src/config/api.ts
const resolveAiImageUrl = (rawUrl, evseId, connector) => {
  if (!rawUrl) {
    // Fallback
    return `${API_URL}/api/reports/${evseId}_${connector}/battery_health_report.png`;
  }
  
  if (rawUrl.startsWith('/api/')) {
    // Keep /api/* URLs as-is (Vercel proxy)
    return rawUrl;
  }
  
  if (rawUrl.includes('amazonaws.com')) {
    // Return S3 URL directly
    return rawUrl;
  }
  
  return `${API_URL}${rawUrl}`;
};
```

### Step 3: Display Report Image
```jsx
// In report modal (ChargingStations.tsx)
<img
  src={`${resolveAiImageUrl(s3Url, evseId, connector)}?t=${Date.now()}`}
  alt="Battery Health Report"
  className="w-full rounded-lg"
/>
```

---

## 9. Download Report: User Actions

### Option 1: Download S3 Image Directly
```html
<a
  href={resolveAiImageUrl(s3Url, evseId, connector)}
  download="battery_health_report.png"
  target="_blank"
>
  Download Report Image
</a>
```

**Flow:**
1. User clicks download link
2. Browser opens S3 URL directly (public bucket)
3. S3 serves PNG image with `Content-Disposition: attachment`
4. File downloads as `battery_health_report.png`

### Option 2: Download PDF Report
```typescript
// In ChargingStations.tsx → handleDownloadPDF()
const pdf = new jsPDF({
  orientation: 'portrait',
  unit: 'mm',
  format: 'a4'
});

// 1. Add test date, device info (from reportModal.data)
pdf.text(`Test Date: ${reportModal.generatedAt}`, 10, 20);

// 2. Add anomaly chart
const metricsCanvas = await html2canvas(metricsEl);
const metricsImg = metricsCanvas.toDataURL('image/png');
pdf.addImage(metricsImg, 'PNG', 10, 50, 190, 80);

// 3. Add S3 image (from reportModal.aiImageUrl)
const imgEl = aiImageContainerRef.current.querySelector('img');
const aiCanvas = document.createElement('canvas');
const aiCtx = aiCanvas.getContext('2d');
aiCtx.drawImage(imgEl, 0, 0);
const aiImgData = aiCanvas.toDataURL('image/png');
pdf.addImage(aiImgData, 'PNG', 10, 140, 190, 100);

// 4. Add recommendations
pdf.text('Recommendations:', 10, 250);
reportModal.recommendations.forEach((rec, i) => {
  pdf.text(`${i + 1}. ${rec}`, 10, 260 + i * 10);
});

// 5. Save to disk
pdf.save(`battery_report_${evseId}_${connector}.pdf`);
```

**Generated PDF Contains:**
- Test metadata (date, EVSE ID, connector)
- Anomaly breakdown chart (critical/high/medium/low)
- **AI Health Report Image** (from S3 as embedded PNG)
- Recommendations
- Timestamp & signature

---

## 10. Data Access Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ 1. USER TRIGGERS REPORT GENERATION                          │
│ (ChargingStations.tsx → fetchChargerReport)                 │
└────────────────────────┬────────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. BACKEND VALIDATES REQUEST                                │
│ (generateReport.ts → Auth, Credits, Coupons)               │
│ Creates DB record: status='processing'                      │
└────────────────────────┬────────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. TRIGGER ML INFERENCE                                     │
│ POST /api/v1/inference/trigger                             │
│ Returns: job_id                                             │
└────────────────────────┬────────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. POLL ML JOB STATUS (120 second timeout)                 │
│ GET /api/v1/inference/status/{job_id}                      │
│ Returns: status, anomalies, recommendations                │
└────────────────────────┬────────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. ML SERVICE GENERATES REPORT & SAVES TO S3               │
│ S3 Path: battery-reports/{device_id}/battery_health_*     │
│ Returns: s3_path, s3_bucket                                 │
└────────────────────────┬────────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. BACKEND CONSTRUCTS S3 URL                                │
│ Format: https://battery-ml-results-test.s3.us-east-1.*    │
│ Updates DB: status='completed', s3Url, anomalies           │
└────────────────────────┬────────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 7. RETURN RESPONSE TO FRONTEND                              │
│ 200 OK: { reportId, s3Url, anomalies, recommendations }    │
└────────────────────────┬────────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 8. FRONTEND DISPLAYS REPORT MODAL                           │
│ - Shows S3 image in <img> tag                              │
│ - Displays anomalies & recommendations                      │
│ - Provides download options (PNG or PDF)                    │
└────────────────────────┬────────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 9. USER DOWNLOADS REPORT                                    │
│ Option A: Direct S3 image download                          │
│ Option B: Generate PDF (embed S3 image + metadata)         │
└─────────────────────────────────────────────────────────────┘
```

---

## 11. Environment & Configuration

### Backend Environment Variables
```bash
# ML Service Endpoint (ECS ALB)
ML_BACKEND_URL=http://zeflash-ml-alb-2095066601.us-east-1.elb.amazonaws.com

# Backend API URL (for generating report URLs)
BACKEND_API_URL=http://3.90.162.23:3001  # EC2 production

# Node Environment
NODE_ENV=production
```

### Frontend Environment Variables
```bash
# API Base URL (Vercel proxy)
VITE_API_BASE=/api/backend
VITE_API_URL=http://localhost:3001  # Dev

# ML Service URL (proxied)
VITE_ML_API_URL=/api/ml
```

---

## 12. Error Handling & Fallbacks

### No Recent Charging Data (422)
```
Status: 'failed'
Error: "Unable to generate report: No recent charging data available"
→ No credit deduction (API returns 422)
→ User can retry or contact support
```

### ML Service Timeout (500)
```
Status: 'failed'
Error: "ML job timed out after 120s"
→ Report marked as 'failed' in DB
→ User receives refund/credit back
```

### S3 Upload Failure
```
ML job completes but s3_path is missing
→ Backend constructs fallback URL:
   https://bucket.s3.region.amazonaws.com/battery-reports/{evse_id}_{connector_id}/battery_health_report.png
→ Frontend displays fallback image URL
```

### CORS/Image Loading Issues
```
Fallback in ChargingStations.tsx:
1. Try loading as <img>
2. If fails → Use html2canvas to capture DOM
3. If html2canvas fails → Show "AI image unavailable" message
```

---

## 13. Report Lifecycle in Database

### Status Transitions
```
PROCESSING ──(ML job completes)──→ COMPLETED
    ↓
    └─(ML job fails/timeout)──→ FAILED
```

### Report Record Schema
```prisma
model Report {
  id                String
  userId            String?              // Optional (null for guests)
  evseId            String              // Charger ID
  connector         Int                 // Connector port
  status            String              // 'processing' | 'completed' | 'failed'
  s3Url             String?             // Full S3 URL to report image
  anomalies         Json?               // { critical, high, medium, low }
  totalSamples      Int?
  totalAnomalies    Int?
  recommendations   Json?               // String array
  couponCode        String?             // If used
  createdAt         DateTime
  updatedAt         DateTime
}
```

---

## 14. Key Files Reference

| File | Purpose |
|------|---------|
| `backend/src/routes/generateReport.ts` | Main report generation endpoint & logic |
| `src/components/ChargingStations.tsx` | Frontend report trigger & display |
| `src/services/mlService.ts` | Frontend ML API client |
| `src/config/api.ts` | URL resolution for S3 images |
| `battery-ml-lambda/server.py` | ML service that generates reports & saves to S3 |
| `prisma/schema.prisma` | Database schema (Report model) |

---

## 15. User Journey Summary

```
1. User browses charging stations
2. Clicks "Generate AI Report" on a charger
3. Frontend validates: authenticated? credits? coupon?
4. Submits request to backend with charger details
5. Backend creates "processing" report record
6. Backend triggers ML inference job
7. Polls ML service (3s intervals, max 2 min)
8. ML analyzes charging data & generates PNG visualization
9. ML uploads PNG to S3 bucket
10. Backend receives s3_path and constructs public S3 URL
11. Backend updates report record: status='completed', s3Url
12. Backend returns response with s3Url to frontend
13. Frontend displays report in modal with S3 image
14. User can:
    - View report data (anomalies, recommendations)
    - Download S3 image directly (PNG)
    - Generate & download PDF (embeds S3 image + metadata)
15. Report persists in database for future viewing
```

---

## Summary

The **Zeflash report generation system** follows a clean separation of concerns:

1. **Frontend** (React): Handles user interaction, request triggering, UI display
2. **Backend** (Node.js/Express): Orchestrates authentication, payment, DB updates, API coordination
3. **ML Service** (Python/ECS): Performs data analysis, generates visualization, uploads to S3
4. **S3 Storage** (AWS): Stores report images with public HTTP access
5. **Database** (Prisma): Tracks report metadata and user credits

Reports are **publicly accessible** via direct S3 URLs, allowing fast downloads and embeds in PDFs without additional backend proxying. The system supports multiple payment methods (Razorpay, coupons, credits) and tracks all transactions for auditing.
