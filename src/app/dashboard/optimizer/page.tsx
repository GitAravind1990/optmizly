'use client';

import { useState } from 'react';
import { exportContentOptimizerCSV, exportContentOptimizerPDF } from '@/lib/export';
import { UpgradeModal } from '@/components/upgrade-modal';

interface Entity {
  name: string;
  type: string;
  strength: 'strong' | 'weak';
  frequency: number;
}

interface MissingEntity {
  name: string;
  reason: string;
  where: string;
}

interface EntityRelationship {
  entity1: string;
  entity2: string;
  relationship: string;
}

interface Suggestion {
  issue: string;
  suggestion: string;
  priority: 'critical' | 'warning' | 'info';
}

interface Fix {
  issue: string;
  suggestion: string;
  beforeText?: string;
  afterText?: string;
  priority: 'critical' | 'warning' | 'info';
}

interface Rewrite {
  section: string;
  original: string;
  improved: string;
}

interface ClusterPage {
  title: string;
  topic: string;
  importance: string;
}

interface LinkingOp {
  from: string;
  to: string;
  anchor: string;
}

interface MissingTopic {
  topic: string;
  importance: string;
  reason: string;
}

interface AnalysisResult {
  id: string;
  overallScore: number;
  intent: {
    intent: string;
    matchScore: number;
    reasoning: string;
    suggestions: Suggestion[];
  };
  entities: {
    entities: Entity[];
    score: number;
    missing: MissingEntity[];
    relationships: EntityRelationship[];
    suggestions: Suggestion[];
  };
  lsi: {
    found: string[];
    missing: string[];
    score: number;
    suggestions: Suggestion[];
  };
  schema: {
    type: string;
    reasoning: string;
    jsonLd: string;
  };
  topics: {
    mainTopic: string;
    covered: string[];
    missing: MissingTopic[];
    score: number;
    pillarSuggestion: string;
    clusterSuggestions: ClusterPage[];
    linkingOpportunities: LinkingOp[];
    suggestions: Suggestion[];
  };
  eeat: {
    experience: number;
    expertise: number;
    authority: number;
    trust: number;
    overall: number;
    details: Record<string, string>;
  };
  improvements: {
    contentScore: number;
    fixes: Fix[];
    rewrites: Rewrite[];
  };
}

type TabId = 'overview' | 'intent' | 'entities' | 'lsi' | 'schema' | 'topics' | 'eeat' | 'fixes';

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'intent',   label: 'Intent' },
  { id: 'entities', label: 'Entities' },
  { id: 'lsi',      label: 'LSI Keywords' },
  { id: 'schema',   label: 'Schema' },
  { id: 'topics',   label: 'Topics' },
  { id: 'eeat',     label: 'E-E-A-T' },
  { id: 'fixes',    label: 'AI Fixes' },
];

type Mode = 'analyze' | 'rewrite';

