import { vi } from 'vitest'

// jsdom nie mierzy elementów, nie śledzi ich widoczności i nie zna zapytań o media.
// Korzystają z nich bryły i mapy, więc strony z nimi potrzebują tych atrap.
export function stubBrowser() {
  const observer = class {
    observe() {}
    disconnect() {}
  }
  vi.stubGlobal('ResizeObserver', observer)
  vi.stubGlobal('IntersectionObserver', observer)
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  }))
}
