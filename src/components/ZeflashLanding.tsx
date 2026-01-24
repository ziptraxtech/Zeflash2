import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Zap, Zap as Bolt, Play, CheckCircle, Microscope, Cpu, Battery, Download, Store } from 'lucide-react';
import { SignUpButton, SignedIn, SignedOut, UserButton } from '@clerk/clerk-react';

const SectionLink: React.FC<{ href: string; label: string; active?: boolean }> = ({ href, label, active }) => (
  <a
    href={href}
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

const ZeflashLanding: React.FC = () => {
  const topRef = useRef<HTMLDivElement | null>(null);
  const [activeSection, setActiveSection] = useState<string>('');
  const apkDownloadUrl = '/apk/zeflash-latest.apk';

  useEffect(() => {
    const sectionIds = ['what', 'features', 'how', 'science', 'who', 'why'];
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
              current = id === 'how' ? 'science' : id;
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
    return () => window.removeEventListener('scroll', onScroll);
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
            <SectionLink href="#science" label="Science Inside" active={activeSection==='science'} />
            <SectionLink href="#who" label="Who it's for" active={activeSection==='who'} />
            <SectionLink href="#why" label="Why Zeflash" active={activeSection==='why'} />
            <Link to="/plans" className="px-3 py-1.5 rounded-md text-sm font-medium transition-colors text-green-700 hover:text-green-800 hover:bg-green-50">Pricing</Link>
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
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
                  <CheckCircle size={18} /> Book a Zeflash RapidTest
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
                    <div className="text-3xl font-extrabold text-blue-700 mt-1">20 min</div>
                  </div>
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 transition-colors">
                    <div className="text-xs text-emerald-700 font-semibold">Accuracy</div>
                    <div className="text-3xl font-extrabold text-emerald-700 mt-1">90%+</div>
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
                  src="/My_QR_Code_1-1024.jpeg" 
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
                  download
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

      {/* Features */}
      <section id="features" className="py-12 sm:py-16 bg-gradient-to-b from-blue-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl sm:text-3xl font-bold mb-6">Core Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            <div className="rounded-xl border border-gray-200 bg-white p-6 transition-all hover:shadow-lg hover:-translate-y-0.5">
              <div className="flex items-center gap-2 text-blue-700 font-semibold"><Bolt size={18} /> Rapid Flash Testing</div>
              <p className="mt-2 text-gray-700">Get real-time diagnostic scans that capture your battery's true energy output and internal efficiency — all within minutes.</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-6 transition-all hover:shadow-lg hover:-translate-y-0.5">
              <div className="flex items-center gap-2 text-blue-700 font-semibold"><ActivityIcon /> Multi-Signal Scanning</div>
              <p className="mt-2 text-gray-700">Go beyond surface readings. Integrates current signals, temperature, impedance and multiple parameters to detect early degradation and unsafe charging.</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-6 transition-all hover:shadow-lg hover:-translate-y-0.5">
              <div className="flex items-center gap-2 text-blue-700 font-semibold"><Cpu size={18} /> AI + Digital Twin Intelligence</div>
              <p className="mt-2 text-gray-700">Physics-based machine learning predicts lifespan, efficiency, and early failure trends with high precision.</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-6 transition-all hover:shadow-lg hover:-translate-y-0.5">
              <div className="flex items-center gap-2 text-blue-700 font-semibold"><Battery size={18} /> Portable Analysis at EV Chargers</div>
              <p className="mt-2 text-gray-700">Compact, rugged, and easy to use — brings lab-grade diagnostics to the charging station.</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-6 transition-all hover:shadow-lg hover:-translate-y-0.5">
              <div className="flex items-center gap-2 text-blue-700 font-semibold"><Microscope size={18} /> Benchmark & Traceability</div>
              <p className="mt-2 text-gray-700">Benchmarks across chemistries and manufacturers to enable consistent, traceable results for certification and resale.</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-6 transition-all hover:shadow-lg hover:-translate-y-0.5">
              <div className="flex items-center gap-2 text-blue-700 font-semibold"><FileIcon /> Instant Health Report</div>
              <p className="mt-2 text-gray-700">Clear, visual reports including SoP, SoF, Accuracy %, Efficiency variance, range loss estimate, and recommendations.</p>
            </div>
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

      {/* Science */}
      <section id="science" className="py-12 sm:py-16 bg-gradient-to-b from-blue-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">The Science Inside</h2>
          <p className="text-gray-700 max-w-4xl">
            Zeflash integrates advanced AI Deeptech for electrochemical modeling, impedance testing, multi-parameter dataset analysis, and machine-learning algorithms. By reading subtle internal responses at each charging cycle, it builds a lifecycle profile — predicting degradation, aging, and thermal risks with above 90% accuracy.
          </p>
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

      {/* Why choose */}
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

      {/* CTA */}
      <section id="book" className="py-12 sm:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold">🔋 See Beyond the Battery</h2>
          <p className="mt-2 text-gray-700 max-w-3xl mx-auto">
            Zeflash turns complex battery data into clear, confident action — empowering every EV decision with real-time intelligence.
          </p>
          <div className="mt-6 flex flex-wrap gap-3 justify-center">
            <Link to="/stations" className="inline-flex items-center gap-2 rounded-lg bg-blue-600 text-white font-semibold px-5 py-3 hover:bg-blue-700">
              <Bolt size={18} /> Book a Zeflash RapidTest
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
    </div>
  );
};

const ActivityIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>;
const FileIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>;

export default ZeflashLanding;