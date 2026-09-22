// Single source of truth for plan pricing.
//
// The amount Razorpay charges is computed by the backend (PLAN_PACKS in
// backend/src/lib/razorpay.ts), NOT sent from here. Any base price changed in
// this file must be mirrored there, or the card, the checkout summary and the
// Razorpay modal will show three different numbers.

export const GST_RATE = 0.18;

/** Base (pre-GST) price in rupees, keyed by the plan id used in /checkout?plan=. */
export const PLAN_BASE_PRICE = {
  test: 1,
  trial: 199,
  core: 1499,
  premium: 2499,
  elite: 4999,
  // Legacy packs — no longer shown as cards, still reachable by direct link.
  starter: 1500,
  value: 3000,
  smart: 6000,
} as const;

export type PlanId = keyof typeof PLAN_BASE_PRICE;

/** Per-test rupee price for the custom plan calculator, keyed by validity months. */
export const CUSTOM_PRICE_PER_TEST: Record<number, number> = {
  12: 300,
  18: 290,
  24: 280,
};

/** GST portion, in whole rupees, as shown on the checkout summary line. */
export const gstAmount = (basePrice: number) => Math.round(basePrice * GST_RATE);

/**
 * Total payable in rupees: base + 18% GST, rounded to the rupee.
 */
export const withGst = (basePrice: number) => Math.round(basePrice * (1 + GST_RATE));
