# From Local Testing to AWS Deployment - Checklist

Use this checklist when transitioning from local development to AWS production deployment.

## ✅ Pre-Deployment Checklist

### 1. Local Testing Complete
- [ ] Model works correctly on localhost:8000
- [ ] Reports generate successfully
- [ ] No errors in backend logs
- [ ] Frontend displays results correctly
- [ ] All edge cases tested

### 2. Model Files Validated
- [ ] `autoencoder_converted.h5` is optimized for production (not too large)
- [ ] `scaler.pkl` properly handles feature ranges
- [ ] `isolation_forest.pkl` has correct contamination settings  
- [ ] `config.json` has correct thresholds
- [ ] `feature_names.json` matches DynamoDB schema

### 3. Test Data Validation
- [ ] Test data covers normal operation
- [ ] Test data includes edge cases
- [ ] Test data matches DynamoDB table schema
- [ ] Feature names match exactly (case-sensitive)

### 4. Code Review
- [ ] No hardcoded AWS credentials in code
- [ ] All environment variables properly configured
- [ ] No development-only code in production paths
- [ ] Error handling appropriate
- [ ] Logging is comprehensive

---

## 🔧 Configuration Migration

### Step 1: Update Backend Configuration

**File**: `battery-ml-lambda/local-config.py`

```python
# BEFORE (Local)
ENV = "development"
USE_LOCAL_DATA = True
USE_LOCAL_STORAGE = True

# AFTER (Production)
ENV = "production"
USE_LOCAL_DATA = False          # Use DynamoDB
USE_LOCAL_STORAGE = False       # Use S3
AWS_REGION = "us-east-1"
RESULTS_BUCKET = "battery-ml-results-070872471952"
BATTERY_TABLE_NAME = "BatteryChargingData"
```

### Step 2: Update Frontend Configuration

**File**: `zeflash-new/.env.local` → `.env.production.local` (optional, or modify existing)

```env
# BEFORE (Local/Development)
VITE_ML_BACKEND_URL=auto

# AFTER (Production)
VITE_ML_BACKEND_URL=http://battery-ml-alb-1652817744.us-east-1.elb.amazonaws.com
```

Or keep `auto` and ml-proxy.js will use AWS URL for production builds.

### Step 3: Set AWS Credentials

Ensure AWS credentials are available:

```bash
# Windows
set AWS_ACCESS_KEY_ID=your_key
set AWS_SECRET_ACCESS_KEY=your_secret

# Linux/macOS
export AWS_ACCESS_KEY_ID=your_key
export AWS_SECRET_ACCESS_KEY=your_secret

# Or use AWS credentials file (~/.aws/credentials)
```

---

## 📦 Deployment Steps

### 1. Build Production Backend

```bash
cd Zipbolt/zeflash-new/battery-ml-lambda

# Install production dependencies
pip install -r requirements.txt

# Test with production config
# Set ENV=production in local-config.py first
python verify-setup.py

# Run tests
python test-integration.py
```

### 2. Build Production Frontend

```bash
cd Zipbolt/zeflash-new

# Install dependencies (if not already done)
npm install

# Build for production
npm run build

# This creates the dist/ directory
```

### 3. Deploy Backend to AWS

- **Option A**: Deploy to AWS Lambda
  - Follow `RELEASE_BUILD_GUIDE.md`
  - Use `serverless` or `AWS SAM`
  - Deploy app.py (not app_dev.py)

- **Option B**: Deploy to ECS/EC2
  - Dockerize with `Dockerfile`
  - Push to ECR (Elastic Container Registry)
  - Update load balancer

- **Option C**: Deploy to AWS AppRunner
  - Push repository
  - Configure to use original `app.py`

### 4. Deploy Frontend to AWS

- **Via Netlify** (recommended for simplicity):
  ```bash
  npm run build
  # Deploy dist/ folder
  netlify deploy --prod --dir=dist
  ```

- **Via Vercel**:
  ```bash
  npm run build
  # Deploy dist/ folder
  vercel --prod
  ```

- **Via S3 + CloudFront**:
  ```bash
  npm run build
  aws s3 sync dist/ s3://your-frontend-bucket
  ```

---

## 🔄 Migration Steps (No Downtime)

### Using Blue-Green Deployment

1. **Keep current production running** (Blue)
2. **Deploy new version** to separate environment (Green)
3. **Test Green environment** thoroughly
4. **Switch traffic** to Green
5. **Keep Blue as fallback** for 24 hours

### Implementation

```bash
# 1. Deploy new backend
# (Deploy to new stack with v2 suffix)
aws cloudformation deploy \
  --template-file backend-v2.yaml \
  --stack-name battery-ml-backend-v2

# 2. Deploy new frontend
npm run build
aws s3 sync dist/ s3://your-bucket-v2

# 3. Test new environment
curl http://battery-ml-v2.example.com/health

# 4. Update load balancer to v2
aws elbv2 modify-target-group-attribute \
  --target-group-arn arn:aws:... \
  --attributes Key=deregistration_delay.timeout_seconds,Value=300

# 5. Done!
```

