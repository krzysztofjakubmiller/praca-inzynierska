<script setup lang="ts">
import { computed } from 'vue'
import { shortDate, type Sheet } from '@/stats/stats'

const props = defineProps<{
  sheets: readonly Sheet[]
  /** Cel ucznia w procentach; bez celu linia się nie pojawia. */
  target: number | null
  width: number
}>()

const LEFT = 58
// Podpisy pod stacjami są wyśrodkowane, więc skrajne stacje stoją pół podpisu od krawędzi.
const LABEL_HALF = 28
const TOP = 22
const BOTTOM = 150
const PASS = 30

const y = (percent: number) => BOTTOM - (percent / 100) * (BOTTOM - TOP)

// Zrobione arkusze i najbliższy zaplanowany jako następna stacja na linii.
const shown = computed(() => {
  const done = props.sheets.filter((sheet) => sheet.percent !== undefined)
  const next = props.sheets.find((sheet) => sheet.percent === undefined)
  return next ? [...done, next] : done
})

const points = computed(() => {
  const step = (props.width - LEFT - 12 - LABEL_HALF) / Math.max(1, shown.value.length - 1)
  const done = props.sheets.filter((sheet) => sheet.percent !== undefined)
  const lastDone = done[done.length - 1]
  return shown.value.map((sheet, index) => ({
    sheet,
    x: LEFT + 12 + index * step,
    y: y(sheet.percent ?? lastDone?.percent ?? PASS),
    planned: sheet.percent === undefined,
  }))
})

const donePath = computed(() => {
  const done = points.value.filter((point) => !point.planned)
  return done.length > 1 ? `M${done.map((point) => `${point.x} ${point.y}`).join('L')}` : ''
})

const nextLink = computed(() => {
  const last = points.value[points.value.length - 1]
  const before = points.value[points.value.length - 2]
  return last?.planned && before ? { from: before, to: last } : undefined
})

const summary = computed(() => {
  const results = points.value
    .filter((point) => !point.planned)
    .map((point) => `${point.sheet.name} ${point.sheet.percent}%`)
    .join(', ')
  const target = props.target ? ` Cel ${props.target}%.` : ''
  return `Wyniki arkuszy: ${results}. Próg zdania ${PASS}%.${target}`
})
</script>

<template>
  <svg class="chart" :viewBox="`0 0 ${width} ${BOTTOM + 40}`" role="img" :aria-label="summary">
    <line class="sheets__pass" :x1="LEFT" :x2="width" :y1="y(PASS)" :y2="y(PASS)" />
    <text x="0" :y="y(PASS) + 4">próg {{ PASS }}%</text>
    <template v-if="target">
      <line class="sheets__target" :x1="LEFT" :x2="width" :y1="y(target)" :y2="y(target)" />
      <text class="chart__strong" x="0" :y="y(target) + 4">cel {{ target }}%</text>
    </template>
    <path v-if="donePath" class="chart__ink-line" :d="donePath" stroke-width="3" />
    <line
      v-if="nextLink"
      class="sheets__next"
      :x1="nextLink.from.x"
      :y1="nextLink.from.y"
      :x2="nextLink.to.x"
      :y2="nextLink.to.y"
    />
    <g v-for="point in points" :key="point.sheet.date">
      <circle
        class="chart__station"
        :class="{ 'chart__station--planned': point.planned }"
        :cx="point.x"
        :cy="point.y"
        r="6"
      />
      <text
        v-if="!point.planned"
        class="chart__value"
        :x="point.x"
        :y="point.y - 13"
        text-anchor="middle"
      >
        {{ point.sheet.percent }}%
      </text>
      <text class="chart__strong" :x="point.x" :y="BOTTOM + 20" text-anchor="middle">
        {{ point.sheet.short }}
      </text>
      <text :x="point.x" :y="BOTTOM + 35" text-anchor="middle">
        {{ shortDate(point.sheet.date) }}
      </text>
      <title>
        {{ point.sheet.name }}, {{ shortDate(point.sheet.date)
        }}{{ point.planned ? ', zaplanowany' : `: ${point.sheet.percent}%` }}
      </title>
    </g>
  </svg>
</template>

<style scoped>
.sheets__pass {
  stroke: var(--map-outline);
  stroke-dasharray: 3 4;
}

.sheets__target {
  stroke: var(--ink);
  stroke-dasharray: 6 4;
}

.sheets__next {
  stroke: var(--map-outline);
  stroke-width: 2;
  stroke-dasharray: 2 5;
  stroke-linecap: round;
}
</style>
