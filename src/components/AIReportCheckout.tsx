import React, { useCallback, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import {
  ArrowLeft,
  ShieldCheck,
  Lock,
  Zap,
  FileText,
  Clock,
  CheckCircle,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { loadRazorpayScript } from '../utils/razorpay';

type CheckoutStatus = 'idle' | 'processing' | 'success' | 'error';

const price = 99;

const AIReportCheckout: React.FC = () => {
  const { deviceId } = useParams<{ deviceId: string }>();
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const [status, setStatus] = useState<CheckoutStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const deviceLabel = useMemo(() => (deviceId ? `Device ${deviceId}` : 'Selected Device'), [deviceId]);

  const handlePayNow = useCallback(async () => {
    if (!deviceId) {
      navigate('/stations');
      return;
    }

    setErrorMessage(null);
    setStatus('processing');

    const loaded = await loadRazorpayScript();
    if (!loaded || typeof window.Razorpay === 'undefined') {
      setErrorMessage('Unable to load Razorpay checkout. Please check your connection and try again.');
      setStatus('error');
      return;
    }

    // Create server-side order so webhook can track payment and add credits
    let orderData: { orderId: string; amount: number; keyId: string };
    try {
      const token = await getToken();
      const res = await fetch('/api/create-order', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ credits: 1 }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Order creation failed (${res.status})`);
      }
      orderData = await res.json();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create payment order. Please try again.');
      setStatus('error');
      return;
    }

    const options: RazorpayOptions = {
      key: orderData.keyId || (import.meta.env.VITE_RAZORPAY_KEY_ID as string),
      amount: orderData.amount,
      currency: 'INR',
      name: 'Zeflash AI Report',
      description: `Unlock AI insights for ${deviceLabel}`,
      order_id: orderData.orderId,
      handler: () => {
        setStatus('success');
        navigate(`/report/${deviceId}/ai`, {
          replace: true,
          state: { fromCheckout: true, orderId: orderData.orderId },
        });
      },
      prefill: { name: 'Zeflash Customer' },
      notes: { deviceId, product: 'ai-report' },
      theme: { color: '#2563eb' },
      modal: { ondismiss: () => setStatus('idle') },
      upi_qr: true,
    };

    try {
      new window.Razorpay(options).open();
    } catch (error) {
      console.error('Razorpay Error', error);
      setErrorMessage('Unable to start payment. Please try again.');
      setStatus('error');
    }
  }, [deviceId, deviceLabel, navigate, getToken]);

  const isProcessing = status === 'processing';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to={deviceId ? `/report/${deviceId}` : '/stations'}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-blue-600"
            >
              <ArrowLeft size={16} />
              Back to Report
            </Link>
            <div>
              <h1 className="text-lg sm:text-xl font-semibold text-gray-900">Unlock AI Insights</h1>
              <p className="text-xs sm:text-sm text-gray-500">Secure checkout for premium diagnostics</p>
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
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Order Summary</h2>
                  <p className="text-sm text-gray-500">AI-powered diagnostics upgrade for {deviceLabel}</p>
                </div>
                <div className="rounded-xl bg-blue-50 px-4 py-2 text-right">
                  <p className="text-xs font-medium text-blue-600">Total</p>
                  <p className="text-2xl font-bold text-blue-700">₹{price}</p>
                </div>
              </div>
              <ul className="space-y-3 text-sm text-gray-700">
                <li className="flex items-start gap-3">
                  <FileText size={16} className="mt-1 text-blue-500" />
                  <div>
                    <p className="font-medium text-gray-900">Full AI narrative report</p>
                    <p className="text-xs text-gray-500">Unlock degradation insights, anomaly breakdowns, and technician-ready narratives.</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Clock size={16} className="mt-1 text-blue-500" />
                  <div>
                    <p className="font-medium text-gray-900">Rapid turnaround</p>
                    <p className="text-xs text-gray-500">Instant access once payment completes. Works across web and mobile.</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Zap size={16} className="mt-1 text-blue-500" />
                  <div>
                    <p className="font-medium text-gray-900">Actionable playbooks</p>
                    <p className="text-xs text-gray-500">Downloadable recommendations optimised for maintenance teams.</p>
                  </div>
                </li>
              </ul>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">What you unlock</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-gray-600">
                <div className="rounded-lg border border-blue-100 bg-blue-50 p-3">
                  <p className="font-semibold text-blue-700 mb-1">Technical Analysis</p>
                  <p>Unblur detailed anomaly narratives and thermal insights.</p>
                </div>
                <div className="rounded-lg border border-blue-100 bg-blue-50 p-3">
                  <p className="font-semibold text-blue-700 mb-1">AI Verdict</p>
                  <p>Get confidence scores, urgency flags, and escalation guidance.</p>
                </div>
                <div className="rounded-lg border border-blue-100 bg-blue-50 p-3">
                  <p className="font-semibold text-blue-700 mb-1">Action Playbook</p>
                  <p>Access the full remediation checklist and maintenance plan.</p>
                </div>
                <div className="rounded-lg border border-blue-100 bg-blue-50 p-3">
                  <p className="font-semibold text-blue-700 mb-1">Data Exports</p>
                  <p>Download CSVs and technician-ready PDFs in one click.</p>
                </div>
              </div>
            </div>
          </section>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold text-gray-900">Payment</h3>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-600">₹{price}</span>
              </div>
              <p className="text-xs text-gray-500 mb-4">Secure checkout powered by Razorpay. We never store your card details.</p>

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
                    Pay ₹{price}
                  </>
                )}
              </button>

              <p className="mt-3 text-[11px] leading-4 text-gray-500">
                By continuing you agree to receive the AI battery report for {deviceLabel}. Need help?
                <a href="mailto:support@zipsure.ai" className="ml-1 text-blue-600 underline">
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
                If the AI report fails to generate insights for your session, we will refund the amount within 3–5 business days.
              </p>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
};

export default AIReportCheckout;
