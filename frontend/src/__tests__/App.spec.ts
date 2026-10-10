import { beforeAll, describe, it, expect, vi } from 'vitest'

import { mount, flushPromises } from '@vue/test-utils'
import App from '../App.vue'
import router from '@/router'
import { EXAMS } from '@/config/exams'
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

  it('shows the landing page at /wizytowka', async () => {
    const wrapper = await renderAt('/wizytowka')
    expect(wrapper.find('h1').text()).toBe(PRODUCT_NAME)
    expect(wrapper.findAll('h2').map((heading) => heading.text())).toEqual([
      ...EXAMS.map((exam) => exam.name),
      'Jak to działa',
      'Bilety',
    ])
    expect(wrapper.findAll('.ticket')).toHaveLength(EXAMS.length)
    expect(document.title).toBe(PRODUCT_NAME)
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

    expect(wrapper.find('h1').text()).toBe('Wejście')
    expect(router.currentRoute.value.query.dalej).toBe('/wkrotce')
  })

  it('shows the not found page for an unknown path', async () => {
    const wrapper = await renderAt('/nie-istnieje')
    expect(wrapper.find('h1').text()).toBe('Nie ma takiej strony')
    expect(document.title).toBe(`Nie ma takiej strony · ${PRODUCT_NAME}`)
  })
})
