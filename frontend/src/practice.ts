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
  label?: string
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

// Przy niedziałającym AI albo skończonym limicie uczeń nie ma czekać: zadanie da się
// skończyć bez AI. Ponowienie ma sens tylko przy chwilowej awarii, nie przy limicie.
export function aiProblem(error: unknown, otherwise: string): { text: string; retry: boolean } {
  if (error instanceof Rejected && error.status === 429) {
    return {
      text: 'Dzisiejszy limit pytań do AI się skończył, wróć jutro. Możesz przejść dalej i ocenić trudność zadania.',
      retry: false,
    }
  }
  if (error instanceof Rejected && error.status === 503) {
    return {
      text: 'Usługi AI chwilowo nie działają. Możesz przejść dalej i ocenić trudność zadania.',
      retry: true,
    }
  }
  if (error instanceof Rejected) return { text: error.problems.join(' '), retry: true }
  return { text: otherwise, retry: true }
}

function send(path: string, body?: object): Promise<Response> {
  return fetch(`${API_URL}/api/practice${path}`, {
    method: body ? 'POST' : 'GET',
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include',
    headers: { ...authorization('access'), 'Content-Type': 'application/json' },
  })
}

async function failure(response: Response): Promise<Error> {
  const data = await response.json().catch(() => null)
  if (
    Array.isArray(data?.detail) &&
    data.detail.every((item: unknown) => typeof item === 'string')
  ) {
    return new Rejected(response.status, data.detail)
  }
  return new Error(`backend odpowiedział kodem ${response.status}`)
}

async function request<T>(path: string, body?: object): Promise<T> {
  const response = await send(path, body)
  if (!response.ok) throw await failure(response)
  return (await response.json().catch(() => null)) as T
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

export interface Graded extends Checked {
  /** Dwa, trzy zdania od AI: gdzie jest błąd albo czego zabrakło. */
  explanation: string
  /** Rozwiązanie ucznia tak, jak odczytało je AI. */
  reading: string
  /** Zapytanie do AI, do którego uczeń może dodać reakcję. */
  request_id: number
}

export type Feedback = 'zgadzam-sie' | 'nie-zgadzam-sie' | 'pomoglo' | 'nie-pomoglo'

export function sendFeedback(requestId: number, feedback: Feedback, comment = ''): Promise<null> {
  return request(`/ai-requests/${requestId}/feedback`, { feedback, comment })
}

/** Zdjęcie kartki albo obraz tablicy w base64, wysyłane do Dyżurnego. */
export interface Picture {
  image: string
  image_type: 'image/jpeg' | 'image/png'
}

/** Ocena rozwiązania przez AI. Z solutionId ocenia się złe rozwiązanie, które już jest
    zapisane, i zostaje najlepsza z ocen; bez niego (dowód) powstaje nowe rozwiązanie. */
export function gradeSolution(
  id: number,
  mode: PracticeMode,
  answers: string[],
  picture: Picture,
  solutionId: number | null,
): Promise<Graded> {
  return request(`/tasks/${id}/grade`, { mode, answers, solution_id: solutionId, ...picture })
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

// Odpowiedź AI przychodzi kawałkami jako zdarzenia SSE (delta, done, error) i trafia do onText;
// wynikiem jest numer zapytania do reakcji ucznia. EventSource nie wysyła POST-a, dlatego
// strumień czyta fetch.
async function readStream(
  path: string,
  body: object,
  onText: (text: string) => void,
): Promise<number> {
  const response = await send(path, body)
  if (!response.ok || !response.body) throw await failure(response)
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n')
    // Zdarzenia rozdziela pusta linia; ostatni kawałek bufora może być jeszcze niepełny.
    const events = buffer.split('\n\n')
    buffer = events.pop()!
    for (const event of events) {
      const name = event.match(/^event: (.*)$/m)?.[1]
      const data = JSON.parse(event.match(/^data: (.*)$/m)?.[1] ?? 'null')
      if (name === 'delta') onText(data.text)
      if (name === 'done') return data.request_id
      if (name === 'error') throw new Rejected(response.status, [data.message])
    }
  }
  throw new Error('połączenie urwało się przed końcem odpowiedzi')
}

/** Pełne rozwiązanie od AI, dostępne dopiero po sprawdzeniu odpowiedzi. */
export function showAiSolution(id: number, onText: (text: string) => void): Promise<number> {
  return readStream(`/tasks/${id}/ai-solution`, {}, onText)
}

/** Rozmowa z Dyżurnym: cała rozmowa, ostatnia wiadomość to nowe pytanie ucznia, czasem
    ze zdjęciem albo tablicą. strong: odpowiada mocniejszy model, który lepiej odczytuje obraz. */
export function askAboutTask(
  id: number,
  messages: ChatMessage[],
  checked: boolean,
  picture: Picture | null,
  strong: boolean,
  onText: (text: string) => void,
): Promise<number> {
  return readStream(`/tasks/${id}/question`, { messages, checked, strong, ...picture }, onText)
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
