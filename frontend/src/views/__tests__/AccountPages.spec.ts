import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import App from '@/App.vue'
import router from '@/router'

type Answers = Record<string, [status: number, body?: unknown]>

let wrapper: VueWrapper | undefined

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
  await wrapper.find('form').trigger('submit')
}

describe('login page', () => {
  it('logs in and shows the email on the account page', async () => {
    backend({
      '/api/account/login': [204],
      '/api/account': [200, { email: 'ola@example.com' }],
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
    const toggle = wrapper.find('.login__toggle')

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
})

describe('registration page', () => {
  it('creates an account and opens the account page', async () => {
    backend({
      '/api/account/register': [201, { email: 'ola@example.com' }],
      '/api/account': [200, { email: 'ola@example.com' }],
    })
    const wrapper = await renderAt('/rejestracja')
    expect(wrapper.text()).toContain('Co najmniej 12 znaków.')

    await fillAndSubmit(wrapper)

    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('account'))
    expect(fetch).toHaveBeenCalledWith('/api/account/register', expect.anything())
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
      '/api/account': [200, { email: 'ola@example.com' }],
      '/api/account/logout': [204],
    })
    const wrapper = await renderAt('/konto')
    await vi.waitFor(() => expect(wrapper.text()).toContain('Zalogowano jako'))

    await wrapper.find('button').trigger('click')

    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('login'))
    expect(fetch).toHaveBeenCalledWith('/api/account/logout', expect.anything())
  })
})
