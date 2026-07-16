import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { apiError, apiSuccess } from '@/lib/api'
import { sendBlogSubscribeEmail } from '@/lib/email'
import { getAllPosts } from '@/lib/blog'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const { email, firstName } = await req.json()

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return apiError({ message: 'Valid email required', status: 400 })
    }

    const existing = await prisma.blogSubscriber.findUnique({ where: { email } })

    await prisma.blogSubscriber.upsert({
      where: { email },
      create: { email, firstName: firstName?.trim() || null },
      update: {},
    })

    if (!existing) {
      const posts = await getAllPosts()
      const latest = posts[0]
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://optmizly.com'
      await sendBlogSubscribeEmail(
        email,
        firstName?.trim() || undefined,
        latest?.title,
        latest ? `${appUrl}/blog/${latest.slug}` : undefined,
      ).catch(() => {})
    }

    return apiSuccess({ ok: true })
  } catch (e) {
    return apiError(e)
  }
}
