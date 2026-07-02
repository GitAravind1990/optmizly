import { prisma } from '@/lib/prisma'

export interface PostMeta {
  slug: string
  title: string
  description: string
  date: string
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

export async function getAllPosts(): Promise<PostMeta[]> {
  try {
    const posts = await prisma.blogPost.findMany({
      where: { published: true },
      orderBy: { publishedAt: 'desc' },
      select: { slug: true, title: true, description: true, publishedAt: true, readingTime: true, category: true, featuredImage: true, tags: true, author: true, authorTitle: true },
    })
    return posts.map(p => ({ ...p, date: p.publishedAt?.toISOString().split('T')[0] ?? '' }))
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
      select: { slug: true, title: true, description: true, publishedAt: true, readingTime: true, category: true, featuredImage: true, tags: true, author: true, authorTitle: true },
    })
    if (same.length >= limit) return same.map(p => ({ ...p, date: p.publishedAt?.toISOString().split('T')[0] ?? '' }))
    const needed = limit - same.length
    const sameSlugs = [slug, ...same.map(p => p.slug)]
    const rest = await prisma.blogPost.findMany({
      where: { published: true, slug: { notIn: sameSlugs } },
      orderBy: { publishedAt: 'desc' },
      take: needed,
      select: { slug: true, title: true, description: true, publishedAt: true, readingTime: true, category: true, featuredImage: true, tags: true, author: true, authorTitle: true },
    })
    return [...same, ...rest].map(p => ({ ...p, date: p.publishedAt?.toISOString().split('T')[0] ?? '' }))
  } catch {
    return []
  }
}

export async function getPost(slug: string): Promise<Post | null> {
  try {
    const post = await prisma.blogPost.findUnique({ where: { slug, published: true } })
    if (!post) return null
    return { ...post, date: post.publishedAt?.toISOString().split('T')[0] ?? '' }
  } catch {
    return null
  }
}
