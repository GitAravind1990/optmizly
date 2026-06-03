'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const CATEGORIES = ['AI Search', 'SEO Fundamentals', 'SEO Strategy', 'Technical SEO', 'Content Marketing', 'Local SEO']

interface PostData {
  id?: string
  slug: string
  title: string
  description: string
  content: string
  category: string
  readingTime: string
  published: boolean
}

interface Props {
  initial?: PostData
  mode: 'new' | 'edit'
}

export default function BlogEditor({ initial, mode }: Props) {
  const router = useRouter()
  const [form, setForm] = useState<PostData>(initial ?? {
    slug: '', title: '', description: '', content: '', category: 'SEO Strategy', readingTime: '5 min read', published: false,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<'write' | 'preview'>('write')

  function set(field: keyof PostData, value: string | boolean) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function autoSlug(title: string) {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  }

  async function handleSave(publish?: boolean) {
    setError('')
    setSaving(true)
    try {
      const payload = { ...form, published: publish !== undefined ? publish : form.published }
      const url = mode === 'edit' ? `/api/admin/blog/${initial!.id}` : '/api/admin/blog'
      const method = mode === 'edit' ? 'PUT' : 'POST'
      const r = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!r.ok) throw new Error((await r.json()).error ?? 'Save failed')
      router.push('/admin/blog')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <button onClick={() => router.push('/admin/blog')} className="text-sm text-slate-400 hover:text-slate-600">← All Posts</button>
          <h1 className="text-2xl font-black mt-1">{mode === 'new' ? 'New Post' : 'Edit Post'}</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleSave(false)}
            disabled={saving}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            Save Draft
          </button>
          <button
            onClick={() => handleSave(true)}
            disabled={saving}
            className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-bold text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Publish'}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="grid grid-cols-3 gap-6">
        {/* Main content */}
        <div className="col-span-2 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Title</label>
            <input
              value={form.title}
              onChange={e => {
                set('title', e.target.value)
                if (mode === 'new') set('slug', autoSlug(e.target.value))
              }}
              placeholder="Post title"
              className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Description</label>
            <textarea
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="Meta description (shown in search results and blog listing)"
              rows={2}
              className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">Content (Markdown)</label>
              <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs">
                <button onClick={() => setTab('write')} className={`px-3 py-1 font-semibold transition-colors ${tab === 'write' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>Write</button>
                <button onClick={() => setTab('preview')} className={`px-3 py-1 font-semibold transition-colors ${tab === 'preview' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>Preview</button>
              </div>
            </div>
            {tab === 'write' ? (
              <textarea
                value={form.content}
                onChange={e => set('content', e.target.value)}
                placeholder="Write your post in Markdown / MDX..."
                rows={28}
                className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
              />
            ) : (
              <div className="w-full rounded-lg border border-slate-200 px-6 py-4 min-h-[28rem] prose prose-slate max-w-none text-sm overflow-auto bg-white">
                <div dangerouslySetInnerHTML={{ __html: markdownToHtml(form.content) }} />
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 p-4 space-y-4">
            <h3 className="font-bold text-sm text-slate-700">Post Settings</h3>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Slug</label>
              <input
                value={form.slug}
                onChange={e => set('slug', e.target.value)}
                placeholder="url-friendly-slug"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-slate-400 mt-1">/blog/{form.slug || 'your-slug'}</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Category</label>
              <select
                value={form.category}
                onChange={e => set('category', e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Reading Time</label>
              <input
                value={form.readingTime}
                onChange={e => set('readingTime', e.target.value)}
                placeholder="5 min read"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.published}
                  onChange={e => set('published', e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm font-semibold text-slate-700">Published</span>
              </label>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 p-4 space-y-2">
            <h3 className="font-bold text-sm text-slate-700">Markdown Tips</h3>
            <div className="text-xs text-slate-500 space-y-1 font-mono">
              <div><span className="text-slate-400"># H1</span> — Page title</div>
              <div><span className="text-slate-400">## H2</span> — Section</div>
              <div><span className="text-slate-400">**bold**</span> — Bold text</div>
              <div><span className="text-slate-400">*italic*</span> — Italic</div>
              <div><span className="text-slate-400">- item</span> — Bullet list</div>
              <div><span className="text-slate-400">`code`</span> — Inline code</div>
              <div><span className="text-slate-400">[text](url)</span> — Link</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Minimal markdown → HTML for preview (no extra deps)
function markdownToHtml(md: string): string {
  return md
    .replace(/^### (.+)$/gm, '<h3 class="text-lg font-bold mt-6 mb-2">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold mt-8 mb-3">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-black mt-8 mb-4">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code class="bg-slate-100 px-1 rounded text-xs">$1</code>')
    .replace(/^\- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4 list-decimal">$2</li>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" class="text-blue-600 underline">$1</a>')
    .replace(/\n\n/g, '</p><p class="my-3">')
    .replace(/^(?!<[h|l|p])(.+)$/gm, '<p class="my-3">$1</p>')
}