---

## 📊 Verification Steps

### 1. Backend Verification

```bash
# Health check
curl https://your-production-url/health
# Should return: {"status": "ok", "mode": "production"}

# Config endpoint (might be disabled in prod)
curl https://your-production-url/config
# Should show production settings

# Generate test report
curl -X POST https://your-production-url/generate-report \
  -H "Content-Type: application/json" \
  -d '{"device_id":"test-device"}'
```

### 2. Frontend Verification

- Open production URL
- Generate a report
- Verify results display correctly
- Check browser console for errors
- Test on mobile device

### 3. Data Verification

```bash
# Verify S3 upload
aws s3 ls s3://battery-ml-results-070872471952/battery-reports/

# Verify DynamoDB access (if applicable)
aws dynamodb scan --table-name BatteryChargingData --limit 5
```

### 4. Monitoring Setup

Configure CloudWatch alerts:

```bash
# CPU usage
aws cloudwatch put-metric-alarm \
  --alarm-name battery-ml-high-cpu \
  --alarm-description "Alert if CPU > 70%" \
  --metric-name CPUUtilization \
  --threshold 70

# Error rate
aws cloudwatch put-metric-alarm \
  --alarm-name battery-ml-errors \
  --alarm-description "Alert if error rate > 5%" \
  --metric-name 4XXError \
  --threshold 50
```

---

## 🚨 Rollback Plan

If something goes wrong in production:

### Immediate Actions
1. **Scale down** new deployment
2. **Switch traffic** back to previous version (Blue)
3. **Document** what went wrong
4. **Investigation** in development environment

### Rollback Commands

```bash
# AWS CloudFormation
aws cloudformation update-stack \
  --stack-name battery-ml-backend \
  --use-previous-template

# Or manually switch ALB target group
aws elbv2 modify-target-group \
  --target-group-arn arn:aws:... \
  --targets Id=i-previous-instance-id

# Or redeploy previous version
git checkout previous-tag
./deploy-production.sh
```

---

## 📝 Documentation Updates

- [ ] Update API documentation with production URL
- [ ] Update README with production endpoint
- [ ] Document any breaking changes
- [ ] Update team wiki/knowledge base
- [ ] Create incident report (if any issues)

---

## ✨ Testing in Production

### Critical Path Testing

```bash
# 1. Generate report
curl -X POST https://prod-url/generate-report \
  -H "Content-Type: application/json" \
  -d '{"device_id":"device4"}'

# 2. Verify response
# - Status 200
# - Has image_url field
# - URL returns valid PNG

# 3. Check S3 upload
aws s3 ls s3://bucket/battery-reports/device4/

# 4. Verify report displays in UI
# (Manual test via browser)
```

### Performance Testing

```bash
# Load test backend
ab -n 100 -c 10 https://prod-url/health

# Monitor response times
# Should be < 2 seconds for /health
# Should be < 30-60 seconds for /generate-report
```

---

## 📚 Comparison: Local vs Production

| Aspect | Local | Production |
|--------|-------|-----------|
| Data Source | `local_data.json` | DynamoDB |
| Reports Store | `local_reports/` | S3 bucket |
| API Port | 8000 | 443 (HTTPS) |
| ML Backend URL | `http://localhost:8000` | AWS load balancer URL |
| Models Location | `./models/` | Docker image or Lambda layer |
| Logs | Terminal output | CloudWatch |
| Scaling | Single machine | Auto-scaling |
| High Availability | No | Yes (ALB) |

---

## 🎯 Success Criteria

✅ All boxes checked = Ready to deploy!

- [ ] Local testing passed
- [ ] Production config validated
- [ ] AWS credentials configured
- [ ] Backend deploys without errors
- [ ] Frontend builds without warnings
- [ ] Production health check passes
- [ ] Sample report generates successfully
- [ ] No sensitive data in code
- [ ] Monitoring configured
- [ ] Rollback plan documented

---

## 📞 Post-Deployment Support

### Monitoring & Alerting
- CloudWatch dashboard setup
- SNS notifications for errors
- Daily health check automation

### Maintenance
- Weekly log review
- Monthly performance analysis
- Quarterly backup verification

### Optimization
- Monitor inference latency
- Analyze P95/P99 response times
- Consider caching strategies

---

## 💡 Final Tips

1. **Test thoroughly** in local environment first
2. **Use blue-green deployment** for zero-downtime updates
3. **Keep local test data** up-to-date with production schema
4. **Monitor production** for first 24 hours
5. **Have rollback plan** ready before deployment
6. **Document any issues** encountered
7. **Update team** on deployment status

---

**You're ready to go from local testing to production! 🚀**

