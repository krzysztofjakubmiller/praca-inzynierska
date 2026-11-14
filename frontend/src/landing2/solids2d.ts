import type { SolidKind } from '@/config/exams'
import { solidEdges, type Vec3 } from '@/solids/geometry'

// Bryły z samych krawędzi rysowane na zwykłym płótnie 2D: obrót i rzut prostokątny liczymy sami.
// Krawędzie, pozy i skale są te same co w scenie three.js obecnej wizytówki.

/** Macierz obrotu 3×3 zapisana wierszami. */
type Matrix = readonly [number, number, number, number, number, number, number, number, number]

const POSES: Record<SolidKind, Vec3> = {
  sphere: [0.42, 0, -0.22],
  tetrahedron: [0.3, -0.38, 0],
  cube: [0.52, 0.72, 0],
}

// Wszystkie bryły są wpisane w kulę o promieniu 1, przez co kula wyglądałaby na największą.
const SCALES: Record<SolidKind, number> = { sphere: 0.84, tetrahedron: 1.08, cube: 1 }

// O ile później zaczyna się rysować ostatnia krawędź względem pierwszej (w długościach rysowania).
const STAGGER = 1.4

function multiply(a: Matrix, b: Matrix): Matrix {
  return [
    a[0] * b[0] + a[1] * b[3] + a[2] * b[6],
    a[0] * b[1] + a[1] * b[4] + a[2] * b[7],
    a[0] * b[2] + a[1] * b[5] + a[2] * b[8],
    a[3] * b[0] + a[4] * b[3] + a[5] * b[6],
    a[3] * b[1] + a[4] * b[4] + a[5] * b[7],
    a[3] * b[2] + a[4] * b[5] + a[5] * b[8],
    a[6] * b[0] + a[7] * b[3] + a[8] * b[6],
    a[6] * b[1] + a[7] * b[4] + a[8] * b[7],
    a[6] * b[2] + a[7] * b[5] + a[8] * b[8],
  ]
}

function aroundX(angle: number): Matrix {
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  return [1, 0, 0, 0, c, -s, 0, s, c]
}

function aroundY(angle: number): Matrix {
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  return [c, 0, s, 0, 1, 0, -s, 0, c]
}

function aroundZ(angle: number): Matrix {
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  return [c, -s, 0, s, c, 0, 0, 0, 1]
}

export interface SolidModel {
  kind: SolidKind
  count: number
  /** Po 6 liczb na krawędź: początek i koniec. */
  points: Float32Array
  /** Po 6 liczb na krawędź: normalne dwóch ścian; odcinek siatki kuli ma jedną, powtórzoną. */
  normals: Float32Array
  /** Wierzchołki wielościanu, po 3 liczby. Kula ich nie ma. */
  corners: Float32Array
  pose: Matrix
  scale: number
}

export function solidModel(kind: SolidKind): SolidModel {
  const edges = solidEdges(kind)
  const points = new Float32Array(edges.length * 6)
  const normals = new Float32Array(edges.length * 6)
  const corners = new Map<string, Vec3>()
  edges.forEach((edge, index) => {
    points.set([...edge.a, ...edge.b], index * 6)
    normals.set([...edge.normals[0]!, ...(edge.normals[1] ?? edge.normals[0]!)], index * 6)
    if (kind !== 'sphere') {
      for (const corner of [edge.a, edge.b]) corners.set(corner.join(), corner)
    }
  })
  const [x, y, z] = POSES[kind]
  return {
    kind,
    count: edges.length,
    points,
    normals,
    corners: new Float32Array([...corners.values()].flat()),
    pose: multiply(aroundX(x), multiply(aroundY(y), aroundZ(z))),
    scale: SCALES[kind],
  }
}

export interface SolidView {
  /** Środek i promień bryły w pikselach płótna. */
  cx: number
  cy: number
  radius: number
  /** Obrót wokół osi pionowej i pochylenie, w radianach. */
  yaw: number
  pitch: number
  /** Od 0 do 1: jaka część bryły jest już narysowana. */
  drawn: number
  lineWidth: number
  color: string
  /** Krycie tylnych krawędzi. */
  backAlpha: number
  /** Wypełnienie stacji w wierzchołkach. Bez niego stacji nie ma. */
  dot?: string
}

function easeOut(progress: number): number {
  return 1 - (1 - progress) ** 3
}

export function drawSolid(ctx: CanvasRenderingContext2D, model: SolidModel, view: SolidView) {
  const m = multiply(aroundX(view.pitch), multiply(aroundY(view.yaw), model.pose))
  const size = view.radius * model.scale
  const { points, normals, count } = model

  ctx.lineWidth = view.lineWidth
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.strokeStyle = view.color

  // Tylne krawędzie idą pod spód, więc rysujemy je w osobnym, pierwszym przebiegu.
  for (const wantFront of [false, true]) {
    ctx.globalAlpha = wantFront ? 1 : view.backAlpha
    ctx.beginPath()
    for (let index = 0; index < count; index++) {
      const o = index * 6
      // Kamera patrzy wzdłuż -z, więc ściana jest z przodu, gdy jej normalna ma dodatnie z.
      const front =
        m[6] * normals[o]! + m[7] * normals[o + 1]! + m[8] * normals[o + 2]! > 0 ||
        m[6] * normals[o + 3]! + m[7] * normals[o + 4]! + m[8] * normals[o + 5]! > 0
      if (front !== wantFront) continue
      const part = easeOut(
        Math.max(0, Math.min(1, view.drawn * (1 + STAGGER) - (STAGGER * index) / count)),
      )
      if (part <= 0) continue
      const ax = m[0] * points[o]! + m[1] * points[o + 1]! + m[2] * points[o + 2]!
      const ay = m[3] * points[o]! + m[4] * points[o + 1]! + m[5] * points[o + 2]!
      const bx = m[0] * points[o + 3]! + m[1] * points[o + 4]! + m[2] * points[o + 5]!
      const by = m[3] * points[o + 3]! + m[4] * points[o + 4]! + m[5] * points[o + 5]!
      ctx.moveTo(view.cx + ax * size, view.cy - ay * size)
      ctx.lineTo(view.cx + (ax + (bx - ax) * part) * size, view.cy - (ay + (by - ay) * part) * size)
    }
    ctx.stroke()
  }

  // Sama siatka kuli nie pokazuje jej obrysu, więc obrys rysujemy osobno.
  if (model.kind === 'sphere') {
    ctx.beginPath()
    ctx.arc(view.cx, view.cy, size, -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI * easeOut(view.drawn))
    ctx.stroke()
  }

  if (view.dot && view.drawn >= 1) {
    const dot = view.lineWidth * 1.45
    ctx.fillStyle = view.dot
    for (let o = 0; o < model.corners.length; o += 3) {
      const x =
        m[0] * model.corners[o]! + m[1] * model.corners[o + 1]! + m[2] * model.corners[o + 2]!
      const y =
        m[3] * model.corners[o]! + m[4] * model.corners[o + 1]! + m[5] * model.corners[o + 2]!
      ctx.beginPath()
      ctx.arc(view.cx + x * size, view.cy - y * size, dot, 0, 2 * Math.PI)
      ctx.globalAlpha = 1
      ctx.fill()
      ctx.stroke()
    }
  }
  ctx.globalAlpha = 1
}
