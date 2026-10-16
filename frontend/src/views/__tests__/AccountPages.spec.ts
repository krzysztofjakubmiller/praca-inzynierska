import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import App from '@/App.vue'
import router from '@/router'

type Answers = Record<string, [status: number, body?: unknown]>
type GoogleCallback = (response: { credential: string }) => void

let wrapper: VueWrapper | undefined
let googleCallback: GoogleCallback | undefined
const renderGoogleButton = vi.fn<(parent: HTMLElement, options: Record<string, string>) => void>()

// Atrapa skryptu Google: zapamiętuje funkcję, którą Google wywołałby po wyborze konta.
beforeEach(() => {
  renderGoogleButton.mockClear()
  vi.stubGlobal('google', {
    accounts: {
      id: {
        initialize: (options: { callback: GoogleCallback }) => {
          googleCallback = options.callback
        },
        renderButton: renderGoogleButton,
      },
    },
  })
})

function backend(answers: Answers) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      const [status, body] = answers[url]!
      return new Response(body === undefined ? null : JSON.stringify(body), { status })
    }),
  )
}

beforeAll(() => {
  localStorage.setItem('haslo-dostepu', 'sekret')
  // jsdom nie obsługuje przewijania, a router przewija po każdej zmianie strony.
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
})

// Router jest wspólny dla wszystkich testów, więc aplikacja z poprzedniego testu reagowałaby
// na zmiany adresu w następnym.
afterEach(() => {
  wrapper?.unmount()
  vi.unstubAllGlobals()
})

async function renderAt(path: string) {
  await router.push(path)
  wrapper = mount(App, { global: { plugins: [router] } })
  await flushPromises()
  return wrapper
}

async function fillAndSubmit(wrapper: VueWrapper) {
  await wrapper.find('input[type="email"]').setValue('ola@example.com')
  await wrapper.find('#password').setValue('dlugie-haslo-123')
  const consent = wrapper.find('input[type="checkbox"]')
  if (consent.exists()) await consent.setValue(true)
  await wrapper.find('form').trigger('submit')
}

describe('login page', () => {
  it('logs in and shows the email on the account page', async () => {
    backend({
      '/api/account/login': [204],
      '/api/account': [200, { email: 'ola@example.com', has_password: true }],
    })
    const wrapper = await renderAt('/logowanie')

    await fillAndSubmit(wrapper)

    await vi.waitFor(() => expect(wrapper.text()).toContain('Zalogowano jako ola@example.com'))
    expect(router.currentRoute.value.name).toBe('account')
  })

  it('shows why the login failed', async () => {
    backend({ '/api/account/login': [401, { detail: ['Złe hasło.'] }] })
    const wrapper = await renderAt('/logowanie')

    await fillAndSubmit(wrapper)

    await vi.waitFor(() => expect(wrapper.find('[role="alert"]').text()).toBe('Złe hasło.'))
    expect(router.currentRoute.value.name).toBe('login')
  })

  it('shows and hides the password', async () => {
    const wrapper = await renderAt('/logowanie')
    const toggle = wrapper.find('.password-field__toggle')

    expect(wrapper.find('#password').attributes('type')).toBe('password')
    await toggle.trigger('click')
    expect(wrapper.find('#password').attributes('type')).toBe('text')
    expect(toggle.text()).toBe('Ukryj')
    await toggle.trigger('click')
    expect(wrapper.find('#password').attributes('type')).toBe('password')
  })

  it('sends the form only once while waiting for the backend', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise(() => {})),
    )
    const wrapper = await renderAt('/logowanie')

    await fillAndSubmit(wrapper)

    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeDefined()
  })

  it('forgets the old message after switching to registration', async () => {
    backend({ '/api/account/login': [401, { detail: ['Nie ma konta z tym adresem.'] }] })
    const wrapper = await renderAt('/logowanie')
    await fillAndSubmit(wrapper)
    await vi.waitFor(() => expect(wrapper.find('[role="alert"]').exists()).toBe(true))

    await router.push('/rejestracja')
    await flushPromises()

    expect(wrapper.find('h1').text()).toBe('Rejestracja')
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })

  it('links to setting a new password with the typed address', async () => {
    const wrapper = await renderAt('/logowanie')

    await wrapper.find('input[type="email"]').setValue('ola@example.com')

    const link = wrapper.findAll('a').find((a) => a.text() === 'Nie pamiętam hasła')!
    expect(link.attributes('href')).toBe('/nie-pamietam-hasla?adres=ola@example.com')
  })

  it('offers adding a password to an account created with Google', async () => {
    const message =
      'To konto logowało się dotąd przez Google. Zaloguj się przez Google albo dodaj hasło.'
    backend({ '/api/account/login': [403, { detail: [message] }] })
    const wrapper = await renderAt('/logowanie')

    await fillAndSubmit(wrapper)

    await vi.waitFor(() => expect(wrapper.find('[role="alert"]').text()).toBe(message))
    const link = wrapper.findAll('a').find((a) => a.text() === 'Dodaj hasło')!
    expect(link.attributes('href')).toBe('/nie-pamietam-hasla?adres=ola@example.com')
  })
})

