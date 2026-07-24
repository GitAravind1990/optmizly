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
