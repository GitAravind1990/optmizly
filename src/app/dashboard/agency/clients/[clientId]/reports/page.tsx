'use client'

import { useCallback, useEffect, useState, use } from 'react'
import Link from 'next/link'

type Report = {
  id: string
  month: number
  year: number
  trafficChange: number | null
  backlinksAdded: number | null
  emailSent: boolean
  emailSentAt: string | null
  clientViewed: boolean
  clientViewedAt: string | null
  generatedAt: string
}

type Client = {
  id: string
  name: string
  website: string
  email: string
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export default function ClientReportsPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = use(params)
  const [client, setClient] = useState<Client | null>(null)
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [emailingId, setEmailingId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const loadReports = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/agency/clients/${clientId}/reports`)
    if (res.ok) {
      const data = await res.json()
      setClient(data.client)
      setReports(data.reports)
    }
    setLoading(false)
  }, [clientId])

  useEffect(() => {
    loadReports()
  }, [loadReports])

  async function handleGenerate() {
    setGenerating(true)
    setError('')
    const now = new Date()
    try {
      const res = await fetch('/api/agency/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          month: now.getMonth() + 1,
          year: now.getFullYear(),
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed to generate report'); return }
      loadReports()
    } catch {
      setError('Network error')
    } finally {
      setGenerating(false)
    }
  }

  async function handleEmail(reportId: string) {
    setEmailingId(reportId)
    try {
      const res = await fetch('/api/agency/reports/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId }),
      })
      if (res.ok) loadReports()
    } finally {
      setEmailingId(null)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center flex-1 py-24 text-slate-400 text-sm">Loading...</div>
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-1">
          <Link href="/dashboard/agency/clients" className="text-xs text-slate-400 hover:text-slate-600">
            ← All Clients
          </Link>
        </div>
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">{client?.name}</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              <a href={client?.website} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline">{client?.website}</a>
              <span className="ml-2 text-slate-400">· {client?.email}</span>
            </p>
          </div>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-bold hover:bg-brand-700 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {generating ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Generating...
              </>
            ) : '+ Generate This Month'}
          </button>
        </div>

        {error && <p className="mb-4 text-sm text-red-600 bg-red-50 rounded-lg p-3">{error}</p>}

        {reports.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-slate-400">
                <rect x="3" y="12" width="4" height="8" rx="1"/>
                <rect x="9" y="7" width="4" height="13" rx="1"/>
                <rect x="15" y="3" width="4" height="17" rx="1"/>
              </svg>
            </div>
            <p className="text-slate-600 font-medium">No reports yet</p>
            <p className="text-slate-400 text-sm mt-1">Click "Generate This Month" to create the first report</p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Period</th>
                  <th className="px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Traffic</th>
                  <th className="px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Backlinks</th>
                  <th className="px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reports.map(report => {
                  const trafficPos = report.trafficChange !== null && report.trafficChange >= 0
                  return (
                    <tr key={report.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-4">
                        <div className="font-semibold text-slate-900 text-sm">{MONTH_NAMES[report.month - 1]} {report.year}</div>
                        <div className="text-xs text-slate-400 mt-0.5">Generated {new Date(report.generatedAt).toLocaleDateString()}</div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`text-sm font-bold ${report.trafficChange === null ? 'text-slate-400' : trafficPos ? 'text-green-600' : 'text-red-500'}`}>
                          {report.trafficChange === null ? '—' : `${trafficPos ? '+' : ''}${report.trafficChange}%`}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm font-semibold text-slate-700">
                          {report.backlinksAdded === null ? '—' : `+${report.backlinksAdded}`}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex gap-1.5 flex-wrap">
                          {report.emailSent ? (
                            <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-medium">Email sent</span>
                          ) : (
                            <span className="text-xs bg-slate-100 text-slate-400 px-2 py-0.5 rounded-full">Not sent</span>
                          )}
                          {report.clientViewed && (
                            <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium">Viewed</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex gap-2 justify-end">
                          <a
                            href={`/agency/reports/${report.id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1.5 rounded-lg border border-brand-200 text-brand-600 text-xs font-medium hover:bg-brand-50 transition-colors"
                          >
                            View
                          </a>
                          <button
                            onClick={() => handleEmail(report.id)}
                            disabled={emailingId === report.id || report.emailSent}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-xs font-medium hover:bg-slate-50 transition-colors disabled:opacity-40"
                          >
                            {emailingId === report.id ? 'Sending...' : report.emailSent ? 'Sent' : 'Email'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
