'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI, scansAPI } from '@/app/lib/api';
import { 
  Home, 
  Activity, 
  Upload, 
  FileText, 
  User, 
  Settings, 
  LogOut,
  Heart,
  AlertCircle,
  CheckCircle,
  ChevronDown,
  Shield
} from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const HeartWaveLogo = () => (
    <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-200 overflow-hidden">
      <Heart className="w-7 h-7 text-white opacity-90" />
      <Activity className="absolute inset-0 w-full h-full text-white/80 scale-110" strokeWidth={1.5} />
    </div>
  );

  useEffect(() => {
    const fetchData = async () => {
      // ✅ CHECK BOTH STORAGE LOCATIONS
      const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
      
      console.log('Dashboard auth check:', {
        hasLocalStorage: !!localStorage.getItem('accessToken'),
        hasSessionStorage: !!sessionStorage.getItem('accessToken'),
        tokenFound: !!token
      });
      
      if (!token) {
        console.log('No token found, redirecting to login');
        router.push('/auth/login');
        return;
      }

      try {
        const [userRes, statsRes] = await Promise.all([
          authAPI.getCurrentUser(),
          scansAPI.getStatistics()
        ]);
        
        setUser(userRes.data);
        setStats(statsRes.data);
        setLoading(false);
      } catch (error: any) {
        console.error('Dashboard data fetch error:', error);
        if (error.response?.status === 401) {
          // Clear both storages
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          sessionStorage.removeItem('accessToken');
          sessionStorage.removeItem('refreshToken');
          router.push('/auth/login');
        } else {
          setError('Failed to load dashboard data');
          setLoading(false);
        }
      }
    };

    fetchData();
  }, [router]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    // ✅ CLEAR BOTH STORAGE LOCATIONS
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    sessionStorage.removeItem('accessToken');
    sessionStorage.removeItem('refreshToken');
    router.push('/auth/login');
  };

  const navItems = [
    { label: 'Home', icon: Home, action: () => router.push('/dashboard'), active: true },
    { label: 'Scans', icon: Activity, action: () => router.push('/scans') },
    { label: 'Upload', icon: Upload, action: () => router.push('/upload') }
  ];

  const profileMenuItems = [
    { label: 'Profile', icon: User, action: () => router.push('/profile') },
    ...(user?.role === 'admin' ? [{ label: 'Admin Panel', icon: Shield, action: () => router.push('/admin') }] : []),
    { label: 'Reports', icon: FileText, action: () => router.push('/reports') },
    { label: 'Settings', icon: Settings, action: () => router.push('/settings') },
    { label: 'Sign Out', icon: LogOut, action: handleLogout, variant: 'danger' as const }
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Unable to Load Dashboard</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition text-sm font-medium"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      <header className="bg-white border-b border-gray-200 px-6 lg:px-10 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <HeartWaveLogo />
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-blue-500 font-semibold">CVD Detect</p>
              <h1 className="text-xl font-semibold text-gray-900">Heart Disease Detection System</h1>
            </div>
          </div>

          <nav className="flex items-center gap-2">
            {navItems.map(({ label, icon: Icon, action, active }) => (
              <button
                key={label}
                onClick={action}
                className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition ${
                  active
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-blue-600'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </nav>

          <div className="relative" ref={profileMenuRef}>
            <button
              onClick={() => setProfileMenuOpen((prev) => !prev)}
              className="flex items-center gap-3 px-4 py-2 rounded-lg border border-gray-200 hover:border-blue-200 transition bg-white"
            >
              <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center font-semibold">
                {user?.first_name?.[0]}
                {user?.last_name?.[0]}
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-sm font-semibold text-gray-900">{user?.first_name} {user?.last_name}</p>
                <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>

            {profileMenuOpen && (
              <div className="absolute right-0 mt-3 w-56 bg-white border border-gray-100 rounded-xl shadow-xl p-2 z-20">
                {profileMenuItems.map(({ label, icon: Icon, action, variant }) => (
                  <button
                    key={label}
                    onClick={() => {
                      action();
                      setProfileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition ${
                      variant === 'danger'
                        ? 'text-red-600 hover:bg-red-50'
                        : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto w-full">
        <div className="w-full px-6 lg:px-10 py-8 space-y-8">
          {/* Welcome Section */}
          <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              Welcome, {user?.first_name}
            </h2>
            <p className="text-gray-600 mb-6">
              Review your ECG analyses and monitor cardiac health insights
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => router.push('/upload')}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium text-sm"
              >
                Start New Analysis
              </button>
              <button
                onClick={() => router.push('/scans')}
                className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium text-sm"
              >
                View All Scans
              </button>
            </div>
          </div>

          {/* Stats Grid */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-gradient-to-br from-blue-50 to-white p-6 rounded-lg border border-blue-100 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-gray-600">Total Analyses</p>
                  <Activity className="w-4 h-4 text-blue-600" />
                </div>
                <p className="text-3xl font-semibold text-gray-900">{stats.total_scans}</p>
                <p className="text-xs text-gray-500 mt-2">All time records</p>
                {stats.total_scans > 0 && (
                  <div className="mt-3 pt-3 border-t border-blue-100">
                    <p className="text-xs text-blue-600 font-medium">Active monitoring</p>
                  </div>
                )}
              </div>

              <div className="bg-gradient-to-br from-green-50 to-white p-6 rounded-lg border border-green-100 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-gray-600">Low Risk</p>
                  <CheckCircle className="w-4 h-4 text-green-600" />
                </div>
                <p className="text-3xl font-semibold text-green-600">{stats.risk_distribution.low}</p>
                <p className="text-xs text-gray-500 mt-2">Normal findings</p>
                {stats.total_scans > 0 && (
                  <div className="mt-3 pt-3 border-t border-green-100">
                    <p className="text-xs text-green-600 font-medium">
                      {((stats.risk_distribution.low / stats.total_scans) * 100).toFixed(0)}% of scans
                    </p>
                  </div>
                )}
              </div>

              <div className="bg-gradient-to-br from-orange-50 to-white p-6 rounded-lg border border-orange-100 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-gray-600">Moderate Risk</p>
                  <AlertCircle className="w-4 h-4 text-orange-600" />
                </div>
                <p className="text-3xl font-semibold text-orange-600">{stats.risk_distribution.moderate}</p>
                <p className="text-xs text-gray-500 mt-2">Requires monitoring</p>
                {stats.total_scans > 0 && (
                  <div className="mt-3 pt-3 border-t border-orange-100">
                    <p className="text-xs text-orange-600 font-medium">
                      {((stats.risk_distribution.moderate / stats.total_scans) * 100).toFixed(0)}% of scans
                    </p>
                  </div>
                )}
              </div>

              <div className="bg-gradient-to-br from-red-50 to-white p-6 rounded-lg border border-red-100 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-gray-600">High Risk</p>
                  <AlertCircle className="w-4 h-4 text-red-600" />
                </div>
                <p className="text-3xl font-semibold text-red-600">{stats.risk_distribution.high}</p>
                <p className="text-xs text-gray-500 mt-2">Immediate attention</p>
                {stats.total_scans > 0 && (
                  <div className="mt-3 pt-3 border-t border-red-100">
                    <p className="text-xs text-red-600 font-medium">
                      {((stats.risk_distribution.high / stats.total_scans) * 100).toFixed(0)}% of scans
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Health Insights Summary */}
          {stats && stats.total_scans > 0 && (
            <div className="bg-gradient-to-r from-blue-50 to-white rounded-lg border border-blue-100 p-6 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Health Insights Summary</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Based on your {stats.total_scans} analysis{stats.total_scans !== 1 ? 'es' : ''}, 
                    your cardiac health profile shows a {stats.risk_distribution.low > stats.risk_distribution.high ? 'predominantly low-risk' : stats.risk_distribution.high > 0 ? 'mixed-risk' : 'stable'} pattern.
                  </p>
                  <div className="flex flex-wrap gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <span className="text-gray-700">
                        <strong>{stats.risk_distribution.low}</strong> normal readings
                      </span>
                    </div>
                    {stats.risk_distribution.moderate > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                        <span className="text-gray-700">
                          <strong>{stats.risk_distribution.moderate}</strong> need monitoring
                        </span>
                      </div>
                    )}
                    {stats.risk_distribution.high > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                        <span className="text-gray-700">
                          <strong>{stats.risk_distribution.high}</strong> require attention
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="ml-6">
                  <button
                    onClick={() => router.push('/reports')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium text-sm"
                  >
                    View Reports
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <button
              onClick={() => router.push('/upload')}
              className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md hover:border-blue-200 transition text-left group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center border border-blue-100 group-hover:border-blue-200 transition">
                  <Upload className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-1 text-sm">New Analysis</h4>
                  <p className="text-xs text-gray-500">Upload ECG image for AI analysis</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => router.push('/scans')}
              className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md hover:border-blue-200 transition text-left group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-50 rounded-lg flex items-center justify-center border border-gray-100 group-hover:border-gray-200 transition">
                  <Activity className="w-5 h-5 text-gray-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-1 text-sm">Scan History</h4>
                  <p className="text-xs text-gray-500">View all your analyses</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => router.push('/reports')}
              className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md hover:border-blue-200 transition text-left group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-50 rounded-lg flex items-center justify-center border border-gray-100 group-hover:border-gray-200 transition">
                  <FileText className="w-5 h-5 text-gray-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-1 text-sm">Reports</h4>
                  <p className="text-xs text-gray-500">Download PDF reports</p>
                </div>
              </div>
            </button>
          </div>

          {/* Recent Scans */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Recent Analyses</h3>
                <p className="text-sm text-gray-500 mt-1">Your latest ECG scan results</p>
              </div>
              <button 
                onClick={() => router.push('/scans')}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                View All
              </button>
            </div>

            {stats?.total_scans > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-blue-100">
                      <FileText className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">Latest Analysis</p>
                      <p className="text-xs text-gray-500">Recently processed</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-green-50 text-green-700 text-xs font-medium rounded-md border border-green-100">
                    Low Risk
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4 border border-dashed border-gray-200">
                  <Activity className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-600 mb-4 text-sm">No analyses performed yet</p>
                <button
                  onClick={() => router.push('/upload')}
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium text-sm"
                >
                  Start First Analysis
                </button>
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}