export default function ContentOptimizerPage() {
  const [mode, setMode]             = useState<Mode>('analyze');
  const [content, setContent]       = useState('');
  const [keyword, setKeyword]       = useState('');
  const [contentUrl, setContentUrl] = useState('');
  const [loading, setLoading]       = useState(false);
  const [result, setResult]         = useState<AnalysisResult | null>(null);
  const [activeTab, setActiveTab]   = useState<TabId>('overview');
  const [error, setError]           = useState('');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Rewrite mode state
  const [rwLoading, setRwLoading]   = useState(false);
  const [rwStep, setRwStep]         = useState('');
  const [rwResult, setRwResult]     = useState<{
    rewritten_content: string; improvements: string[]; framework_sections_applied: string[];
    eeat_applied?: { overall: number; summary: string; dimensions: Record<string, { score: number; finding: string }>; recommendations: string[] }
  } | null>(null);
  const [rwError, setRwError]       = useState('');
  const [rwCopied, setRwCopied]     = useState(false);
  const [rwViewMode, setRwViewMode] = useState<'preview' | 'html'>('preview');

  async function handleRewrite() {
    if (content.length < 50) { setRwError('Paste content to rewrite'); return }
    setRwLoading(true); setRwError(''); setRwStep('Step 1/2: Running E-E-A-T analysis…');
    try {
      const r = await fetch('/api/rewrite', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content }) });
      setRwStep('Step 2/2: Rewriting with framework…');
      const d = await r.json();
      if (r.status === 403 || r.status === 429) { setShowUpgradeModal(true); return }
      if (!r.ok) throw new Error(d.error);
      setRwResult(d);
    } catch (e) { setRwError(e instanceof Error ? e.message : 'Rewrite failed'); }
    finally { setRwLoading(false); setRwStep(''); }
  }

  async function rwCopy() {
    if (!rwResult?.rewritten_content) return;
    const plain = rwResult.rewritten_content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    await navigator.clipboard.writeText(plain);
    setRwCopied(true); setTimeout(() => setRwCopied(false), 2000);
  }

  const handleAnalyze = async () => {
    setLoading(true);
    setResult(null);
    setError('');
    try {
      const res = await fetch('/api/tools/content-optimizer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, targetKeyword: keyword, contentUrl }),
      });
      const data = await res.json();
      if (res.status === 403 || res.status === 429) {
        setShowUpgradeModal(true);
      } else if (res.ok) {
        setResult(data);
        setActiveTab('overview');
      } else {
        setError(data.error ?? 'Analysis failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6">
      {showUpgradeModal && <UpgradeModal onClose={() => setShowUpgradeModal(false)} />}
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header + mode toggle */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-black flex items-center gap-2">
              Content Optimizer
              <span className="text-[10px] bg-gradient-to-r from-purple-500 to-blue-500 text-white px-2.5 py-0.5 rounded-full font-bold">
                SEMANTIC SEO
              </span>
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {mode === 'analyze'
                ? 'Intent · Entities · LSI Keywords · Schema · Topic Clusters · E-E-A-T · AI Fixes: all in one analysis'
                : 'Full content rewrite following Neil Patel & Brian Dean framework with E-E-A-T applied automatically'}
            </p>
          </div>
          <div className="flex rounded-xl border border-slate-200 overflow-hidden text-xs shrink-0">
            <button onClick={() => setMode('analyze')}
              className={`px-4 py-2 font-bold transition-colors ${mode === 'analyze' ? 'bg-purple-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>
              Analyze
            </button>
            <button onClick={() => setMode('rewrite')}
              className={`px-4 py-2 font-bold transition-colors ${mode === 'rewrite' ? 'bg-purple-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>
              Full Rewrite
            </button>
          </div>
        </div>

        {mode === 'analyze' ? (
          <>
            {/* Analyze input form */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1.5 block">Target Keyword *</label>
                  <input type="text" placeholder="e.g., content marketing strategy" value={keyword} onChange={e => setKeyword(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1.5 block">Content URL <span className="font-normal text-slate-400">(optional)</span></label>
                  <input type="url" placeholder="https://yoursite.com/article" value={contentUrl} onChange={e => setContentUrl(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 mb-1.5 block">Content *</label>
                <textarea placeholder="Paste your content here..." value={content} onChange={e => setContent(e.target.value)} rows={10}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none" />
                <div className="text-xs text-slate-400 mt-1">{content.length} characters</div>
              </div>
              {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}
              <button onClick={handleAnalyze} disabled={loading || !content || !keyword}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 text-white py-3 rounded-lg text-sm font-bold transition-all">
                {loading ? 'Running 7 analyses in parallel… (~30 sec)' : 'Analyze Everything'}
              </button>
            </div>
            {result && <ResultsDisplay result={result} activeTab={activeTab} setActiveTab={setActiveTab} />}
          </>
        ) : (
          <>
            {/* Rewrite input form */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-600 mb-1.5 block">Content *</label>
                <textarea placeholder="Paste your content here to rewrite…" value={content} onChange={e => setContent(e.target.value)} rows={10}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none" />
              </div>
              {rwError && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{rwError}</p>}
              <button onClick={handleRewrite} disabled={rwLoading || content.length < 50}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 text-white py-3 rounded-lg text-sm font-bold transition-all">
                {rwLoading ? rwStep || 'Rewriting…' : 'Rewrite Content'}
              </button>
            </div>

            {rwResult && (
              <div className="space-y-4">
                {rwResult.eeat_applied?.overall && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="text-2xl font-black text-blue-700">{rwResult.eeat_applied.overall}</div>
                      <div>
                        <div className="text-xs font-bold text-blue-800">E-E-A-T Applied to Rewrite</div>
                        <div className="text-xs text-blue-600">{rwResult.eeat_applied.summary}</div>
                      </div>
                    </div>
                  </div>
                )}
                {rwResult.framework_sections_applied?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {rwResult.framework_sections_applied.map(s => (
                      <span key={s} className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-bold">✓ {s.replace(/_/g, ' ')}</span>
                    ))}
                  </div>
                )}
                <div className="bg-white border border-slate-200 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Rewritten Content</div>
                    <div className="flex items-center gap-2">
                      <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs">
                        <button onClick={() => setRwViewMode('preview')} className={`px-3 py-1.5 font-bold transition-colors ${rwViewMode === 'preview' ? 'bg-slate-900 text-white' : 'bg-white text-slate-500'}`}>Preview</button>
                        <button onClick={() => setRwViewMode('html')} className={`px-3 py-1.5 font-bold transition-colors ${rwViewMode === 'html' ? 'bg-slate-900 text-white' : 'bg-white text-slate-500'}`}>HTML</button>
                      </div>
                      <button onClick={rwCopy} className="text-xs bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg font-bold">{rwCopied ? '✓ Copied!' : 'Copy'}</button>
                    </div>
                  </div>
                  {rwViewMode === 'preview' ? (
                    <div className="prose prose-slate max-w-none text-sm leading-relaxed max-h-[600px] overflow-y-auto
                      [&_h1]:text-xl [&_h1]:font-black [&_h2]:text-base [&_h2]:font-black [&_p]:text-slate-600 [&_p]:mb-3"
                      dangerouslySetInnerHTML={{ __html: rwResult.rewritten_content }} />
                  ) : (
                    <pre className="whitespace-pre-wrap text-xs leading-relaxed text-slate-600 font-mono max-h-[600px] overflow-y-auto bg-slate-50 p-3 rounded-lg">{rwResult.rewritten_content}</pre>
                  )}
                </div>
                <button onClick={() => setRwResult(null)} className="text-xs bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-lg font-bold">↺ Rewrite Again</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ScoreColor(score: number) {
  return score >= 80 ? 'text-green-600' : score >= 60 ? 'text-yellow-500' : 'text-red-500';
}

function ScoreBadge({ score }: { score: number }) {
  const ring = score >= 80 ? 'border-green-400' : score >= 60 ? 'border-yellow-400' : 'border-red-400';
  return (
    <div className={`w-16 h-16 rounded-full border-4 ${ring} flex items-center justify-center`}>
      <span className={`text-lg font-black ${ScoreColor(score)}`}>{score}</span>
    </div>
  );
}

function PriorityBadge({ p }: { p: string }) {
  const map: Record<string, string> = {
    critical: 'bg-red-100 text-red-700',
    warning:  'bg-yellow-100 text-yellow-700',
    info:     'bg-blue-100 text-blue-700',
  };
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${map[p] ?? map.info}`}>{p}</span>;
}

function ResultsDisplay({ result, activeTab, setActiveTab }: {
  result: AnalysisResult;
  activeTab: TabId;
  setActiveTab: (t: TabId) => void;
}) {
  const tabScore: Partial<Record<TabId, number>> = {
    overview: result.overallScore,
    intent:   result.intent.matchScore,
    entities: result.entities.score,
    lsi:      result.lsi.score,
    topics:   result.topics.score,
    eeat:     result.eeat.overall,
    fixes:    result.improvements.contentScore,
  };

  return (
    <div className="space-y-6">
      {/* Overall score banner */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-100 rounded-xl p-6 text-center">
        <div className={`text-5xl font-black ${ScoreColor(result.overallScore)}`}>
          {result.overallScore}/100
        </div>
        <div className="text-sm text-slate-500 mt-1">Overall Semantic SEO Score</div>
      </div>

      {/* Export buttons */}
      <div className="flex gap-2 justify-center">
        <button
          onClick={() => exportContentOptimizerCSV(result)}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
        >
          ↓ CSV
        </button>
        <button
          onClick={() => exportContentOptimizerPDF(result)}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
        >
          ↓ PDF
        </button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {TABS.map(tab => {
          const s = tabScore[tab.id];
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === tab.id
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {tab.label}
              {s != null && (
                <span className={`text-[10px] font-bold ${activeTab === tab.id ? 'text-purple-200' : ScoreColor(s)}`}>
                  {s}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab panels */}
      <div>
        {activeTab === 'overview'  && <OverviewTab result={result} />}
        {activeTab === 'intent'    && <IntentTab data={result.intent} />}
        {activeTab === 'entities'  && <EntitiesTab data={result.entities} />}
        {activeTab === 'lsi'       && <LsiTab data={result.lsi} />}
        {activeTab === 'schema'    && <SchemaTab data={result.schema} />}
        {activeTab === 'topics'    && <TopicsTab data={result.topics} />}
        {activeTab === 'eeat'      && <EEATTab data={result.eeat} />}
        {activeTab === 'fixes'     && <FixesTab data={result.improvements} />}
      </div>
    </div>
  );
}

function MiniScore({ label, score, detail }: { label: string; score: number; detail: string }) {
  return (
    <div className="bg-white border border-slate-100 rounded-xl p-4 flex items-center gap-4">
      <ScoreBadge score={score} />
      <div>
        <div className="text-xs font-bold text-slate-600">{label}</div>
        <div className="text-xs text-slate-400 mt-0.5">{detail}</div>
      </div>
    </div>
  );
}

function OverviewTab({ result }: { result: AnalysisResult }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <MiniScore label="Search Intent"  score={result.intent.matchScore}         detail={result.intent.intent} />
      <MiniScore label="Entity Score"   score={result.entities.score}            detail={`${result.entities.entities.length} entities found`} />
      <MiniScore label="LSI Keywords"   score={result.lsi.score}                 detail={`${result.lsi.found.length} used · ${result.lsi.missing.length} missing`} />
      <MiniScore label="Topic Coverage" score={result.topics.score}              detail={`${result.topics.covered.length} covered · ${result.topics.missing.length} missing`} />
      <MiniScore label="E-E-A-T"        score={result.eeat.overall}              detail="Experience · Expertise · Authority · Trust" />
      <MiniScore label="Content Score"  score={result.improvements.contentScore} detail={`${result.improvements.fixes.length} fixes suggested`} />
    </div>
  );
}

function SuggestionList({ suggestions }: { suggestions: Suggestion[] }) {
  if (!suggestions?.length) return null;
  return (
    <div className="mt-4 space-y-2">
      <h4 className="text-xs font-bold text-slate-600">Suggestions</h4>
      {suggestions.map((s, i) => (
        <div key={i} className="flex items-start gap-2 bg-slate-50 border border-slate-100 rounded-lg p-3">
          <PriorityBadge p={s.priority} />
          <div>
            <div className="text-xs font-semibold text-slate-700">{s.issue}</div>
            <div className="text-xs text-slate-500 mt-0.5">{s.suggestion}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function IntentTab({ data }: { data: AnalysisResult['intent'] }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6">
      <h3 className="text-sm font-bold text-slate-700 mb-4">Search Intent Analysis</h3>
      <div className="flex items-center gap-6 mb-4">
        <ScoreBadge score={data.matchScore} />
        <div>
          <div className="text-lg font-black capitalize text-slate-800">{data.intent}</div>
          <div className="text-xs text-slate-500">Intent match score: {data.matchScore}/100</div>
        </div>
      </div>
      {data.reasoning && <p className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3">{data.reasoning}</p>}
      <SuggestionList suggestions={data.suggestions} />
    </div>
  );
}

function EntitiesTab({ data }: { data: AnalysisResult['entities'] }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
      <h3 className="text-sm font-bold text-slate-700">Entity Analysis · Score: {data.score}/100</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h4 className="text-xs font-bold text-green-700 mb-2">✓ Found ({data.entities.length})</h4>
          <div className="flex flex-wrap gap-1.5">
            {data.entities.map((e, i) => (
              <span key={i} className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                e.strength === 'strong' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-700'
              }`}>
                {e.name} ×{e.frequency}
              </span>
            ))}
          </div>
        </div>
        <div>
          <h4 className="text-xs font-bold text-red-600 mb-2">✗ Missing ({data.missing.length})</h4>
          <div className="space-y-2">
            {data.missing.map((m, i) => (
              <div key={i} className="bg-red-50 border border-red-100 rounded-lg p-2">
                <div className="text-xs font-semibold text-red-700">{m.name}</div>
                <div className="text-[11px] text-slate-500">{m.reason}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {data.relationships?.length > 0 && (
        <div>
          <h4 className="text-xs font-bold text-slate-600 mb-2">Entity Relationships</h4>
          <div className="space-y-1">
            {data.relationships.map((r, i) => (
              <div key={i} className="text-xs text-slate-600 bg-slate-50 rounded px-3 py-1.5">
                <strong>{r.entity1}</strong> → {r.relationship} → <strong>{r.entity2}</strong>
              </div>
            ))}
          </div>
        </div>
      )}
      <SuggestionList suggestions={data.suggestions} />
    </div>
  );
}

function LsiTab({ data }: { data: AnalysisResult['lsi'] }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
      <h3 className="text-sm font-bold text-slate-700">LSI Keywords · Score: {data.score}/100</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h4 className="text-xs font-bold text-green-700 mb-2">✓ Used ({data.found.length})</h4>
          <div className="flex flex-wrap gap-1.5">
            {data.found.map((k, i) => (
              <span key={i} className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full">{k}</span>
            ))}
          </div>
        </div>
        <div>
          <h4 className="text-xs font-bold text-red-600 mb-2">✗ Missing ({data.missing.length})</h4>
          <div className="flex flex-wrap gap-1.5">
            {data.missing.map((k, i) => (
              <span key={i} className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full">{k}</span>
            ))}
          </div>
        </div>
      </div>
      <SuggestionList suggestions={data.suggestions} />
    </div>
  );
}

function SchemaTab({ data }: { data: AnalysisResult['schema'] }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(data.jsonLd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
      <h3 className="text-sm font-bold text-slate-700">Schema Markup Generator</h3>
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
        <div className="text-xs font-bold text-blue-700">Recommended: {data.type} Schema</div>
        {data.reasoning && <div className="text-xs text-slate-600 mt-1">{data.reasoning}</div>}
      </div>
      {data.jsonLd && (
        <div>
          <div className="text-xs font-bold text-slate-600 mb-2">Generated JSON-LD</div>
          <pre className="text-[11px] bg-slate-50 border border-slate-100 rounded-lg p-4 overflow-x-auto text-slate-700 max-h-72">{data.jsonLd}</pre>
          <button
            onClick={copy}
            className="mt-3 text-xs bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            {copied ? '✓ Copied!' : 'Copy Schema Code'}
          </button>
        </div>
      )}
    </div>
  );
}

function TopicsTab({ data }: { data: AnalysisResult['topics'] }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-700">Topic Coverage & Clusters</h3>
        <span className={`text-sm font-bold ${ScoreColor(data.score)}`}>{data.score}/100</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h4 className="text-xs font-bold text-green-700 mb-2">✓ Covered ({data.covered.length})</h4>
          <ul className="space-y-1">
            {data.covered.map((c, i) => (
              <li key={i} className="text-xs text-slate-600 flex items-center gap-1.5">
                <span className="text-green-500">•</span> {c}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="text-xs font-bold text-red-600 mb-2">✗ Missing ({data.missing.length})</h4>
          <ul className="space-y-1">
            {data.missing.map((m, i) => (
              <li key={i} className="text-xs text-slate-600 flex items-center gap-1.5">
                <span className={`font-bold ${m.importance === 'high' ? 'text-red-500' : m.importance === 'medium' ? 'text-yellow-500' : 'text-slate-400'}`}>•</span>
                {m.topic} <span className="text-slate-400">({m.importance})</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      {data.pillarSuggestion && (
        <div className="bg-purple-50 border border-purple-100 rounded-lg p-3">
          <div className="text-xs font-bold text-purple-700 mb-1">Pillar Page Suggestion</div>
          <div className="text-xs text-slate-600">{data.pillarSuggestion}</div>
        </div>
      )}
      {data.clusterSuggestions?.length > 0 && (
        <div>
          <h4 className="text-xs font-bold text-slate-600 mb-2">Cluster Page Ideas</h4>
          <div className="space-y-1">
            {data.clusterSuggestions.map((c, i) => (
              <div key={i} className="text-xs text-slate-600 bg-slate-50 border border-slate-100 rounded px-3 py-2 flex items-center justify-between">
                <span>{c.title}</span>
                <span className={`font-bold text-[10px] ${c.importance === 'high' ? 'text-red-500' : 'text-slate-400'}`}>{c.importance}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <SuggestionList suggestions={data.suggestions} />
    </div>
  );
}

function EEATTab({ data }: { data: AnalysisResult['eeat'] }) {
  const dims = [
    { label: 'Experience', score: data.experience, key: 'experience' },
    { label: 'Expertise',  score: data.expertise,  key: 'expertise' },
    { label: 'Authority',  score: data.authority,  key: 'authority' },
    { label: 'Trust',      score: data.trust,       key: 'trust' },
  ];
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
      <h3 className="text-sm font-bold text-slate-700">E-E-A-T Analysis</h3>
      <div className="grid grid-cols-2 gap-4">
        {dims.map(d => (
          <div key={d.key} className="border border-slate-100 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <ScoreBadge score={d.score} />
              <div className="text-xs font-bold text-slate-600">{d.label}</div>
            </div>
            {data.details?.[d.key] && (
              <p className="text-xs text-slate-500">{data.details[d.key]}</p>
            )}
          </div>
        ))}
      </div>
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-center">
        <div className="text-xs text-slate-500 mb-1">Overall E-E-A-T</div>
        <div className={`text-3xl font-black ${ScoreColor(data.overall)}`}>{data.overall}/100</div>
      </div>
    </div>
  );
}

function FixesTab({ data }: { data: AnalysisResult['improvements'] }) {
  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h3 className="text-sm font-bold text-slate-700 mb-4">AI-Powered Improvements</h3>
        <div className="space-y-3">
          {data.fixes.map((fix, i) => (
            <div key={i} className="border border-slate-100 rounded-xl p-4">
              <div className="flex items-start justify-between mb-2 gap-2">
                <h4 className="text-xs font-semibold text-slate-800">{fix.issue}</h4>
                <PriorityBadge p={fix.priority} />
              </div>
              <p className="text-xs text-slate-500 mb-3">{fix.suggestion}</p>
              {fix.beforeText && fix.afterText && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div className="bg-red-50 border border-red-100 rounded-lg p-2">
                    <div className="text-[10px] font-bold text-red-600 mb-1">Before</div>
                    <div className="text-xs text-slate-600">{fix.beforeText}</div>
                  </div>
                  <div className="bg-green-50 border border-green-100 rounded-lg p-2">
                    <div className="text-[10px] font-bold text-green-600 mb-1">After</div>
                    <div className="text-xs text-slate-600">{fix.afterText}</div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {data.rewrites?.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h3 className="text-sm font-bold text-slate-700 mb-4">AI Rewrite Suggestions</h3>
          <div className="space-y-4">
            {data.rewrites.map((r, i) => (
              <div key={i} className="border border-slate-100 rounded-xl p-4">
                <div className="text-xs font-bold text-slate-600 mb-3">{r.section}</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div className="bg-red-50 border border-red-100 rounded-lg p-3">
                    <div className="text-[10px] font-bold text-red-600 mb-1">Original</div>
                    <div className="text-xs text-slate-600">{r.original}</div>
                  </div>
                  <div className="bg-green-50 border border-green-100 rounded-lg p-3">
                    <div className="text-[10px] font-bold text-green-600 mb-1">Improved</div>
                    <div className="text-xs text-slate-600">{r.improved}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
