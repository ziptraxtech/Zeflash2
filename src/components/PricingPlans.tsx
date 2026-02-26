import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, ArrowLeft, Zap } from 'lucide-react';

const PricingPlans: React.FC = () => {
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
        // 12 months: ₹200/test
        // 18 months: ₹190/test
        // 24 months: ₹180/test
        const priceMap: { [key: number]: number } = {
          12: 200,
          18: 190,
          24: 180
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
            <Link to="/" className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600">
                <Zap className="text-white" size={24} />
              </div>
              <span className="text-xl font-bold text-gray-900">Zeflash</span>
            </Link>
            <Link 
              to="/" 
              className="inline-flex items-center gap-2 text-gray-700 hover:text-blue-600 font-medium transition-colors"
            >
              <ArrowLeft size={18} />
              Back to Home
            </Link>
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {/* First Time Trial */}
            <div className="relative rounded-2xl border-2 border-emerald-400 bg-gradient-to-br from-emerald-50 to-white p-6 hover:shadow-lg transition-all">
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
                  <span className="text-4xl font-extrabold text-emerald-700">₹299</span>
                </div>
                <p className="text-xs text-gray-600 mt-1">₹299/test</p>
              </div>
              <ul className="space-y-3 mb-6">
                <li className="flex items-start gap-2 text-sm text-gray-700">
                  <CheckCircle className="text-emerald-600 mt-0.5 flex-shrink-0" size={16} />
                  <span>1 complete 20-min diagnostic</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-700">
                  <CheckCircle className="text-emerald-600 mt-0.5 flex-shrink-0" size={16} />
                  <span>Instant health report</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-700">
                  <CheckCircle className="text-emerald-600 mt-0.5 flex-shrink-0" size={16} />
                  <span>PDF download</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-700">
                  <CheckCircle className="text-emerald-600 mt-0.5 flex-shrink-0" size={16} />
                  <span>Basic recommendations</span>
                </li>
              </ul>
              <Link
                to="/checkout?plan=trial&tests=1&months=0&price=99"
                className="block w-full text-center rounded-lg bg-emerald-600 text-white font-semibold px-4 py-2.5 hover:bg-emerald-700 transition-colors shadow-sm"
              >
                Start Trial
              </Link>
            </div>

            {/* 4 Tests Pack */}
            <div className="relative rounded-2xl border-2 border-indigo-400 bg-gradient-to-br from-indigo-50 to-white p-6 hover:shadow-lg hover:border-indigo-500 transition-all">
              <div className="mb-4">
                <h3 className="text-xl font-bold text-gray-900">Starter Pack</h3>
                <p className="text-sm text-gray-600 mt-1">Regular monitoring</p>
              </div>
              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-gray-900">₹999</span>
                </div>
                <p className="text-xs text-gray-600 mt-1">4 tests • ₹250/test • Valid 1 year</p>
              </div>
              <ul className="space-y-3 mb-6">
                <li className="flex items-start gap-2 text-sm text-gray-700">
                  <CheckCircle className="text-blue-600 mt-0.5 flex-shrink-0" size={16} />
                  <span>4 AI diagnostic tests</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-700">
                  <CheckCircle className="text-blue-600 mt-0.5 flex-shrink-0" size={16} />
                  <span>1 year validity</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-700">
                  <CheckCircle className="text-blue-600 mt-0.5 flex-shrink-0" size={16} />
                  <span>Trend analysis</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-700">
                  <CheckCircle className="text-blue-600 mt-0.5 flex-shrink-0" size={16} />
                  <span>Email support</span>
                </li>
              </ul>
              <Link
                to="/checkout?plan=starter&tests=4&months=12&price=999"
                className="block w-full text-center rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold px-4 py-2.5 hover:from-blue-700 hover:to-cyan-700 shadow-md transition-all"
              >
                Get Started
              </Link>
            </div>

            {/* 8 Tests Pack - Popular */}
            <div className="relative rounded-2xl border-2 border-blue-500 bg-gradient-to-br from-blue-50 to-white p-6 shadow-xl hover:shadow-2xl transition-all">
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
                  <span className="text-4xl font-extrabold text-blue-700">₹1,499</span>
                </div>
                <p className="text-xs text-gray-600 mt-1">8 tests • ₹187/test • Valid 1 year</p>
              </div>
              <ul className="space-y-3 mb-6">
                <li className="flex items-start gap-2 text-sm text-gray-700">
                  <CheckCircle className="text-blue-600 mt-0.5 flex-shrink-0" size={16} />
                  <span>8 AI diagnostic tests</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-700">
                  <CheckCircle className="text-blue-600 mt-0.5 flex-shrink-0" size={16} />
                  <span>1 year validity</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-700">
                  <CheckCircle className="text-blue-600 mt-0.5 flex-shrink-0" size={16} />
                  <span>Priority scheduling</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-700">
                  <CheckCircle className="text-blue-600 mt-0.5 flex-shrink-0" size={16} />
                  <span>Advanced insights</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-700">
                  <CheckCircle className="text-blue-600 mt-0.5 flex-shrink-0" size={16} />
                  <span>Priority support</span>
                </li>
              </ul>
              <Link
                to="/checkout?plan=value&tests=8&months=12&price=1499"
                className="block w-full text-center rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold px-4 py-2.5 hover:from-blue-700 hover:to-cyan-700 shadow-md transition-all"
              >
                Get Value Pack
              </Link>
            </div>

            {/* Custom Plan */}
            <div className="relative rounded-2xl border-2 border-purple-600 bg-white p-6 hover:shadow-lg hover:border-pink-500 transition-all">
              <div className="mb-4">
                <h3 className="text-xl font-bold text-gray-900">Custom Plan</h3>
                <p className="text-sm text-gray-600 mt-1">Tailored for you</p>
              </div>
              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="custom-total-price text-4xl font-extrabold text-gray-900">₹1,600</span>
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  <span className="custom-per-test">₹200</span>/test
                </p>
              </div>
              
              <div className="mb-6 space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Number of tests</label>
                  <input
                    type="range"
                    min="6"
                    max="24"
                    defaultValue="8"
                    className="w-full h-2 bg-gradient-to-r from-blue-200 to-blue-400 rounded-lg appearance-none cursor-pointer custom-test-slider"
                    style={{
                      background: 'linear-gradient(to right, #93c5fd 0%, #3b82f6 100%)'
                    }}
                  />
                  <div className="mt-2 text-center">
                    <span className="custom-test-count text-2xl font-bold text-blue-600">8</span>
                    <span className="text-sm text-gray-600 ml-1">tests</span>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Validity period</label>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="1"
                    defaultValue="0"
                    className="w-full h-2 bg-gradient-to-r from-emerald-200 to-emerald-400 rounded-lg appearance-none cursor-pointer custom-month-slider"
                    style={{
                      background: 'linear-gradient(to right, #6ee7b7 0%, #10b981 100%)'
                    }}
                  />
                  <div className="mt-2 text-center">
                    <span className="custom-month-count text-2xl font-bold text-emerald-600">12</span>
                    <span className="text-sm text-gray-600 ml-1">months</span>
                  </div>
                </div>
              </div>

              <ul className="space-y-3 mb-6">
                <li className="flex items-start gap-2 text-sm text-gray-700">
                  <CheckCircle className="text-purple-600 mt-0.5 flex-shrink-0" size={16} />
                  <span>Flexible validity</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-700">
                  <CheckCircle className="text-purple-600 mt-0.5 flex-shrink-0" size={16} />
                  <span>Volume discounts</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-700">
                  <CheckCircle className="text-purple-600 mt-0.5 flex-shrink-0" size={16} />
                  <span>Dedicated support</span>
                </li>
              </ul>
              <button
                onClick={() => {
                  const testSlider = document.querySelector('.custom-test-slider') as HTMLInputElement;
                  const monthSlider = document.querySelector('.custom-month-slider') as HTMLInputElement;
                  if (testSlider && monthSlider) {
                    const tests = testSlider.value;
                    const monthStep = monthSlider.value;
                    const monthOptions = [12, 18, 24];
                    const months = monthOptions[parseInt(monthStep)];
                    const priceMap: { [key: number]: number } = { 12: 200, 18: 190, 24: 180 };
                    const pricePerTest = priceMap[months];
                    const totalPrice = parseInt(tests) * pricePerTest;
                    window.location.href = `/checkout?plan=custom&tests=${tests}&months=${months}&price=${totalPrice}`;
                  }
                }}
                className="block w-full text-center rounded-lg bg-purple-600 text-white font-semibold px-4 py-2.5 hover:bg-purple-700 transition-colors shadow-sm"
              >
                Buy Custom Plan
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
