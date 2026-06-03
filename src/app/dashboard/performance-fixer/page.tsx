'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { exportPerformanceFixerCSV, exportPerformanceFixerPDF } from '@/lib/export';

interface Metrics {
  lcp: number; lcpScore: number;
  cls: number; clsScore: number;
  fid: number | null; fidScore: number | null;
  inp: number | null; inpScore: number | null;
  fcp: number | null; fcpScore: number | null;
  speedIndex: number | null; speedIndexScore: number | null;
  tti: number | null; ttiScore: number | null;
  tbt: number | null; tbtScore: number | null;
  ttfb: number | null; ttfbScore: number | null;
  redirects: number | null; redirectsScore: number | null;
  unusedJs: number | null; unusedJsScore: number | null;
  unusedCss: number | null; unusedCssScore: number | null;
  renderBlockingScore: number | null;
  legacyJsScore: number | null;
  jsBootupTime: number | null; jsBootupScore: number | null;
  totalByteWeight: number | null;
  domSize: number | null;
  mainthreadWork: number | null;
  networkRtt: number | null;
  overallScore: number;
}

interface Fix {
  type: string;
  issue: string;
  beforeCode: string;
  afterCode: string;
  description: string;
  estimatedImpact: number;
  language: string;
}

interface ROI {
  currentRevenueLoss: number;
  potentialRevenue: number;
  fixTime: number;
  estimatedCost: number;
}

interface IndustryData {
  avg: number;
  topPercent: number;
  rank: number;
}

interface AuditResult {
  url: string;
  metrics: Metrics;
  projectedScore: number;
  fixes: Fix[];
  roi: ROI | null;
  industryData: IndustryData | null;
  auditId: string;
}

function scoreColor(score: number | null) {
  if (score == null) return 'text-slate-400';
  if (score >= 90) return 'text-green-600';
  if (score >= 50) return 'text-yellow-500';
  return 'text-red-500';
}

function scoreBg(score: number | null) {
  if (score == null) return 'bg-slate-100 border-slate-200';
  if (score >= 90) return 'bg-green-50 border-green-200';
  if (score >= 50) return 'bg-yellow-50 border-yellow-200';
  return 'bg-red-50 border-red-200';
}

// opportunity = pass/fail audit (no numeric score shown)
function MetricCard({ label, value, score, unit = '', opportunity = false }: {
  label: string; value: string | number | null; score: number | null; unit?: string; opportunity?: boolean;
}) {
  const statusLabel = opportunity && score != null
    ? score >= 90 ? 'Pass' : score >= 50 ? 'Needs Work' : 'Flagged'
    : null;

  return (
    <div className={`border rounded-lg p-3 text-center ${scoreBg(score)}`}>
      <div className={`text-lg font-black ${scoreColor(score)}`}>
        {value != null ? `${value}${unit}` : 'N/A'}
      </div>
      <div className="text-[11px] text-slate-500 mt-0.5">{label}</div>
      {opportunity
        ? statusLabel && <div className={`text-[10px] font-bold mt-0.5 ${scoreColor(score)}`}>{statusLabel}</div>
        : score != null && <div className={`text-[10px] font-bold mt-0.5 ${scoreColor(score)}`}>{score}/100</div>
      }
    </div>
  );
}

