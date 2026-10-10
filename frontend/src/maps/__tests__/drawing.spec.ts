import { describe, it, expect } from 'vitest'

import { BASIC_MAP, TOPIC_MAPS } from '@/maps'
import { BASIC_DEMO_PROGRESS } from '@/maps/basic/demoProgress'
import { drawMap, type MapDrawing } from '@/maps/drawing'
import { measureLabel as measure } from './textWidth'

function overlapping(drawing: MapDrawing): string[] {
  return drawing.labels.filter((label) => label.overlaps).map((label) => label.id)
}

// Skręty ostrzejsze niż 45 stopni, jako „linia@punkt”.
function sharpTurns(drawing: MapDrawing): string[] {
  return drawing.lines.flatMap((line) =>
    line.points.slice(1, -1).flatMap((point, index) => {
      const before = line.points[index]!
      const after = line.points[index + 2]!
      const turn = Math.abs(
        Math.atan2(after.y - point.y, after.x - point.x) -
          Math.atan2(point.y - before.y, point.x - before.x),
      )
      const degrees = (Math.min(turn, 2 * Math.PI - turn) * 180) / Math.PI
      return degrees > 45.5 ? [`${line.id}@${index + 1}`] : []
    }),
  )
}

describe.each(TOPIC_MAPS)('drawing the map of $examId', (map) => {
  it('stands upright on a 390 px phone with every label inside the screen', () => {
    const drawing = drawMap(map, { width: 358, height: 680, measure })
    expect(drawing.orientation).toBe('portrait')
    expect(overlapping(drawing)).toEqual([])
    // Kilka pikseli od krawędzi, żeby napisów nie zasłaniał pasek przewijania.
    for (const { box } of drawing.labels) {
      expect(box.x).toBeGreaterThanOrEqual(4)
      expect(box.x + box.width).toBeLessThanOrEqual(358 - 4)
    }
  })

  it('never turns a line sharper than 45 degrees, upright or sideways', () => {
    expect(sharpTurns(drawMap(map, { width: 358, height: 680, measure }))).toEqual([])
    expect(sharpTurns(drawMap(map, { width: 1100, height: 760, measure }))).toEqual([])
  })

  it('stands upright on a tablet held upright', () => {
    expect(drawMap(map, { width: 736, height: 900, measure }).orientation).toBe('portrait')
  })

  it('turns sideways on a phone held sideways, slightly smaller but without clashes', () => {
    const drawing = drawMap(map, { width: 857, height: 267, measure })
    expect(drawing.orientation).toBe('landscape')
    expect(overlapping(drawing)).toEqual([])
    expect(drawing.fit).toBeGreaterThanOrEqual(0.8)
  })

  it('fills a desktop screen sideways at full size', () => {
    const drawing = drawMap(map, { width: 1100, height: 760, measure })
    expect(drawing.orientation).toBe('landscape')
    expect(overlapping(drawing)).toEqual([])
    expect(drawing.fit).toBeGreaterThan(0.95)

    const ratio = drawing.viewBox.width / drawing.viewBox.height
    console.info(`${map.examId}: mapa pozioma ${ratio.toFixed(2)}:1`)
  })
})

describe('drawing the demo student', () => {
  const progress = BASIC_DEMO_PROGRESS

  it.each([
    [358, 680],
    [857, 267],
    [1100, 760],
  ])('fits passengers next to the names at %i × %i', (width, height) => {
    const drawing = drawMap(BASIC_MAP, { width, height, progress, measure })
    expect(overlapping(drawing)).toEqual([])
    const waiting = drawing.stations.filter((station) => station.passengers > 0)
    expect(waiting.length).toBeGreaterThan(0)
    for (const station of waiting) {
      const label = drawing.labels.find((item) => item.id === station.id)
      expect(label?.badgeTop).toBeDefined()
    }
  })

  it('rings the last station and tells the student to continue there', () => {
    const drawing = drawMap(BASIC_MAP, { width: 358, height: 680, progress, measure })
    const ringed = drawing.stations.filter((station) => station.ring)
    expect(ringed.map((station) => station.id)).toEqual([progress.lastStation])
    expect(ringed[0]!.ring).toBeGreaterThan(ringed[0]!.radius * 1.36 + drawing.strokeWidth)
    const label = drawing.labels.find((item) => item.id === progress.lastStation)
    expect(label?.note).toBe('Kontynuuj')
  })
})
