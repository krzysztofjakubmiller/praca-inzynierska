<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue'
import { theme } from '@/theme'
import {
  THICK,
  THIN,
  drawStroke,
  drawStrokes,
  lineWidth,
  type Stroke,
  type Tool,
} from '@/whiteboard'

// Tablica do pisania rozwiązania palcem, rysikiem albo myszą. Nic nie zapisuje; image() daje
// obraz tablicy, który później pójdzie do oceny przez AI przy zadaniach otwartych.

const canvas = useTemplateRef<HTMLCanvasElement>('canvas')
const tool = ref<Tool>('pen')
const thick = ref(false)

// Zwykła tablica, nie ref: kreski zmieniają się przy każdym ruchu palca, a Vue nie musi
// o tym wiedzieć, bo płótno rysuje się samo.
let strokes: Stroke[] = []
let current: Stroke | null = null
let observer: ResizeObserver | undefined

function inkColor(): string {
  return canvas.value ? getComputedStyle(canvas.value).getPropertyValue('--ink').trim() : '#000'
}

// Płótno ma tyle pikseli, ile ekran, a rysujemy w pikselach CSS, więc linie są ostre na
// ekranach o dużej gęstości. Zmiana rozmiaru czyści płótno, dlatego kreski rysują się od nowa.
function redraw() {
  const element = canvas.value
  const context = element?.getContext('2d')
  if (!element || !context) return
  const ratio = window.devicePixelRatio || 1
  element.width = Math.round(element.clientWidth * ratio)
  element.height = Math.round(element.clientHeight * ratio)
  context.setTransform(ratio, 0, 0, ratio, 0, 0)
  drawStrokes(context, strokes, inkColor())
}

function pointOf(event: PointerEvent) {
  const box = canvas.value!.getBoundingClientRect()
  return {
    x: event.clientX - box.left,
    y: event.clientY - box.top,
    width: lineWidth(thick.value ? THICK : THIN, tool.value, event.pointerType, event.pressure),
  }
}

function start(event: PointerEvent) {
  if (event.pointerType === 'mouse' && event.button !== 0) return
  canvas.value?.setPointerCapture(event.pointerId)
  current = { tool: tool.value, points: [pointOf(event)] }
  strokes.push(current)
  const context = canvas.value?.getContext('2d')
  if (context) drawStroke(context, current, inkColor())
}

// Przeglądarka łączy szybkie ruchy w jedno zdarzenie; getCoalescedEvents oddaje wszystkie
// punkty pośrednie, żeby szybko pisana linia nie była kanciasta.
function move(event: PointerEvent) {
  if (!current) return
  const context = canvas.value?.getContext('2d')
  const events = event.getCoalescedEvents?.() ?? []
  for (const step of events.length ? events : [event]) {
    const previous = current.points[current.points.length - 1]!
    const point = pointOf(step)
    current.points.push(point)
    if (context) drawStroke(context, { tool: current.tool, points: [previous, point] }, inkColor())
  }
}

function end() {
  current = null
}

function clear() {
  strokes = []
  redraw()
}

/** Obraz tablicy jako PNG: czarne kreski na białym tle, niezależnie od motywu. */
function image(): Promise<Blob | null> {
  const element = canvas.value
  if (!element) return Promise.resolve(null)
  const width = element.clientWidth
  const height = element.clientHeight
  // Gumka wycina piksele, więc kreski idą najpierw na przezroczystą warstwę, a dopiero ona
  // na białe tło; inaczej starte miejsca byłyby dziurami w tle.
  const ink = document.createElement('canvas')
  ink.width = width
  ink.height = height
  const inkContext = ink.getContext('2d')
  const result = document.createElement('canvas')
  result.width = width
  result.height = height
  const resultContext = result.getContext('2d')
  if (!inkContext || !resultContext) return Promise.resolve(null)
  drawStrokes(inkContext, strokes, '#000')
  resultContext.fillStyle = '#fff'
  resultContext.fillRect(0, 0, width, height)
  resultContext.drawImage(ink, 0, 0)
  return new Promise((resolve) => result.toBlob(resolve, 'image/png'))
}

defineExpose({ image })

onMounted(() => {
  observer = new ResizeObserver(redraw)
  if (canvas.value) observer.observe(canvas.value)
})
onBeforeUnmount(() => observer?.disconnect())

// Kolor pisaka bierze się z motywu, więc po jego zmianie kreski rysują się nowym kolorem.
watch(theme, () => nextTick(redraw))
</script>

<template>
  <details class="whiteboard" @toggle="redraw">
    <summary class="whiteboard__summary">Tablica</summary>
    <div class="whiteboard__tools" role="toolbar" aria-label="Narzędzia tablicy">
      <div class="whiteboard__switch" role="group" aria-label="Narzędzie">
        <button type="button" :aria-pressed="tool === 'pen'" @click="tool = 'pen'">Pisak</button>
        <button type="button" :aria-pressed="tool === 'eraser'" @click="tool = 'eraser'">
          Gumka
        </button>
      </div>
      <div class="whiteboard__switch" role="group" aria-label="Grubość linii">
        <button type="button" :aria-pressed="!thick" @click="thick = false">Cienka</button>
        <button type="button" :aria-pressed="thick" @click="thick = true">Gruba</button>
      </div>
      <button type="button" class="whiteboard__clear" @click="clear">Wyczyść</button>
    </div>
    <canvas
      ref="canvas"
      class="whiteboard__canvas"
      :class="{ 'whiteboard__canvas--eraser': tool === 'eraser' }"
      aria-label="Tablica do pisania rozwiązania"
      @pointerdown="start"
      @pointermove="move"
      @pointerup="end"
      @pointercancel="end"
    />
  </details>
</template>

<style scoped>
.whiteboard {
  border: 1px solid var(--hairline);
  border-radius: 1rem;
  background: var(--surface);
}

.whiteboard__summary {
  display: flex;
  align-items: center;
  min-height: 2.75rem;
  padding: 0 1rem;
  font-weight: 700;
  cursor: pointer;
}

.whiteboard__tools {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding: 0 0.75rem 0.75rem;
}

/* Jak przełącznik „Mapa | Lista” na stronie egzaminu. */
.whiteboard__switch {
  display: inline-flex;
  gap: 0.25rem;
  padding: 0.25rem;
  border: 1.5px solid var(--hairline);
  border-radius: 999px;
}

.whiteboard__switch button,
.whiteboard__clear {
  min-height: 2.25rem;
  padding: 0 0.9rem;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--ink);
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}

.whiteboard__switch button[aria-pressed='true'] {
  background: var(--ink);
  color: var(--ground);
}

.whiteboard__clear {
  min-height: 2.75rem;
  border: 1.5px solid var(--hairline);
}

.whiteboard__clear:hover {
  border-color: var(--ink);
}

/* touch-action: none, bo inaczej przeciągnięcie palcem przewijałoby stronę zamiast pisać. */
.whiteboard__canvas {
  display: block;
  width: 100%;
  height: min(60svh, 32rem);
  border-top: 1px solid var(--hairline);
  border-radius: 0 0 1rem 1rem;
  touch-action: none;
  cursor: crosshair;
}

.whiteboard__canvas--eraser {
  cursor: cell;
}
</style>
