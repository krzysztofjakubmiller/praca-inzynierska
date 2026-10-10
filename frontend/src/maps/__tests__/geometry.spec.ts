import { describe, it, expect } from 'vitest'

import { project, routeLine } from '@/maps/geometry'

describe('project', () => {
  const points = { a: { x: 0, y: 0 }, b: { x: 2, y: 1 } }
  const steps = { along: 50, across: 40 }

  it('keeps columns across and rows along in portrait', () => {
    expect(project(points, 'portrait', steps)).toEqual(
      new Map([
        ['a', { x: 0, y: 0 }],
        ['b', { x: 80, y: 50 }],
      ]),
    )
  })

  it('turns the top of the map to the left in landscape', () => {
    expect(project(points, 'landscape', steps)).toEqual(
      new Map([
        ['a', { x: 0, y: 80 }],
        ['b', { x: 50, y: 0 }],
      ]),
    )
  })
})

describe('routeLine', () => {
  it('keeps straight and 45 degree segments', () => {
    const stations = [
      { x: 0, y: 0 },
      { x: 0, y: 40 },
      { x: 40, y: 80 },
    ]
    expect(routeLine(stations)).toEqual(stations)
  })

  it('starts a stretched diagonal at 45 degrees and finishes it straight', () => {
    expect(
      routeLine([
        { x: 0, y: 0 },
        { x: 50, y: 80 },
      ]),
    ).toEqual([
      { x: 0, y: 0 },
      { x: 50, y: 50 },
      { x: 50, y: 80 },
    ])
  })

  it('goes straight first when the next segment would meet the straight part at a right angle', () => {
    expect(
      routeLine([
        { x: 0, y: 0 },
        { x: 50, y: 80 },
        { x: 100, y: 80 },
      ]),
    ).toEqual([
      { x: 0, y: 0 },
      { x: 0, y: 30 },
      { x: 50, y: 80 },
      { x: 100, y: 80 },
    ])
  })

  it('puts the straight part in the middle when both neighbours cross it', () => {
    expect(
      routeLine([
        { x: -50, y: 0 },
        { x: 0, y: 0 },
        { x: 50, y: 80 },
        { x: 100, y: 80 },
      ]),
    ).toEqual([
      { x: -50, y: 0 },
      { x: 0, y: 0 },
      { x: 25, y: 25 },
      { x: 25, y: 55 },
      { x: 50, y: 80 },
      { x: 100, y: 80 },
    ])
  })
})
