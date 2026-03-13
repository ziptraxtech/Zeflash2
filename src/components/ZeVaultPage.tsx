import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, useUser } from '@clerk/clerk-react';
import { API_URL } from '../config/api';
import { ArrowLeft, Zap, Loader2, Info, Clock, X } from 'lucide-react';

interface PreviousTest {
  id: string;
  evseId: string;
  connector: number;
  createdAt: string;
  status: string;
  s3Url?: string | null;
}

const getDefaultAiImageUrl = (evseId: string, connector: number) =>
  `https://battery-ml-results-test.s3.us-east-1.amazonaws.com/battery-reports/${evseId}_${connector}/battery_health_report.png`;

const resolveAiImageUrl = (rawUrl: string | null | undefined, evseId: string, connector: number) => {
  const fallback = getDefaultAiImageUrl(evseId, connector);
  if (!rawUrl) return fallback;

  try {
    const parsed = new URL(rawUrl);
    const host = parsed.host;
    const cleanPath = parsed.pathname;

    if (cleanPath.endsWith('.png')) {
      return `${parsed.origin}${cleanPath}`;
    }

    if (cleanPath.endsWith('/')) {
      return `${parsed.protocol}//${host}${cleanPath}battery_health_report.png`;
    }

    return `${parsed.protocol}//${host}${cleanPath}/battery_health_report.png`;
  } catch {
    return fallback;
  }
};

