import Razorpay from 'razorpay';

export const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

// credits → price in paise
export const CREDIT_PACKS: Record<number, number> = {
  1: 9900,   // ₹99
  3: 24900,  // ₹249
  7: 49900,  // ₹499
};
