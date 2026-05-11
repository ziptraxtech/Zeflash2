import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams, useLocation } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { API_URL, resolveReportImageUrl } from '../config/api';
import CreditsWallet from './CreditsWallet';
import Papa from 'papaparse';
import {
  ArrowLeft,
  Download,
  CheckCircle,
  AlertTriangle,
  Battery,
  Flame,
  Activity,
  Lock,
  Share2,
  ClipboardCheck,
  BarChart3
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

type DeviceAIReport = {
  device_id: string;
  status: string;
  summary: string;
  recommended_actions: string[];
  anomalies: { total: number; breakdown: Record<string, number> };
  generated_at?: string;
};

const severityColor = (status: string) => {
  const s = status.toLowerCase();
  if (s.includes('immediate') || s.includes('critical')) return 'text-red-700 bg-red-100';
  if (s.includes('accelerating') || s.includes('high')) return 'text-yellow-700 bg-yellow-100';
  if (s.includes('moderate') || s.includes('medium')) return 'text-yellow-700 bg-yellow-100';
  return 'text-green-700 bg-green-100';
};

const AIReport: React.FC = () => {
  const { deviceId } = useParams<{ deviceId: string }>();
  const { getToken, isSignedIn } = useAuth();
  const location = useLocation();
  const reportRef = useRef<HTMLDivElement | null>(null);
  const paidForReport = (location.state as any)?.paid_for_report ?? false;

  // Parse evseId and connectorId from deviceId (format: evseId_connectorId)
  const [evseId, connectorId] = useMemo(() => {
    if (!deviceId) return ['', 1];
    const parts = deviceId.split('_');
    const connector = parseInt(parts.pop() || '1');
    return [parts.join('_'), connector];
  }, [deviceId]);

  const backendDeviceId = useMemo(() => deviceId || 'unknown', [deviceId]);

  const [generating, setGenerating] = useState(false);
  const [s3Url, setS3Url] = useState<string | null>(null);
  const [genError, setGenError] = useState<string | null>(null);
  const [stationName, setStationName] = useState<string | null>(null);
  const [mlData, setMlData] = useState<{
    anomalies: { critical: number; high: number; medium: number; low: number };
    totalSamples: number;
    totalAnomalies: number;
    generatedAt: string;
    recommendations?: string[];
  } | null>(null);

  // Fetch station name from CSV based on evseId
  useEffect(() => {
    if (!evseId) return;

    const fetchStationName = async () => {
      try {
        const response = await fetch('/device_locations_api - Stations.csv');
        const text = await response.text();
        const result = Papa.parse<any>(text, { header: true, skipEmptyLines: true });
        
        console.log('CSV parsed, looking for EVSE ID:', evseId);
        
        // Try to find matching station - handle whitespace and case
        const station = (result.data || []).find((row: any) => {
          const csvEvseId = row['EVSE ID'] ? String(row['EVSE ID']).trim() : '';
          const matches = csvEvseId === evseId;
          if(matches) console.log('Found matching station:', row['Station Name']);
          return matches;
        });
        
        if (station && station['Station Name']) {
          const name = String(station['Station Name']).trim();
          console.log('Setting station name:', name);
          setStationName(name);
        } else {
          console.log('No matching station found for EVSE ID:', evseId);
        }
      } catch (err) {
        console.error('Error fetching station name:', err);
      }
    };

    fetchStationName();
  }, [evseId]);

  useEffect(() => {
    if (!evseId) return;

    const loadReport = async () => {
      const token = await getToken().catch(() => null);
      const authHeader = token ? `Bearer ${token}` : '';

      // SKIP cache - always generate fresh report
      // (This ensures we get fresh localhost ML results, not old AWS cached reports)

      setGenerating(true);
      setGenError(null);

      // **Check if user is authenticated OR has paid for the report**
      if (!isSignedIn && !paidForReport) {
        setGenError('Please sign in to use credits, or choose a payment method to generate a report.');
        setGenerating(false);
        return;
      }

      const generate = async (): Promise<void> => {
        const res = await fetch(`${API_URL}/generate-report`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: authHeader },
          body: JSON.stringify({ evse_id: evseId, connector_id: connectorId, paid_for_report: paidForReport }),
        });

        if (res.status === 402) {
          // Webhook may still be processing — wait and retry once
          await new Promise((r) => setTimeout(r, 5000));
          const retry = await fetch(`${API_URL}/generate-report`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: authHeader },
            body: JSON.stringify({ evse_id: evseId, connector_id: connectorId, paid_for_report: paidForReport }),
          });
          if (!retry.ok) {
            const e = await retry.json().catch(() => ({}));
            throw new Error(e.error || 'Insufficient credits. Please buy a plan to generate AI reports.');
          }
          const d = await retry.json();
          setS3Url(d.s3Url);
          // Store ML data from response
          setMlData({
            anomalies: d.anomalies,
            totalSamples: d.totalSamples,
            totalAnomalies: d.totalAnomalies,
            generatedAt: d.generatedAt,
            recommendations: d.recommendations || []
          });
          return;
        }

        if (!res.ok) {
          const e = await res.json().catch(() => ({}));
          
          // Handle 401 (authentication required for unauthenticated users trying to use credits)
          if (res.status === 401 && e.requireSignUp) {
            throw new Error(e.error || 'Sign up to use credits or coupons. You can also proceed with direct payment.');
          }
          
          throw new Error(e.error || 'Report generation failed. Please try again.');
        }
        const d = await res.json();
        setS3Url(d.s3Url);
        // Store ML data from response
        setMlData({
          anomalies: d.anomalies,
          totalSamples: d.totalSamples,
          totalAnomalies: d.totalAnomalies,
          generatedAt: d.generatedAt,
          recommendations: d.recommendations || []
        });
      };

      try {
        await generate();
      } catch (err: any) {
        setGenError(err.message);
      } finally {
        setGenerating(false);
      }
    };

    loadReport();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [evseId, connectorId, isSignedIn, paidForReport]);

  const data: DeviceAIReport = useMemo(() => {
    // Use real ML data if available, otherwise show loading state
    if (!mlData) {
      return {
        device_id: backendDeviceId,
        status: 'Loading...',
        summary: 'Waiting for ML analysis...',
        recommended_actions: [],
        anomalies: { total: 0, breakdown: { critical: 0, high: 0, medium: 0, low: 0 } },
        generated_at: new Date().toISOString()
      };
    }

    // Calculate severity based on anomaly percentage
    const anomalyPercentage = mlData.totalSamples > 0 
      ? (mlData.totalAnomalies / mlData.totalSamples) * 100 
      : 0;

    let severity = 'Stable';
    if (anomalyPercentage >= 40) {
      severity = 'Immediate Action Required';
    } else if (anomalyPercentage >= 25) {
      severity = 'Degradation Accelerating';
    } else if (anomalyPercentage >= 10) {
      severity = 'Moderate Irregularities';
    }

    const summaryBySeverity: Record<string, string> = {
      'Immediate Action Required':
        `Critical anomalies detected in ${anomalyPercentage.toFixed(1)}% of samples. This indicates potential safety or reliability risks. Immediate diagnostic and potential replacement recommended.`,
      'Degradation Accelerating':
        `High severity anomalies present in ${anomalyPercentage.toFixed(1)}% of samples. Performance trending downward; proactive maintenance advisable soon.`,
      'Moderate Irregularities':
        `Some anomalies observed (${anomalyPercentage.toFixed(1)}%) but within controlled bounds. Monitor and optimize usage patterns.`,
      Stable: 
        `No material anomalies detected (${anomalyPercentage.toFixed(1)}%). Battery operating within expected parameters.`
    };

    const actionsBySeverity: Record<string, string[]> = {
      'Immediate Action Required': [
        'Isolate battery from high load operations',
        'Run full diagnostic and thermal inspection',
        'Schedule replacement procurement',
        'Increase monitoring frequency to real-time'
      ],
      'Degradation Accelerating': [
        'Plan a detailed capacity test',
        'Check cell balancing configuration',
        'Review recent charge/discharge cycles',
        'Increase monitoring to daily summaries'
      ],
      'Moderate Irregularities': [
        'Schedule periodic internal resistance measurements',
        'Verify thermal management firmware',
        'Optimize charging schedule for longevity',
        'Maintain normal monitoring cadence'
      ],
      Stable: [
        'Continue standard performance logging',
        'Maintain periodic preventative checks',
        'Review historical trend monthly',
        'No immediate intervention required'
      ]
    };

    return {
      device_id: backendDeviceId,
      status: severity,
      summary: summaryBySeverity[severity],
      recommended_actions: actionsBySeverity[severity],
      anomalies: {
        total: mlData.anomalies.critical + mlData.anomalies.high + mlData.anomalies.medium,
        breakdown: mlData.anomalies
      },
      generated_at: mlData.generatedAt || new Date().toISOString()
    };
  }, [backendDeviceId, mlData]);

    const visibleActions = data?.recommended_actions?.slice(0, 3) ?? [];
    const hiddenActions = data?.recommended_actions?.slice(3) ?? [];

    const handleComingSoon = useCallback(() => {
      alert('This feature will be available soon.');
    }, []);

  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    const el = reportRef.current;
    try {
      const canvas = await html2canvas(el, {
        backgroundColor: '#ffffff',
        scale: Math.min(2, window.devicePixelRatio || 1.5)
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        pdf.addPage();
        position = heightLeft - imgHeight;
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const name = `Zeflash_AI_Report_${backendDeviceId}_${new Date().toISOString().slice(0, 10)}.pdf`;
      pdf.save(name);
    } catch (error) {
      console.error(error);
      alert('Failed to export PDF');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex flex-wrap gap-3 items-center justify-between">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <Link
                to={deviceId ? `/report/${deviceId}` : '/'}
                className="flex items-center px-3 py-2 text-gray-600 hover:text-blue-600 transition-colors rounded-lg hover:bg-gray-100 text-sm sm:text-base"
              >
                <ArrowLeft className="mr-2" size={18} />
                Preview
              </Link>
              <div className="hidden sm:block h-6 w-px bg-gray-300" />
              <h1 className="text-base sm:text-xl md:text-2xl font-bold text-gray-900 truncate">
                AI Battery Report
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <CreditsWallet size="sm" showLabel={true} className="hidden sm:flex" />
              <button
                onClick={handleExportPDF}
                className="inline-flex items-center px-3 py-2 rounded-lg text-gray-600 hover:text-blue-600 hover:bg-gray-100 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1"
              >
                <Download className="mr-1.5" size={16} />
                <span className="hidden xs:inline">PDF</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Generating / error state */}
      {(generating || genError) && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          {generating && (
            <div className="bg-white rounded-2xl shadow border border-blue-100 p-8 flex flex-col items-center gap-4 text-center">
              <Activity className="text-blue-600 animate-pulse" size={40} />
              <p className="text-lg font-semibold text-gray-900">Generating your AI report…</p>
              <p className="text-sm text-gray-500">This usually takes 30–120 seconds. Please keep this page open.</p>
            </div>
          )}
          {genError && (
            <div className="bg-white rounded-2xl shadow border border-red-100 p-8 flex flex-col items-center gap-4 text-center">
              <AlertTriangle className="text-red-500" size={40} />
              <p className="text-lg font-semibold text-gray-900">Report Unavailable</p>
              <p className="text-sm text-red-600">{genError}</p>
              <Link
                to="/plans"
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Buy Credits Plan
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Main report content — shown once ready or for non-checkout visits */}
      {!generating && (
      <div ref={reportRef} className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8 border border-gray-100">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className="bg-blue-600 p-3 rounded-xl">
                <Battery className="text-white" size={24} />
              </div>
              <div>
                {stationName && (
                  <p className="text-sm text-blue-600 font-semibold mb-1">{stationName}</p>
                )}
                <h2 className="text-2xl font-bold text-gray-900">{backendDeviceId.toUpperCase()}</h2>
                <p className="text-gray-600">AI Interpretation</p>
                <p className="text-sm text-gray-500 mt-1">
                  Generated: {data?.generated_at ? new Date(data.generated_at).toLocaleString() : '—'}
                </p>
              </div>
            </div>
            {data && (
              <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${severityColor(data.status)}`}>
                {data.status.toLowerCase().includes('optimal') || data.status.toLowerCase().includes('stable') ? (
                  <CheckCircle className="mr-2" size={18} />
                ) : (
                  <AlertTriangle className="mr-2" size={18} />
                )}
                <span>{data.status}</span>
              </div>
            )}
          </div>

          {data && (
            <div className="space-y-8">
              {/* ML Report Images from S3 or localhost */}
              {s3Url && (
                <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                  <h3 className="text-sm font-semibold text-blue-700 mb-3 flex items-center gap-2">
                    <CheckCircle size={16} />
                    AI Analysis Report
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {['battery_health_report', 'voltage_analysis', 'current_analysis', 'soc_analysis'].map((name) => {
                      const imgUrl = resolveReportImageUrl(s3Url, backendDeviceId, `${name}.png`);
                      
                      return (
                        <div key={name} className="rounded-lg overflow-hidden border border-blue-100 bg-white">
                          <p className="text-xs text-gray-500 px-3 pt-2 font-medium capitalize">{name.replace(/_/g, ' ')}</p>
                          <img
                            src={imgUrl}
                            alt={name}
                            className="w-full object-contain"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">                <div className="relative overflow-hidden rounded-xl border border-teal-200 bg-gradient-to-br from-teal-50 to-white p-6">
                  <div className="absolute -top-10 -right-10 w-32 h-32 bg-teal-100 rounded-full opacity-40" />
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-teal-600 tracking-wide">Executive Summary</h3>
                    <div className="relative pt-1">
                      <div className="pointer-events-none select-none blur-sm">
                        <p className="text-gray-800 text-sm leading-relaxed line-clamp-3">{data.summary}</p>
                      </div>
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-white via-white/80 to-transparent" />
                      <div className="absolute inset-x-0 bottom-0 flex justify-center pb-2">
                        <button
                          onClick={handleComingSoon}
                          className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
                        >
                          <Lock size={14} />
                          <span>Unlock Detailed Summary</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="relative overflow-hidden rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-white p-6">
                  <div className="absolute -bottom-8 -left-8 w-36 h-36 bg-indigo-100 rounded-full opacity-40" />
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-indigo-600 tracking-wide">Risk Snapshot</h3>
                    <div className="relative pt-1">
                      <div className="pointer-events-none select-none blur-sm">
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(data.anomalies.breakdown).map(([key, value]) => (
                            <span
                              key={key}
                              className="px-3 py-1 rounded-full text-xs font-medium bg-white border border-indigo-100 text-indigo-700 shadow-sm"
                            >
                              {key}: {value}
                            </span>
                          ))}
                        </div>
                        <p className="text-xs text-indigo-700 mt-3">Total anomalies (excl. low): {data.anomalies.total}</p>
                      </div>
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-white via-white/85 to-transparent" />
                      <div className="absolute inset-x-0 bottom-0 flex justify-center pb-2">
                        <button
                          onClick={handleComingSoon}
                          className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
                        >
                          <Lock size={14} />
                          <span>Unlock Risk Breakdown</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="relative overflow-hidden rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-6 md:col-span-2 xl:col-span-1">
                  <div className="absolute -top-8 -left-6 w-40 h-40 bg-amber-100 rounded-full opacity-40" />
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-amber-600 tracking-wide">Recommended Focus</h3>
                    <div className="relative pt-1">
                      <div className="pointer-events-none select-none blur-sm">
                        <ul className="text-sm text-amber-800 space-y-1 list-disc pl-5">
                          {visibleActions.slice(0, 2).map((action, index) => (
                            <li key={index}>{action}</li>
                          ))}
                        </ul>
                        <p className="text-xs text-amber-700 mt-3">Detailed actions below</p>
                      </div>
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-white via-white/85 to-transparent" />
                      <div className="absolute inset-x-0 bottom-0 flex justify-center pb-2">
                        <button
                          onClick={handleComingSoon}
                          className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
                        >
                          <Lock size={14} />
                          <span>Unlock Focus Playbook</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap justify-end gap-3">
                <button
                  onClick={handleExportPDF}
                  className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm font-semibold text-blue-700 shadow-sm transition-colors hover:bg-blue-50"
                >
                  <Download size={16} />
                  Export PDF
                </button>
                <button
                  onClick={handleComingSoon}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-100"
                >
                  <Share2 size={16} />
                  Share Snapshot
                </button>
                <button
                  onClick={handleComingSoon}
                  className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800 shadow-sm transition-colors hover:bg-emerald-100"
                >
                  <ClipboardCheck size={16} />
                  Request Technician Review
                </button>
              </div>

              <div className="relative overflow-hidden bg-green-50 border border-green-200 p-6 rounded-xl">
                <h3 className="text-xl font-semibold text-green-800 mb-2">Professional Verdict</h3>
                <div className="relative">
                  <div className="pointer-events-none select-none blur-sm">
                    <p className="text-gray-800 leading-relaxed line-clamp-3">{data.summary}</p>
                  </div>
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-green-50 via-green-50/80 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 flex justify-center pb-2">
                    <button
                      onClick={handleComingSoon}
                      className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-green-700"
                    >
                      <Lock size={14} />
                      <span>View Analyst Notes</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 p-6 rounded-xl">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Recommended Actions</h3>
                <ul className="list-disc pl-6 text-gray-800 space-y-1">
                  {visibleActions.map((action, index) => (
                    <li key={index}>{action}</li>
                  ))}
                </ul>
                {hiddenActions.length > 0 && (
                  <div className="relative mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
                    <div className="pointer-events-none select-none blur-sm">
                      <ul className="list-disc pl-5 text-sm text-blue-900 space-y-1">
                        {hiddenActions.map((action, index) => (
                          <li key={`hidden-${index}`}>{action}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-blue-50 via-blue-50/80 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 flex justify-center pb-2">
                      <button
                        onClick={handleComingSoon}
                        className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
                      >
                        <Lock size={14} />
                        <span>Unlock Full Playbook</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="relative overflow-hidden bg-white border border-gray-200 p-6 rounded-xl">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Anomaly Summary</h3>
                <p className="text-gray-700 mb-2">
                  Total anomalies: <span className="font-semibold">{data.anomalies.total}</span>
                </p>
                <div className="relative">
                  <div className="pointer-events-none select-none blur-[1px]">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {Object.entries(data.anomalies.breakdown).map(([key, value]) => (
                        <div key={key} className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
                          <div className="text-sm text-gray-500 capitalize">{key}</div>
                          <div className="text-xl font-bold text-gray-900">{value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-white via-white/85 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 flex justify-center pb-2">
                    <button
                      onClick={handleComingSoon}
                      className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-100"
                    >
                      <BarChart3 size={14} />
                      <span>Download CSV</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Recommendations Section - Top 3 */}
              {mlData?.recommendations && mlData.recommendations.length > 0 && (
                <div className="rounded-xl border border-yellow-200 bg-gradient-to-br from-yellow-50 to-yellow-25 p-6">
                  <h3 className="text-lg font-semibold text-yellow-900 mb-4">Quick Recommendations</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {mlData.recommendations.slice(0, 3).map((recommendation, index) => (
                      <div key={index} className="bg-white border border-yellow-100 rounded-lg p-4 shadow-sm">
                        <p className="text-sm text-gray-800">{recommendation}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-white border border-gray-200 p-4 sm:p-6 rounded-xl">
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center">
                  <Activity size={18} className="mr-2 text-blue-600" />
                  Recent Performance Window
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 mb-4 sm:mb-6">
                  Synthetic recent sample window illustrating current and temperature behavior with anomaly markers and operational thresholds.
                </p>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 xl:gap-8">
                  <div className="relative">
                    <h4 className="text-xs sm:text-sm font-semibold text-gray-700 mb-2 flex items-center">
                      <Activity size={16} className="mr-1 text-blue-500" />
                      Current Analysis
                    </h4>
                    <div className="rounded-lg overflow-hidden">
                      <CurrentChart severity={data.status} />
                    </div>
                  </div>
                  <div className="relative">
                    <h4 className="text-xs sm:text-sm font-semibold text-gray-700 mb-2 flex items-center">
                      <Flame size={16} className="mr-1 text-orange-500" />
                      Temperature Analysis
                    </h4>
                    <div className="rounded-lg overflow-hidden">
                      <TemperatureChart severity={data.status} />
                    </div>
                  </div>
                </div>
                <p className="mt-4 sm:mt-6 text-[10px] sm:text-xs text-gray-500">
                  Visualizations are representative. Live charts will use real telemetry when backend is connected.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  );
};

interface ChartProps {
  severity: string;
}

const generateSeries = (points: number, base: number, jitter: number) => {
  const arr: number[] = [];
  for (let i = 0; i < points; i += 1) {
    const noise = (Math.random() - 0.5) * jitter;
    arr.push(Number((base + noise).toFixed(3)));
  }
  return arr;
};

const pickThresholds = (severity: string) => {
  if (severity.includes('Immediate')) return { high: 2.4, low: -2.4, warnHigh: 1.8, warnLow: -1.8 };
  if (severity.includes('Degradation')) return { high: 2.6, low: -2.6, warnHigh: 2.0, warnLow: -2.0 };
  return { high: 3.0, low: -3.0, warnHigh: 2.0, warnLow: -2.0 };
};

const CurrentChart: React.FC<ChartProps> = ({ severity }) => {
  const points = 180;
  const baseSeries = generateSeries(points, 0.35, 0.15);
  const thresholds = pickThresholds(severity);
  const anomalies = baseSeries.map((value, index) => (value > thresholds.warnHigh * 0.6 && index % 37 === 0 ? true : false));

  return (
    <div className="relative bg-gradient-to-b from-blue-50 to-white border border-blue-100 rounded-md p-2 sm:p-3 shadow-inner">
      <div className="w-full overflow-x-auto">
        <svg viewBox={`0 0 ${points} 100`} className="w-full h-36 sm:h-40" preserveAspectRatio="none">
          <rect x={0} y={30} width={points} height={40} fill="rgba(16,185,129,0.12)" />
          <polyline
            fill="none"
            stroke="#2563eb"
            strokeWidth={1.6}
            points={baseSeries.map((value, index) => `${index},${50 - value * 30}`).join(' ')}
          />
          {anomalies.map((flag, index) =>
            flag ? (
              <circle
                key={index}
                cx={index}
                cy={50 - baseSeries[index] * 30}
                r={2.8}
                fill="#dc2626"
                stroke="#991b1b"
                strokeWidth={0.8}
              />
            ) : null
          )}
          <line x1={0} x2={points} y1={50 - thresholds.high * 12} y2={50 - thresholds.high * 12} stroke="#dc2626" strokeDasharray="4 4" strokeWidth={1} />
          <line x1={0} x2={points} y1={50 - thresholds.low * 12} y2={50 - thresholds.low * 12} stroke="#1d4ed8" strokeDasharray="4 4" strokeWidth={1} />
        </svg>
      </div>
      <div className="flex justify-between mt-2 text-[10px] text-gray-600">
        <span>Start</span>
        <span>Sample Index</span>
        <span>End</span>
      </div>
      <div className="absolute top-1.5 right-1.5 text-[10px] px-2 py-1 rounded bg-green-600 text-white font-semibold shadow">
        NORMAL
      </div>
      <div className="mt-2 flex flex-wrap gap-1 sm:gap-2 text-[9px] sm:text-[10px]">
        <span className="px-2 py-1 rounded bg-white border border-blue-100 shadow-sm">Current</span>
        <span className="px-2 py-1 rounded bg-white border border-red-100 shadow-sm text-red-600">Anomaly</span>
        <span className="px-2 py-1 rounded bg-white border border-red-200 shadow-sm">Critical High</span>
        <span className="px-2 py-1 rounded bg-white border border-blue-200 shadow-sm">Critical Low</span>
      </div>
    </div>
  );
};

const TemperatureChart: React.FC<ChartProps> = ({ severity }) => {
  const points = 180;
  const baseSeries = generateSeries(points, 65, 3.5);
  const anomalies = baseSeries.map((value, index) => (value > 70 && index % 41 === 0 ? true : false));
  const severityLabel = severity.includes('Immediate')
    ? { text: 'Critical Heat Risk', className: 'bg-red-600' }
    : severity.includes('Degradation')
      ? { text: 'Heat Monitoring Dash', className: 'bg-amber-500' }
      : severity.includes('Moderate')
        ? { text: 'Watchlist', className: 'bg-yellow-500' }
        : { text: 'Stable Thermal Range', className: 'bg-emerald-500' };

  return (
    <div className="relative bg-gradient-to-b from-orange-50 to-white border border-orange-100 rounded-md p-2 sm:p-3 shadow-inner">
      <div className="w-full overflow-x-auto">
        <svg viewBox={`0 0 ${points} 100`} className="w-full h-36 sm:h-40" preserveAspectRatio="none">
          {baseSeries.map((value, index) => (
            <rect
              key={index}
              x={index}
              y={100 - (value - 50) * 3.2}
              width={1.2}
              height={(value - 50) * 3.2}
              fill={anomalies[index] ? '#dc2626' : '#f97316'}
              opacity={0.85}
            />
          ))}
          {anomalies.map((flag, index) =>
            flag ? (
              <circle
                key={index}
                cx={index}
                cy={100 - (baseSeries[index] - 50) * 3.2}
                r={3}
                fill="#dc2626"
                stroke="#991b1b"
                strokeWidth={0.8}
              />
            ) : null
          )}
        </svg>
      </div>
      <div className="flex justify-between mt-2 text-[10px] text-gray-600">
        <span>Start</span>
        <span>Sample Index</span>
        <span>End</span>
      </div>
      <div
        className={`absolute top-1.5 right-1.5 text-[10px] px-2 py-1 rounded text-white font-semibold shadow ${severityLabel.className}`}
      >
        {severityLabel.text}
      </div>
      <div className="mt-2 flex flex-wrap gap-1 sm:gap-2 text-[9px] sm:text-[10px]">
        <span className="px-2 py-1 rounded bg-white border border-orange-100 shadow-sm">Temperature</span>
        <span className="px-2 py-1 rounded bg-white border border-red-100 shadow-sm text-red-600">Anomaly</span>
      </div>
    </div>
  );
};

export default AIReport;
