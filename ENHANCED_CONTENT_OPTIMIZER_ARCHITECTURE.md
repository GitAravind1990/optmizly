# Enhanced Content Optimizer â€” Complete Semantic SEO Tool

## Overview

The Enhanced Content Optimizer is **THE** comprehensive Semantic SEO tool that combines all Google AI Overview concepts into ONE powerful tool. Users paste content once and get a complete analysis covering Search Intent, Entities, LSI Keywords, Schema Markup, Topic Clusters, and AI rewrites.

## Marketing Tagline

**"The Only Content Optimizer You Need â€” Complete Semantic SEO in One Click"**

*"Stop juggling 5 different tools. Get search intent, entities, LSI keywords, schema markup, topic clusters, and AI improvements â€” all in one comprehensive analysis."*

---

## 1. WHAT IT REPLACES/COMBINES

| Concept | Status |
|---------|--------|
| Content Optimization | âœ… Already exists - ENHANCED |
| Search Intent Detection | ðŸ†• NEW |
| Entity Analysis | ðŸ†• ENHANCED |
| LSI Keywords | ðŸ†• NEW |
| Schema Markup Generator | ðŸ†• NEW |
| Topic Cluster Mapping | ðŸ†• NEW |
| Topic Coverage Score | ðŸ†• NEW |
| E-E-A-T Score | âœ… Already exists |
| AI Rewriting | âœ… Already exists |

---

## 2. DATABASE SCHEMA

Add to `prisma/schema.prisma`:

```prisma
model ContentOptimization {
  id              String    @id @default(cuid())
  userId          String
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  // Input
  content         String    @db.Text
  targetKeyword   String
  contentUrl      String?
  
  // Search Intent Analysis
  detectedIntent  String    // "informational", "navigational", "transactional", "commercial"
  intentMatchScore Int      // 0-100
  intentSuggestions String  // JSON
  
  // Entity Analysis
  entities        String    @db.Text // JSON array
  entityScore     Int       // 0-100
  missingEntities String    // JSON array
  entityRelationships String? @db.Text // JSON
  
  // LSI Keywords
  lsiKeywords     String    @db.Text // JSON array - found
  missingLsi      String    @db.Text // JSON array - missing
  lsiScore        Int       // 0-100
  
  // Schema Markup
  recommendedSchema String  // "Article", "HowTo", "FAQ", "Product", etc.
  schemaJsonLd    String    @db.Text // Generated JSON-LD
  
  // Topic Coverage
  mainTopic       String
  subtopicsCovered String   // JSON array
  subtopicsMissing String   // JSON array
  topicCoverageScore Int    // 0-100
  
  // Topic Clusters
  pillarSuggestion String?
  clusterSuggestions String? @db.Text // JSON array
  internalLinkingOps String? @db.Text // JSON array
  
  // E-E-A-T Scores
  experienceScore Int       // 0-100
  expertiseScore  Int       // 0-100
  authorityScore  Int       // 0-100
  trustScore      Int       // 0-100
  eeatOverall     Int       // 0-100
  
  // Overall Score
  overallScore    Int       // 0-100
  
  // AI Suggestions
  rewriteSuggestions String @db.Text // JSON array
  improvements    String    @db.Text // JSON array
  
  // Metadata
  analyzedAt      DateTime  @default(now())
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}

model ContentOptimizationFix {
  id              String    @id @default(cuid())
  optimizationId  String
  optimization    ContentOptimization @relation(fields: [optimizationId], references: [id], onDelete: Cascade)
  
  category        String    // "intent", "entity", "lsi", "schema", "cluster", "eeat"
  priority        String    // "critical", "warning", "info"
  issue           String
  suggestion      String    @db.Text
  beforeText      String?   @db.Text
  afterText       String?   @db.Text
  applied         Boolean   @default(false)
  
  createdAt       DateTime  @default(now())
}
```

---

## 3. API ROUTE (Complete Backend)

Create `src/app/api/tools/content-optimizer/route.ts`:

