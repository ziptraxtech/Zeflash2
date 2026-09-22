export {};

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  }

  interface RazorpayInstance {
    open: () => void;
    close: () => void;
  }

  interface RazorpayHandlerResponse {
    razorpay_payment_id: string;
    razorpay_order_id?: string;
    razorpay_signature?: string;
  }

  interface RazorpayOptions {
    key: string;
    amount?: number; // omit when order_id is set — the order carries the amount
    currency: string;
    name?: string;
    description?: string;
    image?: string;
    order_id?: string;
    handler: (response: RazorpayHandlerResponse) => void;
    prefill?: {
      name?: string;
      email?: string;
      contact?: string;
    };
    notes?: Record<string, string>;
    theme?: {
      color?: string;
    };
    modal?: {
      ondismiss?: () => void;
    };
    upi_qr?: boolean;
  }
}
