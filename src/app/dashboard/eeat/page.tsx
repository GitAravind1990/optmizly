import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { EEATClient } from './client'

export default async function EEATPage() {
  const { userId: clerkId } = await auth()
  const user = clerkId ? await prisma.user.findUnique({ where: { clerkId } }) : null
  const unlocked = user?.plan === 'PRO' || user?.plan === 'AGENCY'
  return <EEATClient unlocked={unlocked} />
}