```typescript
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { Anthropic } from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

// POST handler - Complete Semantic SEO Analysis
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { content, targetKeyword, contentUrl } = await req.json();

    if (!content || !targetKeyword) {
      return NextResponse.json({ error: 'Content and target keyword required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { clerkId: userId } });

    // Quota check based on plan
    const quotaLimits: Record<string, number> = {
      FREE: 3,
      PRO: 50,
      AGENCY: 200,
    };

    const limit = quotaLimits[user?.plan || 'FREE'] || 3;
    const monthlyCount = await prisma.contentOptimization.count({
      where: {
        userId: user?.id,
        analyzedAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
    });

    if (monthlyCount >= limit) {
      return NextResponse.json(
        { error: `Quota exceeded. ${user?.plan || 'FREE'} plan allows ${limit} analyses/month` },
        { status: 429 }
      );
    }

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // RUN ALL ANALYSES IN PARALLEL FOR SPEED
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    const [
      intentAnalysis,
      entityAnalysis,
      lsiAnalysis,
      schemaAnalysis,
      topicAnalysis,
      eeatAnalysis,
      improvements,
    ] = await Promise.all([
      analyzeSearchIntent(content, targetKeyword),
      analyzeEntities(content, targetKeyword),
      analyzeLsiKeywords(content, targetKeyword),
      generateSchemaMarkup(content, targetKeyword),
      analyzeTopicCoverage(content, targetKeyword),
      analyzeEEAT(content, targetKeyword),
      generateImprovements(content, targetKeyword),
    ]);

    // Calculate overall score
    const overallScore = Math.round(
      (intentAnalysis.matchScore * 0.15) +
      (entityAnalysis.score * 0.15) +
      (lsiAnalysis.score * 0.15) +
      (topicAnalysis.score * 0.20) +
      (eeatAnalysis.overall * 0.20) +
      (improvements.contentScore * 0.15)
    );

    // Save to database
    const optimization = await prisma.contentOptimization.create({
      data: {
        userId: user!.id,
        content,
        targetKeyword,
        contentUrl,
        // Intent
        detectedIntent: intentAnalysis.intent,
        intentMatchScore: intentAnalysis.matchScore,
        intentSuggestions: JSON.stringify(intentAnalysis.suggestions),
        // Entity
        entities: JSON.stringify(entityAnalysis.entities),
        entityScore: entityAnalysis.score,
        missingEntities: JSON.stringify(entityAnalysis.missing),
        entityRelationships: JSON.stringify(entityAnalysis.relationships),
        // LSI
        lsiKeywords: JSON.stringify(lsiAnalysis.found),
        missingLsi: JSON.stringify(lsiAnalysis.missing),
        lsiScore: lsiAnalysis.score,
        // Schema
        recommendedSchema: schemaAnalysis.type,
        schemaJsonLd: schemaAnalysis.jsonLd,
        // Topics
        mainTopic: topicAnalysis.mainTopic,
        subtopicsCovered: JSON.stringify(topicAnalysis.covered),
        subtopicsMissing: JSON.stringify(topicAnalysis.missing),
        topicCoverageScore: topicAnalysis.score,
        // Cluster suggestions
        pillarSuggestion: topicAnalysis.pillarSuggestion,
        clusterSuggestions: JSON.stringify(topicAnalysis.clusterSuggestions),
        internalLinkingOps: JSON.stringify(topicAnalysis.linkingOpportunities),
        // E-E-A-T
        experienceScore: eeatAnalysis.experience,
        expertiseScore: eeatAnalysis.expertise,
        authorityScore: eeatAnalysis.authority,
        trustScore: eeatAnalysis.trust,
        eeatOverall: eeatAnalysis.overall,
        // Overall
        overallScore,
        rewriteSuggestions: JSON.stringify(improvements.rewrites),
        improvements: JSON.stringify(improvements.fixes),
      },
    });

    // Save individual fixes
    const allFixes = [
      ...intentAnalysis.suggestions.map((s: any) => ({ ...s, category: 'intent' })),
      ...entityAnalysis.suggestions.map((s: any) => ({ ...s, category: 'entity' })),
      ...lsiAnalysis.suggestions.map((s: any) => ({ ...s, category: 'lsi' })),
      ...topicAnalysis.suggestions.map((s: any) => ({ ...s, category: 'topic' })),
      ...improvements.fixes.map((s: any) => ({ ...s, category: 'general' })),
    ];

    for (const fix of allFixes) {
      await prisma.contentOptimizationFix.create({
        data: {
          optimizationId: optimization.id,
          category: fix.category,
          priority: fix.priority || 'info',
          issue: fix.issue,
          suggestion: fix.suggestion,
          beforeText: fix.beforeText,
          afterText: fix.afterText,
        },
      });
    }

    return NextResponse.json({
      id: optimization.id,
      overallScore,
      intent: intentAnalysis,
      entities: entityAnalysis,
      lsi: lsiAnalysis,
      schema: schemaAnalysis,
      topics: topicAnalysis,
      eeat: eeatAnalysis,
      improvements,
    });
  } catch (error) {
    console.error('Content Optimizer error:', error);
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 });
  }
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// ANALYSIS FUNCTIONS (using Claude AI)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

// 1. Search Intent Detection
async function analyzeSearchIntent(content: string, keyword: string) {
  const prompt = `Analyze this content for search intent matching the keyword "${keyword}".

