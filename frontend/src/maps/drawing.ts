import { project, routeLine, type Orientation, type Point, type Steps } from './geometry'
import { placeLabels, type Box, type MainSide, type PlacedLabel } from './labels'
import { passengerCount } from './progress'
import type { Difficulty, LineColor, MapProgress, TopicMap } from './types'

export interface DrawOptions {
  width: number
  height: number
  /** Bez podanej orientacji wybiera ją kształt dostępnego miejsca. */
  orientation?: Orientation
  measure: (text: string, fontSize: number, bold?: boolean) => number
  /** Postęp ucznia; od niego zależą pasażerowie i zaznaczenie ostatniej stacji. */
  progress?: MapProgress<string>
}

export interface DrawnLine {
  id: string
  color: LineColor
  points: Point[]
}

export interface DrawnStation {
  id: string
  at: Point
  radius: number
  difficulty: Difficulty
  transfer: boolean
  passengers: number
  /** Promień kółka wokół ostatnio robionej stacji. */
  ring?: number
}

export interface MapDrawing {
  orientation: Orientation
  viewBox: Box
  /** Ile razy trzeba pomniejszyć rysunek, żeby zmieścił się w dostępnym miejscu (1 bez zmian). */
  fit: number
  steps: Steps
  fontSize: number
  lineHeight: number
  lineWidth: number
  strokeWidth: number
  /** Wymiary jednego znaku pasażera i odstęp między znakami. */
  passenger: { width: number; height: number; gap: number }
  lines: DrawnLine[]
  stations: DrawnStation[]
  labels: PlacedLabel[]
}

// Wymiary na telefonie; na większych ekranach rosną razem ze skalą.
const BASE = {
  fontSize: 14,
  radius: 8,
  lineWidth: 7,
  strokeWidth: 3,
  labelGap: 5,
  across: 44,
  passenger: { width: 6.5, height: 10.5, gap: 2.5 },
  badgeGap: 2,
}
const TRANSFER_SCALE = 1.3
// Najdalej od środka stacji sięgają rogi trójkąta: około 1,35 jej promienia.
const SHAPE_REACH = 1.36
// Odstęp kółka ostatniej stacji od jej konturu.
const RING_GAP = 3
const CONTINUE_NOTE = 'Kontynuuj'
const PHONE_WIDTH = 358
const PADDING = 12
// Odstęp etykiet od bocznych krawędzi mapy pionowej, także spod paska przewijania.
const EDGE = 6
// Obszar bez granic dla osi, na której mapa może rosnąć.
const UNBOUNDED = 1e6
// Kroki mapy poziomej: najmniejsze, przy których etykiety jeszcze się mieszczą, i największe,
// żeby na dużym monitorze mapa nie była olbrzymia.
const LANDSCAPE_STEPS = { along: { min: 58, max: 110 }, across: { min: 80, max: 220 } }
// Rzędy mogą stać dalej od siebie niż stacje na linii (skos kończy się wtedy pionowym
// odcinkiem), ale najwyżej 2,4 raza, żeby mapa nie rozjechała się w pionie.
const MAX_ACROSS_PER_ALONG = 2.4
// Mapa pozioma pomniejszona bardziej niż do 80% ma za mały tekst; wtedy lepszy jest pion.
const MIN_LANDSCAPE_FIT = 0.8

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function gridSize(map: TopicMap): { columns: number; rows: number } {
  const points = Object.values(map.layout.points)
  return {
    columns: Math.max(...points.map((point) => point.x)) + 1,
    rows: Math.max(...points.map((point) => point.y)) + 1,
  }
}

interface Composition {
  map: TopicMap
  orientation: Orientation
  steps: Steps
  scale: number
  /** Przesunięcie całej siatki w pikselach. */
  offset: Point
  /** Obszar, poza który etykiety nie mogą wyjść. */
  bounds: Box
  options: DrawOptions
  /** Etykiety na zmianę nad i pod linią (tylko w poziomie). */
  alternate?: boolean
}

