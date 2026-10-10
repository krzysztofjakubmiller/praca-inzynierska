// Lokalnie pusty, bo serwer deweloperski Vite przekazuje /api do backendu. Na serwerze backend
// stoi pod osobną subdomeną, więc adres przychodzi ze zmiennej ustawianej przy buildzie.
export const API_URL = import.meta.env.VITE_API_URL ?? ''

// Jedno hasło otwiera całą aplikację, drugie dodatkowo panel właściciela.
export type PasswordKind = 'access' | 'panel'

const STORAGE_KEYS: Record<PasswordKind, string> = {
  access: 'haslo-dostepu',
  panel: 'haslo-panelu',
}

const CHECK_PATHS: Record<PasswordKind, string> = {
  access: '/api/access',
  panel: '/api/panel/access',
}

export function savedPassword(kind: PasswordKind): string | null {
  return localStorage.getItem(STORAGE_KEYS[kind])
}

export function forgetPassword(kind: PasswordKind) {
  localStorage.removeItem(STORAGE_KEYS[kind])
}

export function authorization(kind: PasswordKind): Record<string, string> {
  return { Authorization: `Bearer ${savedPassword(kind) ?? ''}` }
}

// Zapamiętuje hasło tylko wtedy, gdy backend je przyjął. Brak odpowiedzi serwera to wyjątek,
// żeby strona wejścia mogła go odróżnić od złego hasła.
export async function tryPassword(kind: PasswordKind, password: string): Promise<boolean> {
  const response = await fetch(`${API_URL}${CHECK_PATHS[kind]}`, {
    headers: { Authorization: `Bearer ${password}` },
  })
  if (response.status === 401) return false
  if (!response.ok) throw new Error(`backend odpowiedział kodem ${response.status}`)
  localStorage.setItem(STORAGE_KEYS[kind], password)
  return true
}
