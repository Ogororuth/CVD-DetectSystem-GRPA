'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { scansAPI } from '@/app/lib/api';
import { Activity, FileText, Download, Trash2, ChevronLeft } from 'lucide-react';

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
      setError('Failed to load scan history');
      setLoading(false);
    }
  };

  const handleDelete = async (scanId: number) => {
    if (!confirm('Remove this analysis from your history? This action cannot be undone.')) {
      return;
    }

    try {
      await scansAPI.delete(scanId);
      setScans(scans.filter(scan => scan.id !== scanId));
    } catch (err: any) {
      alert('Unable to delete analysis');
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'moderate':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'high':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 text-sm">Loading analyses</p>
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
            className="text-blue-600 hover:text-blue-700 flex items-center gap-2 mb-4 text-sm font-medium"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-gray-900">Analysis History</h1>
              <p className="text-gray-600 mt-2 text-sm">
                View and manage all ECG analyses
              </p>
            </div>
            <button
              onClick={() => router.push('/upload')}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition font-medium text-sm"
            >
              New Analysis
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
            {error}
          </div>
        )}

        {/* Scans List */}
        {scans.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-md flex items-center justify-center mx-auto mb-4">
              <Activity className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Analyses Yet</h3>
            <p className="text-gray-600 mb-6 text-sm">Begin by uploading your first ECG for analysis</p>
            <button
              onClick={() => router.push('/upload')}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition font-medium text-sm"
            >
              Upload ECG
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {scans.map((scan) => (
              <div
                key={scan.id}
                className="bg-white rounded-lg border border-gray-200 p-6 hover:border-gray-300 transition"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-12 h-12 bg-blue-50 rounded-md flex items-center justify-center">
                      <FileText className="w-6 h-6 text-blue-600" />
                    </div>

                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 text-sm">
                        Analysis #{scan.id}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDate(scan.created_at)}
                      </p>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className={`px-4 py-2 rounded-md border font-medium text-sm ${getRiskColor(scan.risk_level)}`}>
                        {scan.risk_level.toUpperCase()}
                      </div>
                      <div className="text-sm text-gray-600">
                        {(scan.confidence_score * 100).toFixed(1)}% confidence
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => router.push(`/scans/${scan.id}`)}
                        className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-md transition font-medium text-sm"
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
                              link.setAttribute('download', `Report_${scan.id}.pdf`);
                              document.body.appendChild(link);
                              link.click();
                              link.remove();
                            } catch (err) {
                              alert('Unable to download report');
                            }
                          }}
                          className="px-4 py-2 text-green-600 hover:bg-green-50 rounded-md transition font-medium text-sm flex items-center gap-2"
                        >
                          <Download className="w-4 h-4" />
                          <span>Report</span>
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(scan.id)}
                        className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-md transition font-medium text-sm"
                      >
                        <Trash2 className="w-4 h-4" />
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
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-600 mb-1">Total Analyses</p>
              <p className="text-3xl font-semibold text-gray-900">{scans.length}</p>
            </div>
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-600 mb-1">Low Risk Findings</p>
              <p className="text-3xl font-semibold text-green-600">
                {scans.filter(s => s.risk_level === 'low').length}
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-600 mb-1">Reports Generated</p>
              <p className="text-3xl font-semibold text-blue-600">
                {scans.filter(s => s.report_generated).length}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}