import { afterEach, describe, expect, it, vi } from 'vitest'
import { loadProfile, saveProfile, type ProfileSettings } from '@/profile'

const SETTINGS: ProfileSettings = {
  level: 'rozszerzona',
  exam_year: 2027,
  target_percent: 80,
  theme: 'dark',
  dark_shade: 'black',
  daily_reviews: 'duzo',
}

const PROFILE = {
  ...SETTINGS,
  exam_years: [2027, 2028, 2029],
  exam_dates: { podstawowa: '2027-05-05', rozszerzona: '2027-05-11' },
  daily_review_limit: 40,
}

function answer(status: number, body?: unknown) {
  const text = body === undefined ? null : JSON.stringify(body)
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(text, { status })))
}

afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

describe('loadProfile', () => {
  it('returns the profile of the logged-in student', async () => {
    localStorage.setItem('haslo-dostepu', 'sekret')
    answer(200, PROFILE)

    await expect(loadProfile()).resolves.toEqual(PROFILE)
    expect(fetch).toHaveBeenCalledWith('/api/profile', {
      credentials: 'include',
      headers: { Authorization: 'Bearer sekret', 'Content-Type': 'application/json' },
    })
  })

  it('returns null when nobody is logged in', async () => {
    answer(401, { detail: ['Nie zalogowano.'] })

    await expect(loadProfile()).resolves.toBeNull()
  })

  it('throws when the server fails', async () => {
    answer(500)

    await expect(loadProfile()).rejects.toThrow('backend odpowiedział kodem 500')
  })
})

describe('saveProfile', () => {
  it('sends all settings and returns the saved profile', async () => {
    answer(200, PROFILE)

    await expect(saveProfile(SETTINGS)).resolves.toEqual(PROFILE)
    expect(fetch).toHaveBeenCalledWith(
      '/api/profile',
      expect.objectContaining({ method: 'PUT', body: JSON.stringify(SETTINGS) }),
    )
  })

  it('returns the problems reported by the backend', async () => {
    answer(422, { detail: ['Cel podaj w procentach, od 1 do 100.'] })

    await expect(saveProfile({ ...SETTINGS, target_percent: 0 })).resolves.toEqual([
      'Cel podaj w procentach, od 1 do 100.',
    ])
  })

  it('throws when the server fails', async () => {
    answer(500)

    await expect(saveProfile(SETTINGS)).rejects.toThrow('backend odpowiedział kodem 500')
  })
})
