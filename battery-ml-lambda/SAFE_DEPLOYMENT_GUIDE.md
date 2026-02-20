# Safe ECS Deployment - Test Without Affecting Live Site

## Your Concerns Addressed

### Q1: Will deploying to the same ECS cluster affect the live website?

**Answer: NO** - ECS clusters are just logical groupings. Multiple services run independently within a cluster.

**What makes services independent:**
- ✅ **Service Name** - Each service has unique name (e.g., `battery-ml-service-test` vs `website-service`)
- ✅ **Network isolation** - Each service gets its own network interface and IP
- ✅ **Resource isolation** - CPU/memory allocated per service
- ✅ **Task definition** - Each service uses its own task definition

**Example cluster with multiple services:**
```
ml-cluster/
  ├── battery-ml-service-test    ← Your ML API (port 8000)
  ├── website-backend-service     ← Live website API (port 3000)
  └── admin-service               ← Admin panel (port 4000)
```

Each runs completely independently!

---

### Q2: Should I use a different S3 bucket for testing?

**Answer: YES - HIGHLY RECOMMENDED**

**Why:**
- ✅ Avoids overwriting live images
- ✅ Can test freely without risk
- ✅ Easy to compare test vs production outputs
- ✅ Can delete test bucket when done

**Recommended approach:**

**Testing Phase:**
```
S3 Bucket: battery-ml-results-test
ENV: S3_BUCKET=battery-ml-results-test
Service: battery-ml-service-test
```

**Production (after testing):**
```
S3 Bucket: battery-ml-results-070872471952 (existing production bucket)
ENV: S3_BUCKET=battery-ml-results-070872471952
Service: battery-ml-service (production)
```

---

### Q3: Will this approach affect cost?

**Cost Breakdown:**

**During Testing (both running):**
```
Live Website Service:        $XX/month (already paying)
Test ML Service:            $35-45/month (additional)
Test S3 Bucket:             $0.02/month (negligible)
                            ─────────────
Total Additional:           $35-47/month
```

**After Migration (test → production):**
```
Live Website Service:        $XX/month (same)
Production ML Service:      $35-45/month (replaces test)
S3 Storage:                 $0.02/month (minimal increase)
                            ─────────────
Total Additional:           $35-47/month (same as test)
```

**Cost-saving tip:** Once production is verified, DELETE the test service to stop charges:
```powershell
aws ecs delete-service --cluster ml-cluster --service battery-ml-service-test --force
```

---

## 🎯 Recommended Safe Deployment Plan

### Phase 1: Setup Test Environment (No Risk to Live)

#### 1.1 Create Test S3 Bucket
```powershell
# Create test bucket
aws s3 mb s3://battery-ml-results-test --region us-east-1

# Copy CORS configuration from production
aws s3api get-bucket-cors --bucket battery-ml-results-070872471952 > cors-config.json
aws s3api put-bucket-cors --bucket battery-ml-results-test --cors-configuration file://cors-config.json

# Copy bucket policy (modify bucket name)
aws s3api get-bucket-policy --bucket battery-ml-results-070872471952 > bucket-policy.json

# Edit bucket-policy.json - Change bucket name to battery-ml-results-test
# Then apply:
aws s3api put-bucket-policy --bucket battery-ml-results-test --policy file://bucket-policy.json

# Enable public read access
aws s3api put-public-access-block --bucket battery-ml-results-test --public-access-block-configuration "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false"
```

#### 1.2 Update Configuration Files

**Update task-definition.json** (for test):
```json
{
  "family": "battery-ml-task-test",
  "taskRoleArn": "arn:aws:iam::070872471952:role/ecsTaskExecutionRole",
  "executionRoleArn": "arn:aws:iam::070872471952:role/ecsTaskExecutionRole",
  "networkMode": "awsvpc",
  "cpu": "1024",
  "memory": "2048",
  "requiresCompatibilities": ["FARGATE"],
  "containerDefinitions": [
    {
      "name": "battery-ml-container-test",
      "image": "070872471952.dkr.ecr.us-east-1.amazonaws.com/battery-ml:test",
      "portMappings": [
        {
          "containerPort": 8000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "AWS_DEFAULT_REGION",
          "value": "us-east-1"
        },
        {
          "name": "S3_BUCKET",
          "value": "battery-ml-results-test"
        },
        {
          "name": "S3_PREFIX",
          "value": "battery-reports/"
        },
        {
          "name": "TOKEN_ENDPOINT",
          "value": "https://cms.charjkaro.in/admin/api/v1/zipbolt/token"
        },
        {
          "name": "API_BASE_URL",
          "value": "https://uat.cms.gaadin.live/commands/secure/api/v1/get/charger/time_lapsed"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/battery-ml-test",
          "awslogs-create-group": "true",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs-test"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:8000/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
```