describe('registration page', () => {
  it('sends a link instead of logging in right away', async () => {
    backend({ '/api/account/register': [202, { email: 'ola@example.com' }] })
    const wrapper = await renderAt('/rejestracja')
    expect(wrapper.text()).toContain('Co najmniej 12 znaków.')

    await fillAndSubmit(wrapper)

    await vi.waitFor(() =>
      expect(wrapper.text()).toContain('Wysłaliśmy link na adres ola@example.com.'),
    )
    expect(wrapper.find('form').exists()).toBe(false)
    expect(router.currentRoute.value.name).toBe('register')
  })

  // Link z maila można otworzyć na telefonie; komputer loguje się wtedy przyciskiem.
  it('logs in after the address was confirmed on another device', async () => {
    backend({
      '/api/account/register': [202, { email: 'ola@example.com' }],
      '/api/account/login': [204],
      '/api/account': [200, { email: 'ola@example.com', has_password: true }],
    })
    const wrapper = await renderAt('/rejestracja')
    await fillAndSubmit(wrapper)
    await vi.waitFor(() => expect(wrapper.text()).toContain('Wysłaliśmy link'))

    const button = wrapper.findAll('button').find((b) => b.text() === 'Adres potwierdzony, zaloguj mnie')!
    await button.trigger('click')

    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('account'))
    expect(fetch).toHaveBeenCalledWith(
      '/api/account/login',
      expect.objectContaining({
        body: JSON.stringify({ email: 'ola@example.com', password: 'dlugie-haslo-123' }),
      }),
    )
  })

  it('says when the address is not confirmed yet', async () => {
    const message = 'Potwierdź adres. Wysłaliśmy link na ten adres.'
    backend({
      '/api/account/register': [202, { email: 'ola@example.com' }],
      '/api/account/login': [401, { detail: [message] }],
    })
    const wrapper = await renderAt('/rejestracja')
    await fillAndSubmit(wrapper)
    await vi.waitFor(() => expect(wrapper.text()).toContain('Wysłaliśmy link'))

    const button = wrapper.findAll('button').find((b) => b.text() === 'Adres potwierdzony, zaloguj mnie')!
    await button.trigger('click')

    await vi.waitFor(() => expect(wrapper.find('[role="alert"]').text()).toBe(message))
    expect(router.currentRoute.value.name).toBe('register')
  })
})

describe('email confirmation page', () => {
  it('creates the account from the link and opens the account page', async () => {
    backend({
      '/api/account/confirm': [204],
      '/api/account': [200, { email: 'ola@example.com', has_password: true }],
    })

    await renderAt('/potwierdz-adres?klucz=abc')

    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('account'))
    expect(fetch).toHaveBeenCalledWith(
      '/api/account/confirm',
      expect.objectContaining({ body: JSON.stringify({ key: 'abc' }) }),
    )
  })

  it('explains an expired link and points to registration', async () => {
    const message = 'Link wygasł albo został już użyty. Zarejestruj się jeszcze raz.'
    backend({ '/api/account/confirm': [400, { detail: [message] }] })

    const wrapper = await renderAt('/potwierdz-adres?klucz=stary')

    await vi.waitFor(() => expect(wrapper.find('[role="alert"]').text()).toBe(message))
    expect(wrapper.find('a[href="/rejestracja"]').exists()).toBe(true)
  })
})

describe('password link page', () => {
  it('sends a link to the address from the login page', async () => {
    backend({ '/api/account/password-link': [204] })
    const wrapper = await renderAt('/nie-pamietam-hasla?adres=ola%40example.com')
    expect((wrapper.find('input[type="email"]').element as HTMLInputElement).value).toBe(
      'ola@example.com',
    )

    await wrapper.find('form').trigger('submit')

    await vi.waitFor(() =>
      expect(wrapper.text()).toContain('Wysłaliśmy link na adres ola@example.com.'),
    )
    expect(fetch).toHaveBeenCalledWith(
      '/api/account/password-link',
      expect.objectContaining({ body: JSON.stringify({ email: 'ola@example.com' }) }),
    )
  })
})

describe('new password page', () => {
  it('sets the password from the link and opens the account page', async () => {
    backend({
      '/api/account/password': [204],
      '/api/account': [200, { email: 'ola@example.com', has_password: true }],
    })
    const wrapper = await renderAt('/nowe-haslo?klucz=abc')

    await wrapper.find('#password').setValue('nowe-dlugie-haslo')
    await wrapper.find('form').trigger('submit')

    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('account'))
    expect(fetch).toHaveBeenCalledWith(
      '/api/account/password',
      expect.objectContaining({
        body: JSON.stringify({ key: 'abc', password: 'nowe-dlugie-haslo' }),
      }),
    )
  })

  it('explains an expired link and points to asking for a new one', async () => {
    const message = 'Link wygasł albo został już użyty. Poproś o nowy.'
    backend({ '/api/account/password': [400, { detail: [message] }] })
    const wrapper = await renderAt('/nowe-haslo?klucz=stary')

    await wrapper.find('#password').setValue('nowe-dlugie-haslo')
    await wrapper.find('form').trigger('submit')

    await vi.waitFor(() => expect(wrapper.find('[role="alert"]').text()).toBe(message))
    expect(wrapper.find('a[href="/nie-pamietam-hasla"]').exists()).toBe(true)
  })
})

