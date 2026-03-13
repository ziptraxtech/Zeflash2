import React, { useEffect, useState } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import { API_URL } from '../config/api';
import { Zap, Loader2, Plus } from 'lucide-react';
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

  const iconSize = size === 'sm' ? 14 : size === 'lg' ? 20 : 16;
  const textSize = size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm';
  const badgeSize = size === 'sm' ? 'text-xs px-2 py-0.5' : size === 'lg' ? 'text-base px-3 py-1' : 'text-sm px-2.5 py-1';

  return (
    <div className={`inline-flex items-center gap-2 ${className}`} title="1 test = 1 ZeVault credit">
      {/* ZeVault Credits Display */}
      <Link
        to="/zevault"
        className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-xs sm:text-sm font-semibold px-2 sm:px-4 py-2 hover:from-blue-600 hover:to-indigo-700 shadow-md shadow-blue-200/40 transition-all"
      >
        <Zap size={iconSize} className="text-yellow-300" fill="currentColor" />
        {loading ? (
          <Loader2 size={iconSize} className="animate-spin text-white" />
        ) : (
          <>
            {showLabel && (
              <span className={`${textSize} font-bold text-white tracking-wide`}>
                ZeVault
              </span>
            )}
            <span className={`${textSize} font-bold text-yellow-300`}>
              {credits !== null ? credits : '—'}
            </span>
          </>
        )}
      </Link>

      {/* Add Credits prompt when empty */}
      {credits === 0 && (
        <Link
          to="/zevault"
          className={`inline-flex items-center gap-1 rounded-lg border border-violet-300 text-violet-700 font-semibold ${badgeSize} hover:bg-violet-50 transition-all`}
        >
          <Plus size={iconSize - 2} />
          Add
        </Link>
      )}
    </div>
  );
};

export default CreditsWallet;
