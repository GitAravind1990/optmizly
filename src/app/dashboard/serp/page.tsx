import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { SerpClient } from './client'

export default async function SerpPage() {
  return <SerpClient />
}
