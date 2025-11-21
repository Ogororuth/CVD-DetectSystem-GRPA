'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI, scansAPI } from '@/app/lib/api';
import { 
  Home, 
  Activity, 
  Upload, 
  FileText, 
  BarChart3, 
  User, 
  Settings, 
  LogOut,
  Heart,
  TrendingUp,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

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

  const handleLogout = () => {
    // ✅ CLEAR BOTH STORAGE LOCATIONS
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    sessionStorage.removeItem('accessToken');
    sessionStorage.removeItem('refreshToken');
    router.push('/auth/login');
  };

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
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-md flex items-center justify-center">
              <Heart className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">CVD Detect</h1>
              <p className="text-xs text-gray-500">Heart disease detection System</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          <div className="mb-6">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 mb-2">Navigation</p>
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-md bg-blue-50 text-blue-700 font-medium transition text-sm"
            >
              <Home className="w-5 h-5" />
              <span>Dashboard</span>
            </button>
            <button
              onClick={() => router.push('/scans')}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-gray-700 hover:bg-gray-50 transition text-sm"
            >
              <Activity className="w-5 h-5" />
              <span>Scan History</span>
            </button>
            <button
              onClick={() => router.push('/upload')}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-gray-700 hover:bg-gray-50 transition text-sm"
            >
              <Upload className="w-5 h-5" />
              <span>New Analysis</span>
            </button>
          </div>

          <div className="mb-6">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 mb-2">Reports</p>
            <button
              onClick={() => router.push('/reports')}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-gray-700 hover:bg-gray-50 transition text-sm"
            >
              <FileText className="w-5 h-5" />
              <span>Reports</span>
            </button>
            <button
              onClick={() => router.push('/analytics')}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-gray-700 hover:bg-gray-50 transition text-sm"
            >
              <BarChart3 className="w-5 h-5" />
              <span>Analytics</span>
            </button>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 mb-2">Settings</p>
            <button
              onClick={() => router.push('/profile')}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-gray-700 hover:bg-gray-50 transition text-sm"
            >
              <User className="w-5 h-5" />
              <span>Profile</span>
            </button>
            <button
              onClick={() => router.push('/settings')}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-gray-700 hover:bg-gray-50 transition text-sm"
            >
              <Settings className="w-5 h-5" />
              <span>Settings</span>
            </button>
          </div>
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-sm">
              {user?.first_name?.[0]}{user?.last_name?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.first_name} {user?.last_name}
              </p>
              <p className="text-xs text-gray-500 truncate capitalize">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition border border-gray-200"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-8 py-6">
          <h2 className="text-2xl font-semibold text-gray-900">
            Welcome, {user?.first_name}
          </h2>
          <p className="text-gray-600 mt-1 text-sm">
            {user?.role === 'student' && 'Student'}
            {user?.role === 'researcher' && 'Researcher'}
            {user?.role === 'healthcare' && 'Healthcare'}
            {user?.role === 'personal' && 'Personal'}
          </p>
        </div>

        {/* Content */}
        <div className="p-8">
          {/* Stats Grid */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-600 mb-1">Total Analyses</p>
                <p className="text-3xl font-semibold text-gray-900">{stats.total_scans}</p>
                <p className="text-xs text-gray-500 mt-2">All time</p>
              </div>

              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-600 mb-1">Low Risk</p>
                <p className="text-3xl font-semibold text-green-600">{stats.risk_distribution.low}</p>
                <p className="text-xs text-gray-500 mt-2">Normal findings</p>
              </div>

              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-600 mb-1">Moderate Risk</p>
                <p className="text-3xl font-semibold text-orange-600">{stats.risk_distribution.moderate}</p>
                <p className="text-xs text-gray-500 mt-2">Requires monitoring</p>
              </div>

              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-600 mb-1">High Risk</p>
                <p className="text-3xl font-semibold text-red-600">{stats.risk_distribution.high}</p>
                <p className="text-xs text-gray-500 mt-2">Immediate attention</p>
              </div>
            </div>
          )}

          {/* Recent Scans */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Recent Analyses</h3>
              <button 
                onClick={() => router.push('/scans')}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                View All
              </button>
            </div>

            {stats?.total_scans > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-md border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-50 rounded-md flex items-center justify-center">
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
                <div className="w-16 h-16 bg-gray-100 rounded-md flex items-center justify-center mx-auto mb-4">
                  <Activity className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-600 mb-4 text-sm">No analyses performed yet</p>
                <button
                  onClick={() => router.push('/upload')}
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition font-medium text-sm"
                >
                  Start First Analysis
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}