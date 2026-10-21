import type { Exam } from '@/config/exams'
import { BASIC_MAP, EXTENDED_MAP } from '@/maps'
import { BASIC_DEMO_PROGRESS } from '@/maps/basic/demoProgress'
import { EXTENDED_DEMO_PROGRESS } from '@/maps/extended/demoProgress'
import { dueTotal } from '@/maps/nextStep'
import type { MapProgress, TopicMap } from '@/maps/types'
import {
  lineStats,
  localToday,
  shiftDay,
  topicStates,
  weakestTopics,
  type ProgressStats,
  type Sheet,
} from './stats'

// Statystyki wymyślonego ucznia do pokazania bez konta. Linie, stany tematów, najsłabsze tematy
// i dzisiejsze powtórki liczą się z tego samego postępu co mapa demo, więc obie strony się
// zgadzają. Wymyślone są tylko dane w czasie: dni nauki, arkusze, prognoza i przyszłe powtórki.

/** Cel ucznia z dema, pokazany na wykresach arkuszy i prognozy. */
export const DEMO_TARGET = 75

// Tematu bez wpisu w postępie demo nikt nie zaczął, więc liczba jego zadań przychodzi stąd:
// trudniejsze tematy mają więcej zadań.
function taskCounts(map: TopicMap, progress: MapProgress<string>): Record<string, number> {
  return Object.fromEntries(
    Object.entries(map.graph.stations).map(([id, station]) => [
      id,
      progress.topics[id]?.total ?? 16 + 6 * station.difficulty,
    ]),
  )
}

// Ten sam ciąg przy każdym wejściu: prosty generator liczb pseudolosowych z ziarnem.
function generator(seed: number) {
  let state = seed
  return () => {
    state = (state * 16807) % 2147483647
    return state / 2147483647
  }
}

/** 20 tygodni nauki, coraz regularniej, z serią kilku ostatnich dni i jedną przerwą przed nią. */
function demoDays(seed: number): number[] {
  const random = generator(seed)
  const days = Array.from({ length: 140 }, (_, index) =>
    random() < 0.42 + (0.4 * index) / 140 ? 1 + Math.floor(random() * random() * 24) : 0,
  )
  days[133] = 0
  for (let index = 134; index < 140; index += 1) days[index] ||= 3 + Math.floor(random() * 10)
  return days
}

// Matura w maju; od czerwca liczymy do następnej, tak jak backend przy roku z profilu.
function demoExamDate(today: string, monthDay: string): string {
  const [year, month] = today.split('-').map(Number)
  return `${month! <= 5 ? year : year! + 1}-${monthDay}`
}

function demoSheets(today: string, results: [number, number, number]): Sheet[] {
  return [
    {
      name: 'Arkusz diagnostyczny',
      short: 'Diagn.',
      date: shiftDay(today, -40),
      percent: results[0],
    },
    {
      name: 'Arkusz równoległy 1',
      short: 'Równ. 1',
      date: shiftDay(today, -25),
      percent: results[1],
    },
    {
      name: 'Arkusz równoległy 2',
      short: 'Równ. 2',
      date: shiftDay(today, -10),
      percent: results[2],
    },
    { name: 'Arkusz równoległy 3', short: 'Równ. 3', date: shiftDay(today, 14) },
    { name: 'Próbna matura CKE', short: 'Próbna CKE', date: shiftDay(today, 56) },
    { name: 'Arkusz równoległy 4', short: 'Równ. 4', date: shiftDay(today, 90) },
    { name: 'Arkusz równoległy 5', short: 'Równ. 5', date: shiftDay(today, 125) },
  ]
}

function demoStats(
  examId: Exam['id'],
  map: TopicMap,
  progress: MapProgress<string>,
  details: Pick<ProgressStats, 'recentScore' | 'forecast' | 'overdue'> & {
    seed: number
    examDay: string
    results: [number, number, number]
    reviews: number[]
  },
): ProgressStats {
  const today = localToday()
  return {
    examId,
    today,
    examDate: demoExamDate(today, details.examDay),
    days: demoDays(details.seed),
    recentScore: details.recentScore,
    lines: lineStats(map, progress, taskCounts(map, progress)),
    states: topicStates(map, progress),
    weakest: weakestTopics(map, progress),
    reviewsAhead: [dueTotal(progress), ...details.reviews],
    overdue: details.overdue,
    sheets: demoSheets(today, details.results),
    forecast: details.forecast,
  }
}

export function demoProgressStats(examId: Exam['id']): ProgressStats {
  if (examId === 'matura-rozszerzona') {
    return demoStats(examId, EXTENDED_MAP, EXTENDED_DEMO_PROGRESS, {
      seed: 23,
      examDay: '05-11',
      results: [34, 41, 47],
      reviews: [9, 11, 6, 14, 8, 7, 12, 5, 9, 10, 4, 8, 6],
      recentScore: 0.61,
      forecast: { low: 41, high: 56 },
      overdue: 2,
    })
  }
  return demoStats(examId, BASIC_MAP, BASIC_DEMO_PROGRESS, {
    seed: 11,
    examDay: '05-05',
    results: [42, 51, 55],
    reviews: [8, 9, 5, 11, 7, 6, 10, 4, 8, 6, 3, 7, 5],
    recentScore: 0.72,
    forecast: { low: 58, high: 71 },
    overdue: 3,
  })
}