Content: ${content.slice(0, 3000)}

Return ONLY JSON:
{
  "intent": "informational|navigational|transactional|commercial",
  "matchScore": 0-100,
  "reasoning": "Why this intent",
  "suggestions": [
    {
      "issue": "Specific issue",
      "suggestion": "How to fix",
      "priority": "critical|warning|info"
    }
  ]
}`;

  const response = await callClaude(prompt);
  return parseJSON(response, {
    intent: 'informational',
    matchScore: 50,
    reasoning: '',
    suggestions: [],
  });
}

// 2. Entity Analysis
async function analyzeEntities(content: string, keyword: string) {
  const prompt = `Analyze entities in this content for the topic "${keyword}".

Content: ${content.slice(0, 3000)}

Identify:
1. Strong entities (well-covered)
2. Weak entities (briefly mentioned)
3. Missing entities (should be added)
4. Entity relationships

Return ONLY JSON:
{
  "entities": [{"name": "Entity", "type": "person|place|concept|brand", "strength": "strong|weak", "frequency": 5}],
  "score": 0-100,
  "missing": [{"name": "Entity", "reason": "Why important", "where": "Where to add"}],
  "relationships": [{"entity1": "X", "entity2": "Y", "relationship": "type"}],
  "suggestions": [{"issue": "...", "suggestion": "...", "priority": "..."}]
}`;

  const response = await callClaude(prompt);
  return parseJSON(response, {
    entities: [],
    score: 50,
    missing: [],
    relationships: [],
    suggestions: [],
  });
}

// 3. LSI Keywords Analysis
async function analyzeLsiKeywords(content: string, keyword: string) {
  const prompt = `Identify LSI (latent semantic indexing) keywords for this content about "${keyword}".

Content: ${content.slice(0, 3000)}

Find:
1. LSI keywords used (semantically related terms found)
2. LSI keywords missing (should be included)

Return ONLY JSON:
{
  "found": ["keyword1", "keyword2"],
  "missing": ["keyword1", "keyword2"],
  "score": 0-100,
  "suggestions": [{"issue": "...", "suggestion": "...", "priority": "..."}]
}`;

  const response = await callClaude(prompt);
  return parseJSON(response, {
    found: [],
    missing: [],
    score: 50,
    suggestions: [],
  });
}

// 4. Schema Markup Generator
async function generateSchemaMarkup(content: string, keyword: string) {
  const prompt = `Generate JSON-LD schema markup for this content.

Content: ${content.slice(0, 3000)}
Topic: ${keyword}

Determine the best schema type and generate complete JSON-LD code.

Return ONLY JSON:
{
  "type": "Article|HowTo|FAQ|Product|Recipe",
  "reasoning": "Why this type",
  "jsonLd": "<script type=\\"application/ld+json\\">{ ... }</script>"
}`;

  const response = await callClaude(prompt);
  return parseJSON(response, {
    type: 'Article',
    reasoning: '',
    jsonLd: '',
  });
}

// 5. Topic Coverage & Clusters
async function analyzeTopicCoverage(content: string, keyword: string) {
  const prompt = `Analyze topic coverage for content about "${keyword}".

Content: ${content.slice(0, 3000)}

Identify:
1. Main topic and subtopics covered
2. Missing subtopics that should be covered
3. Pillar page suggestion (broader topic)
4. Cluster page ideas (narrower related topics)
5. Internal linking opportunities

