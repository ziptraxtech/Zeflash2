import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Zap, Zap as Bolt, Play, CheckCircle, Microscope, Cpu, Battery, Download, Store } from 'lucide-react';
import { SignUpButton, SignedIn, SignedOut, UserButton } from '@clerk/clerk-react';
import CreditsWallet from './CreditsWallet';

const SectionLink: React.FC<{ href: string; label: string; active?: boolean }> = ({ href, label, active }) => {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Get the section ID from the href (e.g., "#what" -> "what")
    const sectionId = href.substring(1);
    const sectionElement = document.getElementById(sectionId);
    
    if (sectionElement) {
      // If we're on the landing page and element exists, scroll to it
      e.preventDefault();
      sectionElement.scrollIntoView({ behavior: 'smooth' });
    }
    // If we're not on the landing page, the default link behavior will take us there
  };
  
  return (
    <a
      href={href}
      onClick={handleClick}
      aria-current={active ? 'page' : undefined}
      className={
        `px-3 py-1.5 rounded-md text-sm font-medium transition-colors ` +
        (active
          ? 'bg-blue-600 text-white shadow-sm'
          : 'text-gray-700 hover:text-blue-700 hover:bg-blue-50')
      }
    >
      {label}
    </a>
  );
};

const ZeflashLanding: React.FC = () => {
  const topRef = useRef<HTMLDivElement | null>(null);
  const [activeSection, setActiveSection] = useState<string>('');
  const [backPressCount, setBackPressCount] = useState<number>(0);
  const [showExitConfirm, setShowExitConfirm] = useState<boolean>(false);
  const [offerClaimed, setOfferClaimed] = useState<boolean>(false);
  const backPressTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const apkDownloadUrl = 'https://www.indusappstore.com/apps/auto-and-vehicles/zeflash/com.ziptraxtech.zeflash/?page=details&id=com.ziptraxtech.zeflash';

  // Handle back button press
  const handleBackPress = () => {
    const currentCount = backPressCount + 1;
    setBackPressCount(currentCount);

    if (currentCount === 1) {
      // First back press: scroll to top
      topRef.current?.scrollIntoView({ behavior: 'smooth' });
      
      // Reset count after 2 seconds of inactivity
      if (backPressTimeoutRef.current) {
        clearTimeout(backPressTimeoutRef.current);
      }
      backPressTimeoutRef.current = setTimeout(() => {
        setBackPressCount(0);
      }, 2000);
    } else if (currentCount >= 2) {
      // Second back press: show exit confirmation
      setShowExitConfirm(true);
      if (backPressTimeoutRef.current) {
        clearTimeout(backPressTimeoutRef.current);
      }
    }
  };

  // Handle exit confirmation
  const handleExit = () => {
    // Navigate back or close
    window.history.back();
  };

  const handleStay = () => {
    setShowExitConfirm(false);
    setBackPressCount(0);
  };

  // Handle offer claim - one time use per user
  const handleClaimOffer = () => {
    const claimedOffers = JSON.parse(localStorage.getItem('zeflash_claimed_offers') || '[]');
    
    // Mark offer as claimed in localStorage
    localStorage.setItem('zeflash_claimed_offers', JSON.stringify([...claimedOffers, 'early_adopter_50_off']));
    setOfferClaimed(true);
  };

  // Check if offer has already been claimed
  const isOfferAlreadyClaimed = () => {
    if (typeof window === 'undefined') return false;
    const claimedOffers = JSON.parse(localStorage.getItem('zeflash_claimed_offers') || '[]');
    return claimedOffers.includes('early_adopter_50_off');
  };

  useEffect(() => {
    const sectionIds = ['what', 'features', 'how', 'science', 'metrics', 'who', 'why'];
    let ticking = false;

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          let current = '';
          for (const id of sectionIds) {
            const el = document.getElementById(id);
            if (!el) continue;
            const rect = el.getBoundingClientRect();
            if (rect.top <= 120 && rect.bottom >= 120) {
              current = id === 'how' ? 'how' : id === 'metrics' ? 'science' : id;
              break;
            }
          }
          setActiveSection(current || 'what');
          ticking = false;
        });
        ticking = true;
      }
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    // Add back button handler for both popstate and Android back button
    const handlePopState = () => {
      handleBackPress();
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('popstate', handlePopState);
      if (backPressTimeoutRef.current) {
        clearTimeout(backPressTimeoutRef.current);
      }
    };
  }, [backPressCount]);

  useEffect(() => {
    // Check if offer has been claimed on component mount
    if (isOfferAlreadyClaimed()) {
      setOfferClaimed(true);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-blue-50/50 text-gray-900">
      {/* Top bar */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Zeflash Logo" className="h-12 w-12 object-contain" />
            <div className="leading-tight">
              <div className="text-base font-bold">Zeflash</div>
              <div className="text-xs text-gray-500">Rapid AI Diagnostics & Power</div>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-1">
            <SectionLink href="#what" label="About" active={activeSection==='what'} />
            <SectionLink href="#features" label="Features" active={activeSection==='features'} />
            <SectionLink href="#how" label="Deeptech for EVs" active={activeSection==='how'} />
            <SectionLink href="#who" label="Who it's for" active={activeSection==='who'} />
            <SectionLink href="#why" label="Why Zeflash" active={activeSection==='why'} />
            <Link
              to="/plans"
              className="px-3 py-1.5 rounded-md text-sm font-semibold text-white bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 shadow-md shadow-emerald-200/30 transition-all"
            >
              Pricing
            </Link>
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <SignedIn>
              <CreditsWallet size="sm" showLabel={true} className="hidden sm:flex" />
            </SignedIn>
            <SignedOut>
              <SignUpButton mode="modal">
                <button className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-purple-500 to-purple-600 text-white text-xs sm:text-sm font-semibold px-3 sm:px-5 py-2 hover:from-purple-600 hover:to-purple-700 shadow-md shadow-purple-200/40 transition-all">
                  <span className="hidden sm:inline">Sign Up</span>
                  <span className="sm:hidden">Sign Up</span>
                </button>
              </SignUpButton>
            </SignedOut>
            <SignedIn>
              <UserButton />
            </SignedIn>
            <Link to="/stations" className="inline-flex items-center gap-1 sm:gap-2 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-xs sm:text-sm font-semibold px-2 sm:px-4 py-2 hover:from-blue-600 hover:to-indigo-700 shadow-md shadow-blue-200/40 transition-all">
              <Bolt size={16} /> 
              <span className="hidden sm:inline">Quick Test</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section ref={topRef} className="relative overflow-hidden">
        {/* Decorative Background */}
        <div className="pointer-events-none absolute -top-20 -right-24 w-80 h-80 bg-gradient-to-tr from-cyan-400/30 to-blue-500/30 blur-3xl rounded-full" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 w-96 h-96 bg-gradient-to-tr from-emerald-300/25 to-cyan-400/25 blur-3xl rounded-full" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div>
              <p className="text-sm font-semibold text-blue-600">Zeflash </p>
              <h1 className="mt-2 text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-gray-900">
                ⚡ Zeflash: Rapid AI Diagnostics & Power
              </h1>
              <p className="mt-4 text-gray-700 text-lg">
                Quick 20 mins EV & Battery Test, anytime you charge your EV! With Zeflash, get a precise rapid battery health insight report in minutes, not hours.
              </p>
              <p className="mt-2 text-gray-700">
                Zeflash combines flash-based EV testing at Fast Chargers with ZipsureAI's battery physics-driven AI Deeptech to decode your EV's true performance, aging, and safety condition on the spot.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link to="/stations" className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold px-4 py-2.5 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-200/30">
                  <CheckCircle size={18} /> Get 20 Min Ai RapidTest
                </Link>
                <Link to="/plans" className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-green-600 text-white font-medium px-4 py-2.5 hover:from-emerald-600 hover:to-green-700 shadow-md shadow-emerald-200/30">
                  <Play size={18} /> Flexible Testing Plans
                </Link>
              </div>
            </div>
            <div className="relative">
              <div className="rounded-2xl border border-blue-100 bg-white p-6 shadow-xl shadow-blue-100/50">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 hover:bg-blue-100 transition-colors">
                    <div className="text-xs text-blue-700 font-semibold">Instant Health Report</div>
                    <div className="text-3xl font-extrabold text-blue-700 mt-1">20 Min ✅</div>
                  </div>
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 transition-colors">
                    <div className="text-xs text-emerald-700 font-semibold">ML Accuracy</div>
                    <div className="text-3xl font-extrabold text-emerald-700 mt-1">94.66%</div>
                  </div>
                  <div className="p-4 rounded-xl bg-violet-50 border border-violet-100 hover:bg-violet-100 transition-colors">
                    <div className="text-xs text-violet-700 font-semibold">Precision</div>
                    <div className="text-xs text-violet-600 mt-1">[Excellent True Positives]</div>
                    <div className="text-2xl font-extrabold text-violet-700 mt-2">91.8%</div>
                  </div>
                  <div className="p-4 rounded-xl bg-orange-50 border border-orange-100 hover:bg-orange-100 transition-colors">
                    <div className="text-xs text-orange-700 font-semibold">False Negative Rate</div>
                    <div className="text-xs text-orange-600 mt-1">[Low Misdetection]</div>
                    <div className="text-2xl font-extrabold text-orange-700 mt-2">6.1%</div>
                  </div>
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-100 col-span-2 hover:bg-amber-100 transition-colors">
                    <div className="text-xs text-amber-700 font-semibold">Outputs</div>
                    <div className="mt-2 text-sm text-amber-800">SoP, SoF, Efficiency variance, range loss estimates, and expert recommendations.</div>
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">Illustrative metrics. Live values depend on vehicle and session.</p>
            </div>
          </div>
        </div>
      </section>

      {/* App Download */}
      <section id="app-download" className="py-10 sm:py-12 bg-white border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="mb-6">
            <p className="text-sm font-semibold text-blue-600">Mobile App</p>
            <h2 className="mt-2 text-2xl sm:text-3xl font-bold text-gray-900">Get the Zeflash app</h2>
            <p className="mt-3 text-gray-700 max-w-2xl">Download the Android APK now. Play Store rollout is on the way.</p>
          </div>
          
          {/* QR Code and Download Buttons Side by Side */}
          <div className="flex flex-col lg:flex-row gap-8 items-center lg:items-start">
            <div className="flex-shrink-0">
              <div className="relative bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-2xl shadow-lg border-2 border-blue-100">
                <div className="absolute -top-3 -left-3 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">
                  Quick Access
                </div>
                <img 
                  src="/QR zeflash.jpeg" 
                  alt="Scan QR Code to Download Zeflash App" 
                  className="w-44 h-44 sm:w-52 sm:h-52 object-contain rounded-lg"
                />
              </div>
            </div>
            <div className="flex-1 space-y-4">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">Scan to Download Instantly</h3>
                <p className="mt-2 text-gray-600 leading-relaxed">
                  Simply point your phone's camera at the QR code to download and install the Zeflash app in seconds. No app store required!
                </p>
              </div>
              <div className="flex flex-wrap gap-3 mt-4">
                <button
                  type="button"
                  disabled
                  aria-disabled="true"
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-500 cursor-not-allowed shadow-sm"
                >
                  <Store size={18} /> Play Store (Coming soon)
                </button>
                <a
                  href={apkDownloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:from-blue-700 hover:to-indigo-700"
                >
                  <Download size={18} /> Download APK
                </a>
              </div>
              <p className="text-xs text-gray-500">Direct APK download for Android. Enable installs from your browser if prompted.</p>
              <div className="space-y-3 mt-6">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle size={16} className="text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Fast & Easy Installation</p>
                    <p className="text-xs text-gray-600">Direct download, no registration needed</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle size={16} className="text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Works on All Android Devices</p>
                    <p className="text-xs text-gray-600">Compatible with Android 6.0 and above</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle size={16} className="text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Latest Release Version</p>
                    <p className="text-xs text-gray-600">Always up-to-date with newest features</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What is Zeflash */}
      <section id="what" className="py-12 sm:py-16 bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl sm:text-3xl font-bold">What is Zeflash?</h2>
          <p className="mt-4 text-gray-700 max-w-4xl">
            Zeflash Rapid Diagnostics is an advanced EV battery testing platform designed for fast, field-ready health checks. Accurately measuring State of Power (SoP) and State of Function (SoF) at pack levels — helping fleets, garages, and OEMs make instant, confident decisions for servicing, second life repurposing and safe recycling!
          </p>
        </div>
      </section>

      {/* Limited Time Offer Banner */}
      <section className="py-12 sm:py-20 relative overflow-hidden">
        {/* Animated background gradients */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-emerald-400/40 via-green-400/20 to-transparent blur-3xl animate-pulse" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gradient-to-tl from-blue-400/40 via-cyan-400/20 to-transparent blur-3xl animate-pulse" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {/* Badge */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-100 to-green-100 px-4 py-2 mb-6">
              <span className="text-2xl">🎉</span>
              <span className="text-sm font-bold text-emerald-800">Exclusive Launch Offer</span>
            </div>
          </div>

          {/* Main Offer Card */}
          <div className="bg-gradient-to-br from-white via-blue-50/30 to-emerald-50/30 rounded-3xl border border-gradient-to-r from-emerald-200 to-blue-200 p-8 sm:p-12 shadow-2xl relative overflow-hidden">
            {/* Decorative elements */}
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-gradient-to-br from-emerald-300/20 to-transparent blur-3xl rounded-full pointer-events-none" />
            <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-gradient-to-tr from-blue-300/20 to-transparent blur-3xl rounded-full pointer-events-none" />

            <div className="relative z-10">
              <div className="max-w-2xl">
                {/* Left side - Offer details */}
                <div>
                  <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
                    Early Adopter Special
                  </h2>
                  <p className="text-lg text-gray-700 mb-6">
                    First-time users get <span className="font-bold text-emerald-600">50% off your first diagnostic test</span> when you sign up today!
                  </p>

                  <div className="space-y-3 mb-8">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold text-sm mt-1">
                        ✓
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">20-Minute Rapid AI Test</p>
                        <p className="text-sm text-gray-600">Complete battery health analysis while you charge</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold text-sm mt-1">
                        ✓
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">Instant Health Report</p>
                        <p className="text-sm text-gray-600">State of Power, Function, and safety metrics—downloadable instantly</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold text-sm mt-1">
                        ✓
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">No Hidden Charges</p>
                        <p className="text-sm text-gray-600">Transparent pricing with flexible monthly plans</p>
                      </div>
                    </div>
                  </div>

                  {/* CTA Buttons */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    {!offerClaimed ? (
                      <>
                        <SignedOut>
                          <SignUpButton mode="modal">
                            <button 
                              onClick={handleClaimOffer}
                              className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-green-600 text-white font-bold px-6 py-3 hover:from-emerald-600 hover:to-green-700 shadow-lg shadow-emerald-200/40 transition-all hover:-translate-y-0.5"
                            >
                              <span>Claim 50% Off Now</span>
                              <span aria-hidden>→</span>
                            </button>
                          </SignUpButton>
                        </SignedOut>
                        <SignedIn>
                          <button
                            onClick={handleClaimOffer}
                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-green-600 text-white font-bold px-6 py-3 hover:from-emerald-600 hover:to-green-700 shadow-lg shadow-emerald-200/40 transition-all hover:-translate-y-0.5"
                          >
                            <span>Claim 50% Off Now</span>
                            <span aria-hidden>→</span>
                          </button>
                        </SignedIn>
                      </>
                    ) : (
                      <div className="inline-flex items-center justify-center gap-2 rounded-lg bg-gray-100 text-gray-600 font-bold px-6 py-3 border-2 border-gray-300 cursor-not-allowed">
                        <span>✓ Offer Already Claimed</span>
                      </div>
                    )}
                    <SignedIn>
                      <Link
                        to="/plans"
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold px-6 py-3 hover:from-blue-600 hover:to-indigo-700 shadow-lg shadow-blue-200/40 transition-all hover:-translate-y-0.5"
                      >
                        <span>View Plans</span>
                        <span aria-hidden>→</span>
                      </Link>
                    </SignedIn>
                    <Link
                      to="/stations"
                      className="inline-flex items-center justify-center gap-2 rounded-lg border-2 border-emerald-500 text-emerald-600 font-bold px-6 py-3 hover:bg-emerald-50 transition-all"
                    >
                      <span>Find Stations</span>
                    </Link>
                  </div>

                  {/* Offer validity */}
                  {!offerClaimed ? (
                    <p className="text-xs text-gray-500 mt-6">
                      <span className="font-semibold">Offer valid</span> for new users signing up in the next 30 days. Terms & conditions apply.
                    </p>
                  ) : (
                    <p className="text-xs text-emerald-600 mt-6 font-semibold">
                      ✓ Congratulations! Your 50% discount has been claimed. You can use it on your first diagnostic test.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Trust indicators */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-6 bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 text-blue-600 mb-3 text-xl">
                🔬
              </div>
              <p className="font-semibold text-gray-900 mb-1">Lab-Grade Accuracy</p>
              <p className="text-sm text-gray-600">94.66% accuracy with AI-powered diagnostics</p>
            </div>
            <div className="text-center p-6 bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 text-green-600 mb-3 text-xl">
                ⚡
              </div>
              <p className="font-semibold text-gray-900 mb-1">20 Minutes</p>
              <p className="text-sm text-gray-600">Complete results while you charge your EV</p>
            </div>
            <div className="text-center p-6 bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mb-3 text-xl">
                📊
              </div>
              <p className="font-semibold text-gray-900 mb-1">Actionable Insights</p>
              <p className="text-sm text-gray-600">Detailed reports with safety recommendations</p>
            </div>
          </div>
        </div>
      </section>

      {/* Our Other Services */}
      <section id="why" className="py-12 sm:py-16 bg-gradient-to-b from-blue-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl sm:text-3xl font-bold mb-6">Our Other Services</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[{
              name: 'ZipsureAI',
              href: 'https://zipsureai.com/',
              desc: 'AI-powered battery intelligence and safety analytics for fleets, OEMs, and energy operators.',
              accent: 'from-indigo-500 to-blue-600'
            }, {
              name: 'EVCHAMP',
              href: 'https://evchamp.in/',
              desc: 'Smart EV charging network with seamless booking, monitoring, and uptime-first operations.',
              accent: 'from-emerald-500 to-green-600'
            }].map((item) => (
              <a
                key={item.name}
                href={item.href}
                target="_blank"
                rel="noreferrer"
                className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
              >
                <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-r ${item.accent} blur-3xl`} aria-hidden />
                <div className="relative">
                  <div className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-800">
                    <CheckCircle size={14} className="text-emerald-600" />
                    {item.name}
                  </div>
                  <p className="mt-3 text-gray-900 text-lg font-semibold">{item.name}</p>
                  <p className="mt-2 text-gray-700 text-sm leading-relaxed">{item.desc}</p>
                  <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-700 group-hover:text-blue-800">
                    Visit site
                    <span aria-hidden>→</span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {/* Section Header */}
          <div className="mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-3">Core Features</h2>
            <p className="text-lg sm:text-xl text-gray-600 max-w-3xl">
              Advanced diagnostic technology that brings lab-grade EV battery analysis to charging stations worldwide
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {/* Feature 1: Rapid Flash Testing */}
            <article className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-8 transition-all duration-300 hover:border-blue-300 hover:shadow-xl hover:shadow-blue-100/50 hover:-translate-y-1">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-100 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full -mr-12 -mt-12"></div>
              
              <div className="relative z-10">
                {/* Icon Container */}
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center text-white mb-4 group-hover:shadow-lg group-hover:shadow-blue-600/30 transition-all">
                  <Bolt size={24} aria-hidden="true" />
                </div>

                {/* Feature Title */}
                <h3 className="text-xl font-bold text-gray-900 mb-2">Rapid Flash Testing</h3>
                
                {/* Feature Description */}
                <p className="text-gray-600 leading-relaxed mb-4">
                  Get real-time diagnostic scans that capture your battery's true energy output and internal efficiency — all within minutes. No disassembly required.
                </p>

                {/* Feature Highlight */}
                <div className="text-sm font-semibold text-blue-700 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  <CheckCircle size={16} /> Results in under 5 minutes
                </div>
              </div>
            </article>

            {/* Feature 2: Multi-Signal Scanning */}
            <article className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-8 transition-all duration-300 hover:border-amber-300 hover:shadow-xl hover:shadow-amber-100/50 hover:-translate-y-1">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-amber-100 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full -mr-12 -mt-12"></div>
              
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-amber-600 to-amber-700 flex items-center justify-center text-white mb-4 group-hover:shadow-lg group-hover:shadow-amber-600/30 transition-all">
                  <Microscope size={24} aria-hidden="true" />
                </div>

                <h3 className="text-xl font-bold text-gray-900 mb-2">Multi-Signal Scanning</h3>
                
                <p className="text-gray-600 leading-relaxed mb-4">
                  Go beyond surface readings. Integrates current signals, temperature, impedance, and multiple parameters to detect early degradation and unsafe charging patterns.
                </p>

                <div className="text-sm font-semibold text-amber-700 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  <CheckCircle size={16} /> 50+ data parameters analyzed
                </div>
              </div>
            </article>

            {/* Feature 3: AI + Digital Twin */}
            <article className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-8 transition-all duration-300 hover:border-purple-300 hover:shadow-xl hover:shadow-purple-100/50 hover:-translate-y-1">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-purple-100 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full -mr-12 -mt-12"></div>
              
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-600 to-purple-700 flex items-center justify-center text-white mb-4 group-hover:shadow-lg group-hover:shadow-purple-600/30 transition-all">
                  <Cpu size={24} aria-hidden="true" />
                </div>

                <h3 className="text-xl font-bold text-gray-900 mb-2">AI + Digital Twin Intelligence</h3>
                
                <p className="text-gray-600 leading-relaxed mb-4">
                  Physics-based machine learning predicts battery lifespan, efficiency degradation, and early failure trends with industry-leading precision.
                </p>

                <div className="text-sm font-semibold text-purple-700 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  <CheckCircle size={16} /> 94.66% Overall Accuracy
                </div>
              </div>
            </article>

            {/* Feature 4: Portable & On-Site */}
            <article className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-8 transition-all duration-300 hover:border-green-300 hover:shadow-xl hover:shadow-green-100/50 hover:-translate-y-1">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-green-100 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full -mr-12 -mt-12"></div>
              
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-green-600 to-green-700 flex items-center justify-center text-white mb-4 group-hover:shadow-lg group-hover:shadow-green-600/30 transition-all">
                  <Battery size={24} aria-hidden="true" />
                </div>

                <h3 className="text-xl font-bold text-gray-900 mb-2">On-Site Battery Analysis</h3>
                
                <p className="text-gray-600 leading-relaxed mb-4">
                  Compact, rugged, and field-ready — brings lab-grade diagnostics directly to EV charging stations without complex infrastructure.
                </p>

                <div className="text-sm font-semibold text-green-700 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  <CheckCircle size={16} /> Deployed globally
                </div>
              </div>
            </article>

            {/* Feature 5: Comprehensive Benchmarking */}
            <article className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-8 transition-all duration-300 hover:border-red-300 hover:shadow-xl hover:shadow-red-100/50 hover:-translate-y-1">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-red-100 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full -mr-12 -mt-12"></div>
              
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center text-white mb-4 group-hover:shadow-lg group-hover:shadow-red-600/30 transition-all">
                  <Download size={24} aria-hidden="true" />
                </div>

                <h3 className="text-xl font-bold text-gray-900 mb-2">Comprehensive Benchmarking</h3>
                
                <p className="text-gray-600 leading-relaxed mb-4">
                  Industry-standard benchmarking across battery chemistries and manufacturers ensures consistent, traceable results for certification and resale value.
                </p>

                <div className="text-sm font-semibold text-red-700 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  <CheckCircle size={16} /> Certified & Traceable
                </div>
              </div>
            </article>

            {/* Feature 6: Instant Health Reports */}
            <article className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-8 transition-all duration-300 hover:border-cyan-300 hover:shadow-xl hover:shadow-cyan-100/50 hover:-translate-y-1">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-cyan-100 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full -mr-12 -mt-12"></div>
              
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-cyan-600 to-cyan-700 flex items-center justify-center text-white mb-4 group-hover:shadow-lg group-hover:shadow-cyan-600/30 transition-all">
                  <Store size={24} aria-hidden="true" />
                </div>

                <h3 className="text-xl font-bold text-gray-900 mb-2">Instant Health Reports</h3>
                
                <p className="text-gray-600 leading-relaxed mb-4">
                  Clear, visual diagnostic reports including State of Power (SoP), State of Function (SoF), accuracy metrics, efficiency variance, and actionable recommendations.
                </p>

                <div className="text-sm font-semibold text-cyan-700 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  <CheckCircle size={16} /> Download instantly
                </div>
              </div>
            </article>
          </div>

          {/* CTA Section */}
          <div className="mt-16 text-center">
            <p className="text-gray-600 text-lg mb-6">
              Ready to experience advanced EV battery diagnostics?
            </p>
            <Link
              to="/charging-stations"
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-3 text-white font-semibold hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
              aria-label="Find Zeflash-enabled charging stations near you"
            >
              <Zap size={20} aria-hidden="true" />
              Find Charging Stations
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-12 sm:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl sm:text-3xl font-bold mb-6">How It Works</h2>
          <ol className="space-y-4">
            <li className="bg-gray-50 border border-gray-200 rounded-xl p-4"><span className="font-semibold">1. Locate, Connect & Start:</span> Find Zeflash-enabled EV Chargers, book a session, and start charging — no disassembly required.</li>
            <li className="bg-gray-50 border border-gray-200 rounded-xl p-4"><span className="font-semibold">2. Analyze & Detect:</span> Zeflash performs Rapid AI Diagnostics and creates datasets for quick processing.</li>
            <li className="bg-gray-50 border border-gray-200 rounded-xl p-4"><span className="font-semibold">3. Report & Recommend:</span> In minutes, AI models process your EV data and generate a detailed Rapid Health report to download.</li>
          </ol>
        </div>
      </section>

      {/* Deeptech for EV's */}
      <section id="metrics" className="py-12 sm:py-16 bg-gradient-to-b from-blue-50 to-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold mb-3">Deeptech for EVs</h2>
            <p className="text-gray-700 max-w-4xl mb-6">
              Zeflash integrates advanced AI Deeptech for electrochemical modeling, impedance testing, multi-parameter dataset analysis, and machine-learning algorithms. By reading subtle internal responses at each charging cycle, it builds a lifecycle profile — predicting degradation, aging, and thermal risks with above 94% accuracy.
            </p>
            <p className="text-gray-600">Our deep learning models undergo rigorous validation with real-world EV battery data</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-blue-200">
                  <th className="text-left py-4 px-4 font-semibold text-gray-900">Metric</th>
                  <th className="text-center py-4 px-4 font-semibold text-gray-900">Performance</th>
                  <th className="text-center py-4 px-4 font-semibold text-gray-600">Industry Standard</th>
                  <th className="text-center py-4 px-4 font-semibold text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100 hover:bg-blue-50/50 transition-colors">
                  <td className="py-4 px-4 font-medium text-gray-900">Overall Accuracy</td>
                  <td className="text-center py-4 px-4">
                    <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-lg font-bold text-emerald-800">
                      94.66%
                    </span>
                  </td>
                  <td className="text-center py-4 px-4 text-gray-600">~ 90%</td>
                  <td className="text-center py-4 px-4">
                    <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                      ✓ Excellent
                    </span>
                  </td>
                </tr>
                <tr className="border-b border-gray-100 hover:bg-blue-50/50 transition-colors">
                  <td className="py-4 px-4 font-medium text-gray-900">Precision</td>
                  <td className="text-center py-4 px-4">
                    <span className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-lg font-bold text-blue-800">
                      91.8%
                    </span>
                  </td>
                  <td className="text-center py-4 px-4 text-gray-600">~ 85%</td>
                  <td className="text-center py-4 px-4">
                    <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                      ✓ Good
                    </span>
                  </td>
                </tr>
                <tr className="border-b border-gray-100 hover:bg-blue-50/50 transition-colors">
                  <td className="py-4 px-4 font-medium text-gray-900">Recall</td>
                  <td className="text-center py-4 px-4">
                    <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-lg font-bold text-emerald-800">
                      93.9%
                    </span>
                  </td>
                  <td className="text-center py-4 px-4 text-gray-600">~ 90%</td>
                  <td className="text-center py-4 px-4">
                    <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                      ✓ Excellent
                    </span>
                  </td>
                </tr>
                <tr className="border-b border-gray-100 hover:bg-blue-50/50 transition-colors">
                  <td className="py-4 px-4 font-medium text-gray-900">F1-Score</td>
                  <td className="text-center py-4 px-4">
                    <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-lg font-bold text-emerald-800">
                      92.8%
                    </span>
                  </td>
                  <td className="text-center py-4 px-4 text-gray-600">~ 88%</td>
                  <td className="text-center py-4 px-4">
                    <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                      ✓ Excellent
                    </span>
                  </td>
                </tr>
                <tr className="border-b border-gray-100 hover:bg-orange-50/50 transition-colors">
                  <td className="py-4 px-4 font-medium text-gray-900">False Positive Rate</td>
                  <td className="text-center py-4 px-4">
                    <span className="inline-flex items-center gap-2 rounded-full bg-orange-100 px-3 py-1 text-lg font-bold text-orange-800">
                      3.2%
                    </span>
                  </td>
                  <td className="text-center py-4 px-4 text-gray-600">&lt; 5%</td>
                  <td className="text-center py-4 px-4">
                    <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                      ✓ Good
                    </span>
                  </td>
                </tr>
                <tr className="border-b border-gray-100 hover:bg-orange-50/50 transition-colors">
                  <td className="py-4 px-4 font-medium text-gray-900">False Negative Rate</td>
                  <td className="text-center py-4 px-4">
                    <span className="inline-flex items-center gap-2 rounded-full bg-orange-100 px-3 py-1 text-lg font-bold text-orange-800">
                      6.1%
                    </span>
                  </td>
                  <td className="text-center py-4 px-4 text-gray-600">&lt; 10%</td>
                  <td className="text-center py-4 px-4">
                    <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                      ✓ Excellent
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-6">
              <h3 className="font-semibold text-gray-900 mb-2">🎯 What This Means</h3>
              <p className="text-sm text-gray-700">Our AI model delivers highly accurate predictions of battery health, degradation, and failure risks. High precision and recall ensure minimal false alarms while catching true anomalies that matter.</p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6">
              <h3 className="font-semibold text-gray-900 mb-2">🔍 Model Validation</h3>
              <p className="text-sm text-gray-700">Validated on diverse EV fleets with multiple battery chemistries and manufacturers. Continuously improved with real-world deployment data and latest battery degradation patterns.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section id="who" className="py-12 sm:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl sm:text-3xl font-bold mb-6">Who It's For</h2>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <li className="bg-gray-50 border border-gray-200 rounded-xl p-4"><span className="font-semibold">EV Fleet Operators:</span> Schedule maintenance, manage warranties, and avoid downtime.</li>
            <li className="bg-gray-50 border border-gray-200 rounded-xl p-4"><span className="font-semibold">Service Centers:</span> Diagnose instantly, verify warranty coverage, and improve TAT.</li>
            <li className="bg-gray-50 border border-gray-200 rounded-xl p-4"><span className="font-semibold">Second-Life & Recyclers:</span> Verify pack health without dismantling; certify for reuse or recycling.</li>
            <li className="bg-gray-50 border border-gray-200 rounded-xl p-4"><span className="font-semibold">OEMs, Insurance & Manufacturers:</span> On-demand diagnostics and insights for design, passports, insurance and warranties.</li>
          </ul>
        </div>
      </section>

      {/* CTA */}
      <section id="book" className="py-12 sm:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold">🔋 See Beyond the Battery</h2>
          <p className="mt-2 text-gray-700 max-w-3xl mx-auto">
            Zeflash turns complex battery data into clear, confident action — empowering every EV decision with real-time intelligence.
          </p>
          <div className="mt-6 flex flex-wrap gap-3 justify-center">
            <Link to="/stations" className="inline-flex items-center gap-2 rounded-lg bg-blue-600 text-white font-semibold px-5 py-3 hover:bg-blue-700">
              <Bolt size={18} /> Get 20 Min Ai RapidTest
            </Link>
            <Link to="/plans" className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-green-600 text-white font-medium px-5 py-3 hover:from-emerald-600 hover:to-green-700 shadow-md shadow-emerald-200/30">
              <Play size={18} /> Flexible Testing Plans
            </Link>
          </div>
        </div>
      </section>

      {/* Bottom mobile CTA */}
      <div className="fixed bottom-3 inset-x-0 px-3 sm:px-6 z-40 md:hidden pointer-events-none">
        <div className="pointer-events-auto mx-auto max-w-2xl rounded-2xl border border-blue-100 bg-white/95 backdrop-blur shadow-lg p-3 flex items-center justify-between">
          <div className="text-sm font-semibold text-gray-800">Start a Quick Zeflash Test</div>
          <Link to="/stations" className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-sm font-semibold px-3 py-2">
            <Bolt size={16} /> Quick Test
          </Link>
        </div>
      </div>

      <footer className="py-12 bg-gradient-to-br from-gray-800 via-gray-900 to-blue-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            {/* Company Info */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600">
                  <Zap className="text-white" size={20} />
                </div>
                <h3 className="text-xl font-bold">Zeflash</h3>
              </div>
              <p className="text-gray-300 text-sm">
                India's leading AI & IoT-driven EV battery diagnostics platform.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="font-semibold text-lg mb-4">Quick Links</h3>
              <ul className="space-y-2 text-gray-300 text-sm">
                <li><a href="#what" className="hover:text-cyan-400 transition-colors">Home</a></li>
                <li><a href="#features" className="hover:text-cyan-400 transition-colors">Features</a></li>
                <li><a href="#how" className="hover:text-cyan-400 transition-colors">Coverage</a></li>
                <li><Link to="/stations" className="hover:text-cyan-400 transition-colors">Get Quote</Link></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h3 className="font-semibold text-lg mb-4">Legal</h3>
              <ul className="space-y-2">
                <li>
                  <Link to="/privacy-policy" className="text-gray-300 hover:text-cyan-400 transition-colors text-sm underline">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link to="/terms-of-use" className="text-gray-300 hover:text-cyan-400 transition-colors text-sm underline">
                    Terms of Use
                  </Link>
                </li>
                <li>
                  <Link to="/refund-policy" className="text-gray-300 hover:text-cyan-400 transition-colors text-sm underline">
                    Refund & Cancellation Policy
                  </Link>
                </li>
              </ul>
            </div>

            {/* Company Details & Contact */}
            <div>
              <h3 className="font-semibold text-lg mb-4">Company Details & Contact</h3>
              <div className="text-gray-300 text-sm space-y-2">
                <p className="font-semibold text-white">Zipbolt Technologies Pvt Ltd</p>
                <p>MGF Metropolis Mall, MG Road,<br />Gurgaon, Haryana – 122002</p>
                <p>Phone: <a href="tel:+918368681769" className="hover:text-cyan-400">+91 83686 81769</a></p>
                <p>Email: <a href="mailto:contact@zeflash.app" className="hover:text-cyan-400">contact@zeflash.app</a></p>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-700 pt-6 text-center text-sm text-gray-400">
            © {new Date().getFullYear()} Zeflash. All Rights Reserved.
          </div>
        </div>
      </footer>

      {/* Exit Confirmation Modal */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="rounded-2xl border border-gray-200 bg-white shadow-2xl max-w-sm w-full p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-200">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
                <svg className="h-6 w-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4v2m0 0v2m0-6v-2m0 0V7m0 6h2m-4 0h-2m4 0h2m-6-2h2m-4 0h2" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Exit Zeflash?</h3>
              <p className="text-gray-600 text-sm mb-6">
                Are you sure you want to leave? You can always come back anytime to explore our EV battery diagnostics platform.
              </p>
            </div>
            <div className="flex flex-col-reverse sm:flex-row gap-3">
              <button
                onClick={handleStay}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-center font-semibold text-gray-900 hover:bg-gray-50 transition-colors"
              >
                Stay Here
              </button>
              <button
                onClick={handleExit}
                className="rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-2.5 text-center font-semibold text-white hover:from-amber-600 hover:to-orange-700 transition-all"
              >
                Exit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ZeflashLanding;
