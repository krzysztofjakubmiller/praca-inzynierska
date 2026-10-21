<script setup lang="ts">
import { computed } from 'vue'
import type { LineStats } from '@/stats/stats'

const props = defineProps<{ lines: readonly LineStats[] }>()

const RING = 30
const DONUT = 62
const GAP = 0.025

const share = (line: LineStats) => (line.total > 0 ? line.done / line.total : 0)
const percent = (line: LineStats) => Math.round(share(line) * 100)

const done = computed(() => props.lines.reduce((sum, line) => sum + line.done, 0))
const total = computed(() => props.lines.reduce((sum, line) => sum + line.total, 0))

// Łuk okręgu od kąta a do b, liczonych od godziny 12 zgodnie z ruchem wskazówek zegara.
function arc(from: number, to: number): string {
  const point = (angle: number) =>
    `${(80 + DONUT * Math.sin(angle)).toFixed(2)} ${(80 - DONUT * Math.cos(angle)).toFixed(2)}`
  return `M${point(from)}A${DONUT} ${DONUT} 0 ${to - from > Math.PI ? 1 : 0} 1 ${point(to)}`
}

// Wycinek linii jest tym większy, im więcej ma zadań; pełny kolor to zrobione, blady to zostało.
const slices = computed(() => {
  let start = 0
  return props.lines.map((line) => {
    const span = (line.total / total.value) * 2 * Math.PI
    const from = start + GAP
    const to = start + span - GAP
    const middle = from + (to - from) * share(line)
    start += span
    return { line, done: arc(from, middle), left: arc(middle, to), hasDone: line.done > 0 }
  })
})

const summary = computed(
  () =>
    `Zrobione ${done.value} z ${total.value} zadań. ` +
    props.lines
      .map((line) => `Linia ${line.name}: ${line.done} z ${line.total}, ${percent(line)}%.`)
      .join(' '),
)
</script>

<template>
  <div
    class="lines"
    role="img"
    :aria-label="summary"
    :style="{ '--rings': lines.length === 4 ? 2 : 3, '--rings-wide': lines.length }"
  >
    <ul class="lines__rings" aria-hidden="true">
      <li v-for="line in lines" :key="line.name" class="lines__ring">
        <svg class="chart" viewBox="-36 -36 72 72">
          <circle class="chart__track" :r="RING" stroke-width="7" />
          <circle
            v-if="line.done > 0"
            class="lines__arc"
            :r="RING"
            pathLength="1"
            :stroke-dasharray="`${share(line)} 1`"
            :style="{ stroke: `var(--line-${line.color})` }"
            transform="rotate(-90)"
          />
          <text class="chart__value lines__percent" text-anchor="middle" y="5.5">
            {{ percent(line) }}%
          </text>
        </svg>
        <span class="lines__name">{{ line.name }}</span>
        <span class="lines__count">{{ line.done }} z {{ line.total }}</span>
      </li>
    </ul>

    <div class="lines__whole" aria-hidden="true">
      <svg class="chart lines__donut" viewBox="0 0 160 160">
        <template v-for="slice in slices" :key="slice.line.name">
          <path
            v-if="slice.hasDone"
            class="lines__slice"
            :d="slice.done"
            :style="{ stroke: `var(--line-${slice.line.color})` }"
          />
          <path
            class="lines__slice lines__slice--left"
            :d="slice.left"
            :style="{ stroke: `var(--line-${slice.line.color})` }"
          />
        </template>
        <text class="lines__done" x="80" y="84" text-anchor="middle">{{ done }}</text>
        <text x="80" y="103" text-anchor="middle">z {{ total }} zadań</text>
      </svg>
      <ul class="lines__legend">
        <li v-for="line in lines" :key="line.name">
          <span class="chart-legend__swatch" :style="{ background: `var(--line-${line.color})` }" />
          <span>
            <strong>{{ line.name }}</strong>
            <span class="lines__left">
              {{ line.done }} z {{ line.total }} · zostało {{ line.total - line.done }}
            </span>
          </span>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.lines {
  container-type: inline-size;
}

/* Na wąskiej karcie cztery linie stoją 2 × 2, a więcej w rzędach po trzy; na szerokiej wszystkie
   w jednym rzędzie. Nazwy linii są za długie na cztery kolumny w telefonie. */
.lines__rings {
  display: grid;
  grid-template-columns: repeat(var(--rings), minmax(0, 1fr));
  gap: 1rem 0.5rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.lines__ring {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.lines__ring .chart {
  width: 4.5rem;
}

.lines__arc {
  fill: none;
  stroke-width: 7;
  stroke-linecap: round;
}

.lines .lines__percent {
  font-size: 15px;
}

.lines__name {
  margin-top: 0.4rem;
  font-size: 0.8125rem;
  font-weight: 650;
  line-height: 1.2;
}

.lines__count {
  color: var(--ink-soft);
  font-size: 0.75rem;
  font-variant-numeric: tabular-nums;
}

.lines__whole {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 1rem 1.25rem;
  margin-top: 1.25rem;
  padding-top: 1.25rem;
  border-top: 1px solid var(--hairline);
}

.lines__donut {
  flex: none;
  width: 9.5rem;
}

.lines__slice {
  fill: none;
  stroke-width: 18;
}

.lines__slice--left {
  stroke-opacity: 0.25;
}

@container (min-width: 25rem) {
  .lines__rings {
    grid-template-columns: repeat(var(--rings-wide), minmax(0, 1fr));
  }
}

.lines .lines__done {
  fill: var(--ink);
  font-size: 26px;
  font-weight: 750;
}

.lines__legend {
  display: grid;
  flex: 1 1 11rem;
  gap: 0.6rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.lines__legend li {
  display: flex;
  gap: 0.5rem;
  font-size: 0.875rem;
  line-height: 1.3;
}

.lines__legend .chart-legend__swatch {
  margin-top: 0.2rem;
}

.lines__legend strong {
  display: block;
  font-weight: 650;
}

.lines__left {
  color: var(--ink-soft);
  font-size: 0.8125rem;
  font-variant-numeric: tabular-nums;
}

@media (prefers-reduced-motion: no-preference) {
  .lines__arc {
    animation: close-ring 0.9s cubic-bezier(0.22, 1, 0.36, 1) both;
  }
}

/* Pierścień domyka się od godziny 12 jak kontur stacji na mapie. */
@keyframes close-ring {
  from {
    stroke-dasharray: 0 1;
  }
}
</style>
