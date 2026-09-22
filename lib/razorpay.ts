import Razorpay from 'razorpay';

export const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

// Credit packs: how many credits each plan gives and the price in rupees
export const CREDIT_PACKS: Record<number, number> = {
  1: 99,    // 1 credit  = ₹99
  3: 249,   // 3 credits = ₹249
  7: 499,   // 7 credits = ₹499
};
