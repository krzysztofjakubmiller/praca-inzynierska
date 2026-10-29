import { API_URL, authorization } from '@/access'
import type { Figures } from '@/figures'
import type { MapProgress } from '@/maps/types'

export type AnswerFormat = 'wielokrotny-wybor' | 'prawda-falsz' | 'dobieranie' | 'otwarte'
export type PracticeMode = 'cwiczenie' | 'losowe' | 'powtorka'
export type Rating = 'latwy' | 'sredni' | 'trudny' | 'bardzo-trudny'

export type ResultKind = 'liczba' | 'wartosci' | 'przedzial' | 'punkt' | 'rownanie' | 'wyrazenie'

/** Pole na wynik końcowy zadania otwartego; part i points tylko przy kilku częściach. */
export interface ResultField {
  part?: string
  kind: ResultKind
  points?: number
}

/** Zadanie w postaci dla ucznia: bez klucza, który przychodzi dopiero po sprawdzeniu. */
export interface PracticeTask {
  id: number
  exam: string
  topic: string
  topic_name: string
  source: string
  year: number
  number: number
  subnumber: number | null
  max_points: number
  content: string
  answer_format: AnswerFormat
  choices: Record<string, string> | null
  connector: string | null
  figures: Figures | null
  /** Tylko przy zadaniu otwartym; pusta lista to dowód. */
  results?: ResultField[]
}

export interface Checked {
  id: number
  points: number
  max_points: number
  answer: string
}

// Odpowiedź serwera z komunikatami do pokazania uczniowi, np. przy złych punktach. Status 401
// znaczy, że nikt nie jest zalogowany, i strona prowadzi wtedy do logowania.
export class Rejected extends Error {
  constructor(
    readonly status: number,
    readonly problems: string[],
  ) {
    super(problems.join('\n'))
  }
}

async function request<T>(path: string, body?: object): Promise<T> {
  const response = await fetch(`${API_URL}/api/practice${path}`, {
    method: body ? 'POST' : 'GET',
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include',
    headers: { ...authorization('access'), 'Content-Type': 'application/json' },
  })
  const data = await response.json().catch(() => null)
  if (response.ok) return data as T
  if (
    Array.isArray(data?.detail) &&
    data.detail.every((item: unknown) => typeof item === 'string')
  ) {
    throw new Rejected(response.status, data.detail)
  }
  throw new Error(`backend odpowiedział kodem ${response.status}`)
}

function query(params: Record<string, string | number | boolean | (string | number)[]>) {
  const pairs = Object.entries(params).flatMap(([key, value]) =>
    (Array.isArray(value) ? value : [value]).map((item) => `${key}=${encodeURIComponent(item)}`),
  )
  return pairs.length ? `?${pairs.join('&')}` : ''
}

/** Następne nierobione zadanie tematu; task jest null, gdy wszystkie są zrobione. */
export function nextInTopic(
  exam: string,
  topic: string,
  skipped: number[],
): Promise<{ task: PracticeTask | null; left: number; total: number }> {
  return request(`/topic/${exam}/${topic}/next${query({ skipped })}`)
}

export interface NextReview {
  task: PracticeTask | null
  /** Wszystkie zadania ucznia w powtórkach tego egzaminu. */
  cards: number
  left_today: number
  limit: number
}

/** Bez more tylko powtórki na dziś w limicie; z more dalej zadania z najbliższym terminem. */
export function nextReview(exam: string, more: boolean, skipped: number[]): Promise<NextReview> {
  return request(`/reviews/${exam}/next${query({ more, skipped })}`)
}

export function randomTask(
  exam: string,
  topics: string[],
  skipped: number[],
): Promise<{ task: PracticeTask | null; cards: number }> {
  return request(`/random/${exam}${query({ topics, skipped })}`)
}

/** Zamknięte wysyła zaznaczoną odpowiedź, otwarte wpisane wyniki końcowe. */
export function checkSolution(
  id: number,
  mode: PracticeMode,
  given: { answer: string } | { answers: string[] },
): Promise<Checked> {
  return request(`/tasks/${id}/solution`, { mode, ...given })
}

/** Jak serwer odczytał wpis, w LaTeX-u; null, gdy zapisu nie da się odczytać. */
export function readAnswer(kind: ResultKind, text: string): Promise<{ latex: string | null }> {
  return request('/read', { kind, text })
}

// Zadanie ze strony demo, do zrobienia bez konta.
export function loadDemoTask(): Promise<PracticeTask> {
  return request('/demo')
}

export function checkDemoTask(answer: string): Promise<Checked> {
  return request('/demo/check', { answer })
}

/** after_exam: zadanie nie wróci przed maturą, bo uczeń będzie je wtedy jeszcze pamiętał. */
export function rateSolution(
  solutionId: number,
  rating: Rating,
): Promise<{ due: string; after_exam: boolean }> {
  return request(`/solutions/${solutionId}/rating`, { rating })
}

interface TopicProgressIn {
  total: number
  done: number
  due: number
  recent: { attempts: number; correct: number }
  last_activity?: string
}

/** Postęp ucznia na mapie; null, gdy nikt nie jest zalogowany (wtedy mapa pokazuje przykład). */
export async function loadProgress(exam: string): Promise<MapProgress<string> | null> {
  try {
    const loaded = await request<{
      topics: Record<string, TopicProgressIn>
      last_station: string | null
    }>(`/progress/${exam}`)
    const topics = Object.fromEntries(
      Object.entries(loaded.topics).map(([code, { last_activity, ...topic }]) => [
        code,
        { ...topic, lastActivity: last_activity ? new Date(last_activity) : undefined },
      ]),
    )
    return { topics, lastStation: loaded.last_station ?? undefined }
  } catch (error) {
    if (error instanceof Rejected && error.status === 401) return null
    throw error
  }
}

/** Np. „Maj 2024, zad. 9.1”. */
export function taskSource(task: PracticeTask): string {
  const number = task.subnumber ? `${task.number}.${task.subnumber}` : `${task.number}`
  return `${task.source} ${task.year}, zad. ${number}`
}
