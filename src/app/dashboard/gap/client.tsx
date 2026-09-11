'use client'

import { useState } from 'react'
import { ProToolPage } from '@/components/tools/ProToolPage'
import { exportGapCSV, exportGapPDF } from '@/lib/export'
import { Card, Badge } from '@/components/ui'

export function GapClient({ unlocked }: { unlocked: boolean }) {
  const [keyword, setKeyword] = useState('')

  return (
    <ProToolPage
      toolId="gap"
      title="Content Gap"
      description="Identify topics your competitors cover that you don't, ranked by traffic opportunity"
      plan="Pro"
      unlocked={unlocked}
      needsContent
      extraInputs={
        <div className="space-y-1">
          <label htmlFor="gap-keyword" className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Target keyword (optional — grounds gaps in real competitor pages)
          </label>
          <input
            id="gap-keyword"
            type="text"
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            placeholder="e.g. best project management software"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
          />
        </div>
      }
      getBody={(content, summary) => ({ content, summary, keyword: keyword.trim() || undefined })}
      prepareLabel="Reading the top-ranking pages…"
      // The SERP lookup and competitor crawl run in their own request, so neither half is a
      // long signed-in POST. Without a keyword there is nothing to ground, so the extra round
      // trip is skipped entirely and the run is one fast model call, exactly as before.
      prepare={async () => {
        const kw = keyword.trim()
        if (!kw) return null
        const r = await fetch('/api/gap/ground', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ keyword: kw }),
        })
        // A failed grounding must never be worse than not having asked for it, so every
        // failure falls through ungrounded rather than ending the run: the result then carries
        // the "Estimated" badge, which is the truth. That covers the quota case too — this
        // route only refuses on quota that /api/gap is about to refuse as well, and letting
        // the main request answer means the user gets the upgrade modal rather than a red
        // banner, which is how every other tool here behaves.
        if (!r.ok) return null
        const d = await r.json()
        return { grounding: d.grounding }
      }}
      renderResult={(data) => {
        const d = data as {
          summary: string
          gaps: Array<{ title: string; why: string; opportunity: string; suggested_section: string }>
          dataQuality?: { grounded: boolean; keywordProvided: boolean; comparedDomains: string[] }
        }
        return (
          <div className="space-y-3">
            {d.summary && (
              <Card className="bg-slate-50">
                <p className="text-sm text-slate-600">
                  {d.summary}
                  {d.dataQuality?.grounded ? (
                    <span className="ml-2 text-[9px] font-bold uppercase text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full align-middle">Live Data</span>
                  ) : d.dataQuality?.keywordProvided ? (
                    <span className="ml-2 text-[9px] font-bold uppercase text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded-full align-middle">Estimated</span>
                  ) : null}
                </p>
                {d.dataQuality?.grounded && d.dataQuality.comparedDomains.length > 0 && (
                  <p className="text-[10px] text-slate-400 mt-1.5">
                    Compared against real competitor pages: {d.dataQuality.comparedDomains.join(', ')}
                  </p>
                )}
              </Card>
            )}
            {(d.gaps ?? []).map((gap, i) => (
              <Card key={i}>
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className="font-bold text-sm">{gap.title}</span>
                  <Badge variant={gap.opportunity === 'high' ? 'red' : gap.opportunity === 'medium' ? 'amber' : 'gray'}>{gap.opportunity}</Badge>
                </div>
                <p className="text-xs text-slate-600 mb-1">{gap.why}</p>
                {gap.suggested_section && <p className="text-xs text-blue-600">Add to: {gap.suggested_section}</p>}
              </Card>
            ))}
            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <button onClick={() => exportGapCSV(d)} style={{ padding: '7px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>↓ CSV</button>
              <button onClick={() => exportGapPDF(d)} style={{ padding: '7px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>↓ PDF</button>
            </div>
          </div>
        )
      }}
    />
  )
}
