import { Link } from 'react-router-dom';
import { ArrowLeft, Zap } from 'lucide-react';

export default function RefundPolicy() {
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
          <h1 className="text-4xl font-bold text-gray-900 mb-6">💸 Refund & Cancellation Policy</h1>
          
          <div className="space-y-8 text-gray-700">
            <div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">1. Hardware + Installation</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>All device + installation purchases are final – no refunds.</li>
                <li>You may cancel your order before it is dispatched for a full refund, minus any processing fee.</li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">2. Software Subscriptions</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Annual subscriptions may be canceled within 14 days of purchase for a full refund.</li>
                <li>No refunds are issued after the 14-day period.</li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">3. Renewal Policy</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Software renewals are automatic. To avoid renewal, cancel at least 7 days before expiry.</li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">4. How to Request</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>To request a refund or cancellation, contact support at <a href="mailto:support@zeflash.app" className="text-blue-600 hover:underline">support@zeflash.app</a> with your order or subscription ID.</li>
              </ul>
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
