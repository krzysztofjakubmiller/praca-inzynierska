import { API_URL, authorization, forgetPassword } from '@/access'
import type { Figures } from '@/figures'
import type { ResultKind } from '@/practice'
import router from '@/router'

export type ReviewStatus = 'do-sprawdzenia' | 'sprawdzone'
export type AnswerFormat = 'wielokrotny-wybor' | 'prawda-falsz' | 'dobieranie' | 'otwarte'

export interface Option {
  code: string
  name: string
}

export interface ExamOptions extends Option {
  /** tasks to liczba zadań tematu w bazie, niezależnie od statusu. */
  topics: (Option & { tasks: number })[]
  sources: Option[]
}

export interface TaskSummary {
  id: number
  exam: string
  topic: string
  source: string
  year: number
  number: number
  subnumber: number | null
  content: string
  review_status: ReviewStatus
}

/** Zasady oceniania zadania otwartego: wyniki dla programu, zasady i uwagi CKE dla AI. */
export interface Scoring {
  results: { part?: string; expected: string; kind: ResultKind; points?: number }[]
  rules: string
  notes?: string | null
}

export interface TaskUpdate {
  topic: string
  source: string
  year: number
  month: number
  number: number
  subnumber: number | null
  max_points: number
  content: string
  has_figure: boolean
  answer_format: AnswerFormat
  choices: Record<string, string> | null
  /** Tekst w środku tabeli przy dobieraniu; przy innych formatach null. */
  connector: string | null
  figures: Figures | null
  answer: string | null
  /** Tylko przy zadaniu otwartym; bez zasad zadanie nie trafia do ucznia. */
  scoring: Scoring | null
  review_status: ReviewStatus
}

export interface TaskDetails extends TaskUpdate {
  id: number
  exam: string
  read_method: string
  read_model: string | null
  ai_content: string | null
}

export interface TemplateCheck {
  passed: boolean
  problems: string[]
  /** Brak przy szablonie, który odpadł już na formacie. */
  successful?: number
  draws?: number
  distinct?: number
}

/** Oryginał (variant null) albo wariant tak, jak zobaczy go uczeń. */
export interface TemplatePreview {
  variant: Record<string, number | string> | null
  content: string
  choices: Record<string, string> | null
  figures: Figures | null
  answer: string
  /** Zasady oceniania zadania otwartego z liczbami wariantu; panel ich nie pokazuje. */
  scoring: Record<string, unknown> | null
}

export interface TemplateDetails {
  body: Record<string, unknown>
  ai_body: Record<string, unknown> | null
  read_method: string
  read_model: string | null
  review_status: ReviewStatus
  check_result: TemplateCheck
  preview: TemplatePreview[]
}

export interface TaskFilters {
  exam?: string
  topic?: string
  status?: string
  /** 'true' albo 'false'; pusty tekst to wszystkie zadania. */
  has_figure?: string
  /** 'true': tylko zadania otwarte bez zasad oceniania. */
  without_scoring?: string
}

// Backend odrzuca błędne dane kodem 422 z listą problemów po polsku.
export class Rejected extends Error {
  constructor(readonly problems: string[]) {
    super(problems.join('\n'))
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}/api/panel${path}`, {
    ...init,
    headers: {
      ...authorization('panel'),
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
    },
  }).catch(() => null)
  if (response?.status === 204) return undefined as T
  if (response?.status === 401) {
    // Hasło panelu zmieniło się na serwerze, więc zapamiętane trzeba wpisać jeszcze raz.
    forgetPassword('panel')
    await router.push({
      name: 'panel-access',
      query: { dalej: router.currentRoute.value.fullPath },
    })
  }

  const body = await response?.json().catch(() => null)
  if (response?.ok) return body as T

  // FastAPI przy złym formacie zapytania wstawia do detail obiekty z polem msg zamiast tekstów.
  if (Array.isArray(body?.detail)) {
    throw new Rejected(
      body.detail.map((item: string | { msg: string }) =>
        typeof item === 'string' ? item : item.msg,
      ),
    )
  }
  throw new Rejected(['serwer nie odpowiada albo zgłosił błąd, czy backend jest uruchomiony?'])
}

function json(method: string, data: unknown): RequestInit {
  return { method, body: JSON.stringify(data) }
}

export const panelApi = {
  options: () => request<ExamOptions[]>('/options'),
  tasks: (filters: TaskFilters) => {
    const params = new URLSearchParams(
      Object.entries(filters).filter((entry): entry is [string, string] => Boolean(entry[1])),
    )
    return request<TaskSummary[]>(`/tasks?${params}`)
  },
  task: (id: number) => request<TaskDetails>(`/tasks/${id}`),
  save: (id: number, task: TaskUpdate) => request<TaskDetails>(`/tasks/${id}`, json('PUT', task)),
  remove: (id: number) => request<void>(`/tasks/${id}`, { method: 'DELETE' }),
  changeTopic: (ids: number[], topic: string) =>
    request<{ changed: number }>('/tasks/topic', json('POST', { ids, topic })),
  reopen: (ids: number[]) => request<{ changed: number }>('/tasks/reopen', json('POST', { ids })),
  next: (after: number) => request<{ id: number | null }>(`/next?after=${after}`),
  // Plik w formacie importu; tu potrzebne są tylko kody do nazwy pliku.
  exportTasks: (ids: number[]) =>
    request<{ exam: string; topic: string }>('/export', json('POST', { ids })),
  importText: (text: string) => request<{ ids: number[] }>('/import', json('POST', { text })),
  importScoring: (text: string) =>
    request<{ ids: number[] }>('/import-scoring', json('POST', { text })),
  // null, gdy zadanie nie ma jeszcze szablonu.
  template: (id: number) => request<TemplateDetails | null>(`/tasks/${id}/template`),
  saveTemplate: (id: number, body: unknown) =>
    request<TemplateDetails>(`/tasks/${id}/template`, json('PUT', { body })),
  acceptTemplate: (id: number) =>
    request<TemplateDetails>(`/tasks/${id}/template/accept`, { method: 'POST' }),
  removeTemplate: (id: number) => request<void>(`/tasks/${id}/template`, { method: 'DELETE' }),
  aiGrades: () => request<AiGrade[]>('/ai/grades'),
  setTutorPoints: (id: number, points: number) =>
    request<void>(`/ai/grades/${id}/tutor-points`, json('PUT', { points })),
}

/** Ocena rozwiązania przez AI w aplikacji, do porównania z oceną korepetytora. */
export interface AiGrade {
  id: number
  created_at: string
  task_id: number
  content: string
  max_points: number
  model: string
  /** null, gdy AI nie odczytało rozwiązania. */
  ai_points: number | null
  reading: string
  explanation: string
  text: string | null
  has_image: boolean
  image_file: string | null
  tutor_points: number | null
  feedback: string | null
  feedback_comment: string | null
}

/** Zdjęcie rozwiązania jako adres do <img>; obraz wymaga hasła panelu, więc idzie przez fetch. */
export async function aiGradeImage(id: number): Promise<string> {
  const response = await fetch(`${API_URL}/api/panel/ai/grades/${id}/image`, {
    headers: authorization('panel'),
  })
  if (!response.ok) throw new Rejected(['nie udało się pobrać zdjęcia'])
  return URL.createObjectURL(await response.blob())
}
