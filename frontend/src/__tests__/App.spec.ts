import { beforeAll, describe, it, expect, vi } from 'vitest'

import { mount, flushPromises } from '@vue/test-utils'
import App from '../App.vue'
import router from '@/router'
import { PRODUCT_NAME } from '@/config/product'

beforeAll(() => {
  localStorage.setItem('haslo-dostepu', 'sekret')
  // jsdom nie obsługuje przewijania, a router przewija po każdej zmianie strony.
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  // jsdom nie ma też obserwatorów rozmiaru i widoczności ani zapytań o media, z których
  // korzystają strona mapy i bilety na wizytówce.
  const observer = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  vi.stubGlobal('ResizeObserver', observer)
  vi.stubGlobal('IntersectionObserver', observer)
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  }))
})

async function renderAt(path: string) {
  await router.push(path)
  // jsdom nie ma WebGL ani pomiaru tekstu, więc płótno z bryłami i mapę zastępujemy atrapami.
  const wrapper = mount(App, {
    global: { plugins: [router], stubs: { SolidCanvas: true, MetroMap: true } },
  })
  await flushPromises()
  return wrapper
}

describe('App', () => {
  it('shows links to all pages at /', async () => {
    const wrapper = await renderAt('/')
    expect(wrapper.find('h1').text()).toBe('Strony')
    expect(wrapper.findAll('a').map((link) => link.text())).toContain('Panel właściciela')
    expect(document.title).toBe(`Strony · ${PRODUCT_NAME}`)
  })

  // Wizytówka 3.5 ma płótna i animacje, których jsdom nie wyrysuje, więc sprawdzamy sam adres.
  it('shows the chosen landing page at /wizytowka', async () => {
    type Loader = () => Promise<{ default: unknown }>
    const page = async (path: string) =>
      (await (router.resolve(path).matched[0]!.components!.default as Loader)()).default
    expect(await page('/wizytowka')).toBe(await page('/wizytowka3/a35'))
  }, 20000)

  it('shows a retry instead of an empty page when a page file does not load', async () => {
    router.addRoute({
      path: '/bez-serwera',
      component: () => Promise.reject(new TypeError('Failed to fetch dynamically imported module')),
    })
    const wrapper = mount(App, { global: { plugins: [router] } })
    await router.push('/bez-serwera').catch(() => {})
    await flushPromises()

    expect(wrapper.text()).toContain('Serwer nie odpowiada')
    expect(wrapper.find('button').text()).toBe('Spróbuj ponownie')
    wrapper.unmount()
  })

  it('shows the coming soon page at /wkrotce', async () => {
    const wrapper = await renderAt('/wkrotce')
    expect(wrapper.find('h1').text()).toBe('Wkrótce')
    expect(document.title).toBe(`Wkrótce · ${PRODUCT_NAME}`)
  })

  it('shows the basic matura page at /matura-podstawowa', async () => {
    const wrapper = await renderAt('/matura-podstawowa')
    expect(wrapper.find('h1').text()).toBe('Matura podstawowa')
    expect(document.title).toBe(`Matura podstawowa · ${PRODUCT_NAME}`)
  })

  it('asks for the password before showing any page', async () => {
    localStorage.removeItem('haslo-dostepu')
    const wrapper = await renderAt('/wkrotce')
    localStorage.setItem('haslo-dostepu', 'sekret')

    expect(wrapper.find('h2').text()).toBe('Wpisz hasło dostępu')
    expect(wrapper.find('input[type="password"]').exists()).toBe(true)
    expect(router.currentRoute.value.query.dalej).toBe('/wkrotce')
  })

  it('shows the exam symbol as the tab icon on an exam page', async () => {
    document.head.innerHTML = '<link rel="icon" href="/favicon.svg">'
    const icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]')!

    await renderAt('/matura-rozszerzona')
    expect(icon.getAttribute('href')).toBe('/favicon-matura-rozszerzona.svg')

    await renderAt('/wkrotce')
    expect(icon.getAttribute('href')).toBe('/favicon.svg')
  })

  it('asks for the panel password before showing the panel', async () => {
    const wrapper = await renderAt('/panel')

    expect(wrapper.find('h1').text()).toBe('Panel właściciela')
    expect(router.currentRoute.value.name).toBe('panel-access')
    expect(router.currentRoute.value.query.dalej).toBe('/panel')
  })

  it('shows the not found page for an unknown path', async () => {
    const wrapper = await renderAt('/nie-istnieje')
    expect(wrapper.find('h1').text()).toBe('Nie ma takiej strony')
    expect(document.title).toBe(`Nie ma takiej strony · ${PRODUCT_NAME}`)
  })
})
