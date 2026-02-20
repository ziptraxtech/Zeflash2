import { useState, useCallback, useRef } from 'react';
import { loadRazorpayScript } from '../utils/razorpay';

type PaymentStatus = 'idle' | 'processing' | 'success' | 'error';

interface UseAIReportPaymentReturn {
  status: PaymentStatus;
  error: string | null;
  initiatePayment: (deviceId: string, amount?: number, couponCode?: string) => Promise<boolean>;
}

export const useAIReportPayment = (): UseAIReportPaymentReturn => {
  const [status, setStatus] = useState<PaymentStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const initiatePayment = useCallback(async (deviceId: string, amount: number = 99, couponCode: string = ''): Promise<boolean> => {
    const keyId = import.meta.env.VITE_RAZORPAY_KEY_ID as string | undefined;
    
    if (!keyId) {
      setError('Payment configuration not found. Please contact support.');
      setStatus('error');
      return false;
    }

    setError(null);
    setStatus('processing');

    try {
      const loaded = await loadRazorpayScript();
      if (!loaded || typeof window.Razorpay === 'undefined') {
        throw new Error('Unable to load Razorpay checkout. Please check your connection and try again.');
      }

      return new Promise<boolean>((resolve) => {
        resolveRef.current = resolve;

        const options: RazorpayOptions = {
          key: keyId,
          amount: amount * 100, // Convert to paise
          currency: 'INR',
          name: 'Zeflash2.0 AI Report',
          description: `AI Health Report for Device ${deviceId}`,
          handler: () => {
            setStatus('success');
            setError(null);
            if (resolveRef.current) {
              resolveRef.current(true);
              resolveRef.current = null;
            }
          },
          prefill: {
            name: 'Zeflash2.0 Customer'
          },
          notes: {
            deviceId,
            product: 'ai-report-unlock',
            ...(couponCode && { couponCode })
          },
          theme: {
            color: '#2563eb'
          },
          modal: {
            ondismiss: () => {
              setStatus('idle');
              if (resolveRef.current) {
                resolveRef.current(false);
                resolveRef.current = null;
              }
            }
          },
          // Enable QR code display on mobile devices
          upi_qr: true
        };

        try {
          const checkout = new window.Razorpay(options);
          checkout.open();
        } catch (err) {
          console.error('Razorpay Error', err);
          setError('Unable to start payment. Please try again.');
          setStatus('error');
          if (resolveRef.current) {
            resolveRef.current(false);
            resolveRef.current = null;
          }
        }
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Payment failed. Please try again.';
      setError(errorMessage);
      setStatus('error');
      return false;
    }
  }, []);

  return { status, error, initiatePayment };
};
