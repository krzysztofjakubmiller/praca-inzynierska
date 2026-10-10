import { describe, it, expect } from 'vitest'

import { BASIC_MAP, EXTENDED_MAP } from '@/maps'
import { lineStops, listGroups, listOrder } from '@/maps/order'
import type { Station } from '@/maps/types'

describe('listGroups', () => {
  it('groups topics by line and mentions a transfer again only in passing', () => {
    const groups = listGroups(BASIC_MAP).map(({ line, stops }) => [
      line.name,
      stops.filter((stop) => stop.repeat).map((stop) => stop.id),
    ])
    expect(groups).toEqual([
      ['Liczbowa', []],
      ['Funkcyjna', ['algebra']],
      ['Statystyczna', ['potegi']],
      ['Geometryczna', ['funkcja-liniowa']],
    ])
  })
})

describe('listOrder', () => {
  it('lists the basic matura topics line by line, each once', () => {
    const stations: Readonly<Record<string, Station>> = BASIC_MAP.graph.stations
    const names = listOrder(BASIC_MAP).map((id) => stations[id]!.name)
    expect(names).toEqual([
      'Logarytmy',
      'Potęgi',
      'Algebra',
      'Dowody algebra',
      'Równania. Nierówności',
      'Wykresy',
      'Wielomiany',
      'Wartość bezwzględna',
      'Funkcja liniowa',
      'Układ równań',
      'Ciągi',
      'Funkcja kwadratowa',
      'Optymalizacja',
      'Inne funkcje',
      'Procenty',
      'Statystyka',
      'Kombinatoryka',
      'Rachunek prawdopodobieństwa',
      'Geometria analityczna',
      'Trygonometria',
      'Planimetria',
      'Stereometria',
      'Dowody geometria',
    ])
  })
})

describe('listOrder for the extended matura', () => {
  it('follows the functions line into calculus, then the branches', () => {
    const stations: Readonly<Record<string, Station>> = EXTENDED_MAP.graph.stations
    const names = listOrder(EXTENDED_MAP).map((id) => stations[id]!.name)
    expect(names).toEqual([
      'Trygonometria',
      'Wartość bezwzględna',
      'Wzory Vieta',
      'Funkcja wykładnicza',
      'Ciągi',
      'Nieskończoność w ciągach',
      'Granice',
      'Pochodna',
      'Optymalizacja',
      'Logarytmy',
      'Dowody algebra',
      'Kombinatoryka',
      'Rachunek prawdopodobieństwa',
      'Geometria analityczna',
      'Planimetria',
      'Stereometria',
    ])
  })
})

describe('lineStops', () => {
  it('gives the neighbours on every line through a transfer station', () => {
    const stops = lineStops(BASIC_MAP, 'funkcja-liniowa')
    expect(stops.map(({ line, previous, next }) => [line.name, previous, next])).toEqual([
      ['Funkcyjna', 'wartosc-bezwzgledna', 'uklad-rownan'],
      ['Geometryczna', undefined, 'geometria-analityczna'],
    ])
  })
})
