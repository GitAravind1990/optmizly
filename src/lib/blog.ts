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
      select: { slug: true, title: true, description: true, publishedAt: true, readingTime: true, category: true, featuredImage: true, tags: true },
    })
    return posts.map(p => ({ ...p, date: p.publishedAt?.toISOString().split('T')[0] ?? '' }))
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
