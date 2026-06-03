import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { TrackerClient } from './client'

export default async function TrackerPage() {
  const { userId: clerkId } = await auth()
  const user = clerkId ? await prisma.user.findUnique({ where: { clerkId } }) : null
  const unlocked = user?.plan === 'AGENCY'
  return <TrackerClient unlocked={unlocked} />
}
