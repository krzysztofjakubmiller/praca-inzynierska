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
  answer: string | null
  review_status: ReviewStatus
}

export interface TaskDetails extends TaskUpdate {
  id: number
  exam: string
  read_method: string
  read_model: string | null
  ai_content: string | null
}

export interface TaskFilters {
  exam?: string
  topic?: string
  status?: string
}

// Backend odrzuca błędne dane kodem 422 z listą problemów po polsku.
export class Rejected extends Error {
  constructor(readonly problems: string[]) {
    super(problems.join('\n'))
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api/panel${path}`, {
    ...init,
    headers: init.body ? { 'Content-Type': 'application/json' } : undefined,
  }).catch(() => null)
  if (response?.status === 204) return undefined as T

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
  importText: (text: string) => request<{ ids: number[] }>('/import', json('POST', { text })),
}
