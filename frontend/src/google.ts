// Identyfikator klienta jest jawny: Google wymaga go w kodzie każdej strony z przyciskiem.
export const GOOGLE_CLIENT_ID =
  '991477956168-0mjjmbp7o2lgkq9iqjrv8v49e4g03b8k.apps.googleusercontent.com'

interface GoogleAccountsId {
  initialize(options: {
    client_id: string
    callback: (response: { credential: string }) => void
  }): void
  renderButton(parent: HTMLElement, options: Record<string, string>): void
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleAccountsId } }
  }
}

let loading: Promise<void> | undefined

// Skrypt Google wczytujemy dopiero na stronach logowania i rejestracji, żeby Google nie widział
// wejść na pozostałe strony.
export function loadGoogleScript(): Promise<void> {
  if (window.google) return Promise.resolve()
  loading ??= new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client?hl=pl'
    script.onload = () => resolve()
    script.onerror = () => {
      loading = undefined
      reject(new Error('nie udało się wczytać skryptu Google'))
    }
    document.head.append(script)
  })
  return loading
}
