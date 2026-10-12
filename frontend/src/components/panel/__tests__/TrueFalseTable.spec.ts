import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import TrueFalseTable from '../TrueFalseTable.vue'

describe('TrueFalseTable', () => {
  it('puts each statement in its own row with P and F', () => {
    const wrapper = mount(TrueFalseTable, {
      props: {
        choices: [
          { label: '1', text: 'Funkcja $f$ jest malejąca.' },
          { label: '2', text: 'Funkcja $f$ nie ma miejsc zerowych.' },
        ],
      },
    })

    const rows = wrapper.findAll('tr')
    expect(rows).toHaveLength(2)
    expect(rows[0]!.findAll('td').map((cell) => cell.text())).toEqual([
      expect.stringContaining('jest malejąca'),
      'P',
      'F',
    ])
    expect(rows[0]!.find('.katex').exists()).toBe(true)
  })
})
