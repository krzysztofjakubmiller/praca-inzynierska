import { project, routeLine, type Orientation, type Point } from '@/maps/geometry'
import { stationPath } from '@/maps/shapes'
import type { LineColor, TopicMap } from '@/maps/types'

// Mapa tematów w małej wersji na wizytówkę: te same stacje i linie co w aplikacji, ale bez
// etykiet, postępu i przewijania. Nazwy stacji strona pokazuje obok, jako listę.

export interface MiniLine {
  id: string
  name: string
  color: LineColor
  /** Łamana przez kolejne stacje linii. */
  points: Point[]
  path: string
  stations: readonly string[]
}

export interface MiniStation {
  id: string
  name: string
  at: Point
  /** Obrys kształtu stacji; kształt zależy od trudności tematu. */
  shape: string
  /** Kolor pierwszej linii, na której leży stacja. */
  color: LineColor
  transfer: boolean
}

export interface MiniMap {
  viewBox: string
  width: number
  height: number
  lines: MiniLine[]
  stations: MiniStation[]
}

const ALONG = 46
const ACROSS = 78
const RADIUS = 8
const EDGE = 18

export function miniMap(map: TopicMap, orientation: Orientation): MiniMap {
  const at = project(map.layout.points, orientation, { along: ALONG, across: ACROSS })
  const lines = map.graph.lines.map((line) => {
    const points = routeLine(line.stations.map((id) => at.get(id)!))
    return {
      id: line.id,
      name: line.name,
      color: line.color,
      points,
      path: points.map((point, index) => `${index ? 'L' : 'M'} ${point.x} ${point.y}`).join(' '),
      stations: line.stations,
    }
  })
  const stations = Object.entries(map.graph.stations).map(([id, station]) => {
    const own = map.graph.lines.filter((line) => line.stations.includes(id))
    const transfer = own.length > 1
    return {
      id,
      name: station.name,
      at: at.get(id)!,
      shape: stationPath(station.difficulty, at.get(id)!, transfer ? RADIUS * 1.2 : RADIUS),
      color: own[0]!.color,
      transfer,
    }
  })
  const xs = stations.map((station) => station.at.x)
  const ys = stations.map((station) => station.at.y)
  const width = Math.max(...xs) - Math.min(...xs) + 2 * EDGE
  const height = Math.max(...ys) - Math.min(...ys) + 2 * EDGE
  return {
    viewBox: `${Math.min(...xs) - EDGE} ${Math.min(...ys) - EDGE} ${width} ${height}`,
    width,
    height,
    lines,
    stations,
  }
}
