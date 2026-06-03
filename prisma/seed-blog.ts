import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

const prisma = new PrismaClient()
const BLOG_DIR = path.join(process.cwd(), 'content', 'blog')

async function main() {
  const files = fs.readdirSync(BLOG_DIR).filter(f => f.endsWith('.mdx'))
  for (const filename of files) {
    const slug = filename.replace(/\.mdx$/, '')
    const { data, content } = matter(fs.readFileSync(path.join(BLOG_DIR, filename), 'utf8'))
    await prisma.blogPost.upsert({
      where: { slug },
      update: { title: data.title, description: data.description, content, category: data.category, readingTime: data.readingTime, published: true, publishedAt: new Date(data.date) },
      create: { slug, title: data.title, description: data.description, content, category: data.category, readingTime: data.readingTime, published: true, publishedAt: new Date(data.date) },
    })
    console.log(`Seeded: ${slug}`)
  }
}

main().then(() => { console.log('Done'); process.exit(0) }).catch(e => { console.error(e); process.exit(1) })
