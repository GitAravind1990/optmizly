import {
  AVAILABLE_COMPONENTS,
  MIN_ANSWERS_FOR_SCORE,
  MIN_ANSWERS_FOR_CONFIDENCE,
  SCORE_WEIGHTS,
  type Confidence,
  type ScoreComponent,
} from './config'
import {
  authorityShare,
  citationMetrics,
  queryCoverage,
  visibilityRate,
  type QueryObservation,
} from './derive'

/**
 * The AI Presence score, and the arithmetic behind it.
 *
 * Two rules the instruction is explicit about, both implemented here rather than in the UI:
 *
 *  - **A component with no data source is excluded and the rest renormalised**, never scored
 *    as zero. Discovery has no log ingestion in the MVP; scoring it 0 would mean a customer
 *    doing everything right caps at 90 because of a feature we have not built.
 *  - **Too little data produces no score at all.** A citation rate over three answers is
 *    noise with a number printed on it, and the product would rather say "not enough data".
 */

export type ComponentScore = {
  key: ScoreComponent
  label: string
  /** 0-100, or null when this component has no data source yet. */
  score: number | null
  /** The configured weight, before renormalisation. */
  weight: number
  /** The weight actually applied, after excluding unavailable components. */
  effectiveWeight: number
  available: boolean
  /** The raw counts behind the score, so a reader can check it. */
  detail: string
}

export type PresenceScore = {
  /** Null when the data floor is not met. The UI prints "Insufficient data". */
  totalScore: number | null
  components: ComponentScore[]
  confidence: Confidence
  /** Answered prompts the score was computed from. */
  dataCoverage: { answers: number; attempted: number; runs: number }
  /** Plain-English arithmetic, for the explainability requirement. */
  explanation: string[]
  /** Why there is no score, when there is none. */
  insufficientReason: string | null
}

const LABELS: Record<ScoreComponent, string> = {
  visibility: 'AI Visibility',
  citation: 'Citation Performance',
  authority: 'AI Share of Authority',
  coverage: 'Query Coverage',
  discovery: 'AI Discovery',
}

const pct = (n: number) => Math.round(n * 100)

export function computePresenceScore(
  obs: QueryObservation[],
  targetHost: string | null,
  runCount: number
): PresenceScore {
  const vis = visibilityRate(obs)
  const cit = citationMetrics(obs, targetHost)
  const auth = authorityShare(obs, targetHost)
  const cov = queryCoverage(obs)

  const raw: Record<ScoreComponent, { score: number | null; detail: string }> = {
    visibility: {
      score: vis.rate === null ? null : pct(vis.rate),
      detail: `${vis.named} of ${vis.answers} AI answers named the brand`,
    },
    citation: {
      score: cit.citationRate === null ? null : pct(cit.citationRate),
      detail: `${cit.citationCount} of ${cit.opportunities} AI answers cited the domain`,
    },
    authority: {
      score: auth.share === null ? null : pct(auth.share),
      detail: `${auth.targetCitations} of ${auth.totalCitations} total citations in these answers`,
    },
    coverage: {
      score: cov.rate === null ? null : pct(cov.rate),
      detail: `${cov.answered} of ${cov.attempted} prompts produced an AI answer`,
    },
    discovery: {
      score: null,
      detail: 'Not connected — needs server or CDN logs',
    },
  }

  // Available means "this component has a data source AND that source produced something".
  // Both halves matter: discovery fails the first, and a brand-new account fails the second.
  const components: ComponentScore[] = (Object.keys(SCORE_WEIGHTS) as ScoreComponent[]).map(key => {
    const available = AVAILABLE_COMPONENTS.includes(key) && raw[key].score !== null
    return {
      key,
      label: LABELS[key],
      score: raw[key].score,
      weight: SCORE_WEIGHTS[key],
      effectiveWeight: 0,
      available,
      detail: raw[key].detail,
    }
  })

  const usable = components.filter(c => c.available)
  const weightSum = usable.reduce((n, c) => n + c.weight, 0)
  for (const c of usable) {
    // Renormalise across what we can measure, so the weights still sum to 1.
    c.effectiveWeight = weightSum ? c.weight / weightSum : 0
  }

  const dataCoverage = { answers: cov.answered, attempted: cov.attempted, runs: runCount }

  if (cov.answered < MIN_ANSWERS_FOR_SCORE || !usable.length) {
    return {
      totalScore: null,
      components,
      confidence: 'LOW',
      dataCoverage,
      explanation: [],
      insufficientReason:
        cov.attempted === 0
          ? 'No AI visibility scans yet.'
          : `Scored once at least ${MIN_ANSWERS_FOR_SCORE} prompts return an AI answer — ${cov.answered} so far.`,
    }
  }

  const total = Math.round(
    usable.reduce((n, c) => n + (c.score as number) * c.effectiveWeight, 0)
  )

  const confidence: Confidence =
    cov.answered >= MIN_ANSWERS_FOR_CONFIDENCE.HIGH ? 'HIGH'
    : cov.answered >= MIN_ANSWERS_FOR_CONFIDENCE.MEDIUM ? 'MEDIUM'
    : 'LOW'

  const excluded = components.filter(c => !c.available)
  const explanation = [
    ...usable.map(
      c => `${c.label}: ${c.score} × ${Math.round(c.effectiveWeight * 100)}% — ${c.detail}`
    ),
    ...(excluded.length
      ? [`Excluded and reweighted: ${excluded.map(c => c.label).join(', ')}. A component with no data is never counted as zero.`]
      : []),
    `Based on ${cov.answered} AI answers across ${runCount} scan${runCount === 1 ? '' : 's'}.`,
  ]

  return { totalScore: total, components, confidence, dataCoverage, explanation, insufficientReason: null }
}

export type PeriodChange = {
  metric: string
  current: number | null
  previous: number | null
  /** Null when either side is missing — never a fabricated baseline. */
  delta: number | null
  unavailableReason: string | null
}

/**
 * Current period against the one before it.
 *
 * Returns `delta: null` and a reason whenever either side is missing, rather than treating an
 * absent previous period as zero. "Visibility up 62 points" on a first-ever scan would be
 * the most flattering possible lie, and it is the exact shape of fabrication this product is
 * meant to avoid.
 */
export function comparePeriods(
  current: QueryObservation[],
  previous: QueryObservation[],
  targetHost: string | null
): PeriodChange[] {
  const noPrevious = previous.length === 0
  const build = (metric: string, cur: number | null, prev: number | null): PeriodChange => ({
    metric,
    current: cur,
    previous: prev,
    delta: cur === null || prev === null ? null : cur - prev,
    unavailableReason:
      noPrevious ? 'Not enough historical data — run another scan to compare.'
      : cur === null || prev === null ? 'No AI answers in one of the periods.'
      : null,
  })

  const curVis = visibilityRate(current), prevVis = visibilityRate(previous)
  const curCit = citationMetrics(current, targetHost), prevCit = citationMetrics(previous, targetHost)
  const curAuth = authorityShare(current, targetHost), prevAuth = authorityShare(previous, targetHost)

  return [
    build('AI Visibility', curVis.rate === null ? null : pct(curVis.rate), prevVis.rate === null ? null : pct(prevVis.rate)),
    build('Citations', curCit.citationCount, noPrevious ? null : prevCit.citationCount),
    build('Citation Rate', curCit.citationRate === null ? null : pct(curCit.citationRate), prevCit.citationRate === null ? null : pct(prevCit.citationRate)),
    build('AI Share of Authority', curAuth.share === null ? null : pct(curAuth.share), prevAuth.share === null ? null : pct(prevAuth.share)),
  ]
}
