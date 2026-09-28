import { describe, it, expect } from 'vitest'

import type { SolidKind } from '@/config/exams'
import { solidEdges, type Edge, type Vec3 } from '@/solids/geometry'

function length(edge: Edge): number {
  return Math.hypot(edge.a[0] - edge.b[0], edge.a[1] - edge.b[1], edge.a[2] - edge.b[2])
}

function radius(point: Vec3): number {
  return Math.hypot(point[0], point[1], point[2])
}

describe('solidEdges', () => {
  it('builds a regular tetrahedron', () => {
    const edges = solidEdges('tetrahedron')
    expect(edges).toHaveLength(6)
    for (const edge of edges) {
      expect(length(edge)).toBeCloseTo(Math.sqrt(8 / 3))
      expect(edge.normals).toHaveLength(2)
    }
  })

  it('builds a cube', () => {
    const edges = solidEdges('cube')
    expect(edges).toHaveLength(12)
    for (const edge of edges) {
      expect(length(edge)).toBeCloseTo(2 / Math.sqrt(3))
      expect(edge.normals).toHaveLength(2)
    }
  })

  it.each<SolidKind>(['sphere', 'tetrahedron', 'cube'])(
    'keeps every vertex of the %s on the unit sphere',
    (kind) => {
      for (const edge of solidEdges(kind)) {
        expect(radius(edge.a)).toBeCloseTo(1)
        expect(radius(edge.b)).toBeCloseTo(1)
      }
    },
  )

  it.each<SolidKind>(['sphere', 'tetrahedron', 'cube'])(
    'points every normal of the %s outwards',
    (kind) => {
      for (const edge of solidEdges(kind)) {
        const middle = edge.a.map((value, axis) => (value + edge.b[axis]!) / 2)
        for (const normal of edge.normals) {
          const outward = normal[0] * middle[0]! + normal[1] * middle[1]! + normal[2] * middle[2]!
          expect(outward).toBeGreaterThan(0)
        }
      }
    },
  )
})
