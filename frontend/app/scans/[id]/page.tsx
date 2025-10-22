'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { scansAPI } from '@/app/lib/api';

export default function ScanDetailPage() {
  const router = useRouter();
  const params = useParams();
  const scanId = params.id as string;
  
  const [scan, setScan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchScanDetail();
  }, [scanId]);

  const fetchScanDetail = async () => {
    try {
      const response = await scansAPI.getDetail(Number(scanId));
      setScan(response.data);
      setLoading(false);
    } catch (err) {
      alert('Failed to load scan details');
      router.push('/scans');
    }
  };

  const handleGenerateReport = async () => {
    setGenerating(true);
    try {
      await scansAPI.generateReport(Number(scanId));
      alert('Report generated successfully!');
      fetchScanDetail(); // Refresh to show report button
    } catch (err) {
      alert('Failed to generate report');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadReport = async () => {
    try {
      const response = await scansAPI.downloadReport(Number(scanId));
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
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      case 'moderate': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading scan details...</p>
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
            onClick={() => router.push('/scans')}
            className="text-indigo-600 hover:text-indigo-700 flex items-center gap-2 mb-4"
          >
            ← Back to Scans
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Scan #{scanId}</h1>
              <p className="text-gray-600 mt-2">
                {new Date(scan.created_at).toLocaleString()}
              </p>
            </div>
            <div className="flex gap-3">
              {!scan.report_generated ? (
                <button
                  onClick={handleGenerateReport}
                  disabled={generating}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium disabled:opacity-50"
                >
                  {generating ? 'Generating...' : '📄 Generate Report'}
                </button>
              ) : (
                <button
                  onClick={handleDownloadReport}
                  className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium"
                >
                  📥 Download Report
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Risk Assessment Card */}
        <div className={`p-8 rounded-xl border-2 mb-8 ${getRiskColor(scan.risk_level)}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium uppercase mb-2">Risk Assessment</p>
              <h2 className="text-4xl font-bold">{scan.risk_level.toUpperCase()} RISK</h2>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium mb-2">Model Confidence</p>
              <p className="text-3xl font-bold">{(scan.confidence_score * 100).toFixed(1)}%</p>
            </div>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Analysis Results */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Analysis Results</h3>
            
            {scan.prediction_result?.regions && (
              <div className="space-y-3">
                <p className="font-medium text-gray-700">Regions of Interest:</p>
                {scan.prediction_result.regions.map((region: any) => (
                  <div key={region.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Region {region.id}</span>
                      <span className="text-sm text-gray-600">
                        Attention: {(region.attention * 100).toFixed(1)}%
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{region.description}</p>
                  </div>
                ))}
              </div>
            )}

            {scan.prediction_result?.note && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">{scan.prediction_result.note}</p>
              </div>
            )}
          </div>

          {/* Scan Information */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Scan Information</h3>
            
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Scan ID</span>
                <span className="font-medium">#{scan.id}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Processing Time</span>
                <span className="font-medium">{scan.processing_time}s</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Date</span>
                <span className="font-medium">
                  {new Date(scan.created_at).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Report Status</span>
                <span className="font-medium">
                  {scan.report_generated ? '✅ Generated' : '⏳ Not Generated'}
                </span>
              </div>
            </div>

            {scan.notes && (
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Notes:</p>
                <p className="text-sm text-gray-600 p-3 bg-gray-50 rounded-lg">
                  {scan.notes}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Disclaimer */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
          <h3 className="font-bold text-yellow-900 mb-2">⚠️ Important Disclaimer</h3>
          <p className="text-sm text-yellow-800">
            This analysis is for research and educational purposes only. It is NOT a medical diagnosis. 
            Always consult qualified healthcare professionals for medical advice and decisions.
          </p>
        </div>
      </div>
    </div>
  );
}