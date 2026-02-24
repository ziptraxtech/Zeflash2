# Zeflash Backend Setup Guide

External service setup for the credits + report storage system.  
**Do not touch existing code until all services below are ready.**

---

## Overview of What You're Building

```
User pays (Razorpay)
    ↓
Webhook hits Vercel /api/webhook
    ↓
Credits added to Neon DB (via Prisma)
    ↓
User requests report → credit deducted → ECS called → S3 URL saved
    ↓
User can revisit report from /reports endpoint
```

---

## Step 1 — Neon DB (PostgreSQL)

### 1.1 Create a Neon account
1. Go to [https://neon.tech](https://neon.tech) and sign up (free tier is enough to start).
2. Click **"New Project"**.
3. Give it a name: `zeflash-db`.
4. Region: choose **US East (N. Virginia)** to match your ECS/Lambda region.
5. Click **Create Project**.

### 1.2 Get the connection string
1. After the project is created, go to the **Dashboard → Connection Details**.
2. Copy the **connection string**. It looks like:
   ```
   postgresql://username:password@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require
   ```
3. You will need **two versions** of this string:
   - **Direct URL** (for Prisma migrations): same string as above.
   - **Pooled URL** (for runtime): append `?pgbouncer=true` or use the pooler hostname Neon shows (it ends in `-pooler`).

### 1.3 Save these as environment variables (you'll add them to Vercel later)
```
DATABASE_URL=postgresql://...@ep-xxx-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require
DIRECT_URL=postgresql://...@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require
```

> **Why two URLs?**  
> Neon uses connection pooling via PgBouncer. Prisma migrations need a direct connection; runtime queries should use the pooled one to avoid connection limits.

---

## Step 2 — Prisma Setup (run locally, not on Vercel)

### 2.1 Install Prisma in the project (local terminal only)
```bash
npm install prisma @prisma/client
npx prisma init
```
This creates:
- `prisma/schema.prisma`
- `.env` with a placeholder `DATABASE_URL`

### 2.2 Set your local `.env`
Open `.env` and add:
```env
DATABASE_URL="postgresql://...@ep-xxx-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require"
DIRECT_URL="postgresql://...@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require"
```

### 2.3 Replace `prisma/schema.prisma` with this schema

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

model User {
  id           String   @id @default(cuid())
  clerkUserId  String   @unique
  email        String   @unique
  createdAt    DateTime @default(now())

  credits      Credit?
  transactions CreditTransaction[]
  payments     Payment[]
  reports      Report[]
}

model Credit {
  id        String @id @default(cuid())
  userId    String @unique
  total     Int    @default(0)
  used      Int    @default(0)
  remaining Int    @default(0)

  user      User   @relation(fields: [userId], references: [id])
}

model CreditTransaction {
  id        String   @id @default(cuid())
  userId    String
  type      String   // "purchase" | "usage" | "refund"
  credits   Int
  note      String?
  createdAt DateTime @default(now())

  user      User     @relation(fields: [userId], references: [id])
}

model Payment {
  id                  String   @id @default(cuid())
  userId              String
  razorpayOrderId     String   @unique
  razorpayPaymentId   String?  @unique
  amount              Int      // in paise (INR smallest unit)
  credits             Int      // credits to be awarded
  status              String   @default("created") // "created" | "paid" | "failed"
  processedAt         DateTime?
  createdAt           DateTime @default(now())

  user                User     @relation(fields: [userId], references: [id])
}

model Report {
  id        String   @id @default(cuid())
  userId    String
  evseId    String
  connector Int
  status    String   @default("processing") // "processing" | "completed" | "failed"
  s3Url     String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user      User     @relation(fields: [userId], references: [id])
}
```

### 2.4 Run the migration (pushes schema to Neon)
```bash
npx prisma migrate dev --name init
```

If it asks for a migration name, type `init`.  
You should see:
```
✔ Generated Prisma Client
✔ Applied migration `init`
```

### 2.5 Verify in Neon
1. Go to your Neon dashboard → **Tables**.
2. You should see: `User`, `Credit`, `CreditTransaction`, `Payment`, `Report`.

### 2.6 Generate Prisma Client (after any schema change)
```bash
npx prisma generate
```

---

## Step 3 — Razorpay Setup

### 3.1 Create a Razorpay account
1. Go to [https://dashboard.razorpay.com](https://dashboard.razorpay.com) and sign up.
2. Complete KYC (or use **Test Mode** for now — no KYC needed for testing).

### 3.2 Get API Keys
1. In the Razorpay Dashboard, go to **Settings → API Keys**.
2. Click **Generate Key** (Test Mode).
3. Save:
   ```
   RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxxxxx
   RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
   ```

### 3.3 Set up Webhook
1. In Razorpay Dashboard → **Settings → Webhooks → + Add New Webhook**.
2. **Webhook URL**: `https://your-vercel-domain.vercel.app/api/webhook`  
   *(You'll get this URL after deploying to Vercel. Come back here and fill it in.)*
3. **Secret**: create a strong random string, e.g. `zeflash_webhook_secret_2026`. Save it:
   ```
   RAZORPAY_WEBHOOK_SECRET=zeflash_webhook_secret_2026
   ```
4. **Events to subscribe** — check these:
   - `payment.captured`
   - `payment.failed`
   - `order.paid`
5. Click **Save**.

### 3.4 Test the webhook locally (optional, before deploying to Vercel)
Use the **Razorpay Webhook Simulator** in the dashboard, or use [ngrok](https://ngrok.com):
```bash
ngrok http 3000
# Use the https://xxxx.ngrok.io/api/webhook URL temporarily
```

---

## Step 4 — Vercel Environment Variables

Once you have all the keys, add them to Vercel so your serverless functions can access them.

1. Go to [https://vercel.com](https://vercel.com) → your Zeflash project.
2. **Settings → Environment Variables**.
3. Add the following (set to **Production + Preview + Development**):

| Variable | Value |
|---|---|
| `DATABASE_URL` | Neon pooled connection string |
| `DIRECT_URL` | Neon direct connection string |
| `RAZORPAY_KEY_ID` | `rzp_test_xxx...` |
| `RAZORPAY_KEY_SECRET` | Your Razorpay secret |
| `RAZORPAY_WEBHOOK_SECRET` | Webhook secret you created |
| `ML_BACKEND_URL` | `http://battery-ml-alb-xxx.us-east-1.elb.amazonaws.com` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Your Clerk publishable key |
| `CLERK_SECRET_KEY` | Your Clerk secret key |

4. After adding all variables, click **Redeploy** so the new environment variables take effect.

---

## Step 5 — Clerk Setup (for backend JWT verification)

Your frontend already uses Clerk. You need the **secret key** for the backend to verify JWTs.

1. Go to [https://dashboard.clerk.com](https://dashboard.clerk.com).
2. Select your Zeflash application.
3. Go to **API Keys**.
4. Copy:
   - **Publishable key**: `pk_test_xxx...`
   - **Secret key**: `sk_test_xxx...`
5. Add both to Vercel environment variables (see table above).

### JWT Verification (what the backend middleware will do)
When users call your API endpoints, they send their Clerk JWT in the `Authorization: Bearer <token>` header. Your middleware will:
1. Call Clerk's SDK to verify the token.
2. Extract `userId` (the `clerkUserId`).
3. Look up or create the user in Neon DB.

Install Clerk backend SDK (run locally):
```bash
npm install @clerk/backend
```

---

## Step 6 — Prisma on Vercel (important!)

Vercel's serverless environment requires a build step for Prisma Client.

Add this to your `package.json` scripts:
```json
"scripts": {
  "postinstall": "prisma generate"
}
```

This ensures Prisma Client is generated during every Vercel deployment.

---

## Step 7 — Credits Pricing (decide before going live)

Define how many credits each payment tier gets. Example:

| Plan | Price (INR) | Credits | Per Report |
|---|---|---|---|
| Starter | ₹99 | 1 | ₹99/report |
| Basic | ₹249 | 3 | ₹83/report |
| Pro | ₹499 | 7 | ₹71/report |

Store the **credit amount per order** in the `Payment` table when the order is created.

---

## Step 8 — Checklist Before Writing Any Code

Run through this before starting API development:

- [ ] Neon DB project created and connection strings saved
- [ ] Prisma installed locally (`npm install prisma @prisma/client`)
- [ ] `prisma/schema.prisma` created with schema from Step 2.3
- [ ] Migration run successfully (`npx prisma migrate dev --name init`)
- [ ] Tables visible in Neon dashboard
- [ ] Razorpay account created (Test Mode)
- [ ] Razorpay API keys saved
- [ ] Razorpay webhook configured (URL can be filled after first Vercel deploy)
- [ ] Clerk secret key saved
- [ ] All environment variables added to Vercel
- [ ] `"postinstall": "prisma generate"` added to `package.json`

---

## What to Build Next (Code Phase)

After completing all steps above, the implementation order is:

1. **`/middleware/auth.ts`** — Clerk JWT verification, returns `clerkUserId`
2. **`/services/userService.ts`** — `getOrCreateUser(clerkUserId, email)`
3. **`/api/credits.ts`** — `GET /api/credits` returns remaining credits
4. **`/api/create-order.ts`** — `POST /api/create-order` creates Razorpay order
5. **`/api/webhook.ts`** — Razorpay webhook, verifies signature, adds credits
6. **`/api/generate-report.ts`** — Checks credits → deducts → calls ECS → saves S3 URL
7. **`/api/reports.ts`** — `GET /api/reports` lists user's past reports

> Let me know when Steps 1–8 above are complete and I'll write all the code.
