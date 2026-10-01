import { describe, it, expect } from 'vitest'

import { TOPIC_MAPS } from '@/maps'
import type { GridPoint, TopicMap } from '@/maps/types'

interface Segment {
  line: string
  from: string
  to: string
}

function segments(map: TopicMap): Segment[] {
  return map.graph.lines.flatMap((line) =>
    line.stations.slice(1).map((to, index) => ({ line: line.id, from: line.stations[index]!, to })),
  )
}

function isStraight(a: GridPoint, b: GridPoint): boolean {
  const dx = Math.abs(b.x - a.x)
  const dy = Math.abs(b.y - a.y)
  return dx + dy > 0 && (dx === 0 || dy === 0 || dx === dy)
}

// Punkty siatki, przez które przechodzi prosty odcinek, bez jego końców.
function pointsBetween(a: GridPoint, b: GridPoint): GridPoint[] {
  const steps = Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y))
  const dx = Math.sign(b.x - a.x)
  const dy = Math.sign(b.y - a.y)
  return Array.from({ length: steps - 1 }, (_, i) => ({
    x: a.x + dx * (i + 1),
    y: a.y + dy * (i + 1),
  }))
}

function key(point: GridPoint): string {
  return `${point.x},${point.y}`
}

describe.each(TOPIC_MAPS)('map of $examId', (map) => {
  const ids = Object.keys(map.graph.stations)
  const points = Object.entries(map.layout.points)
  const point = (id: string) => map.layout.points[id]!

  it('gives every station a grid point and nothing else', () => {
    expect(Object.keys(map.layout.points).sort()).toEqual([...ids].sort())
  })

  it('places stations on whole grid points', () => {
    const problems = points
      .filter(([, p]) => !Number.isInteger(p.x) || !Number.isInteger(p.y) || p.x < 0 || p.y < 0)
      .map(([id]) => id)
    expect(problems).toEqual([])
  })

  it('puts every station on its own point', () => {
    const taken = new Map<string, string>()
    const problems: string[] = []
    for (const [id, p] of points) {
      const other = taken.get(key(p))
      if (other) problems.push(`${other} and ${id}`)
      taken.set(key(p), id)
    }
    expect(problems).toEqual([])
  })

  it('runs lines only vertically, horizontally or at 45 degrees', () => {
    const problems = segments(map)
      .filter(({ from, to }) => !isStraight(point(from), point(to)))
      .map(({ line, from, to }) => `${line}: ${from} - ${to}`)
    expect(problems).toEqual([])
  })

  it('never runs a line through a station', () => {
    const stationAt = new Map(points.map(([id, p]) => [key(p), id]))
    const problems: string[] = []
    for (const { line, from, to } of segments(map)) {
      if (!isStraight(point(from), point(to))) continue
      for (const p of pointsBetween(point(from), point(to))) {
        const station = stationAt.get(key(p))
        if (station) problems.push(`${line}: ${from} - ${to} crosses ${station}`)
      }
    }
    expect(problems).toEqual([])
  })

  it('never runs two lines along the same segment', () => {
    const taken = new Map<string, string>()
    const problems: string[] = []
    for (const { line, from, to } of segments(map)) {
      const pair = [from, to].sort().join(' - ')
      const other = taken.get(pair)
      if (other) problems.push(`${other} and ${line}: ${pair}`)
      taken.set(pair, line)
    }
    expect(problems).toEqual([])
  })

  it('puts every station on a line, at most once per line', () => {
    const onLines = new Set(map.graph.lines.flatMap((line) => line.stations))
    const problems = ids.filter((id) => !onLines.has(id)).map((id) => `${id} is on no line`)
    for (const line of map.graph.lines) {
      if (line.stations.length < 2) problems.push(`${line.id} has fewer than 2 stations`)
      if (new Set(line.stations).size < line.stations.length) {
        problems.push(`${line.id} repeats a station`)
      }
    }
    expect(problems).toEqual([])
  })

  it('connects the whole network', () => {
    const neighbours = new Map(ids.map((id) => [id, [] as string[]]))
    for (const { from, to } of segments(map)) {
      neighbours.get(from)?.push(to)
      neighbours.get(to)?.push(from)
    }
    const reached = new Set(ids.slice(0, 1))
    const queue = ids.slice(0, 1)
    for (let id = queue.shift(); id !== undefined; id = queue.shift()) {
      for (const next of neighbours.get(id) ?? []) {
        if (reached.has(next)) continue
        reached.add(next)
        queue.push(next)
      }
    }
    expect(ids.filter((id) => !reached.has(id))).toEqual([])
  })

  it('rates every station from 0 to 3', () => {
    const problems = Object.entries(map.graph.stations)
      .filter(([, station]) => ![0, 1, 2, 3].includes(station.difficulty))
      .map(([id]) => id)
    expect(problems).toEqual([])
  })
})