Return ONLY JSON:
{
  "mainTopic": "Topic name",
  "covered": ["subtopic1", "subtopic2"],
  "missing": [{"topic": "X", "importance": "high|medium|low", "reason": "Why"}],
  "score": 0-100,
  "pillarSuggestion": "Broad pillar page topic",
  "clusterSuggestions": [
    {"title": "Cluster page title", "topic": "subtopic", "importance": "high"}
  ],
  "linkingOpportunities": [
    {"from": "current page", "to": "suggested page", "anchor": "link text"}
  ],
  "suggestions": [{"issue": "...", "suggestion": "...", "priority": "..."}]
}`;

  const response = await callClaude(prompt);
  return parseJSON(response, {
    mainTopic: keyword,
    covered: [],
    missing: [],
    score: 50,
    pillarSuggestion: '',
    clusterSuggestions: [],
    linkingOpportunities: [],
    suggestions: [],
  });
}

// 6. E-E-A-T Analysis
async function analyzeEEAT(content: string, keyword: string) {
  const prompt = `Analyze E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness) for this content.

Content: ${content.slice(0, 3000)}
Topic: ${keyword}

Score each dimension 0-100:
1. Experience: Does author show personal experience?
2. Expertise: Demonstrates deep knowledge?
3. Authority: Backed by credentials/sources?
4. Trust: Accurate, transparent, well-sourced?

Return ONLY JSON:
{
  "experience": 0-100,
  "expertise": 0-100,
  "authority": 0-100,
  "trust": 0-100,
  "overall": 0-100,
  "details": {
    "experience": "explanation",
    "expertise": "explanation",
    "authority": "explanation",
    "trust": "explanation"
  }
}`;

  const response = await callClaude(prompt);
  return parseJSON(response, {
    experience: 50,
    expertise: 50,
    authority: 50,
    trust: 50,
    overall: 50,
    details: {},
  });
}

// 7. AI Improvements
async function generateImprovements(content: string, keyword: string) {
  const prompt = `Suggest specific improvements for this content about "${keyword}".

Content: ${content.slice(0, 3000)}

Generate:
1. Content score 0-100
2. Top 5 specific fixes (with before/after text)
3. AI rewrite suggestions for weak sections

Return ONLY JSON:
{
  "contentScore": 0-100,
  "fixes": [
    {
      "issue": "Specific problem",
      "suggestion": "How to fix",
      "beforeText": "Original text",
      "afterText": "Improved text",
      "priority": "critical|warning|info"
    }
  ],
  "rewrites": [
    {
      "section": "Section name",
      "original": "Current text",
      "improved": "AI rewrite"
    }
  ]
}`;

  const response = await callClaude(prompt);
  return parseJSON(response, {
    contentScore: 50,
    fixes: [],
    rewrites: [],
  });
}

// Helper: Call Claude API
async function callClaude(prompt: string): Promise<string> {
  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 3000,
      messages: [{ role: 'user', content: prompt }],
    });
    return response.content[0].type === 'text' ? response.content[0].text : '';
  } catch (error) {
    console.error('Claude error:', error);
    return '';
  }
}

// Helper: Parse JSON safely
function parseJSON(text: string, fallback: any): any {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : fallback;
  } catch {
    return fallback;
  }
}

// GET handler - fetch optimization history
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { clerkId: userId } });

    const optimizations = await prisma.contentOptimization.findMany({
      where: { userId: user?.id },
      orderBy: { analyzedAt: 'desc' },
      take: 20,
      select: {
        id: true,
        targetKeyword: true,
        overallScore: true,
        detectedIntent: true,
        analyzedAt: true,
      },
    });

    return NextResponse.json({ optimizations });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}
```

---

## 4. FRONTEND PAGE

Create `src/app/dashboard/optimizer/page.tsx`:

