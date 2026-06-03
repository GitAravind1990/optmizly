import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { CitationClient } from './client'

export default async function CitationPage() {
  const { userId: clerkId } = await auth()
  const user = clerkId ? await prisma.user.findUnique({ where: { clerkId } }) : null
  const unlocked = user?.plan === 'PRO' || user?.plan === 'AGENCY'
  return <CitationClient unlocked={unlocked} />
}
