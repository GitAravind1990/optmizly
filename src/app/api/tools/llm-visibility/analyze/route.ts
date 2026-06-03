import { NextRequest } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { callClaude, extractJSON } from '@/lib/anthropic'
import { apiError, apiSuccess } from '@/lib/api'
import { Plan } from '@prisma/client'
import { AuthError } from '@/lib/auth'

export const runtime = 'nodejs'
export const maxDuration = 90

async function getProUser() {
  const { userId: clerkId } = await auth()
  if (!clerkId) throw new AuthError(401, 'Not authenticated')
  const user = await prisma.user.findUnique({ where: { clerkId } })
  if (!user) throw new AuthError(401, 'User not found')
  if (user.plan === Plan.FREE) throw new AuthError(403, 'PRO plan required')
  return user
}

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function extractDomain(url: string): string {
  return url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]
}

interface MockPage {
  url: string
  title: string
  content: string
  headings: string[]
  wordCount: number
  hasFaq: boolean
  listCount: number
}

function simulateWebsiteCrawl(url: string): MockPage[] {
  const domain = extractDomain(url)
  return [
    {
      url: url,
      title: `${domain} - Home`,
      content: `Welcome to ${domain}. We provide comprehensive solutions for businesses and individuals. Our platform offers cutting-edge technology to help you achieve your goals. We specialize in delivering high-quality services with measurable results. Our team of experts brings years of experience across multiple industries. We serve clients worldwide with personalized strategies and data-driven approaches.`,
      headings: ['Welcome to Our Platform', 'Our Services', 'Why Choose Us'],
      wordCount: rand(1200, 1800),
      hasFaq: false,
      listCount: rand(1, 3),
    },
    {
      url: `${url}/about`,
      title: `About Us - ${domain}`,
      content: `We are a team of dedicated professionals committed to excellence. Founded with a mission to transform the industry, we have grown into a trusted partner for businesses of all sizes. Our approach combines innovative thinking with proven methodologies. We believe in transparency, collaboration, and delivering real value to our clients. Our expertise spans multiple domains including technology, marketing, and business strategy.`,
      headings: ['Our Story', 'Our Mission', 'Our Values'],
      wordCount: rand(900, 1400),
      hasFaq: false,
      listCount: rand(1, 4),
    },
    {
      url: `${url}/services`,
      title: `Services - ${domain}`,
      content: `Our comprehensive suite of services is designed to meet every business need. We offer strategy consulting, technology implementation, and ongoing support. Each service is tailored to your specific requirements and business objectives. Our service packages include discovery and planning, implementation and deployment, training and onboarding, and continuous optimization. We measure success through key performance indicators aligned with your goals.`,
      headings: ['Our Services', 'Strategy Consulting', 'Technology Solutions', 'Support & Maintenance', 'Pricing Plans'],
      wordCount: rand(1500, 2500),
      hasFaq: false,
      listCount: rand(3, 6),
    },
    {
      url: `${url}/faq`,
      title: `Frequently Asked Questions - ${domain}`,
      content: `What is your pricing model? We offer flexible pricing based on your needs. How long does implementation take? Most projects are completed within 4-6 weeks. Do you offer a free trial? Yes, we offer a 14-day free trial. What support options are available? We provide 24/7 email and chat support. Can I cancel anytime? Yes, you can cancel with 30 days notice. Is my data secure? We use industry-standard encryption. What integrations do you support? We integrate with over 100 popular tools. How do I get started? Simply sign up and follow our onboarding guide. What makes you different from competitors? Our unique approach combines AI with human expertise. Do you offer custom solutions? Yes, we build custom packages for enterprise clients.`,
      headings: ['Frequently Asked Questions', 'Pricing & Plans', 'Getting Started', 'Technical Questions', 'Support'],
      wordCount: rand(1400, 2000),
      hasFaq: true,
      listCount: rand(2, 4),
    },
    {
      url: `${url}/blog`,
      title: `Blog & Resources - ${domain}`,
      content: `Stay up to date with the latest industry insights, tips, and best practices. Our blog covers topics ranging from strategy and planning to technical implementation and case studies. Learn from real-world examples and expert opinions. We publish fresh content weekly to keep you informed about trends and innovations in the industry. Browse our resource library for guides, templates, and tools.`,
      headings: ['Latest Articles', 'Industry Insights', 'Case Studies', 'Tutorials'],
      wordCount: rand(800, 1200),
      hasFaq: false,
      listCount: rand(1, 3),
    },
  ]
}

