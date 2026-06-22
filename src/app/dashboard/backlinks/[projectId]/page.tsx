'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { exportBacklinksProjectCSV, exportBacklinksProjectPDF } from '@/lib/export'

type Opportunity = {
  id: string
  siteName: string
  siteUrl: string
  domainAuthority: string
  linkType: string
  angle: string
  whyRelevant: string
  contactApproach: string
  difficulty: string
  impact: string
  status: string
  notes: string | null
}

type Project = {
  id: string
  name: string
  domain: string
  niche: string
  targetKeywords: string[]
  contentBrief: string
  aiSummary: string | null
  opportunities: Opportunity[]
  createdAt: string
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  prospecting: { label: 'Prospecting', color: 'text-slate-600', bg: 'bg-slate-100', border: 'border-slate-300' },
  contacted:   { label: 'Contacted',   color: 'text-blue-700',  bg: 'bg-blue-50',   border: 'border-blue-300' },
  replied:     { label: 'Replied',     color: 'text-amber-700', bg: 'bg-amber-50',  border: 'border-amber-300' },
  secured:     { label: 'Secured ✓',  color: 'text-green-700', bg: 'bg-green-50',  border: 'border-green-300' },
  rejected:    { label: 'Rejected',    color: 'text-red-600',   bg: 'bg-red-50',    border: 'border-red-300' },
}

const LINK_TYPE_ICONS: Record<string, string> = {
  guest_post: '✍️', resource_page: '📋', journalist_pitch: '📰',
  directory: '📁', podcast: '🎙️', broken_link: '🔗', partnership: '🤝',
  interview: '🎤', roundup: '📊',
}

const DIFFICULTY_COLOR: Record<string, string> = {
  easy: 'text-green-600 bg-green-50',
  medium: 'text-amber-600 bg-amber-50',
  hard: 'text-red-600 bg-red-50',
}

const IMPACT_COLOR: Record<string, string> = {
  high: 'text-green-700 bg-green-100',
  medium: 'text-blue-700 bg-blue-100',
  low: 'text-slate-600 bg-slate-100',
}

const DA_COLOR: Record<string, string> = {
  high: 'text-purple-700 bg-purple-50',
  medium: 'text-blue-700 bg-blue-50',
  low: 'text-slate-600 bg-slate-50',
}

