import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Search, MapPin, ArrowLeft, BarChart3, Zap, Clock, CheckCircle, Users, X, Activity, Thermometer, RefreshCw, Download } from 'lucide-react';
import Papa from 'papaparse';
import * as mlService from '../services/mlService';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { useUser, SignInButton } from '@clerk/clerk-react';
import { useAIReportPayment } from '../hooks/useAIReportPayment';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Legend
} from 'recharts';

type CsvRow = {
  'S.No'?: string;
  'Station ID'?: string;
  'Station Name'?: string;
  'EVSE ID'?: string;
  'Address'?: string;
  'City'?: string;
  'State'?: string;
  'Latitude'?: string | number;
  'Longitude'?: string | number;
  'Station Status'?: string;
  'EVSE Status'?: string;
  'Protocol'?: string;
  'Coordinates'?: string;
  'Map Link'?: string;
};

type Evse = {
  evseId: string;
  status: string;
  protocol?: string;
};

type Station = {
  id: string; // Station ID
  name: string; // Station Name
  address: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  stationStatus: string;
  evses: Evse[];
};

const ChargingStations: React.FC = () => {
  const { user, isLoaded } = useUser();
  const { initiatePayment } = useAIReportPayment();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'All' | 'Online' | 'Offline'>('All');
  const [stations, setStations] = useState<Station[]>([]);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [tempCouponInput, setTempCouponInput] = useState('');
  const couponModalRef = useRef<HTMLInputElement>(null);
  const [couponModalState, setCouponModalState] = useState<{ open: boolean; evseId: string }>({
    open: false,
    evseId: ''
  });
  const [reportModal, setReportModal] = useState<{ open: boolean; evseId: string; connectorId: number; data: any; loading: boolean; error: string; aiImageUrl?: string; aiLoading?: boolean; aiError?: string; paymentPending?: boolean; paymentError?: string }>({
    open: false,
    evseId: '',
    connectorId: 1,
    data: null,
    loading: false,
    error: '',
    aiImageUrl: undefined,
    aiLoading: false,
    aiError: '',
    paymentPending: false,
    paymentError: ''
  });
  const reportContentRef = useRef<HTMLDivElement>(null);
  const aiImageContainerRef = useRef<HTMLDivElement>(null);

  const TOKEN_ENDPOINT = 'https://cms.charjkaro.in/admin/api/v1/zipbolt/token';
  const API_BASE_URL = 'https://cms.charjkaro.in/commands/secure/api/v1/get/charger/time_lapsed';

  const fetchChargerReport = async (evseId: string, connectorId: number, silent: boolean = false) => {
    if (!silent) {
      setReportModal(prev => ({ ...prev, open: true, evseId, connectorId, data: null, loading: true, error: '' }));
    } else {
      setReportModal(prev => ({ ...prev, loading: true, error: '' }));
    }
    try {
      // First, get a fresh token
      const tokenRes = await fetch(TOKEN_ENDPOINT);
      if (!tokenRes.ok) {
        throw new Error('Failed to get authorization token');
      }
      const tokenData = await tokenRes.json();
      const token = tokenData.token;

      // Then, use the token to fetch charger report
      const url = `${API_BASE_URL}?role=Admin&operator=All&evse_id=${evseId}&connector_id=${connectorId}&page=1&limit=20`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `basic ${token}`,
        },
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API error: ${response.status} - ${errorText || 'Unknown error'}`);
      }
      const data = await response.json();
      setReportModal((prev) => ({ ...prev, data, loading: false }));
    } catch (err) {
      console.error('Fetch error:', err);
      setReportModal((prev) => ({ ...prev, error: (err as Error).message, loading: false }));
    }
  };

  // Coupon validation and pricing function
  const getCouponInfo = (code: string): { valid: boolean; amount: number; discount: number } => {
    const upperCode = code.toUpperCase();
    if (upperCode === 'ZEFLASHCODERS') {
      return { valid: true, amount: 0, discount: 99 }; // Free for testing
    } else if (upperCode === 'TESTCHARJ') {
      return { valid: true, amount: 59, discount: 40 }; // ₹59 (₹40 off)
    } else if (upperCode === 'ZIPTRAX') {
      return { valid: true, amount: 1, discount: 98 }; // ₹1 (₹98 off)
    }
    return { valid: false, amount: 99, discount: 0 }; // Default price
  };

  // Handle coupon modal submission
  const handleCouponSubmit = async () => {
    const couponInfo = getCouponInfo(tempCouponInput);
    
    if (!couponInfo.valid && tempCouponInput.trim() !== '') {
      // Invalid coupon, show error but don't close modal
      return;
    }

    // Proceed with payment or AI report generation
    setCouponModalState({ ...couponModalState, open: false });
    setTempCouponInput('');

    const evseId = couponModalState.evseId;
    const deviceId = `${evseId}_${reportModal.connectorId || 1}`;

    if (couponInfo.amount === 0) {
      // Free coupon - skip payment
      setReportModal((prev) => ({ ...prev, aiLoading: true, aiError: '', aiImageUrl: '' }));
      proceedWithAIReport(evseId, deviceId);
    } else {
      // Paid coupon or regular - proceed with payment
      setReportModal((prev) => ({ ...prev, paymentPending: true, paymentError: '', aiError: '', aiImageUrl: '' }));
      proceedWithPayment(evseId, deviceId, couponInfo.amount, tempCouponInput.toUpperCase());
    }
  };

  // Proceed with payment
  const proceedWithPayment = async (evseId: string, deviceId: string, amount: number, coupon: string) => {
    try {
      const paymentSucceeded = await initiatePayment(deviceId, amount, coupon);

      if (!paymentSucceeded) {
        setReportModal((prev) => ({ ...prev, paymentPending: false, paymentError: 'Payment was cancelled. Please try again.' }));
        return;
      }

      setReportModal((prev) => ({ ...prev, paymentPending: false, aiLoading: true, aiError: '', aiImageUrl: '' }));
      proceedWithAIReport(evseId, deviceId);
    } catch (error) {
      console.error('Payment error:', error);
      setReportModal((prev) => ({
        ...prev,
        paymentPending: false,
        paymentError: 'Failed to initiate payment. Please try again.'
      }));
    }
  };

  // Proceed with AI report generation
  const proceedWithAIReport = async (evseId: string, deviceId: string) => {
    try {
      const connectorId = reportModal.connectorId || 1;
      
      // Use S3 for production and testing (images are uploaded there)
      const imageUrl = `https://battery-ml-results-test.s3.us-east-1.amazonaws.com/battery-reports/${deviceId}/battery_health_report.png?t=${Date.now()}`;

      // First, try to load existing image
      try {
        const checkResponse = await fetch(imageUrl, { method: 'HEAD' });
        if (checkResponse.ok) {
          setReportModal((prev) => ({
            ...prev,
            aiImageUrl: imageUrl,
            aiLoading: false,
            aiError: ''
          }));
          return;
        }
      } catch (headError) {
        console.log('No existing image found, will generate new one');
      }

      // No existing image, trigger ML inference
      console.log('Triggering ML inference for:', deviceId);
      const result = await mlService.runInference(
        {
          evse_id: evseId,
          connector_id: connectorId,
          limit: 60
        },
        (status) => {
          console.log(`ML Progress: ${status.progress}% - ${status.message}`);
        }
      );

      if (result.status === 'completed') {
        setReportModal((prev) => ({
          ...prev,
          aiImageUrl: imageUrl,
          aiLoading: false,
          aiError: ''
        }));
      } else if (result.status === 'failed') {
        throw new Error(result.message || 'ML inference failed');
      } else {
        throw new Error('ML inference did not complete successfully');
      }
    } catch (error) {
      console.error('AI Health Report Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate AI health report';

      if (errorMessage.includes('fetch') || errorMessage.includes('NetworkError')) {
        setReportModal((prev) => ({
          ...prev,
          aiLoading: false,
          aiError: 'Cannot reach ML backend server. Please ensure backend is running on http://localhost:8000'
        }));
      } else {
        setReportModal((prev) => ({
          ...prev,
          aiLoading: false,
          aiError: errorMessage
        }));
      }
    }
  };

  // New simplified fetchAIHealthReport - just opens coupon modal
  const fetchAIHealthReport = async (evseId: string) => {
    setCouponModalState({ open: true, evseId });
    setTempCouponInput('');
  };

  // These 6 stations are marked as online
  const onlineStationNames = [
    'Hauz khas telephone exchange',
    'IIT',
    'Qutub Minar',
    'Rk Puram',
    'NH8 7 Panchsheel Park Metro Station Gate No1',
    'ANDHERIA MOD'
  ];

  const isStationOnline = (stationName: string) => {
    return onlineStationNames.some((name) => 
      stationName.toLowerCase().includes(name.toLowerCase())
    );
  };

  // Calculate distance between two coordinates using Haversine formula
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Get user's current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          console.log('Geolocation error:', error.message);
          // Silently fail - user denied permission or location unavailable
        }
      );
    }
  }, []);

  useEffect(() => {
    const csvPath = '/device_locations_api - Stations.csv';
    const url = encodeURI(csvPath);
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to fetch CSV: ${res.status}`);
        return res.text();
      })
      .then((text) => {
        const result = Papa.parse<CsvRow>(text, {
          header: true,
          skipEmptyLines: true,
        });

        const rows: CsvRow[] = (result.data || []).filter((r) => r['Station ID'] && r['EVSE ID']);

        const byStation = new Map<string, Station>();
        for (const row of rows) {
          const stationId = String(row['Station ID']!).trim();
          const name = String(row['Station Name'] || '').trim();
          const address = String(row['Address'] || '').trim();
          const city = String(row['City'] || '').trim();
          const state = String(row['State'] || '').trim();

          const coords = String(row['Coordinates'] || '').split(',');
          const latStr = row['Latitude'] !== undefined && row['Latitude'] !== '' ? String(row['Latitude']) : (coords[0] ? coords[0].trim() : '');
          const lngStr = row['Longitude'] !== undefined && row['Longitude'] !== '' ? String(row['Longitude']) : (coords[1] ? coords[1].trim() : '');
          const lat = Number(latStr);
          const lng = Number(lngStr);

          const stationStatus = String(row['Station Status'] || '').trim();
          const evseId = String(row['EVSE ID'] || '').trim();
          const evseStatus = String(row['EVSE Status'] || '').trim();
          const protocol = String(row['Protocol'] || '').trim();

          if (!byStation.has(stationId)) {
            byStation.set(stationId, {
              id: stationId,
              name: name || 'Unknown Station',
              address,
              city,
              state,
              latitude: isNaN(lat) ? 0 : lat,
              longitude: isNaN(lng) ? 0 : lng,
              stationStatus: stationStatus || 'Unknown',
              evses: [],
            });
          }

          const st = byStation.get(stationId)!;
          if (evseId && !st.evses.find((e) => e.evseId === evseId)) {
            st.evses.push({ evseId, status: evseStatus || 'Unknown', protocol });
          }
        }

        const cityOrder = (s: Station) => {
          const city = s.city.toLowerCase();
          const state = s.state.toLowerCase();
          if (city.includes('delhi') || state.includes('delhi')) return 0; // Delhi first
          if (city.includes('chandigarh') || state.includes('chandigarh')) return 1; // Chandigarh second
          if (state.includes('uttarakhand') || state.includes('uttrakhand') || city.includes('dehradun')) return 2; // Uttarakhand third
          return 3; // Others
        };

        const grouped = Array.from(byStation.values()).sort((a, b) => {
          const pa = cityOrder(a);
          const pb = cityOrder(b);
          if (pa !== pb) return pa - pb;
          const c = a.city.localeCompare(b.city);
          return c !== 0 ? c : a.name.localeCompare(b.name);
        });

        // Show all stations from CSV
        setStations(grouped);
      })
      .catch((err) => {
        console.error(err);
        setStations([]);
      });
  }, []);

  const filteredStations = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const filtered = stations.filter((station) => {
      const matchesSearch =
        !term ||
        station.name.toLowerCase().includes(term) ||
        station.city.toLowerCase().includes(term) ||
        station.address.toLowerCase().includes(term);

      const stationOnline = isStationOnline(station.name);
      const matchesStatus =
        filterStatus === 'All' ||
        (filterStatus === 'Online' && stationOnline) ||
        (filterStatus === 'Offline' && !stationOnline);

      return matchesSearch && matchesStatus;
    });

    // Sort by distance if user location is available
    if (userLocation) {
      return filtered.sort((a, b) => {
        // Calculate distance from user to each station
        const distanceA = calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          a.latitude,
          a.longitude
        );
        const distanceB = calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          b.latitude,
          b.longitude
        );

        // Sort by distance first (nearest first)
        const distanceDiff = distanceA - distanceB;
        if (Math.abs(distanceDiff) > 0.5) { // If distance difference > 0.5km, prioritize by distance
          return distanceDiff;
        }

        // If distances are similar, use the original sorting (city order, then name)
        const cityOrder = (s: Station) => {
          const city = s.city.toLowerCase();
          const state = s.state.toLowerCase();
          if (city.includes('delhi') || state.includes('delhi')) return 0;
          if (city.includes('chandigarh') || state.includes('chandigarh')) return 1;
          if (state.includes('uttarakhand') || state.includes('uttrakhand') || city.includes('dehradun')) return 2;
          return 3;
        };
        const pa = cityOrder(a);
        const pb = cityOrder(b);
        if (pa !== pb) return pa - pb;
        const c = a.city.localeCompare(b.city);
        return c !== 0 ? c : a.name.localeCompare(b.name);
      });
    }

    return filtered;
  }, [searchTerm, filterStatus, stations, userLocation]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-blue-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Link
                to="/"
                className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
                title="Back to home"
              >
                <ArrowLeft className="w-5 h-5 text-blue-700" />
              </Link>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-base">⚡</span>
                </div>
                <h1 className="text-2xl font-extrabold text-blue-900 tracking-tight">Zeflash2.0</h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-10">
        {/* Hero Section */}
        <div className="mb-12">
          <h2 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-3 tracking-tight">Find Your Charging Station</h2>
          <p className="text-gray-600 text-lg sm:text-xl max-w-2xl">Get instant access to Zeflash2.0-enabled EV charging stations near you. Book your rapid battery test in minutes.</p>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-blue-700">Online Stations</h3>
              <Zap className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-3xl font-extrabold text-blue-900">{
              stations.filter((s) => isStationOnline(s.name)).length
            }</p>
            <p className="text-xs text-blue-600 mt-1">Ready to serve you</p>
          </div>
          <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 border border-cyan-200 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-cyan-700">Test Duration</h3>
              <Clock className="w-5 h-5 text-cyan-600" />
            </div>
            <p className="text-3xl font-extrabold text-cyan-900">20 min</p>
            <p className="text-xs text-cyan-600 mt-1">Quick & accurate</p>
          </div>
          <div className="bg-gradient-to-br from-teal-50 to-teal-100 border border-teal-200 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-teal-700">Accuracy</h3>
              <CheckCircle className="w-5 h-5 text-teal-600" />
            </div>
            <p className="text-3xl font-extrabold text-teal-900">90%+</p>
            <p className="text-xs text-teal-600 mt-1">Highly reliable</p>
          </div>
        </div>

        {/* Search and Filter Section */}
        <div className="sticky top-20 z-30 bg-white/95 backdrop-blur rounded-2xl shadow-lg p-6 mb-12 border border-blue-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Search Bar */}
          <div className="relative w-full md:w-1/2">
            <Search className="absolute left-3 top-3 w-5 h-5 text-blue-400" />
            <input
              type="text"
              placeholder="Search by station name or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-blue-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base shadow-sm"
            />
          </div>

          {/* Status Filter */}
          <div className="flex gap-2 flex-wrap">
            {(['All', 'Online', 'Offline'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                aria-pressed={filterStatus === status}
                className={`px-4 py-2 rounded-full font-medium transition-colors border text-sm ${
                  filterStatus === status
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-blue-700 border-blue-200 hover:bg-blue-50'
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          {/* Results Count */}
          <div className="text-sm text-gray-600 font-semibold md:ml-4">
            <span className="text-blue-700">{filteredStations.length}</span> of <span className="text-blue-700">{stations.length}</span>
          </div>
        </div>

        {/* Stations Grid */}
        {filteredStations.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
              {filteredStations.map((station, index) => {
                const stationOnline = isStationOnline(station.name);
                const isTop3Nearby = userLocation && index < 3;
                const distance = userLocation ? calculateDistance(
                  userLocation.latitude,
                  userLocation.longitude,
                  station.latitude,
                  station.longitude
                ) : null;
                return (
                <div
                  key={station.id}
                  className={`bg-white rounded-2xl border-2 shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden flex flex-col min-h-[280px] group relative ${
                    isTop3Nearby 
                      ? 'border-blue-500 ring-2 ring-blue-400 hover:ring-blue-500 shadow-blue-200/50' 
                      : 'border-blue-100 hover:border-blue-300'
                  }`}
                >
                  {/* Top 3 Nearby Badge */}
                  {isTop3Nearby && (
                    <div className="absolute top-3 right-3 z-10 bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>#{index + 1} Nearest</span>
                    </div>
                  )}
                  
                  {/* Status Badge */}
                  <div className={`h-1.5 ${stationOnline ? 'bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500' : 'bg-gradient-to-r from-gray-400 via-gray-500 to-gray-600'}`} />

                  {/* Content */}
                  <div className="p-6 pt-5 flex-1 flex flex-col">
                    {/* Station Name with status indicator */}
                    <div className="mb-2.5">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-lg text-gray-900 tracking-tight group-hover:text-blue-600 transition-colors">
                          {station.name}
                        </h3>
                        <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full ${stationOnline ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                          {stationOnline ? 'Online' : 'Offline'}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-1.5 text-xs text-gray-600">
                        <MapPin className="w-3.5 h-3.5 text-blue-500" />
                        <span className="truncate">{station.city}{station.city && station.state ? ', ' : ''}{station.state}</span>
                      </div>
                      
                      {/* Distance Display */}
                      {distance !== null && (
                        <div className={`mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                          isTop3Nearby 
                            ? 'bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-800 border border-blue-400'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}>
                          <MapPin className="w-3 h-3" />
                          <span>{distance < 1 ? `${(distance * 1000).toFixed(0)}m` : `${distance.toFixed(1)}km`} away</span>
                        </div>
                      )}
                      
                      {station.latitude && station.longitude ? (
                        <div className="mt-2">
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${station.latitude},${station.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-blue-300 text-xs font-semibold text-blue-700 bg-white hover:bg-blue-50"
                          >
                            <MapPin className="w-3.5 h-3.5" />
                            Open in Google Maps
                          </a>
                        </div>
                      ) : null}
                    </div>

                    {/* Features */}
                    <div className="space-y-1.5 mb-4 text-xs text-gray-600">
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        <span>20-minute rapid test</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                        <span>Instant health report</span>
                      </div>
                    </div>

                    {/* Chargers at this station */}
                    <div className="mt-2 space-y-3 border-t border-blue-100 pt-3">
                      {station.evses.map((e, idx) => (
                        <div
                          key={e.evseId || idx}
                          className="rounded-xl border border-blue-100 bg-blue-50/70 px-4 py-4 w-full overflow-hidden"
                        >
                          {/* Charger header */}
                          <div className="flex items-start gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm ${
                              e.status.toLowerCase() === 'available'
                                ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                                : e.status.toLowerCase() === 'in use'
                                ? 'bg-gradient-to-r from-yellow-500 to-amber-500'
                                : 'bg-gradient-to-r from-blue-500 to-cyan-500'
                            }`}>
                              {idx + 1}
                            </div>
                            <div className="min-w-0">
                              <p className="text-base font-extrabold text-gray-900">Charger {idx + 1}</p>
                              <p className="text-[12px] text-gray-600 truncate">EVSE ID: {e.evseId}</p>
                              <p className="text-[11px] text-gray-500">Status: {e.status}{e.protocol ? ` • ${e.protocol}` : ''}</p>
                            </div>
                          </div>

                          {/* Connectors list */}
                          <div className="mt-4 grid grid-cols-3 gap-2">
                            {[1, 2, 3].map((connector) => (
                              <div
                                key={`${e.evseId}-connector-${connector}`}
                                className="flex flex-col gap-2 rounded-lg border border-blue-100 bg-white px-2.5 py-2.5"
                              >
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-1.5">
                                    <div className={`w-2.5 h-2.5 rounded-full ${
                                      e.status.toLowerCase() === 'available'
                                        ? 'bg-green-500'
                                        : e.status.toLowerCase() === 'in use'
                                        ? 'bg-amber-500'
                                        : 'bg-blue-400'
                                    }`} />
                                    <p className="text-xs font-bold text-gray-900">C. {connector}</p>
                                  </div>
                                  <p className="text-[10px] text-gray-500">{e.protocol || 'ocpp1.6'}</p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => fetchChargerReport(e.evseId, connector)}
                                  className="inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-md text-[10px] font-semibold border border-blue-300 text-blue-700 bg-white hover:bg-blue-50"
                                  aria-label={`View report for connector ${connector}`}
                                >
                                  <Zap className="w-2.5 h-2.5" />
                                  Report
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
              })}
            </div>

            {/* Info Section */}
            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-2xl p-8 mb-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Why Choose Zeflash2.0?</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <Zap className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">Ultra-Fast Testing</h4>
                    <p className="text-gray-600 text-sm">Get comprehensive battery diagnostics in just 20 minutes at any fast charger.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-xl bg-cyan-100 flex items-center justify-center flex-shrink-0">
                    <BarChart3 className="w-6 h-6 text-cyan-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">Detailed Reports</h4>
                    <p className="text-gray-600 text-sm">Receive instant health insights including SoP, SoF, and efficiency metrics.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-6 h-6 text-teal-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">Lab-Grade Accuracy</h4>
                    <p className="text-gray-600 text-sm">Over 90% accuracy using advanced AI and physics-based diagnostics.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">Trusted by Thousands</h4>
                    <p className="text-gray-600 text-sm">Join thousands of EV owners making informed decisions about their vehicles.</p>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl shadow-lg p-16 text-center border-2 border-blue-200">
            <Search className="w-16 h-16 text-blue-200 mx-auto mb-4" />
            <p className="text-blue-700 text-xl font-bold mb-2">No stations found</p>
            <p className="text-blue-600 text-base">Try adjusting your search terms or filters to find available stations.</p>
          </div>
        )}
      </main>

      {/* Report Modal */}
      {reportModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[85vh] overflow-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-blue-100 p-6 sticky top-0 bg-white z-10">
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900">ZEFLASH2.0 RAPID AI Battery Report</h2>
                <p className="text-sm text-gray-600 mt-1">EVSE ID: {reportModal.evseId} • Connector: {reportModal.connectorId}</p>
              </div>
              <div className="flex items-center gap-3">
                {/* Download button with visuals */}
                <button
                  onClick={async () => {
                    if (!reportContentRef.current || !reportModal.data?.data || !aiImageContainerRef.current) return;
                    try {
                      const pdf = new jsPDF({
                        orientation: 'portrait',
                        unit: 'mm',
                        format: 'a4'
                      });
                      
                      const pageWidth = pdf.internal.pageSize.getWidth();
                      const pageHeight = pdf.internal.pageSize.getHeight();
                      const margin = 8;
                      const contentWidth = pageWidth - (2 * margin);
                      const headerHeight = 16;

                      const colors = {
                        pageBg: [248, 250, 252],
                        headerBg: [37, 99, 235],
                        headerText: [255, 255, 255],
                        bodyText: [33, 37, 41],
                        sectionTitle: [30, 64, 175],
                        divider: [203, 213, 225],
                        cardBg: [255, 255, 255],
                        cardBorder: [226, 232, 240]
                      } as const;

                      const drawBackgroundAndHeader = () => {
                        // Page background
                        pdf.setFillColor(colors.pageBg[0], colors.pageBg[1], colors.pageBg[2]);
                        pdf.rect(0, 0, pageWidth, pageHeight, 'F');
                        // Header banner
                        pdf.setFillColor(colors.headerBg[0], colors.headerBg[1], colors.headerBg[2]);
                        pdf.rect(0, 0, pageWidth, headerHeight, 'F');
                        pdf.setTextColor(colors.headerText[0], colors.headerText[1], colors.headerText[2]);
                        pdf.setFontSize(12);
                        pdf.text('Charger Report', margin, 7);
                        pdf.setFontSize(9);
                        pdf.text(`EVSE ID: ${reportModal.evseId} | Connector: ${reportModal.connectorId}`, margin, 11.5);
                        pdf.text(`Date: ${new Date().toISOString().slice(0, 10)}`, margin, 14);
                        // Divider under header
                        pdf.setDrawColor(colors.divider[0], colors.divider[1], colors.divider[2]);
                        pdf.setLineWidth(0.2);
                        pdf.line(margin, headerHeight + 0.5, pageWidth - margin, headerHeight + 0.5);
                        // Reset body text styling
                        pdf.setTextColor(colors.bodyText[0], colors.bodyText[1], colors.bodyText[2]);
                        pdf.setFontSize(10);
                      };

                      const newPage = () => {
                        pdf.addPage();
                        drawBackgroundAndHeader();
                        return headerHeight + margin;
                      };

                      // First page chrome
                      drawBackgroundAndHeader();
                      let currentPosition = headerHeight + margin;

                      // Add AI Image Section - Use the already-loaded image from DOM
                      pdf.setTextColor(colors.sectionTitle[0], colors.sectionTitle[1], colors.sectionTitle[2]);
                      pdf.setFontSize(12);
                      pdf.text('AI Battery Health Analysis', margin, currentPosition);
                      currentPosition += 6;

                      // Card container for AI section
                      const cardX = margin;
                      const cardYStart = currentPosition;
                      const cardPadding = 4;
                      let cardHeight = 30; // will adjust after image
                      pdf.setDrawColor(colors.cardBorder[0], colors.cardBorder[1], colors.cardBorder[2]);
                      pdf.setFillColor(colors.cardBg[0], colors.cardBg[1], colors.cardBg[2]);
                      pdf.roundedRect(cardX, cardYStart, contentWidth, cardHeight, 2, 2, 'FD');
                      currentPosition += cardPadding;

                      try {
                        // Get the img element that's already loaded in the DOM
                        const imgElement = aiImageContainerRef.current.querySelector('img') as HTMLImageElement;
                        
                        if (imgElement && imgElement.src && imgElement.naturalHeight > 0) {
                          // Image is already loaded in DOM, draw it on a canvas
                          const canvas = document.createElement('canvas');
                          const ctx = canvas.getContext('2d');
                          if (!ctx) throw new Error('Could not get canvas context');
                          
                          // Set canvas dimensions to match the natural image size
                          canvas.width = imgElement.naturalWidth;
                          canvas.height = imgElement.naturalHeight;
                          
                          // Draw the image from the already-loaded DOM element
                          ctx.drawImage(imgElement, 0, 0);
                          
                          // Get the canvas as PNG
                          const imgData = canvas.toDataURL('image/png');
                          
                          // Calculate dimensions for PDF
                          const imgWidth = contentWidth - (2 * cardPadding);
                          const imgHeight = (imgElement.naturalHeight * imgWidth) / imgElement.naturalWidth;
                          
                          if (currentPosition + imgHeight + cardPadding > pageHeight - margin) {
                            currentPosition = newPage();
                            // Re-draw card backdrop on new page
                            pdf.roundedRect(cardX, currentPosition, contentWidth, imgHeight + (2 * cardPadding), 2, 2, 'FD');
                            currentPosition += cardPadding;
                          }
                          
                          pdf.addImage(imgData, 'PNG', margin + cardPadding, currentPosition, imgWidth, imgHeight);
                          currentPosition += imgHeight + cardPadding;
                          // Adjust card height and redraw border to fit content
                          cardHeight = (currentPosition - cardYStart) + cardPadding;
                          pdf.setDrawColor(colors.cardBorder[0], colors.cardBorder[1], colors.cardBorder[2]);
                          pdf.roundedRect(cardX, cardYStart, contentWidth, cardHeight, 2, 2);
                          currentPosition += 6;
                        } else {
                          pdf.setTextColor(150);
                          pdf.setFontSize(9);
                          pdf.text('AI image not yet loaded. Please wait for image to load in the UI first.', margin, currentPosition);
                          currentPosition += 8;
                          // Adjust card to minimal height
                          cardHeight = (currentPosition - cardYStart) + cardPadding;
                          pdf.roundedRect(cardX, cardYStart, contentWidth, cardHeight, 2, 2);
                        }
                      } catch (err) {
                        console.error('Failed to process AI image via direct canvas draw:', err);
                        try {
                          const container = aiImageContainerRef.current;
                          if (container) {
                            const canvas = await html2canvas(container, {
                              scale: 2,
                              logging: false,
                              useCORS: true,
                              allowTaint: false,
                              backgroundColor: '#ffffff'
                            });
                            const imgData = canvas.toDataURL('image/png');
                            const imgWidth = contentWidth - (2 * cardPadding);
                            const imgHeight = (canvas.height * imgWidth) / canvas.width;

                            if (currentPosition + imgHeight + cardPadding > pageHeight - margin) {
                              currentPosition = newPage();
                              pdf.roundedRect(cardX, currentPosition, contentWidth, imgHeight + (2 * cardPadding), 2, 2, 'FD');
                              currentPosition += cardPadding;
                            }
                            pdf.addImage(imgData, 'PNG', margin + cardPadding, currentPosition, imgWidth, imgHeight);
                            currentPosition += imgHeight + cardPadding;
                            cardHeight = (currentPosition - cardYStart) + cardPadding;
                            pdf.roundedRect(cardX, cardYStart, contentWidth, cardHeight, 2, 2);
                            currentPosition += 6;
                          } else {
                            pdf.setTextColor(150);
                            pdf.setFontSize(9);
                            pdf.text('Unable to process AI image', margin, currentPosition);
                            currentPosition += 8;
                            cardHeight = (currentPosition - cardYStart) + cardPadding;
                            pdf.roundedRect(cardX, cardYStart, contentWidth, cardHeight, 2, 2);
                          }
                        } catch (fallbackErr) {
                          console.error('Fallback html2canvas capture also failed:', fallbackErr);
                          pdf.setTextColor(150);
                          pdf.setFontSize(9);
                          pdf.text('Unable to process AI image', margin, currentPosition);
                          currentPosition += 8;
                          cardHeight = (currentPosition - cardYStart) + cardPadding;
                          pdf.roundedRect(cardX, cardYStart, contentWidth, cardHeight, 2, 2);
                        }
                      }

                      // Add page break before metrics with styled header
                      currentPosition = newPage();
                      pdf.setTextColor(colors.sectionTitle[0], colors.sectionTitle[1], colors.sectionTitle[2]);
                      pdf.setFontSize(12);
                      pdf.text('Charging Session Metrics & Visuals', margin, currentPosition);
                      pdf.setDrawColor(colors.divider[0], colors.divider[1], colors.divider[2]);
                      pdf.setLineWidth(0.2);
                      pdf.line(margin, currentPosition + 2.5, pageWidth - margin, currentPosition + 2.5);
                      currentPosition += 6;

                      // Capture report metrics
                      const element = reportContentRef.current;
                      const originalWidth = element.style.width;
                      const originalHeight = element.style.height;
                      const originalMaxHeight = element.parentElement?.style.maxHeight;
                      
                      // Temporarily expand to capture full content
                      if (element.parentElement) {
                        element.parentElement.style.maxHeight = 'none';
                      }
                      element.style.width = '297mm';
                      element.style.height = 'auto';

                      await new Promise(resolve => setTimeout(resolve, 1500));

                      const canvas = await html2canvas(element, {
                        scale: 2,
                        logging: false,
                        useCORS: true,
                        allowTaint: true,
                        backgroundColor: '#ffffff'
                      });

                      // Restore original dimensions
                      element.style.width = originalWidth;
                      element.style.height = originalHeight;
                      if (element.parentElement) {
                        element.parentElement.style.maxHeight = originalMaxHeight || '';
                      }

                      const imgData = canvas.toDataURL('image/png');
                      const imgHeight = (canvas.height * contentWidth) / canvas.width;
                      let heightLeft = imgHeight;

                      // Add content pages
                      while (heightLeft > 0) {
                        const pageHeightAvailable = pageHeight - (2 * margin);
                        
                        if (currentPosition + heightLeft > pageHeight) {
                          const heightToPrint = pageHeightAvailable - (currentPosition - margin);
                          
                          pdf.addImage(
                            imgData,
                            'PNG',
                            margin,
                            currentPosition,
                            contentWidth,
                            heightToPrint
                          );
                          
                          heightLeft -= heightToPrint;
                          // New page with chrome
                          currentPosition = newPage();
                          // Re-add section header on subsequent pages
                          pdf.setTextColor(colors.sectionTitle[0], colors.sectionTitle[1], colors.sectionTitle[2]);
                          pdf.setFontSize(12);
                          pdf.text('Charging Session Metrics & Visuals', margin, currentPosition);
                          pdf.setDrawColor(colors.divider[0], colors.divider[1], colors.divider[2]);
                          pdf.setLineWidth(0.2);
                          pdf.line(margin, currentPosition + 2.5, pageWidth - margin, currentPosition + 2.5);
                          currentPosition += 6;
                          
                          if (heightLeft > 0) {
                            // next loop will draw background via newPage() above
                          }
                        } else {
                          pdf.addImage(imgData, 'PNG', margin, currentPosition, contentWidth, imgHeight);
                          heightLeft = 0;
                        }
                      }

                      // Footer: add page numbers and attribution
                      const totalPages = pdf.getNumberOfPages();
                      for (let i = 1; i <= totalPages; i++) {
                        pdf.setPage(i);
                        pdf.setTextColor(120);
                        pdf.setFontSize(8);
                        const footerText = `Generated by ZeFlash2.0 • Page ${i} of ${totalPages}`;
                        pdf.text(footerText, margin, pageHeight - 4);
                      }

                      pdf.save(`charger_report_${reportModal.evseId}_${reportModal.connectorId}_${new Date().toISOString().slice(0, 10)}.pdf`);
                    } catch (error) {
                      console.error('Error generating PDF:', error);
                      alert('Failed to generate PDF. Please try again.');
                    }
                  }}
                  disabled={!reportModal.data?.data || reportModal.loading}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Download report with visuals as PDF"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Report</span>
                </button>
                
                {/* Manual refresh button */}
                <button
                  onClick={() => fetchChargerReport(reportModal.evseId, reportModal.connectorId, true)}
                  disabled={reportModal.loading}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                  title="Refresh now"
                >
                  <RefreshCw className={`w-5 h-5 text-gray-700 ${reportModal.loading ? 'animate-spin' : ''}`} />
                </button>
                
                {/* Close button */}
                <button
                  onClick={() => setReportModal({ ...reportModal, open: false })}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-700" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              {reportModal.loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin">
                    <Zap className="w-8 h-8 text-blue-600" />
                  </div>
                  <p className="ml-3 text-gray-600">Loading report...</p>
                </div>
              ) : reportModal.error ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-800 font-semibold">Error loading report</p>
                  <p className="text-red-600 text-sm mt-1">{reportModal.error}</p>
                </div>
              ) : reportModal.data?.error && reportModal.data.error.toLowerCase().includes('getting ready') ? (
                <div className="bg-blue-50 border border-blue-300 rounded-lg p-6">
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <div className="animate-spin h-8 w-8 border-3 border-blue-400 border-t-blue-600 rounded-full"></div>
                    <p className="text-blue-900 font-semibold text-lg">Report is Getting Ready</p>
                    <p className="text-blue-700 text-sm text-center">Collecting data points for the last 20 minutes...</p>
                    <p className="text-blue-600 text-xs text-center mt-2">The charging report will be available once sufficient data is collected.</p>
                  </div>
                </div>
              ) : reportModal.data?.error && reportModal.data.error.toLowerCase().includes('no charging') ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-yellow-800 font-semibold">No Charging Active</p>
                  <p className="text-yellow-700 text-sm mt-1">This connector is not currently charging. Data will be available once charging begins.</p>
                </div>
              ) : reportModal.data ? (
                <div className="space-y-4">
                  {/* Get AI Health Report Button - Payment Required */}
                  <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 border border-purple-200">
                    <div className="mb-3">
                      <p className="text-sm text-gray-700 mb-1">
                        <span className="font-semibold">Device ID:</span> {reportModal.evseId}_{reportModal.connectorId}
                      </p>
                      <p className="text-xs text-gray-600">
                        S3 Path: battery-reports/{reportModal.evseId}_{reportModal.connectorId}/
                      </p>
                      <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 bg-orange-100 border border-orange-300 rounded-lg">
                        <Zap className="w-4 h-4 text-orange-600" />
                        <span className="text-xs font-semibold text-orange-700">₹99 - Premium AI Report</span>
                      </div>
                    </div>

                    {/* Payment Error */}
                    {reportModal.paymentError && (
                      <div className="mb-3 bg-red-50 border border-red-200 rounded-lg p-3">
                        <p className="text-red-800 text-sm font-semibold">Payment Error</p>
                        <p className="text-red-700 text-xs mt-1">{reportModal.paymentError}</p>
                      </div>
                    )}

                    {isLoaded && !user ? (
                      <SignInButton mode="modal">
                        <button className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl">
                          <BarChart3 className="w-5 h-5" />
                          <span>Sign In to Generate AI Report</span>
                        </button>
                      </SignInButton>
                    ) : (
                      <button
                        onClick={() => fetchAIHealthReport(reportModal.evseId)}
                        disabled={reportModal.aiLoading || reportModal.paymentPending}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-400 text-white font-semibold rounded-lg transition-all duration-300 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                      >
                        {reportModal.paymentPending ? (
                          <>
                            <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                            <span>Processing Payment...</span>
                          </>
                        ) : reportModal.aiLoading ? (
                          <>
                            <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                            <span>Generating Report...</span>
                          </>
                        ) : (
                          <>
                            <BarChart3 className="w-5 h-5" />
                            <span>Get AI Health Report</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {/* AI Health Report Error */}
                  {reportModal.aiError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <p className="text-red-800 font-semibold">AI Report Error</p>
                      <p className="text-red-600 text-sm mt-1">{reportModal.aiError}</p>
                      <div className="mt-3 pt-3 border-t border-red-200">
                        <p className="text-xs text-gray-700 mb-2">Try accessing S3 URL directly:</p>
                        <a 
                          href={`https://battery-ml-results-test.s3.us-east-1.amazonaws.com/battery-reports/${reportModal.evseId}_${reportModal.connectorId}/battery_health_report.png`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:text-blue-800 underline break-all"
                        >
                          Open S3 Image
                        </a>
                      </div>
                    </div>
                  )}

                  {/* AI Health Report Loading State */}
                  {reportModal.aiLoading && (
                    <div className="border border-gray-200 rounded-lg p-8 bg-white flex items-center justify-center min-h-[300px]">
                      <div className="flex flex-col items-center justify-center space-y-4">
                        <div className="animate-spin h-10 w-10 border-3 border-blue-400 border-t-blue-600 rounded-full"></div>
                        <p className="text-gray-700 font-semibold">Generating AI Report...</p>
                        <p className="text-gray-600 text-sm">This may take a moment</p>
                      </div>
                    </div>
                  )}

                  {/* AI Health Report Image */}
                  <div ref={aiImageContainerRef} className="border border-gray-200 rounded-lg p-4 bg-white min-h-[200px] flex items-center justify-center">
                    {reportModal.aiLoading && (
                      <div className="flex flex-col items-center justify-center space-y-4">
                        <div className="animate-spin h-8 w-8 border-3 border-blue-400 border-t-blue-600 rounded-full"></div>
                        <p className="text-gray-600 text-sm">Generating AI image...</p>
                      </div>
                    )}
                    {reportModal.aiImageUrl && !reportModal.aiLoading && (
                      <div>
                        <p className="text-gray-700 font-semibold mb-3">AI Battery Health Analysis</p>
                        <img 
                          src={reportModal.aiImageUrl} 
                          alt="AI Health Report" 
                          className="w-full h-auto rounded-lg shadow-md border border-gray-100"
                          crossOrigin="anonymous"
                          onError={() => {
                            console.error('Image failed to load:', reportModal.aiImageUrl);
                            setReportModal((prev) => ({ 
                              ...prev, 
                              aiError: 'Failed to load AI report image. The image may still be generating. Please try again in a moment.',
                              aiLoading: false,
                              aiImageUrl: ''
                            }));
                          }}
                        />
                      </div>
                    )}
                    {!reportModal.aiLoading && !reportModal.aiImageUrl && (
                      <p className="text-gray-500 text-center">AI analysis not yet generated. Generate AI report to see detailed analysis.</p>
                    )}
                  </div>
                  {reportModal.data.data && reportModal.data.data.length > 0 ? (
                    <div ref={reportContentRef} className="space-y-6">
                      {/* Parse data for visualizations */}
                      {(() => {
                        const parsedData: Array<{
                          timestamp: string;
                          voltage: number;
                          power: number;
                          current: number;
                          energy: number;
                          temperature: number;
                        }> = [];
                        
                        reportModal.data.data.forEach((item: any) => {
                          let voltage = 0;
                          let power = 0;
                          let current = 0;
                          let energy = 0;
                          let temperature = 0;
                          
                          if (item.payload && Array.isArray(item.payload)) {
                            for (const p of item.payload) {
                              if (p.Key === 'meterValue' && p.Value && Array.isArray(p.Value)) {
                                const meterArray = p.Value[0];
                                if (meterArray && Array.isArray(meterArray)) {
                                  for (const meter of meterArray) {
                                    if (meter.Key === 'sampledValue' && meter.Value && Array.isArray(meter.Value)) {
                                      for (const sample of meter.Value) {
                                        if (Array.isArray(sample)) {
                                          let measurand = '';
                                          let value = '';
                                          
                                          for (const item of sample) {
                                            if (item.Key === 'measurand') measurand = item.Value;
                                            if (item.Key === 'value') value = item.Value;
                                          }
                                          
                                          if (measurand === 'Voltage') voltage = parseFloat(value) || 0;
                                          else if (measurand === 'Power.Active.Import') power = parseFloat(value) || 0;
                                          else if (measurand === 'Current.Import') current = parseFloat(value) || 0;
                                          else if (measurand === 'Energy.Active.Import.Register') energy = parseFloat(value) || 0;
                                          else if (measurand === 'Temperature') temperature = parseFloat(value) || 0;
                                        }
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          }
                          
                          parsedData.push({
                            timestamp: item.createdat?.substring(11, 16) || '',
                            voltage,
                            power,
                            current,
                            energy,
                            temperature
                          });
                        });
                        
                        // Calculate averages and stats
                        const avgCurrent = parsedData.reduce((sum, d) => sum + d.current, 0) / parsedData.length;
                        const avgTemperature = parsedData.reduce((sum, d) => sum + d.temperature, 0) / parsedData.length;
                        const maxCurrent = Math.max(...parsedData.map(d => d.current));
                        const totalEnergy = parsedData[parsedData.length - 1]?.energy - parsedData[0]?.energy;
                        
                        // Energy for bar chart (convert to kWh)
                        const energyData = parsedData.slice(-8).map((d) => ({
                          name: d.timestamp,
                          energy: (d.energy / 1000).toFixed(2)
                        }));
                        
                        // Power trend data
                        const powerData = parsedData.map(d => ({
                          time: d.timestamp,
                          power: parseFloat((d.power / 1000).toFixed(2)),
                          voltage: parseFloat(d.voltage.toFixed(1))
                        }));
                        
                        return (
                          <>
                            {/* Top Row: Current Gauge and Energy Bar Chart */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                              {/* Current Gauge */}
                              <div className="bg-white rounded-xl p-4 md:p-6 border border-gray-200 shadow-sm">
                                <h3 className="text-xs md:text-sm font-semibold text-gray-600 mb-3 md:mb-4">Current</h3>
                                <div className="flex flex-col items-center">
                                  <div className="relative w-32 h-16 md:w-48 md:h-24">
                                    <svg viewBox="0 0 100 50" className="w-full h-full">
                                      {/* Background arc */}
                                      <path
                                        d="M 10 45 A 40 40 0 0 1 90 45"
                                        fill="none"
                                        stroke="#e5e7eb"
                                        strokeWidth="8"
                                      />
                                      {/* Value arc */}
                                      <path
                                        d="M 10 45 A 40 40 0 0 1 90 45"
                                        fill="none"
                                        stroke="#06b6d4"
                                        strokeWidth="8"
                                        strokeDasharray={`${(avgCurrent / maxCurrent) * 125} 125`}
                                        strokeLinecap="round"
                                      />
                                      {/* Needle */}
                                      <line
                                        x1="50"
                                        y1="45"
                                        x2={50 + 35 * Math.cos((Math.PI * (avgCurrent / maxCurrent)) - Math.PI)}
                                        y2={45 + 35 * Math.sin((Math.PI * (avgCurrent / maxCurrent)) - Math.PI)}
                                        stroke="#0891b2"
                                        strokeWidth="2"
                                      />
                                      <circle cx="50" cy="45" r="3" fill="#0891b2" />
                                    </svg>
                                  </div>
                                  <div className="text-center mt-2">
                                    <p className="text-2xl md:text-3xl font-bold text-gray-900">{avgCurrent.toFixed(2)}</p>
                                    <p className="text-xs md:text-sm text-gray-600">Amperes</p>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Energy Generation Bar Chart */}
                              <div className="bg-white rounded-xl p-4 md:p-6 border border-gray-200 shadow-sm">
                                <h3 className="text-xs md:text-sm font-semibold text-gray-600 mb-3 md:mb-4">Energy Generation</h3>
                                <p className="text-[10px] md:text-xs text-gray-500 mb-2">kWh</p>
                                <ResponsiveContainer width="100%" height={120}>
                                  <BarChart data={energyData}>
                                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                                    <YAxis tick={{ fontSize: 10 }} />
                                    <RechartsTooltip />
                                    <Bar dataKey="energy" fill="#22c55e" radius={[8, 8, 0, 0]} />
                                  </BarChart>
                                </ResponsiveContainer>
                              </div>
                            </div>
                            
                            {/* Power Trend Line Chart */}
                            <div className="bg-white rounded-xl p-4 md:p-6 border border-gray-200 shadow-sm">
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 md:mb-4 gap-2">
                                <h3 className="text-xs md:text-sm font-semibold text-gray-600">Power & Voltage Trends</h3>
                                <span className="text-[10px] md:text-xs bg-gray-100 px-2 py-1 rounded w-fit">Last {parsedData.length} readings</span>
                              </div>
                              <ResponsiveContainer width="100%" height={180}>
                                <LineChart data={powerData}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                                  <XAxis dataKey="time" tick={{ fontSize: 9 }} />
                                  <YAxis yAxisId="left" tick={{ fontSize: 9 }} domain={['auto', 'auto']} />
                                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9 }} domain={['auto', 'auto']} />
                                  <RechartsTooltip />
                                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                                  <Line yAxisId="left" type="monotone" dataKey="power" stroke="#dc2626" strokeWidth={2} name="Power (kW)" dot={{ r: 2 }} />
                                  <Line yAxisId="right" type="monotone" dataKey="voltage" stroke="#3b82f6" strokeWidth={2} name="Voltage (V)" dot={{ r: 2 }} />
                                </LineChart>
                              </ResponsiveContainer>
                            </div>
                            
                            {/* Bottom Row: Stats Cards */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg md:rounded-xl p-3 md:p-4 border border-blue-200">
                                <div className="flex items-center justify-between mb-1 md:mb-2">
                                  <Zap className="text-blue-600" size={16} />
                                  <span className="text-[9px] md:text-xs font-medium text-blue-600 bg-blue-200 px-1.5 md:px-2 py-0.5 md:py-1 rounded-full">Voltage</span>
                                </div>
                                <p className="text-lg md:text-2xl font-bold text-blue-900">{parsedData[parsedData.length - 1]?.voltage.toFixed(1) || 0}V</p>
                                <p className="text-[10px] md:text-xs text-blue-700">Current Reading</p>
                              </div>
                              
                              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg md:rounded-xl p-3 md:p-4 border border-green-200">
                                <div className="flex items-center justify-between mb-1 md:mb-2">
                                  <Activity className="text-green-600" size={16} />
                                  <span className="text-[9px] md:text-xs font-medium text-green-600 bg-green-200 px-1.5 md:px-2 py-0.5 md:py-1 rounded-full">Power</span>
                                </div>
                                <p className="text-lg md:text-2xl font-bold text-green-900">{(parsedData[parsedData.length - 1]?.power / 1000).toFixed(2) || 0}kW</p>
                                <p className="text-[10px] md:text-xs text-green-700">Active Power</p>
                              </div>
                              
                              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg md:rounded-xl p-3 md:p-4 border border-purple-200">
                                <div className="flex items-center justify-between mb-1 md:mb-2">
                                  <BarChart3 className="text-purple-600" size={16} />
                                  <span className="text-[9px] md:text-xs font-medium text-purple-600 bg-purple-200 px-1.5 md:px-2 py-0.5 md:py-1 rounded-full">Energy</span>
                                </div>
                                <p className="text-lg md:text-2xl font-bold text-purple-900">{(totalEnergy / 1000).toFixed(2)}kWh</p>
                                <p className="text-[10px] md:text-xs text-purple-700">Total Consumed</p>
                              </div>
                              
                              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg md:rounded-xl p-3 md:p-4 border border-orange-200">
                                <div className="flex items-center justify-between mb-1 md:mb-2">
                                  <Thermometer className="text-orange-600" size={16} />
                                  <span className="text-[9px] md:text-xs font-medium text-orange-600 bg-orange-200 px-1.5 md:px-2 py-0.5 md:py-1 rounded-full">Temp</span>
                                </div>
                                <p className="text-lg md:text-2xl font-bold text-orange-900">{avgTemperature.toFixed(1)}°C</p>
                                <p className="text-[10px] md:text-xs text-orange-700">Average Temp</p>
                              </div>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  ) : (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-blue-800">No data available for this connector.</p>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Coupon Modal Popup */}
      {couponModalState.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            {/* Header */}
            <div className="border-b border-gray-200 p-6 pb-4">
              <h2 className="text-2xl font-bold text-gray-900">Unlock AI Report</h2>
              <p className="text-sm text-gray-600 mt-1">Have a coupon code? Enter it below</p>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {/* Coupon Input */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Coupon Code (Optional)</label>
                <input
                  ref={couponModalRef}
                  type="text"
                  value={tempCouponInput}
                  onChange={(e) => setTempCouponInput(e.target.value.toUpperCase())}
                  placeholder="Enter coupon code"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCouponSubmit();
                    if (e.key === 'Escape') {
                      setCouponModalState({ ...couponModalState, open: false });
                      setTempCouponInput('');
                    }
                  }}
                  autoFocus
                />
              </div>

              {/* Coupon validation feedback */}
              {tempCouponInput && (
                <div>
                  {(() => {
                    const info = getCouponInfo(tempCouponInput);
                    if (info.valid) {
                      return (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <p className="text-green-800 font-semibold text-sm">✓ Coupon Valid!</p>
                          <p className="text-green-700 text-xs mt-1">
                            {info.amount === 0 ? 'Free access - No payment needed' : `Price: ₹${info.amount}`}
                          </p>
                        </div>
                      );
                    } else {
                      return (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                          <p className="text-red-800 font-semibold text-sm">✗ Invalid Coupon</p>
                        </div>
                      );
                    }
                  })()}
                </div>
              )}

              {/* Pricing info */}
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 border border-purple-200">
                <p className="text-sm font-semibold text-gray-900 mb-2">Pricing:</p>
                <div className="space-y-2 text-sm">
                  {tempCouponInput ? (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Original Price:</span>
                        <span className="text-gray-500 line-through">₹99</span>
                      </div>
                      {(() => {
                        const info = getCouponInfo(tempCouponInput);
                        return (
                          <div className="flex justify-between items-center font-bold text-lg border-t border-purple-200 pt-2">
                            <span className="text-gray-900">You Pay:</span>
                            <span className="text-purple-600">₹{info.amount}</span>
                          </div>
                        );
                      })()}
                    </>
                  ) : (
                    <div className="flex justify-between items-center font-bold text-lg">
                      <span className="text-gray-900">Price:</span>
                      <span className="text-purple-600">₹99</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer/Actions */}
            <div className="border-t border-gray-200 p-6 flex gap-3">
              <button
                onClick={() => {
                  setCouponModalState({ ...couponModalState, open: false });
                  setTempCouponInput('');
                }}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCouponSubmit}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-lg transition-all shadow-lg hover:shadow-xl"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChargingStations;
