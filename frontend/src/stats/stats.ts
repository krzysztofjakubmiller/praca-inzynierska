import type { Exam } from '@/config/exams'
import { listGroups } from '@/maps/order'
import { effectiveness, topicState, type TopicState } from '@/maps/progress'
import type { Difficulty, LineColor, MapProgress, TopicMap } from '@/maps/types'

export interface LineStats {
  name: string
  color: LineColor
  total: number
  done: number
}

export interface WeakTopic {
  name: string
  difficulty: Difficulty
  /** Skuteczność ostatnich wariantów, od 0 do 1. */
  score: number
  attempts: number
}

export interface Sheet {
  name: string
  /** Nazwa do wąskich podpisów pod wykresem. */
  short: string
  /** Data w formacie RRRR-MM-DD. */
  date: string
  /** Wynik w procentach; bez wyniku arkusz jest dopiero zaplanowany. */
  percent?: number
}

/** Wszystko, co pokazują wykresy postępu jednego egzaminu. */
export interface ProgressStats {
  examId: Exam['id']
  /** Dzień, od którego liczą się wykresy, w formacie RRRR-MM-DD. */
  today: string
  /** Data matury w formacie RRRR-MM-DD. */
  examDate: string
  /** Zadania zrobione w kolejnych dniach, ostatni element to dziś. */
  days: number[]
  /** Skuteczność ostatnich zadań, od 0 do 1. */
  recentScore: number
  lines: LineStats[]
  states: Record<TopicState, number>
  weakest: WeakTopic[]
  /** Powtórki na kolejne dni, pierwszy element to dziś razem z zaległymi. */
  reviewsAhead: number[]
  overdue: number
  /** Arkusze po kolei, zrobione i zaplanowane, razem z próbną maturą. */
  sheets: Sheet[]
  /** Prognoza wyniku matury jako przedział w procentach. */
  forecast: { low: number; high: number }
}

// Przesiadka liczy się raz, na pierwszej linii, tak jak jej karta w widoku listy, więc suma linii
// to liczba wszystkich zadań egzaminu.
export function lineStats(
  map: TopicMap,
  progress: MapProgress<string>,
  taskCounts: Readonly<Record<string, number>>,
): LineStats[] {
  return listGroups(map).map(({ line, stops }) => {
    const own = stops.filter((stop) => !stop.repeat).map((stop) => stop.id)
    return {
      name: line.name,
      color: line.color,
      total: own.reduce((sum, id) => sum + (taskCounts[id] ?? 0), 0),
      done: own.reduce((sum, id) => sum + (progress.topics[id]?.done ?? 0), 0),
    }
  })
}

export function topicStates(map: TopicMap, progress: MapProgress<string>) {
  const states: Record<TopicState, number> = { mastered: 0, learning: 0, weak: 0, untouched: 0 }
  for (const id of Object.keys(map.graph.stations)) states[topicState(progress.topics[id])] += 1
  return states
}

/** Tematy z najniższą skutecznością, tylko te z wynikiem; najsłabszy pierwszy. */
export function weakestTopics(
  map: TopicMap,
  progress: MapProgress<string>,
  count = 5,
): WeakTopic[] {
  return Object.entries(map.graph.stations)
    .flatMap(([id, station]) => {
      const topic = progress.topics[id]
      const score = effectiveness(topic)
      if (!topic || score === undefined) return []
      return [
        {
          name: station.shortName ?? station.name,
          difficulty: station.difficulty,
          score,
          attempts: topic.recent.attempts,
        },
      ]
    })
    .sort((a, b) => a.score - b.score)
    .slice(0, count)
}

/** Pełne dni między dwiema datami w formacie RRRR-MM-DD. */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000)
}

/** Dzień przesunięty o podaną liczbę dni, w formacie RRRR-MM-DD. */
export function shiftDay(day: string, days: number): string {
  return new Date(Date.parse(day) + days * 86_400_000).toISOString().slice(0, 10)
}

/** Dzisiejsza data w strefie ucznia, w formacie RRRR-MM-DD. */
export function localToday(now = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

/** Liczba dni nauki z rzędu, kończąca się dziś albo wczoraj (dziś można jeszcze dorobić). */
export function currentStreak(days: readonly number[]): number {
  let end = days.length - 1
  if (days[end] === 0) end -= 1
  let streak = 0
  while (end >= 0 && days[end]! > 0) {
    streak += 1
    end -= 1
  }
  return streak
}

export function longestStreak(days: readonly number[]): number {
  let longest = 0
  let run = 0
  for (const tasks of days) {
    run = tasks > 0 ? run + 1 : 0
    longest = Math.max(longest, run)
  }
  return longest
}

const MONTHS = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru']
const MONTHS_LONG = [
  'stycznia',
  'lutego',
  'marca',
  'kwietnia',
  'maja',
  'czerwca',
  'lipca',
  'sierpnia',
  'września',
  'października',
  'listopada',
  'grudnia',
]

/** „5 maj” do wąskich podpisów pod wykresem. */
export function shortDate(day: string): string {
  const [, month, date] = day.split('-').map(Number)
  return `${date} ${MONTHS[month! - 1]}`
}

export function monthName(day: string): string {
  return MONTHS[Number(day.split('-')[1]) - 1]!
}

/** „5 maja 2027” do zdań. */
export function longDate(day: string): string {
  const [year, month, date] = day.split('-').map(Number)
  return `${date} ${MONTHS_LONG[month! - 1]} ${year}`
}

/** Odmiana rzeczownika po liczbie: 1 dzień, 2 dni, 5 dni; 1 zadanie, 3 zadania, 7 zadań. */
export function plural(count: number, one: string, few: string, many: string): string {
  if (count === 1) return one
  const tens = count % 100
  const units = count % 10
  if (units >= 2 && units <= 4 && (tens < 12 || tens > 14)) return few
  return many
}

// Dane ucznia przyjdą z modułu nauki (powtórki i arkusze). Do tego czasu każdy zalogowany
// zaczyna bez danych i dostaje zaproszenie do obejrzenia przykładu.
export function studentStats(): ProgressStats | null {
  return null
}