function analyzePage(page: MockPage, index: number) {
  const seed = page.url.length + index
  const variance = (seed % 30) - 15

  const semanticScore = Math.min(90, Math.max(30, rand(50, 75) + variance))
  const structureScore = Math.min(90, Math.max(30, rand(40, 80) + (page.hasFaq ? 10 : 0) + variance))
  const answerScore = Math.min(90, Math.max(30, rand(45, 80) + (page.hasFaq ? 15 : 0) + variance))
  const pageScore = Math.round(semanticScore * 0.35 + structureScore * 0.3 + answerScore * 0.35)

  const issues: string[] = []
  if (semanticScore < 55) issues.push(`Low semantic relevance on ${page.title}`)
  if (structureScore < 50) issues.push(`Poor content structure on ${page.title}`)
  if (answerScore < 50) issues.push(`Low answerability on ${page.title}`)
  if (!page.hasFaq) issues.push(`Missing FAQ section on ${page.title}`)
  if (page.wordCount < 1000) issues.push(`Thin content on ${page.title} (under 1000 words)`)

  const topicMap: Record<string, string> = {
    'Home': 'Business Solutions Overview',
    'About': 'Company Background & Mission',
    'Services': 'Service Offerings & Packages',
    'FAQ': 'Common Questions & Answers',
    'Blog': 'Industry Insights & Resources',
  }
  const titleKey = Object.keys(topicMap).find(k => page.title.includes(k)) ?? 'General'
  const mainTopic = topicMap[titleKey] ?? 'Business Content'

  return {
    url: page.url,
    title: page.title,
    pageScore,
    semanticScore,
    structureScore,
    answerScore,
    wordCount: page.wordCount,
    headingCount: page.headings.length,
    listCount: page.listCount,
    faqCount: page.hasFaq ? rand(8, 12) : 0,
    mainTopic,
    subtopics: JSON.stringify(page.headings),
    entities: JSON.stringify([page.title.split(' ')[0], 'Services', 'Support', 'Platform']),
    retrievable: pageScore > 50,
    retrievalReason: pageScore > 50
      ? 'Content is well-structured and provides clear answers'
      : 'Content lacks sufficient semantic depth for reliable retrieval',
    issues: JSON.stringify(issues),
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getProUser()
    const { websiteUrl } = await req.json()

    if (!websiteUrl?.trim()) throw new AuthError(400, 'Website URL required')

    const url = websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`
    const domain = extractDomain(url)

    const pages = simulateWebsiteCrawl(url)
    const analyzedPages = pages.map((p, i) => analyzePage(p, i))

    const semanticRelevance = Math.round(analyzedPages.reduce((s, p) => s + p.semanticScore, 0) / analyzedPages.length)
    const retrievablePct = Math.round((analyzedPages.filter(p => p.retrievable).length / analyzedPages.length) * 100)
    const contentStructure = Math.round(analyzedPages.reduce((s, p) => s + p.structureScore, 0) / analyzedPages.length)
    const answerability = Math.round(analyzedPages.reduce((s, p) => s + p.answerScore, 0) / analyzedPages.length)
    const technicalAccess = 85

    const llmVisibilityScore = Math.round(
      semanticRelevance * 0.30 +
      retrievablePct * 0.25 +
      contentStructure * 0.15 +
      answerability * 0.20 +
      technicalAccess * 0.10
    )

    const allIssues = analyzedPages.flatMap(p => JSON.parse(p.issues) as string[])
    const criticalGaps = allIssues.slice(0, 8)

    const warnings = [
      'Some pages lack structured data markup for AI parsing',
      'Entity coverage could be improved for better AI recognition',
      'Content depth varies significantly across pages',
    ]

    const opportunities = [
      'Add FAQ sections to service pages for 20-30% retrieval improvement',
      'Include more specific data points and statistics AI models can cite',
      'Implement structured Q&A format for key topic pages',
    ]

    const aiPrompt = `You are an AI content optimization expert. Analyze this website and provide specific recommendations to improve how AI language models (ChatGPT, Claude, Gemini) retrieve and answer questions using this site's content.

Website: ${url}
Domain: ${domain}
LLM Visibility Score: ${llmVisibilityScore}/100
Semantic Relevance: ${semanticRelevance}/100
Retrieval Likelihood: ${retrievablePct}%
Content Structure: ${contentStructure}/100
Answerability: ${answerability}/100

Pages analyzed: ${pages.map(p => p.title).join(', ')}
Critical Issues: ${criticalGaps.join('; ')}

Provide exactly 8 specific, actionable recommendations focused ONLY on improving AI language model retrieval and answer quality. NOT traditional SEO. Focus on:
- Semantic coverage and topic completeness
- Answerability and direct response patterns
- AI-parseable content structure
- Entity and fact density
- Query intent alignment

Return JSON: {"recommendations": ["rec1", "rec2", "rec3", "rec4", "rec5", "rec6", "rec7", "rec8"]}`

    const aiResponse = await callClaude(
      'You are an expert in AI content optimization and LLM retrieval systems. Return only valid JSON.',
      aiPrompt,
      1200
    )

    let recommendations: string[] = []
    try {
      const parsed = extractJSON<{ recommendations: string[] }>(aiResponse)
      recommendations = parsed.recommendations ?? []
    } catch {
      recommendations = [
        'Add comprehensive FAQ sections answering the top 20 questions users ask about your services',
        'Include specific statistics and data points that AI models can cite as authoritative sources',
        'Structure content using clear definitions: "X is defined as..." for key concepts',
        'Create dedicated pages for each service with direct answer formats',
        'Improve entity mentions: include specific names, dates, locations, and measurable outcomes',
        'Use numbered lists and step-by-step formats that AI can easily parse and reproduce',
        'Add a "How it works" section with clear cause-and-effect explanations',
        'Include comparison tables that help AI systems make direct comparisons',
      ]
    }

    const totalWords = analyzedPages.reduce((s, p) => s + p.wordCount, 0)
    const faqSections = analyzedPages.filter(p => p.faqCount > 0).length
    const entitiesFound = rand(15, 30)
    const topicsFound = rand(8, 15)

    const analysis = await prisma.lLMVisibilityAnalysis.create({
      data: {
        userId: user.id,
        websiteUrl: url,
        domain,
        llmVisibilityScore,
        semanticRelevance,
        retrievalLikelihood: retrievablePct,
        contentStructure,
        answerability,
        technicalAccess,
        pagesAnalyzed: analyzedPages.length,
        totalWords,
        topicsFound,
        entitiesFound,
        faqSections,
        criticalGaps: JSON.stringify(criticalGaps),
        warnings: JSON.stringify(warnings),
        opportunities: JSON.stringify(opportunities),
        recommendations: JSON.stringify(recommendations),
        pages: {
          create: analyzedPages,
        },
      },
    })

    return apiSuccess({
      success: true,
      analysisId: analysis.id,
      scores: {
        llmVisibility: llmVisibilityScore,
        semantic: semanticRelevance,
        retrieval: retrievablePct,
        structure: contentStructure,
        answerability,
      },
      pagesAnalyzed: analyzedPages.length,
      criticalIssues: criticalGaps.length,
    })
  } catch (e) {
    return apiError(e)
  }
}
