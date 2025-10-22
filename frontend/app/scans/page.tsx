'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { scansAPI } from '@/app/lib/api';

interface Scan {
  id: number;
  risk_level: string;
  confidence_score: number;
  created_at: string;
  report_generated: boolean;
}

export default function MyScansPage() {
  const router = useRouter();
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchScans();
  }, []);

  const fetchScans = async () => {
    try {
      const response = await scansAPI.getAll();
      setScans(response.data.scans);
      setLoading(false);
    } catch (err: any) {
      setError('Failed to load scans');
      setLoading(false);
    }
  };

  const handleDelete = async (scanId: number) => {
    if (!confirm('Are you sure you want to delete this scan from your history?')) {
      return;
    }

    try {
      await scansAPI.delete(scanId);
      // Remove from local state
      setScans(scans.filter(scan => scan.id !== scanId));
      alert('Scan removed from your history');
    } catch (err: any) {
      alert('Failed to delete scan');
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'moderate':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'high':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading scans...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-indigo-600 hover:text-indigo-700 flex items-center gap-2 mb-4"
          >
            ← Back to Dashboard
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Scans</h1>
              <p className="text-gray-600 mt-2">
                View and manage all your ECG scan history
              </p>
            </div>
            <button
              onClick={() => router.push('/upload')}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium flex items-center gap-2"
            >
              <span>➕</span>
              <span>New Scan</span>
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {/* Scans List */}
        {scans.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No scans yet</h3>
            <p className="text-gray-600 mb-6">Upload your first ECG to get started</p>
            <button
              onClick={() => router.push('/upload')}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium"
            >
              Upload ECG
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {scans.map((scan) => (
              <div
                key={scan.id}
                className="bg-white rounded-xl shadow-sm border p-6 hover:shadow-md transition"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    {/* Icon */}
                    <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center text-2xl">
                      📄
                    </div>

                    {/* Scan Info */}
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">
                        Scan #{scan.id}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {formatDate(scan.created_at)}
                      </p>
                    </div>

                    {/* Risk Badge */}
                    <div className="flex items-center gap-3">
                      <div className={`px-4 py-2 rounded-lg border font-medium ${getRiskColor(scan.risk_level)}`}>
                        {scan.risk_level.toUpperCase()} RISK
                      </div>
                      <div className="text-sm text-gray-600">
                        {(scan.confidence_score * 100).toFixed(1)}% confidence
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => router.push(`/scans/${scan.id}`)}
                        className="px-4 py-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition font-medium"
                      >
                        View Details
                      </button>
                      {scan.report_generated && (
                        <button
                          onClick={async () => {
                            try {
                              const response = await scansAPI.downloadReport(scan.id);
                              const url = window.URL.createObjectURL(new Blob([response.data]));
                              const link = document.createElement('a');
                              link.href = url;
                              link.setAttribute('download', `CVD_Report_${scan.id}.pdf`);
                              document.body.appendChild(link);
                              link.click();
                              link.remove();
                            } catch (err) {
                              alert('Failed to download report');
                            }
                          }}
                          className="px-4 py-2 text-green-600 hover:bg-green-50 rounded-lg transition font-medium"
                        >
                          📥 Report
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(scan.id)}
                        className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition font-medium"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Stats Summary */}
        {scans.length > 0 && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border">
              <p className="text-sm text-gray-600 mb-1">Total Scans</p>
              <p className="text-3xl font-bold text-gray-900">{scans.length}</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border">
              <p className="text-sm text-gray-600 mb-1">Low Risk</p>
              <p className="text-3xl font-bold text-green-600">
                {scans.filter(s => s.risk_level === 'low').length}
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border">
              <p className="text-sm text-gray-600 mb-1">Reports Generated</p>
              <p className="text-3xl font-bold text-indigo-600">
                {scans.filter(s => s.report_generated).length}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}