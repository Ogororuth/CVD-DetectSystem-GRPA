'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { scansAPI } from '@/app/lib/api';
import { FileText, Download, ChevronLeft, Calendar, AlertCircle } from 'lucide-react';

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
      case 'low': return 'text-green-700 bg-green-50 border-green-200';
      case 'moderate': return 'text-orange-700 bg-orange-50 border-orange-200';
      case 'high': return 'text-red-700 bg-red-50 border-red-200';
      default: return 'text-gray-700 bg-gray-50 border-gray-200';
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
            className="text-blue-600 hover:text-blue-700 flex items-center gap-2 mb-4 text-sm font-medium"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Clinical Reports</h1>
              <p className="text-gray-600 mt-1 text-sm">
                Download and manage your ECG analysis reports
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Total Reports</p>
              <p className="text-3xl font-semibold text-blue-600">{scans.length}</p>
            </div>
          </div>
        </div>

        {/* Reports List */}
        {scans.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Reports Available</h3>
            <p className="text-gray-600 mb-6 text-sm">
              Reports are generated after scan analysis. Upload an ECG scan to generate your first report.
            </p>
            <button
              onClick={() => router.push('/upload')}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium text-sm"
            >
              Upload ECG Scan
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {scans.map((scan) => (
              <div
                key={scan.id}
                className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center border border-blue-100">
                      <FileText className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 text-sm">
                        Report #{scan.id.toString().padStart(5, '0')}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Calendar className="w-3 h-3 text-gray-400" />
                        <p className="text-xs text-gray-500">
                          {new Date(scan.created_at).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-md text-xs font-medium border ${getRiskColor(scan.risk_level)}`}>
                    {scan.risk_level.toUpperCase()}
                  </span>
                </div>

                <div className="space-y-2 mb-4 pb-4 border-b border-gray-100">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Confidence Score</span>
                    <span className="font-medium text-gray-900">{(scan.confidence_score * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Risk Assessment</span>
                    <span className="font-medium capitalize text-gray-900">{scan.risk_level}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleDownload(scan.id)}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium text-sm flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download PDF
                  </button>
                  <button
                    onClick={() => router.push(`/scans/${scan.id}`)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium text-sm"
                  >
                    View Details
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