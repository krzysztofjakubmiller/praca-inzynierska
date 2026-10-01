import { onBeforeUnmount, readonly, ref, watch } from 'vue'

export type MapTheme = 'light' | 'dark'

const STORAGE_KEY = 'map-theme'

// Wybór motywu trafi kiedyś na konto ucznia; do tego czasu zostaje w przeglądarce
// i wystarczy podmienić te dwie funkcje.
export function loadMapTheme(): MapTheme {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

export function saveMapTheme(theme: MapTheme): void {
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // Bez zapisu motyw po odświeżeniu wraca do jasnego.
  }
}

const theme = ref<MapTheme>(loadMapTheme())

export function setMapTheme(value: MapTheme): void {
  theme.value = value
  saveMapTheme(value)
}

/**
 * Motyw strony z mapą. Ciemny działa tylko na tej stronie: po wyjściu z niej reszta
 * aplikacji wraca do jasnego.
 */
export function useMapTheme() {
  const stop = watch(
    theme,
    (value) => {
      document.documentElement.dataset.theme = value
    },
    { immediate: true },
  )
  onBeforeUnmount(() => {
    stop()
    delete document.documentElement.dataset.theme
  })
  return { theme: readonly(theme), setTheme: setMapTheme }
}
