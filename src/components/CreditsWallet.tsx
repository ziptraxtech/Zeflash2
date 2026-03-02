import React, { useEffect, useState } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import { API_URL } from '../config/api';
import { Wallet, Loader2, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

interface CreditsWalletProps {
  className?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const CreditsWallet: React.FC<CreditsWalletProps> = ({ 
  className = '', 
  showLabel = true,
  size = 'md'
}) => {
  const { getToken } = useAuth();
  const { isSignedIn } = useUser();
  const [credits, setCredits] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isSignedIn) {
      setCredits(null);
      return;
    }

    const fetchCredits = async () => {
      setLoading(true);
      try {
        const token = await getToken();
        if (!token) return;

        const response = await fetch(`${API_URL}/credits`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setCredits(data.remaining || 0);
        }
      } catch (error) {
        console.error('Failed to fetch credits:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCredits();

    // Refresh credits every 30 seconds
    const interval = setInterval(fetchCredits, 30000);
    return () => clearInterval(interval);
  }, [isSignedIn, getToken]);

  if (!isSignedIn) {
    return null;
  }

  const iconSize = size === 'sm' ? 16 : size === 'lg' ? 24 : 20;
  const textSize = size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-lg' : 'text-base';
  const badgeSize = size === 'sm' ? 'text-xs px-2 py-0.5' : size === 'lg' ? 'text-base px-3 py-1' : 'text-sm px-2.5 py-1';

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      {/* Credits Display */}
      <div className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 px-3 py-1.5">
        <Wallet size={iconSize} className="text-emerald-600" />
        {loading ? (
          <Loader2 size={iconSize} className="animate-spin text-emerald-600" />
        ) : (
          <>
            {showLabel && (
              <span className={`${textSize} font-medium text-gray-700`}>
                Credits:
              </span>
            )}
            <span className={`${textSize} font-bold text-emerald-700`}>
              {credits !== null ? credits : '—'}
            </span>
          </>
        )}
      </div>

      {/* Add Credits Button */}
      {(credits === 0 || credits === null) && (
        <Link
          to="/plans"
          className={`inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold ${badgeSize} hover:from-blue-700 hover:to-cyan-700 transition-all shadow-sm hover:shadow-md`}
        >
          <Plus size={iconSize - 4} />
          Add Credits
        </Link>
      )}
    </div>
  );
};

export default CreditsWallet;
