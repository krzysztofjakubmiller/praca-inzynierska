import { API_URL, authorization } from '@/access'

export interface Account {
  email: string
  has_password: boolean
}

// Komunikat backendu do pokazania pod formularzem. Kod odpowiedzi pozwala stronie dobrać
// przycisk, np. 403 przy logowaniu oznacza konto bez hasła.
export interface Problem {
  message: string
  status: number
}

// Klucz sesji leży w ciasteczku HttpOnly, którego JavaScript nie widzi. credentials: 'include'
// każe przeglądarce dołączać je także wtedy, gdy API stoi pod inną subdomeną.
function send(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${API_URL}/api/account${path}`, {
    ...init,
    credentials: 'include',
    headers: { ...authorization('access'), 'Content-Type': 'application/json' },
  })
}

// null oznacza sukces. Odpowiedź bez listy komunikatów to awaria serwera, a nie problem do
// pokazania pod formularzem.
async function submit(path: string, data: object): Promise<Problem | null> {
  const response = await send(path, { method: 'POST', body: JSON.stringify(data) })
  if (response.ok) return null
  const body = await response.json().catch(() => null)
  if (!Array.isArray(body?.detail)) {
    throw new Error(`backend odpowiedział kodem ${response.status}`)
  }
  return { message: body.detail.join(' '), status: response.status }
}

// Rejestracja tylko wysyła mail z linkiem; konto powstaje po jego kliknięciu (confirmEmail).
export function register(email: string, password: string, acceptedTerms: boolean) {
  return submit('/register', { email, password, accepted_terms: acceptedTerms })
}

export function confirmEmail(key: string) {
  return submit('/confirm', { key })
}

export function logIn(email: string, password: string) {
  return submit('/login', { email, password })
}

// credential to token, który przycisk Google przekazuje stronie po wyborze konta.
export function logInWithGoogle(credential: string) {
  return submit('/google', { credential })
}

export function requestPasswordLink(email: string) {
  return submit('/password-link', { email })
}

export function setPassword(key: string, password: string) {
  return submit('/password', { key, password })
}

// Konto założone przez Google nie ma obecnego hasła, więc current bywa null.
export function changePassword(current: string | null, next: string) {
  return submit('/change-password', { current_password: current, new_password: next })
}

export function logOutEverywhere() {
  return submit('/logout-everywhere', {})
}

export async function logOut() {
  await send('/logout', { method: 'POST' })
}

// null oznacza, że nikt nie jest zalogowany.
export async function loadAccount(): Promise<Account | null> {
  const response = await send('')
  if (response.status === 401) return null
  if (!response.ok) throw new Error(`backend odpowiedział kodem ${response.status}`)
  return response.json()
}
