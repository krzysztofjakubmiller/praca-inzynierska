import { computed, ref, watch } from 'vue'
import { profile, updateProfile } from '@/profile'

export type Theme = 'light' | 'dark'
export type DarkShade = 'grey' | 'black'

// Te same klucze czyta skrypt w index.html, który przyciemnia stronę przed pierwszym malowaniem.
const THEME_KEY = 'motyw'
const SHADE_KEY = 'odcien-motywu'

function stored<T extends string>(key: string, values: readonly T[], fallback: T): T {
  try {
    const value = localStorage.getItem(key)
    return values.includes(value as T) ? (value as T) : fallback
  } catch {
    return fallback
  }
}

function store(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Bez zapisu w przeglądarce motyw i tak zostaje na koncie zalogowanego.
  }
}

// Wybór zapamiętany w przeglądarce. Niezalogowanemu to jedyny zapis, a zalogowanemu pozwala
// pokazać właściwy motyw, zanim przyjdzie profil z serwera.
const saved = ref({
  theme: stored<Theme>(THEME_KEY, ['light', 'dark'], 'light'),
  shade: stored<DarkShade>(SHADE_KEY, ['grey', 'black'], 'grey'),
})

export const theme = computed<Theme>(() => profile.value?.theme ?? saved.value.theme)
export const darkShade = computed<DarkShade>(() => profile.value?.dark_shade ?? saved.value.shade)

watch([theme, darkShade], ([value, shade]) => {
  saved.value = { theme: value, shade }
  store(THEME_KEY, value)
  store(SHADE_KEY, shade)
})

// Zalogowanemu zmiana trafia też do profilu, więc przełącznik na mapie i ustawienia konta
// pokazują zawsze to samo. Gdy serwer nie odpowie, profil wraca do poprzedniego motywu.
export async function setTheme(value: Theme): Promise<void> {
  saved.value = { ...saved.value, theme: value }
  await updateProfile({ theme: value }).catch(() => [])
}

export async function setDarkShade(value: DarkShade): Promise<void> {
  saved.value = { ...saved.value, shade: value }
  await updateProfile({ dark_shade: value }).catch(() => [])
}
