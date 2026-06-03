import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { LocalClient } from './client'

export default async function LocalPage() {
  return <LocalClient />
}
