import { readonly, ref } from 'vue'

export type MapView = 'map' | 'list'

const STORAGE_KEY = 'map-view'

// Tak jak motyw: wybór trafi kiedyś na konto ucznia, a do tego czasu zostaje w przeglądarce.
export function loadMapView(): MapView {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'list' ? 'list' : 'map'
  } catch {
    return 'map'
  }
}

function saveMapView(view: MapView): void {
  try {
    localStorage.setItem(STORAGE_KEY, view)
  } catch {
    // Bez zapisu strona po odświeżeniu pokazuje mapę.
  }
}

const view = ref<MapView>(loadMapView())

export function setMapView(value: MapView): void {
  view.value = value
  saveMapView(value)
}

export function useMapView() {
  return { view: readonly(view), setView: setMapView }
}
