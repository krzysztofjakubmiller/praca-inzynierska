import { afterEach, describe, expect, it, vi } from 'vitest'
import { savedPassword, tryPassword } from '@/access'

function answer(status: number) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status })))
}

afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

describe('tryPassword', () => {
  it('saves a password accepted by the backend', async () => {
    answer(204)

    await expect(tryPassword('sekret')).resolves.toBe(true)
    expect(fetch).toHaveBeenCalledWith('/api/access', {
      headers: { Authorization: 'Bearer sekret' },
    })
    expect(savedPassword()).toBe('sekret')
  })

  it('does not save a rejected password', async () => {
    answer(401)

    await expect(tryPassword('zle')).resolves.toBe(false)
    expect(savedPassword()).toBeNull()
  })

  it('fails when the backend has a problem', async () => {
    answer(500)

    await expect(tryPassword('sekret')).rejects.toThrow('backend odpowiedział kodem 500')
    expect(savedPassword()).toBeNull()
  })
})
