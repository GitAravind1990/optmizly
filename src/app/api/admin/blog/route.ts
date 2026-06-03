import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/adminAuth'

export async function GET() {
  const check = await requireAdmin()
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status })

  const posts = await prisma.blogPost.findMany({
    orderBy: { createdAt: 'desc' },
    select: { id: true, slug: true, title: true, category: true, published: true, publishedAt: true, createdAt: true, readingTime: true },
  })
  return NextResponse.json(posts)
}

export async function POST(req: NextRequest) {
  const check = await requireAdmin()
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status })

  const body = await req.json()
  const { slug, title, description, content, contentType, category, tags, featuredImage, readingTime, published, scheduledAt } = body

  if (!slug || !title || !content) {
    return NextResponse.json({ error: 'slug, title, and content are required' }, { status: 400 })
  }

  const post = await prisma.blogPost.create({
    data: {
      slug,
      title,
      description: description ?? '',
      content,
      contentType: contentType ?? 'html',
      category: category ?? 'SEO',
      tags: tags ?? '',
      featuredImage: featuredImage || null,
      readingTime: readingTime ?? '5 min read',
      published: published ?? false,
      publishedAt: published ? new Date() : null,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
    },
  })
  return NextResponse.json(post, { status: 201 })
}
