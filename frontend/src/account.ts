import { API_URL, authorization } from '@/access'

export interface Account {
  email: string
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

// null oznacza sukces, a tekst to komunikaty backendu do pokazania pod formularzem.
async function submit(path: string, data: object): Promise<string | null> {
  const response = await send(path, { method: 'POST', body: JSON.stringify(data) })
  if (response.ok) return null
  if (response.status >= 500) throw new Error(`backend odpowiedział kodem ${response.status}`)
  const body = await response.json()
  return body.detail.join(' ')
}

export function register(email: string, password: string) {
  return submit('/register', { email, password })
}

export function logIn(email: string, password: string) {
  return submit('/login', { email, password })
}

// credential to token, który przycisk Google przekazuje stronie po wyborze konta.
export function logInWithGoogle(credential: string) {
  return submit('/google', { credential })
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
