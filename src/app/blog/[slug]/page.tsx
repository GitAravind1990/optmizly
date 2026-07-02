import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { MDXRemote } from 'next-mdx-remote/rsc'
import { getAllPosts, getPost, getRelatedPosts } from '@/lib/blog'
import { PageHeader } from '@/components/page-header'
import { BlogSubscribeForm } from '@/components/blog-subscribe-form'
import { extractFaqPairs, buildFaqJsonLd } from '@/lib/faq-schema'

export async function generateStaticParams() {
  const posts = await getAllPosts()
  return posts.map(p => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const post = await getPost(slug)
  if (!post) return {}
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: `/blog/${slug}` },
    openGraph: {
      title: post.title,
      description: post.description,
      url: `/blog/${slug}`,
      type: 'article',
      publishedTime: post.date,
    },
  }
}

const CATEGORY_COLORS: Record<string, string> = {
  'AI Search': 'bg-blue-50 text-blue-700',
  'SEO Fundamentals': 'bg-emerald-50 text-emerald-700',
  'SEO Strategy': 'bg-violet-50 text-violet-700',
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = await getPost(slug)
  if (!post) notFound()
  const [relatedPosts, faqPairs] = await Promise.all([
    getRelatedPosts(slug, post.category),
    Promise.resolve(post.contentType === 'html' ? extractFaqPairs(post.content) : []),
  ])

  return (
    <div className="min-h-screen bg-white">
      {faqPairs.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: buildFaqJsonLd(faqPairs) }}
        />
      )}
      <PageHeader />

      <main className="mx-auto max-w-2xl px-6 py-16">
        <Link href="/blog" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-600 mb-8">
          ← Back to Blog
        </Link>

        <div className="flex items-center gap-3 mb-5">
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${CATEGORY_COLORS[post.category] ?? 'bg-slate-100 text-slate-600'}`}>
            {post.category}
          </span>
          <span className="text-xs text-slate-400">{post.readingTime}</span>
          <span className="text-xs text-slate-400">
            {new Date(post.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </span>
        </div>

        <h1 className="text-3xl font-black tracking-tight text-slate-900 leading-tight mb-6">
          {post.title}
        </h1>

        <p className="text-lg text-slate-500 leading-relaxed mb-8">
          {post.description}
        </p>

        <div className="flex items-center gap-3 mb-10 pb-10 border-b border-slate-100">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-blue-400 flex items-center justify-center text-white text-sm font-bold shrink-0">
            {post.author.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-900">{post.author}</p>
            <p className="text-xs text-slate-400">{post.authorTitle}</p>
          </div>
          <div className="flex items-center gap-3">
            <a href="https://x.com/optmizly" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-slate-700 transition-colors" aria-label="Twitter / X">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.91-5.622Zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            </a>
            <a href="https://linkedin.com/company/optmizly" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-slate-700 transition-colors" aria-label="LinkedIn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
            </a>
          </div>
        </div>

        <div className="prose prose-slate prose-headings:font-bold prose-headings:tracking-tight prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline prose-code:bg-slate-100 prose-code:px-1 prose-code:rounded prose-code:text-sm prose-strong:text-slate-900 max-w-none">
          {post.contentType === 'html'
            ? <div dangerouslySetInnerHTML={{ __html: post.content }} />
            : <MDXRemote source={post.content} />
          }
        </div>

        <div className="mt-12">
          <BlogSubscribeForm />
        </div>

        {relatedPosts.length > 0 && (
          <div className="mt-12">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Keep reading</p>
            <div className="space-y-3">
              {relatedPosts.map(p => (
                <Link
                  key={p.slug}
                  href={`/blog/${p.slug}`}
                  className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-4 hover:border-blue-200 hover:shadow-sm transition-all group"
                >
                  <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5 ${CATEGORY_COLORS[p.category] ?? 'bg-slate-100 text-slate-600'}`}>
                    {p.category}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 group-hover:text-blue-700 transition-colors leading-snug mb-0.5">
                      {p.title}
                    </p>
                    <p className="text-xs text-slate-400">{p.readingTime}</p>
                  </div>
                  <span className="text-slate-300 group-hover:text-blue-400 transition-colors shrink-0 mt-0.5">→</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 rounded-2xl bg-blue-50 p-8">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white text-xs">◈</span>
            <span className="font-bold text-slate-900">Optmizly</span>
          </div>
          <p className="text-slate-600 text-sm mb-5 leading-relaxed">
            Stop guessing. Use AI-powered tools to analyze your content, fix E-E-A-T signals, map topical authority, and get cited by ChatGPT and Perplexity.
          </p>
          <Link href="/signup" className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-blue-700 transition-colors">
            Try Optmizly Free →
          </Link>
        </div>
      </main>

      <footer className="border-t border-slate-100 py-8 mt-8">
        <div className="mx-auto max-w-2xl px-6 flex flex-wrap gap-4 text-xs text-slate-400">
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
