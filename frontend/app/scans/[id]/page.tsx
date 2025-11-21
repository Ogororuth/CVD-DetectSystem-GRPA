'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { scansAPI } from '@/app/lib/api';
import { ChevronLeft, Download, FileText, AlertTriangle, Info } from 'lucide-react';

export default function ScanDetailPage() {
  const router = useRouter();
  const params = useParams();
  const scanId = params.id as string;
  
  const [scan, setScan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [attentionError, setAttentionError] = useState(false);

  useEffect(() => {
    fetchScanDetail();
  }, [scanId]);

  const fetchScanDetail = async () => {
    try {
      const response = await scansAPI.getDetail(Number(scanId));
      setScan(response.data);
      setLoading(false);
    } catch (err) {
      alert('Unable to load analysis details');
      router.push('/scans');
    }
  };

  const handleGenerateReport = async () => {
    setGenerating(true);
    try {
      await scansAPI.generateReport(Number(scanId));
      alert('Report generated successfully');
      fetchScanDetail();
    } catch (err) {
      alert('Unable to generate report');
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
      link.setAttribute('download', `ECG_Report_${scanId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Unable to download report');
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

  const getAttentionColor = (level: string) => {
    switch (level) {
      case 'high': return 'border-red-300 bg-red-50 text-red-800';
      case 'medium': return 'border-yellow-300 bg-yellow-50 text-yellow-800';
      case 'low': return 'border-green-300 bg-green-50 text-green-800';
      default: return 'border-gray-300 bg-gray-50 text-gray-800';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence < 0.6) return 'bg-red-50 border-red-200 text-red-800';
    if (confidence < 0.8) return 'bg-yellow-50 border-yellow-200 text-yellow-800';
    return 'bg-green-50 border-green-200 text-green-800';
  };

  const getConfidenceText = (confidence: number) => {
    if (confidence < 0.6) return 'Low Confidence';
    if (confidence < 0.8) return 'Moderate Confidence';
    return 'High Confidence';
  };

  const getImageUrl = (path: string) => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://127.0.0.1:8000';
    return `${baseUrl}/media/${path}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading analysis details</p>
        </div>
      </div>
    );
  }

  const predictionResult = scan.prediction_result || {};
  const leadAnalysis = predictionResult.lead_analysis || {};
  const interpretation = predictionResult.interpretation || {};

  const leadStats = {
    high: Object.values(leadAnalysis).filter((a: any) => a.attention_level === 'high').length,
    medium: Object.values(leadAnalysis).filter((a: any) => a.attention_level === 'medium').length,
    low: Object.values(leadAnalysis).filter((a: any) => a.attention_level === 'low').length
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        
        <div className="mb-6">
          <button
            onClick={() => router.push('/scans')}
            className="text-blue-600 hover:text-blue-700 flex items-center gap-2 mb-4 font-medium"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Analyses
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">ECG Analysis Report</h1>
              <p className="text-gray-600 mt-1">
                Analysis ID: #{scanId} • {new Date(scan.created_at).toLocaleString()}
              </p>
            </div>
            <div className="flex gap-3">
              {!scan.report_generated ? (
                <button
                  onClick={handleGenerateReport}
                  disabled={generating}
                  className="px-5 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition font-medium disabled:opacity-50 flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  {generating ? 'Generating...' : 'Generate PDF Report'}
                </button>
              ) : (
                <button
                  onClick={handleDownloadReport}
                  className="px-5 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition font-medium flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download Report
                </button>
              )}
            </div>
          </div>
        </div>

        <div className={`p-5 rounded-lg border-2 mb-6 ${getRiskColor(scan.risk_level)}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-1">Diagnosis</p>
              <h2 className="text-xl font-semibold">{interpretation.title || scan.prediction_result?.diagnosis}</h2>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold uppercase tracking-wider mb-1">Confidence</p>
              <p className="text-xl font-semibold">{(scan.confidence_score * 100).toFixed(1)}%</p>
            </div>
          </div>
        </div>

        <div className={`border rounded-lg p-4 mb-6 ${getConfidenceColor(scan.confidence_score)}`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Confidence Level: {getConfidenceText(scan.confidence_score)}</h3>
            <span className="font-medium">{(scan.confidence_score * 100).toFixed(1)}%</span>
          </div>
          
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className={`p-3 rounded ${leadStats.high > 0 ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-600'}`}>
              <div className="text-lg font-bold">{leadStats.high}</div>
              <div className="text-sm">High Attention Leads</div>
            </div>
            <div className={`p-3 rounded ${leadStats.medium > 0 ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-600'}`}>
              <div className="text-lg font-bold">{leadStats.medium}</div>
              <div className="text-sm">Medium Attention</div>
            </div>
            <div className={`p-3 rounded ${leadStats.low > 0 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
              <div className="text-lg font-bold">{leadStats.low}</div>
              <div className="text-sm">Low Attention</div>
            </div>
          </div>
        </div>

        {leadAnalysis && Object.keys(leadAnalysis).length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Lead-Level Attention Analysis</h3>
            <p className="text-sm text-gray-600 mb-4">
              Attention scores indicate which ECG leads the model focused on during classification. 
              Higher attention suggests greater relevance to the diagnosis.
            </p>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Object.entries(leadAnalysis).map(([leadName, analysis]: [string, any]) => (
                <div 
                  key={leadName} 
                  className={`border-2 rounded-lg p-3 ${getAttentionColor(analysis.attention_level)}`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-lg">{leadName}</span>
                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-white">
                      {(analysis.attention_score * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="text-xs mb-1">
                    <span className="font-medium">Attention:</span> {analysis.attention_level}
                  </div>
                  <div className="text-xs">
                    <span className="font-medium">Finding:</span> {analysis.primary_finding}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          
          <div className="lg:col-span-2 space-y-6">
            
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Original ECG Image</h3>
              {scan.image_path ? (
                <div className="relative">
                  {!imageError ? (
                    <img
                      src={getImageUrl(scan.image_path)}
                      alt="ECG Scan"
                      className="w-full h-auto rounded-md border border-gray-200"
                      onError={() => setImageError(true)}
                    />
                  ) : (
                    <div className="w-full h-64 bg-gray-100 rounded-md flex items-center justify-center">
                      <div className="text-center">
                        <Info className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600">ECG image unavailable</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-full h-64 bg-gray-100 rounded-md flex items-center justify-center">
                  <p className="text-sm text-gray-600">No image available</p>
                </div>
              )}
            </div>

            {scan.attention_map_path && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Attention Map Analysis</h3>
                    <p className="text-sm text-gray-600 mt-1">Visual representation of model focus regions</p>
                  </div>
                  <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-md border border-blue-100">
                    Interpretability
                  </span>
                </div>
                {!attentionError ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-medium text-gray-700 mb-2">Heatmap</p>
                      <img
                        src={getImageUrl(scan.attention_map_path)}
                        alt="Attention Heatmap"
                        className="w-full h-auto rounded-md border border-gray-200"
                        onError={() => setAttentionError(true)}
                      />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-700 mb-2">Overlay</p>
                      <div className="relative">
                        <img
                          src={getImageUrl(scan.image_path)}
                          alt="ECG Base"
                          className="w-full h-auto rounded-md border border-gray-200"
                        />
                        <img
                          src={getImageUrl(scan.attention_map_path)}
                          alt="Attention Overlay"
                          className="absolute inset-0 w-full h-full rounded-md opacity-60"
                          style={{ mixBlendMode: 'multiply' }}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-48 bg-gray-100 rounded-md flex items-center justify-center">
                    <p className="text-sm text-gray-600">Attention map not available</p>
                  </div>
                )}
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-xs text-blue-800">
                    <strong>Interpretation:</strong> Highlighted regions indicate areas where the Vision Transformer model 
                    focused during analysis. Warmer colors (red/yellow) represent higher attention weights, showing 
                    diagnostically significant features identified by the model.
                  </p>
                </div>
              </div>
            )}

          </div>

          <div className="space-y-6">
            
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Clinical Interpretation</h3>
              
              <div className="space-y-4">
                {interpretation.findings && interpretation.findings.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Findings</p>
                    <ul className="space-y-1">
                      {interpretation.findings.map((finding: string, index: number) => (
                        <li key={index} className="text-sm text-gray-700 flex items-start gap-2">
                          <span className="text-gray-400 mt-1">•</span>
                          <span>{finding}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {interpretation.recommendation && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Recommendation</p>
                    <p className="text-sm text-gray-700">
                      {interpretation.recommendation}
                    </p>
                  </div>
                )}

                {interpretation.lead_insights && interpretation.lead_insights.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Model Insights</p>
                    <ul className="space-y-1">
                      {interpretation.lead_insights.map((insight: string, index: number) => (
                        <li key={index} className="text-sm text-gray-700 flex items-start gap-2">
                          <span className="text-gray-400 mt-1">•</span>
                          <span>{insight}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {interpretation.key_findings && interpretation.key_findings.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Key Findings</p>
                    <ul className="space-y-1">
                      {interpretation.key_findings.map((finding: string, index: number) => (
                        <li key={index} className="text-sm text-gray-700 flex items-start gap-2">
                          <span className="text-gray-400 mt-1">•</span>
                          <span>{finding}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {predictionResult.probabilities && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Class Probabilities</p>
                    <div className="space-y-2">
                      {Object.entries(predictionResult.probabilities)
                        .sort(([, a]: any, [, b]: any) => b - a)
                        .map(([className, prob]: [string, any], index) => (
                          <div key={className}>
                            <div className="flex justify-between text-xs mb-1">
                              <span className={`font-medium ${index === 0 ? 'text-gray-900' : 'text-gray-600'}`}>
                                {className.replace('_', ' ')}
                              </span>
                              <span className={`${index === 0 ? 'text-gray-900 font-semibold' : 'text-gray-600'}`}>
                                {(prob * 100).toFixed(1)}%
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-2 rounded-full transition-all ${
                                  index === 0 ? 'bg-blue-600' : 'bg-gray-400'
                                }`}
                                style={{ width: `${Math.max(prob * 100, 2)}%` }}
                              />
                            </div>
                          </div>
                        ))
                      }
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Analysis Information</h3>
              
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Analysis ID</span>
                  <span className="text-sm font-medium text-gray-900">#{scan.id}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Processing Time</span>
                  <span className="text-sm font-medium text-gray-900">{scan.processing_time.toFixed(2)}s</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Date</span>
                  <span className="text-sm font-medium text-gray-900">
                    {new Date(scan.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Time</span>
                  <span className="text-sm font-medium text-gray-900">
                    {new Date(scan.created_at).toLocaleTimeString()}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Report Status</span>
                  <span className="text-sm font-medium text-gray-900">
                    {scan.report_generated ? 'Generated' : 'Pending'}
                  </span>
                </div>
                {predictionResult.metadata?.model_version && (
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Model Version</span>
                    <span className="text-sm font-medium text-gray-900">{predictionResult.metadata.model_version}</span>
                  </div>
                )}
              </div>

              {scan.notes && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Clinical Notes</p>
                  <p className="text-sm text-gray-700 p-3 bg-gray-50 rounded-md border border-gray-100">
                    {scan.notes}
                  </p>
                </div>
              )}
            </div>

          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-5 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-700 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-yellow-900 mb-1">Medical Disclaimer</h4>
            <p className="text-sm text-yellow-800">
              This AI-powered analysis is for research and educational purposes only. It does not constitute medical advice, 
              diagnosis, or treatment. All clinical decisions should be made by qualified healthcare professionals based on 
              comprehensive patient evaluation. Always consult with a licensed physician for medical diagnosis and treatment.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}