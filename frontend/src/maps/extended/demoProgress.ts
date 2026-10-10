import { daysAgo } from '@/utils/daysAgo'
import type { DiagnosticSheets } from '../nextStep'
import type { MapProgress } from '../types'
import type { ExtendedStationId } from './graph'

// Postęp wymyślonego ucznia, dopóki nie ma serwera. Jak na podstawie: pusty, częściowy i pełny
// kontur na każdym kształcie i od 0 do 4 pasażerów.
export const EXTENDED_DEMO_PROGRESS: MapProgress<ExtendedStationId> = {
  lastStation: 'ciagi',
  topics: {
    trygonometria: {
      total: 30,
      done: 30,
      due: 4,
      recent: { attempts: 20, correct: 17 },
      lastActivity: daysAgo(6),
    },
    'wartosc-bezwzgledna': {
      total: 18,
      done: 18,
      due: 0,
      recent: { attempts: 18, correct: 16 },
      lastActivity: daysAgo(14),
    },
    'wzory-vieta': {
      total: 24,
      done: 15,
      due: 9,
      recent: { attempts: 15, correct: 7 },
      lastActivity: daysAgo(2),
    },
    'funkcja-wykladnicza': {
      total: 16,
      done: 16,
      due: 1,
      recent: { attempts: 16, correct: 15 },
      lastActivity: daysAgo(9),
    },
    logarytmy: {
      total: 22,
      done: 9,
      due: 2,
      recent: { attempts: 9, correct: 7 },
      lastActivity: daysAgo(4),
    },
    'dowody-algebra': {
      total: 14,
      done: 2,
      due: 2,
      recent: { attempts: 2, correct: 1 },
      lastActivity: daysAgo(18),
    },
    kombinatoryka: {
      total: 26,
      done: 20,
      due: 6,
      recent: { attempts: 20, correct: 13 },
      lastActivity: daysAgo(5),
    },
    ciagi: {
      total: 28,
      done: 11,
      due: 3,
      recent: { attempts: 11, correct: 8 },
      lastActivity: daysAgo(0),
    },
    planimetria: {
      total: 34,
      done: 8,
      due: 7,
      recent: { attempts: 8, correct: 3 },
      lastActivity: daysAgo(3),
    },
    'geometria-analityczna': {
      total: 26,
      done: 4,
      due: 0,
      recent: { attempts: 4, correct: 4 },
      lastActivity: daysAgo(21),
    },
  },
}

// Pierwszy arkusz diagnostyczny zrobiony, kolejny wypada za trzy tygodnie.
export const EXTENDED_DEMO_SHEETS: DiagnosticSheets = { last: daysAgo(10), next: daysAgo(-21) }
