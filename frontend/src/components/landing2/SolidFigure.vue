<script setup lang="ts">
import { onBeforeUnmount, onMounted, useTemplateRef } from 'vue'
import type { SolidKind } from '@/config/exams'
import { drawSolid, solidModel } from '@/landing2/solids2d'
import { onTick } from '@/landing2/ticker'

const props = withDefaults(
  defineProps<{
    kind: SolidKind
    /** Obrót własny w radianach na sekundę. */
    spin?: number
    /** Jaką część krótszego boku miejsca zajmuje bryła. */
    fill?: number
    /** Grubość linii jako część rozmiaru bryły. */
    weight?: number
    /** Stacje w wierzchołkach, w kolorze --solid-dot. */
    dots?: boolean
    /** Bryłę można obrócić palcem albo myszą. */
    drag?: boolean
  }>(),
  { spin: 0.3, fill: 0.66, weight: 0.019, dots: false, drag: true },
)

// Obrót od przewijania: tyle radianów na piksel.
const SCROLL_TURN = 0.0028
// Czas rysowania się krawędzi po pierwszym pojawieniu na ekranie.
const DRAW_SECONDS = 1.3
// Po puszczeniu bryła zwalnia do własnego obrotu; im mniej, tym dłużej się kręci.
const FRICTION = 2.2

const canvas = useTemplateRef<HTMLCanvasElement>('canvas')
const model = solidModel(props.kind)
const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches

let ctx: CanvasRenderingContext2D | null = null
let width = 0
let height = 0
let ratio = 1
let yaw = 0
let pitch = 0
let pushYaw = 0
let pushPitch = 0
let drawn = still ? 1 : 0
let color = ''
let backAlpha = 0.4
let dot: string | undefined
let framesToStyle = 0
let held = false
let lastX = 0
let lastY = 0
let stopTick: (() => void) | undefined
let resizeObserver: ResizeObserver | undefined
let viewObserver: IntersectionObserver | undefined

// Odczyt stylu wymusza przeliczenie strony, więc kolory bierzemy raz na kilkadziesiąt klatek,
// a nie przy każdym rysowaniu. To wystarcza, żeby bryła nadążyła za zmianą koloru egzaminu.
function readStyle() {
  if (!canvas.value) return
  const style = getComputedStyle(canvas.value)
  color = style.color
  backAlpha = Number(style.getPropertyValue('--solid-back')) || 0.4
  dot = props.dots ? style.getPropertyValue('--solid-dot').trim() || undefined : undefined
  framesToStyle = 40
}

function draw() {
  if (!ctx || !canvas.value || !width) return
  if (framesToStyle-- <= 0) readStyle()
  const size = props.fill * Math.min(width, height)
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
  ctx.clearRect(0, 0, width, height)
  drawSolid(ctx, model, {
    cx: width / 2,
    cy: height / 2,
    radius: size / 2,
    yaw,
    pitch,
    drawn,
    lineWidth: Math.min(10, Math.max(2.25, size * props.weight)),
    color,
    backAlpha,
    dot,
  })
}

function tick(seconds: number, scrolled: number) {
  if (!held) {
    yaw += (props.spin + pushYaw) * seconds + scrolled * SCROLL_TURN
    pitch += pushPitch * seconds
    const slow = Math.exp(-FRICTION * seconds)
    pushYaw *= slow
    pushPitch *= slow
    // Pochylenie wraca do pozy spoczynkowej, żeby bryła nie została do góry nogami.
    pitch *= Math.exp(-0.9 * seconds)
  }
  if (drawn < 1) drawn = Math.min(1, drawn + seconds / DRAW_SECONDS)
  draw()
}

function resize() {
  if (!canvas.value) return
  width = canvas.value.clientWidth
  height = canvas.value.clientHeight
  ratio = Math.min(window.devicePixelRatio, 2)
  canvas.value.width = Math.round(width * ratio)
  canvas.value.height = Math.round(height * ratio)
  draw()
}

function grab(event: PointerEvent) {
  if (!props.drag || !canvas.value) return
  held = true
  lastX = event.clientX
  lastY = event.clientY
  pushYaw = 0
  pushPitch = 0
  canvas.value.setPointerCapture(event.pointerId)
}

function move(event: PointerEvent) {
  if (!held) return
  const dx = event.clientX - lastX
  const dy = event.clientY - lastY
  lastX = event.clientX
  lastY = event.clientY
  yaw += dx * 0.012
  pitch = Math.max(-1.1, Math.min(1.1, pitch + dy * 0.012))
  // Prędkość ostatniego ruchu zostaje jako rozpęd po puszczeniu.
  pushYaw = dx * 0.7
  pushPitch = dy * 0.35
  if (still) draw()
}

function release() {
  held = false
}

onMounted(() => {
  if (!canvas.value) return
  ctx = canvas.value.getContext('2d')
  resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(canvas.value)
  if (still) return
  viewObserver = new IntersectionObserver(([entry]) => {
    if (entry?.isIntersecting) stopTick ??= onTick(tick)
    else {
      stopTick?.()
      stopTick = undefined
    }
  })
  viewObserver.observe(canvas.value)
})

onBeforeUnmount(() => {
  stopTick?.()
  resizeObserver?.disconnect()
  viewObserver?.disconnect()
})
</script>

<template>
  <canvas
    ref="canvas"
    class="solid"
    :class="{ 'solid--drag': drag }"
    aria-hidden="true"
    @pointerdown="grab"
    @pointermove="move"
    @pointerup="release"
    @pointercancel="release"
  />
</template>

<style scoped>
.solid {
  width: 100%;
  height: 100%;
}

/* Pionowe przesunięcie palcem dalej przewija stronę, poziome obraca bryłę. */
.solid--drag {
  cursor: grab;
  touch-action: pan-y;
}

.solid--drag:active {
  cursor: grabbing;
}
</style>
