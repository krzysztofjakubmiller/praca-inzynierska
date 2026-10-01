import type { MapLayout } from '../types'
import type { BasicStationId } from './graph'

export const BASIC_LAYOUT: MapLayout<BasicStationId> = {
  points: {
    percentages: { x: 0, y: 0 },
    statistics: { x: 0, y: 1 },
    logarithms: { x: 2, y: 1 },
    'numbers-powers': { x: 1, y: 2 },
    combinatorics: { x: 2, y: 3 },
    algebra: { x: 1, y: 5 },
    probability: { x: 2, y: 4 },
    'proofs-algebra': { x: 0, y: 6 },
    'equations-inequalities': { x: 1, y: 6 },
    graphs: { x: 1, y: 7 },
    polynomials: { x: 1, y: 8 },
    'absolute-value': { x: 1, y: 9 },
    'linear-function': { x: 1, y: 10 },
    'systems-of-equations': { x: 0, y: 11 },
    'analytic-geometry': { x: 2, y: 11 },
    sequences: { x: 0, y: 12 },
    trigonometry: { x: 2, y: 12 },
    'quadratic-function': { x: 0, y: 13 },
    'plane-geometry': { x: 2, y: 13 },
    optimization: { x: 0, y: 14 },
    'solid-geometry': { x: 2, y: 14 },
    'other-functions': { x: 0, y: 15 },
    'proofs-geometry': { x: 2, y: 15 },
  },
}