function compose({
  map,
  orientation,
  steps,
  scale,
  offset,
  bounds,
  options,
  alternate = false,
}: Composition): MapDrawing {
  const fontSize = Math.round(BASE.fontSize * scale * 2) / 2
  const lineHeight = Math.round(fontSize * 1.2)
  const radius = BASE.radius * scale
  const lineWidth = BASE.lineWidth * scale
  const strokeWidth = BASE.strokeWidth * scale
  const passenger = {
    width: BASE.passenger.width * scale,
    height: BASE.passenger.height * scale,
    gap: BASE.passenger.gap * scale,
  }

  const projected = project(map.layout.points, orientation, steps)
  const at = (id: string): Point => {
    const point = projected.get(id)!
    return { x: point.x + offset.x, y: point.y + offset.y }
  }

  const lines = map.graph.lines.map((line) => ({
    id: line.id,
    color: line.color,
    points: routeLine(line.stations.map(at)),
  }))
  const lineCount = new Map<string, number>()
  for (const id of map.graph.lines.flatMap((line) => line.stations)) {
    lineCount.set(id, (lineCount.get(id) ?? 0) + 1)
  }
  const stations = Object.entries(map.graph.stations).map(([id, station]) => {
    const transfer = (lineCount.get(id) ?? 0) > 1
    const size = transfer ? radius * TRANSFER_SCALE : radius
    // Kółko nie dotyka konturu: połowa grubości konturu, odstęp i połowa grubości kółka.
    const ring =
      options.progress?.lastStation === id
        ? size * SHAPE_REACH + strokeWidth + RING_GAP * scale
        : undefined
    return {
      id,
      at: at(id),
      radius: size,
      difficulty: station.difficulty,
      transfer,
      passengers: passengerCount(options.progress?.topics[id]),
      ring,
    }
  })

  const xs = stations.map((station) => station.at.x)
  const ys = stations.map((station) => station.at.y)
  const center = {
    x: (Math.min(...xs) + Math.max(...xs)) / 2,
    y: (Math.min(...ys) + Math.max(...ys)) / 2,
  }
  // Etykieta idzie najpierw na zewnątrz mapy: w pionie na lewo albo prawo, w poziomie pod
  // dolnym rzędem i nad pozostałymi. Gdy w poziomie nazwy się tak nie mieszczą, kolejne
  // stacje biorą na zmianę górę i dół linii.
  const lastRow = Math.max(...ys)
  const prefer = (id: string, point: Point): MainSide => {
    if (orientation === 'portrait') return point.x < center.x - 1 ? 'left' : 'right'
    if (alternate) return map.layout.points[id]!.y % 2 === 0 ? 'above' : 'below'
    return point.y > lastRow - 1 ? 'below' : 'above'
  }

  const labels = placeLabels(
    stations.map((station) => ({
      id: station.id,
      text: map.graph.stations[station.id]!.shortName ?? map.graph.stations[station.id]!.name,
      note: station.ring ? CONTINUE_NOTE : undefined,
      at: station.at,
      radius: (station.ring ?? station.radius) + strokeWidth / 2,
      transfer: station.transfer,
      prefer: prefer(station.id, station.at),
      side: map.layout.labels?.[station.id]?.[orientation],
      badge:
        station.passengers > 0
          ? {
              width: station.passengers * (passenger.width + passenger.gap) - passenger.gap,
              height: passenger.height,
            }
          : undefined,
    })),
    {
      measure: (text, bold) => options.measure(text, fontSize, bold),
      lineHeight,
      badgeGap: BASE.badgeGap * scale,
      gap: BASE.labelGap * scale,
      lineClearance: lineWidth / 2 + 2,
      segments: lines.flatMap((line) =>
        line.points.slice(1).map((to, index) => [line.points[index]!, to] as const),
      ),
      bounds,
      preferTwoLines: orientation === 'landscape',
    },
  )

  const boxes = [
    ...labels.map((label) => label.box),
    ...stations.map((station) => {
      const reach = (station.ring ?? station.radius * SHAPE_REACH) + strokeWidth
      return {
        x: station.at.x - reach,
        y: station.at.y - reach,
        width: 2 * reach,
        height: 2 * reach,
      }
    }),
  ]
  const left = Math.min(...boxes.map((box) => box.x)) - PADDING
  const top = Math.min(...boxes.map((box) => box.y)) - PADDING
  const right = Math.max(...boxes.map((box) => box.x + box.width)) + PADDING
  const bottom = Math.max(...boxes.map((box) => box.y + box.height)) + PADDING
  // W pionie rysunek ma zawsze całą szerokość miejsca: granice etykiet i margines po bokach.
  const viewBox =
    orientation === 'portrait'
      ? { x: 0, y: top, width: bounds.width + 2 * bounds.x, height: bottom - top }
      : { x: left, y: top, width: right - left, height: bottom - top }

  return {
    orientation,
    viewBox,
    fit: 1,
    steps,
    fontSize,
    lineHeight,
    lineWidth,
    strokeWidth,
    passenger,
    lines,
    stations,
    labels,
  }
}

function failures(drawing: MapDrawing): number {
  return drawing.labels.filter((label) => label.overlaps).length
}

