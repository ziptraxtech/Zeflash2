# Frontend ML Integration Setup Guide

## Overview
The frontend AIReport component is now fully integrated with the ML inference backend to display real battery anomaly detection results.

## Components Changed

### 1. Backend Updates (`generateReport.ts`)
**Location:** `/backend/src/routes/generateReport.ts`

**Changes:**
- Enhanced ML_BACKEND_URL handling with development (localhost:8000) and production (ECS/ALB) support
- Updated response format to include anomaly breakdown:
  ```typescript
  {
    reportId: string;
    status: string;
    anomalies: { critical: number; high: number; medium: number; low: number };
    totalSamples: number;
    totalAnomalies: number;
    s3Url: string;
    evseId: string;
    connector: number;
    generatedAt: Date;
  }
  ```
- Now parses ML output and saves to database

### 2. Database Schema Updates (`schema.prisma`)
**Location:** `/backend/prisma/schema.prisma`

**New Report Fields:**
```prisma
anomalies Json?     // {"critical": 0, "high": 2, "medium": 0, "low": 10}
totalSamples Int?   // Total samples analyzed
totalAnomalies Int?  // Total anomalies detected
```

### 3. Frontend Updates (`AIReport.tsx`)
**Location:** `/src/components/AIReport.tsx`

**Key Changes:**
- Added `mlData` state to store ML inference results
- Calculate severity based on actual anomaly percentage:
  - >= 40%: "Immediate Action Required"
  - >= 25%: "Degradation Accelerating"
  - >= 10%: "Moderate Irregularities"
  - < 10%: "Stable"
- Summary now includes real anomaly percentage (e.g., "38.3%")
- Anomaly breakdown displays actual counts from ML model

**Display Flow:**
1. User clicks "Generate Report"
2. Clicks trigger POST `/generate-report` on backend
3. Backend triggers ML inference on localhost:8000 (or production ECS)
4. ML returns anomalies breakdown, samples, and S3 report URL
5. Backend saves to database and returns complete response
6. Frontend displays real anomaly data with severity and recommendations

## Environment Setup

### Required Environment Variables

**Root `.env`:**
```
DATABASE_URL="...neon..."
DIRECT_URL="...neon-direct..."
ML_BACKEND_URL="http://127.0.0.1:8000"  # Development
BACKEND_API_URL="http://localhost:3001"
```

**`backend/.env`:**
```
DATABASE_URL="...neon..."
DIRECT_URL="...neon-direct..."
ML_BACKEND_URL="http://127.0.0.1:8000"  # Development
NODE_ENV="development"
```

### Development Server Checklist

**1. ML Backend (Python FastAPI)**
```bash
cd battery-ml-lambda
python run_server_local.py
# Server runs on http://127.0.0.1:8000
```

**2. Node.js Backend**
```bash
cd backend
npm install
npx prisma db push  # Sync schema
npm run dev         # or: node dist/index.js
# Backend runs on http://localhost:3001
```

**3. Frontend (React Vite)**
```bash
npm install
npm run dev
# Frontend runs on http://localhost:5173
```

## API Data Flow

### Report Generation Request
```
POST /generate-report
{
  "evse_id": "CHARGER_001",
  "connector_id": 1,
  "email": "user@example.com"  // optional
}
```

### ML Inference Response (from localhost:8000)
```json
{
  "status": "completed",
  "anomalies": {
    "critical": 0,
    "high": 3,
    "medium": 5,
    "low": 10
  },
  "total_samples": 60,
  "total_anomalies": 8,
  "s3_path": "battery-reports/...",
  "s3_bucket": "battery-ml-results-..."
}
```

### Backend Response to Frontend
```json
{
  "reportId": "cuid...",
  "status": "completed",
  "anomalies": {
    "critical": 0,
    "high": 3,
    "medium": 5,
    "low": 10
  },
  "totalSamples": 60,
  "totalAnomalies": 8,
  "s3Url": "https://s3.../report.png",
  "evseId": "CHARGER_001",
  "connector": 1,
  "generatedAt": "2026-02-25T10:30:00Z"
}
```

## Frontend Display Logic

### Severity Calculation
```typescript
const anomalyPercentage = (totalAnomalies / totalSamples) * 100;

if (anomalyPercentage >= 40) {
  severity = "Immediate Action Required";
} else if (anomalyPercentage >= 25) {
  severity = "Degradation Accelerating";
} else if (anomalyPercentage >= 10) {
  severity = "Moderate Irregularities";
} else {
  severity = "Stable";
}
```

### Sample Display
- **Executive Summary:** Shows real anomaly percentage
- **Risk Snapshot:** Displays actual anomaly breakdown (critical, high, medium, low)
- **Anomaly Summary:** Shows total count and breakdown grid
- **Recommended Actions:** Dynamically generated based on severity
- **ML Report Images:** From S3 (current, voltage, temperature analysis charts)

## Testing the Integration

### 1. Verify ML Server is Running
```bash
# Should return 200 OK
curl http://127.0.0.1:8000/api/v1/inference/status/test-job
```

### 2. Test Backend Connection
```bash
# Check generateReport route
curl -X POST http://localhost:3001/generate-report \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"evse_id": "TEST_001", "connector_id": 1}'
```

### 3. Test Frontend UI
1. Navigate to `/report/TEST_001_1` in browser
2. Click "Generate Report"
3. Wait for inference (typically 30-120s)
4. Verify real anomaly data displays (not mock percentages)

## Known Limitations & Next Steps

### Current Limitations
- ⚠️ Mock chart data in "Recent Performance Window" section
- ⚠️ "Professional Verdict" section still uses blurred content
- ⚠️ Some sections locked behind "Unlock" buttons (disabled)

### Planned Enhancements
1. Replace mock charts with real inference data
2. Add real-time performance window visualization
3. Enable detailed analyst notes section
4. Add real device telemetry integration
5. Implement anomaly deep-dive analysis

## Deployment Considerations

### For Production
1. Update `ML_BACKEND_URL` to production ECS/ALB endpoint
2. Ensure AWS credentials are configured (S3 access for reports)
3. Set `NODE_ENV=production`
4. Use production database (Neon production URL)
5. Configure proper error handling and logging

### Security
- ✅ Bearer token authentication on `/generate-report`
- ✅ Credit validation before ML call
- ✅ User isolation (credits deducted before inference)
- ✅ S3 URL CORS properly configured

## Support

For issues with:
- **ML Model:** Check `/battery-ml-lambda/LOCAL_TEST_REPORT.md`
- **Database:** Verify Neon connection string format
- **API Integration:** Check browser DevTools Network tab for response details
