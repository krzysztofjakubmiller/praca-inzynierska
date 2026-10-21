import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import App from '@/App.vue'
import { setTheme } from '@/theme'

const Page = { template: '<p>strona</p>' }

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/konto', name: 'account', component: Page },
      { path: '/wizytowka', name: 'landing', component: Page },
      { path: '/panel', name: 'panel', component: Page, meta: { panel: true } },
    ],
  })
}

async function open(path: string) {
  const router = makeRouter()
  await router.push(path)
  mount(App, { global: { plugins: [router] } })
  await flushPromises()
}

beforeEach(async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 401 })))
  await setTheme('dark')
})

afterEach(async () => {
  await setTheme('light')
  vi.unstubAllGlobals()
  localStorage.clear()
})

describe('App theme', () => {
  it('darkens the app pages', async () => {
    await open('/konto')

    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(document.documentElement.dataset.shade).toBe('grey')
  })

  it.each(['/wizytowka', '/panel'])('keeps %s light', async (path) => {
    await open(path)

    expect(document.documentElement.dataset.theme).toBeUndefined()
  })
})