export default function PerformanceFixerPage() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [industry, setIndustry] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingFixes, setLoadingFixes] = useState(false);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [userPlan, setUserPlan] = useState<string>('FREE');
  const [checkingPlan, setCheckingPlan] = useState(true);

  useEffect(() => {
    fetch('/api/user')
      .then(r => r.json())
      .then(data => { setUserPlan(data.plan ?? 'FREE'); setCheckingPlan(false); })
      .catch(() => setCheckingPlan(false));
  }, []);

  const handleAnalyze = async () => {
    if (!url) return;
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      // Step 1: fetch PSI metrics (~10-15s)
      const res1 = await fetch('/api/tools/performance-fixer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, industry }),
      });
      const data1 = await res1.json();
      if (!res1.ok) { setError(data1.error ?? 'Analysis failed'); return; }

      setResult({ ...data1, fixes: [], roi: null, projectedScore: data1.metrics.overallScore });
      setLoading(false);
      setLoadingFixes(true);

      // Step 2: generate AI fixes (~15-20s)
      const res2 = await fetch('/api/tools/performance-fixer/fixes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auditId: data1.auditId }),
      });
      const data2 = await res2.json();
      if (res2.ok) {
        setResult(prev => prev ? { ...prev, fixes: data2.fixes, roi: data2.roi, projectedScore: data2.projectedScore } : prev);
      }
    } catch (err) {
      setError(`Request failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
      setLoadingFixes(false);
    }
  };

  if (checkingPlan) return <div className="flex items-center justify-center h-full text-slate-400">Loading...</div>;

  if (userPlan !== 'AGENCY') {
    return (
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-gradient-to-br from-amber-50 to-purple-50 border border-amber-200 p-12 rounded-2xl text-center">
            <div className="text-5xl mb-4">🔒</div>
            <h1 className="text-2xl font-black mb-2">Agency-Exclusive Tool</h1>
            <p className="text-slate-600 mb-6">AI Performance Fixer is available exclusively on the Agency plan ($49/mo).</p>
            <div className="bg-white rounded-xl p-6 mb-6 text-left border border-amber-100">
              <h2 className="font-bold text-sm mb-3 text-slate-700">What you unlock:</h2>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="flex items-center gap-2"><span className="text-emerald-500 font-bold">✓</span> All PageSpeed Insights metrics (20+)</li>
                <li className="flex items-center gap-2"><span className="text-emerald-500 font-bold">✓</span> AI-Generated Code Fixes (Claude AI)</li>
                <li className="flex items-center gap-2"><span className="text-emerald-500 font-bold">✓</span> ROI Calculator — revenue impact analysis</li>
                <li className="flex items-center gap-2"><span className="text-emerald-500 font-bold">✓</span> Industry Benchmarks</li>
                <li className="flex items-center gap-2"><span className="text-emerald-500 font-bold">✓</span> 50 audits / month</li>
              </ul>
            </div>
            <div className="flex gap-3 justify-center">
              <button onClick={() => router.push('/pricing')} className="bg-amber-500 hover:bg-amber-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-colors">
                Upgrade to Agency — $49/mo
              </button>
              <button onClick={() => router.push('/dashboard')} className="border border-slate-200 hover:bg-slate-50 px-6 py-2.5 rounded-xl text-sm font-semibold transition-colors">
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2">
            ⚡ AI Performance Fixer
            <span className="text-[10px] bg-amber-500 text-white px-2 py-0.5 rounded font-bold">AGENCY</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">Full PageSpeed Insights audit with AI-generated code fixes and ROI projections.</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-600 mb-1.5 block">Website URL</label>
            <input
              type="url"
              placeholder="https://example.com"
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAnalyze()}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-600 mb-1.5 block">Industry <span className="font-normal text-slate-400">(optional — enables benchmarks)</span></label>
            <select value={industry} onChange={e => setIndustry(e.target.value)} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400">
              <option value="">Select industry…</option>
              <option value="ecommerce">E-commerce</option>
              <option value="saas">SaaS</option>
              <option value="blog">Blog / Content</option>
              <option value="portfolio">Portfolio</option>
              <option value="news">News / Media</option>
            </select>
          </div>
          <button
            onClick={handleAnalyze}
            disabled={loading || loadingFixes || !url}
            className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white py-2.5 rounded-lg text-sm font-bold transition-colors"
          >
            {loading ? '🔍 Fetching PageSpeed metrics…' : loadingFixes ? '🤖 Generating AI fixes…' : '⚡ Analyze + Get AI Code Fixes'}
          </button>
          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{error}</div>}
        </div>

        {result && <ResultsDisplay result={result} loadingFixes={loadingFixes} onBack={() => setResult(null)} />}
      </div>
    </div>
  );
}

function ResultsDisplay({ result, loadingFixes, onBack }: { result: AuditResult; loadingFixes: boolean; onBack: () => void }) {
  const m = result.metrics;
  const gain = result.projectedScore - m.overallScore;

  return (
    <div className="space-y-6">
      {/* Header with back button and export buttons */}
      <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl p-4">
        <button
          onClick={onBack}
          className="text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 transition-colors"
        >
          ← Back
        </button>
        <div className="flex gap-2">
          <button
            onClick={() => exportPerformanceFixerCSV({
              url: result.url,
              createdAt: new Date().toISOString(),
              metrics: m,
              projectedScore: result.projectedScore,
              fixes: result.fixes,
              roi: result.roi,
              industryData: result.industryData,
            })}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            ↓ CSV
          </button>
          <button
            onClick={() => exportPerformanceFixerPDF({
              url: result.url,
              createdAt: new Date().toISOString(),
              metrics: m,
              projectedScore: result.projectedScore,
              fixes: result.fixes,
              roi: result.roi,
              industryData: result.industryData,
            })}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            ↓ PDF
          </button>
        </div>
      </div>

      {/* Score overview */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h2 className="text-sm font-bold text-slate-600 mb-4">Performance Score</h2>
        <div className="grid grid-cols-3 gap-6 text-center mb-6">
          <div>
            <div className={`text-5xl font-black ${scoreColor(m.overallScore)}`}>{m.overallScore}</div>
            <div className="text-xs text-slate-500 mt-1">Current</div>
          </div>
          <div>
            <div className="text-5xl font-black text-green-600">{result.projectedScore}</div>
            <div className="text-xs text-slate-500 mt-1">After Fixes</div>
          </div>
          <div>
            <div className="text-5xl font-black text-blue-600">+{gain}</div>
            <div className="text-xs text-slate-500 mt-1">Improvement</div>
          </div>
        </div>

        {/* Core Web Vitals */}
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Core Web Vitals</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <MetricCard label="LCP" value={m.lcp.toFixed(2)} score={m.lcpScore} unit="s" />
          <MetricCard label="CLS" value={m.cls.toFixed(3)} score={m.clsScore} />
          <MetricCard label="FID" value={m.fid != null ? Math.round(m.fid) : null} score={m.fidScore} unit="ms" />
          <MetricCard label="INP" value={m.inp != null ? Math.round(m.inp) : null} score={m.inpScore} unit="ms" />
        </div>

        {/* Additional metrics */}
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Additional Metrics</h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
          <MetricCard label="FCP" value={m.fcp != null ? m.fcp.toFixed(2) : null} score={m.fcpScore} unit="s" />
          <MetricCard label="Speed Index" value={m.speedIndex != null ? m.speedIndex.toFixed(2) : null} score={m.speedIndexScore} unit="s" />
          <MetricCard label="TTI" value={m.tti != null ? m.tti.toFixed(2) : null} score={m.ttiScore} unit="s" />
          <MetricCard label="TBT" value={m.tbt != null ? Math.round(m.tbt) : null} score={m.tbtScore} unit="ms" />
          <MetricCard label="TTFB" value={m.ttfb != null ? Math.round(m.ttfb) : null} score={m.ttfbScore} unit="ms" />
        </div>

        {/* Opportunities */}
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Opportunities & Diagnostics</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MetricCard label="Unused JS" value={m.unusedJs != null ? Math.round(m.unusedJs / 1024) : null} score={m.unusedJsScore} unit=" KB" opportunity />
          <MetricCard label="Unused CSS" value={m.unusedCss != null ? Math.round(m.unusedCss / 1024) : null} score={m.unusedCssScore} unit=" KB" opportunity />
          <MetricCard label="Render Blocking" value={null} score={m.renderBlockingScore} opportunity />
          <MetricCard label="Redirects" value={m.redirects != null ? Math.round(m.redirects) : null} score={m.redirectsScore} unit="ms" opportunity />
          <MetricCard label="JS Bootup" value={m.jsBootupTime != null ? Math.round(m.jsBootupTime) : null} score={m.jsBootupScore} unit="ms" opportunity />
          <MetricCard label="Legacy JS" value={null} score={m.legacyJsScore} opportunity />
          <MetricCard label="Page Weight" value={m.totalByteWeight != null ? Math.round(m.totalByteWeight / 1024) : null} score={null} unit=" KB" />
          <MetricCard label="DOM Size" value={m.domSize} score={null} unit=" nodes" />
        </div>
      </div>

      {/* AI Fixes */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h2 className="text-sm font-bold text-slate-700 mb-4">🤖 AI-Generated Code Fixes {!loadingFixes && `(${result.fixes.length})`}</h2>
        {loadingFixes ? (
          <div className="text-sm text-slate-500 text-center py-10 bg-slate-50 rounded-lg">
            <div className="animate-spin text-2xl mb-3">⚙️</div>
            Generating AI fixes based on your metrics…
          </div>
        ) : result.fixes.length === 0 ? (
          <div className="text-sm text-slate-500 text-center py-8 bg-slate-50 rounded-lg">
            No fixes generated. Your site may already be well-optimized, or try re-analyzing.
          </div>
        ) : (
          <div className="space-y-4">
            {result.fixes.map((fix, idx) => (
              <FixCard key={idx} fix={fix} index={idx + 1} />
            ))}
          </div>
        )}
      </div>

      {/* ROI — only shown after fixes load */}
      {result.roi && (
        <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-100 rounded-xl p-6">
          <h2 className="text-sm font-bold text-slate-700 mb-4">💰 ROI Calculator</h2>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-black text-red-500">${result.roi.currentRevenueLoss}</div>
              <div className="text-xs text-slate-500 mt-1">Monthly Revenue Loss</div>
            </div>
            <div>
              <div className="text-2xl font-black text-green-600">${result.roi.potentialRevenue}</div>
              <div className="text-xs text-slate-500 mt-1">Potential Monthly Revenue</div>
            </div>
            <div>
              <div className="text-2xl font-black text-blue-600">{result.roi.fixTime}min</div>
              <div className="text-xs text-slate-500 mt-1">Est. Time to Fix</div>
            </div>
          </div>
        </div>
      )}

      {/* Industry Benchmark */}
      {result.industryData && (
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="text-sm font-bold text-slate-700 mb-4">📊 Industry Benchmark</h2>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className={`text-3xl font-black ${scoreColor(m.overallScore)}`}>{m.overallScore}</div>
              <div className="text-xs text-slate-500 mt-1">Your Score</div>
            </div>
            <div>
              <div className="text-3xl font-black text-blue-600">{result.industryData.avg}</div>
              <div className="text-xs text-slate-500 mt-1">Industry Average</div>
            </div>
            <div>
              <div className="text-3xl font-black text-green-600">{result.industryData.topPercent}</div>
              <div className="text-xs text-slate-500 mt-1">Top 10%</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FixCard({ fix, index }: { fix: Fix; index: number }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(fix.afterCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="border border-slate-100 rounded-lg p-4">
      <div className="flex items-start justify-between mb-1.5">
        <h3 className="text-sm font-semibold text-slate-800">Fix {index}: {fix.issue}</h3>
        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded font-bold ml-3 flex-shrink-0">+{fix.estimatedImpact} pts</span>
      </div>
      <p className="text-xs text-slate-500 mb-3">{fix.description}</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <div className="text-[10px] font-bold text-red-500 mb-1">BEFORE</div>
          <pre className="text-[11px] bg-slate-50 border border-slate-100 p-3 rounded overflow-x-auto text-slate-700">{fix.beforeCode}</pre>
        </div>
        <div>
          <div className="text-[10px] font-bold text-green-600 mb-1">AFTER</div>
          <pre className="text-[11px] bg-slate-50 border border-slate-100 p-3 rounded overflow-x-auto text-slate-700">{fix.afterCode}</pre>
        </div>
      </div>
      <button onClick={copy} className="mt-3 text-xs border border-slate-200 hover:bg-slate-50 px-3 py-1.5 rounded-lg transition-colors font-medium">
        {copied ? 'Copied!' : 'Copy Fix'}
      </button>
    </div>
  );
}
