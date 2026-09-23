# ✅ PAYMENT FIX DEPLOYMENT GUIDE

## Summary of Payment Amount Fix

All plan pricing is now **correctly mapped** to show the exact same amount on checkout page and Razorpay:

| Plan | Base Price | + GST (18%) | Razorpay Charges | User Sees |
|------|-----------|-----------|-----------------|-----------|
| **Trial** | ₹199 | ₹235 | 23,500 paise | ₹235 ✅ |
| **Core** | ₹1,499 | ₹1,769 | 176,900 paise | ₹1,769 ✅ |
| **Premium** | ₹2,499 | ₹2,949 | 294,900 paise | ₹2,949 ✅ |
| **Elite** | ₹4,999 | ₹5,899 | 589,900 paise | ₹5,899 ✅ |

---

## Deployment Instructions

### Option 1: Automatic Deployment (Recommended)

If you have SSH access to EC2, run:

```bash
./deploy-backend-ec2.sh
```

**Requirements:**
- SSH key file at `~/.ssh/zeflash-backend.pem` 
- Or set environment variable: `export EC2_KEY=/path/to/your/key.pem`

### Option 2: Manual Deployment

SSH into your EC2 instance:

```bash
ssh -i your-key.pem ec2-user@3.90.162.23
```

Then run:

```bash
cd /home/ec2-user/zeflash-backend
git fetch origin
git reset --hard origin/main
docker-compose -f docker-compose-ec2.yml down
docker build -t battery-ml:ec2-backend ./backend
docker-compose -f docker-compose-ec2.yml up -d
```

### Option 3: GitHub Actions Auto-Deploy

To enable auto-deployment on every push to main:

1. Go to GitHub Repository Settings → Secrets
2. Add these secrets:
   - `EC2_BACKEND_HOST`: `3.90.162.23`
   - `EC2_BACKEND_USER`: `ec2-user`
   - `EC2_BACKEND_KEY`: (your private SSH key)

The workflow `.github/workflows/deploy-backend-ec2.yml` will automatically deploy on push.

---

## Verification

After deployment, verify the backend is running:

```bash
# Check container status
docker-compose -f docker-compose-ec2.yml ps

# View logs
docker logs -f zeflash-backend

# Test health check
curl http://3.90.162.23:3000/health
```

---

## Backend Details

- **Backend URL**: `http://zeflash-backend-api-347575614.us-east-1.elb.amazonaws.com`
- **EC2 Instance**: `3.90.162.23:3000`
- **AWS Region**: `us-east-1`
- **Docker Image**: `070872471952.dkr.ecr.us-east-1.amazonaws.com/battery-ml:ec2-backend`
- **Docker Container**: `zeflash-backend`
- **Port**: `3000`

---

## Payment Flow

### Frontend (Checkout Page)
1. User clicks "Pay ₹2,949" on Premium plan card
2. Frontend sends: `{ planName: 'premium', credits: 6, months: 12 }`

### Backend (createOrder.ts)
1. Looks up: `PLAN_PACKS['premium'].price = 2499` (base)
2. Calculates: `totalWithGst(2499) = Math.round(2499 × 1.18) = 2949` (rupees)
3. Converts: `toPaise(2949) = 294900` (paise for Razorpay)
4. Returns: `{ amount: 2949, orderId: '...' }` (rupees to frontend)

### Frontend (Razorpay Modal)
1. Receives: `amount: 2949` (rupees)
2. Razorpay modal shows: **₹2,949** ✅
3. User pays: **₹2,949** ✅
4. Razorpay creates order with: **294,900 paise** ✅

---

## Code Files Modified

- ✅ `backend/src/lib/razorpay.ts` - Plan pricing definitions
- ✅ `backend/src/routes/createOrder.ts` - Order creation logic
- ✅ `src/components/PlanCheckout.tsx` - Frontend payment flow
- ✅ `src/hooks/useAIReportPayment.ts` - AI report payment
- ✅ `src/config/pricing.ts` - Frontend pricing config

---

## Troubleshooting

### Issue: Razorpay still shows wrong amount

**Solution**: Backend hasn't been redeployed yet
1. SSH into EC2
2. Run the deployment commands above
3. Check logs: `docker logs -f zeflash-backend`

### Issue: Docker image build fails

**Solution**: Rebuild with verbose output
```bash
docker build --no-cache -t battery-ml:ec2-backend ./backend
```

### Issue: Container won't start

**Solution**: Check logs and environment variables
```bash
docker logs zeflash-backend
docker-compose -f docker-compose-ec2.yml config
```

---

## Commit History

- `86c8831` - Add EC2 backend deployment scripts
- `ca69065` - Add detailed logging to trace exact payment calculations
- `9f14582` - Fix: Remove amount field from Razorpay options when using order_id
- `f05891a` - Add detailed logging for plan price calculation
- `c370b07` - Fix payment validation: remove price mismatch check
- `c4a1e44` - Fix: Restore paise conversion for Razorpay API

---

**Status**: ✅ All code changes complete and pushed to GitHub. Ready for EC2 backend deployment.
