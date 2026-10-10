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

    await expect(tryPassword('access', 'sekret')).resolves.toBe(true)
    expect(fetch).toHaveBeenCalledWith('/api/access', {
      headers: { Authorization: 'Bearer sekret' },
    })
    expect(savedPassword('access')).toBe('sekret')
  })

  it('checks the panel password separately', async () => {
    answer(204)

    await tryPassword('panel', 'sekret-panelu')

    expect(fetch).toHaveBeenCalledWith('/api/panel/access', {
      headers: { Authorization: 'Bearer sekret-panelu' },
    })
    expect(savedPassword('panel')).toBe('sekret-panelu')
    expect(savedPassword('access')).toBeNull()
  })

  it('does not save a rejected password', async () => {
    answer(401)

    await expect(tryPassword('access', 'zle')).resolves.toBe(false)
    expect(savedPassword('access')).toBeNull()
  })

  it('fails when the backend has a problem', async () => {
    answer(500)

    await expect(tryPassword('access', 'sekret')).rejects.toThrow('backend odpowiedział kodem 500')
    expect(savedPassword('access')).toBeNull()
  })
})
