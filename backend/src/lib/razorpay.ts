import Razorpay from 'razorpay';

export const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

// Plan pricing. One number per plan: its price in RUPEES, before GST.
//
// Everything in this codebase works in rupees. Razorpay is the single
// exception — its API defines every `amount` field in paise — so `toPaise` is
// applied once, at the call that creates the order, and nowhere else.
//
// These base prices must match PLAN_BASE_PRICE in src/config/pricing.ts.
export const GST_RATE = 0.18;

export const PLAN_PACKS: Record<string, { credits: number; price: number }> = {
  'test': { credits: 1, price: 1 },          // dev only
  'trial': { credits: 1, price: 199 },       // One Time
  'core': { credits: 4, price: 1499 },       // Core Pack
  'premium': { credits: 6, price: 2499 },    // Premium Pack
  'elite': { credits: 12, price: 4999 },     // Elite Pack
  // Legacy packs - no longer shown as cards, still reachable by direct link.
  'starter': { credits: 6, price: 1500 },
  'value': { credits: 12, price: 3000 },
  'smart': { credits: 24, price: 6000 },
};

/** What the customer pays, in rupees: plan price + 18% GST. */
export const totalWithGst = (basePrice: number) => Math.round(basePrice * (1 + GST_RATE));

/** Rupees -> paise. Razorpay boundary only; do not use this anywhere else. */
export const toPaise = (rupees: number) => Math.round(rupees * 100);

// A single AI report bought outside the plans (AIReportCheckout sends no
// planName). ChargingStations advertises a flat ₹299 and that is what has
// always been charged, so it is GST-inclusive rather than carrying the +18%.
export const SINGLE_REPORT_PRICE = 299;

/** Custom plan price in rupees, before GST. Mirrors CUSTOM_PRICE_PER_TEST. */
export function calculateCustomPlanPrice(tests: number, months: number): number {
  const priceMap: { [key: number]: number } = {
    12: 300,  // ₹300/test for 12 months
    18: 290,  // ₹290/test for 18 months
    24: 280,  // ₹280/test for 24 months
  };
  return tests * (priceMap[months] || 300);
}
