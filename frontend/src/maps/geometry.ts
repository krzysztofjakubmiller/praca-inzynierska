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

// Czy odcinek między dwiema stacjami biegnie prosto w poprzek osi pionowej albo poziomej.
function crosses(a: Point | undefined, b: Point | undefined, vertical: boolean): boolean {
  if (!a || !b) return false
  return vertical ? a.y === b.y && a.x !== b.x : a.x === b.x && a.y !== b.y
}

/**
 * Łamana linii przez kolejne stacje. Przy różnych krokach wzdłuż i w poprzek odcinek
 * po skosie nie miałby 45 stopni, więc rysujemy go jako skos 45° i prosty kawałek.
 * Prosty kawałek stoi przy stacji końcowej, chyba że następny odcinek biegnie w poprzek:
 * wtedy przy początkowej, a gdy w poprzek biegną oba sąsiednie, pośrodku. Dzięki temu
 * linia nigdzie nie skręca o 90 stopni.
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
        const vertical = Math.abs(dy) > Math.abs(dx)
        let lead = diagonal
        if (crosses(to, stations[index + 1], vertical)) {
          lead = crosses(stations[index - 2], from, vertical) ? diagonal / 2 : 0
        }
        const tail = diagonal - lead
        const sx = Math.sign(dx)
        const sy = Math.sign(dy)
        if (lead > 0) route.push({ x: from.x + sx * lead, y: from.y + sy * lead })
        if (tail > 0) route.push({ x: to.x - sx * tail, y: to.y - sy * tail })
      }
    }
    route.push(to)
  })
  return route
}
