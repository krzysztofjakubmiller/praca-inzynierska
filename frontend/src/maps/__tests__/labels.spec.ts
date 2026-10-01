import { describe, it, expect } from 'vitest'

import { placeLabels, type LabelRequest, type LabelSettings } from '@/maps/labels'

const settings: LabelSettings = {
  measure: (text) => text.length * 8,
  lineHeight: 16,
  badgeGap: 2,
  gap: 4,
  lineClearance: 5,
  segments: [],
  bounds: { x: 0, y: 0, width: 400, height: 400 },
  preferTwoLines: false,
}

function station(
  id: string,
  x: number,
  y: number,
  extra: Partial<LabelRequest> = {},
): LabelRequest {
  return { id, text: 'Ciągi', at: { x, y }, radius: 8, transfer: false, prefer: 'right', ...extra }
}

describe('placeLabels', () => {
  it('starts on the preferred side', () => {
    const [label] = placeLabels([station('a', 100, 100)], settings)
    expect(label).toMatchObject({ side: 'right', lines: ['Ciągi'], overlaps: false })
    expect(label!.box).toEqual({ x: 112, y: 92, width: 40, height: 16 })
  })

  it('steps away from a line', () => {
    const segments = [
      [
        { x: 100, y: 100 },
        { x: 300, y: 100 },
      ],
    ] as const
    const [label] = placeLabels([station('a', 100, 100)], { ...settings, segments })
    expect(label!.side).toBe('above-right')
  })

  it('stays inside the bounds', () => {
    const [label] = placeLabels([station('a', 390, 100)], settings)
    expect(label!.side).toBe('left')
  })

  it('breaks a long name into two lines when one does not fit', () => {
    const request = station('a', 100, 100, { text: 'Geometria analityczna' })
    const [label] = placeLabels([request], {
      ...settings,
      bounds: { ...settings.bounds, width: 210 },
    })
    expect(label).toMatchObject({ side: 'right', lines: ['Geometria', 'analityczna'] })
  })

  it('places transfer stations first', () => {
    const [plain, transfer] = placeLabels(
      [station('plain', 100, 100), station('transfer', 100, 110, { transfer: true })],
      settings,
    )
    expect(transfer!.side).toBe('right')
    expect(plain!.side).not.toBe('right')
  })

  it('tries the side chosen by hand first', () => {
    const [label] = placeLabels([station('a', 100, 100, { side: 'below' })], settings)
    expect(label!.side).toBe('below')
  })

  it('keeps passengers on the station side of the name', () => {
    const badge = { width: 30, height: 10 }
    const [beside] = placeLabels([station('a', 100, 100, { badge })], settings)
    expect(beside!.box.height).toBe(16 + 2 + 10)
    expect(beside!.textTop).toBe(beside!.box.y)
    expect(beside!.badgeTop).toBe(beside!.box.y + 16 + 2)

    const [under] = placeLabels([station('a', 100, 100, { badge, side: 'below' })], settings)
    expect(under!.badgeTop).toBe(under!.box.y)
    expect(under!.textTop).toBe(under!.box.y + 10 + 2)
  })

  it('adds a bold note under the name, above the passengers', () => {
    const measure = (text: string, bold?: boolean) => text.length * (bold ? 10 : 8)
    const request = station('a', 100, 100, {
      note: 'Kontynuuj',
      badge: { width: 30, height: 10 },
    })
    const [label] = placeLabels([request], { ...settings, measure })
    expect(label).toMatchObject({ lines: ['Ciągi'], note: 'Kontynuuj' })
    expect(label!.box.width).toBe(90)
    expect(label!.box.height).toBe(16 * 2 + 2 + 10)
    expect(label!.badgeTop).toBe(label!.box.y + 16 * 2 + 2)
  })

  it('moves an earlier label aside when it is the only thing in the way', () => {
    const bounds = { x: 95, y: 60, width: 305, height: 65 }
    const [first, second] = placeLabels(
      [station('first', 100, 100, { transfer: true }), station('second', 100, 115)],
      { ...settings, bounds },
    )
    expect(second).toMatchObject({ side: 'right', overlaps: false })
    expect(first).toMatchObject({ side: 'above-right', overlaps: false })
  })

  it('marks a label that found no room', () => {
    const tight = { ...settings, bounds: { x: 90, y: 90, width: 20, height: 20 } }
    const [label] = placeLabels([station('a', 100, 100)], tight)
    expect(label!.overlaps).toBe(true)
  })
})
