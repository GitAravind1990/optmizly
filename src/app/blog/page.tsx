import type { Metadata } from 'next'
import Link from 'next/link'
import { getAllPosts } from '@/lib/blog'

export const metadata: Metadata = {
  title: 'Blog â€” SEO & AI Search Insights',
  description: 'Actionable guides on semantic SEO, E-E-A-T, topical authority, AI citations, and ranking in the age of AI search.',
  alternates: { canonical: '/blog' },
  openGraph: {
    title: 'Optmizly Blog â€” SEO & AI Search Insights',
    description: 'Actionable guides on semantic SEO, E-E-A-T, topical authority, and AI citations.',
    url: '/blog',
  },
}

const CATEGORY_COLORS: Record<string, string> = {
  'AI Search': 'bg-blue-50 text-blue-700',
  'SEO Fundamentals': 'bg-emerald-50 text-emerald-700',
  'SEO Strategy': 'bg-violet-50 text-violet-700',
}

export default async function BlogPage() {
  const posts = await getAllPosts()

  return (
    <div className="min-h-screen bg-white">
      <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-6 h-16">
          <Link href="/" className="flex items-center gap-2 font-extrabold text-slate-900 text-lg tracking-tight">
            <span className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white text-sm">â—ˆ</span>
            Optmizly
          </Link>
          <div className="flex-1" />
          <Link href="/blog" className="text-sm font-semibold text-blue-600">Blog</Link>
          <Link href="/pricing" className="text-sm font-medium text-slate-600 hover:text-slate-900">Pricing</Link>
          <Link href="/signup" className="ml-2 rounded-full bg-blue-600 px-5 py-2 text-sm font-bold text-white hover:bg-blue-700 transition-colors">
            Get Started Free â†’
          </Link>
        </div>
      </nav>

      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-4xl font-black tracking-tight text-slate-900 mb-3">Blog</h1>
        <p className="text-slate-500 text-lg mb-12">SEO and AI search insights for content teams and agencies.</p>

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
              <Link href={`/blog/${post.slug}`} className="inline-flex items-center gap-1 mt-4 text-sm font-semibold text-blue-600 hover:text-blue-700">
                Read article â†’
              </Link>
            </article>
          ))}
        </div>
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

