import { afterEach, describe, expect, it, vi } from 'vitest'
import router from '@/router'
import { panelApi, Rejected } from '../api'

function answer(status: number, body: unknown) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status })))
}

afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

describe('panelApi', () => {
  it('returns the response body', async () => {
    answer(200, { id: 7 })

    await expect(panelApi.next(3)).resolves.toEqual({ id: 7 })
    expect(fetch).toHaveBeenCalledWith('/api/panel/next?after=3', expect.anything())
  })

  it('turns backend problems into Rejected', async () => {
    answer(422, { detail: ['nieparzysta liczba znaków $'] })

    await expect(panelApi.importText('{}')).rejects.toEqual(
      new Rejected(['nieparzysta liczba znaków $']),
    )
  })

  it('reads messages from FastAPI validation errors', async () => {
    answer(422, { detail: [{ msg: 'Field required' }] })

    await expect(panelApi.task(1)).rejects.toMatchObject({ problems: ['Field required'] })
  })

  it('explains when the backend is down', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    await expect(panelApi.options()).rejects.toMatchObject({
      problems: ['serwer nie odpowiada albo zgłosił błąd, czy backend jest uruchomiony?'],
    })
  })

  it('sends the saved panel password', async () => {
    localStorage.setItem('haslo-dostepu', 'sekret')
    localStorage.setItem('haslo-panelu', 'sekret-panelu')
    answer(200, [])

    await panelApi.options()

    expect(fetch).toHaveBeenCalledWith('/api/panel/options', {
      headers: { Authorization: 'Bearer sekret-panelu' },
    })
  })

  it('forgets a rejected panel password and asks for it again', async () => {
    localStorage.setItem('haslo-dostepu', 'sekret')
    localStorage.setItem('haslo-panelu', 'stare')
    answer(401, { detail: ['złe hasło panelu'] })

    await expect(panelApi.options()).rejects.toEqual(new Rejected(['złe hasło panelu']))
    expect(localStorage.getItem('haslo-panelu')).toBeNull()
    expect(localStorage.getItem('haslo-dostepu')).toBe('sekret')
    expect(router.currentRoute.value.name).toBe('panel-access')
  })

  it('skips empty filters', async () => {
    answer(200, [])

    await panelApi.tasks({ exam: 'e8', topic: '', status: '' })

    expect(fetch).toHaveBeenCalledWith('/api/panel/tasks?exam=e8', expect.anything())
  })
})
