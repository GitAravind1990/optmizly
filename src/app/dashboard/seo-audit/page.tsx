'use client'

import { useState, useEffect } from 'react'
import {
  AUDIT_FRAMEWORK, AUTO_CHECK_IDS, TOTAL_CHECKS, PRIORITY_RANK,
  type AuditPriority, type CheckStatus,
} from '@/lib/seo-audit/framework'
import { exportSeoAuditCSV, exportSeoAuditPDF } from '@/lib/export'
import { UpgradeModal } from '@/components/upgrade-modal'

type AutoResult = { status: CheckStatus; detail: string }
type AIResult = { score: number; issues: string[]; fixes: string[] }

type AuditSummary = {
  id: string
  url: string
  pageTitle: string | null
  overallScore: number
  totalChecks: number
  passedChecks: number
  failedChecks: number
  warnChecks: number
  createdAt: string
}

type Audit = AuditSummary & {
  categoryScores: Record<string, number>
  autoResults: Record<string, AutoResult>
  aiResults: Record<string, AIResult>
  checklistState: Record<string, CheckStatus>
  backlinkData?: { oprScore: number | null; domainRank: number | null }
}

function scoreColor(s: number) {
  if (s >= 80) return 'text-green-600'
  if (s >= 60) return 'text-amber-600'
  return 'text-red-600'
}
function scoreBg(s: number) {
  if (s >= 80) return 'bg-green-50 border-green-200'
  if (s >= 60) return 'bg-amber-50 border-amber-200'
  return 'bg-red-50 border-red-200'
}
function scoreBar(s: number) {
  if (s >= 80) return 'bg-green-500'
  if (s >= 60) return 'bg-amber-500'
  return 'bg-red-500'
}

const PRIORITY_BADGE: Record<AuditPriority, string> = {
  Critical: 'bg-red-100 text-red-700',
  High: 'bg-orange-100 text-orange-700',
  Medium: 'bg-amber-100 text-amber-700',
  Low: 'bg-slate-100 text-slate-600',
  Advanced: 'bg-purple-100 text-purple-700',
}
// Priority is a fixed "how much this matters if broken" label, independent of this
// audit's outcome — bold color only when the category score says it's actually broken;
// otherwise recede to neutral so it doesn't read as "critical problem found".
const MUTED_PRIORITY_BADGE = 'bg-slate-50 text-slate-400'
function priorityBadgeClass(priority: AuditPriority, score: number | undefined): string {
  if (typeof score === 'number' && score >= 70) return MUTED_PRIORITY_BADGE
  return PRIORITY_BADGE[priority]
}

const STATUS_BADGE: Record<CheckStatus, string> = {
  pass: 'bg-green-100 text-green-700',
  fail: 'bg-red-100 text-red-700',
  warn: 'bg-amber-100 text-amber-700',
  na: 'bg-slate-100 text-slate-500',
}
const STATUS_LABEL: Record<CheckStatus, string> = { pass: 'Pass', fail: 'Fail', warn: 'Warn', na: 'N/A' }

