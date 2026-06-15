import { PrismaClient } from '@prisma/client'
import readline from 'readline'

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
rl.question('Type "delete all users" to confirm: ', async (answer) => {
  rl.close()
  if (answer !== 'delete all users') {
    console.log('Aborted.')
    process.exit(0)
  }
  const prisma = new PrismaClient()
  const result = await prisma.user.deleteMany({})
  console.log(`Deleted ${result.count} users`)
  await prisma.$disconnect()
})
