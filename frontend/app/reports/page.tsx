'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { scansAPI } from '@/app/lib/api';

export default function ReportsPage() {
  const router = useRouter();
  const [scans, setScans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchScansWithReports();
  }, []);

  const fetchScansWithReports = async () => {
    try {
      const response = await scansAPI.getAll();
      // Filter only scans with reports
      const withReports = response.data.scans.filter((scan: any) => scan.report_generated);
      setScans(withReports);
      setLoading(false);
    } catch (err) {
      alert('Failed to load reports');
      setLoading(false);
    }
  };

  const handleDownload = async (scanId: number) => {
    try {
      const response = await scansAPI.downloadReport(scanId);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `CVD_Report_${scanId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Failed to download report');
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'text-green-600 bg-green-100';
      case 'moderate': return 'text-orange-600 bg-orange-100';
      case 'high': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading reports...</p>
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
              <h1 className="text-3xl font-bold text-gray-900">All Reports</h1>
              <p className="text-gray-600 mt-2">
                Download and manage your PDF reports
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Total Reports</p>
              <p className="text-3xl font-bold text-indigo-600">{scans.length}</p>
            </div>
          </div>
        </div>

        {/* Reports List */}
        {scans.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
            <div className="text-6xl mb-4">📄</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No reports yet</h3>
            <p className="text-gray-600 mb-6">
              Reports are generated after scan analysis. Upload a scan to get started.
            </p>
            <button
              onClick={() => router.push('/upload')}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium"
            >
              Upload ECG
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {scans.map((scan) => (
              <div
                key={scan.id}
                className="bg-white rounded-xl shadow-sm border p-6 hover:shadow-md transition"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center text-2xl">
                      📄
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        Report #CVD-{scan.id.toString().padStart(5, '0')}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {new Date(scan.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRiskColor(scan.risk_level)}`}>
                    {scan.risk_level.toUpperCase()}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Confidence</span>
                    <span className="font-medium">{(scan.confidence_score * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Risk Level</span>
                    <span className="font-medium capitalize">{scan.risk_level}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleDownload(scan.id)}
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium text-sm"
                  >
                    📥 Download PDF
                  </button>
                  <button
                    onClick={() => router.push(`/scans/${scan.id}`)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium text-sm"
                  >
                    View Scan
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}