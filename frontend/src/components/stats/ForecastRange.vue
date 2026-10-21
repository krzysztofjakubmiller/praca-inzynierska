<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  forecast: { low: number; high: number }
  target: number | null
  /** Wynik ostatniego arkusza w procentach; bez arkusza znacznik się nie pojawia. */
  lastSheet?: number
  width: number
}>()

const PASS = 30
const SIDE = 8
const LINE = 46

const x = (percent: number) => SIDE + (percent / 100) * (props.width - 2 * SIDE)

// Podpis pod znacznikiem, ale nie dalej niż do krawędzi wykresu.
const labelX = (percent: number) => Math.min(Math.max(x(percent), 60), props.width - 60)

const summary = computed(() => {
  const parts = [
    `Przewidywany wynik od ${props.forecast.low} do ${props.forecast.high}%, to szacunek.`,
    `Próg zdania ${PASS}%.`,
  ]
  if (props.target) parts.push(`Cel ${props.target}%.`)
  if (props.lastSheet !== undefined) parts.push(`Ostatni arkusz ${props.lastSheet}%.`)
  return parts.join(' ')
})
</script>

<template>
  <div class="forecast">
    <p class="forecast__range" aria-hidden="true">
      {{ forecast.low }}–{{ forecast.high }}%
      <span class="forecast__estimate">szacunek</span>
    </p>
    <svg class="chart" :viewBox="`0 0 ${width} 92`" role="img" :aria-label="summary">
      <line class="chart__track" :x1="x(0)" :x2="x(100)" :y1="LINE" :y2="LINE" stroke-width="4" />
      <line
        class="chart__ink-line"
        :x1="x(forecast.low)"
        :x2="x(forecast.high)"
        :y1="LINE"
        :y2="LINE"
        stroke-width="12"
      />
      <line class="forecast__pass" :x1="x(PASS)" :x2="x(PASS)" :y1="LINE - 13" :y2="LINE + 13" />
      <template v-if="target">
        <path class="forecast__target" :d="`M${x(target)} ${LINE - 10}l-6 -9h12z`" />
        <text class="chart__strong" :x="x(target)" :y="LINE - 23" text-anchor="middle">
          cel {{ target }}%
        </text>
      </template>
      <template v-if="lastSheet !== undefined">
        <circle class="chart__station" :cx="x(lastSheet)" :cy="LINE" r="6" />
        <text :x="labelX(lastSheet)" :y="LINE + 28" text-anchor="middle">
          ostatni arkusz {{ lastSheet }}%
        </text>
      </template>
      <text :x="x(0)" y="88">0</text>
      <text :x="x(PASS)" y="88" text-anchor="middle">próg {{ PASS }}%</text>
      <text :x="x(100)" y="88" text-anchor="end">100%</text>
    </svg>
  </div>
</template>

<style scoped>
.forecast__range {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.25rem 0.75rem;
  margin-bottom: 0.25rem;
  font-size: clamp(2.25rem, 1.9rem + 1.6vw, 2.75rem);
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  font-variation-settings: 'wdth' 112;
  letter-spacing: -0.03em;
  line-height: 1;
}

.forecast__estimate {
  padding: 0.25rem 0.75rem 0.3rem;
  border: 1.5px solid var(--hairline);
  border-radius: 999px;
  font-size: 0.8125rem;
  font-variation-settings: normal;
  font-weight: 650;
  letter-spacing: 0;
}

.forecast__pass {
  stroke: var(--map-outline);
  stroke-width: 2;
}

.forecast__target {
  fill: var(--ink);
}
</style>
