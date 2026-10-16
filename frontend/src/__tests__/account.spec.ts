import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  changePassword,
  confirmEmail,
  loadAccount,
  logIn,
  logInWithGoogle,
  logOut,
  logOutEverywhere,
  register,
  requestPasswordLink,
  setPassword,
} from '@/account'

function answer(status: number, body?: unknown) {
  const text = body === undefined ? null : JSON.stringify(body)
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(text, { status })))
}

afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

describe('register', () => {
  it('sends the form with the session cookie and the access password', async () => {
    localStorage.setItem('haslo-dostepu', 'sekret')
    answer(201, { email: 'ola@example.com' })

    await expect(register('ola@example.com', 'dlugie-haslo-123')).resolves.toBeNull()
    expect(fetch).toHaveBeenCalledWith('/api/account/register', {
      method: 'POST',
      body: JSON.stringify({ email: 'ola@example.com', password: 'dlugie-haslo-123' }),
      credentials: 'include',
      headers: { Authorization: 'Bearer sekret', 'Content-Type': 'application/json' },
    })
  })

  it('returns all problems reported by the backend', async () => {
    answer(422, { detail: ['Niepoprawny adres e-mail.', 'Hasło musi mieć co najmniej 12 znaków.'] })

    await expect(register('ola', 'krotkie')).resolves.toEqual({
      message: 'Niepoprawny adres e-mail. Hasło musi mieć co najmniej 12 znaków.',
      status: 422,
    })
  })

  it('passes on the message about a failed email', async () => {
    answer(502, { detail: ['Nie udało się wysłać maila. Spróbuj za chwilę.'] })

    await expect(register('ola@example.com', 'dlugie-haslo-123')).resolves.toEqual({
      message: 'Nie udało się wysłać maila. Spróbuj za chwilę.',
      status: 502,
    })
  })

  it('fails when the backend has a problem', async () => {
    answer(500)

    await expect(register('ola@example.com', 'dlugie-haslo-123')).rejects.toThrow(
      'backend odpowiedział kodem 500',
    )
  })
})

describe('logIn', () => {
  it('returns the reason of a rejected login', async () => {
    answer(401, { detail: ['Złe hasło.'] })

    await expect(logIn('ola@example.com', 'inne-haslo-123')).resolves.toEqual({
      message: 'Złe hasło.',
      status: 401,
    })
    expect(fetch).toHaveBeenCalledWith(
      '/api/account/login',
      expect.objectContaining({ method: 'POST', credentials: 'include' }),
    )
  })
})

describe('loadAccount', () => {
  it('returns the logged in account', async () => {
    answer(200, { email: 'ola@example.com' })

    await expect(loadAccount()).resolves.toEqual({ email: 'ola@example.com' })
    expect(fetch).toHaveBeenCalledWith(
      '/api/account',
      expect.objectContaining({ credentials: 'include' }),
    )
  })

  it('returns null when nobody is logged in', async () => {
    answer(401, { detail: ['Nie zalogowano.'] })

    await expect(loadAccount()).resolves.toBeNull()
  })
})

describe('logOut', () => {
  it('asks the backend to end the session', async () => {
    answer(204)

    await logOut()

    expect(fetch).toHaveBeenCalledWith(
      '/api/account/logout',
      expect.objectContaining({ method: 'POST', credentials: 'include' }),
    )
  })
})

describe('logInWithGoogle', () => {
  it('sends the Google token with the session cookie and the access password', async () => {
    localStorage.setItem('haslo-dostepu', 'sekret')
    answer(204)

    await expect(logInWithGoogle('token-od-google')).resolves.toBeNull()
    expect(fetch).toHaveBeenCalledWith('/api/account/google', {
      method: 'POST',
      body: JSON.stringify({ credential: 'token-od-google' }),
      credentials: 'include',
      headers: { Authorization: 'Bearer sekret', 'Content-Type': 'application/json' },
    })
  })
})

describe('links from emails and account security', () => {
  it.each([
    ['confirmEmail', () => confirmEmail('klucz'), '/api/account/confirm', { key: 'klucz' }],
    [
      'requestPasswordLink',
      () => requestPasswordLink('ola@example.com'),
      '/api/account/password-link',
      { email: 'ola@example.com' },
    ],
    [
      'setPassword',
      () => setPassword('klucz', 'nowe-dlugie-haslo'),
      '/api/account/password',
      { key: 'klucz', password: 'nowe-dlugie-haslo' },
    ],
    [
      'changePassword without a current password',
      () => changePassword(null, 'nowe-dlugie-haslo'),
      '/api/account/change-password',
      { current_password: null, new_password: 'nowe-dlugie-haslo' },
    ],
    ['logOutEverywhere', () => logOutEverywhere(), '/api/account/logout-everywhere', {}],
  ])('%s posts to the backend', async (_name, call, path, data) => {
    answer(204)

    await expect(call()).resolves.toBeNull()
    expect(fetch).toHaveBeenCalledWith(
      path,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(data),
        credentials: 'include',
      }),
    )
  })
})
