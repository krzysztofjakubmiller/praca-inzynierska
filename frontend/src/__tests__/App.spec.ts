import { beforeAll, describe, it, expect, vi } from 'vitest'

import { mount, flushPromises } from '@vue/test-utils'
import App from '../App.vue'
import router from '@/router'
import { EXAMS } from '@/config/exams'
import { PRODUCT_NAME } from '@/config/product'

beforeAll(() => {
  // jsdom nie obsługuje przewijania, a router przewija po każdej zmianie strony.
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
})

async function renderAt(path: string) {
  await router.push(path)
  // jsdom nie ma WebGL, więc płótno z bryłami zastępujemy atrapą.
  const wrapper = mount(App, { global: { plugins: [router], stubs: { SolidCanvas: true } } })
  await flushPromises()
  return wrapper
}

describe('App', () => {
  it('shows the landing page at /', async () => {
    const wrapper = await renderAt('/')
    expect(wrapper.find('h1').text()).toBe(PRODUCT_NAME)
    expect(wrapper.findAll('h2').map((heading) => heading.text())).toEqual([
      ...EXAMS.map((exam) => exam.name),
      'Bilety',
      'Jak to działa',
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

  it('shows the not found page for an unknown path', async () => {
    const wrapper = await renderAt('/nie-istnieje')
    expect(wrapper.find('h1').text()).toBe('Nie ma takiej strony')
    expect(document.title).toBe(`Nie ma takiej strony · ${PRODUCT_NAME}`)
  })
})
