import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/adminAuth'

export async function GET(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status })

  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search')?.trim() ?? ''
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const limit = 50

  const where = search
    ? { OR: [{ email: { contains: search, mode: 'insensitive' as const } }, { firstName: { contains: search, mode: 'insensitive' as const } }] }
    : {}

  const [total, subscribers] = await Promise.all([
    prisma.blogSubscriber.count({ where }),
    prisma.blogSubscriber.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: { id: true, email: true, firstName: true, createdAt: true },
    }),
  ])

  return NextResponse.json({ subscribers, total, page, pages: Math.ceil(total / limit) })
}

export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  await prisma.blogSubscriber.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
