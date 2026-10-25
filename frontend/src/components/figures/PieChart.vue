<script setup lang="ts">
import { computed } from 'vue'
import type { PieChartFigure } from '@/figures'

const props = defineProps<{ figure: PieChartFigure }>()

const RADIUS = 100
const SIZE = 2 * RADIUS + 8
const CENTER = SIZE / 2
const LABEL_AT = 0.68

// Odcienie od najjaśniejszego do najciemniejszego w kolejności wycinków, jak w arkuszach.
const LIGHTEST = 0.08
const DARKEST = 0.9

const point = (angle: number, distance: number): [number, number] => [
  CENTER + distance * Math.sin(angle),
  CENTER - distance * Math.cos(angle),
]

const slices = computed(() => {
  const total = props.figure.slices.reduce((sum, slice) => sum + slice.value, 0)
  const count = props.figure.slices.length
  let start = 0
  return props.figure.slices.map((slice, index) => {
    const sweep = (slice.value / total) * 2 * Math.PI
    const end = start + sweep
    const [x1, y1] = point(start, RADIUS)
    const [x2, y2] = point(end, RADIUS)
    const large = sweep > Math.PI ? 1 : 0
    const shade = LIGHTEST + ((DARKEST - LIGHTEST) * index) / (count - 1)
    const middle = start + sweep / 2
    start = end
    return {
      path: `M${CENTER} ${CENTER} L${x1} ${y1} A${RADIUS} ${RADIUS} 0 ${large} 1 ${x2} ${y2} Z`,
      shade,
      // Na ciemnym wycinku napis jasny, żeby był czytelny.
      dark: shade > 0.55,
      label: slice.label ? { text: slice.label, at: point(middle, RADIUS * LABEL_AT) } : null,
      legend: slice.legend,
    }
  })
})
</script>

<template>
  <div class="pie-chart">
    <svg
      class="pie-chart__circle"
      :viewBox="`0 0 ${SIZE} ${SIZE}`"
      :style="{ maxWidth: `${SIZE}px` }"
      role="img"
      aria-label="Diagram kołowy"
    >
      <path
        v-for="(slice, index) in slices"
        :key="index"
        :d="slice.path"
        class="pie-chart__slice"
        :style="{ fillOpacity: slice.shade }"
      />
      <template v-for="(slice, index) in slices" :key="`t${index}`">
        <text
          v-if="slice.label"
          :x="slice.label.at[0]"
          :y="slice.label.at[1] + 5"
          class="pie-chart__label"
          :class="{ 'pie-chart__label--dark': slice.dark }"
        >
          {{ slice.label.text }}
        </text>
      </template>
    </svg>
    <ul v-if="slices.some((slice) => slice.legend)" class="pie-chart__legend">
      <li v-for="(slice, index) in slices" :key="index">
        <svg class="pie-chart__swatch" viewBox="0 0 16 16" aria-hidden="true">
          <rect x="1" y="1" width="14" height="14" :style="{ fillOpacity: slice.shade }" />
        </svg>
        {{ slice.legend }}
      </li>
    </ul>
  </div>
</template>

<style scoped>
.pie-chart {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1rem 1.5rem;
  color: var(--ink);
}

.pie-chart__circle {
  display: block;
  width: 100%;
  flex: 0 1 auto;
}

.pie-chart__slice,
.pie-chart__swatch rect {
  fill: var(--figure-color, currentColor);
  stroke: currentColor;
  stroke-width: 1.2;
}

.pie-chart__label {
  fill: currentColor;
  font-family: KaTeX_Main, 'Times New Roman', serif;
  font-size: 15px;
  text-anchor: middle;
}

.pie-chart__label--dark {
  fill: var(--surface);
}

.pie-chart__legend {
  display: grid;
  gap: 0.5rem;
  margin: 0;
  padding: 0;
  list-style: none;
  font-family: KaTeX_Main, 'Times New Roman', serif;
}

.pie-chart__legend li {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.pie-chart__swatch {
  flex: none;
  width: 1.1rem;
  height: 1.1rem;
}
</style>
