import type { GridPoint } from './types'

export type Orientation = 'portrait' | 'landscape'

export interface Point {
  x: number
  y: number
}

/** Odstępy siatki w pikselach: wzdłuż mapy (między wierszami) i w poprzek (między kolumnami). */
export interface Steps {
  along: number
  across: number
}

/**
 * Zamienia punkty siatki na piksele. W poziomie mapa jest obrócona: góra mapy pionowej
 * trafia na lewo, więc czyta się ją od lewej do prawej.
 */
export function project(
  points: Readonly<Record<string, GridPoint>>,
  orientation: Orientation,
  steps: Steps,
): Map<string, Point> {
  const maxX = Math.max(...Object.values(points).map((point) => point.x))
  return new Map(
    Object.entries(points).map(([id, { x, y }]) => [
      id,
      orientation === 'portrait'
        ? { x: x * steps.across, y: y * steps.along }
        : { x: y * steps.along, y: (maxX - x) * steps.across },
    ]),
  )
}

/**
 * Łamana linii przez kolejne stacje. Przy różnych krokach wzdłuż i w poprzek odcinek
 * po skosie nie miałby 45 stopni, więc rysujemy go jako skos 45° od pierwszej stacji
 * i prosty dalszy ciąg.
 */
export function routeLine(stations: readonly Point[]): Point[] {
  const route: Point[] = []
  stations.forEach((to, index) => {
    const from = stations[index - 1]
    if (from) {
      const dx = to.x - from.x
      const dy = to.y - from.y
      const diagonal = Math.min(Math.abs(dx), Math.abs(dy))
      if (diagonal > 0 && Math.abs(Math.abs(dx) - Math.abs(dy)) > 0.5) {
        route.push({ x: from.x + Math.sign(dx) * diagonal, y: from.y + Math.sign(dy) * diagonal })
      }
    }
    route.push(to)
  })
  return route
}
