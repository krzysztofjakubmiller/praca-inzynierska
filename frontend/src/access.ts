// Lokalnie pusty, bo serwer deweloperski Vite przekazuje /api do backendu. Na serwerze backend
// stoi pod osobną subdomeną, więc adres przychodzi ze zmiennej ustawianej przy buildzie.
export const API_URL = import.meta.env.VITE_API_URL ?? ''

const STORAGE_KEY = 'haslo-dostepu'

export function savedPassword(): string | null {
  return localStorage.getItem(STORAGE_KEY)
}

export function forgetPassword() {
  localStorage.removeItem(STORAGE_KEY)
}

export function authorization(): Record<string, string> {
  return { Authorization: `Bearer ${savedPassword() ?? ''}` }
}

// Zapamiętuje hasło tylko wtedy, gdy backend je przyjął. Brak odpowiedzi serwera to wyjątek,
// żeby strona wejścia mogła go odróżnić od złego hasła.
export async function tryPassword(password: string): Promise<boolean> {
  const response = await fetch(`${API_URL}/api/access`, {
    headers: { Authorization: `Bearer ${password}` },
  })
  if (response.status === 401) return false
  if (!response.ok) throw new Error(`backend odpowiedział kodem ${response.status}`)
  localStorage.setItem(STORAGE_KEY, password)
  return true
}
