import { describe, it, expect } from 'vitest'

import { mount } from '@vue/test-utils'
import App from '../App.vue'
import { PRODUCT_NAME } from '@/config/product'

describe('App', () => {
  it('shows the product name', () => {
    const wrapper = mount(App)
    expect(wrapper.text()).toContain(PRODUCT_NAME)
  })
})
