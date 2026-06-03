import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import GutenbergEditor from '../../GutenbergEditor'

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const post = await prisma.blogPost.findUnique({ where: { id } })
  if (!post) notFound()

  return (
    <GutenbergEditor
      mode="edit"
      initial={{
        id: post.id,
        slug: post.slug,
        title: post.title,
        description: post.description,
        content: post.content,
        contentType: post.contentType,
        category: post.category,
        tags: post.tags,
        featuredImage: post.featuredImage ?? '',
        readingTime: post.readingTime,
        published: post.published,
        scheduledAt: post.scheduledAt?.toISOString().slice(0, 16) ?? '',
      }}
    />
  )
}
