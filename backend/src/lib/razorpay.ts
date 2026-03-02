import Razorpay from 'razorpay';

export const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

// Plan-based credit packs: plan name → {credits, price in paise}
export const PLAN_PACKS: Record<string, { credits: number; price: number }> = {
  'test': { credits: 1, price: 100 },      // ₹1 (Test plan for development)
  'trial': { credits: 1, price: 29900 },   // ₹299 (Trial - 1 test)
  'starter': { credits: 4, price: 99900 }, // ₹999 (Starter - 4 tests)
  'value': { credits: 8, price: 149900 },  // ₹1499 (Value - 8 tests)
};

// Helper to get price for custom plans
export function calculateCustomPlanPrice(tests: number, months: number): number {
  const priceMap: { [key: number]: number } = {
    12: 200,  // ₹200/test for 12 months
    18: 190,  // ₹190/test for 18 months
    24: 180,  // ₹180/test for 24 months
  };
  const pricePerTest = priceMap[months] || 200;
  return tests * pricePerTest * 100; // Convert to paise
}