describe('account page', () => {
  it('sends a visitor without a session to the login page', async () => {
    backend({ '/api/account': [401, { detail: ['Nie zalogowano.'] }] })

    await renderAt('/konto')

    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('login'))
  })

  it('logs out', async () => {
    backend({
      '/api/account': [200, { email: 'ola@example.com', has_password: true }],
      '/api/account/logout': [204],
    })
    const wrapper = await renderAt('/konto')
    await vi.waitFor(() => expect(wrapper.text()).toContain('Zalogowano jako'))

    await wrapper.find('button').trigger('click')

    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('login'))
    expect(fetch).toHaveBeenCalledWith('/api/account/logout', expect.anything())
  })
})

describe('Google button', () => {
  it('is drawn by the Google script in Polish', async () => {
    await renderAt('/logowanie')

    expect(renderGoogleButton).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      expect.objectContaining({ text: 'continue_with', locale: 'pl' }),
    )
  })

  // W rozmiarze medium Google nie podmienia przycisku na „Kontynuuj jako …” z imieniem.
  it('is always the plain button without the user name', async () => {
    await renderAt('/logowanie')

    expect(renderGoogleButton).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      expect.objectContaining({ size: 'medium' }),
    )
  })

  it.each([
    [343, '343'],
    [600, '400'],
  ])('fills a %i px wide place up to 400 px (width %s)', async (place, width) => {
    const clientWidth = vi.spyOn(Element.prototype, 'clientWidth', 'get').mockReturnValue(place)

    await renderAt('/logowanie')
    clientWidth.mockRestore()

    expect(renderGoogleButton).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      expect.objectContaining({ width }),
    )
  })

  it('logs in with the token from Google', async () => {
    backend({
      '/api/account/google': [204],
      '/api/account': [200, { email: 'ola@gmail.com', has_password: false }],
    })
    const wrapper = await renderAt('/logowanie')

    googleCallback!({ credential: 'dobry-token' })

    await vi.waitFor(() => expect(wrapper.text()).toContain('Zalogowano jako ola@gmail.com'))
    expect(fetch).toHaveBeenCalledWith(
      '/api/account/google',
      expect.objectContaining({ body: JSON.stringify({ credential: 'dobry-token' }) }),
    )
  })

  it('shows why the backend refused the Google account', async () => {
    const refusal = 'Konto z tym adresem już istnieje. Zaloguj się hasłem.'
    backend({ '/api/account/google': [409, { detail: [refusal] }] })
    const wrapper = await renderAt('/rejestracja')

    googleCallback!({ credential: 'dobry-token' })

    await vi.waitFor(() => expect(wrapper.find('[role="alert"]').text()).toBe(refusal))
  })

  it('keeps the email form when the Google script cannot load', async () => {
    vi.stubGlobal('google', undefined)
    const append = vi.spyOn(document.head, 'append').mockImplementation((script) => {
      ;(script as HTMLScriptElement).onerror?.(new Event('error'))
    })

    const wrapper = await renderAt('/logowanie')
    append.mockRestore()

    expect(wrapper.text()).toContain('Nie udało się wczytać logowania przez Google.')
    expect(wrapper.find('form').exists()).toBe(true)
  })
})

describe('terms and privacy', () => {
  it('asks for accepting the terms when registering with an email', async () => {
    backend({ '/api/account/register': [202, { email: 'ola@example.com' }] })
    const wrapper = await renderAt('/rejestracja')
    const consent = wrapper.find('input[type="checkbox"]')
    expect(consent.attributes('required')).toBeDefined()
    expect(wrapper.find('form a[href="/regulamin"]').exists()).toBe(true)
    expect(wrapper.find('form a[href="/polityka-prywatnosci"]').exists()).toBe(true)

    await fillAndSubmit(wrapper)

    expect(fetch).toHaveBeenCalledWith(
      '/api/account/register',
      expect.objectContaining({
        body: JSON.stringify({
          email: 'ola@example.com',
          password: 'dlugie-haslo-123',
          accepted_terms: true,
        }),
      }),
    )
  })

  it('tells that continuing with Google accepts the terms', async () => {
    const wrapper = await renderAt('/logowanie')

    expect(wrapper.text()).toContain('Kontynuując przez Google, akceptujesz regulamin')
  })

  it.each([
    ['/regulamin', 'Regulamin'],
    ['/polityka-prywatnosci', 'Polityka prywatności'],
  ])('shows %s without the access password', async (path, title) => {
    localStorage.removeItem('haslo-dostepu')
    const wrapper = await renderAt(path)
    localStorage.setItem('haslo-dostepu', 'sekret')

    expect(router.currentRoute.value.path).toBe(path)
    expect(wrapper.find('h1').text()).toBe(title)
  })
})
