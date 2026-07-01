import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const posts = [
  {
    slug: 'how-to-optimise-content-for-ai-search',
    title: 'How to Optimise Content for AI Search (ChatGPT, Perplexity, Gemini)',
    description: 'AI search engines cite sources differently from Google. Here\'s exactly how to make your content visible in ChatGPT, Perplexity, and Gemini answers.',
    category: 'AI Search',
    tags: 'ai search,llm citation,perplexity,chatgpt,content optimization',
    readingTime: '7 min read',
    content: `
<h2>Why AI search is different from Google</h2>
<p>When someone searches on Google, they see a list of links and choose which to click. When someone asks ChatGPT or Perplexity a question, they get a direct answer — with a small number of sources cited inline. If your content isn't one of those sources, you get zero traffic from that query, regardless of your Google ranking.</p>
<p>This is the core shift happening right now. Search is fragmenting. A growing share of research queries never reach Google at all — they go straight to AI assistants. And those assistants have very specific requirements for what they cite.</p>

<h2>How AI models decide what to cite</h2>
<p>Large language models and retrieval-augmented systems like Perplexity don't rank pages the way Google does. They evaluate content for a different set of signals:</p>
<ul>
  <li><strong>Answerability</strong> — Does your content directly answer a specific question? Pages that hedge or bury the answer rank poorly.</li>
  <li><strong>Entity coverage</strong> — Does your content mention the key entities (people, places, concepts, organisations) that a knowledgeable answer would include?</li>
  <li><strong>Factual density</strong> — AI models prefer content with specific numbers, dates, named examples, and attributable claims over vague generalisations.</li>
  <li><strong>Structured information</strong> — Headers, lists, tables, and FAQ sections make content easier to extract and cite.</li>
  <li><strong>Source authority</strong> — Does your content cite credible external sources? AI models are more likely to cite sources that themselves cite sources.</li>
</ul>

<h2>The 6 things to change in your content right now</h2>

<h3>1. Lead with the direct answer</h3>
<p>AI retrievers look for the most direct response to a query. If your article spends three paragraphs on background before answering, the model may not extract it correctly. Put the direct answer in the first paragraph — then expand with context and nuance below.</p>

<h3>2. Use specific numbers and named examples</h3>
<p>Compare these two sentences:</p>
<ul>
  <li>"Page speed is important for user experience."</li>
  <li>"Pages that load in under 2 seconds convert 15% better than pages that take 4 seconds (Google/Deloitte, 2023)."</li>
</ul>
<p>The second sentence is far more likely to be cited in an AI answer because it contains a specific, attributable claim. Go through your content and replace vague claims with specific ones wherever possible.</p>

<h3>3. Add FAQ sections</h3>
<p>FAQ sections map directly to how AI assistants receive queries — as questions. A well-structured FAQ with direct, specific answers to common questions in your niche is one of the highest-yield changes you can make for AI citation potential.</p>

<h3>4. Cover all the expected entities</h3>
<p>Every topic has a set of entities — people, concepts, tools, standards — that an authoritative answer would naturally include. If your content on "content marketing" doesn't mention HubSpot, Google Search Console, or content calendars, an AI model may judge it as incomplete. Run a content gap analysis to find which entities you're missing.</p>

<h3>5. Add external citations</h3>
<p>AI models are trained to value sources that themselves cite sources. Add links to relevant studies, official documentation, and credible publications in your field. This signals epistemic credibility — that your content is grounded in verifiable information, not opinion.</p>

<h3>6. Structure with descriptive headers</h3>
<p>Headers that describe exactly what the section covers ("How to calculate content ROI" rather than "Measuring success") help AI extractors identify and retrieve the right chunk of content for a specific query. Write your headers as if they're answers to questions someone might ask.</p>

<h2>How to measure your AI citation potential</h2>
<p>The challenge with AI search optimisation is that it's hard to measure directly. You can't check your "Perplexity ranking" the way you check your Google position. What you can measure is:</p>
<ul>
  <li><strong>Citation likelihood score</strong> — A structured evaluation of whether your content meets the criteria AI models use to cite sources.</li>
  <li><strong>Entity coverage</strong> — Which expected entities appear in your content and which are missing.</li>
  <li><strong>Answerability</strong> — Whether your content directly answers the queries you're targeting.</li>
</ul>
<p>Optmizly's <strong>AI Visibility</strong> and <strong>Citation Tracker</strong> tools score your content against these exact criteria and show you which specific changes will increase your citation likelihood for each target query.</p>

<h2>The bottom line</h2>
<p>AI search isn't replacing SEO — it's adding a new layer on top of it. The content that performs best in AI answers tends to also perform well in Google: it's specific, well-structured, authoritative, and genuinely useful. But the emphasis is different. AI search rewards directness, factual density, and entity completeness in ways that traditional SEO doesn't fully capture.</p>
<p>Start with your most important pages. Run them through an AI citation analysis, find the gaps, and fix the top three issues. The sites that get ahead of this now will be the ones AI models cite by default a year from now.</p>
    `.trim(),
    published: true,
  },

  {
    slug: 'what-is-eeat-and-how-to-improve-your-score',
    title: 'What Is E-E-A-T and How to Improve Your Score in 2025',
    description: 'E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness) is how Google evaluates content quality. Here\'s what it means and exactly how to improve each dimension.',
    category: 'SEO Fundamentals',
    tags: 'eeat,google,seo,content quality,expertise,trustworthiness',
    readingTime: '8 min read',
    content: `
<h2>What E-E-A-T actually means</h2>
<p>E-E-A-T stands for Experience, Expertise, Authoritativeness, and Trustworthiness. It's the framework Google's human quality raters use to evaluate pages, and it directly informs how Google's algorithms are trained to assess content quality. It's not a ranking signal you can check in Search Console — it's a collection of signals that, taken together, tell Google whether your content deserves to rank.</p>
<p>The extra "E" for Experience was added in December 2022. It distinguishes between someone who knows about a topic academically and someone who has actually done the thing they're writing about. A travel article written by someone who visited the destination reads differently — and ranks differently — from one produced by someone who has never been there.</p>

<h2>The four dimensions explained</h2>

<h3>Experience</h3>
<p>Experience signals show that the author has first-hand knowledge of what they're writing about. This includes:</p>
<ul>
  <li>Personal anecdotes, case studies, and specific outcomes ("when I ran this test for a client in 2023...")</li>
  <li>Original photos, screenshots, or data from real work</li>
  <li>Opinions that go beyond what every other article says — takes that only come from having actually done something</li>
  <li>Disclosure of personal context ("as a registered dietitian with 8 years of clinical practice...")</li>
</ul>

<h3>Expertise</h3>
<p>Expertise signals show formal or demonstrated knowledge in the subject area:</p>
<ul>
  <li>Author bio with relevant credentials, qualifications, and experience</li>
  <li>Content that demonstrates deep domain knowledge — specific terminology used correctly, nuanced positions, awareness of edge cases</li>
  <li>Citations of primary sources (research papers, official documentation, industry standards)</li>
  <li>Author pages that link to external profiles (LinkedIn, published works, speaking engagements)</li>
</ul>

<h3>Authoritativeness</h3>
<p>Authoritativeness is about reputation — what others say about you, not what you say about yourself:</p>
<ul>
  <li>Backlinks from authoritative sites in your niche</li>
  <li>Brand mentions and press coverage</li>
  <li>Citations of your content in other articles</li>
  <li>Reviews and testimonials (especially for local businesses and products)</li>
  <li>Social proof: followers, engagement, community presence</li>
</ul>

<h3>Trustworthiness</h3>
<p>Trustworthiness signals that your site is safe, honest, and reliable:</p>
<ul>
  <li>Clear author attribution on every article</li>
  <li>Transparent about-us and contact information</li>
  <li>Privacy policy and terms of service</li>
  <li>Accurate, up-to-date information with clear publication and update dates</li>
  <li>No deceptive ads, hidden affiliate disclosure, or misleading claims</li>
  <li>HTTPS and secure checkout (for e-commerce)</li>
</ul>

<h2>Why E-E-A-T matters more in some niches than others</h2>
<p>Google calls certain topics "Your Money or Your Life" (YMYL) — content that could significantly affect a reader's health, finances, safety, or wellbeing. Medical, legal, financial, and news content is held to an especially high E-E-A-T standard because bad information in these areas can cause real harm.</p>
<p>That said, E-E-A-T matters across all niches now. The 2023 Helpful Content updates made it clear that Google wants to reward content made by people with genuine knowledge and experience, regardless of topic.</p>

<h2>How to improve your E-E-A-T score: a practical checklist</h2>

<h3>Author signals</h3>
<ul>
  <li>Add a detailed author bio to every article (50–150 words, credentials, relevant experience)</li>
  <li>Create individual author pages and link articles to them</li>
  <li>Link author pages to LinkedIn, Twitter/X, and other professional profiles</li>
  <li>Include a headshot — real photos increase perceived trust</li>
</ul>

<h3>Content signals</h3>
<ul>
  <li>Add first-hand experience to every article: a case study, a personal example, original data</li>
  <li>Cite primary sources with hyperlinks — don't just say "studies show"</li>
  <li>Add "last updated" dates and actually keep content current</li>
  <li>Use schema markup: Article, Person, Organization, FAQPage</li>
</ul>

<h3>Site-wide signals</h3>
<ul>
  <li>Create a detailed About page that explains who runs the site and why</li>
  <li>Make contact information easy to find</li>
  <li>Add review and testimonial content</li>
  <li>Build topical authority by covering your niche deeply, not broadly</li>
</ul>

<h2>How to measure where you stand</h2>
<p>E-E-A-T is qualitative by nature, but you can score it systematically. Optmizly's <strong>E-E-A-T Analysis</strong> tool evaluates your content across all four dimensions and gives you a score out of 100 for each one, with specific recommendations for what to fix first. Run it on your most important pages to see where your biggest gaps are.</p>

<h2>The bottom line</h2>
<p>E-E-A-T isn't a checkbox — it's a long-term investment in becoming a site that both Google and readers trust. The sites winning in organic search right now are the ones that demonstrate genuine expertise, cite credible sources, and make it absolutely clear who is behind the content and why they're qualified to write it.</p>
<p>Start with your author bios and your top three articles. Get those right first, then build outward.</p>
    `.trim(),
    published: true,
  },

  {
    slug: 'how-to-do-a-content-gap-analysis',
    title: 'How to Do a Content Gap Analysis (Step-by-Step)',
    description: 'A content gap analysis reveals what topics your competitors rank for that you don\'t. Here\'s a step-by-step process to find and close the gaps.',
    category: 'SEO Strategy',
    tags: 'content gap analysis,seo strategy,competitor analysis,content marketing',
    readingTime: '7 min read',
    content: `
<h2>What is a content gap analysis?</h2>
<p>A content gap analysis is the process of finding topics, keywords, and entities your competitors rank for that you don't cover — or don't cover well enough. The "gap" is the difference between what your audience is searching for and what your site currently provides.</p>
<p>It's one of the highest-ROI activities in SEO because it tells you exactly where to invest your content effort. Instead of guessing what to write, you're filling proven demand that your competitors have already validated.</p>

<h2>Three types of content gaps</h2>

<h3>1. Keyword gaps</h3>
<p>Keywords your competitors rank for in positions 1–10 that you either don't rank for or rank outside the top 20. These represent direct opportunities where there's proven search demand and your competitors have demonstrated it's achievable.</p>

<h3>2. Topic gaps</h3>
<p>Broader subject areas your competitors cover in depth that you haven't addressed at all. A competitor might have a full "SEO for e-commerce" section with ten interlinked articles while you have none — that's a topic gap, not just a keyword gap.</p>

<h3>3. Entity gaps</h3>
<p>Specific entities — people, tools, concepts, organisations — that an authoritative resource on your topic would naturally cover. If your article on "content marketing tools" doesn't mention HubSpot, Ahrefs, or Semrush, AI models and Google may judge it as incomplete.</p>

<h2>Step-by-step content gap analysis process</h2>

<h3>Step 1: Define your comparison set</h3>
<p>Choose 3–5 competitors to analyse. These should be:</p>
<ul>
  <li><strong>Direct search competitors</strong> — sites that consistently appear in SERPs for your target keywords, even if they're not business competitors</li>
  <li><strong>Similar domain authority</strong> — sites in a comparable range to yours (±20 DA points) are more useful benchmarks than major publications</li>
  <li><strong>Focused on the same audience</strong> — a site writing for CMOs and one writing for solo bloggers have different content strategies even if they cover similar topics</li>
</ul>

<h3>Step 2: Map the competitor content landscape</h3>
<p>For each competitor, identify:</p>
<ul>
  <li>Their top-performing pages by estimated organic traffic</li>
  <li>The keyword clusters those pages target</li>
  <li>Topic categories they cover consistently</li>
  <li>The content types performing best (guides, comparison pages, case studies, tools)</li>
</ul>

<h3>Step 3: Audit your own content</h3>
<p>Before comparing, know what you have. Export all your indexed pages and tag them by topic. Look for:</p>
<ul>
  <li>Topics with thin coverage (one short article vs. a competitor's in-depth hub)</li>
  <li>High-priority keywords where you rank positions 11–20 (close to the first page — worth updating)</li>
  <li>Content that's outdated or hasn't been touched in 18+ months</li>
</ul>

<h3>Step 4: Identify the gaps</h3>
<p>Compare your content map against your competitors'. The gaps fall into three buckets:</p>
<ul>
  <li><strong>Not covered at all</strong> — topics competitors rank for that you have zero content on</li>
  <li><strong>Covered but thin</strong> — you have an article but it's 500 words vs. a competitor's 3,000-word comprehensive guide</li>
  <li><strong>Missing entities</strong> — your content exists but doesn't cover the key concepts, tools, or references that would make it complete</li>
</ul>

<h3>Step 5: Prioritise by opportunity</h3>
<p>Not every gap is worth filling. Prioritise based on:</p>
<ul>
  <li><strong>Search volume</strong> — higher volume gaps first</li>
  <li><strong>Keyword difficulty</strong> — gaps where competitors ranking have similar or lower authority to yours</li>
  <li><strong>Business relevance</strong> — topics that attract your target customer, not just any traffic</li>
  <li><strong>Content investment required</strong> — quick wins (adding entities to existing articles) vs. large investments (building a new content hub)</li>
</ul>

<h2>How to fill the gaps efficiently</h2>
<p>Once you've identified the gaps, there are three ways to close them:</p>
<ol>
  <li><strong>Update existing content</strong> — add missing entities, expand thin sections, add FAQ content. Often delivers faster results than creating new pages.</li>
  <li><strong>Create net-new content</strong> — for topics you have zero coverage on. Plan these as part of a topical cluster, not standalone articles.</li>
  <li><strong>Build content hubs</strong> — for large topic gaps, create a pillar page that links to multiple supporting articles. This builds topical authority faster than individual disconnected articles.</li>
</ol>

<h2>Automate the analysis</h2>
<p>Manual content gap analysis is time-consuming. Optmizly's <strong>Content Gap</strong> tool analyses your content against your topic area and surfaces specific gaps — missing entities, uncovered subtopics, and competitor content themes — in under a minute. Use it after running a content analysis to turn your score breakdown into a specific action list.</p>

<h2>How often to run a content gap analysis</h2>
<p>Content gaps change as competitors publish new content and search trends shift. A quarterly analysis is sufficient for most sites. If you're in a fast-moving niche (AI, finance, health), monthly makes sense for your highest-priority topic clusters.</p>

<h2>The bottom line</h2>
<p>Content gap analysis turns "what should I write?" from a guessing game into a data-driven process. The sites growing fastest in organic search are the ones that systematically identify and fill gaps rather than publishing random articles based on gut feel. Start with your three most important topic areas, find the five biggest gaps in each, and work through them in priority order.</p>
    `.trim(),
    published: true,
  },

  {
    slug: 'serp-analysis-why-you-are-not-ranking',
    title: 'SERP Analysis: How to Find Exactly Why You\'re Not Ranking',
    description: 'If you\'re not on page one, there\'s a specific reason. Here\'s how to do a proper SERP analysis to diagnose the gap and build a recovery plan.',
    category: 'SEO Strategy',
    tags: 'serp analysis,why not ranking,seo audit,competitor analysis,serp features',
    readingTime: '8 min read',
    content: `
<h2>Why "publish good content" isn't enough</h2>
<p>Most SEO advice boils down to "create high-quality content." That's true but useless if you don't understand why your existing content isn't ranking. The SERP for any given keyword tells you exactly what you need to do differently — if you know how to read it.</p>
<p>A SERP analysis is the process of examining the pages currently ranking for your target keyword and extracting the specific signals that explain their position. It's not about copying competitors — it's about understanding what Google has decided this query needs.</p>

<h2>Start with search intent</h2>
<p>Before analysing individual competitors, look at the SERP as a whole. What type of content dominates?</p>
<ul>
  <li><strong>Informational</strong> — long-form guides, how-tos, explainers. Searcher wants to learn.</li>
  <li><strong>Commercial</strong> — comparison pages, reviews, "best X" lists. Searcher is evaluating options.</li>
  <li><strong>Transactional</strong> — product pages, pricing pages, signup flows. Searcher is ready to act.</li>
  <li><strong>Navigational</strong> — the searcher wants a specific site or page.</li>
</ul>
<p>If the top 5 results for your target keyword are all long-form guides and you're targeting it with a product page, you're fighting the wrong battle. Google has decided this query is informational. You need informational content to rank — or you need to target a different keyword that matches your page type.</p>

<h2>The 6 things to check for each top-ranking page</h2>

<h3>1. Content depth and word count</h3>
<p>How comprehensive are the top-ranking pages? Word count alone doesn't cause rankings, but it's a proxy for depth. If the top 3 results average 3,000 words and your article is 800 words, you may simply be covering the topic less thoroughly. Look at the structure — how many H2 sections do they have? What subtopics do they cover that you don't?</p>

<h3>2. Domain and page authority</h3>
<p>What's the domain strength of the sites ranking above you? If positions 1–5 are occupied by sites with 20+ years of authority in your niche (think Moz, HubSpot, or NerdWallet in their respective domains), you may be targeting a keyword that's out of range for your current domain authority. The right move is to build authority on lower-competition related keywords first.</p>

<h3>3. Page type and URL structure</h3>
<p>Is the ranking content a blog post, a landing page, a category page, or a tool? A query dominated by tools (like "keyword density checker") won't rank a blog post in position 1, no matter how good it is. Match the page type to what the SERP rewards.</p>

<h3>4. E-E-A-T signals</h3>
<p>Do the ranking pages have clear author attribution with credentials? Are they citing primary sources? Do they demonstrate first-hand experience? If your content lacks these signals compared to what's ranking, that's a direct gap to close.</p>

<h3>5. On-page SEO fundamentals</h3>
<p>Check the basics: Does the target keyword appear in the title tag, H1, first paragraph, and URL? Are there LSI keywords and related terms naturally distributed through the content? Is the meta description compelling enough to drive clicks?</p>

<h3>6. SERP features</h3>
<p>What features appear on this SERP? Featured snippets, People Also Ask boxes, local packs, image carousels, and video results all affect click-through rates and tell you what format Google wants for this query. If there's a featured snippet, write a concise direct answer to target it. If there's a video carousel, consider whether a supporting video makes sense.</p>

<h2>Diagnosing the root cause</h2>
<p>After analysing the top results, you should be able to categorise your ranking gap into one of these root causes:</p>
<ul>
  <li><strong>Content depth gap</strong> — you cover the topic but not as thoroughly as what's ranking</li>
  <li><strong>Authority gap</strong> — your domain lacks the backlinks and reputation to compete for this keyword yet</li>
  <li><strong>Intent mismatch</strong> — your page type doesn't match what the SERP rewards for this query</li>
  <li><strong>E-E-A-T gap</strong> — your content lacks the trust and expertise signals competitors show</li>
  <li><strong>Technical gap</strong> — page speed, Core Web Vitals, or indexation issues are holding you back</li>
</ul>
<p>The root cause determines the fix. A content depth gap gets fixed by expanding your article. An authority gap gets fixed by building backlinks — or choosing a less competitive keyword in the short term. Misdiagnosing the cause leads to wasted effort.</p>

<h2>Building your recovery plan</h2>
<p>Once you've identified the root cause, build a phased plan:</p>
<ol>
  <li><strong>Phase 1 (weeks 1–4)</strong>: Fix the on-page issues you control — content depth, intent alignment, E-E-A-T signals, technical basics. These are the fastest-moving levers.</li>
  <li><strong>Phase 2 (weeks 5–10)</strong>: Build internal links from relevant pages to the target page. Strengthen topical authority by filling content gaps around the target topic.</li>
  <li><strong>Phase 3 (weeks 11–20)</strong>: Pursue external backlinks from sites with relevant authority. Promote the updated content to drive early signals.</li>
</ol>

<h2>Automate your SERP analysis</h2>
<p>Manual SERP analysis is thorough but time-consuming. Optmizly's <strong>SERP Audit</strong> tool automates the competitor breakdown — it fetches real SERP data for your keyword, analyses the top 5 competitors, identifies your specific gaps, and generates a phase-by-phase recovery plan. Run it on any keyword where you're stuck between positions 5 and 20.</p>

<h2>The bottom line</h2>
<p>You can't fix what you haven't diagnosed. "Publish more content" is the wrong answer if your problem is an authority gap. "Build more backlinks" is the wrong answer if your problem is intent mismatch. SERP analysis is the diagnostic step that makes everything else in SEO more efficient.</p>
<p>Pick your three most important keywords where you're ranking but not on page one. Run a SERP analysis on each. Find the root cause. Fix that specific thing. Repeat.</p>
    `.trim(),
    published: true,
  },

  {
    slug: 'topical-authority-what-it-is-and-how-to-build-it',
    title: 'Topical Authority: What It Is and How to Build It',
    description: 'Topical authority is how Google decides which sites are genuine experts on a subject. Here\'s what it means, why it matters, and the exact process for building it.',
    category: 'SEO Strategy',
    tags: 'topical authority,seo strategy,content strategy,pillar content,semantic seo',
    readingTime: '7 min read',
    content: `
<h2>What is topical authority?</h2>
<p>Topical authority is Google's assessment of how comprehensively and authoritatively a website covers a given subject. A site with high topical authority on, say, personal finance doesn't just have one viral article about budgeting — it has deep, interconnected coverage of budgeting, investing, tax planning, debt management, retirement, and every related subtopic, all linking to each other.</p>
<p>Google uses topical authority to decide which sites deserve to rank for competitive queries. A site with genuine topical authority can outrank a higher-DA competitor on a specific topic because Google has learned, from the breadth and depth of its coverage, that this site is a genuine expert on the subject.</p>

<h2>Why topical authority matters more than ever</h2>
<p>The shift toward topical authority accelerated with Google's Helpful Content System (2022–2023) and the core updates that followed. These updates explicitly targeted "thin" content — sites that covered many topics superficially — in favour of sites that demonstrated deep expertise in a specific domain.</p>
<p>Practically, this means:</p>
<ul>
  <li>A site that covers ten topics broadly will typically lose to ten sites that each cover one topic deeply</li>
  <li>Backlinks from authoritative sources matter less if you're missing the foundational content that establishes your expertise</li>
  <li>AI assistants like Perplexity cite sites with high topical authority more often, because they signal reliable domain expertise</li>
</ul>

<h2>The pillar and cluster model</h2>
<p>The most effective structure for building topical authority is the content hub: a pillar page supported by a cluster of interlinked subtopic articles.</p>
<ul>
  <li><strong>Pillar page</strong> — a comprehensive overview of a broad topic (e.g., "The Complete Guide to Content Marketing"). It covers all major subtopics at a high level and links to detailed cluster articles for each.</li>
  <li><strong>Cluster articles</strong> — deep dives into specific subtopics (e.g., "How to Build a Content Calendar," "Content Marketing KPIs," "B2B Content Marketing Strategy"). Each links back to the pillar and to related cluster articles.</li>
</ul>
<p>This internal link structure tells Google that these pages are all part of a coherent expertise area, not a collection of isolated articles. It also distributes PageRank efficiently within your most important topic clusters.</p>

<h2>How to identify the right topic clusters to build</h2>

<h3>Step 1: Define your core topic</h3>
<p>What is the one subject your site should own? Be specific. "Marketing" is too broad. "Email marketing for e-commerce brands" is a topic you can realistically dominate. Pick the most specific topic where your target audience overlaps with your genuine expertise.</p>

<h3>Step 2: Map the subtopics</h3>
<p>Every core topic has 8–15 major subtopics. For "email marketing for e-commerce," those might be: list building, segmentation, automations, deliverability, copywriting, design, A/B testing, analytics, and legal compliance. Each subtopic can become a cluster article or even its own mini-cluster.</p>

<h3>Step 3: Identify what you're missing</h3>
<p>Compare your current content to the full subtopic map. Which subtopics do you have zero coverage on? Which do you cover but at insufficient depth? Prioritise the gaps where your competitors have strong coverage — those are the queries you're losing to them on right now.</p>

<h3>Step 4: Build systematically</h3>
<p>Don't publish one article and move on to a different topic. Work through your cluster systematically — publish the pillar page, then build out the cluster articles one by one. Google learns your topical authority from the pattern of related content, not individual articles in isolation.</p>

<h2>The key signals Google uses to assess topical authority</h2>
<ul>
  <li><strong>Content breadth</strong> — how many of the subtopics within a domain do you cover?</li>
  <li><strong>Content depth</strong> — how thoroughly does each article cover its subtopic?</li>
  <li><strong>Internal linking</strong> — are related articles connected to each other and to the pillar page?</li>
  <li><strong>Entity coverage</strong> — does your content mention the key entities (tools, people, standards, concepts) that authoritative content on this topic would include?</li>
  <li><strong>Update frequency</strong> — is the content kept current? Stale content in fast-moving niches signals reduced authority.</li>
</ul>

<h2>Common mistakes that undermine topical authority</h2>
<ul>
  <li><strong>Topic dilution</strong> — publishing content on unrelated subjects breaks the topical signal. A personal finance site that starts covering travel or fitness is diluting its authority.</li>
  <li><strong>Thin cluster articles</strong> — cluster articles that are 300-word stubs don't add authority. Each piece needs to be genuinely useful and comprehensive for its specific subtopic.</li>
  <li><strong>Orphan pages</strong> — articles with no internal links from the pillar or other cluster pages don't contribute to topical authority. Every cluster article should be reachable within 2 clicks from your pillar page.</li>
  <li><strong>Ignoring entity gaps</strong> — if your content never mentions the key tools, people, and concepts in your niche, it signals inexperience to both Google and AI models.</li>
</ul>

<h2>How to measure your topical authority</h2>
<p>There's no single "topical authority score" in Google Search Console. But you can proxy it by tracking:</p>
<ul>
  <li>Average ranking position across your target keyword cluster</li>
  <li>Number of unique keywords your site ranks for in your core topic area</li>
  <li>Click-through rate on core topic queries (high CTR signals Google is presenting you as a trusted result)</li>
</ul>
<p>Optmizly's <strong>Topical Authority Mapper</strong> analyses your niche and generates a full map of the content clusters you need to build, the subtopics you're missing, and a prioritised plan for closing the gaps.</p>

<h2>The bottom line</h2>
<p>Topical authority is the long game of SEO. You don't build it with one article or one backlink campaign — you build it by becoming the most complete resource on a specific subject and maintaining that position over time. The sites that do this well tend to be remarkably resistant to algorithm updates, because they're doing exactly what Google says it wants to reward: genuine expertise, comprehensive coverage, and real helpfulness for readers in a specific domain.</p>
<p>Pick your core topic. Map your clusters. Fill the gaps systematically. That's the whole strategy.</p>
    `.trim(),
    published: true,
  },
]

async function main() {
  console.log('Seeding blog posts...')
  let created = 0
  for (const post of posts) {
    try {
      await prisma.blogPost.upsert({
        where: { slug: post.slug },
        update: { ...post, publishedAt: new Date() },
        create: { ...post, publishedAt: new Date() },
      })
      console.log(`✓ ${post.title}`)
      created++
    } catch (e) {
      console.error(`✗ ${post.slug}:`, e)
    }
  }
  console.log(`\nDone — ${created}/${posts.length} posts seeded.`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
