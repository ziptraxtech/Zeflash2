# Inference Results Storage System

A complete system to store and manage real-time ML inference results for all EVSE devices in Neon PostgreSQL database.

## Architecture Overview

```
ML Inference Pipeline (Python/FastAPI)
    ↓
Runs inference, generates PNG chart
    ↓
Returns standardized JSON:
{
  "device_id": "FLX_HDCHIN22_1",
  "evse_id": "FLX_HDCHIN22",
  "connector_id": 1,
  "status": "Stable",
  "anomalies": {...},
  "total_samples": 25,
  "total_anomalies": 12,
  "generated_at": "2026-03-13T10:30:45...",
  "data_points": 25,
  "s3_url": "https://...",
  "s3_key": "battery-reports/...",
  "timing": {
    "inference_time_ms": 250,
    "total_time_ms": 1200
  }
}
    ↓
Saves to Neon DB (via Backend API)
    ↓
Available via REST API endpoints
```

## Database Schema

### InferenceResult Table

```prisma
model InferenceResult {
  id                String   @id @default(cuid())
  deviceId          String   @unique
  evseId            String   @index
  connectorId       Int
  status            String
  anomalies         Json     // {"critical": 0, "high": 2, "medium": 0, "low": 10}
  totalSamples      Int
  totalAnomalies    Int
  generatedAt       DateTime
  dataPoints        Int
  s3Url             String
  s3Key             String
  timing            Json     // {"inference_time_ms": 250, "total_time_ms": 1200}
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([evseId])
  @@index([updatedAt])
}
```

## Setup Instructions

### 1. Database Migration

```bash
# Apply migration to create InferenceResult table
npx prisma migrate deploy

# Or create new migration if needed
npx prisma migrate dev --name add_inference_results
```

### 2. Environment Variables

Set in `.env` or `.env.local`:

```env
# Backend API URL (for ML service to call)
BACKEND_API_URL=http://localhost:3001
# OR for production
BACKEND_API_URL=https://zeflash-backend.production.com
```

### 3. Start Backend

```bash
cd backend
npm install
npm start
# Runs on http://localhost:3001
```

### 4. Start ML Service

```bash
cd battery-ml-lambda
python server.py
# Runs on http://localhost:8000
```

## API Endpoints

### Save Inference Result

**POST** `/api/inference/results`

Save a new inference result or update existing one (upsert).

```bash
curl -X POST http://localhost:3001/api/inference/results \
  -H "Content-Type: application/json" \
  -d '{
    "device_id": "FLX_HDCHIN22_1",
    "evse_id": "FLX_HDCHIN22",
    "connector_id": 1,
    "status": "Stable",
    "anomalies": {"critical": 0, "high": 2, "medium": 0, "low": 10},
    "total_samples": 25,
    "total_anomalies": 12,
    "generated_at": "2026-03-13T10:30:45.123456+00:00",
    "data_points": 25,
    "s3_url": "https://...",
    "s3_key": "battery-reports/FLX_HDCHIN22_1/...",
    "timing": {"inference_time_ms": 250, "total_time_ms": 1200}
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Inference result saved successfully",
  "data": { ...InferenceResult }
}
```

---

### Get All Inference Results

**GET** `/api/inference/results?evse_id=FLX_HDCHIN22&status=Stable&limit=100&offset=0`

Fetch all inference results with optional filters.

```bash
curl http://localhost:3001/api/inference/results
```

