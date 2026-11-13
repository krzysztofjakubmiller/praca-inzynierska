import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import TaskWhiteboard from '../TaskWhiteboard.vue'

// jsdom nie ma ResizeObserver, a tablica dopasowuje nim płótno do rozmiaru.
class NoResize {
  observe() {}
  disconnect() {}
}

afterEach(() => vi.unstubAllGlobals())

function render() {
  vi.stubGlobal('ResizeObserver', NoResize)
  return mount(TaskWhiteboard, { slots: { task: 'Rozwiąż $x^2 = 4$.' } })
}

describe('TaskWhiteboard', () => {
  it('stays closed on the page so the page scrolls, and opens as a separate view', () => {
    const board = render()

    expect(board.find('.whiteboard__open').text()).toContain('Tablica')
    expect(board.find('dialog').attributes('open')).toBeUndefined()
  })

  it('keeps a separate size for the pen and the eraser', async () => {
    const board = render()
    const button = (label: string) => board.find(`button[aria-label="${label}"]`)

    await button('Gruba linia').trigger('click')
    await button('Gumka').trigger('click')
    expect(button('Gumka').attributes('aria-pressed')).toBe('true')
    expect(board.find('canvas').classes()).toContain('whiteboard__canvas--eraser')
    expect(button('Średnia gumka').attributes('aria-pressed')).toBe('true')
    await button('Pisak').trigger('click')

    expect(button('Gruba linia').attributes('aria-pressed')).toBe('true')
  })

  it('hides eraser sizes when the eraser removes whole strokes', async () => {
    const board = render()
    const button = (label: string) => board.find(`button[aria-label="${label}"]`)

    await button('Gumka').trigger('click')
    await button('Usuwa całą kreskę').trigger('click')

    expect(button('Mała gumka').exists()).toBe(false)
  })

  it('redoes what undo took back', async () => {
    const board = render()
    const button = (label: string) => board.find(`button[aria-label="${label}"]`)
    const canvas = board.find('canvas')
    canvas.element.getBoundingClientRect = () => new DOMRect(0, 0, 100, 100)
    canvas.element.setPointerCapture = () => {}
    const version = () => (board.vm as unknown as { version: () => number | null }).version()

    await canvas.trigger('pointerdown')
    await canvas.trigger('pointerup')
    await button('Cofnij').trigger('click')
    expect(version()).toBeNull()

    await button('Ponów').trigger('click')
    expect(version()).not.toBeNull()
  })

  it('shows the chat bubble only when asked and passes the click on', async () => {
    expect(render().find('button[aria-label="Zapytaj Dyżurnego"]').exists()).toBe(false)
    vi.stubGlobal('ResizeObserver', NoResize)
    const board = mount(TaskWhiteboard, { props: { chat: true } })

    await board.find('button[aria-label="Zapytaj Dyżurnego"]').trigger('click')
    expect(board.emitted('ask')).toHaveLength(1)
  })

  it('brings back a cleared board with undo', async () => {
    const board = render()
    const button = (label: string) => board.find(`button[aria-label="${label}"]`)
    const canvas = board.find('canvas')
    canvas.element.getBoundingClientRect = () => new DOMRect(0, 0, 100, 100)
    canvas.element.setPointerCapture = () => {}
    const version = () => (board.vm as unknown as { version: () => number | null }).version()

    await canvas.trigger('pointerdown')
    await canvas.trigger('pointerup')
    await button('Wyczyść').trigger('click')
    expect(version()).toBeNull()

    await button('Cofnij').trigger('click')
    expect(version()).not.toBeNull()
  })

  it('shows the task inside the board view', async () => {
    const board = render()

    await board.find('button[aria-label="Treść zadania"]').trigger('click')
    expect(board.find('.whiteboard__task').text()).toContain('Rozwiąż')
  })
})
