import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import MathText from '../MathText.vue'

describe('MathText', () => {
  it('renders formulas with KaTeX', () => {
    const wrapper = mount(MathText, { props: { text: 'Oblicz $\\frac{1}{2}$' } })

    expect(wrapper.text()).toContain('Oblicz')
    expect(wrapper.find('.katex').exists()).toBe(true)
  })

  it('shows HTML in plain text as text', () => {
    const wrapper = mount(MathText, { props: { text: '<b>uwaga</b>' } })

    expect(wrapper.find('b').exists()).toBe(false)
    expect(wrapper.text()).toBe('<b>uwaga</b>')
  })

  it('marks broken LaTeX instead of failing', () => {
    const wrapper = mount(MathText, { props: { text: '$\\frac{1}$' } })

    expect(wrapper.find('.katex-error').exists()).toBe(true)
  })
})
