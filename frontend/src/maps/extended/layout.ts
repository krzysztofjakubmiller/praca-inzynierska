import type { MapLayout } from '../types'
import type { ExtendedStationId } from './graph'

export const EXTENDED_LAYOUT: MapLayout<ExtendedStationId> = {
  points: {
    trygonometria: { x: 1, y: 0 },
    'wartosc-bezwzgledna': { x: 1, y: 1 },
    'wzory-vieta': { x: 1, y: 2 },
    'funkcja-wykladnicza': { x: 1, y: 3 },
    logarytmy: { x: 0, y: 4 },
    kombinatoryka: { x: 2, y: 4 },
    'dowody-algebra': { x: 0, y: 5 },
    'rachunek-prawdopodobienstwa': { x: 2, y: 5 },
    ciagi: { x: 1, y: 6 },
    'nieskonczonosc-w-ciagach': { x: 1, y: 7 },
    granice: { x: 1, y: 8 },
    'geometria-analityczna': { x: 0, y: 9 },
    pochodna: { x: 1, y: 9 },
    optymalizacja: { x: 1, y: 10 },
    planimetria: { x: 2, y: 11 },
    stereometria: { x: 2, y: 12 },
  },
}