function OpportunityCard({
  opp,
  projectId,
  onUpdate,
}: {
  opp: Opportunity
  projectId: string
  onUpdate: (id: string, status: string, notes: string | null) => void
}) {
  const [editing, setEditing] = useState(false)
  const [notes, setNotes] = useState(opp.notes ?? '')
  const [saving, setSaving] = useState(false)
  const cfg = STATUS_CONFIG[opp.status] ?? STATUS_CONFIG.prospecting

  async function updateStatus(status: string) {
    setSaving(true)
    const r = await fetch(`/api/tools/backlinks/${projectId}/opportunities/${opp.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (r.ok) onUpdate(opp.id, status, opp.notes)
    setSaving(false)
  }

  async function saveNotes() {
    setSaving(true)
    const r = await fetch(`/api/tools/backlinks/${projectId}/opportunities/${opp.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes }),
    })
    if (r.ok) {
      onUpdate(opp.id, opp.status, notes)
      setEditing(false)
    }
    setSaving(false)
  }

  return (
    <div className={`rounded-xl border p-4 ${opp.status === 'secured' ? 'bg-green-50 border-green-200' : opp.status === 'rejected' ? 'bg-slate-50 border-slate-200 opacity-60' : 'bg-white border-slate-200'}`}>
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <span className="text-xl mt-0.5">{LINK_TYPE_ICONS[opp.linkType] ?? '🔗'}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-slate-800 text-sm">{opp.siteName}</span>
            {opp.siteUrl && (
              <a
                href={`https://${opp.siteUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-500 hover:underline"
              >
                {opp.siteUrl} ↗
              </a>
            )}
          </div>
          <div className="flex gap-1.5 flex-wrap mt-1.5">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${DA_COLOR[opp.domainAuthority] ?? 'bg-slate-100 text-slate-600'}`}>
              DA: {opp.domainAuthority}
            </span>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
              {opp.linkType?.replace(/_/g, ' ')}
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${DIFFICULTY_COLOR[opp.difficulty] ?? ''}`}>
              {opp.difficulty}
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${IMPACT_COLOR[opp.impact] ?? ''}`}>
              {opp.impact} impact
            </span>
          </div>
        </div>
        {/* Status badge */}
        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border shrink-0 ${cfg.bg} ${cfg.color} ${cfg.border}`}>
          {cfg.label}
        </span>
      </div>

      {/* Angle */}
      {opp.angle && (
        <div className="text-xs text-slate-700 mb-2">
          <span className="font-semibold">📝 Angle: </span>{opp.angle}
        </div>
      )}

      {/* Why relevant */}
      {opp.whyRelevant && (
        <div className="text-xs text-slate-500 mb-2">
          <span className="font-semibold">Why: </span>{opp.whyRelevant}
        </div>
      )}

      {/* Contact approach */}
      {opp.contactApproach && (
        <div className="rounded-lg bg-blue-50 border border-blue-100 px-3 py-2 text-xs text-blue-700 mb-3">
          📬 {opp.contactApproach}
        </div>
      )}

      {/* Notes */}
      {editing ? (
        <div className="mb-3">
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
            placeholder="Add notes (contact name, email, follow-up date...)"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
          />
          <div className="flex gap-2 mt-1">
            <button onClick={saveNotes} disabled={saving} className="text-xs px-3 py-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60">
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button onClick={() => { setEditing(false); setNotes(opp.notes ?? '') }} className="text-xs px-3 py-1 rounded-lg border border-slate-300 text-slate-600">
              Cancel
            </button>
          </div>
        </div>
      ) : opp.notes ? (
        <div
          onClick={() => setEditing(true)}
          className="mb-3 text-xs text-slate-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 cursor-pointer hover:bg-amber-100 transition-colors"
        >
          📝 {opp.notes}
        </div>
      ) : null}

      {/* Status actions */}
      <div className="flex gap-1.5 flex-wrap items-center">
        {Object.entries(STATUS_CONFIG).map(([s, c]) => (
          s !== opp.status && (
            <button
              key={s}
              onClick={() => updateStatus(s)}
              disabled={saving}
              className={`text-[10px] font-medium px-2.5 py-1 rounded-full border transition-colors hover:opacity-80 disabled:opacity-40 ${c.bg} ${c.color} ${c.border}`}
            >
              → {c.label}
            </button>
          )
        ))}
        <button
          onClick={() => setEditing(true)}
          className="ml-auto text-[10px] text-slate-400 hover:text-slate-600 transition-colors"
        >
          {opp.notes ? '✏️ Edit notes' : '+ Add notes'}
        </button>
      </div>
    </div>
  )
}

const STATUS_ORDER = ['prospecting', 'contacted', 'replied', 'secured', 'rejected']

export default function BacklinkProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params)
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const r = await fetch(`/api/tools/backlinks/${projectId}`)
      const d = await r.json()
      if (r.ok) setProject(d)
      setLoading(false)
    }
    load()
  }, [projectId])

  function handleUpdate(id: string, status: string, notes: string | null) {
    setProject(prev => prev ? {
      ...prev,
      opportunities: prev.opportunities.map(o => o.id === id ? { ...o, status, notes } : o),
    } : prev)
  }

  if (loading) return <div className="flex-1 flex items-center justify-center text-slate-400">Loading project...</div>
  if (!project) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-2">
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-red-400"><line x1="6" y1="6" x2="16" y2="16"/><line x1="16" y1="6" x2="6" y2="16"/></svg>
        </div>
        <div className="font-bold text-slate-700">Project not found</div>
        <Link href="/dashboard/backlinks" className="text-sm text-blue-600 mt-2 inline-block">← Back</Link>
      </div>
    </div>
  )

  const statusCounts = STATUS_ORDER.reduce((acc, s) => {
    acc[s] = project.opportunities.filter(o => o.status === s).length
    return acc
  }, {} as Record<string, number>)

  const filtered = filter === 'all'
    ? project.opportunities
    : project.opportunities.filter(o => o.status === filter)

  const secured = statusCounts.secured ?? 0
  const contacted = (statusCounts.contacted ?? 0) + (statusCounts.replied ?? 0) + secured
  const total = project.opportunities.length

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <div className="px-6 pt-5 pb-4 border-b border-slate-200 bg-white sticky top-0 z-10">
        <div className="flex items-center gap-3 mb-3">
          <Link href="/dashboard/backlinks" className="text-sm text-slate-500 hover:text-slate-700">← Back</Link>
          <div className="flex-1">
            <h1 className="text-xl font-black text-slate-800">{project.name}</h1>
            <div className="text-xs text-slate-400">{project.domain} · {project.niche}</div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => exportBacklinksProjectCSV(project)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              ↓ CSV
            </button>
            <button
              onClick={() => exportBacklinksProjectPDF(project)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              ↓ PDF
            </button>
          </div>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-5 gap-2 mb-3">
          {[
            { label: 'Total', value: total, color: 'text-slate-700' },
            { label: 'Contacted', value: contacted, color: 'text-blue-600' },
            { label: 'Replied', value: statusCounts.replied ?? 0, color: 'text-amber-600' },
            { label: 'Secured', value: secured, color: 'text-green-600' },
            { label: 'Rejected', value: statusCounts.rejected ?? 0, color: 'text-red-500' },
          ].map(item => (
            <div key={item.label} className="text-center bg-slate-50 rounded-lg p-2">
              <div className={`text-xl font-black ${item.color}`}>{item.value}</div>
              <div className="text-[10px] text-slate-400">{item.label}</div>
            </div>
          ))}
        </div>

        {/* Progress */}
        {total > 0 && (
          <div className="mb-3">
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden flex">
              <div className="h-full bg-green-500 transition-all" style={{ width: `${(secured / total) * 100}%` }} />
              <div className="h-full bg-amber-400 transition-all" style={{ width: `${((statusCounts.replied ?? 0) / total) * 100}%` }} />
              <div className="h-full bg-blue-400 transition-all" style={{ width: `${((statusCounts.contacted ?? 0) / total) * 100}%` }} />
            </div>
            <div className="flex gap-3 text-[10px] text-slate-400 mt-1">
              <span>🟢 Secured {Math.round((secured / total) * 100)}%</span>
              <span>🟡 Replied {Math.round(((statusCounts.replied ?? 0) / total) * 100)}%</span>
              <span>🔵 Contacted {Math.round(((statusCounts.contacted ?? 0) / total) * 100)}%</span>
            </div>
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex gap-1.5 flex-wrap">
          {[
            { key: 'all', label: `All (${total})` },
            ...STATUS_ORDER.map(s => ({ key: s, label: `${STATUS_CONFIG[s].label} (${statusCounts[s] ?? 0})` })),
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`text-xs px-3 py-1 rounded-full transition-colors ${filter === tab.key ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-6 py-4 space-y-3 pb-8">
        {/* AI Summary */}
        {project.aiSummary && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="text-xs font-bold text-blue-700 mb-1">💡 Strategy Overview</div>
            <p className="text-sm text-blue-800">{project.aiSummary}</p>
          </div>
        )}

        {/* Opportunities */}
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-400">No opportunities in this status</div>
        ) : (
          filtered.map(opp => (
            <OpportunityCard
              key={opp.id}
              opp={opp}
              projectId={projectId}
              onUpdate={handleUpdate}
            />
          ))
        )}
      </div>
    </div>
  )
}
