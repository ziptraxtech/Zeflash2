import { Link } from 'react-router-dom';
import { ArrowLeft, Zap } from 'lucide-react';

export default function TermsOfUse() {
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
          <h1 className="text-4xl font-bold text-gray-900 mb-6">📄 Terms of Use</h1>
          
          <div className="space-y-8 text-gray-700">
            <div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">1. Acceptance of Terms</h3>
              <p>By using the Zeflash app, web dashboard, or hardware services, you agree to these Terms of Use and our Privacy Policy.</p>
            </div>
            
            <div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">2. License to Use</h3>
              <p>We grant you a non-exclusive, non-transferable license to access and use the platform solely for managing your EV(s), fleet, or related business operations.</p>
            </div>
            
            <div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">3. Restrictions</h3>
              <p className="mb-2">You must not:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Reproduce, distribute, modify, or publicly display content from the platform.</li>
                <li>Reverse-engineer, decompile, or attempt to derive source code.</li>
                <li>Use the platform for illegal or unauthorized purposes.</li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">4. User Responsibilities</h3>
              <p className="mb-2">You are responsible for:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Maintaining confidentiality of account credentials.</li>
                <li>Ensuring your use of the platform complies with applicable local laws and regulations.</li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">5. Warranty</h3>
              <p>The platform and services are provided "as-is," without any express or implied warranties. Ziptrax Technologies disclaims all warranties, including merchantability or fitness for a particular purpose.</p>
            </div>
            
            <div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">6. Limitation of Liability</h3>
              <p>Ziptrax Technologies (and its affiliates) will not be liable for any indirect, incidental, special, or consequential damages arising from your use of the platform.</p>
            </div>
            
            <div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">7. Termination</h3>
              <p>We may suspend or terminate your account and access immediately if you violate these Terms.</p>
            </div>
            
            <div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">8. Modifications</h3>
              <p>These Terms may be updated from time to time. Continued use of the platform constitutes acceptance of changes.</p>
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
