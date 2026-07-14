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
            {/* First Time Trial */}
            <div className="relative rounded-2xl border-2 border-emerald-400 bg-gradient-to-br from-emerald-50 to-white p-6 hover:shadow-lg transition-all flex flex-col">
              <div className="absolute -top-3 right-4">
                <span className="inline-block rounded-full bg-emerald-500 px-3 py-1 text-xs font-bold text-white shadow-md">
                  TRIAL
                </span>
              </div>
              <div className="mb-4">
                <h3 className="text-xl font-bold text-gray-900">One Time</h3>
                <p className="text-sm text-gray-600 mt-1">Try it once</p>
              </div>
              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-emerald-700">₹300</span>
                </div>
                <p className="text-xs text-gray-600 mt-1"> • Valid for one time use only</p>
              </div>
              <ul className="space-y-3 mb-6 flex-grow">
                <li className="flex items-start gap-2 text-sm text-gray-700">
                  <svg className="text-emerald-600 mt-0.5 flex-shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                  <span>1 complete 20-min diagnostic</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-700">
                  <svg className="text-emerald-600 mt-0.5 flex-shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                  <span>Instant health report</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-700">
                  <svg className="text-emerald-600 mt-0.5 flex-shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                  <span>PDF download</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-700">
                  <svg className="text-emerald-600 mt-0.5 flex-shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                  <span>Basic recommendations</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-700">
                  <svg className="text-emerald-600 mt-0.5 flex-shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                  <span>No credit card required</span>
                </li>
              </ul>
              <button
                onClick={() => {
                  console.log('📋 Trial Plan Selected:', { plan: 'trial', tests: 1, months: 0, price: 300, amountInPaise: 30000 });
                  navigate('/checkout?plan=trial&tests=1&months=0&price=300');
                }}
                className="block w-full text-center rounded-lg bg-emerald-600 text-white font-semibold px-4 py-2.5 hover:bg-emerald-700 transition-colors shadow-sm"
              >
                Start Trial
              </button>
            </div>

            {/* 4 Tests Pack */}
            <div className="relative rounded-2xl border-2 border-indigo-400 bg-gradient-to-br from-indigo-50 to-white p-6 hover:shadow-lg hover:border-indigo-500 transition-all flex flex-col">
              <div className="mb-4">
                <h3 className="text-xl font-bold text-gray-900">Starter Pack</h3>
                <p className="text-sm text-gray-600 mt-1">Regular monitoring</p>
              </div>
              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-gray-900">₹1,500</span>
                </div>
                <p className="text-xs text-gray-600 mt-1">6 tests  • Valid for 1 year</p>
              </div>
              <ul className="space-y-3 mb-6 flex-grow">
                <li className="flex items-start gap-2 text-sm text-gray-700">
                  <svg className="text-blue-600 mt-0.5 flex-shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                  <span>6 AI diagnostic tests</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-700">
                  <svg className="text-blue-600 mt-0.5 flex-shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                  <span>1 year validity</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-700">
                  <svg className="text-blue-600 mt-0.5 flex-shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                  <span>Trend analysis</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-700">
                  <svg className="text-blue-600 mt-0.5 flex-shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                  <span>Email support</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-700">
                  <svg className="text-blue-600 mt-0.5 flex-shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                  <span>Monthly health check-ins</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-700">
                  <svg className="text-blue-600 mt-0.5 flex-shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                  <span>Easy renewal option</span>
                </li>
              </ul>
              <button
                onClick={() => {
                  console.log('📋 Starter Plan Selected:', { plan: 'starter', tests: 8, months: 12, price: 2000, amountInPaise: 200000 });
                  navigate('/checkout?plan=starter&tests=8&months=12&price=2000');
                }}
                className="block w-full text-center rounded-lg bg-gradient-to-r from-green-500 via-teal-500 to-blue-500 hover:from-green-600 hover:via-teal-600 hover:to-blue-600 active:from-green-700 active:via-teal-700 active:to-blue-700 text-white font-semibold px-4 py-2.5 shadow-md transition-all"
              >
                Get Started
              </button>
            </div>

            {/* Value Pack - Popular */}
            <div className="relative rounded-2xl border-2 border-blue-500 bg-gradient-to-br from-blue-50 to-white p-6 shadow-xl hover:shadow-2xl transition-all flex flex-col">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <span className="inline-block rounded-full bg-gradient-to-r from-blue-600 to-cyan-600 px-4 py-1 text-xs font-bold text-white shadow-md">
                  MOST POPULAR
                </span>
              </div>
              <div className="mb-4 mt-2">
                <h3 className="text-xl font-bold text-gray-900">Value Pack</h3>
                <p className="text-sm text-gray-600 mt-1">Best value</p>
              </div>
              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-blue-700">₹3,000</span>
                </div>
                <p className="text-xs text-gray-600 mt-1">12 tests  • Valid for 1 year</p>
              </div>
              <ul className="space-y-3 mb-6 flex-grow">
                <li className="flex items-start gap-2 text-sm text-gray-700">
                  <svg className="text-blue-600 mt-0.5 flex-shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                  <span>12 AI diagnostic tests</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-700">
                  <svg className="text-blue-600 mt-0.5 flex-shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                  <span>1 year validity</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-700">
                  <svg className="text-blue-600 mt-0.5 flex-shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                  <span>Priority support</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-700">
                  <svg className="text-blue-600 mt-0.5 flex-shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                  <span>Quarterly performance reports</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-700">
                  <svg className="text-blue-600 mt-0.5 flex-shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                  <span>Free battery optimization tips</span>
                </li>
              </ul>
              <button
                onClick={() => {
                  console.log('📋 Value Pack Plan Selected:', { plan: 'value', tests: 12, months: 12, price: 3000, amountInPaise: 300000 });
                  navigate('/checkout?plan=value&tests=12&months=12&price=3000');
                }}
                className="block w-full text-center rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold px-4 py-2.5 hover:from-blue-700 hover:to-cyan-700 shadow-md transition-all"
              >
                Get Value Pack
              </button>
            </div>

            {/* Smart Pack */}
            <div className="relative rounded-2xl border-2 border-blue-500 bg-gradient-to-br from-blue-50 to-white p-6 shadow-xl hover:shadow-2xl transition-all flex flex-col">
              <div className="mb-4 mt-2">
                <h3 className="text-xl font-bold text-gray-900">Smart Pack</h3>
                <p className="text-sm text-gray-600 mt-1">Best value saver</p>
              </div>
              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-blue-700">₹6,000</span>
                </div>
                <p className="text-xs text-gray-600 mt-1">24 tests  • Valid for 2 years</p>
              </div>
              <ul className="space-y-3 mb-6 flex-grow">
                <li className="flex items-start gap-2 text-sm text-gray-700">
                  <svg className="text-blue-600 mt-0.5 flex-shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                  <span>24 AI diagnostic tests</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-700">
                  <svg className="text-blue-600 mt-0.5 flex-shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                  <span>2 years validity</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-700">
                  <svg className="text-blue-600 mt-0.5 flex-shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                  <span>Priority scheduling</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-700">
                  <svg className="text-blue-600 mt-0.5 flex-shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                  <span>Advanced insights</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-700">
                  <svg className="text-blue-600 mt-0.5 flex-shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                  <span>Priority support</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-700">
                  <svg className="text-blue-600 mt-0.5 flex-shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                  <span>Quarterly performance reports</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-700">
                  <svg className="text-blue-600 mt-0.5 flex-shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                  <span>Free battery optimization tips</span>
                </li>
              </ul>
              <button
                onClick={() => {
                  console.log('📋 Smart Pack Plan Selected:', { plan: 'smart', tests: 24, months: 24, price: 6000, amountInPaise: 600000 });
                  navigate('/checkout?plan=smart&tests=24&months=24&price=6000');
                }}
                className="block w-full text-center rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold px-4 py-2.5 hover:from-blue-700 hover:to-cyan-700 shadow-md transition-all"
              >
                Get Smart Pack
              </button>
            </div>
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