const ZeVaultPage: React.FC = () => {
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const { isSignedIn } = useUser();
  const [credits, setCredits] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previousTests, setPreviousTests] = useState<PreviousTest[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedTest, setSelectedTest] = useState<PreviousTest | null>(null);

  // Load credits
  useEffect(() => {
    if (!isSignedIn) {
      setCredits(null);
      return;
    }

    const fetchCredits = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = await getToken();
        if (!token) return;

        const response = await fetch(`${API_URL}/credits`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Unable to load your credits right now.');
        }

        const data = await response.json();
        setCredits(data.remaining ?? 0);
      } catch (err: any) {
        console.error('Failed to fetch credits:', err);
        setError(err.message || 'Something went wrong while loading your ZeVault.');
      } finally {
        setLoading(false);
      }
    };

    void fetchCredits();
  }, [isSignedIn, getToken]);

  // Load previous test history (S3 images)
  useEffect(() => {
    if (!isSignedIn) {
      setPreviousTests([]);
      return;
    }

    const loadHistory = async () => {
      try {
        setHistoryLoading(true);
        const token = await getToken();
        if (!token) {
          setPreviousTests([]);
          return;
        }

        const response = await fetch(`${API_URL}/reports`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          setPreviousTests([]);
          return;
        }

        const data = await response.json();
        const history = (data.reports || [])
          .filter((report: PreviousTest) => report.status === 'completed' && report.s3Url)
          .slice(0, 6);

        setPreviousTests(history);
      } catch {
        setPreviousTests([]);
      } finally {
        setHistoryLoading(false);
      }
    };

    void loadHistory();
  }, [isSignedIn, getToken]);

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-950 to-black flex items-center justify-center px-4">
        <div className="max-w-md w-full rounded-2xl border border-slate-800 bg-slate-900/70 backdrop-blur-xl p-6 text-center text-slate-100">
          <Zap className="mx-auto mb-3 text-yellow-300" size={32} />
          <h1 className="text-xl font-semibold mb-2">Sign in to view ZeVault</h1>
          <p className="text-sm text-slate-300 mb-4">
            ZeVault stores your test credits securely. Please sign in to see your balance and usage.
          </p>
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-md hover:from-cyan-600 hover:to-blue-700"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-50">
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800"
            >
              <ArrowLeft size={16} />
              Back
            </button>
            <div>
              <h1 className="text-lg sm:text-xl font-semibold text-white flex items-center gap-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-500">
                  <Zap size={16} className="text-yellow-300" />
                </span>
                ZeVault
              </h1>
              <p className="text-xs sm:text-sm text-slate-400">Your EV battery health credits, all in one secure vault.</p>
            </div>
          </div>
          <Link
            to="/stations"
            className="hidden sm:inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs sm:text-sm font-semibold px-3 sm:px-4 py-2 hover:from-cyan-600 hover:to-blue-700 shadow-md shadow-cyan-500/30"
          >
            <Zap size={16} />
            Start Quick Test
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        <section className="rounded-3xl border border-violet-700/50 bg-gradient-to-br from-violet-900/60 via-slate-950 to-indigo-900/60 p-6 sm:p-8 shadow-lg shadow-violet-900/40">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div>
              <p className="text-sm font-semibold text-violet-200 uppercase tracking-[0.2em] mb-2">Available Credits</p>
              <div className="flex items-baseline gap-3">
                {loading ? (
                  <Loader2 className="animate-spin text-yellow-300" size={40} />
                ) : (
                  <span className="text-5xl sm:text-6xl font-extrabold text-yellow-300 drop-shadow-[0_0_25px_rgba(250,204,21,0.35)]">
                    {credits !== null ? credits : '—'}
                  </span>
                )}
                <span className="text-sm sm:text-base text-violet-100 font-medium">ZeVault credit{credits === 1 ? '' : 's'}</span>
              </div>
              <p className="mt-3 text-sm text-violet-100/80 max-w-xl">
                Every ZeVault credit unlocks one complete AI-powered diagnostic of your EV battery health.
              </p>
            </div>
            <div className="space-y-3 w-full sm:w-auto sm:max-w-xs">
              <Link
                to="/stations"
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-sm font-semibold px-4 py-3 hover:from-cyan-600 hover:to-blue-700 shadow-lg shadow-cyan-500/40"
              >
                <Zap size={18} />
                Use 1 credit now
              </Link>
              <Link
                to="/plans"
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-violet-400/70 bg-slate-950/40 text-violet-100 text-sm font-semibold px-4 py-3 hover:bg-violet-900/50"
              >
                Add more credits
              </Link>
            </div>
          </div>

          {error && (
            <div className="mt-4 rounded-lg border border-red-500/60 bg-red-950/40 px-3 py-2 text-xs text-red-100 flex items-start gap-2">
              <Info size={14} className="mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </section>

        {/* Previous Tests History (S3 images) */}
        <section className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base sm:text-lg font-semibold text-white">Previous Zeflash tests</h2>
            <span className="text-xs text-slate-400">Latest 6 reports</span>
          </div>

          {historyLoading ? (
            <p className="text-sm text-slate-400">Loading previous tests…</p>
          ) : previousTests.length === 0 ? (
            <p className="text-sm text-slate-400">No previous AI report history found yet. Run a Quick Test to start building your ZeVault history.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {previousTests.map((test) => {
                const deviceId = `${test.evseId}_${test.connector}`;
                const imgUrl = `${resolveAiImageUrl(test.s3Url ?? null, test.evseId, test.connector)}?t=${Date.now()}`;
                return (
                  <button
                    key={test.id}
                    type="button"
                    onClick={() => setSelectedTest(test)}
                    className="text-left rounded-xl border border-slate-800 bg-slate-900 overflow-hidden hover:border-cyan-500/70 hover:bg-slate-900/90 transition-colors"
                  >
                    <div className="h-36 bg-black border-b border-slate-800">
                      <img
                        src={imgUrl}
                        alt={`AI report ${deviceId}`}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    <div className="p-3 space-y-1">
                      <p className="text-sm font-semibold text-slate-50 truncate">{deviceId}</p>
                      <p className="text-xs text-slate-400">{new Date(test.createdAt).toLocaleString()}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Fullscreen image preview modal */}
        {selectedTest && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4">
            <div className="relative max-w-4xl w-full rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl">
              <button
                type="button"
                onClick={() => setSelectedTest(null)}
                className="absolute top-3 right-3 rounded-full bg-slate-900/80 p-1.5 text-slate-200 hover:bg-slate-800"
              >
                <X size={18} />
              </button>
              <div className="p-4 sm:p-6 flex flex-col gap-4">
                <div className="rounded-xl overflow-hidden border border-slate-800 bg-black max-h-[70vh] flex items-center justify-center">
                  <img
                    src={`${resolveAiImageUrl(selectedTest.s3Url ?? null, selectedTest.evseId, selectedTest.connector)}?t=${Date.now()}`}
                    alt={`AI report ${selectedTest.evseId}_${selectedTest.connector}`}
                    className="max-h-[70vh] w-full object-contain"
                    loading="lazy"
                  />
                </div>
                <div className="flex items-center justify-between text-xs sm:text-sm text-slate-300">
                  <div>
                    <p className="font-semibold text-slate-50">
                      {selectedTest.evseId}_{selectedTest.connector}
                    </p>
                    <p>{new Date(selectedTest.createdAt).toLocaleString()}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedTest(null)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800"
                  >
                    <X size={14} />
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-3">
              <Zap size={18} className="text-yellow-300" />
              <h2 className="text-base sm:text-lg font-semibold text-white">How ZeVault credits work</h2>
            </div>
            <ul className="mt-2 space-y-2 text-sm text-slate-200">
              <li>• 1 ZeVault credit = 1 full EV battery diagnostic test.</li>
              <li>• Each test includes AI analysis, instant report and recommendations.</li>
              <li>• Credits are linked to your account, not a single vehicle.</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-3">
              <Clock size={18} className="text-cyan-300" />
              <h2 className="text-base sm:text-lg font-semibold text-white">Stay on a 3‑month rhythm</h2>
            </div>
            <p className="mt-2 text-sm text-slate-200">
              To keep your EV battery in check, we gently nudge you to test every 3 months.
              ZeVault is designed so that roughly one credit is used every 3 months — helping you
              build a healthy, repeat testing habit without thinking about it.
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-white mb-1">Ready for your next checkup?</h2>
            <p className="text-sm text-slate-300 max-w-xl">
              Run a quick Zeflash test now and turn your ZeVault credits into real insights about your EV&apos;s health.
            </p>
          </div>
          <Link
            to="/stations"
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-sm font-semibold px-4 py-2 hover:from-cyan-600 hover:to-blue-700 shadow-md shadow-cyan-500/40"
          >
            <Zap size={16} />
            Start Quick Test
          </Link>
        </section>
      </main>
    </div>
  );
};

export default ZeVaultPage;
