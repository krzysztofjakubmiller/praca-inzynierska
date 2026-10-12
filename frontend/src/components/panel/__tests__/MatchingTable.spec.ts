import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import MatchingTable from '../MatchingTable.vue'

const choices = [
  { label: '1', text: '$(-6, -4)$' },
  { label: 'A', text: 'są prostopadłe' },
  { label: '2', text: '$(6, 4)$' },
  { label: 'B', text: 'nie są prostopadłe' },
  { label: '3', text: '$(-6, 4)$' },
]

describe('MatchingTable', () => {
  it('puts letters on the left, the connector in the middle and digits on the right', () => {
    const wrapper = mount(MatchingTable, {
      props: { choices, connector: 'i przecinają się w punkcie $P$' },
    })

    const [letters, connector, digits] = wrapper.find('.matching').element.children
    expect(letters!.textContent).toContain('A.są prostopadłe')
    expect(letters!.querySelectorAll('.matching__row')).toHaveLength(2)
    expect(connector!.textContent).toContain('i przecinają się w punkcie')
    expect(connector!.querySelector('.katex')).not.toBeNull()
    expect(digits!.querySelectorAll('.matching__row')).toHaveLength(3)
  })
})
