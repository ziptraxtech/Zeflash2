import Razorpay from 'razorpay';

export const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

// Plan-based credit packs: plan name → {credits, price in paise}
// Prices include 18% GST
export const PLAN_PACKS: Record<string, { credits: number; price: number }> = {
  'test': { credits: 1, price: 118 },                // ₹1.18 (Test plan for development, with 18% GST)
  'trial': { credits: 1, price: 35400 },             // ₹354 (Trial - 1 test, ₹300 + 18% GST)
  'starter': { credits: 6, price: 177000 },          // ₹1,770 (Starter - 6 tests, ₹1,500 + 18% GST)
  'value': { credits: 12, price: 354000 },           // ₹3,540 (Value - 12 tests, ₹3,000 + 18% GST)
  'smart': { credits: 24, price: 708000 },           // ₹7,080 (Smart - 24 tests, ₹6,000 + 18% GST)
};

// Helper to get price for custom plans (with 18% GST included)
export function calculateCustomPlanPrice(tests: number, months: number): number {
  const priceMap: { [key: number]: number } = {
    12: 300,  // ₹300/test for 12 months
    18: 290,  // ₹290/test for 18 months
    24: 280,  // ₹280/test for 24 months
  };
  const pricePerTest = priceMap[months] || 300;
  const subtotal = tests * pricePerTest * 100; // Convert to paise
  const totalWithGST = Math.round(subtotal * 1.18); // Add 18% GST
  return totalWithGST;
}
