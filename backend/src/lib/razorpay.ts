import Razorpay from 'razorpay';

export const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

// Plan-based credit packs: plan name -> {credits, price in paise}
//
// Prices are GST-INCLUSIVE in PAISE (amount / 100 = rupees).
// Must match exactly: Math.round(base * 1.18) * 100 paise
// where `base` is the card price in src/config/pricing.ts (PLAN_BASE_PRICE in rupees).
// Frontend displays: ₹(price / 100).
// This is the amount Razorpay actually charges, so any change here must be
// mirrored in pricing.ts or the customer sees a different number than they pay.
export const PLAN_PACKS: Record<string, { credits: number; price: number }> = {
  'test': { credits: 1, price: 100 },                // ₹1 (base ₹1 + 18% GST → ₹1.18 → rounded ₹1)
  'trial': { credits: 1, price: 23500 },             // ₹235 (base ₹199 + 18% GST → ₹234.82 → rounded ₹235)
  'core': { credits: 4, price: 176900 },             // ₹1,769 (base ₹1,499 + 18% GST → ₹1,768.82 → rounded ₹1,769)
  'premium': { credits: 6, price: 294900 },          // ₹2,949 (base ₹2,499 + 18% GST → ₹2,948.82 → rounded ₹2,949)
  'elite': { credits: 12, price: 589900 },           // ₹5,899 (base ₹4,999 + 18% GST → ₹5,898.82 → rounded ₹5,899)
  // Legacy packs - no longer shown as cards, still reachable by direct link.
  'starter': { credits: 6, price: 177000 },          // ₹1,770 (base ₹1,500 + 18% GST → ₹1,770)
  'value': { credits: 12, price: 354000 },           // ₹3,540 (base ₹3,000 + 18% GST → ₹3,540)
  'smart': { credits: 24, price: 708000 },           // ₹7,080 (base ₹6,000 + 18% GST → ₹7,080)
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
