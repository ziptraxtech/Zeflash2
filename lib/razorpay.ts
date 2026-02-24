import Razorpay from 'razorpay';

export const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

// Credit packs: how many credits each plan gives and the price in paise
export const CREDIT_PACKS: Record<number, number> = {
  1: 9900,    // 1 credit  = ₹99
  3: 24900,   // 3 credits = ₹249
  7: 49900,   // 7 credits = ₹499
};
