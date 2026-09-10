import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Zap } from 'lucide-react';
import CreditsWallet from './CreditsWallet';

const PricingPlans: React.FC = () => {
  const navigate = useNavigate();
  // Custom plan calculator
  useEffect(() => {
    const calculateCustomPrice = () => {
      const testSlider = document.querySelector('.custom-test-slider') as HTMLInputElement;
      const monthSlider = document.querySelector('.custom-month-slider') as HTMLInputElement;
      
      if (!testSlider || !monthSlider) return;

      const updatePrice = () => {
        const tests = parseInt(testSlider.value);
        const monthStep = parseInt(monthSlider.value);
        
        // Map slider steps to actual months: 0→12, 1→18, 2→24
        const monthOptions = [12, 18, 24];
        const months = monthOptions[monthStep];

        // Custom plan pricing - fixed per-test prices by validity
        // 12 months: ₹300/test
        // 18 months: ₹290/test
        // 24 months: ₹280/test
        const priceMap: { [key: number]: number } = {
          12: 300,
          18: 290,
          24: 280
        };
        const pricePerTest = priceMap[months];
        const totalPrice = tests * pricePerTest;
        
        // Update displays
        const testCount = document.querySelector('.custom-test-count');
        const monthCount = document.querySelector('.custom-month-count');
        const perTestDisplay = document.querySelector('.custom-per-test');
        const totalPriceDisplay = document.querySelector('.custom-total-price');
        
        if (testCount) testCount.textContent = tests.toString();
        if (monthCount) monthCount.textContent = months.toString();
        if (perTestDisplay) perTestDisplay.textContent = `₹${pricePerTest}`;
        if (totalPriceDisplay) totalPriceDisplay.textContent = `₹${totalPrice.toLocaleString('en-IN')}`;
      };
      
      testSlider.addEventListener('input', updatePrice);
      monthSlider.addEventListener('input', updatePrice);
      
      // Initial calculation
      updatePrice();
      
      return () => {
        testSlider.removeEventListener('input', updatePrice);
        monthSlider.removeEventListener('input', updatePrice);
      };
    };
    
    // Small delay to ensure DOM is ready
    const timer = setTimeout(calculateCustomPrice, 100);
    return () => clearTimeout(timer);
  }, []);

  const plans = [
    {
      id: 'trial',
      name: 'One Time',
      tagline: 'Try it once',
      price: 199,
      priceNote: '1 Zeflash AI diagnostic',
      tests: 1,
      months: 0,
      trial: true,
      popular: false,
      cta: 'Start Trial',
      features: [
        '1 complete 20-min diagnostic',
        'Instant health report',
        'PDF download',
        'Basic recommendations',
        "Coupon emailed if you're new to Zeflash",
      ],
    },
    {
      id: 'core',
      name: 'Core Pack',
      tagline: 'Everyday Driver',
      price: 1199,
      priceNote: '4 tests/year (Quarterly)',
      tests: 4,
      months: 12,
      trial: false,
      popular: false,
      cta: 'Get Core Pack',
      features: [
        'Free Unlimited EV Charger & Service Center Discovery',
        'Free Digital Garage & Renew Vehicle Insurance',
        '4 Zeflash AI Diagnostic Tests/year (Quarterly)',
        'Instant health report',
        'Basic recommendations',
        'Basic Safety & Overheating Alerts',
      ],
    },
    {
      id: 'premium',
      name: 'Premium Pack',
      tagline: 'Pro & Commercial',
      price: 2499,
      priceNote: '6 tests/year (Bi-monthly)',
      tests: 6,
      months: 12,
      trial: false,
      popular: true,
      cta: 'Get Premium',
      features: [
        'Free Unlimited EV Charger & Service Center Discovery',
        'Free Digital Garage & Renew Vehicle Insurance',
        '6 Zeflash AI Diagnostic Tests/year (Bi-monthly)',
        'Get TruEV Value Predictor (Battery Aging & Cell Data Analysis)',
        '1 Annual Comprehensive Audit Reports - ZipsureAi Battery Health Audit',
        '1 SoS Breakdown EV Towings - Roadside Assistance (RSA)',
        'Real-time Thermal Warnings and Performance loss warnings - Safety & Overheating Alerts',
      ],
    },
    {
      id: 'elite',
      name: 'Elite Pack',
      tagline: 'High-Grade & Luxury',
      price: 4999,
      priceNote: '12 tests/year (Monthly)',
      tests: 12,
      months: 12,
      trial: false,
      popular: false,
      cta: 'Get Elite Pack',
      features: [
        'Free Unlimited EV Charger & Service Center Discovery',
        'Free Digital Garage & Renew Vehicle Insurance',
        '12 Zeflash AI Diagnostic Tests/year (Monthly)',
        'Get TruEV Value Predictor (Battery Aging and Cell Data Analysis)',
        '2 Annual Comprehensive Audit Reports - ZipsureAi Battery Health Audit',
        '2 SoS Breakdown EV Towings - Roadside Assistance (RSA)',
        'Priority with Emergency AI Dispatch Support - Safety & Overheating Alerts',
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity" title="Back to landing page">
              <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600">
                <Zap className="text-white" size={24} />
              </div>
              <span className="text-xl font-bold text-gray-900">Zeflash</span>
            </Link>
            <div className="flex items-center gap-4">
              <CreditsWallet size="sm" />
              <Link 
                to="/" 
                className="inline-flex items-center gap-2 text-gray-700 hover:text-blue-600 font-medium transition-colors"
              >
                <ArrowLeft size={18} />
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Pricing Section */}
      <section className="py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">Flexible Testing Plans</h1>
            <p className="mt-3 text-gray-700 max-w-2xl mx-auto text-lg">
              Choose the plan that fits your needs — from one-time diagnostics to regular fleet monitoring.
            </p>
            <div className="mt-3 inline-flex items-center gap-2 bg-violet-50 border border-violet-200 rounded-full px-4 py-1.5 text-sm font-semibold text-violet-700">
              <span>⚡</span> 1 battery test = 1 ZeVault credit
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`relative rounded-2xl border-2 p-6 transition-all flex flex-col ${
                  plan.popular
                    ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-white shadow-xl hover:shadow-2xl'
                    : plan.trial
                    ? 'border-emerald-400 bg-gradient-to-br from-emerald-50 to-white hover:shadow-lg'
                    : 'border-indigo-400 bg-gradient-to-br from-indigo-50 to-white hover:shadow-lg hover:border-indigo-500'
                }`}
              >
                {plan.trial && (
                  <div className="absolute -top-3 right-4">
                    <span className="inline-block rounded-full bg-emerald-500 px-3 py-1 text-xs font-bold text-white shadow-md">
                      TRIAL
                    </span>
                  </div>
                )}
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="inline-block rounded-full bg-gradient-to-r from-blue-600 to-cyan-600 px-4 py-1 text-xs font-bold text-white shadow-md">
                      MOST POPULAR
                    </span>
                  </div>
                )}
                <div className={`mb-4 ${plan.popular ? 'mt-2' : ''}`}>
                  <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{plan.tagline}</p>
                </div>
                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span
                      className={`text-4xl font-extrabold ${
                        plan.trial ? 'text-emerald-700' : plan.popular || !plan.trial ? 'text-blue-700' : 'text-gray-900'
                      }`}
                    >
                      ₹{plan.price.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1"> • {plan.priceNote}</p>
                </div>
                <ul className="space-y-3 mb-6 flex-grow">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <svg
                        className={`${plan.trial ? 'text-emerald-600' : 'text-blue-600'} mt-0.5 flex-shrink-0`}
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                        <polyline points="22 4 12 14.01 9 11.01" />
                      </svg>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => {
                    console.log(`📋 ${plan.name} Selected:`, {
                      plan: plan.id,
                      tests: plan.tests,
                      months: plan.months,
                      price: plan.price,
                      amountInPaise: plan.price * 100,
                    });
                    navigate(
                      `/checkout?plan=${plan.id}&tests=${plan.tests}&months=${plan.months}&price=${plan.price}`
                    );
                  }}
                  className={`block w-full text-center rounded-lg text-white font-semibold px-4 py-2.5 shadow-sm transition-all ${
                    plan.trial
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : plan.popular
                      ? 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700'
                      : 'bg-gradient-to-r from-green-500 via-teal-500 to-blue-500 hover:from-green-600 hover:via-teal-600 hover:to-blue-600'
                  }`}
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>

          <div className="mt-8 text-center">
            <p className="text-sm text-gray-600">
              All plans include secure Razorpay checkout • 90%+ diagnostic accuracy • Instant report generation
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default PricingPlans;
