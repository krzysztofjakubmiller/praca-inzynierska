import { ref } from 'vue'
import { API_URL, authorization } from '@/access'

export type Level = 'podstawowa' | 'rozszerzona'
export type DailyReviews = 'malo' | 'srednio' | 'duzo'

export interface ProfileSettings {
  level: Level
  exam_year: number
  target_percent: number | null
  theme: 'light' | 'dark'
  dark_shade: 'grey' | 'black'
  daily_reviews: DailyReviews
}

export interface Profile extends ProfileSettings {
  exam_years: number[]
  exam_dates: Record<Level, string>
  /** Ile powtórek może przyjść jednego dnia przy wybranym daily_reviews; liczby zna backend. */
  daily_review_limit: number
}

function send(init: RequestInit = {}): Promise<Response> {
  return fetch(`${API_URL}/api/profile`, {
    ...init,
    credentials: 'include',
    headers: { ...authorization('access'), 'Content-Type': 'application/json' },
  })
}

// null oznacza, że nikt nie jest zalogowany.
export async function loadProfile(): Promise<Profile | null> {
  const response = await send()
  if (response.status === 401) return null
  if (!response.ok) throw new Error(`backend odpowiedział kodem ${response.status}`)
  return response.json()
}

// Zwraca zapisany profil albo komunikaty backendu do pokazania przy ustawieniach.
export async function saveProfile(settings: ProfileSettings): Promise<Profile | string[]> {
  const response = await send({ method: 'PUT', body: JSON.stringify(settings) })
  const body = await response.json().catch(() => null)
  if (response.ok) return body
  if (!Array.isArray(body?.detail)) {
    throw new Error(`backend odpowiedział kodem ${response.status}`)
  }
  return body.detail
}

// Profil zalogowanego ucznia, wspólny dla całej aplikacji: motyw, ustawienia i strony konta
// czytają i zmieniają ten sam obiekt. null, gdy nikt nie jest zalogowany.
export const profile = ref<Profile | null>(null)

let loading: Promise<void> | null = null

// Kilka stron może poprosić o profil naraz (aplikacja przy starcie i konto), a zapytanie idzie jedno.
export function refreshProfile(): Promise<void> {
  loading ??= loadProfile()
    .then((loaded) => {
      profile.value = loaded
    })
    .finally(() => {
      loading = null
    })
  return loading
}

function settingsOf(current: Profile): ProfileSettings {
  return {
    level: current.level,
    exam_year: current.exam_year,
    target_percent: current.target_percent,
    theme: current.theme,
    dark_shade: current.dark_shade,
    daily_reviews: current.daily_reviews,
  }
}

// Zmianę widać od razu, a gdy serwer jej nie przyjmie, profil wraca do poprzedniego stanu.
// Zwraca komunikaty backendu; pusta lista oznacza zapis. Bez zalogowania nie robi nic.
export async function updateProfile(changes: Partial<ProfileSettings>): Promise<string[]> {
  const before = profile.value
  if (!before) return []
  profile.value = { ...before, ...changes }
  try {
    const result = await saveProfile({ ...settingsOf(before), ...changes })
    if (Array.isArray(result)) {
      profile.value = before
      return result
    }
    profile.value = result
    return []
  } catch (error) {
    profile.value = before
    throw error
  }
}
