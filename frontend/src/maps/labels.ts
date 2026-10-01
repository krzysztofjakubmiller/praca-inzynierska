import type { Point } from './geometry'
import type { LabelSide } from './types'

export interface Box {
  x: number
  y: number
  width: number
  height: number
}

export type MainSide = 'right' | 'left' | 'above' | 'below'

export interface LabelRequest {
  id: string
  text: string
  at: Point
  /** Promień znacznika razem z konturem. */
  radius: number
  transfer: boolean
  /** Strona, od której zaczyna się szukanie miejsca. */
  prefer: MainSide
  /** Strona wybrana ręcznie w układzie mapy; automat sprawdza ją najpierw. */
  side?: LabelSide
  /** Rząd znaków pasażerów przy nazwie. */
  badge?: { width: number; height: number }
  /** Pogrubiony wiersz pod nazwą, np. „Kontynuuj”; nie jest łamany. */
  note?: string
}

export interface PlacedLabel {
  id: string
  lines: string[]
  note?: string
  side: LabelSide
  box: Box
  /** Nie było wolnego miejsca i etykieta na coś nachodzi. */
  overlaps: boolean
  /** Górna krawędź pierwszego wiersza nazwy. */
  textTop: number
  /** Górna krawędź rzędu pasażerów. */
  badgeTop?: number
}

export interface LabelSettings {
  measure: (text: string, bold?: boolean) => number
  lineHeight: number
  /** Odstęp między nazwą a rzędem pasażerów. */
  badgeGap: number
  /** Odstęp etykiety od znacznika. */
  gap: number
  /** Jak blisko linii mapy może stanąć etykieta: połowa grubości linii i margines. */
  lineClearance: number
  segments: readonly (readonly [Point, Point])[]
  /** Obszar, poza który etykieta nie może wyjść. */
  bounds: Box
  preferTwoLines: boolean
}

const SEARCH_ORDER: Record<MainSide, readonly LabelSide[]> = {
  right: [
    'right',
    'above-right',
    'below-right',
    'above',
    'below',
    'left',
    'above-left',
    'below-left',
  ],
  left: [
    'left',
    'above-left',
    'below-left',
    'above',
    'below',
    'right',
    'above-right',
    'below-right',
  ],
  above: [
    'above',
    'above-right',
    'above-left',
    'right',
    'left',
    'below',
    'below-right',
    'below-left',
  ],
  below: [
    'below',
    'below-right',
    'below-left',
    'right',
    'left',
    'above',
    'above-right',
    'above-left',
  ],
}

// Dwa wiersze łamane na spacji najbliższej środka nazwy.
function twoLines(text: string): string[] | undefined {
  let best = -1
  for (let index = text.indexOf(' '); index > 0; index = text.indexOf(' ', index + 1)) {
    if (best < 0 || Math.abs(index - text.length / 2) < Math.abs(best - text.length / 2)) {
      best = index
    }
  }
  return best > 0 ? [text.slice(0, best), text.slice(best + 1)] : undefined
}

// Etykieta po skosie może stać bliżej albo dalej od stacji; dalsza omija znaczniki sąsiadów.
const DIAGONAL_REACH = [0.75, 1]

function candidate(
  side: LabelSide,
  at: Point,
  offset: number,
  reach: number,
  width: number,
  height: number,
): Box {
  const diagonal = offset * reach
  const [x, y] = {
    right: [at.x + offset, at.y - height / 2],
    left: [at.x - offset - width, at.y - height / 2],
    above: [at.x - width / 2, at.y - offset - height],
    below: [at.x - width / 2, at.y + offset],
    'above-right': [at.x + diagonal, at.y - diagonal - height],
    'above-left': [at.x - diagonal - width, at.y - diagonal - height],
    'below-right': [at.x + diagonal, at.y + diagonal],
    'below-left': [at.x - diagonal - width, at.y + diagonal],
  }[side]
  return { x: x!, y: y!, width, height }
}

function grow(box: Box, by: number): Box {
  return { x: box.x - by, y: box.y - by, width: box.width + 2 * by, height: box.height + 2 * by }
}

function overlap(a: Box, b: Box): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height
}

function inside(box: Box, bounds: Box): boolean {
  return (
    box.x >= bounds.x &&
    box.y >= bounds.y &&
    box.x + box.width <= bounds.x + bounds.width &&
    box.y + box.height <= bounds.y + bounds.height
  )
}

// Czy odcinek przecina prostokąt (przycinanie Lianga-Barsky'ego).
function crosses(box: Box, [a, b]: readonly [Point, Point]): boolean {
  const dx = b.x - a.x
  const dy = b.y - a.y
  let enter = 0
  let leave = 1
  const edges: [number, number][] = [
    [-dx, a.x - box.x],
    [dx, box.x + box.width - a.x],
    [-dy, a.y - box.y],
    [dy, box.y + box.height - a.y],
  ]
  for (const [p, q] of edges) {
    if (p === 0) {
      if (q < 0) return false
    } else if (p < 0) {
      enter = Math.max(enter, q / p)
    } else {
      leave = Math.min(leave, q / p)
    }
    if (enter > leave) return false
  }
  return true
}

interface Option {
  lines: string[]
  side: LabelSide
  box: Box
}

