<script setup lang="ts">
import { computed } from 'vue'
import type { BarChartFigure } from '@/figures'

const props = defineProps<{ figure: BarChartFigure }>()

// Wszystkie diagramy mają jeden wygląd niezależnie od tego, jak były narysowane w arkuszu.
const PLOT_HEIGHT = 200
const SLOT = 44
const BAR = 20
const TOP = 16
const TITLE = 22
const AXIS_NUMBERS = 34
const AXIS_TITLE = 20
const CATEGORY = 22

// Krok osi: najmniejszy z 1, 2, 5, 10, 20, 50… przy którym kresek jest najwyżej 10.
function niceStep(max: number): number {
  for (let power = 1; ; power *= 10) {
    for (const step of [1, 2, 2.5, 5].map((base) => base * power)) {
      if (max / step <= 10) return step
    }
  }
}

const highest = computed(() => Math.max(...props.figure.charts.flatMap((chart) => chart.values)))
const step = computed(() => props.figure.y_step ?? niceStep(props.figure.y_max ?? highest.value))
const yMax = computed(
  () =>
    props.figure.y_max ?? Math.max(step.value, Math.ceil(highest.value / step.value) * step.value),
)
const ticks = computed(() => {
  const values = []
  for (let value = 0; value <= yMax.value + 1e-9; value += step.value) values.push(value)
  return values
})

const titled = computed(() => props.figure.charts.some((chart) => chart.title))
const left = computed(() => AXIS_NUMBERS + (props.figure.y_label ? AXIS_TITLE : 0))
const top = computed(() => TOP + (titled.value ? TITLE : 0))
const plotWidth = computed(() => props.figure.categories.length * SLOT)
const width = computed(() => left.value + plotWidth.value + 12)
const height = computed(
  () => top.value + PLOT_HEIGHT + CATEGORY + (props.figure.x_label ? AXIS_TITLE : 0) + 6,
)

const y = (value: number) => top.value + PLOT_HEIGHT * (1 - value / yMax.value)
const slotCenter = (index: number) => left.value + SLOT * (index + 0.5)
const number = (value: number) => String(Math.round(value * 100) / 100).replace('.', ',')
</script>

<template>
  <div class="bar-chart">
    <svg
      v-for="(chart, chartIndex) in figure.charts"
      :key="chartIndex"
      class="bar-chart__panel"
      :viewBox="`0 0 ${width} ${height}`"
      :style="{ maxWidth: `${width}px` }"
      role="img"
      :aria-label="chart.title ?? 'Diagram słupkowy'"
    >
      <text v-if="chart.title" :x="left + plotWidth / 2" :y="TOP + 6" class="bar-chart__text">
        {{ chart.title }}
      </text>

      <g class="bar-chart__grid">
        <path v-for="tick in ticks" :key="tick" :d="`M${left} ${y(tick)} H${left + plotWidth}`" />
      </g>
      <text
        v-for="tick in ticks"
        :key="`n${tick}`"
        :x="left - 8"
        :y="y(tick) + 5"
        class="bar-chart__text bar-chart__text--number"
      >
        {{ number(tick) }}
      </text>

      <rect
        v-for="(value, index) in chart.values"
        :key="`b${index}`"
        :x="slotCenter(index) - BAR / 2"
        :y="y(value)"
        :width="BAR"
        :height="y(0) - y(value)"
        class="bar-chart__bar"
      />
      <template v-if="figure.show_values">
        <text
          v-for="(value, index) in chart.values"
          :key="`v${index}`"
          :x="slotCenter(index)"
          :y="y(value) - 6"
          class="bar-chart__text"
        >
          {{ number(value) }}
        </text>
      </template>

      <path :d="`M${left} ${top - 6} V${y(0)} H${left + plotWidth}`" class="bar-chart__axis" />
      <text
        v-for="(category, index) in figure.categories"
        :key="`k${index}`"
        :x="slotCenter(index)"
        :y="y(0) + 18"
        class="bar-chart__text"
      >
        {{ category }}
      </text>

      <text
        v-if="figure.x_label"
        :x="left + plotWidth / 2"
        :y="y(0) + CATEGORY + 16"
        class="bar-chart__text"
      >
        {{ figure.x_label }}
      </text>
      <text
        v-if="figure.y_label"
        :transform="`translate(14 ${top + PLOT_HEIGHT / 2}) rotate(-90)`"
        class="bar-chart__text"
      >
        {{ figure.y_label }}
      </text>
    </svg>
  </div>
</template>

<style scoped>
.bar-chart {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem 2rem;
}

/* Panele dzielą szerokość, a na wąskim ekranie przechodzą jeden pod drugi. */
.bar-chart__panel {
  display: block;
  flex: 1 1 16rem;
  min-width: 0;
  color: var(--ink);
}

.bar-chart__grid {
  stroke: var(--hairline);
  stroke-width: 1;
}

.bar-chart__axis {
  fill: none;
  stroke: currentColor;
  stroke-width: 1.3;
}

.bar-chart__bar {
  fill: var(--figure-color, currentColor);
  fill-opacity: 0.75;
}

.bar-chart__text {
  fill: currentColor;
  font-family: KaTeX_Main, 'Times New Roman', serif;
  font-size: 14px;
  text-anchor: middle;
}

.bar-chart__text--number {
  text-anchor: end;
}
</style>
