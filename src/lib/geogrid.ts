export type GridPoint = {
  lat: number
  lng: number
  row: number
  col: number
}

export type RankedGridPoint = GridPoint & { rank: number | null }

export type GridStats = {
  averageRank: number
  topThreePercent: number
  topTenPercent: number
  totalPoints: number
}

export function generateGrid(
  center: { lat: number; lng: number },
  gridSize: 5 | 7 | 9,
  spacing: number,
  unit: 'miles' | 'km'
): GridPoint[] {
  const spacingKm = unit === 'miles' ? spacing * 1.60934 : spacing
  const half = Math.floor(gridSize / 2)
  const points: GridPoint[] = []

  // cos(lat) correction for longitude degrees per km
  const lngDegPerKm = 1 / (111.32 * Math.cos(center.lat * (Math.PI / 180)))
  const latDegPerKm = 1 / 111.32

  for (let rowOffset = -half; rowOffset <= half; rowOffset++) {
    for (let colOffset = -half; colOffset <= half; colOffset++) {
      points.push({
        lat: center.lat + rowOffset * spacingKm * latDegPerKm,
        lng: center.lng + colOffset * spacingKm * lngDegPerKm,
        row: rowOffset + half,
        col: colOffset + half,
      })
    }
  }

  return points
}

export function getGridStats(results: RankedGridPoint[]): GridStats {
  const totalPoints = results.length
  const ranked = results.filter((p): p is RankedGridPoint & { rank: number } => p.rank !== null)

  if (ranked.length === 0) {
    return { averageRank: 0, topThreePercent: 0, topTenPercent: 0, totalPoints }
  }

  const sum = ranked.reduce((acc, p) => acc + p.rank, 0)
  const avgRaw = sum / ranked.length

  return {
    averageRank: Math.round(avgRaw * 10) / 10,
    topThreePercent: Math.round((ranked.filter(p => p.rank <= 3).length / totalPoints) * 100),
    topTenPercent: Math.round((ranked.filter(p => p.rank <= 10).length / totalPoints) * 100),
    totalPoints,
  }
}
