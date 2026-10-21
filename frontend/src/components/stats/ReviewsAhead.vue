<script setup lang="ts">
import { computed } from 'vue'
import { plural, shiftDay, shortDate } from '@/stats/stats'

const props = defineProps<{
  /** Powtórki na kolejne dni, pierwszy element to dziś razem z zaległymi. */
  reviews: readonly number[]
  overdue: number
  /** Najwięcej powtórek jednego dnia, z ustawień ucznia. */
  limit: number
  today: string
  width: number
}>()

const TOP = 26
const BOTTOM = 136

// Skala do limitu, bo ponad niego słupek i tak nie rośnie; nad limitem zostaje miejsce na
// nadwyżkę.
const top = computed(
  () => Math.max(props.limit, ...props.reviews.map((count) => Math.min(count, props.limit))) * 1.35,
)
const y = (count: number) => BOTTOM - (count / top.value) * (BOTTOM - TOP)
const slot = computed(() => props.width / props.reviews.length)
const barWidth = computed(() => Math.min(18, slot.value * 0.62))

// Ponad limit powtórki nie przychodzą: nadwyżka czeka na kolejne dni, więc nad słupkiem stoi
// pasażer jak przy stacji na mapie, z liczbą czekających powtórek.
const bars = computed(() =>
  props.reviews.map((count, index) => {
    const shown = Math.min(count, props.limit)
    return {
      count,
      index,
      day: shiftDay(props.today, index),
      x: index * slot.value + (slot.value - barWidth.value) / 2,
      top: y(shown),
      height: BOTTOM - y(shown),
      extra: Math.max(0, count - props.limit),
    }
  }),
)

const todayText = computed(() => {
  const today = `Dziś ${Math.min(props.reviews[0]!, props.limit)}`
  if (props.overdue === 0) return today
  return `${today}, w tym ${props.overdue} ${plural(props.overdue, 'zaległa', 'zaległe', 'zaległych')}`
})

const summary = computed(
  () => `Powtórki na najbliższe 14 dni. ${todayText.value}. Limit ${props.limit} dziennie.`,
)
</script>

<template>
  <svg class="chart" :viewBox="`0 0 ${width} ${BOTTOM + 22}`" role="img" :aria-label="summary">
    <text class="chart__strong" x="0" y="12">{{ todayText }}</text>
    <line class="reviews__limit" x1="0" :x2="width" :y1="y(limit)" :y2="y(limit)" />
    <text :x="width" :y="y(limit) - 6" text-anchor="end">limit {{ limit }} dziennie</text>
    <g v-for="bar in bars" :key="bar.day">
      <rect
        :class="bar.index === 0 ? 'reviews__today' : 'reviews__bar'"
        :x="bar.x"
        :y="bar.top"
        :width="barWidth"
        :height="bar.height"
        rx="3"
      />
      <template v-if="bar.extra > 0">
        <g
          class="reviews__passenger"
          :transform="`translate(${bar.x + barWidth / 2 - 5} ${bar.top - 20})`"
        >
          <circle cx="5" cy="3.2" r="3" />
          <rect x="0.8" y="7.2" width="8.4" height="8.8" rx="3.4" />
        </g>
        <text class="chart__strong" :x="bar.x + barWidth / 2 + 9" :y="bar.top - 8">
          +{{ bar.extra }}
        </text>
      </template>
      <title>
        {{ bar.index === 0 ? 'Dziś' : shortDate(bar.day) }}: {{ bar.count }}
        {{ plural(bar.count, 'powtórka', 'powtórki', 'powtórek') }}
      </title>
    </g>
    <line class="chart__grid" x1="0" :x2="width" :y1="BOTTOM" :y2="BOTTOM" />
    <template v-for="bar in bars" :key="`label-${bar.day}`">
      <text
        v-if="bar.index % 2 === 0"
        :x="bar.x + barWidth / 2"
        :y="BOTTOM + 17"
        text-anchor="middle"
        :class="{ chart__strong: bar.index === 0 }"
      >
        {{ bar.index === 0 ? 'dziś' : Number(bar.day.slice(8)) }}
      </text>
    </template>
  </svg>
</template>

<style scoped>
.reviews__today {
  fill: var(--ink);
}

.reviews__bar {
  fill: var(--map-outline);
}

.reviews__passenger {
  fill: var(--ink);
}

.reviews__limit {
  stroke: var(--ink);
  stroke-dasharray: 5 4;
}
</style>
