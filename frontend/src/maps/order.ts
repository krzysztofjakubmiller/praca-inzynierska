import type { Line, TopicMap } from './types'

export interface ListGroup {
  line: Line<string>
  /** Stacje linii po kolei; `repeat` ma przesiadka, której karta stoi już wyżej na liście. */
  stops: { id: string; repeat: boolean }[]
}

/**
 * Tematy w widoku listy: linie w kolejności z grafu, stacje w kolejności na linii. Przesiadka
 * dostaje kartę przy pierwszym wystąpieniu, a na kolejnych liniach tylko wzmiankę.
 */
export function listGroups(map: TopicMap): ListGroup[] {
  const listed = new Set<string>()
  return map.graph.lines.map((line) => ({
    line,
    stops: line.stations.map((id) => {
      const repeat = listed.has(id)
      listed.add(id)
      return { id, repeat }
    }),
  }))
}

/** Kolejność tematów w widoku listy i przy przechodzeniu klawiaturą po mapie. */
export function listOrder(map: TopicMap): string[] {
  return listGroups(map).flatMap((group) =>
    group.stops.filter((stop) => !stop.repeat).map((stop) => stop.id),
  )
}

export interface LineStop {
  line: Line<string>
  previous?: string
  next?: string
}

/** Linie przechodzące przez stację i sąsiednie stacje na każdej z nich. */
export function lineStops(map: TopicMap, id: string): LineStop[] {
  return map.graph.lines
    .filter((line) => line.stations.includes(id))
    .map((line) => {
      const index = line.stations.indexOf(id)
      return { line, previous: line.stations[index - 1], next: line.stations[index + 1] }
    })
}
