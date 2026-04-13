# Quick Reference Card - ML Integration

## ⚡ Commands

### Start Services
```bash
# ML Backend (Python, Port 8000)
cd battery-ml-lambda && python run_server_local.py

# Node Backend (Express, Port 3001)
cd backend && npm run dev

# Frontend (React Vite, Port 5173)
npm run dev
```

### Database
```bash
# Apply schema changes
cd backend && npx prisma db push

# View latest report
npm run prisma -- studio
```

### Testing
```bash
# ML health check
curl http://127.0.0.1:8000/api/v1/inference/status/test

# Backend health
curl http://localhost:3001/health

# Generate test report
curl -X POST http://localhost:3001/generate-report \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"evse_id":"TEST","connector_id":1}'
```

---

## 🔧 Configuration

### Environment Variables
| Var | Dev Value | Prod Value |
|-----|-----------|-----------|
| `DATABASE_URL` | Neon pooler | Neon pooler |
| `DIRECT_URL` | Neon direct | Neon direct |
| `ML_BACKEND_URL` | `http://127.0.0.1:8000` | `https://...-alb.aws.amazonaws.com` |
| `BACKEND_API_URL` | `http://localhost:3001` | `https://api.zeflash.app` |
| `NODE_ENV` | `development` | `production` |

### File Locations
| Purpose | Dev | Prod |
|---------|-----|------|
| Root Config | `.env` | CloudFormation/Secrets |
| Backend Config | `backend/.env` | ECS Task Env |
| Frontend Config | `.env` (Vite) | Build-time env |

---

## 📊 Data Schema - Report Table

```sql
Report {
  id: String (PK)
  userId: String (FK→User)
  evseId: String
  connector: Int
  status: String ('processing'|'completed'|'failed')
  
  -- NEW ML Fields
  anomalies: JSON {
    critical: Int,
    high: Int,
    medium: Int,
    low: Int
  }
  totalSamples: Int
  totalAnomalies: Int
  
  s3Url: String?
  createdAt: DateTime
  updatedAt: DateTime
}
```

---

## 🎯 API Endpoints

### Frontend → Backend
```
POST /generate-report
├─ Input: {evse_id, connector_id, email?}
├─ Auth: Bearer token
├─ Cost: 1 credit
└─ Response: {reportId, anomalies, totalSamples, totalAnomalies, s3Url, ...}

GET /reports
├─ Auth: Bearer token
└─ Response: {reports: Report[]}
```

### Backend → ML Backend
```
POST /api/v1/inference/trigger
├─ Input: {evse_id, connector_id, limit}
└─ Response: {job_id}

GET /api/v1/inference/status/{job_id}
└─ Response: {status, result?: {...}}
```

---

## 🚨 Common Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| "ML job timed out" | ML service not running | `python run_server_local.py` |
| "Can't find DIRECT_URL" | Missing in `.env` | Add Neon direct URL to `.env` |
| Port 8000 in use | Another process | `lsof -i :8000 && kill PID` |
| Mock data showing | Frontend not updated | Clear cache, reload component |
| Database drift | Schema mismatch | `npx prisma db push` |

---

## 🧮 Severity Calculation

```
Anomaly Percentage = (totalAnomalies / totalSamples) * 100

≥ 40% → "Immediate Action Required" (Red)
≥ 25% → "Degradation Accelerating" (Yellow)
≥ 10% → "Moderate Irregularities" (Yellow)
<  10% → "Stable" (Green)
```

### Example
- totalAnomalies = 23
- totalSamples = 60
- Percentage = 38.3% → "Degradation Accelerating"

---

## 💾 Component Hierarchy

```
AIReport.tsx
├─ Uses: AIReport (interface)
├─ State: mlData, s3Url, generating, genError
├─ Side Effect: useEffect (load report on mount)
├─ Memo: data (calculate severity)
├─ Methods: 
│  └─ handleExportPDF, handleComingSoon
└─ Children:
   ├─ CreditsWallet
   ├─ CurrentChart
   └─ TemperatureChart
```

---

## 📈 Performance Baseline

| Operation | Time |
|-----------|------|
| ML Inference | 15-60s |
| Feature Engineering | 2-5s |
| IsolationForest | 10-50s |
| S3 Upload | 2-5s |
| Database Write | 0.05-0.1s |
| **Total** | **30-120s** |

---

## 🔐 Security Checklist

- ✅ Bearer token required for `/generate-report`
- ✅ Credits checked before trigger
- ✅ User isolation (own reports only)
- ✅ S3 results authenticated
- ✅ No PII in anomaly data
- ✅ All inputs validated

---

## 📱 Frontend Component State Tree

```
AIReport Component
├─ generating: Boolean (true during processing)
├─ s3Url: String | null (report download link)
├─ genError: String | null (error message)
├─ mlData: {
│  ├─ anomalies: {critical, high, medium, low}
│  ├─ totalSamples: Int
│  ├─ totalAnomalies: Int
│  └─ generatedAt: String (ISO date)
├─ data: DeviceAIReport (computed from mlData)
│  ├─ status: String (severity)
│  ├─ summary: String (description)
│  ├─ recommended_actions: String[]
│  └─ anomalies: {total, breakdown}
└─ Effects:
   └─ useEffect: Load report on mount
```

---

## 🚀 Deployment Checklist

### Pre-Deployment
- [ ] All tests passing
- [ ] No TypeScript errors
- [ ] Environment variables set
- [ ] Database migrated
- [ ] ML model tested in ECS

### Deployment
- [ ] Update `ML_BACKEND_URL` in backend
- [ ] Update `DATABASE_URL` to production
- [ ] Set `NODE_ENV=production`
- [ ] Deploy backend docker image
- [ ] Deploy frontend to CDN
- [ ] Run smoke tests

### Post-Deployment
- [ ] Monitor error rates
- [ ] Check inference times
- [ ] Verify S3 uploads
- [ ] Test report generation end-to-end

---

## 📚 File Reference

| File | Purpose |
|------|---------|
| `/backend/src/routes/generateReport.ts` | ML orchestration |
| `/src/components/AIReport.tsx` | Frontend UI |
| `/backend/prisma/schema.prisma` | Database schema |
| `/backend/.env` | Backend config |
| `/.env` | Root config |
| `/battery-ml-lambda/run_server_local.py` | ML server entry point |

---

## 🎓 Tutorial: Add a New Feature

**Example:** Show user's anomaly trend over time

1. **Backend**: Add `trend` field to API response
   ```typescript
   // In generateReport.ts
   trend: await getPreviousReportsForUser(userId)
   ```

2. **Database**: Store anomaly history (already have total data)
   ```sql
   SELECT DATE(createdAt), AVG(totalAnomalies::float / totalSamples) 
   FROM Report GROUP BY DATE(createdAt)
   ```

3. **Frontend**: Display trend chart
   ```tsx
   <TrendChart data={data.trend} />
   ```

---

## 🐛 Debug Mode

### Enable Verbose Logging
```bash
# Backend
DEBUG=* npm run dev

# ML Backend
export DEBUG=True && python run_server_local.py
```

### Browser DevTools
1. Open Developer Tools (F12)
2. Network tab → Check POST `/generate-report` response
3. Console → Check for fetch errors
4. React DevTools → Inspect mlData state

### Database Query
```sql
-- Last 5 reports
SELECT * FROM "Report" 
ORDER BY createdAt DESC 
LIMIT 5;

-- Check anomaly data
SELECT id, anomalies, totalAnomalies 
FROM "Report" 
WHERE status = 'completed' 
LIMIT 1 \gx
```

---

**Last Updated**: 2026-02-25
**Quick Reference v1.0**
