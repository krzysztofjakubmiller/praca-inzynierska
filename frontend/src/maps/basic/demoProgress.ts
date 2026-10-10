import { daysAgo } from '@/utils/daysAgo'
import type { DiagnosticSheets } from '../nextStep'
import type { MapProgress } from '../types'
import type { BasicStationId } from './graph'

// Postęp wymyślonego ucznia, dopóki nie ma serwera. Liczby dobrane tak, żeby naraz było
// widać każdy stan stacji: pusty, częściowy i pełny kontur na każdym kształcie i od 0 do 4
// pasażerów.
export const BASIC_DEMO_PROGRESS: MapProgress<BasicStationId> = {
  lastStation: 'wielomiany',
  topics: {
    procenty: {
      total: 24,
      done: 24,
      due: 2,
      recent: { attempts: 20, correct: 18 },
      lastActivity: daysAgo(12),
    },
    statystyka: {
      total: 30,
      done: 21,
      due: 0,
      recent: { attempts: 20, correct: 13 },
      lastActivity: daysAgo(9),
    },
    logarytmy: {
      total: 36,
      done: 12,
      due: 7,
      recent: { attempts: 12, correct: 5 },
      lastActivity: daysAgo(3),
    },
    potegi: {
      total: 40,
      done: 40,
      due: 12,
      recent: { attempts: 20, correct: 17 },
      lastActivity: daysAgo(1),
    },
    algebra: {
      total: 28,
      done: 22,
      due: 5,
      recent: { attempts: 20, correct: 15 },
      lastActivity: daysAgo(2),
    },
    'dowody-algebra': {
      total: 16,
      done: 2,
      due: 2,
      recent: { attempts: 2, correct: 1 },
      lastActivity: daysAgo(20),
    },
    'rownania-nierownosci': {
      total: 44,
      done: 30,
      due: 9,
      recent: { attempts: 20, correct: 16 },
      lastActivity: daysAgo(1),
    },
    wykresy: {
      total: 20,
      done: 9,
      due: 1,
      recent: { attempts: 9, correct: 6 },
      lastActivity: daysAgo(4),
    },
    wielomiany: {
      total: 32,
      done: 14,
      due: 11,
      recent: { attempts: 14, correct: 6 },
      lastActivity: daysAgo(0),
    },
    'wartosc-bezwzgledna': {
      total: 18,
      done: 3,
      due: 0,
      recent: { attempts: 3, correct: 2 },
      lastActivity: daysAgo(6),
    },
    kombinatoryka: {
      total: 22,
      done: 6,
      due: 3,
      recent: { attempts: 6, correct: 4 },
      lastActivity: daysAgo(5),
    },
    'geometria-analityczna': {
      total: 34,
      done: 5,
      due: 0,
      recent: { attempts: 5, correct: 5 },
      lastActivity: daysAgo(15),
    },
    'rachunek-prawdopodobienstwa': {
      total: 30,
      done: 18,
      due: 3,
      recent: { attempts: 20, correct: 12 },
      lastActivity: daysAgo(7),
    },
    'funkcja-kwadratowa': {
      total: 32,
      done: 8,
      due: 8,
      recent: { attempts: 8, correct: 3 },
      lastActivity: daysAgo(10),
    },
    trygonometria: {
      total: 26,
      done: 26,
      due: 10,
      recent: { attempts: 20, correct: 19 },
      lastActivity: daysAgo(4),
    },
    optymalizacja: {
      total: 14,
      done: 7,
      due: 5,
      recent: { attempts: 7, correct: 4 },
      lastActivity: daysAgo(8),
    },
    planimetria: {
      total: 20,
      done: 18,
      due: 0,
      recent: { attempts: 18, correct: 16 },
      lastActivity: daysAgo(11),
    },
  },
}

// Ten sam uczeń zrobił już pierwszy arkusz diagnostyczny, a kolejny wypada za dwa tygodnie.
export const BASIC_DEMO_SHEETS: DiagnosticSheets = { last: daysAgo(20), next: daysAgo(-14) }