export default function SeoAuditPage() {
  const [audits, setAudits] = useState<AuditSummary[]>([])
  const [current, setCurrent] = useState<Audit | null>(null)
  const [view, setView] = useState<'list' | 'new' | 'result'>('list')

  const [url, setUrl] = useState('')
  const [pastedHtml, setPastedHtml] = useState('')
  const [showPaste, setShowPaste] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState('')
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)

  const [expanded, setExpanded] = useState<string | null>(null)
  const [showManual, setShowManual] = useState(false)
  const [savingCheck, setSavingCheck] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => { loadAudits() }, [])

  async function loadAudits() {
    try {
      const r = await fetch('/api/tools/seo-audit')
      const d = await r.json()
      if (d.data) setAudits(d.data)
    } catch {
      // network error — leave existing data
    }
  }

  async function loadAudit(id: string) {
    try {
      const r = await fetch(`/api/tools/seo-audit?id=${id}`)
      const d = await r.json()
      if (d.data) { setCurrent(d.data); setExpanded(null); setError(''); setView('result') }
    } catch {
      // network error — stay on current view
    }
  }

  async function runAudit() {
    if (!showPaste && !url.trim()) { setError('Enter a URL to audit.'); return }
    if (showPaste && pastedHtml.trim().length < 100) { setError('Paste the full page HTML (at least 100 characters).'); return }
    setError(''); setAnalyzing(true)
    try {
      const body: Record<string, string> = {}
      if (url.trim()) body.url = url.trim()
      if (showPaste && pastedHtml.trim()) body.html = pastedHtml
      const r = await fetch('/api/tools/seo-audit/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const d = await r.json()
      if (r.status === 403 || r.status === 429) { setShowUpgradeModal(true); return }
      if (!r.ok) throw new Error(d.error || 'Audit failed')
      setCurrent(d.data)
      setExpanded(null)
      setView('result')
      loadAudits()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Audit failed')
    } finally {
      setAnalyzing(false)
    }
  }

  async function toggleCheck(checkId: string, status: CheckStatus | null) {
    if (!current) return
    setSavingCheck(checkId)
    try {
      const r = await fetch('/api/tools/seo-audit', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auditId: current.id, checkId, status }),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok || !d.data) {
        setError(typeof d.error === 'string' ? d.error : 'Could not save that check — please try again.')
        return
      }
      setError('')
      setCurrent(prev => prev ? {
        ...prev,
        checklistState: d.data.checklistState,
        passedChecks: d.data.passedChecks,
        failedChecks: d.data.failedChecks,
        warnChecks: d.data.warnChecks,
        categoryScores: d.data.categoryScores ?? prev.categoryScores,
        overallScore: d.data.overallScore ?? prev.overallScore,
      } : prev)
    } catch {
      setError('Network error — could not save that check.')
    } finally {
      setSavingCheck(null)
    }
  }

  async function deleteAudit(id: string) {
    setDeleting(id)
    try {
      await fetch(`/api/tools/seo-audit?id=${id}`, { method: 'DELETE' })
      setAudits(prev => prev.filter(a => a.id !== id))
      if (current?.id === id) { setCurrent(null); setView('list') }
    } finally {
      setDeleting(null)
    }
  }

  function startNew() {
    setUrl(''); setPastedHtml(''); setShowPaste(false); setError(''); setView('new')
  }

  // ── LIST VIEW ──────────────────────────────────────────────────────────────
  if (view === 'list') {
    return (
      <div className="flex-1 overflow-y-auto p-6 max-w-5xl mx-auto w-full">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-slate-900">🩺 SEO Audit</h1>
            <p className="text-sm text-slate-500 mt-0.5">{AUTO_CHECK_IDS.size} automated checks + AI scoring across {AUDIT_FRAMEWORK.length} categories, with a {TOTAL_CHECKS}-point expert checklist</p>
          </div>
          <button onClick={startNew} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700">
            + New Audit
          </button>
        </div>

        {audits.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-slate-400"><circle cx="11" cy="11" r="9"/><path d="M7 11h3l2-4 2 8 2-4h3"/></svg>
            </div>
            <h2 className="text-lg font-bold text-slate-700">No audits yet</h2>
            <p className="text-sm text-slate-500 mt-1 mb-4">Enter a URL to run a full enterprise SEO audit</p>
            <button onClick={startNew} className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-bold text-white hover:bg-blue-700">
              Run an Audit
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {audits.map(a => (
              <div key={a.id} className="rounded-xl border border-slate-200 bg-white p-4 hover:border-blue-200 transition-colors">
                <div className="flex items-start gap-4">
                  <div className={`flex-shrink-0 w-14 h-14 rounded-full border-2 flex items-center justify-center ${scoreBg(a.overallScore)}`}>
                    <span className={`text-lg font-bold ${scoreColor(a.overallScore)}`}>{a.overallScore}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-800 text-sm truncate">{a.pageTitle || a.url}</div>
                    <div className="text-xs text-slate-400 truncate">{a.url}</div>
                    <div className="flex gap-3 mt-2 text-xs">
                      <span className="text-green-600 font-semibold">✓ {a.passedChecks} passed</span>
                      <span className="text-amber-600 font-semibold">⚠ {a.warnChecks} warnings</span>
                      <span className="text-red-600 font-semibold">✗ {a.failedChecks} failed</span>
                      <span className="text-slate-400">{new Date(a.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => loadAudit(a.id)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">View</button>
                    <button onClick={() => deleteAudit(a.id)} disabled={deleting === a.id} className="rounded-lg border border-red-100 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-50 disabled:opacity-50">
                      {deleting === a.id ? '...' : 'Delete'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ── NEW AUDIT VIEW ─────────────────────────────────────────────────────────
  if (view === 'new') {
    return (
      <>
      {showUpgradeModal && <UpgradeModal onClose={() => setShowUpgradeModal(false)} />}
      <div className="flex-1 overflow-y-auto p-6 max-w-3xl mx-auto w-full">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setView('list')} className="text-slate-400 hover:text-slate-600">←</button>
          <h1 className="text-xl font-bold text-slate-900">New SEO Audit</h1>
        </div>

        <div className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Page URL *</label>
            <input
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://example.com/page-to-audit"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-slate-400 mt-1">We fetch the page HTML, robots.txt and sitemap.xml to run automated checks.</p>
          </div>

          <button
            onClick={() => setShowPaste(s => !s)}
            className="text-xs font-medium text-blue-600 hover:underline"
          >
            {showPaste ? '− Hide paste-HTML option' : '+ Paste HTML instead (for bot-blocked or JS-rendered pages)'}
          </button>

          {showPaste && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Page HTML source</label>
              <textarea
                value={pastedHtml}
                onChange={e => setPastedHtml(e.target.value)}
                rows={12}
                placeholder="Paste the full rendered HTML source of the page here…"
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              <p className="text-xs text-slate-400 mt-1">When HTML is pasted, no outbound fetch is made (robots.txt / sitemap checks are skipped).</p>
            </div>
          )}

          {error && <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}

          <div className="flex gap-3">
            <button
              onClick={runAudit}
              disabled={analyzing}
              className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {analyzing ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Auditing…
                </span>
              ) : 'Run Audit'}
            </button>
            <button onClick={() => setView('list')} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
          </div>
        </div>
      </div>
      </>
    )
  }

  // ── RESULT VIEW ────────────────────────────────────────────────────────────
  if (!current) return null
  const naCount = Object.values(current.checklistState).filter(s => s === 'na').length +
    Object.values(current.autoResults).filter(a => a.status === 'na').length
  const evaluated = current.passedChecks + current.failedChecks + current.warnChecks + naCount
  const autoRun = Object.keys(current.autoResults).length
  const manualDone = Object.keys(current.checklistState).length
  const sortedCats = [...AUDIT_FRAMEWORK].sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority])

  return (
    <>
    {showUpgradeModal && <UpgradeModal onClose={() => setShowUpgradeModal(false)} />}
    <div className="flex-1 overflow-y-auto">
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => setView('list')} className="text-slate-400 hover:text-slate-600">←</button>
            <div className="min-w-0">
              <h1 className="text-base font-bold text-slate-900 truncate">{current.pageTitle || current.url}</h1>
              <div className="text-xs text-slate-400 truncate">{current.url}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={() => exportSeoAuditCSV(current)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">↓ CSV</button>
            <button onClick={() => exportSeoAuditPDF(current)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">↓ PDF</button>
            <button onClick={startNew} className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700">+ New</button>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-5xl mx-auto space-y-6">
        {error && <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}

        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className={`rounded-xl border-2 p-5 text-center ${scoreBg(current.overallScore)}`}>
            <div className={`text-5xl font-black ${scoreColor(current.overallScore)}`}>{current.overallScore}</div>
            <div className="text-sm font-semibold text-slate-600 mt-1">Overall SEO Score</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="text-sm font-semibold text-slate-700 mb-3">Check Results</div>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between"><span className="text-green-600">✓ Passed</span><span className="font-bold">{current.passedChecks}</span></div>
              <div className="flex justify-between"><span className="text-amber-600">⚠ Warnings</span><span className="font-bold">{current.warnChecks}</span></div>
              <div className="flex justify-between"><span className="text-red-600">✗ Failed</span><span className="font-bold">{current.failedChecks}</span></div>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="text-sm font-semibold text-slate-700 mb-2">Verified Coverage</div>
            <div className="flex items-end gap-2 mb-2">
              <span className="text-3xl font-black text-slate-800">{autoRun}</span>
              <span className="text-slate-400 text-sm mb-1">checks verified automatically</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full rounded-full bg-blue-500" style={{ width: `${(evaluated / current.totalChecks) * 100}%` }} />
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              Your score is built from these verified checks plus AI assessments.
              {manualDone > 0 ? ` You've reviewed ${manualDone} expert-checklist items.` : ` An optional expert checklist of ${current.totalChecks - autoRun} agency-audit items is available in each category.`}
            </p>
          </div>
        </div>

        {/* Category accordion */}
        <div className="space-y-2">
          {sortedCats.map((cat, catIdx) => {
            const catScore = current.categoryScores[cat.key]
            const ai = current.aiResults[cat.key]
            const isOpen = expanded === cat.key
            const isEvaluated = (c: { id: string; auto?: boolean }) =>
              (c.auto && current.autoResults[c.id]) || current.checklistState[c.id]
            const hiddenManual = cat.subCategories.flatMap(s => s.checks).filter(c => !isEvaluated(c)).length
            return (
              <div key={cat.key} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                <button
                  onClick={() => { setExpanded(isOpen ? null : cat.key); setShowManual(false) }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-left"
                >
                  <span className="text-slate-300 text-xs w-5">{catIdx + 1}</span>
                  <span className="flex-1 font-semibold text-sm text-slate-800">{cat.title}</span>
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${priorityBadgeClass(cat.priority, catScore)}`}>{cat.priority}</span>
                  {typeof catScore === 'number' && (
                    <span className={`text-sm font-bold w-9 text-right ${scoreColor(catScore)}`}>{catScore}</span>
                  )}
                  <span className="text-slate-400 text-xs w-4 text-center">{isOpen ? '▲' : '▼'}</span>
                </button>

                {isOpen && (
                  <div className="px-4 pb-4 border-t border-slate-100">
                    {typeof catScore === 'number' && (
                      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden my-3">
                        <div className={`h-full rounded-full ${scoreBar(catScore)}`} style={{ width: `${catScore}%` }} />
                      </div>
                    )}

                    {ai && (ai.issues.length > 0 || ai.fixes.length > 0) && (
                      <div className="rounded-lg bg-brand-50 border border-brand-100 p-3 mb-3">
                        <div className="text-[11px] font-bold uppercase text-brand-600 mb-1.5">🤖 AI Assessment</div>
                        {ai.issues.length > 0 && (
                          <ul className="space-y-1 mb-2">
                            {ai.issues.map((iss, i) => <li key={i} className="text-xs text-slate-700 flex gap-1.5"><span className="text-amber-500">⚠</span>{iss}</li>)}
                          </ul>
                        )}
                        {ai.fixes.length > 0 && (
                          <ul className="space-y-1">
                            {ai.fixes.map((fx, i) => <li key={i} className="text-xs text-brand-800 flex gap-1.5"><span>→</span>{fx}</li>)}
                          </ul>
                        )}
                      </div>
                    )}

                    {cat.subCategories.map(scat => {
                      const visibleChecks = showManual ? scat.checks : scat.checks.filter(isEvaluated)
                      if (visibleChecks.length === 0) return null
                      return (
                      <div key={scat.name} className="mb-3 last:mb-0">
                        <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-1.5">{scat.name}</div>
                        <div className="space-y-1">
                          {visibleChecks.map(check => {
                            const auto = check.auto ? current.autoResults[check.id] : undefined
                            const manual = current.checklistState[check.id]
                            return (
                              <div key={check.id} className="flex items-start gap-2 py-1.5 border-b border-slate-50 last:border-0">
                                <span className="flex-1 text-xs text-slate-700">
                                  {check.label}
                                  {auto && <span className="block text-[11px] text-slate-400 mt-0.5">{auto.detail}</span>}
                                </span>
                                {auto ? (
                                  <span className={`flex-shrink-0 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${STATUS_BADGE[auto.status]}`}>
                                    {STATUS_LABEL[auto.status]}
                                  </span>
                                ) : (
                                  <div className="flex-shrink-0 flex gap-1">
                                    {(['pass', 'fail', 'na'] as CheckStatus[]).map(st => (
                                      <button
                                        key={st}
                                        disabled={savingCheck === check.id}
                                        onClick={() => toggleCheck(check.id, manual === st ? null : st)}
                                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border transition-colors disabled:opacity-50 ${
                                          manual === st ? STATUS_BADGE[st] + ' border-transparent' : 'border-slate-200 text-slate-400 hover:bg-slate-50'
                                        }`}
                                      >
                                        {STATUS_LABEL[st]}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                      )
                    })}

                    {hiddenManual > 0 && (
                      <button
                        onClick={() => setShowManual(s => !s)}
                        className="w-full mt-1 rounded-lg border border-dashed border-slate-200 px-3 py-2 text-xs font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
                      >
                        {showManual
                          ? '− Hide expert checklist'
                          : `+ Expert checklist — ${hiddenManual} manual review item${hiddenManual === 1 ? '' : 's'} (optional, for full agency audits)`}
                      </button>
                    )}

                    {cat.key === 'backlinks' && current.backlinkData?.oprScore != null && (
                      <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-100">
                        <div className="text-[11px] font-bold uppercase text-slate-500 mb-2">Domain Authority</div>
                        <div className="flex gap-4 text-xs text-slate-700">
                          <span>OPR Score: <strong className="text-slate-900">{current.backlinkData.oprScore.toFixed(1)}/10</strong></span>
                          {current.backlinkData.domainRank && current.backlinkData.domainRank > 0 && (
                            <span>Global Rank: <strong className="text-slate-900">#{current.backlinkData.domainRank.toLocaleString()}</strong></span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
    </>
  )
}
