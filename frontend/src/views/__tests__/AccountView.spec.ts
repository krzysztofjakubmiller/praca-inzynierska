import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import App from '@/App.vue'
import { profile } from '@/profile'
import router from '@/router'

type Answers = Record<string, [status: number, body?: unknown]>

const ACCOUNT = { email: 'ola@example.com', has_password: true }
const PROFILE = {
  level: 'podstawowa',
  exam_year: 2027,
  target_percent: null,
  theme: 'light',
  dark_shade: 'grey',
  daily_reviews: 'srednio',
  exam_years: [2027, 2028, 2029],
  exam_dates: { podstawowa: '2027-05-05', rozszerzona: '2027-05-11' },
}

let wrapper: VueWrapper | undefined

// Odpowiedzi backendu według adresu; zapisany profil wraca z tym, co przyszło w zapytaniu.
function backend(answers: Answers) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      if (url === '/api/profile' && init?.method === 'PUT') {
        return new Response(JSON.stringify({ ...PROFILE, ...JSON.parse(String(init.body)) }))
      }
      const [status, body] = answers[url] ?? [500]
      return new Response(body === undefined ? null : JSON.stringify(body), { status })
    }),
  )
}

beforeAll(() => {
  localStorage.setItem('haslo-dostepu', 'sekret')
  // jsdom nie przewija stron i nie mierzy elementów, a z jednego i drugiego korzysta konto.
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  )
})

afterEach(() => {
  wrapper?.unmount()
  profile.value = null
  vi.unstubAllGlobals()
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  )
})

async function renderAt(path: string) {
  await router.push(path)
  wrapper = mount(App, { global: { plugins: [router] } })
  await flushPromises()
  return wrapper
}

function button(page: VueWrapper, text: string) {
  return page.findAll('button').find((item) => item.text() === text)!
}

describe('account page', () => {
  it('sends a visitor without a session to the login page', async () => {
    backend({ '/api/account': [401, { detail: ['Nie zalogowano.'] }] })

    await renderAt('/konto')

    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('login'))
  })

  it('logs out', async () => {
    backend({
      '/api/account': [200, ACCOUNT],
      '/api/profile': [200, PROFILE],
      '/api/account/logout': [204],
    })
    const page = await renderAt('/konto')
    await vi.waitFor(() => expect(page.text()).toContain('Zalogowano jako'))

    await button(page, 'Wyloguj').trigger('click')

    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('login'))
    expect(fetch).toHaveBeenCalledWith('/api/account/logout', expect.anything())
  })

  it('shows the account even when the profile does not load', async () => {
    backend({ '/api/account': [200, ACCOUNT] })

    const page = await renderAt('/konto')

    expect(page.text()).toContain('Zalogowano jako ola@example.com')
    expect(page.text()).toContain('Nie udało się wczytać ustawień.')
  })

  it('counts the days to the matura from the profile', async () => {
    vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-10-16T12:00:00') })
    backend({ '/api/account': [200, ACCOUNT], '/api/profile': [200, PROFILE] })

    const page = await renderAt('/konto')
    vi.useRealTimers()

    expect(page.find('h1').text().replace(/\s+/g, ' ')).toBe('201 dni do matury')
  })

  it('offers the example progress before the first tasks', async () => {
    backend({ '/api/account': [200, ACCOUNT], '/api/profile': [200, PROFILE] })

    const page = await renderAt('/konto')

    const link = page.findAll('a').find((item) => item.text() === 'Zobacz przykładowy postęp')
    expect(link?.attributes('href')).toBe('/demo/postep/matura-podstawowa')
  })

  it('has tabs for the profile, progress and settings', async () => {
    backend({ '/api/account': [200, ACCOUNT], '/api/profile': [200, PROFILE] })

    const page = await renderAt('/konto/ustawienia')

    const tabs = page.findAll('nav[aria-label="Konto"] a')
    expect(tabs.map((tab) => tab.text())).toEqual(['Profil', 'Postęp', 'Ustawienia'])
    expect(page.find('[aria-current="page"]').text()).toBe('Ustawienia')
  })
})

describe('settings', () => {
  it('saves the level as soon as it changes', async () => {
    backend({ '/api/account': [200, ACCOUNT], '/api/profile': [200, PROFILE] })
    const page = await renderAt('/konto/ustawienia')

    await page.find('input[value="rozszerzona"]').setValue(true)
    await flushPromises()

    expect(fetch).toHaveBeenCalledWith(
      '/api/profile',
      expect.objectContaining({ method: 'PUT', body: expect.stringContaining('"rozszerzona"') }),
    )
    expect(page.text()).toContain('Zapisano')
  })

  it('shows the dark background choice only with the dark theme', async () => {
    backend({ '/api/account': [200, ACCOUNT], '/api/profile': [200, PROFILE] })
    const page = await renderAt('/konto/ustawienia')
    expect(page.text()).not.toContain('Tło ciemnego motywu')

    await page.find('input[value="dark"]').setValue(true)
    await flushPromises()

    expect(page.text()).toContain('Tło ciemnego motywu')
  })
})

describe('progress page', () => {
  it('links to the other exam only for the extended level', async () => {
    backend({ '/api/account': [200, ACCOUNT], '/api/profile': [200, PROFILE] })
    const basic = await renderAt('/konto/postep/matura-podstawowa')
    expect(basic.text()).not.toContain('Matura rozszerzona')
    basic.unmount()

    backend({
      '/api/account': [200, ACCOUNT],
      '/api/profile': [200, { ...PROFILE, level: 'rozszerzona' }],
    })
    const extended = await renderAt('/konto/postep/matura-rozszerzona')
    const other = extended.findAll('a').find((item) => item.text() === 'Matura podstawowa')
    expect(other?.attributes('href')).toBe('/konto/postep/matura-podstawowa')
  })
})

describe('example progress', () => {
  it('works without an account and says the data is made up', async () => {
    backend({})

    const page = await renderAt('/demo/postep/matura-podstawowa')

    expect(page.text()).toContain('Przykładowe dane')
    expect(page.findAll('h3').map((heading) => heading.text())).toContain('Trasa do matury')
    const join = page.findAll('a').filter((item) => item.text() === 'Załóż konto')
    expect(join[0]?.attributes('href')).toBe('/rejestracja')
  })
})
