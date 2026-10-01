import { afterEach, describe, it, expect } from 'vitest'

import { loadMapView, setMapView, useMapView } from '@/composables/useMapView'

afterEach(() => {
  setMapView('map')
  localStorage.clear()
})

describe('useMapView', () => {
  it('shows the map when nothing was chosen', () => {
    localStorage.clear()
    expect(loadMapView()).toBe('map')
  })

  it('remembers the list', () => {
    setMapView('list')
    expect(loadMapView()).toBe('list')
    expect(useMapView().view.value).toBe('list')
  })
})