**Save as:** `task-definition-test.json`

**Keep original:** `task-definition.json` (for future production)

#### 1.3 Update IAM Policy for Test Bucket

**Create:** `ecs-s3-policy-test.json`
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:PutObjectAcl",
        "s3:GetObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::battery-ml-results-test",
        "arn:aws:s3:::battery-ml-results-test/*"
      ]
    }
  ]
}
```

**Apply:**
```powershell
# Create policy
aws iam create-policy \
  --policy-name BatteryMLS3AccessTest \
  --policy-document file://ecs-s3-policy-test.json

# Attach to role
aws iam attach-role-policy \
  --role-name ecsTaskExecutionRole \
  --policy-arn arn:aws:iam::070872471952:policy/BatteryMLS3AccessTest
```

#### 1.4 Deploy Test Service

```powershell
# Build and push with "test" tag
docker build -t battery-ml:test .
docker tag battery-ml:test 070872471952.dkr.ecr.us-east-1.amazonaws.com/battery-ml:test
docker push 070872471952.dkr.ecr.us-east-1.amazonaws.com/battery-ml:test

# Register test task definition
aws ecs register-task-definition --cli-input-json file://task-definition-test.json

# Create test service (use same cluster but different service name)
aws ecs create-service \
  --cluster ml-cluster \
  --service-name battery-ml-service-test \
  --task-definition battery-ml-task-test \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-XXXXX,subnet-YYYYY],securityGroups=[sg-XXXXXXXX],assignPublicIp=ENABLED}"
```

---

### Phase 2: Test Thoroughly (Parallel to Live)

```powershell
# Get test service URL
aws ecs list-tasks --cluster ml-cluster --service-name battery-ml-service-test

# Test health
curl http://<TEST_SERVICE_IP>:8000/health

# Test inference
curl -X POST http://<TEST_SERVICE_IP>:8000/api/v1/inference \
  -H "Content-Type: application/json" \
  -d '{"evse_id":"122300103C03183","connector_id":1,"limit":60}'

# Verify images in TEST bucket
aws s3 ls s3://battery-ml-results-test/battery-reports/ --recursive

# Compare test vs production
# Test:       https://battery-ml-results-test.s3.amazonaws.com/battery-reports/...
# Production: https://battery-ml-results-070872471952.s3.amazonaws.com/battery-reports/...
```

---

### Phase 3: Migrate to Production (After Testing)

Once you're confident everything works:

#### Option A: Update Test Service to Use Production Bucket

```powershell
# Update task-definition-test.json
# Change: S3_BUCKET from "battery-ml-results-test" to "battery-ml-results-070872471952"

# Register updated task
aws ecs register-task-definition --cli-input-json file://task-definition-test.json

# Update service
aws ecs update-service \
  --cluster ml-cluster \
  --service battery-ml-service-test \
  --task-definition battery-ml-task-test \
  --force-new-deployment
```

#### Option B: Create Production Service (Clean Slate)

```powershell
# Change task-definition.json to use production bucket
# Deploy as battery-ml-service (production)

aws ecs register-task-definition --cli-input-json file://task-definition.json

aws ecs create-service \
  --cluster ml-cluster \
  --service-name battery-ml-service \
  --task-definition battery-ml-task \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-XXXXX,subnet-YYYYY],securityGroups=[sg-XXXXXXXX],assignPublicIp=ENABLED}"

# Once verified, delete test service
aws ecs update-service --cluster ml-cluster --service battery-ml-service-test --desired-count 0
aws ecs delete-service --cluster ml-cluster --service battery-ml-service-test --force

