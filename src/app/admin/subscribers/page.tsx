'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Subscriber {
  id: string
  email: string
  firstName: string | null
  createdAt: string
}

export default function AdminSubscribersPage() {
  const router = useRouter()
  const [data, setData] = useState<{ subscribers: Subscriber[]; total: number; pages: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [deleting, setDeleting] = useState<string | null>(null)

  const load = useCallback(async (q: string, p: number) => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(p) })
    if (q) params.set('search', q)
    const r = await fetch(`/api/admin/subscribers?${params}`)
    if (r.status === 403) { router.push('/'); return }
    setData(await r.json())
    setLoading(false)
  }, [router])

  useEffect(() => { load(search, page) }, [load, search, page])

  async function handleDelete(sub: Subscriber) {
    if (!confirm(`Remove ${sub.email} from subscribers?`)) return
    setDeleting(sub.id)
    await fetch('/api/admin/subscribers', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: sub.id }),
    })
    setData(d => d ? { ...d, subscribers: d.subscribers.filter(s => s.id !== sub.id), total: d.total - 1 } : d)
    setDeleting(null)
  }

  function handleSearch(e: React.ChangeEvent<HTMLInputElement>) {
    setSearch(e.target.value)
    setPage(1)
  }

  return (
    <div className="space-y-6 p-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black">Newsletter Subscribers</h1>
          {data && <p className="text-sm text-gray-500 mt-1">{data.total} total subscribers</p>}
        </div>
        <div className="flex items-center gap-3">
          <Link href="/admin/dashboard" className="bg-slate-600 text-white px-4 py-2 rounded hover:bg-slate-700 text-sm font-semibold">
            ← Dashboard
          </Link>
          <Link href="/admin/blog" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm font-semibold">
            Blog Posts
          </Link>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={handleSearch}
          placeholder="Search by email or name…"
          className="border rounded-lg px-4 py-2 text-sm w-72 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {loading && <span className="text-sm text-gray-400">Loading…</span>}
      </div>

      <div className="bg-white border rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              {['#', 'Email', 'First Name', 'Subscribed', 'Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-left font-semibold text-gray-700">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data?.subscribers.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-gray-400">
                  {search ? 'No subscribers match your search.' : 'No subscribers yet.'}
                </td>
              </tr>
            )}
            {data?.subscribers.map((sub, i) => (
              <tr key={sub.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-400 text-xs">{(page - 1) * 50 + i + 1}</td>
                <td className="px-4 py-3 font-medium text-gray-900">{sub.email}</td>
                <td className="px-4 py-3 text-gray-500">{sub.firstName ?? <span className="text-gray-300 italic">—</span>}</td>
                <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                  {new Date(sub.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => handleDelete(sub)}
                    disabled={deleting === sub.id}
                    className="text-red-500 hover:underline text-xs font-medium disabled:opacity-40"
                  >
                    {deleting === sub.id ? 'Removing…' : 'Remove'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data && data.pages > 1 && (
        <div className="flex items-center gap-2 justify-center">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 rounded border text-sm font-medium disabled:opacity-40 hover:bg-gray-50"
          >
            ← Prev
          </button>
          <span className="text-sm text-gray-500">Page {page} of {data.pages}</span>
          <button
            onClick={() => setPage(p => Math.min(data.pages, p + 1))}
            disabled={page === data.pages}
            className="px-3 py-1.5 rounded border text-sm font-medium disabled:opacity-40 hover:bg-gray-50"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  )
}
