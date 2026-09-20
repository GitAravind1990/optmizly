import { prisma } from '@/lib/prisma'

export interface PostMeta {
  slug: string
  title: string
  description: string
  date: string
  /**
   * Last edit, as an ISO date — the sitemap's `lastmod` and the article schema's
   * `dateModified`.
   *
   * These used to be the publish date, which meant an edited post kept advertising that
   * nothing had changed. Measured 2026-09-20: the Aug 12 rewrite of three flagship posts
   * moved `updatedAt` and nothing else, so Search Console still showed them last crawled
   * 2026-07-18 — Google had never seen the new titles. A `lastmod` that cannot move is a
   * recrawl request that is never made.
   *
   * Never earlier than `date`: three posts carry a `publishedAt` backdated to 2025, and a
   * `dateModified` before `datePublished` is invalid structured data.
   */
  updated: string
  readingTime: string
  category: string
  featuredImage?: string | null
  tags?: string
  author: string
  authorTitle: string
}

export interface Post extends PostMeta {
  content: string
  contentType: string
}

/** Columns every PostMeta needs. One constant so a new field cannot reach the type without
 *  reaching all three queries — `updatedAt` existed on the model for months while no query
 *  selected it, which is how the sitemap kept serving publish dates. */
const META_SELECT = {
  slug: true, title: true, description: true, publishedAt: true, updatedAt: true,
  readingTime: true, category: true, featuredImage: true, tags: true,
  author: true, authorTitle: true,
} as const

type MetaRow = {
  publishedAt: Date | null
  updatedAt: Date
} & Omit<PostMeta, 'date' | 'updated'>

const isoDay = (d: Date): string => d.toISOString().split('T')[0]

/** Adds the two derived date fields. See `PostMeta.updated` for why it clamps. */
function toMeta<T extends MetaRow>(p: T): T & { date: string; updated: string } {
  const published = p.publishedAt
  return {
    ...p,
    date: published ? isoDay(published) : '',
    updated: isoDay(published && published > p.updatedAt ? published : p.updatedAt),
  }
}

export async function getAllPosts(): Promise<PostMeta[]> {
  try {
    const posts = await prisma.blogPost.findMany({
      where: { published: true },
      orderBy: { publishedAt: 'desc' },
      select: META_SELECT,
    })
    return posts.map(toMeta)
  } catch {
    return []
  }
}

export async function getRelatedPosts(slug: string, category: string, limit = 3): Promise<PostMeta[]> {
  try {
    const same = await prisma.blogPost.findMany({
      where: { published: true, category, slug: { not: slug } },
      orderBy: { publishedAt: 'desc' },
      take: limit,
      select: META_SELECT,
    })
    if (same.length >= limit) return same.map(toMeta)
    const needed = limit - same.length
    const sameSlugs = [slug, ...same.map(p => p.slug)]
    const rest = await prisma.blogPost.findMany({
      where: { published: true, slug: { notIn: sameSlugs } },
      orderBy: { publishedAt: 'desc' },
      take: needed,
      select: META_SELECT,
    })
    return [...same, ...rest].map(toMeta)
  } catch {
    return []
  }
}

export async function getPost(slug: string): Promise<Post | null> {
  try {
    const post = await prisma.blogPost.findUnique({ where: { slug, published: true } })
    if (!post) return null
    return toMeta(post)
  } catch {
    return null
  }
}
