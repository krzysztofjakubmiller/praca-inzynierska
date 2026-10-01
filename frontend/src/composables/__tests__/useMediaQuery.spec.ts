import { afterEach, describe, it, expect, vi } from 'vitest'
import { effectScope } from 'vue'

import { useMediaQuery } from '@/composables/useMediaQuery'

function fakeMedia(matches: boolean) {
  const listeners = new Set<() => void>()
  const media = {
    matches,
    addEventListener: (_type: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_type: string, listener: () => void) => listeners.delete(listener),
  }
  vi.stubGlobal('matchMedia', () => media)
  return {
    listeners,
    change(value: boolean) {
      media.matches = value
      listeners.forEach((listener) => listener())
    },
  }
}

afterEach(() => vi.unstubAllGlobals())

describe('useMediaQuery', () => {
  it('knows the answer right away and follows changes', () => {
    const media = fakeMedia(true)
    const scope = effectScope()
    const wide = scope.run(() => useMediaQuery('(min-width: 64rem)'))!
    expect(wide.value).toBe(true)
    media.change(false)
    expect(wide.value).toBe(false)
    scope.stop()
  })

  it('stops listening when the component goes away', () => {
    const media = fakeMedia(false)
    const scope = effectScope()
    scope.run(() => useMediaQuery('(min-width: 64rem)'))
    expect(media.listeners.size).toBe(1)
    scope.stop()
    expect(media.listeners.size).toBe(0)
  })
})
