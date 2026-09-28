import type { SolidKind } from '@/config/exams'

export type Vec3 = readonly [number, number, number]

/**
 * A straight piece of a solid's outline with the outward normals of the surface it lies on.
 * A polyhedron edge has the normals of its two faces, a piece of the sphere grid has one.
 * The stage uses them to tell front edges from back ones.
 */
export interface Edge {
  a: Vec3
  b: Vec3
  normals: Vec3[]
}

const SPHERE_SEGMENTS = 64

function subtract(p: Vec3, q: Vec3): Vec3 {
  return [p[0] - q[0], p[1] - q[1], p[2] - q[2]]
}

function cross(p: Vec3, q: Vec3): Vec3 {
  return [p[1] * q[2] - p[2] * q[1], p[2] * q[0] - p[0] * q[2], p[0] * q[1] - p[1] * q[0]]
}

function dot(p: Vec3, q: Vec3): number {
  return p[0] * q[0] + p[1] * q[1] + p[2] * q[2]
}

function normalize(p: Vec3): Vec3 {
  const length = Math.hypot(p[0], p[1], p[2])
  return [p[0] / length, p[1] / length, p[2] / length]
}

function radians(degrees: number): number {
  return (degrees * Math.PI) / 180
}

// Every solid is convex and centred at the origin, so a normal pointing
// towards the origin only needs to be flipped.
function outwardNormal(corners: Vec3[]): Vec3 {
  const [first, second, third] = corners as [Vec3, Vec3, Vec3]
  const normal = normalize(cross(subtract(second, first), subtract(third, first)))
  return dot(normal, first) < 0 ? [-normal[0], -normal[1], -normal[2]] : normal
}

function polyhedronEdges(vertices: Vec3[], faces: number[][]): Edge[] {
  const edges = new Map<string, Edge>()
  for (const face of faces) {
    const normal = outwardNormal(face.map((index) => vertices[index]!))
    face.forEach((from, position) => {
      const to = face[(position + 1) % face.length]!
      const key = `${Math.min(from, to)}-${Math.max(from, to)}`
      const edge = edges.get(key)
      if (edge) edge.normals.push(normal)
      else edges.set(key, { a: vertices[from]!, b: vertices[to]!, normals: [normal] })
    })
  }
  return [...edges.values()]
}

/** Regular tetrahedron standing on its base, vertices on the unit sphere. */
function tetrahedron(): Edge[] {
  const baseRadius = Math.sqrt(8) / 3
  const base = [90, 210, 330].map((angle): Vec3 => [
    baseRadius * Math.cos(radians(angle)),
    -1 / 3,
    baseRadius * Math.sin(radians(angle)),
  ])
  return polyhedronEdges(
    [[0, 1, 0], ...base],
    [
      [0, 1, 2],
      [0, 2, 3],
      [0, 3, 1],
      [1, 2, 3],
    ],
  )
}

/** Cube with vertices on the unit sphere. */
function cube(): Edge[] {
  const half = 1 / Math.sqrt(3)
  const vertices = Array.from({ length: 8 }, (_, index): Vec3 => [
    index & 1 ? half : -half,
    index & 2 ? half : -half,
    index & 4 ? half : -half,
  ])
  return polyhedronEdges(vertices, [
    [0, 2, 6, 4],
    [1, 3, 7, 5],
    [0, 1, 5, 4],
    [2, 3, 7, 6],
    [0, 1, 3, 2],
    [4, 5, 7, 6],
  ])
}

function circle(point: (angle: number) => Vec3): Edge[] {
  return Array.from({ length: SPHERE_SEGMENTS }, (_, index) => {
    const a = point((index / SPHERE_SEGMENTS) * 2 * Math.PI)
    const b = point(((index + 1) / SPHERE_SEGMENTS) * 2 * Math.PI)
    // On the unit sphere the outward normal is the direction of the point itself.
    const middle = normalize([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2])
    return { a, b, normals: [middle] }
  })
}

/** Unit sphere drawn as three parallels and three meridians. */
function sphere(): Edge[] {
  const parallels = [-45, 0, 45].flatMap((latitude) => {
    const ring = Math.cos(radians(latitude))
    const height = Math.sin(radians(latitude))
    return circle((angle): Vec3 => [ring * Math.cos(angle), height, ring * Math.sin(angle)])
  })
  const meridians = [0, 60, 120].flatMap((longitude) => {
    const x = Math.cos(radians(longitude))
    const z = Math.sin(radians(longitude))
    return circle((angle): Vec3 => [Math.cos(angle) * x, Math.sin(angle), Math.cos(angle) * z])
  })
  return [...parallels, ...meridians]
}

const BUILDERS: Record<SolidKind, () => Edge[]> = { sphere, tetrahedron, cube }

export function solidEdges(kind: SolidKind): Edge[] {
  return BUILDERS[kind]()
}