// Pion: szerokość jest twarda, a wysokość w miarę możliwości wypełnia ekran; jeśli mapa
// się nie zmieści, przewija się w pionie.
function drawPortrait(map: TopicMap, options: DrawOptions): MapDrawing {
  const { columns, rows } = gridSize(map)
  const scale = clamp(options.width / PHONE_WIDTH, 1, 1.35)
  const across = BASE.across * scale
  const bounds = { x: EDGE, y: -UNBOUNDED, width: options.width - 2 * EDGE, height: 2 * UNBOUNDED }
  const room = options.width - (columns - 1) * across
  const alongFor = (margin: number) =>
    clamp((options.height - margin) / Math.max(rows - 1, 1), across, across * 1.35)

  // Siatka stoi pośrodku, a jeśli etykiety się nie mieszczą, przesuwa się w bok.
  const arrange = (along: number): MapDrawing => {
    let best: MapDrawing | undefined
    for (let shift = 0; shift <= room / 2; shift += 6) {
      for (const direction of shift === 0 ? [1] : [1, -1]) {
        const drawing = compose({
          map,
          orientation: 'portrait',
          steps: { along, across },
          scale,
          offset: { x: room / 2 + shift * direction, y: 0 },
          bounds,
          options,
        })
        if (failures(drawing) === 0) return drawing
        if (!best || failures(drawing) < failures(best)) best = drawing
      }
    }
    return best!
  }

  // Najpierw z przybliżonym miejscem na etykiety nad pierwszą i pod ostatnią stacją,
  // potem jeszcze raz z miejscem, które faktycznie zajęły.
  const first = arrange(alongFor(4 * BASE.radius * scale + 2 * PADDING))
  const along = alongFor(first.viewBox.height - (rows - 1) * first.steps.along)
  return Math.abs(along - first.steps.along) > 0.5 ? arrange(along) : first
}

// Poziom: mapa wypełnia dostępne miejsce, a krok siatki ma dolną i górną granicę. Gdy przy
// najmniejszym kroku mapa się nie mieści, cały rysunek jest pomniejszany razem z napisami,
// zamiast ściskać etykiety.
function drawLandscape(map: TopicMap, options: DrawOptions): MapDrawing {
  const { columns, rows } = gridSize(map)
  const bounds = { x: -UNBOUNDED, y: -UNBOUNDED, width: 2 * UNBOUNDED, height: 2 * UNBOUNDED }
  const { along: alongLimits, across: acrossLimits } = LANDSCAPE_STEPS
  const alongFor = (margin: number) =>
    clamp((options.width - margin) / (rows - 1), alongLimits.min, alongLimits.max)
  const acrossFor = (margin: number, along: number) =>
    clamp(
      (options.height - margin) / (columns - 1),
      acrossLimits.min,
      Math.max(acrossLimits.min, Math.min(acrossLimits.max, along * MAX_ACROSS_PER_ALONG)),
    )

  const draw = (steps: Steps): MapDrawing => {
    const scale = clamp(steps.along / 70, 1, 1.2)
    const place = (alternate: boolean) =>
      compose({
        map,
        orientation: 'landscape',
        steps,
        scale,
        offset: { x: 0, y: 0 },
        bounds,
        options,
        alternate,
      })
    const outward = place(false)
    if (failures(outward) === 0) return outward
    const alternating = place(true)
    return failures(alternating) < failures(outward) ? alternating : outward
  }

  // Najpierw z przybliżonym miejscem na etykiety wystające poza siatkę, potem jeszcze raz
  // z miejscem, które faktycznie zajęły.
  const firstAlong = alongFor(160)
  let drawing = draw({ along: firstAlong, across: acrossFor(120, firstAlong) })
  const along = alongFor(drawing.viewBox.width - (rows - 1) * drawing.steps.along)
  const steps = {
    along,
    across: acrossFor(drawing.viewBox.height - (columns - 1) * drawing.steps.across, along),
  }
  if (
    Math.abs(steps.along - drawing.steps.along) > 0.5 ||
    Math.abs(steps.across - drawing.steps.across) > 0.5
  ) {
    drawing = draw(steps)
  }
  const fit = Math.min(
    1,
    options.width / drawing.viewBox.width,
    options.height / drawing.viewBox.height,
  )
  return { ...drawing, fit }
}

export function drawMap(map: TopicMap, options: DrawOptions): MapDrawing {
  if (options.orientation === 'portrait') return drawPortrait(map, options)
  if (options.orientation === 'landscape') return drawLandscape(map, options)
  // Poziom tylko na wyraźnie szerokim miejscu i tylko wtedy, gdy mapa nie musi się
  // za bardzo zmniejszać; w przeciwnym razie pion z przewijaniem.
  if (options.width >= options.height * 1.2) {
    const landscape = drawLandscape(map, options)
    if (landscape.fit >= MIN_LANDSCAPE_FIT && failures(landscape) === 0) return landscape
  }
  return drawPortrait(map, options)
}