**Query Parameters:**
- `evse_id` - Filter by EVSE ID (optional)
- `status` - Filter by status (optional)
- `limit` - Results per page (default: 100)
- `offset` - Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "data": [
    { ...InferenceResult },
    { ...InferenceResult }
  ],
  "pagination": {
    "total": 245,
    "limit": 100,
    "offset": 0
  }
}
```

---

### Get Specific Inference Result

**GET** `/api/inference/results/:device_id`

Get a single inference result by device ID.

```bash
curl http://localhost:3001/api/inference/results/FLX_HDCHIN22_1
```

**Response:**
```json
{
  "success": true,
  "data": { ...InferenceResult }
}
```

---

### Get EVSE Results

**GET** `/api/inference/evse/:evse_id?limit=50&offset=0`

Get all inference results for a specific EVSE across all connectors.

```bash
curl http://localhost:3001/api/inference/evse/FLX_HDCHIN22
```

**Response:**
```json
{
  "success": true,
  "data": [
    { ...InferenceResult for connector 1 },
    { ...InferenceResult for connector 2 }
  ],
  "pagination": {
    "total": 42,
    "limit": 50,
    "offset": 0
  }
}
```

---

### Get Statistics

**GET** `/api/inference/stats`

Get aggregate statistics on all inference results.

```bash
curl http://localhost:3001/api/inference/stats
```

**Response:**
```json
{
  "success": true,
  "stats": {
    "totalInferences": 1245,
    "statusBreakdown": [
      { "status": "Stable", "count": 1100 },
      { "status": "Degradation Detected", "count": 145 }
    ],
    "latestResults": [
      { ...InferenceResult },
      { ...InferenceResult }
    ]
  }
}
```

---

### Delete Inference Result

**DELETE** `/api/inference/results/:device_id`

Delete a specific inference result.

```bash
curl -X DELETE http://localhost:3001/api/inference/results/FLX_HDCHIN22_1
```

**Response:**
```json
{
  "success": true,
  "message": "Inference result deleted successfully",
  "data": { ...InferenceResult }
}
```

---

## Triggering Inference from Frontend

### Frontend Request (React)

```typescript
const triggerInference = async (evseId: string, connectorId: number) => {
  // 1. Trigger ML inference via FastAPI
  const response = await fetch('http://localhost:8000/api/v1/infer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      evse_id: evseId,
      connector_id: connectorId,
      limit: 100
    })
  });

  const data = await response.json();
  
  // Data automatically saved to database in background
  // Now fetch from database to display
  
  return data;
};

// Display the results
const displayResults = async (deviceId: string) => {
  const response = await fetch(
    `http://localhost:3001/api/inference/results/${deviceId}`
  );
  const { data } = await response.json();
  
  // Render chart, metrics, etc.
  renderChart(data.s3_url);
  renderMetrics(data);
};
```

---

## Auto-Saving to Database

When you call `/api/v1/infer` endpoint in the ML service:

1. ✅ Inference runs
2. ✅ JSON result generated
3. ✅ **Automatically saved to Neon DB** (non-blocking)
4. ✅ Response returned immediately
5. ✅ Data available via `/api/inference/results/:device_id`

No additional code needed on your end!

---

## Historical Data & Trends

### Query Latest 24 Hours

```bash
curl "http://localhost:3001/api/inference/evse/FLX_HDCHIN22?limit=500" | jq '.data[] | select(.generatedAt > "2026-03-12T10:30:00Z")'
```

### Query by Status

```bash
curl "http://localhost:3001/api/inference/results?status=Degradation%20Detected&limit=50"
```

### Export to CSV/JSON

```bash
# Get all results and export
curl "http://localhost:3001/api/inference/results?limit=10000" | jq '.data' > export.json
```

---

## Performance Optimization

The database includes strategic indexes:
- ✅ `evseId_idx` - Fast filtering by EVSE
- ✅ `updatedAt_idx` - Fast time-range queries
- ✅ `deviceId` UNIQUE - Fast single-record lookups

### Example Fast Queries

```sql
-- Get latest result for EVSE
SELECT * FROM "InferenceResult" 
WHERE "evseId" = 'FLX_HDCHIN22' 
ORDER BY "updatedAt" DESC 
LIMIT 1;

-- Get results in last 7 days
SELECT * FROM "InferenceResult" 
WHERE "updatedAt" > NOW() - INTERVAL '7 days';

-- Status distribution
SELECT status, COUNT(*) 
FROM "InferenceResult" 
GROUP BY status;
```

---

## Troubleshooting

### Results not saving to database?

Check:
1. Backend is running: `curl http://localhost:3001/health`
2. Database connection: Check `BACKEND_API_URL` env var
3. Neon DB accessible: Check `DATABASE_URL` in backend `.env`

### Migration failed?

```bash
# Reset schema (data loss!)
npx prisma migrate reset

# Or manually apply migration
psql $DATABASE_URL < prisma/migrations/20260313_add_inference_results/migration.sql
```

### Query slow?

Add indexes:
```bash
npx prisma db execute --stdin < add_indexes.sql
```

---

## Next Steps

1. ✅ Run migrations to create table
2. ✅ Start backend and ML services
3. ✅ Test `/api/v1/infer` endpoint
4. ✅ Verify data saved in database
5. ✅ Build frontend dashboard to display results
6. ✅ Schedule periodic inference jobs for all EVSEs
