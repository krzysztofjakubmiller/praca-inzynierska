<script setup lang="ts">
import { computed, onBeforeUnmount, ref, useTemplateRef } from 'vue'
import type { SolidKind } from '@/config/exams'
import { onTick } from '@/landing2/ticker'
import { plural } from '@/utils/plural'
import StationMarker from '@/components/landing/StationMarker.vue'

// Pasek trasy na bilecie, od startu do stacji egzaminu. W każdym trybie da się go złapać:
// 'spring' odciąga stację, a ta wraca jak na sprężynie, 'days' robi to samo i liczy dni
// do egzaminu, a w 'ride' wagonik dowieziony do stacji kupuje bilet.
export type TrackMode = 'spring' | 'days' | 'ride'

const props = defineProps<{ shape: SolidKind; mode: TrackMode; days: number }>()
const emit = defineEmits<{ arrive: [] }>()

const STIFFNESS = 300
const DAMPING = 20
// Za stacją uchwyt idzie za palcem tylko w tej części. W lewo zatrzymuje się na starcie.
const RESISTANCE = 0.25
// Wagonik puszczony tak blisko stacji uznajemy za dowieziony.
const ARRIVED_AT = 0.94

const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const rest = props.mode === 'ride' ? 0 : 1
const rail = useTemplateRef<HTMLElement>('rail')
// Położenie uchwytu na pasku: 0 to start, 1 to stacja egzaminu.
const at = ref(rest)
const held = ref(false)
const arrived = ref(false)
let speed = 0
let grabbedAt = 0
let stopTick: (() => void) | undefined

const daysLeft = computed(() => {
  const left = Math.round(props.days * (1 - Math.max(0, Math.min(1, at.value))))
  return `zostało ${left} ${plural(left, ['dzień', 'dni', 'dni'])}`
})

function pointerAt(event: PointerEvent): number {
  const box = rail.value!.getBoundingClientRect()
  return (event.clientX - box.left) / box.width
}

function grab(event: PointerEvent) {
  if (arrived.value) return
  stopTick?.()
  stopTick = undefined
  speed = 0
  held.value = true
  grabbedAt = pointerAt(event) - at.value
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
}

function move(event: PointerEvent) {
  if (!held.value) return
  const raw = pointerAt(event) - grabbedAt
  at.value = raw > 1 ? 1 + (raw - 1) * RESISTANCE : Math.max(0, raw)
}

function release() {
  if (!held.value) return
  held.value = false
  if (props.mode === 'ride' && at.value >= ARRIVED_AT) {
    arrived.value = true
    at.value = 1
    emit('arrive')
    return
  }
  if (still) at.value = rest
  else stopTick = onTick(settle)
}

// Sprężyna z tłumieniem: uchwyt wraca na miejsce i gaśnie po paru wahnięciach.
function settle(seconds: number) {
  speed += (STIFFNESS * (rest - at.value) - DAMPING * speed) * seconds
  at.value += speed * seconds
  if (Math.abs(rest - at.value) < 0.002 && Math.abs(speed) < 0.02) {
    at.value = rest
    stopTick?.()
    stopTick = undefined
  }
}

onBeforeUnmount(() => stopTick?.())
</script>

<template>
  <div class="track" :class="`track--${mode}`" @pointerdown.stop @pointermove.stop>
    <span>Start</span>
    <div ref="rail" class="track__rail" :style="{ '--at': at }">
      <span v-if="mode === 'ride'" class="track__bed" />
      <span class="track__line" />
      <span v-if="mode === 'days'" class="track__note" :class="{ 'is-shown': held }">
        {{ daysLeft }}
      </span>
      <span v-if="mode === 'ride'" class="track__note" :class="{ 'is-shown': at < 0.04 }">
        przeciągnij do stacji
      </span>
      <StationMarker v-if="mode === 'ride'" :shape="shape" class="track__end" />
      <span
        class="track__knob"
        :class="{ 'is-held': held }"
        @pointerdown="grab"
        @pointermove="move"
        @pointerup="release"
        @pointercancel="release"
      >
        <svg v-if="mode === 'ride'" class="track__wagon" viewBox="0 0 34 20">
          <rect x="1.5" y="1.5" width="31" height="13" rx="3.5" />
          <path class="track__glass" d="M6 5h6v4H6zM14 5h6v4h-6zM22 5h6v4h-6z" />
          <circle cx="9" cy="16.5" r="2.5" />
          <circle cx="25" cy="16.5" r="2.5" />
        </svg>
        <StationMarker v-else :shape="shape" />
      </span>
    </div>
  </div>
</template>

<style scoped>
.track {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-size: 0.9375rem;
  font-weight: 700;
}

/* Pasek kończy się w środku stacji, dlatego po prawej zostaje miejsce na jej połowę. */
.track__rail {
  position: relative;
  flex: 1;
  height: 1.6rem;
  margin-right: 0.8rem;
}

.track__line,
.track__bed {
  position: absolute;
  top: 50%;
  left: 0;
  height: 0.5rem;
  border-radius: 0.25rem 0 0 0.25rem;
  background: var(--tk-exam);
  translate: 0 -50%;
}

.track__line {
  width: calc(var(--at) * 100%);
}

.track__bed {
  width: 100%;
  opacity: 0.25;
}

.track__knob,
.track__end {
  --marker-fill: var(--paper);
  --marker-stroke: var(--ink);
  position: absolute;
  top: 50%;
  font-size: 1.6rem;
  translate: -50% -50%;
}

.track__end {
  left: 100%;
}

.track__knob {
  left: calc(var(--at) * 100%);
  display: grid;
  cursor: grab;
  /* Ruch w poziomie przesuwa uchwyt, a w pionie dalej przewija stronę. */
  touch-action: pan-y;
}

/* Pole chwytu większe od samego znaku, żeby dało się trafić palcem. */
.track__knob::before {
  content: '';
  position: absolute;
  inset: -0.6rem;
}

.track__knob.is-held {
  cursor: grabbing;
}

.track__wagon {
  width: 2.1rem;
  height: auto;
  fill: var(--ink);
  overflow: visible;
}

.track__glass {
  fill: var(--paper);
}

/* Napis mieści się w odcinku, który zwalnia odsunięty uchwyt. */
.track__note {
  position: absolute;
  top: 50%;
  right: -0.8rem;
  left: calc(var(--at) * 100% + 1.4rem);
  color: var(--ink-soft);
  font-size: 0.75rem;
  font-variant-numeric: tabular-nums;
  line-height: 1.6rem;
  white-space: nowrap;
  overflow: hidden;
  opacity: 0;
  translate: 0 -50%;
  transition: opacity 0.2s ease;
  pointer-events: none;
}

/* Wagonik stoi na starcie obok napisu, a nie na nim. */
.track--ride .track__rail {
  margin-left: 0.9rem;
}

.track--ride .track__note {
  right: 1.2rem;
}

.track__note.is-shown {
  opacity: 1;
}
</style>
