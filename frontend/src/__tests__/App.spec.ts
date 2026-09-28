import { describe, it, expect } from 'vitest'

import { mount, flushPromises } from '@vue/test-utils'
import App from '../App.vue'
import router from '@/router'
import { PRODUCT_NAME } from '@/config/product'

async function renderAt(path: string) {
  await router.push(path)
  const wrapper = mount(App, { global: { plugins: [router] } })
  await flushPromises()
  return wrapper
}

describe('App', () => {
  it('shows the home page at /', async () => {
    const wrapper = await renderAt('/')
    expect(wrapper.find('h1').text()).toBe(PRODUCT_NAME)
    expect(document.title).toBe(PRODUCT_NAME)
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
