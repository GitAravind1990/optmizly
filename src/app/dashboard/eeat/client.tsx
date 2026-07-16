'use client'

import { ProToolPage } from '@/components/tools/ProToolPage'
import { exportEEATCSV, exportEEATPDF } from '@/lib/export'
import { Card, ScoreBar } from '@/components/ui'

export function EEATClient({ unlocked }: { unlocked: boolean }) {
  return (
    <ProToolPage
      toolId="eeat"
      title="E-E-A-T Analysis"
      description="Deep analysis of Experience, Expertise, Authoritativeness and Trustworthiness signals"
      plan="Pro"
      unlocked={unlocked}
      needsContent
      getBody={(content, summary) => ({ content, summary })}
      renderResult={(data) => {
        const d = data as {
          overall: number; summary: string
          dimensions: Record<string, { score: number; finding: string }>
          recommendations: string[]
        }
        const sc = (v: number) => v >= 70 ? 'text-emerald-600' : v >= 40 ? 'text-amber-600' : 'text-red-600'
        const dimLabels: Record<string, string> = {
          experience: 'Experience', expertise: 'Expertise',
          authoritativeness: 'Authoritativeness', trustworthiness: 'Trustworthiness',
        }
        return (
          <div className="space-y-4">
            <Card className="flex items-center gap-5">
              <div className="text-center flex-shrink-0">
                <div className={`text-4xl font-black ${sc(d.overall)}`}>{d.overall}</div>
                <div className="text-xs text-slate-400 mt-1">E-E-A-T Score</div>
              </div>
              <p className="text-sm text-slate-600 flex-1">{d.summary}</p>
            </Card>
            <Card>
              <h2 className="text-sm font-bold mb-4">Dimension Breakdown</h2>
              {Object.entries(d.dimensions ?? {}).map(([key, dim]) => (
                <div key={key} className="mb-4">
                  <ScoreBar value={dim.score} label={dimLabels[key] ?? key} />
                  <p className="text-xs text-slate-500 -mt-1">{dim.finding}</p>
                </div>
              ))}
            </Card>
            <div style={{display:'flex',gap:'8px',marginTop:'4px',flexWrap:'wrap'}}>
              <button onClick={() => exportEEATCSV(d)} style={{padding:'7px 14px',borderRadius:'8px',border:'1px solid #e2e8f0',background:'#f8fafc',fontSize:'12px',fontWeight:600,cursor:'pointer'}}>↓ CSV</button>
              <button onClick={() => exportEEATPDF(d)} style={{padding:'7px 14px',borderRadius:'8px',border:'1px solid #e2e8f0',background:'#f8fafc',fontSize:'12px',fontWeight:600,cursor:'pointer'}}>↓ PDF</button>
            </div>
            {d.recommendations?.length > 0 && (
              <Card>
                <h2 className="text-sm font-bold mb-3">Recommendations</h2>
                <div className="space-y-2">
                  {d.recommendations.map((r, i) => (
                    <div key={i} className="flex gap-2 text-sm">
                      <span className="text-brand-600 font-bold flex-shrink-0">→</span>
                      <span>{r}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        )
      }}
    />
  )
}
