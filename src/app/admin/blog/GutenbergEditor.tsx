'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useEditor, EditorContent, useEditorState } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import ImageExt from '@tiptap/extension-image'
import LinkExt from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import CharacterCount from '@tiptap/extension-character-count'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import Typography from '@tiptap/extension-typography'
import Highlight from '@tiptap/extension-highlight'
import { Table, TableRow, TableCell, TableHeader } from '@tiptap/extension-table'

const CATEGORIES = ['AI Search', 'SEO Fundamentals', 'SEO Strategy', 'Technical SEO', 'Content Marketing', 'Local SEO']

interface PostData {
  id?: string
  slug: string
  title: string
  description: string
  content: string
  contentType: string
  category: string
  tags: string
  featuredImage: string
  readingTime: string
  published: boolean
  scheduledAt: string
}

interface Props {
  initial?: Partial<PostData> & { id?: string }
  mode: 'new' | 'edit'
}

function autoSlug(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function calcReadingTime(html: string): string {
  const words = html.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length
  return `${Math.max(1, Math.round(words / 200))} min read`
}

// Slash command menu component
function SlashMenu({ items, command, clientRect }: { items: any[], command: (item: any) => void, clientRect: (() => DOMRect) | null }) {
  const [selected, setSelected] = useState(0)
  const rect = clientRect?.()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') { setSelected(s => Math.min(s + 1, items.length - 1)); e.preventDefault() }
      if (e.key === 'ArrowUp') { setSelected(s => Math.max(s - 1, 0)); e.preventDefault() }
      if (e.key === 'Enter') { command(items[selected]); e.preventDefault() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [items, selected, command])

  if (!items.length || !rect) return null

  return (
    <div
      style={{ position: 'fixed', top: rect.bottom + 4, left: rect.left, zIndex: 9999 }}
      className="bg-white border border-slate-200 rounded-xl shadow-xl p-1.5 w-56 max-h-72 overflow-y-auto"
    >
      {items.map((item, i) => (
        <button key={item.title} onClick={() => command(item)}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors text-left ${i === selected ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-50'}`}
        >
          <span className="text-base w-5 text-center flex-shrink-0">{item.icon}</span>
          <div>
            <div className="font-semibold text-xs">{item.title}</div>
            <div className="text-xs text-slate-400">{item.desc}</div>
          </div>
        </button>
      ))}
    </div>
  )
}

const SLASH_ITEMS = [
  { icon: '¶', title: 'Paragraph', desc: 'Plain text', action: (e: any) => e.chain().focus().setParagraph().run() },
  { icon: 'H1', title: 'Heading 1', desc: 'Large section header', action: (e: any) => e.chain().focus().toggleHeading({ level: 1 }).run() },
  { icon: 'H2', title: 'Heading 2', desc: 'Medium section header', action: (e: any) => e.chain().focus().toggleHeading({ level: 2 }).run() },
  { icon: 'H3', title: 'Heading 3', desc: 'Small section header', action: (e: any) => e.chain().focus().toggleHeading({ level: 3 }).run() },
  { icon: '•', title: 'Bullet List', desc: 'Unordered list', action: (e: any) => e.chain().focus().toggleBulletList().run() },
  { icon: '1.', title: 'Ordered List', desc: 'Numbered list', action: (e: any) => e.chain().focus().toggleOrderedList().run() },
  { icon: '❝', title: 'Blockquote', desc: 'Highlighted quote', action: (e: any) => e.chain().focus().toggleBlockquote().run() },
  { icon: '<>', title: 'Code Block', desc: 'Monospace code block', action: (e: any) => e.chain().focus().toggleCodeBlock().run() },
  { icon: '―', title: 'Divider', desc: 'Horizontal rule', action: (e: any) => e.chain().focus().setHorizontalRule().run() },
  { icon: '⊞', title: 'Table', desc: '3×3 table', action: (e: any) => e.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
]

export default function GutenbergEditor({ initial, mode }: Props) {
  const router = useRouter()
  const [title, setTitle] = useState(initial?.title ?? '')
  const [slug, setSlug] = useState(initial?.slug ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [category, setCategory] = useState(initial?.category ?? 'SEO Strategy')
  const [tags, setTags] = useState(initial?.tags ?? '')
  const [featuredImage, setFeaturedImage] = useState(initial?.featuredImage ?? '')
  const [readingTime, setReadingTime] = useState(initial?.readingTime ?? '5 min read')
  const [published, setPublished] = useState(initial?.published ?? false)
  const [scheduledAt, setScheduledAt] = useState(initial?.scheduledAt ?? '')
  const [saving, setSaving] = useState(false)
  const [autoSaved, setAutoSaved] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [showLinkInput, setShowLinkInput] = useState(false)
  const [slashMenu, setSlashMenu] = useState<{ items: any[]; command: (i: any) => void; clientRect: (() => DOMRect) | null } | null>(null)
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isMarkdownContent = initial?.contentType !== 'html' && !!initial?.content
  const [markdownContent] = useState(isMarkdownContent ? initial!.content! : '')

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: { HTMLAttributes: { class: 'bg-slate-900 text-emerald-400 rounded-lg p-4 font-mono text-sm overflow-x-auto' } },
      }),
      ImageExt.configure({ HTMLAttributes: { class: 'rounded-xl max-w-full my-4' } }),
      LinkExt.configure({ openOnClick: false, HTMLAttributes: { class: 'text-blue-600 underline cursor-pointer' } }),
      Placeholder.configure({ placeholder: "Write something, or type '/' for blocks…" }),
      CharacterCount,
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Typography,
      Highlight.configure({ HTMLAttributes: { class: 'bg-yellow-100 px-0.5 rounded' } }),
      Table.configure({ resizable: false }),
      TableRow,
      TableCell,
      TableHeader,
    ],
    content: isMarkdownContent ? '' : (initial?.content ?? ''),
    editorProps: {
      attributes: { class: 'prose prose-slate prose-lg max-w-none focus:outline-none min-h-[60vh]' },
      handleKeyDown(view, event) {
        if (event.key === '/') {
          // Let the character be inserted first, then show menu
          setTimeout(() => {
            const { from } = view.state.selection
            const domNode = view.domAtPos(from)
            const el = domNode.node as Element
            const rect = el instanceof Element ? el.getBoundingClientRect() : null
            setSlashMenu({
              items: SLASH_ITEMS,
              command: (item) => {
                // Delete the "/" we just typed
                view.dispatch(view.state.tr.delete(from - 1, from))
                item.action(editor)
                setSlashMenu(null)
              },
              clientRect: rect ? () => rect : null,
            })
          }, 0)
        } else if (slashMenu) {
          if (!['ArrowDown', 'ArrowUp', 'Enter'].includes(event.key)) setSlashMenu(null)
        }
        return false
      },
    },
    onUpdate({ editor }) {
      const html = editor.getHTML()
      setReadingTime(calcReadingTime(html))
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
      autoSaveTimer.current = setTimeout(() => triggerAutoSave(html), 3000)
    },
  })

  async function triggerAutoSave(html: string) {
    if (mode !== 'edit' || !initial?.id || !slug || !title) return
    try {
      await fetch(`/api/admin/blog/${initial.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, title, description, content: html, contentType: 'html', category, tags, featuredImage, readingTime, published, scheduledAt: scheduledAt || null }),
      })
      setAutoSaved(new Date().toLocaleTimeString())
    } catch {}
  }

  async function handleSave(publishOverride?: boolean) {
    if (!title.trim()) { setError('Title is required'); return }
    if (!slug.trim()) { setError('Slug is required'); return }
    setError(''); setSaving(true)
    try {
      const content = editor ? editor.getHTML() : markdownContent
      const contentType = editor ? 'html' : 'markdown'
      const payload = { slug, title, description, content, contentType, category, tags, featuredImage, readingTime, published: publishOverride !== undefined ? publishOverride : published, scheduledAt: scheduledAt || null }
      const url = mode === 'edit' ? `/api/admin/blog/${initial!.id}` : '/api/admin/blog'
      const r = await fetch(url, { method: mode === 'edit' ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (!r.ok) throw new Error((await r.json()).error ?? 'Save failed')
      router.push('/admin/blog')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  function insertImage() {
    const url = prompt('Image URL:')
    if (url && editor) editor.chain().focus().setImage({ src: url, alt: '' }).run()
  }

  function applyLink() {
    if (linkUrl && editor) {
      editor.chain().focus().setLink({ href: linkUrl }).run()
      setLinkUrl(''); setShowLinkInput(false)
    }
  }

  const wordCount = editor?.storage.characterCount?.words() ?? 0
  const isActive = (name: string, attrs?: object) => editor?.isActive(name, attrs) ?? false

  const ToolBtn = ({ label, title: ttl, action, active, cls = '' }: { label: string; title: string; action: () => void; active?: boolean; cls?: string }) => (
    <button title={ttl} onClick={action}
      className={`px-2.5 py-1 rounded text-xs transition-colors ${cls} ${active ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
      {label}
    </button>
  )

  return (
    <div className="min-h-screen bg-white flex flex-col" onClick={() => slashMenu && setSlashMenu(null)}>
      {/* Slash command menu portal */}
      {slashMenu && (
        <SlashMenu items={slashMenu.items} command={slashMenu.command} clientRect={slashMenu.clientRect} />
      )}

      {/* Top bar */}
      <div className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
        <div className="flex items-center justify-between px-4 h-14 gap-4">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/admin/blog')} className="text-slate-400 hover:text-slate-700 text-sm font-medium">← Posts</button>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            {autoSaved && <span>Auto-saved {autoSaved}</span>}
            {wordCount > 0 && <span>{wordCount.toLocaleString()} words · {readingTime}</span>}
          </div>
          <div className="flex items-center gap-2">
            {initial?.slug && (
              <a href={`/blog/${initial.slug}`} target="_blank" rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors">Preview ↗</a>
            )}
            <button onClick={() => handleSave(false)} disabled={saving}
              className="px-4 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50">Save Draft</button>
            <button onClick={() => handleSave(true)} disabled={saving}
              className="px-4 py-1.5 rounded-lg bg-blue-600 text-xs font-bold text-white hover:bg-blue-700 transition-colors disabled:opacity-50">
              {saving ? 'Saving…' : published ? 'Update' : 'Publish'}
            </button>
          </div>
        </div>

        {/* Format toolbar */}
        {editor && (
          <div className="flex items-center gap-0.5 px-4 py-1.5 border-t border-slate-100 overflow-x-auto flex-wrap">
            <ToolBtn label="P" title="Paragraph" action={() => editor.chain().focus().setParagraph().run()} active={isActive('paragraph')} />
            <ToolBtn label="H1" title="Heading 1" action={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={isActive('heading', { level: 1 })} cls="font-bold" />
            <ToolBtn label="H2" title="Heading 2" action={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={isActive('heading', { level: 2 })} cls="font-bold" />
            <ToolBtn label="H3" title="Heading 3" action={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={isActive('heading', { level: 3 })} cls="font-bold" />
            <div className="w-px h-4 bg-slate-200 mx-1 flex-shrink-0" />
            <ToolBtn label="B" title="Bold" action={() => editor.chain().focus().toggleBold().run()} active={isActive('bold')} cls="font-black" />
            <ToolBtn label="I" title="Italic" action={() => editor.chain().focus().toggleItalic().run()} active={isActive('italic')} cls="italic" />
            <ToolBtn label="U" title="Underline" action={() => editor.chain().focus().toggleUnderline().run()} active={isActive('underline')} cls="underline" />
            <ToolBtn label="S" title="Strikethrough" action={() => editor.chain().focus().toggleStrike().run()} active={isActive('strike')} cls="line-through" />
            <ToolBtn label="HL" title="Highlight" action={() => editor.chain().focus().toggleHighlight().run()} active={isActive('highlight')} />
            <div className="w-px h-4 bg-slate-200 mx-1 flex-shrink-0" />
            <ToolBtn label="≡L" title="Align Left" action={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} />
            <ToolBtn label="≡C" title="Align Center" action={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} />
            <ToolBtn label="≡R" title="Align Right" action={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} />
            <div className="w-px h-4 bg-slate-200 mx-1 flex-shrink-0" />
            <ToolBtn label="• List" title="Bullet List" action={() => editor.chain().focus().toggleBulletList().run()} active={isActive('bulletList')} />
            <ToolBtn label="1. List" title="Ordered List" action={() => editor.chain().focus().toggleOrderedList().run()} active={isActive('orderedList')} />
            <ToolBtn label="❝ Quote" title="Blockquote" action={() => editor.chain().focus().toggleBlockquote().run()} active={isActive('blockquote')} />
            <ToolBtn label="</> Code" title="Code Block" action={() => editor.chain().focus().toggleCodeBlock().run()} active={isActive('codeBlock')} cls="font-mono" />
            <ToolBtn label="`code`" title="Inline Code" action={() => editor.chain().focus().toggleCode().run()} active={isActive('code')} cls="font-mono" />
            <div className="w-px h-4 bg-slate-200 mx-1 flex-shrink-0" />
            <ToolBtn label="🖼 Image" title="Insert Image" action={insertImage} />
            <ToolBtn label="⊞ Table" title="Insert Table" action={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} />
            <ToolBtn label="— Rule" title="Horizontal Rule" action={() => editor.chain().focus().setHorizontalRule().run()} />
            <div className="w-px h-4 bg-slate-200 mx-1 flex-shrink-0" />
            {showLinkInput ? (
              <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                <input value={linkUrl} onChange={e => setLinkUrl(e.target.value)} onKeyDown={e => e.key === 'Enter' && applyLink()}
                  placeholder="https://…" autoFocus
                  className="border border-slate-200 rounded px-2 py-0.5 text-xs w-44 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                <button onClick={applyLink} className="px-2 py-0.5 bg-blue-600 text-white rounded text-xs font-bold">Apply</button>
                <button onClick={() => { setShowLinkInput(false); editor.chain().focus().unsetLink().run() }}
                  className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">Remove</button>
              </div>
            ) : (
              <ToolBtn label="🔗 Link" title="Insert Link" action={() => setShowLinkInput(true)} active={isActive('link')} />
            )}
            <div className="flex-1" />
            <button onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}
              className="px-2.5 py-1 rounded text-xs text-slate-400 hover:bg-slate-100 disabled:opacity-30 transition-colors">↩</button>
            <button onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}
              className="px-2.5 py-1 rounded text-xs text-slate-400 hover:bg-slate-100 disabled:opacity-30 transition-colors">↪</button>
          </div>
        )}
      </div>

      {/* Main layout */}
      <div className="flex flex-1">
        {/* Editor area */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-8 py-10">
            {error && <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}

            <input
              value={title}
              onChange={e => { setTitle(e.target.value); if (mode === 'new') setSlug(autoSlug(e.target.value)) }}
              placeholder="Add title"
              className="w-full text-4xl font-black text-slate-900 placeholder:text-slate-300 border-none outline-none mb-8 leading-tight bg-transparent"
            />

            {isMarkdownContent && (
              <div className="mb-6 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
                <strong>Markdown post</strong> — The rich editor is empty. Edit in the text area below or{' '}
                <button onClick={() => editor?.commands.setContent('<p>' + markdownContent.slice(0, 200) + '</p>')}
                  className="underline font-semibold">load content into editor</button>.
                <textarea defaultValue={markdownContent} className="mt-3 w-full border border-amber-200 rounded-lg px-3 py-2 text-xs font-mono bg-white min-h-[200px] resize-y" />
              </div>
            )}

            {editor && <EditorContent editor={editor} />}
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-72 border-l border-slate-200 bg-slate-50 overflow-y-auto flex-shrink-0">
          <div className="p-4 space-y-4">

            {/* Status */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Status & Visibility</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${published ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                  {published ? 'Published' : 'Draft'}
                </span>
              </div>
              <div className="p-4 space-y-3">
                <label className="flex items-center gap-3 cursor-pointer" onClick={() => setPublished(p => !p)}>
                  <div className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${published ? 'bg-blue-600' : 'bg-slate-200'}`}>
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${published ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </div>
                  <span className="text-sm text-slate-700 font-medium">Published</span>
                </label>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Schedule (optional)</label>
                  <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                </div>
              </div>
            </div>

            {/* Permalink */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Permalink</span>
              </div>
              <div className="p-4 space-y-2">
                <input value={slug} onChange={e => setSlug(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  placeholder="url-friendly-slug" />
                <p className="text-xs text-slate-400 truncate">/blog/{slug || 'your-slug'}</p>
              </div>
            </div>

            {/* Category & Tags */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Category & Tags</span>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Category</label>
                  <select value={category} onChange={e => setCategory(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Tags <span className="font-normal text-slate-400">(comma-separated)</span></label>
                  <input value={tags} onChange={e => setTags(e.target.value)} placeholder="seo, ai, content"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                  {tags && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {tags.split(',').map(t => t.trim()).filter(Boolean).map(t => (
                        <span key={t} className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full font-medium">{t}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Featured Image */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Featured Image</span>
              </div>
              <div className="p-4 space-y-3">
                {featuredImage && <img src={featuredImage} alt="" className="w-full h-32 object-cover rounded-lg" />}
                <input value={featuredImage} onChange={e => setFeaturedImage(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
              </div>
            </div>

            {/* Excerpt & SEO */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Excerpt & SEO</span>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Meta Description</label>
                  <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
                    placeholder="Shown in search results…"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                  <p className={`text-xs mt-1 ${description.length > 160 ? 'text-red-500' : 'text-slate-400'}`}>{description.length}/160</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Reading Time</label>
                  <input value={readingTime} onChange={e => setReadingTime(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                  <p className="text-xs text-slate-400 mt-1">Auto-calculated from word count</p>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-3">Post Stats</div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Words', value: wordCount.toLocaleString() },
                  { label: 'Chars', value: (editor?.storage.characterCount?.characters() ?? 0).toLocaleString() },
                  { label: 'Read time', value: readingTime },
                  { label: 'Status', value: published ? 'Live' : 'Draft' },
                ].map(s => (
                  <div key={s.label} className="bg-slate-50 rounded-lg p-2 text-center">
                    <div className="text-sm font-bold text-slate-900">{s.value}</div>
                    <div className="text-xs text-slate-400">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-xs text-slate-400 text-center">Tip: Type <kbd className="bg-slate-100 px-1 rounded">/</kbd> in the editor to insert blocks</p>
          </div>
        </div>
      </div>
    </div>
  )
}
