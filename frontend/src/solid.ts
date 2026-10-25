// Bryła z parametrami zamieniona na płaski rysunek jak w arkuszach CKE. Wynik rysuje PlaneFigure,
// więc kąty, cieniowanie i podpisy działają tak samo jak w figurach płaskich.
import type { PlaneFigure, Point, SolidFigure } from '@/figures'

type Vertex = [number, number, number]
type Segment = NonNullable<PlaneFigure['segments']>[number]

// Rzut ukośny: głębokość (y) pod kątem 45 stopni, skrócona o połowę.
const DEPTH = 0.5 * Math.SQRT1_2
// Okrąg podstawy walca, stożka i kuli widziany z ukosa jako spłaszczona elipsa.
const FLATTEN = 0.3

const project = ([x, y, z]: Vertex): Point => [x + y * DEPTH, z + y * DEPTH]

// Wielokąt foremny o boku a, z przednim bokiem poziomym: pierwszy wierzchołek z przodu po lewej,
// dalej przeciwnie do ruchu wskazówek zegara, patrząc z góry.
function regularBase(n: number, a: number): Vertex[] {
  const radius = a / (2 * Math.sin(Math.PI / n))
  return Array.from({ length: n }, (_, i) => {
    const angle = ((270 - 180 / n + (360 * i) / n) * Math.PI) / 180
    return [radius * Math.cos(angle), radius * Math.sin(angle), 0]
  })
}

function polyhedron(figure: SolidFigure): { vertices: Vertex[]; faces: number[][] } {
  const base =
    figure.solid === 'prostopadloscian'
      ? ([
          [0, 0, 0],
          [figure.a!, 0, 0],
          [figure.a!, figure.b!, 0],
          [0, figure.b!, 0],
        ] as Vertex[])
      : regularBase(figure.n!, figure.a!)
  const n = base.length
  const ring = Array.from({ length: n }, (_, i) => i)
  // Ściany obiegane przeciwnie do ruchu wskazówek zegara, patrząc z zewnątrz bryły.
  const bottom = [...ring].reverse()
  if (figure.solid === 'ostroslup') {
    const centre = base.reduce((sum, v) => [sum[0] + v[0] / n, sum[1] + v[1] / n, 0], [0, 0, 0])
    const apex: Vertex = [centre[0], centre[1], figure.h!]
    return {
      vertices: [...base, apex],
      faces: [bottom, ...ring.map((i) => [i, (i + 1) % n, n])],
    }
  }
  const top = base.map(([x, y]): Vertex => [x, y, figure.h!])
  return {
    vertices: [...base, ...top],
    faces: [
      bottom,
      ring.map((i) => n + i),
      ...ring.map((i) => [i, (i + 1) % n, n + ((i + 1) % n), n + i]),
    ],
  }
}

// Ściana zwrócona do patrzącego ma po rzucie obieg przeciwny do ruchu wskazówek zegara.
function facesViewer(face: number[], points: Point[]): boolean {
  let area = 0
  face.forEach((index, i) => {
    const [x1, y1] = points[index]!
    const [x2, y2] = points[face[(i + 1) % face.length]!]!
    area += x1 * y2 - x2 * y1
  })
  return area > -1e-9
}

export function solidToPlane(figure: SolidFigure): PlaneFigure {
  const points: Record<string, Point> = {}
  const segments: Segment[] = []
  const circles: NonNullable<PlaneFigure['circles']> = []
  // Wierzchołki bez nazwy dostają nazwy pomocnicze, których rysunek nie podpisuje.
  const id = (index: number) => figure.names?.[index] || `w${index}`
  const labels = new Map(
    (figure.edge_labels ?? []).map((edge) => [[edge.from, edge.to].sort().join(' '), edge.label]),
  )

  if (figure.solid === 'walec' || figure.solid === 'stozek' || figure.solid === 'kula') {
    const r = figure.r!
    const h = figure.solid === 'kula' ? 0 : figure.h!
    points[id(0)] = [0, 0]
    if (figure.solid === 'walec') {
      points[id(1)] = [0, h]
      circles.push({ center: id(1), radius: r, radius_y: r * FLATTEN })
      Object.assign(points, { l0: [-r, 0], l1: [-r, h], p0: [r, 0], p1: [r, h] })
      segments.push({ from: 'l0', to: 'l1' }, { from: 'p0', to: 'p1' })
    }
    if (figure.solid === 'stozek') {
      points[id(1)] = [0, h]
      Object.assign(points, { l0: [-r, 0], p0: [r, 0] })
      segments.push({ from: 'l0', to: id(1) }, { from: 'p0', to: id(1) })
    }
    if (figure.solid === 'kula') circles.push({ center: id(0), radius: r })
    circles.push({ center: id(0), radius: r, radius_y: r * FLATTEN, back_dashed: true })
    for (const [name, point] of Object.entries(figure.points ?? {})) {
      const degrees = point.base ?? point.top
      if (degrees == null) continue
      const angle = (degrees * Math.PI) / 180
      const z = point.top != null ? h : 0
      points[name] = [r * Math.cos(angle), z + r * FLATTEN * Math.sin(angle)]
    }
  } else {
    const { vertices, faces } = polyhedron(figure)
    const projected = vertices.map(project)
    projected.forEach((point, index) => (points[id(index)] = point))
    const visible = faces.filter((face) => facesViewer(face, projected))
    const done = new Set<string>()
    for (const face of faces) {
      face.forEach((from, i) => {
        const to = face[(i + 1) % face.length]!
        const key = [from, to].sort().join(' ')
        if (done.has(key)) return
        done.add(key)
        // Krawędź jest niewidoczna, gdy obie jej ściany są odwrócone tyłem.
        const seen = visible.some((other) => other.includes(from) && other.includes(to))
        const label = labels.get([id(from), id(to)].sort().join(' '))
        segments.push({ from: id(from), to: id(to), dashed: !seen, label })
      })
    }
  }

  // Środki liczone po pozostałych punktach, bo mogą korzystać z punktów na podstawie walca.
  for (const [name, point] of Object.entries(figure.points ?? {})) {
    if (!point.midpoint) continue
    const parts = point.midpoint.map((part) => points[part]!)
    points[name] = [
      parts.reduce((sum, part) => sum + part[0], 0) / parts.length,
      parts.reduce((sum, part) => sum + part[1], 0) / parts.length,
    ]
  }

  return {
    type: 'figura',
    points,
    // Nazwa z małej litery (np. "o") to punkt pomocniczy bez podpisu, jak w figurach płaskich.
    names: [...(figure.names ?? []), ...Object.keys(figure.points ?? {})].filter((name) =>
      /^[A-Z]/.test(name),
    ),
    polygons: figure.polygons,
    segments: [...segments, ...(figure.segments ?? [])],
    angles: figure.angles,
    circles,
    dots: figure.dots,
  }
}
