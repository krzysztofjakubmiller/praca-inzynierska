import type { MapLayout } from '../types'
import type { BasicStationId } from './graph'

export const BASIC_LAYOUT: MapLayout<BasicStationId> = {
  points: {
    procenty: { x: 0, y: 0 },
    statystyka: { x: 0, y: 1 },
    logarytmy: { x: 2, y: 1 },
    potegi: { x: 1, y: 2 },
    kombinatoryka: { x: 2, y: 3 },
    algebra: { x: 1, y: 5 },
    'rachunek-prawdopodobienstwa': { x: 2, y: 4 },
    'dowody-algebra': { x: 0, y: 6 },
    'rownania-nierownosci': { x: 1, y: 6 },
    wykresy: { x: 1, y: 7 },
    wielomiany: { x: 1, y: 8 },
    'wartosc-bezwzgledna': { x: 1, y: 9 },
    'funkcja-liniowa': { x: 1, y: 10 },
    'uklad-rownan': { x: 0, y: 11 },
    'geometria-analityczna': { x: 2, y: 11 },
    ciagi: { x: 0, y: 12 },
    trygonometria: { x: 2, y: 12 },
    'funkcja-kwadratowa': { x: 0, y: 13 },
    planimetria: { x: 2, y: 13 },
    optymalizacja: { x: 0, y: 14 },
    stereometria: { x: 2, y: 14 },
    'inne-funkcje': { x: 0, y: 15 },
    'dowody-geometria': { x: 2, y: 15 },
  },
}
