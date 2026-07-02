import type { Metadata } from 'next'
import Link from 'next/link'
import { getAllPosts } from '@/lib/blog'
import { PageHeader } from '@/components/page-header'

export const metadata: Metadata = {
  title: 'Blog — SEO & AI Search Insights',
  description: 'Actionable guides on semantic SEO, E-E-A-T, topical authority, AI citations, and ranking in the age of AI search.',
  alternates: { canonical: '/blog' },
  openGraph: {
    title: 'Optmizly Blog — SEO & AI Search Insights',
    description: 'Actionable guides on semantic SEO, E-E-A-T, topical authority, and AI citations.',
    url: '/blog',
  },
}

const CATEGORIES = ['AI Search', 'SEO Fundamentals', 'SEO Strategy'] as const

const CATEGORY_COLORS: Record<string, string> = {
  'AI Search': 'bg-blue-50 text-blue-700',
  'SEO Fundamentals': 'bg-emerald-50 text-emerald-700',
  'SEO Strategy': 'bg-violet-50 text-violet-700',
}

const CATEGORY_ACTIVE: Record<string, string> = {
  'AI Search': 'bg-blue-600 text-white',
  'SEO Fundamentals': 'bg-emerald-600 text-white',
  'SEO Strategy': 'bg-violet-600 text-white',
}

export default async function BlogPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const { category } = await searchParams
  const allPosts = await getAllPosts()
  const posts = category ? allPosts.filter(p => p.category === category) : allPosts

  return (
    <div className="min-h-screen bg-white">
      <PageHeader />

      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-4xl font-black tracking-tight text-slate-900 mb-3">Blog</h1>
        <p className="text-slate-500 text-lg mb-8">SEO and AI search insights for content teams and agencies.</p>

        <div className="flex flex-wrap gap-2 mb-10">
          <Link
            href="/blog"
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors border ${
              !category
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400 hover:text-slate-700'
            }`}
          >
            All ({allPosts.length})
          </Link>
          {CATEGORIES.map(cat => (
            <Link
              key={cat}
              href={`/blog?category=${encodeURIComponent(cat)}`}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors border ${
                category === cat
                  ? `${CATEGORY_ACTIVE[cat]} border-transparent`
                  : `bg-white border-slate-200 hover:border-slate-400 ${CATEGORY_COLORS[cat]?.replace('bg-', 'hover:bg-').split(' ')[0]} text-slate-500 hover:text-slate-700`
              }`}
            >
              {cat} ({allPosts.filter(p => p.category === cat).length})
            </Link>
          ))}
        </div>

        {posts.length === 0 ? (
          <p className="text-slate-400 text-sm py-12 text-center">No posts in this category yet.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {posts.map(post => (
              <article key={post.slug} className="py-8 first:pt-0">
                <div className="flex items-center gap-3 mb-3">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${CATEGORY_COLORS[post.category] ?? 'bg-slate-100 text-slate-600'}`}>
                    {post.category}
                  </span>
                  <span className="text-xs text-slate-400">{post.readingTime}</span>
                  <span className="text-xs text-slate-400">
                    {new Date(post.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
                <Link href={`/blog/${post.slug}`} className="group">
                  <h2 className="text-xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors mb-2 leading-snug">
                    {post.title}
                  </h2>
                  <p className="text-slate-500 text-sm leading-relaxed">{post.description}</p>
                </Link>
                <div className="flex items-center justify-between mt-4">
                  <Link href={`/blog/${post.slug}`} className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700">
                    Read article →
                  </Link>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-600 to-blue-400 flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {post.author.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <span className="text-xs text-slate-500">{post.author}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      <footer className="border-t border-slate-100 py-8 mt-8">
        <div className="mx-auto max-w-3xl px-6 flex flex-wrap gap-4 text-xs text-slate-400">
          <Link href="/" className="hover:text-slate-600">Home</Link>
          <Link href="/pricing" className="hover:text-slate-600">Pricing</Link>
          <Link href="/blog" className="hover:text-slate-600">Blog</Link>
          <Link href="/privacy" className="hover:text-slate-600">Privacy</Link>
          <Link href="/terms" className="hover:text-slate-600">Terms</Link>
        </div>
      </footer>
    </div>
  )
}
