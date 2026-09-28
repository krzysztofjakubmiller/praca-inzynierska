<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue'
import type { Exam } from '@/config/exams'
import type { SolidStage } from '@/solids/stage'

const props = defineProps<{ exam: Exam }>()

const host = useTemplateRef<HTMLElement>('host')
const canvas = useTemplateRef<HTMLCanvasElement>('canvas')
const unavailable = ref(false)

let stage: SolidStage | undefined
let resizeObserver: ResizeObserver | undefined
let alive = true

function cssValue(name: string): string {
  return getComputedStyle(host.value!).getPropertyValue(name).trim()
}

function showExam(exam: Exam) {
  stage?.show(exam.solid, cssValue(`--exam-${exam.id}`))
}

onMounted(async () => {
  // three.js is loaded only here, so the text of the page does not wait for it.
  const { createSolidStage } = await import('@/solids/stage')
  if (!alive || !host.value || !canvas.value) return
  try {
    stage = createSolidStage(canvas.value, cssValue('--ground'))
  } catch {
    // No WebGL: the page still works, the text carries all of the content.
    unavailable.value = true
    return
  }
  stage.resize(host.value.clientWidth, host.value.clientHeight)
  showExam(props.exam)
  resizeObserver = new ResizeObserver(([entry]) => {
    if (entry) stage?.resize(entry.contentRect.width, entry.contentRect.height)
  })
  resizeObserver.observe(host.value)
})

watch(() => props.exam, showExam)

onBeforeUnmount(() => {
  alive = false
  resizeObserver?.disconnect()
  stage?.dispose()
  stage = undefined
})
</script>

<template>
  <div ref="host" class="stage" :hidden="unavailable">
    <canvas ref="canvas" class="stage__canvas" aria-hidden="true" />
  </div>
</template>

<style scoped>
.stage {
  position: relative;
  overflow: hidden;
  background: var(--ground);
}

/* Tiled station wall, fading out towards the edges of the stage. */
.stage::before {
  --tile: clamp(1.75rem, 1.2rem + 1.6vw, 2.75rem);
  content: '';
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(to right, rgb(29 31 34 / 0.07) 1px, transparent 1px),
    linear-gradient(to bottom, rgb(29 31 34 / 0.07) 1px, transparent 1px);
  background-position: center;
  background-size: var(--tile) var(--tile);
  mask-image: radial-gradient(closest-side, #000 30%, transparent 100%);
}

.stage__canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
</style>
