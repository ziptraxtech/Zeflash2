# Razorpay Payment Wall Implementation - AI Report Generation

## Overview
Added a payment wall of ₹99 between S3 image creation and AI report generation in the Zeflash app.

## Changes Made

### 1. Created Payment Hook (`src/hooks/useAIReportPayment.ts`)
- **New hook**: `useAIReportPayment()`
- Handles Razorpay payment initiation for AI reports
- Returns: `{ status, error, initiatePayment }`
- Amount: ₹99 (automatically converted to paise for Razorpay)
- Uses environment variable: `VITE_RAZORPAY_KEY_ID`

### 2. Updated ChargingStations Component

#### Added:
- Import of `useAIReportPayment` hook
- New state fields to `reportModal`:
  - `paymentPending`: boolean - tracks payment processing state
  - `paymentError`: string - displays payment errors

#### Modified Flow:
1. **Before (Free)**: View report parameters - remains free
2. **New (Paid)**: Click "Get AI Health Report" → Payment required
3. **After Payment**: AI report generation proceeds

#### Button Changes:
- Added payment badge showing "₹99 - Premium AI Report"
- Button text updated to "Get AI Health Report - ₹99"
- Loading states now show:
  - "Processing Payment..." during payment
  - "Generating Report..." during AI generation
- Payment error messages display inline

### 3. No Function Changes
- `fetchChargerReport()` - unchanged (view report still free)
- `fetchAIHealthReport()` - wrapped with payment logic, internal logic untouched
- All existing functions remain functional

## User Flow

### Scenario: User wants AI Health Report
1. User clicks "Report" button on a connector → **FREE** (existing behavior)
2. Report parameters displayed with data visualizations → **FREE** (existing behavior)
3. User clicks "Get AI Health Report - ₹99" button
4. Razorpay payment modal opens
5. On successful payment:
   - AI report generation triggered
   - S3 image checked/generated
   - Report displayed to user
6. On failed payment:
   - Error message shown
   - User can retry

## Technical Details

- **Payment amount**: ₹99 (fixed, non-negotiable in UI)
- **Payment provider**: Razorpay
- **API Key**: Loaded from `VITE_RAZORPAY_KEY_ID` environment variable
- **Currency**: INR
- **Transaction notes**: Includes `deviceId` and `product: 'ai-report-unlock'`

## Files Modified
1. `/src/hooks/useAIReportPayment.ts` - NEW
2. `/src/components/ChargingStations.tsx` - Updated with payment integration

## Prerequisites
- Ensure `VITE_RAZORPAY_KEY_ID=rzp_live_[your_key_here]` is set in environment
- Razorpay script is loaded via existing `loadRazorpayScript()` utility
- Clerk authentication already in place for user sign-in requirement
- **Get key from**: Razorpay Dashboard → Settings → API Keys

## Testing
1. Navigate to charging stations
2. Click "Report" on any connector
3. Click "Get AI Health Report - ₹99"
4. Complete Razorpay payment flow
5. Verify AI report generates and displays
