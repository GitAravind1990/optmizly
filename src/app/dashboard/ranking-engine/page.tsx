import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { RankingEngineClient } from './client'

export default async function RankingEnginePage() {
  const { userId: clerkId } = await auth()
  let unlocked = false
  if (clerkId) {
    const user = await prisma.user.findUnique({ where: { clerkId }, select: { plan: true } })
    unlocked = user?.plan === 'PRO' || user?.plan === 'AGENCY'
  }
  return <RankingEngineClient unlocked={unlocked} />
}