// Wszystkie miejsca, w których może stanąć etykieta, od najlepszego, i sposób, w jaki się
// w nich układa; do tego miejsce awaryjne, gdy żadne nie jest wolne.
function describe(request: LabelRequest, settings: LabelSettings) {
  const split = twoLines(request.text)
  const variants = [[request.text], ...(split ? [split] : [])]
  if (settings.preferTwoLines) variants.reverse()
  const order = SEARCH_ORDER[request.prefer]
  const sides = request.side
    ? [request.side, ...order.filter((side) => side !== request.side)]
    : order

  const { badge, note } = request
  // Wiersze tekstu: nazwa w jednym albo dwóch wierszach i ewentualnie wiersz pod nią.
  const rows = (lines: string[]) => lines.length + (note ? 1 : 0)
  const size = (lines: string[]) => ({
    width: Math.max(
      ...lines.map((line) => settings.measure(line)),
      note ? settings.measure(note, true) : 0,
      badge?.width ?? 0,
    ),
    height: rows(lines) * settings.lineHeight + (badge ? settings.badgeGap + badge.height : 0),
  })
  const offset = request.radius + settings.gap

  const options: Option[] = []
  for (const side of sides) {
    for (const lines of variants) {
      const { width, height } = size(lines)
      for (const reach of side.includes('-') ? DIAGONAL_REACH : [1]) {
        options.push({
          lines,
          side,
          box: candidate(side, request.at, offset, reach, width, height),
        })
      }
    }
  }
  const first = size(variants[0]!)
  const fallback: Option = {
    lines: variants[0]!,
    side: sides[0]!,
    box: candidate(sides[0]!, request.at, offset, 1, first.width, first.height),
  }

  // Pasażerowie stoją po tej stronie nazwy, która jest bliżej stacji.
  const label = ({ lines, side, box }: Option, overlaps: boolean): PlacedLabel => {
    const badgeFirst = badge !== undefined && side.startsWith('below')
    const textTop = badgeFirst ? box.y + badge.height + settings.badgeGap : box.y
    const badgeTop = badge
      ? badgeFirst
        ? box.y
        : box.y + rows(lines) * settings.lineHeight + settings.badgeGap
      : undefined
    return { id: request.id, lines, note, side, box, overlaps, textTop, badgeTop }
  }

  return { options, fallback, label }
}

/**
 * Rozmieszcza etykiety stacji. Dla każdej stacji sprawdza osiem miejsc wokół znacznika,
 * zaczynając od strony wskazanej w `prefer`, i bierze pierwsze, które nie nachodzi na linię,
 * inną stację ani wcześniej postawioną etykietę. Przesiadki idą pierwsze, bo mają
 * najmniej miejsca.
 */
export function placeLabels(
  requests: readonly LabelRequest[],
  settings: LabelSettings,
): PlacedLabel[] {
  const markers = requests.map((request) => ({
    id: request.id,
    box: grow({ ...request.at, width: 0, height: 0 }, request.radius + 1),
  }))
  const described = new Map(requests.map((request) => [request.id, describe(request, settings)]))
  const placed = new Map<string, PlacedLabel>()

  // Miejsce wolne od granic, linii i innych stacji; etykiety sprawdza osobno `blocking`.
  const free = (request: LabelRequest, box: Box) =>
    inside(box, settings.bounds) &&
    !markers.some((marker) => marker.id !== request.id && overlap(grow(box, 1), marker.box)) &&
    !settings.segments.some((segment) => crosses(grow(box, settings.lineClearance), segment))
  const blocking = (box: Box, ignore: string[]) =>
    [...placed.values()].filter(
      (label) => !ignore.includes(label.id) && overlap(grow(box, 2), label.box),
    )

  const failed: LabelRequest[] = []
  const ordered = [...requests].sort((a, b) => Number(b.transfer) - Number(a.transfer))
  for (const request of ordered) {
    const { options, fallback, label } = described.get(request.id)!
    const option = options.find(
      (item) => free(request, item.box) && blocking(item.box, [request.id]).length === 0,
    )
    placed.set(request.id, label(option ?? fallback, !option))
    if (!option) failed.push(request)
  }

  // Naprawa: gdy etykiecie bez miejsca przeszkadza tylko jedna wcześniej postawiona etykieta,
  // tamta przenosi się na inne wolne miejsce, jeśli je ma.
  for (const request of failed) {
    const { options, label } = described.get(request.id)!
    repair: for (const option of options) {
      if (!free(request, option.box)) continue
      const blockers = blocking(option.box, [request.id])
      if (blockers.length !== 1) continue
      const blocker = blockers[0]!
      const other = requests.find((item) => item.id === blocker.id)!
      const moved = described.get(other.id)!
      for (const alternative of moved.options) {
        if (
          alternative.box !== blocker.box &&
          free(other, alternative.box) &&
          !overlap(grow(alternative.box, 2), option.box) &&
          blocking(alternative.box, [other.id, request.id]).length === 0
        ) {
          placed.set(other.id, moved.label(alternative, false))
          placed.set(request.id, label(option, false))
          break repair
        }
      }
    }
  }

  return requests.map((request) => placed.get(request.id)!)
}
