import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { MDXRemote } from 'next-mdx-remote/rsc'
import { getAllPosts, getPost } from '@/lib/blog'
import { PageHeader } from '@/components/page-header'

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

  return (
    <div className="min-h-screen bg-white">
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

        <p className="text-lg text-slate-500 leading-relaxed mb-10 pb-10 border-b border-slate-100">
          {post.description}
        </p>

        <div className="prose prose-slate prose-headings:font-bold prose-headings:tracking-tight prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline prose-code:bg-slate-100 prose-code:px-1 prose-code:rounded prose-code:text-sm prose-strong:text-slate-900 max-w-none">
          {post.contentType === 'html'
            ? <div dangerouslySetInnerHTML={{ __html: post.content }} />
            : <MDXRemote source={post.content} />
          }
        </div>

        <div className="mt-16 pt-10 border-t border-slate-100 rounded-2xl bg-blue-50 p-8">
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
