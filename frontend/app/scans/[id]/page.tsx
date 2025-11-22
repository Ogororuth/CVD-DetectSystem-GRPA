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
  const [imageError, setImageError] = useState(false);
  const [gridError, setGridError] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => { fetchScanDetail(); }, [scanId]);
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const fetchScanDetail = async () => {
    try {
      const response = await scansAPI.getDetail(Number(scanId));
      setScan(response.data);
      setLoading(false);
    } catch (err) {
      setNotification({ type: 'error', message: 'Unable to load analysis details' });
      setTimeout(() => router.push('/scans'), 2000);
    }
  };

  const handleGenerateReport = async () => {
    setGenerating(true);
    try {
      await scansAPI.generateReport(Number(scanId));
      setNotification({ type: 'success', message: 'PDF report generated' });
      fetchScanDetail();
    } catch (err) {
      setNotification({ type: 'error', message: 'Unable to generate report' });
    } finally { setGenerating(false); }
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
      setNotification({ type: 'error', message: 'Unable to download report' });
    }
  };

  const getImageUrl = (path: string) => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://127.0.0.1:8000';
    return `${baseUrl}/media/${path}`;
  };

  const formatDiagnosis = (d: string) => {
    if (d === 'MI_Patient') return 'Myocardial Infarction (Active)';
    if (d === 'MI_History') return 'Myocardial Infarction (Historical)';
    if (d === 'Normal') return 'Normal Sinus Rhythm';
    return d?.replace('_', ' ') || 'Unknown';
  };

  const getStars = (count: number) => '★'.repeat(count) + '☆'.repeat(3 - count);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600 text-sm">Loading analysis</p>
        </div>
      </div>
    );
  }

  const pr = scan?.prediction_result || {};
  const leadAnalysis = pr.lead_analysis || {};
  const interp = pr.interpretability || {};
  const interpretation = pr.interpretation || {};
  const probs = pr.probabilities || {};

  const sortedLeads = Object.entries(leadAnalysis)
    .sort(([,a]: any, [,b]: any) => b.attention_score - a.attention_score);

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4 sm:px-6 lg:px-8">
      {notification && (
        <div className="fixed top-4 right-4 z-50 px-4 py-3 rounded border bg-white border-gray-300 text-sm text-gray-800">
          {notification.message}
          <button onClick={() => setNotification(null)} className="ml-3 text-gray-400">×</button>
        </div>
      )}

      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button onClick={() => router.push('/scans')} className="text-gray-600 hover:text-gray-900 text-sm mb-4">
            ← Back to analyses
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-medium text-gray-900">Analysis #{scanId}</h1>
              <p className="text-sm text-gray-500">{new Date(scan.created_at).toLocaleString()}</p>
            </div>
            {!scan.report_generated ? (
              <button onClick={handleGenerateReport} disabled={generating}
                className="px-4 py-2 bg-gray-900 text-white text-sm rounded hover:bg-gray-800 disabled:opacity-50">
                {generating ? 'Generating...' : 'Generate PDF'}
              </button>
            ) : (
              <button onClick={handleDownloadReport}
                className="px-4 py-2 bg-gray-900 text-white text-sm rounded hover:bg-gray-800">
                Download PDF
              </button>
            )}
          </div>
        </div>

        {/* Overview Card */}
        <div className="bg-white border border-gray-200 rounded p-5 mb-6">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-3 font-semibold">Interpretability Analysis</p>
          
          <div className="grid grid-cols-3 gap-6 mb-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">Diagnosis</p>
              <p className="text-base font-semibold text-gray-900">{formatDiagnosis(pr.diagnosis)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Confidence</p>
              <p className="text-base font-semibold text-gray-900">{(scan.confidence_score * 100).toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Risk Level</p>
              <p className={`text-base font-semibold ${
                scan.risk_level === 'high' ? 'text-red-700' : 
                scan.risk_level === 'moderate' ? 'text-amber-700' : 'text-gray-900'
              }`}>{scan.risk_level?.charAt(0).toUpperCase() + scan.risk_level?.slice(1)}</p>
            </div>
          </div>

          {/* Consensus */}
          <div className="border-t border-gray-100 pt-4">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-sm font-semibold text-gray-800">Method Consensus:</span>
              <span className={`px-2 py-0.5 text-xs font-semibold rounded ${
                interp.consensus_level === 'HIGH' ? 'bg-green-100 text-green-800' :
                interp.consensus_level === 'MODERATE' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-700'
              }`}>{interp.consensus_level || 'N/A'}</span>
              <span className="text-sm text-gray-600">({interp.consensus_score || 0}%)</span>
            </div>
            {interp.common_leads && interp.common_leads.length > 0 && (
              <p className="text-sm text-gray-600">
                All 3 methods agree on critical leads: <span className="font-semibold">{interp.common_leads.join(', ')}</span>
              </p>
            )}
          </div>
        </div>

        {/* Images - 2 columns */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="bg-white border border-gray-200 rounded p-5">
            <p className="text-sm font-semibold text-gray-900 mb-3">Original ECG</p>
            {scan.image_path && !imageError ? (
              <img src={getImageUrl(scan.image_path)} alt="ECG" className="w-full rounded border border-gray-100"
                onError={() => setImageError(true)} />
            ) : (
              <div className="w-full h-48 bg-gray-50 rounded flex items-center justify-center text-sm text-gray-500">
                Image unavailable
              </div>
            )}
          </div>
          <div className="bg-white border border-gray-200 rounded p-5">
            <p className="text-sm font-semibold text-gray-900 mb-3">Lead Analysis Map</p>
            {(pr.lead_grid_path || scan.attention_map_path) && !gridError ? (
              <img 
                src={getImageUrl(pr.lead_grid_path || scan.attention_map_path)} 
                alt="Lead Grid" 
                className="w-full rounded border border-gray-100"
                onError={() => setGridError(true)} 
              />
            ) : (
              <div className="w-full h-48 bg-gray-50 rounded flex items-center justify-center text-sm text-gray-500">
                Lead grid unavailable
              </div>
            )}
            <div className="mt-3 flex gap-4 text-xs text-gray-500">
              <span><span className="inline-block w-3 h-3 bg-red-500 rounded mr-1"></span>Critical</span>
              <span><span className="inline-block w-3 h-3 bg-amber-500 rounded mr-1"></span>Important</span>
              <span><span className="inline-block w-3 h-3 bg-gray-300 rounded mr-1"></span>Minor</span>
            </div>
          </div>
        </div>

        {/* 3-Method Comparison Table */}
        <div className="bg-white border border-gray-200 rounded p-5 mb-6">
          <p className="text-sm font-semibold text-gray-900 mb-4">Three-Method Interpretability Analysis</p>
          <p className="text-xs text-gray-500 mb-4">Independent analysis using three complementary methods.</p>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-2 text-xs text-gray-500 uppercase font-semibold">Lead</th>
                  <th className="text-left py-2 px-2 text-xs text-gray-500 uppercase font-semibold">Attention Rollout</th>
                  <th className="text-left py-2 px-2 text-xs text-gray-500 uppercase font-semibold">Integrated Gradients</th>
                  <th className="text-left py-2 px-2 text-xs text-gray-500 uppercase font-semibold">Ablation Impact</th>
                  <th className="text-left py-2 px-2 text-xs text-gray-500 uppercase font-semibold">Consensus</th>
                  <th className="text-left py-2 px-2 text-xs text-gray-500 uppercase font-semibold">Territory</th>
                </tr>
              </thead>
              <tbody>
                {sortedLeads.map(([lead, data]: [string, any]) => (
                  <tr key={lead} className={`border-b border-gray-50 ${
                    data.consensus_level === 'critical' ? 'bg-slate-100' :
                    data.consensus_level === 'important' ? 'bg-slate-50' : ''
                  }`}>
                    <td className="py-2 px-2 font-semibold text-gray-900">{lead}</td>
                    <td className="py-2 px-2">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-200 h-2 rounded">
                          <div className="h-2 bg-blue-600 rounded" style={{width: `${data.attention_score}%`}} />
                        </div>
                        <span className="text-xs text-gray-600">{data.attention_score}%</span>
                      </div>
                    </td>
                    <td className="py-2 px-2">
                      <span className="text-emerald-700 text-xs font-medium">+{data.gradient_score}%</span>
                    </td>
                    <td className="py-2 px-2">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-200 h-2 rounded">
                          <div className="h-2 bg-slate-500 rounded" style={{width: `${Math.min(Math.abs(data.ablation_impact) * 2, 100)}%`}} />
                        </div>
                        <span className="text-slate-700 text-xs font-medium">
                          {data.ablation_impact >= 0 ? '-' : '+'}{Math.abs(data.ablation_impact)}%
                        </span>
                      </div>
                    </td>
                    <td className="py-2 px-2">
                      <span className={`text-xs ${
                        data.consensus_level === 'critical' ? 'text-slate-700' :
                        data.consensus_level === 'important' ? 'text-slate-600' : 'text-gray-400'
                      }`}>{getStars(data.consensus_stars)}</span>
                    </td>
                    <td className="py-2 px-2 text-xs text-gray-600 capitalize">{data.territory}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-3 gap-4 text-xs">
            <div>
              <p className="font-semibold text-gray-700 mb-1">Attention Rollout</p>
              <p className="text-gray-500">Where the model focused across all 12 transformer layers</p>
            </div>
            <div>
              <p className="font-semibold text-gray-700 mb-1">Integrated Gradients</p>
              <p className="text-gray-500">Pixel-level contribution to the prediction score</p>
            </div>
            <div>
              <p className="font-semibold text-gray-700 mb-1">Ablation Impact</p>
              <p className="text-gray-500">Confidence drop when lead is masked out</p>
            </div>
          </div>
        </div>

        {/* Ablation Bar Chart */}
        <div className="bg-white border border-gray-200 rounded p-5 mb-6">
          <p className="text-sm font-semibold text-gray-900 mb-2">Ablation Impact</p>
          <p className="text-xs text-gray-500 mb-4">Confidence drop when each lead is removed</p>
          
          <div className="space-y-2">
            {sortedLeads
              .sort(([,a]: any, [,b]: any) => Math.abs(b.ablation_impact) - Math.abs(a.ablation_impact))
              .slice(0, 6)
              .map(([lead, data]: [string, any]) => (
                <div key={lead} className="flex items-center gap-3">
                  <span className="w-8 text-sm font-medium text-gray-700">{lead}</span>
                  <div className="flex-1 bg-gray-100 h-5 rounded relative">
                    <div 
                      className="h-5 bg-slate-600 rounded flex items-center justify-end pr-2"
                      style={{width: `${Math.min(Math.abs(data.ablation_impact) * 3, 100)}%`}}
                    >
                      {Math.abs(data.ablation_impact) > 10 && (
                        <span className="text-xs text-white font-medium">
                          {data.ablation_impact >= 0 ? '-' : '+'}{Math.abs(data.ablation_impact)}%
                        </span>
                      )}
                    </div>
                    {Math.abs(data.ablation_impact) <= 10 && (
                      <span className="absolute left-2 top-0.5 text-xs text-gray-600">
                        {data.ablation_impact >= 0 ? '-' : '+'}{Math.abs(data.ablation_impact)}%
                      </span>
                    )}
                  </div>
                </div>
              ))}
          </div>
          <p className="text-xs text-gray-500 mt-3">Higher values indicate leads more critical to the diagnosis</p>
        </div>

        {/* Clinical Interpretation */}
        {interpretation.summary && (
          <div className="bg-white border border-gray-200 rounded p-5 mb-6">
            <p className="text-sm font-semibold text-gray-900 mb-3">Clinical Interpretation</p>
            <div className="space-y-3 text-sm text-gray-700">
              <p>{interpretation.summary}</p>
              {interpretation.method_agreement && (
                <p className="text-gray-600">{interpretation.method_agreement}</p>
              )}
              {interpretation.clinical_correlation && (
                <div>
                  <p className="font-semibold text-gray-800 text-xs uppercase mb-1">Clinical Correlation</p>
                  <p className="text-gray-600">{interpretation.clinical_correlation}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Key Findings */}
        {interpretation.key_findings && interpretation.key_findings.length > 0 && (
          <div className="bg-white border border-gray-200 rounded p-5 mb-6">
            <p className="text-sm font-semibold text-gray-900 mb-3">Key Findings</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 text-xs text-gray-500 uppercase font-semibold">Lead</th>
                    <th className="text-left py-2 text-xs text-gray-500 uppercase font-semibold">Attention</th>
                    <th className="text-left py-2 text-xs text-gray-500 uppercase font-semibold">Gradient</th>
                    <th className="text-left py-2 text-xs text-gray-500 uppercase font-semibold">Ablation</th>
                    <th className="text-left py-2 text-xs text-gray-500 uppercase font-semibold">Territory</th>
                  </tr>
                </thead>
                <tbody>
                  {interpretation.key_findings.map((f: any, i: number) => (
                    <tr key={i} className="border-b border-gray-50">
                      <td className="py-2 font-semibold text-gray-900">{f.lead}</td>
                      <td className="py-2 text-gray-700">{f.attention}</td>
                      <td className="py-2 text-emerald-700">{f.gradient}</td>
                      <td className="py-2 text-slate-600">{f.ablation}</td>
                      <td className="py-2 text-gray-600 capitalize">{f.territory}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Class Probabilities */}
        <div className="bg-white border border-gray-200 rounded p-5 mb-6">
          <p className="text-sm font-semibold text-gray-900 mb-3">Class Probabilities</p>
          <div className="space-y-3">
            {Object.entries(probs)
              .sort(([,a]: any, [,b]: any) => b - a)
              .map(([cls, prob]: [string, any]) => (
                <div key={cls}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700">{formatDiagnosis(cls)}</span>
                    <span className="font-medium">{(prob * 100).toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-100 h-2 rounded">
                    <div className="h-2 bg-gray-700 rounded" style={{width: `${prob * 100}%`}} />
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Recommendation */}
        {interpretation.recommendation && (
          <div className={`border rounded p-5 mb-6 ${
            scan.risk_level === 'high' ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'
          }`}>
            <p className="text-sm font-semibold text-gray-900 mb-2">Recommendation</p>
            <p className="text-sm text-gray-700">{interpretation.recommendation}</p>
          </div>
        )}

        {/* Analysis Details */}
        <div className="bg-white border border-gray-200 rounded p-5 mb-6">
          <p className="text-sm font-semibold text-gray-900 mb-3">Analysis Details</p>
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-xs text-gray-500">Processing Time</p>
              <p className="text-gray-900">{scan.processing_time?.toFixed(2)}s</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Model</p>
              <p className="text-gray-900">{pr.metadata?.model || 'ViT-ECG'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Methods</p>
              <p className="text-gray-900">3 (AR, IG, Ablation)</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Report</p>
              <p className="text-gray-900">{scan.report_generated ? 'Generated' : 'Pending'}</p>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="border border-gray-300 rounded p-4 text-sm text-gray-600">
          <p className="font-semibold text-gray-700 mb-1">Disclaimer</p>
          <p>This analysis is for research and educational purposes only. Clinical decisions should be made by qualified healthcare professionals.</p>
        </div>
      </div>
    </div>
  );
}