```typescript
'use client';

import { useState } from 'react';

export default function ContentOptimizerPage() {
  const [content, setContent] = useState('');
  const [keyword, setKeyword] = useState('');
  const [contentUrl, setContentUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('overview');

  const handleAnalyze = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      const response = await fetch('/api/tools/content-optimizer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, targetKeyword: keyword, contentUrl }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setResult(data);
      } else {
        alert(data.error);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-black flex items-center gap-3">
          ðŸš€ Content Optimizer
          <span className="text-xs bg-gradient-to-r from-purple-500 to-blue-500 text-white px-3 py-1 rounded-full">
            COMPLETE SEMANTIC SEO
          </span>
        </h1>
        <p className="text-gray-600 mt-2">
          Search intent + Entities + LSI + Schema + Topic Clusters + E-E-A-T + AI Rewrites
        </p>
      </div>

      <div className="bg-white border rounded-lg p-6 space-y-4">
        <div>
          <label className="text-sm font-semibold mb-2 block">Target Keyword *</label>
          <input
            type="text"
            placeholder="e.g., content marketing strategy"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="w-full p-3 border rounded-lg"
          />
        </div>
        
        <div>
          <label className="text-sm font-semibold mb-2 block">Content URL (Optional)</label>
          <input
            type="url"
            placeholder="https://yoursite.com/article"
            value={contentUrl}
            onChange={(e) => setContentUrl(e.target.value)}
            className="w-full p-3 border rounded-lg"
          />
        </div>
        
        <div>
          <label className="text-sm font-semibold mb-2 block">Content *</label>
          <textarea
            placeholder="Paste your content here..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={10}
            className="w-full p-3 border rounded-lg"
          />
          <div className="text-xs text-gray-500 mt-1">{content.length} characters</div>
        </div>

        <button 
          onClick={handleAnalyze} 
          disabled={loading || !content || !keyword}
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 text-white py-4 rounded-lg font-bold text-lg"
        >
          {loading ? 'ðŸ” Running 7 Analyses (this takes ~30 sec)...' : 'ðŸš€ Analyze Everything'}
        </button>
      </div>

      {result && <ResultsDisplay result={result} activeTab={activeTab} setActiveTab={setActiveTab} />}
    </div>
  );
}

function ResultsDisplay({ result, activeTab, setActiveTab }: any) {
  const tabs = [
    { id: 'overview', label: 'ðŸ“Š Overview', score: result.overallScore },
    { id: 'intent', label: 'ðŸŽ¯ Intent', score: result.intent.matchScore },
    { id: 'entities', label: 'ðŸ”— Entities', score: result.entities.score },
    { id: 'lsi', label: 'ðŸ“š LSI Keywords', score: result.lsi.score },
    { id: 'schema', label: 'ðŸ“‹ Schema', score: null },
    { id: 'topics', label: 'ðŸŒ Topics', score: result.topics.score },
    { id: 'eeat', label: 'â­ E-E-A-T', score: result.eeat.overall },
    { id: 'fixes', label: 'ðŸ”§ AI Fixes', score: null },
  ];

  return (
    <div className="space-y-6">
      {/* Score Header */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 border rounded-lg p-6 text-center">
        <div className="text-6xl font-black mb-2 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
          {result.overallScore}/100
        </div>
        <div className="text-gray-600">Overall Semantic SEO Score</div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b pb-4">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg font-semibold ${
              activeTab === tab.id
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            {tab.label}
            {tab.score !== null && (
              <span className="ml-2 text-xs">
                {tab.score}/100
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'overview' && <OverviewTab result={result} />}
        {activeTab === 'intent' && <IntentTab data={result.intent} />}
        {activeTab === 'entities' && <EntitiesTab data={result.entities} />}
        {activeTab === 'lsi' && <LsiTab data={result.lsi} />}
        {activeTab === 'schema' && <SchemaTab data={result.schema} />}
        {activeTab === 'topics' && <TopicsTab data={result.topics} />}
        {activeTab === 'eeat' && <EEATTab data={result.eeat} />}
        {activeTab === 'fixes' && <FixesTab data={result.improvements} />}
      </div>
    </div>
  );
}

function OverviewTab({ result }: any) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <ScoreCard label="ðŸŽ¯ Search Intent" score={result.intent.matchScore} detail={result.intent.intent} />
      <ScoreCard label="ðŸ”— Entity Score" score={result.entities.score} detail={`${result.entities.entities.length} entities`} />
      <ScoreCard label="ðŸ“š LSI Keywords" score={result.lsi.score} detail={`${result.lsi.found.length} found, ${result.lsi.missing.length} missing`} />
      <ScoreCard label="ðŸŒ Topic Coverage" score={result.topics.score} detail={`${result.topics.covered.length}/${result.topics.covered.length + result.topics.missing.length}`} />
      <ScoreCard label="â­ E-E-A-T" score={result.eeat.overall} detail="Experience, Expertise, Authority, Trust" />
      <ScoreCard label="ðŸ“‹ Schema" score={100} detail={`${result.schema.type} recommended`} />
    </div>
  );
}

function ScoreCard({ label, score, detail }: any) {
  const color = score >= 80 ? 'text-green-600' : score >= 60 ? 'text-yellow-600' : 'text-red-600';
  return (
    <div className="bg-white border rounded-lg p-4">
      <div className="text-sm text-gray-600 mb-2">{label}</div>
      <div className={`text-3xl font-bold ${color}`}>{score}/100</div>
      <div className="text-xs text-gray-500 mt-1">{detail}</div>
    </div>
  );
}

function IntentTab({ data }: any) {
  return (
    <div className="bg-white border rounded-lg p-6">
      <h3 className="text-xl font-bold mb-4">ðŸŽ¯ Search Intent Analysis</h3>
      <div className="bg-gray-50 p-4 rounded mb-4">
        <div className="text-sm text-gray-600">Detected Intent:</div>
        <div className="text-2xl font-bold capitalize">{data.intent}</div>
        <div className="text-sm mt-2">Match Score: {data.matchScore}/100</div>
      </div>
      <div className="text-sm">{data.reasoning}</div>
      
      {data.suggestions?.length > 0 && (
        <div className="mt-4">
          <h4 className="font-semibold mb-2">Suggestions:</h4>
          <ul className="space-y-2">
            {data.suggestions.map((s: any, i: number) => (
              <li key={i} className="bg-yellow-50 p-3 rounded">
                <div className="font-semibold">{s.issue}</div>
                <div className="text-sm">{s.suggestion}</div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function EntitiesTab({ data }: any) {
  return (
    <div className="bg-white border rounded-lg p-6">
      <h3 className="text-xl font-bold mb-4">ðŸ”— Entity Analysis</h3>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <h4 className="font-semibold mb-2 text-green-700">âœ… Found Entities ({data.entities.length})</h4>
          <div className="space-y-1">
            {data.entities.map((e: any, i: number) => (
              <div key={i} className={`px-3 py-1 rounded text-sm inline-block mr-2 mb-1 ${
                e.strength === 'strong' ? 'bg-green-100' : 'bg-yellow-100'
              }`}>
                {e.name} ({e.frequency}x)
              </div>
            ))}
          </div>
        </div>
        
        <div>
          <h4 className="font-semibold mb-2 text-red-700">âŒ Missing Entities ({data.missing.length})</h4>
          <div className="space-y-2">
            {data.missing.map((m: any, i: number) => (
              <div key={i} className="bg-red-50 p-2 rounded text-sm">
                <div className="font-semibold">{m.name}</div>
                <div className="text-xs">{m.reason}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {data.relationships?.length > 0 && (
        <div>
          <h4 className="font-semibold mb-2">Entity Relationships:</h4>
          <ul className="space-y-1">
            {data.relationships.map((r: any, i: number) => (
              <li key={i} className="text-sm">
                <strong>{r.entity1}</strong> â†’ {r.relationship} â†’ <strong>{r.entity2}</strong>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function LsiTab({ data }: any) {
  return (
    <div className="bg-white border rounded-lg p-6">
      <h3 className="text-xl font-bold mb-4">ðŸ“š LSI Keywords Analysis</h3>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className="font-semibold mb-2 text-green-700">âœ… Used ({data.found.length})</h4>
          <div className="flex flex-wrap gap-1">
            {data.found.map((k: string, i: number) => (
              <span key={i} className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                {k}
              </span>
            ))}
          </div>
        </div>
        
        <div>
          <h4 className="font-semibold mb-2 text-red-700">âŒ Missing ({data.missing.length})</h4>
          <div className="flex flex-wrap gap-1">
            {data.missing.map((k: string, i: number) => (
              <span key={i} className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs">
                {k}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SchemaTab({ data }: any) {
  return (
    <div className="bg-white border rounded-lg p-6">
      <h3 className="text-xl font-bold mb-4">ðŸ“‹ Schema Markup</h3>
      <div className="bg-blue-50 p-4 rounded mb-4">
        <div className="font-semibold">Recommended Type: {data.type}</div>
        <div className="text-sm text-gray-600 mt-1">{data.reasoning}</div>
      </div>
      
      <div>
        <h4 className="font-semibold mb-2">Generated JSON-LD:</h4>
        <pre className="bg-gray-100 p-4 rounded text-xs overflow-x-auto">
          {data.jsonLd}
        </pre>
        <button 
          onClick={() => navigator.clipboard.writeText(data.jsonLd)}
          className="mt-2 text-sm bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
        >
          ðŸ“‹ Copy Schema Code
        </button>
      </div>
    </div>
  );
}

function TopicsTab({ data }: any) {
  return (
    <div className="bg-white border rounded-lg p-6 space-y-4">
      <h3 className="text-xl font-bold">ðŸŒ Topic Coverage & Clusters</h3>
      
      <div>
        <h4 className="font-semibold">Main Topic: {data.mainTopic}</h4>
        <div className="text-sm text-gray-600">Coverage Score: {data.score}/100</div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className="font-semibold text-green-700">âœ… Covered Subtopics</h4>
          <ul className="text-sm space-y-1 mt-2">
            {data.covered.map((c: string, i: number) => (
              <li key={i}>â€¢ {c}</li>
            ))}
          </ul>
        </div>
        
        <div>
          <h4 className="font-semibold text-red-700">âŒ Missing Subtopics</h4>
          <ul className="text-sm space-y-1 mt-2">
            {data.missing.map((m: any, i: number) => (
              <li key={i}>â€¢ {m.topic} ({m.importance})</li>
            ))}
          </ul>
        </div>
      </div>
      
      {data.pillarSuggestion && (
        <div className="bg-purple-50 p-4 rounded">
          <div className="font-semibold">ðŸ’¡ Pillar Page Suggestion:</div>
          <div className="text-sm">{data.pillarSuggestion}</div>
        </div>
      )}
      
      {data.clusterSuggestions?.length > 0 && (
        <div>
          <h4 className="font-semibold">ðŸŒ Cluster Page Ideas:</h4>
          <ul className="text-sm mt-2 space-y-1">
            {data.clusterSuggestions.map((c: any, i: number) => (
              <li key={i}>â€¢ {c.title}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function EEATTab({ data }: any) {
  return (
    <div className="bg-white border rounded-lg p-6">
      <h3 className="text-xl font-bold mb-4">â­ E-E-A-T Analysis</h3>
      <div className="grid grid-cols-2 gap-4">
        <ScoreCard label="ðŸŒŸ Experience" score={data.experience} detail={data.details?.experience || ''} />
        <ScoreCard label="ðŸŽ“ Expertise" score={data.expertise} detail={data.details?.expertise || ''} />
        <ScoreCard label="ðŸ‘‘ Authority" score={data.authority} detail={data.details?.authority || ''} />
        <ScoreCard label="ðŸ›¡ï¸ Trust" score={data.trust} detail={data.details?.trust || ''} />
      </div>
      <div className="mt-4 bg-blue-50 p-4 rounded text-center">
        <div className="text-sm text-gray-600">Overall E-E-A-T Score</div>
        <div className="text-3xl font-bold text-blue-600">{data.overall}/100</div>
      </div>
    </div>
  );
}

function FixesTab({ data }: any) {
  return (
    <div className="space-y-4">
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-xl font-bold mb-4">ðŸ”§ AI-Powered Improvements</h3>
        <div className="space-y-3">
          {data.fixes.map((fix: any, i: number) => (
            <div key={i} className="border rounded-lg p-4">
              <div className="flex justify-between mb-2">
                <h4 className="font-semibold">{fix.issue}</h4>
                <span className={`text-xs px-2 py-1 rounded ${
                  fix.priority === 'critical' ? 'bg-red-100 text-red-800' :
                  fix.priority === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {fix.priority}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-3">{fix.suggestion}</p>
              {fix.beforeText && fix.afterText && (
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-red-50 p-2 rounded">
                    <div className="font-semibold text-red-700 mb-1">Before:</div>
                    <div>{fix.beforeText}</div>
                  </div>
                  <div className="bg-green-50 p-2 rounded">
                    <div className="font-semibold text-green-700 mb-1">After:</div>
                    <div>{fix.afterText}</div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

---

## 5. PRICING TIER UPDATE

Update `src/app/pricing/page.tsx`:

```typescript
const features = {
  FREE: [
    'Content Optimizer (basic)',
    '3 analyses/month',
    'Search Intent Detection',
    'Basic Entity Extraction',
    'Basic LSI Keywords',
    'E-E-A-T Score',
  ],
  PRO: [
    'Everything in Free',
    '50 analyses/month',
    'Full Content Optimizer',
    'Advanced Entity Analysis',
    'Schema Markup Generator',
    'Topic Cluster Mapping',
    'AI Rewrites & Suggestions',
    'Email reports',
  ],
  AGENCY: [
    'Everything in Pro',
    '200 analyses/month',
    'Bulk content analysis',
    'White-label reports',
    'Team collaboration',
    'Priority support',
    'AI Performance Fixer (exclusive)',
    'Custom benchmarks',
  ],
};
```

---

## 6. IMPLEMENTATION STEPS

```bash
# 1. Update Prisma schema
# Add ContentOptimization and ContentOptimizationFix models

# 2. Run migration
npx prisma migrate dev --name enhance-content-optimizer

# 3. Replace existing Content Optimizer API route
# src/app/api/tools/content-optimizer/route.ts

# 4. Replace existing Content Optimizer UI
# src/app/dashboard/optimizer/page.tsx

# 5. Update pricing page to highlight new features

# 6. Test locally
npm run dev

# 7. Commit and push
git add .
git commit -m "Enhance Content Optimizer with complete Semantic SEO"
git push
```

---

## 7. TESTING CHECKLIST

```
âœ… Paste content + keyword
âœ… All 7 analyses run in parallel (Intent, Entity, LSI, Schema, Topics, E-E-A-T, Improvements)
âœ… Overall score calculates correctly
âœ… All 8 tabs work (Overview, Intent, Entities, LSI, Schema, Topics, E-E-A-T, Fixes)
âœ… Schema JSON-LD copy button works
âœ… Quota limits enforced per plan
âœ… History saves to database
âœ… Mobile responsive
```

---

## 8. KEY BENEFITS

### For Users:
âœ… **One tool, complete analysis** â€” No more switching between tools
âœ… **Faster workflow** â€” Paste once, get everything
âœ… **Better insights** â€” See connections between concepts
âœ… **Copy-paste ready** â€” Schema markup, AI rewrites included

### For Business:
âœ… **Stronger value prop** â€” "Complete Semantic SEO"
âœ… **Higher conversion** â€” One powerful tool
âœ… **Better retention** â€” Users use it daily
âœ… **Easier marketing** â€” Single feature to highlight

---

## 9. MARKETING PLAN

### Hero Headline:
**"The Only Content Optimizer You Need"**

### Sub-headline:
*"Get search intent, entities, LSI keywords, schema markup, topic clusters, and AI rewrites â€” all in one comprehensive analysis."*

### Comparison Table:
| Feature | Surfer SEO | Frase | **Optmizly** |
|---------|------------|-------|-------------------|
| Content Score | âœ… | âœ… | âœ… |
| Search Intent | âŒ | âŒ | âœ… |
| Entity Analysis | Limited | Limited | âœ… Advanced |
| Schema Generator | âŒ | âŒ | âœ… |
| Topic Clusters | Limited | âŒ | âœ… |
| AI Rewrites | âœ… | âœ… | âœ… |
| Price | $89/mo | $115/mo | **$19/mo** |

---

## 10. CLAUDE CODE PROMPT

```
Implement Enhanced Content Optimizer combining all Semantic SEO features into one tool.

Use the architecture in this file. Replace existing Content Optimizer with enhanced version that includes:
1. Search Intent Detection
2. Entity Analysis (with relationships)
3. LSI Keywords (found + missing)
4. Schema Markup Generator (auto JSON-LD)
5. Topic Coverage & Clusters
6. E-E-A-T Score (existing)
7. AI Improvements

Run all 7 analyses in parallel using Claude API for speed.

Implementation:
1. Update Prisma schema (ContentOptimization, ContentOptimizationFix models)
2. Run migration
3. Create API route at src/app/api/tools/content-optimizer/route.ts
4. Create UI at src/app/dashboard/optimizer/page.tsx with 8 tabs
5. Update pricing page
6. Test all features
7. Commit and push

Keep quota system: FREE: 3/month, PRO: 50/month, AGENCY: 200/month
```

---

## END OF ARCHITECTURE FILE

This Enhanced Content Optimizer combines 5 separate semantic SEO tools into one powerful analyzer. Implementation time: 6-8 hours with Claude Code.

