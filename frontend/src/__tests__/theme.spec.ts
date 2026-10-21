import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'

const PROFILE = {
  level: 'podstawowa',
  exam_year: 2027,
  target_percent: null,
  theme: 'dark',
  dark_shade: 'black',
  daily_reviews: 'srednio',
  exam_years: [2027, 2028, 2029],
  exam_dates: { podstawowa: '2027-05-05', rozszerzona: '2027-05-11' },
}

// Moduły motywu i profilu trzymają stan, więc każdy test wczytuje je od nowa.
async function freshModules() {
  vi.resetModules()
  const profile = await import('@/profile')
  const theme = await import('@/theme')
  return { ...profile, ...theme }
}

function answer(status: number, body?: unknown) {
  const text = body === undefined ? null : JSON.stringify(body)
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(text, { status })))
}

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('theme without an account', () => {
  it('starts light with the grey shade', async () => {
    const { theme, darkShade } = await freshModules()

    expect(theme.value).toBe('light')
    expect(darkShade.value).toBe('grey')
  })

  it('remembers the choice in the browser', async () => {
    const first = await freshModules()
    await first.setTheme('dark')
    await first.setDarkShade('black')
    await nextTick()

    const second = await freshModules()
    expect(second.theme.value).toBe('dark')
    expect(second.darkShade.value).toBe('black')
  })
})

describe('theme of a logged-in student', () => {
  it('follows the profile and copies it to the browser', async () => {
    answer(200, PROFILE)
    const { refreshProfile, theme, darkShade } = await freshModules()

    await refreshProfile()
    await nextTick()

    expect(theme.value).toBe('dark')
    expect(darkShade.value).toBe('black')
    expect(localStorage.getItem('motyw')).toBe('dark')
    expect(localStorage.getItem('odcien-motywu')).toBe('black')
  })

  it('saves a change in the profile', async () => {
    answer(200, PROFILE)
    const { refreshProfile, setTheme, theme } = await freshModules()
    await refreshProfile()

    answer(200, { ...PROFILE, theme: 'light' })
    await setTheme('light')

    expect(theme.value).toBe('light')
    const [, init] = vi.mocked(fetch).mock.calls[0]!
    expect(init?.method).toBe('PUT')
    expect(JSON.parse(init?.body as string).theme).toBe('light')
  })

  it('goes back to the saved theme when the server fails', async () => {
    answer(200, PROFILE)
    const { refreshProfile, setTheme, theme } = await freshModules()
    await refreshProfile()

    answer(500)
    await setTheme('light')

    expect(theme.value).toBe('dark')
  })
})
