import { Link } from 'react-router-dom';
import { ArrowLeft, Zap } from 'lucide-react';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-br from-gray-800 via-gray-900 to-blue-900 text-white py-6 sticky top-0 z-10 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity" title="Back to landing page">
              <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600">
                <Zap className="text-white" size={24} />
              </div>
              <h1 className="text-2xl font-bold">Zeflash</h1>
            </Link>
            <Link 
              to="/" 
              className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
            >
              <ArrowLeft size={20} />
              <span>Back to Home</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-6">🔐 Privacy Policy</h1>
          
          <div className="space-y-8 text-gray-700">
            <div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">1. Information We Collect</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Personal Information:</strong> Name, contact details, vehicle information.</li>
                <li><strong>Usage Data:</strong> App usage logs, platform interactions.</li>
                <li><strong>Telematics Data:</strong> GPS coordinates, battery status, diagnostics from IoT hardware.</li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">2. How We Use It</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>To operate and improve the platform.</li>
                <li>To provide you with billing, diagnostics, smart usage alerts, and warranty tracking.</li>
                <li>To communicate with you, including support and service notifications.</li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">3. Data Sharing</h3>
              <p className="mb-2">We may share data with:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Service centers (for diagnostics and repair).</li>
                <li>Authorized warranty providers.</li>
                <li>Legal authorities when required by law.</li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">4. Data Security</h3>
              <p>We implement administrative, technical, and physical safeguards to protect your data from unauthorized access.</p>
            </div>
            
            <div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">5. Your Rights</h3>
              <p className="mb-2">You may:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Access and correct your personal data.</li>
                <li>Request deletion of your personal data.</li>
                <li>Opt out of non-essential communications.</li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">6. Policy Changes</h3>
              <p>We may update this Policy. Notification will be provided via the app or email. Continued use means you accept the changes.</p>
            </div>
          </div>

          <div className="mt-12 pt-6 border-t border-gray-200 text-sm text-gray-500">
            <p>Last updated: January 2026</p>
            <p className="mt-2">For questions, contact us at <a href="mailto:contact@zeflash.app" className="text-blue-600 hover:underline">contact@zeflash.app</a></p>
          </div>
        </div>
      </div>
    </div>
  );
}
