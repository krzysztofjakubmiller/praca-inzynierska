<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue'
import type { Exam } from '@/config/exams'
import type { SolidFrame, SolidScene } from '@/solids/scene'
import { edgePhase, stairPhase } from '@/solids/wheel'

const props = defineProps<{
  exams: readonly Exam[]
  /** Pozycja przewijania w stacjach: 0.5 oznacza środek pierwszej stacji na środku ekranu. */
  readStations: () => number
  /** Wspólne miejsce wszystkich brył na szerokim ekranie; na telefonie ukryte. */
  getStage: () => HTMLElement | null
  /** Na telefonie osobne miejsce dla każdego egzaminu; na szerokim ekranie ukryte. */
  getSlots: () => HTMLElement[]
}>()

const emit = defineEmits<{ unavailable: [] }>()

// Czas wjazdu pierwszej bryły po otwarciu strony.
const INTRO_MS = 1100
// Opóźnienie, z jakim bryły doganiają przewijanie; wygładza skoki kółka myszy.
const FOLLOW_MS = 90

const canvas = useTemplateRef<HTMLCanvasElement>('canvas')
const unavailable = ref(false)
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

let scene: SolidScene | undefined
let resizeObserver: ResizeObserver | undefined
let alive = true
let frame = 0
let lastTime = 0
let introStart = 0
const shownPhases: number[] = []

function targets(): SolidFrame[] {
  const still = reducedMotion.matches
  const stage = props.getStage()?.getBoundingClientRect()
  if (stage && stage.width > 0) {
    // Szeroki ekran: wszystkie bryły na jednym kole, obracanym przez przewijanie.
    const wheel = stairPhase(props.readStations() - 0.5, props.exams.length)
    const turn = still ? Math.round(wheel) : wheel
    return props.exams.map((_, index) => ({ place: stage, phase: index - turn }))
  }
  // Telefon: każda bryła jedzie ze swoim miejscem i przechodzi swój fragment koła.
  const middle = window.innerHeight / 2
  return props.getSlots().map((slot) => {
    const place = slot.getBoundingClientRect()
    const screenPosition = (place.top + place.height / 2 - middle) / middle
    return { place, phase: still ? 0 : edgePhase(screenPosition) }
  })
}

function easeOut(progress: number): number {
  return 1 - (1 - progress) ** 3
}

function render(time: number) {
  frame = 0
  if (!scene) return
  const still = reducedMotion.matches
  const elapsed = lastTime ? time - lastTime : 16
  lastTime = time
  const follow = still ? 1 : 1 - Math.exp(-elapsed / FOLLOW_MS)
  const intro = still ? 0 : 1 - easeOut(Math.min(1, (time - introStart) / INTRO_MS))
  let moving = intro > 0
  const frames = targets().map((target, index) => {
    const shown = shownPhases[index] ?? target.phase
    const phase = shown + (target.phase - shown) * follow
    shownPhases[index] = phase
    if (Math.abs(target.phase - phase) > 0.0005) moving = true
    return { place: target.place, phase: phase + intro }
  })
  scene.draw(frames)
  if (moving) requestRender()
  else lastTime = 0
}

function requestRender() {
  if (!frame) frame = requestAnimationFrame(render)
}

function resize() {
  if (!scene || !canvas.value) return
  scene.resize(canvas.value.clientWidth, canvas.value.clientHeight)
  requestRender()
}

onMounted(async () => {
  // three.js ładujemy dopiero tutaj, żeby tekst strony na niego nie czekał.
  const { createSolidScene } = await import('@/solids/scene')
  if (!alive || !canvas.value) return
  const style = getComputedStyle(canvas.value)
  const specs = props.exams.map((exam) => ({
    kind: exam.solid,
    color: style.getPropertyValue(`--exam-${exam.id}`).trim(),
  }))
  try {
    scene = createSolidScene(canvas.value, specs, style.getPropertyValue('--ground').trim())
  } catch {
    // Bez WebGL strona działa dalej, cała treść jest w tekście.
    unavailable.value = true
    emit('unavailable')
    return
  }
  introStart = performance.now()
  resize()
  resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(canvas.value)
  window.addEventListener('scroll', requestRender, { passive: true })
  // Doładowany krój zmienia wysokość tekstu, a z nią miejsca brył.
  document.fonts.ready.then(requestRender)
})

onBeforeUnmount(() => {
  alive = false
  window.removeEventListener('scroll', requestRender)
  resizeObserver?.disconnect()
  if (frame) cancelAnimationFrame(frame)
  scene?.dispose()
  scene = undefined
})
</script>

<template>
  <canvas ref="canvas" class="solids" :hidden="unavailable" aria-hidden="true" />
</template>

<style scoped>
/* Jedno płótno na cały ekran: pod tekstem, nad ścianami stacji. */
.solids {
  position: fixed;
  top: 0;
  left: 0;
  z-index: -1;
  width: 100%;
  height: 100lvh;
  pointer-events: none;
}
</style>
