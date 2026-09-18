import Razorpay from 'razorpay';

export const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

// Plan-based credit packs: plan name -> {credits, price in paise}
//
// Prices are GST-INCLUSIVE and must equal exactly `Math.round(base * 1.18) * 100`,
// where `base` is the card price in src/config/pricing.ts (PLAN_BASE_PRICE).
// This is the amount Razorpay actually charges, so any change here must be
// mirrored in that file or the customer sees a different number than they pay.
export const PLAN_PACKS: Record<string, { credits: number; price: number }> = {
  'test': { credits: 1, price: 100 },                // ₹1 (dev test plan, base ₹1 + 18% GST, rounded)
  'trial': { credits: 1, price: 23500 },             // ₹235 (One Time - 1 test, base ₹199 + 18% GST)
  'core': { credits: 4, price: 176900 },             // ₹1,769 (Core Pack - 4 tests, base ₹1,499 + 18% GST)
  'premium': { credits: 6, price: 294900 },          // ₹2,949 (Premium Pack - 6 tests, base ₹2,499 + 18% GST)
  'elite': { credits: 12, price: 589900 },           // ₹5,899 (Elite Pack - 12 tests, base ₹4,999 + 18% GST)
  // Legacy packs - no longer shown as cards, still reachable by direct link.
  'starter': { credits: 6, price: 177000 },          // ₹1,770 (base ₹1,500 + 18% GST)
  'value': { credits: 12, price: 354000 },           // ₹3,540 (base ₹3,000 + 18% GST)
  'smart': { credits: 24, price: 708000 },           // ₹7,080 (base ₹6,000 + 18% GST)
};

// Custom plans: per-test rupee price by validity, mirroring CUSTOM_PRICE_PER_TEST
// in src/config/pricing.ts.
export function calculateCustomPlanPrice(tests: number, months: number): number {
  const priceMap: { [key: number]: number } = {
    12: 300,  // ₹300/test for 12 months
    18: 290,  // ₹290/test for 18 months
    24: 280,  // ₹280/test for 24 months
  };
  const pricePerTest = priceMap[months] || 300;
  const subtotal = tests * pricePerTest;
  // Round to the rupee FIRST, exactly as the checkout summary does, then convert
  // to paise. Rounding after the paise conversion drifts by up to 50 paise from
  // the displayed total (e.g. 3 tests x ₹290 = ₹870 -> ₹1,026.60 vs ₹1,027).
  return Math.round(subtotal * 1.18) * 100;
}
