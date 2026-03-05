import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { API_URL } from '../config/api';
import {
  ArrowLeft,
  ShieldCheck,
  Lock,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Package
} from 'lucide-react';
import { loadRazorpayScript } from '../utils/razorpay';

type CheckoutStatus = 'idle' | 'processing' | 'success' | 'error';

interface PlanDetails {
  name: string;
  tests: number;
  validity: number;
  pricePerTest: number;
  totalPrice: number;
  features: string[];
}

const PlanCheckout: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const [status, setStatus] = useState<CheckoutStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [planDetails, setPlanDetails] = useState<PlanDetails | null>(null);

  useEffect(() => {
    const plan = searchParams.get('plan');
    const tests = parseInt(searchParams.get('tests') || '0');
    const months = parseInt(searchParams.get('months') || '12');
    const price = parseInt(searchParams.get('price') || '0');

    if (!plan || !tests || !price) {
      navigate('/');
      return;
    }

    let details: PlanDetails;

    switch (plan) {
      case 'test':
        details = {
          name: 'Test Plan',
          tests: 1,
          validity: 0,
          pricePerTest: 1,
          totalPrice: 1,
          features: [
            '1 complete diagnostic test',
            'Instant AI health report',
            'All features included',
            'Development testing only'
          ]
        };
        break;
      case 'trial':
        details = {
          name: 'First Time Trial',
          tests: 1,
          validity: 0,
          pricePerTest: 299,
          totalPrice: 299,
          features: [
            '1 complete 20-min diagnostic',
            'Instant health report',
            'PDF download',
            'Basic recommendations'
          ]
        };
        break;
      case 'starter':
        details = {
          name: 'Starter Pack',
          tests: 4,
          validity: 12,
          pricePerTest: 250,
          totalPrice: 999,
          features: [
            '4 AI diagnostic tests',
            '1 year validity',
            'Trend analysis',
            'Email support'
          ]
        };
        break;
      case 'value':
        details = {
          name: 'Value Pack',
          tests: 8,
          validity: 12,
          pricePerTest: 187,
          totalPrice: 1499,
          features: [
            '8 AI diagnostic tests',
            '1 year validity',
            'Priority scheduling',
            'Advanced insights',
            'Priority support'
          ]
        };
        break;
      case 'custom':
        const pricePerTest = price / tests;
        details = {
          name: 'Custom Plan',
          tests,
          validity: months,
          pricePerTest: Math.round(pricePerTest),
          totalPrice: price,
          features: [
            `${tests} AI diagnostic tests`,
            `${months} months validity`,
            'Flexible validity',
            'Volume discounts',
            'Dedicated support'
          ]
        };
        break;
      default:
        navigate('/');
        return;
    }

    setPlanDetails(details);
  }, [searchParams, navigate]);

  const handlePayNow = useCallback(async () => {
    if (!planDetails) return;
setErrorMessage(null);
    setStatus('processing');

    try {
      // Get Clerk auth token
      const orderToken = await getToken();
      if (!orderToken) {
        setErrorMessage('Please sign in to continue');
        setStatus('error');
        return;
      }

      // Create order via backend
      const plan = searchParams.get('plan') || 'trial';
      const isCustom = plan === 'custom';
      
      const orderResponse = await fetch(`${API_URL}/create-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${orderToken}`
        },
        body: JSON.stringify({
          credits: planDetails.tests,
          planName: plan,
          months: planDetails.validity,
          isCustom
        })
      });

      const orderResponseText = await orderResponse.text();
      let orderPayload: any = {};
      if (orderResponseText) {
        try {
          orderPayload = JSON.parse(orderResponseText);
        } catch {
          orderPayload = { error: 'Server returned a non-JSON error while creating order.' };
        }
      }

      if (!orderResponse.ok) {
        throw new Error(orderPayload.error || 'Failed to create order');
      }

      const orderData = orderPayload;
      
      // Load Razorpay
      const loaded = await loadRazorpayScript();
      if (!loaded || typeof window.Razorpay === 'undefined') {
        throw new Error('Unable to load payment gateway');
      }

      // Open Razorpay checkout
      const options: RazorpayOptions = {
        key: orderData.keyId,
        order_id: orderData.orderId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Zeflash',
        description: planDetails.name,
        handler: (response) => {
          void (async () => {
            // Force a fresh token — bypasses cache which may be stale after the
            // user spends time in the Razorpay modal / external UPI app.
            let confirmToken = await getToken({ skipCache: true });

            // If the force-refresh fails, fall back to a cached token once.
            if (!confirmToken) {
              confirmToken = await getToken();
            }

            if (!confirmToken) {
              throw new Error('Session expired while confirming payment. Please sign in again.');
            }

            let confirmResponse = await fetch(`${API_URL}/confirm-payment`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${confirmToken}`
              },
              body: JSON.stringify(response)
            });

            // If auth fails (401 invalid/expired token), do one retry with a
            // brand-new token fetch before giving up.
            if (confirmResponse.status === 401) {
              const retryToken = await getToken({ skipCache: true });
              if (retryToken) {
                confirmResponse = await fetch(`${API_URL}/confirm-payment`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${retryToken}`
                  },
                  body: JSON.stringify(response)
                });
              }
            }

            const confirmText = await confirmResponse.text();
            let confirmPayload: any = {};
            if (confirmText) {
              try {
                confirmPayload = JSON.parse(confirmText);
              } catch {
                confirmPayload = { error: 'Server returned a non-JSON error while confirming payment.' };
              }
            }

            if (!confirmResponse.ok) {
              throw new Error(confirmPayload.error || 'Payment captured but credit update failed');
            }

            setStatus('success');
            navigate('/stations', {
              replace: true,
              state: {
                paymentSuccess: true,
                credits: confirmPayload.remaining ?? planDetails.tests,
                creditsUpdatedAt: Date.now()
              }
            });
          })().catch((confirmError: any) => {
            console.error('Payment confirmation error:', confirmError);
            // Payment was captured by Razorpay. Credits will be added automatically
            // via the server-side webhook within a few minutes. Prompt the user to wait.
            const isPending = confirmError.message?.toLowerCase().includes('token') ||
              confirmError.message?.toLowerCase().includes('auth') ||
              confirmError.message?.toLowerCase().includes('session');
            setErrorMessage(
              isPending
                ? 'Payment successful! Your credits are being processed and will appear in your ZeVault within 1–2 minutes. You can safely refresh the app.'
                : confirmError.message || 'Payment succeeded but credits are pending. Please refresh in 30 seconds.'
            );
            setStatus('error');
          });
        },
        prefill: {
          name: 'Zeflash Customer'
        },
        notes: {
          plan: planDetails.name,
          tests: planDetails.tests.toString(),
          validity: planDetails.validity.toString()
        },
        theme: {
          color: '#2563eb'
        },
        modal: {
          ondismiss: () => {
            setStatus('idle');
          }
        }
      };

      const checkout = new window.Razorpay(options);
      checkout.open();
    } catch (error: any) {
      console.error('Payment Error:', error);
      setErrorMessage(error.message || 'Payment failed. Please try again.');
      setStatus('error');
    }
  }, [planDetails, getToken, navigate, searchParams]);

  const isProcessing = status === 'processing';

  if (!planDetails) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-blue-600"
            >
              <ArrowLeft size={16} />
              Back
            </Link>
            <div>
              <h1 className="text-lg sm:text-xl font-semibold text-gray-900">Checkout</h1>
              <p className="text-xs sm:text-sm text-gray-500">Complete your purchase</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500">
            <ShieldCheck size={16} className="text-emerald-600" />
            Secure Razorpay Checkout
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section className="lg:col-span-2 space-y-6">
            <div className="rounded-2xl border border-blue-200 bg-white p-6 shadow">
              <div className="flex items-center gap-3 mb-4">
                <div className="rounded-lg bg-blue-50 p-3">
                  <Package className="text-blue-600" size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">{planDetails.name}</h2>
                  <p className="text-sm text-gray-500">{planDetails.tests} test{planDetails.tests > 1 ? 's' : ''} • {planDetails.validity > 0 ? `Valid ${planDetails.validity} months` : 'One-time use'}</p>
                </div>
              </div>
              <div className="mb-4 flex items-center gap-2 rounded-lg bg-violet-50 border border-violet-200 px-3 py-2 text-sm font-semibold text-violet-700">
                <span>⚡</span>
                <span>{planDetails.tests} ZeVault credit{planDetails.tests > 1 ? 's' : ''} — 1 test = 1 credit</span>
              </div>
              <div className="mb-6 p-4 rounded-xl bg-blue-50 border border-blue-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-700 font-medium">Total Amount</p>
                    <p className="text-3xl font-bold text-blue-900">₹{planDetails.totalPrice.toLocaleString('en-IN')}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-blue-600">Per test</p>
                    <p className="text-lg font-semibold text-blue-800">₹{planDetails.pricePerTest}</p>
                  </div>
                </div>
              </div>
              <ul className="space-y-3 text-sm text-gray-700">
                {planDetails.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <CheckCircle className="text-blue-600 mt-0.5 flex-shrink-0" size={16} />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold text-gray-900">Payment</h3>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-600">
                  ₹{planDetails.totalPrice.toLocaleString('en-IN')}
                </span>
              </div>
              <p className="text-xs text-gray-500 mb-4">
                Secure checkout powered by Razorpay. We never store your card details.
              </p>

              {errorMessage && (
                <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  <AlertTriangle size={14} className="mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <button
                onClick={handlePayNow}
                disabled={isProcessing}
                className={`w-full inline-flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors ${
                  isProcessing ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {isProcessing ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Processing…
                  </>
                ) : (
                  <>
                    <Lock size={16} />
                    Pay ₹{planDetails.totalPrice.toLocaleString('en-IN')}
                  </>
                )}
              </button>

              <p className="mt-3 text-[11px] leading-4 text-gray-500">
                By continuing you agree to purchase {planDetails.name}. Need help?
                <a href="mailto:contact@zeflash.app" className="ml-1 text-blue-600 underline">
                  Contact support
                </a>
                .
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-800">
              <div className="flex items-center gap-2 font-semibold">
                <CheckCircle size={14} />
                Money-back assurance
              </div>
              <p className="mt-1 leading-5">
                If the tests fail to provide insights, we will refund within 3–5 business days.
              </p>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
};

export default PlanCheckout;
