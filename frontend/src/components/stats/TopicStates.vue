<script setup lang="ts">
import { computed, useId } from 'vue'
import type { TopicState } from '@/maps/progress'

const props = defineProps<{ states: Record<TopicState, number>; width: number }>()

const ORDER: { state: TopicState; name: string }[] = [
  { state: 'mastered', name: 'opanowane' },
  { state: 'learning', name: 'w nauce' },
  { state: 'weak', name: 'słabe' },
  { state: 'untouched', name: 'nieruszone' },
]

const pattern = useId()
const total = computed(() => ORDER.reduce((sum, { state }) => sum + props.states[state], 0))

// Odcinki stykają się przerwą 2 px w kolorze karty, bez obrysów.
const segments = computed(() => {
  let x = 0
  return ORDER.filter(({ state }) => props.states[state] > 0).map((item) => {
    const width = (props.states[item.state] / total.value) * (props.width + 2) - 2
    const segment = { ...item, x, width }
    x += width + 2
    return segment
  })
})

const summary = computed(
  () =>
    `Tematy: ${total.value}. ` +
    ORDER.map(({ state, name }) => `${name} ${props.states[state]}`).join(', ') +
    '.',
)
</script>

<template>
  <div role="img" :aria-label="summary">
    <svg class="chart" :viewBox="`0 0 ${width} 24`" aria-hidden="true">
      <defs>
        <pattern
          :id="pattern"
          width="6"
          height="6"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <rect width="6" height="6" class="states__hatch-ground" />
          <line x1="0" y1="0" x2="0" y2="6" class="states__hatch-line" />
        </pattern>
      </defs>
      <rect
        v-for="segment in segments"
        :key="segment.state"
        :class="`states__${segment.state}`"
        :x="segment.x"
        y="0"
        :width="Math.max(segment.width, 1)"
        height="24"
        rx="5"
        :fill="segment.state === 'weak' ? `url(#${pattern})` : undefined"
      />
    </svg>
    <ul class="states__legend" aria-hidden="true">
      <li v-for="{ state, name } in ORDER" :key="state">
        <svg class="states__swatch" viewBox="0 0 14 14">
          <rect
            :class="`states__${state}`"
            x="0.75"
            y="0.75"
            width="12.5"
            height="12.5"
            rx="3"
            :fill="state === 'weak' ? `url(#${pattern})` : undefined"
          />
        </svg>
        <strong>{{ states[state] }}</strong>
        {{ name }}
      </li>
    </ul>
  </div>
</template>

<style scoped>
.states__mastered {
  fill: var(--ink);
}

.states__learning {
  fill: var(--map-outline);
}

.states__weak {
  stroke: var(--ink);
  stroke-width: 1.5;
}

.states__untouched {
  fill: var(--track);
}

.states__hatch-ground {
  fill: var(--surface);
}

.states__hatch-line {
  stroke: var(--ink);
  stroke-width: 2.4;
}

.states__legend {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(8rem, 1fr));
  gap: 0.5rem 1rem;
  margin: 1rem 0 0;
  padding: 0;
  color: var(--ink-soft);
  font-size: 0.875rem;
  list-style: none;
}

.states__legend li {
  display: flex;
  align-items: center;
  gap: 0.45rem;
}

.states__legend strong {
  color: var(--ink);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.states__swatch {
  flex: none;
  width: 0.875rem;
  height: 0.875rem;
  overflow: visible;
}
</style>
