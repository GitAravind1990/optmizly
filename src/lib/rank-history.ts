interface RankHistoryDelegate {
  findFirst(args: {
    where: { keywordId: string; checkedDate: { lte: Date } }
    orderBy: { checkedDate: 'desc' }
  }): Promise<{ rank: number | null } | null>
}

/**
 * Closest real history point at or before N days ago — real check-ins don't land on
 * exact daily boundaries (skipped runs, off-schedule manual checks), so "on or before"
 * is the standard rank-tracker definition of "the rank N days ago." Shared by Rank
 * Tracker (prisma.rankHistory) and Local SEO (prisma.localRankHistory), which use the
 * identical convention against different Prisma models.
 */
export async function rankNDaysAgo(delegate: RankHistoryDelegate, keywordId: string, daysAgo: number): Promise<number | null> {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - daysAgo)
  cutoff.setHours(23, 59, 59, 999)
  const row = await delegate.findFirst({
    where: { keywordId, checkedDate: { lte: cutoff } },
    orderBy: { checkedDate: 'desc' },
  })
  return row?.rank ?? null
}
