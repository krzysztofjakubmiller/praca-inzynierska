import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import AccountSecurity from '@/components/account/AccountSecurity.vue'
import router from '@/router'

let wrapper: VueWrapper | undefined

function answer(status: number, body?: unknown) {
  const text = body === undefined ? null : JSON.stringify(body)
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(text, { status })))
}

function render(hasPassword: boolean) {
  wrapper = mount(AccountSecurity, {
    props: { hasPassword },
    global: { plugins: [router] },
  })
  return wrapper
}

beforeAll(() => {
  localStorage.setItem('haslo-dostepu', 'sekret')
  // jsdom nie obsługuje przewijania, a router przewija po każdej zmianie strony.
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
})

afterEach(() => {
  wrapper?.unmount()
  vi.unstubAllGlobals()
})

describe('AccountSecurity', () => {
  it('changes the password with the current one', async () => {
    answer(204)
    const wrapper = render(true)
    expect(wrapper.find('h3').text()).toBe('Zmień hasło')

    await wrapper.find('#current-password').setValue('stare-dlugie-haslo')
    await wrapper.find('#new-password').setValue('nowe-dlugie-haslo')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(fetch).toHaveBeenCalledWith(
      '/api/account/change-password',
      expect.objectContaining({
        body: JSON.stringify({
          current_password: 'stare-dlugie-haslo',
          new_password: 'nowe-dlugie-haslo',
        }),
      }),
    )
    expect(wrapper.find('[role="status"]').text()).toBe('Hasło zapisane.')
  })

  it('adds a password to an account created with Google without asking for a current one', async () => {
    answer(204)
    const wrapper = render(false)
    expect(wrapper.find('h3').text()).toBe('Dodaj hasło')
    expect(wrapper.find('#current-password').exists()).toBe(false)

    await wrapper.find('#new-password').setValue('nowe-dlugie-haslo')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(fetch).toHaveBeenCalledWith(
      '/api/account/change-password',
      expect.objectContaining({
        body: JSON.stringify({ current_password: null, new_password: 'nowe-dlugie-haslo' }),
      }),
    )
    expect(wrapper.find('h3').text()).toBe('Zmień hasło')
  })

  it('shows why the password was not changed', async () => {
    answer(401, { detail: ['Złe hasło.'] })
    const wrapper = render(true)

    await wrapper.find('#current-password').setValue('nie-to-haslo-wcale')
    await wrapper.find('#new-password').setValue('nowe-dlugie-haslo')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.find('[role="alert"]').text()).toBe('Złe hasło.')
  })

  it('logs out everywhere and goes to the login page', async () => {
    answer(204)
    await router.push('/konto')
    const wrapper = render(true)

    const button = wrapper.findAll('button').find((b) => b.text() === 'Wyloguj ze wszystkich urządzeń')!
    await button.trigger('click')
    await flushPromises()

    expect(fetch).toHaveBeenCalledWith(
      '/api/account/logout-everywhere',
      expect.objectContaining({ method: 'POST' }),
    )
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('login'))
  })
})
