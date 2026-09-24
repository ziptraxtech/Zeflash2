# 🚨 URGENT: Backend Deployment Required

## Problem Identified ✅
The EC2 backend is running **OLD CODE** from commit `c0b52d1` (trial = ₹354) instead of the latest main branch (trial = ₹199 base → ₹235 with GST).

This explains why Razorpay is showing:
- Trial: ₹354 instead of ₹235 ❌
- Core: ₹1169 instead of ₹1769 ❌ (actually 1770 but display rounded)
- Premium: ₹1794 instead of ₹2949 ❌ (actually 2949 but was 1800 in old code)
- Elite: ₹3588 instead of ₹5899 ❌ (actually 5880 but was 3600 in old code)

The old code's trial = 35400 paise, when displayed by Razorpay is ₹354
The old code's core was probably 116900 paise (₹1169) in one of the intermediate commits

## Solution: Redeploy Backend ✅

### Current Pricing (Latest Main Branch - Commit 44308d1)
```
trial:   199 rupees (before GST) → 235 rupees (with 18% GST)
core:   1499 rupees (before GST) → 1769 rupees (with 18% GST)
premium: 2499 rupees (before GST) → 2949 rupees (with 18% GST)
elite:   4999 rupees (before GST) → 5899 rupees (with 18% GST)
```

### Quick Deploy (1 minute)

**SSH into EC2:**
```bash
ssh -i ~/.ssh/zeflash-backend.pem ec2-user@3.90.162.23
```

**Run deployment:**
```bash
cd /home/ec2-user/zeflash-backend
git fetch origin
git reset --hard origin/main
git log --oneline -1  # Should show commit 44308d1

# Rebuild and restart
docker-compose -f docker-compose-ec2.yml down
docker build -t battery-ml:ec2-backend ./backend
docker-compose -f docker-compose-ec2.yml up -d

# Verify
docker logs -f zeflash-backend  # Wait for "listening on port 3000"
```

### Or use automated script:
```bash
chmod +x deploy-backend-ec2.sh
./deploy-backend-ec2.sh
```

## Verification ✅

After deployment, test with:
1. Go to https://zeflash.vercel.app/checkout?plan=trial
2. Confirm plan shows: "₹235" (199 + 18% GST)
3. Click "Pay Now"
4. Razorpay modal should show: "₹235"

Repeat for core (₹1769), premium (₹2949), elite (₹5899)

## Expected Results After Deployment
- Trial payment: ₹235 ✅ (instead of ₹354)
- Core payment: ₹1769 ✅ (instead of ₹1169)
- Premium payment: ₹2949 ✅ (instead of ₹1794)
- Elite payment: ₹5899 ✅ (instead of ₹3588)