# Delete test bucket (optional)
aws s3 rb s3://battery-ml-results-test --force
```

---

### Phase 4: Update Frontend

**Before (testing):**
```typescript
const ML_API_URL = "http://<TEST_IP>:8000";
```

**After (production):**
```typescript
const ML_API_URL = "http://<PROD_IP>:8000";
// OR with load balancer
const ML_API_URL = "https://api.zeflash.com";
```

---

## 🛡️ Safety Checklist

### Before Deployment
- [ ] Test service uses different name: `battery-ml-service-test`
- [ ] Test bucket created: `battery-ml-results-test`
- [ ] IAM policy includes test bucket permissions
- [ ] Task definition uses test bucket in S3_BUCKET env var
- [ ] Docker image tagged as `:test`

### During Testing
- [ ] Health endpoint returns 200
- [ ] Inference API works
- [ ] Images appear in TEST S3 bucket
- [ ] Images DO NOT appear in production bucket
- [ ] Live website still works normally
- [ ] Check logs: `/ecs/battery-ml-test`

### Before Going Live
- [ ] All tests passing
- [ ] Images look correct
- [ ] Anomaly detection reasonable
- [ ] Performance acceptable
- [ ] Frontend can access images

### After Migration
- [ ] Production service deployed
- [ ] Frontend updated to production URL
- [ ] Test service stopped/deleted
- [ ] Test bucket deleted (optional - can keep for future testing)
- [ ] Monitor costs

---

## 📊 Cost Comparison

### Option 1: Test Then Delete (Recommended)
```
Week 1-2 (Testing):     $35 (test service)
Week 3+ (Production):   $35 (production service)
Total/month:            $35-40
```

### Option 2: Keep Both (Not Recommended)
```
Ongoing:                $70 (both services)
Only if you need:       - Blue/green deployment
                       - A/B testing
                       - Staging environment
```

### Option 3: Test Locally Then Deploy (Alternative)
```
Cost:                   $0 (testing)
Downside:               Must configure local S3 access
```

---

## 🎬 Quick Commands for Safe Deployment

### Create Test Environment
```powershell
# 1. Create test bucket
aws s3 mb s3://battery-ml-results-test --region us-east-1

# 2. Copy configuration from existing
Get-Content task-definition.json | ForEach-Object {
    $_ -replace 'battery-ml-task', 'battery-ml-task-test' `
       -replace 'battery-ml-container', 'battery-ml-container-test' `
       -replace 'battery-ml-results-070872471952', 'battery-ml-results-test' `
       -replace 'battery-ml:', 'battery-ml:test' `
       -replace '/ecs/battery-ml', '/ecs/battery-ml-test'
} | Set-Content task-definition-test.json

# 3. Build and deploy test
docker build -t battery-ml:test .
docker tag battery-ml:test 070872471952.dkr.ecr.us-east-1.amazonaws.com/battery-ml:test
docker push 070872471952.dkr.ecr.us-east-1.amazonaws.com/battery-ml:test
aws ecs register-task-definition --cli-input-json file://task-definition-test.json
```

### Check Both Services
```powershell
# List all services in cluster
aws ecs list-services --cluster ml-cluster

# Should see:
# - battery-ml-service-test (your new ML service)
# - website-service (or whatever your live site is called)
```

### Cleanup After Migration
```powershell
# Stop test service
aws ecs update-service --cluster ml-cluster --service battery-ml-service-test --desired-count 0

# Delete test service
aws ecs delete-service --cluster ml-cluster --service battery-ml-service-test --force

# Delete test bucket (optional)
aws s3 rb s3://battery-ml-results-test --force
```

---

## ✅ Summary: Yes, Your Approach is Perfect!

**Your plan:**
1. ✅ Deploy to same ECS cluster (different service name)
2. ✅ Use different S3 bucket for testing
3. ✅ Test thoroughly
4. ✅ Switch to production bucket when ready
5. ✅ Delete test resources

**This is the CORRECT way to do it!**

**Risk to live site:** ⚪ **ZERO** - Services are isolated

**Cost during testing:** 💰 **+$35/month** (just for test service)

**Cost after migration:** 💰 **+$35/month** (same, just the ML service)

---

## Need Help?

Run into any issues during deployment? Let me know which phase you're on!
