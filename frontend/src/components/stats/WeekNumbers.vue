<script setup lang="ts">
import { computed } from 'vue'
import StreakRoute from '@/components/stats/StreakRoute.vue'
import { currentStreak, longestStreak, plural } from '@/stats/stats'

const props = defineProps<{
  /** Zadania w kolejnych dniach, ostatni element to dziś. */
  days: readonly number[]
  /** Skuteczność ostatnich zadań, od 0 do 1. */
  recentScore: number
  today: string
  width: number
}>()

const week = computed(() => props.days.slice(-7))
const activeDays = computed(() => week.value.filter((count) => count > 0).length)
const tasks = computed(() => week.value.reduce((sum, count) => sum + count, 0))
const change = computed(() => tasks.value - props.days.slice(-14, -7).reduce((a, b) => a + b, 0))
const streak = computed(() => currentStreak(props.days))
const longest = computed(() => longestStreak(props.days))

const changeText = computed(() => {
  if (change.value === 0) return 'tyle samo co tydzień wcześniej'
  const sign = change.value > 0 ? '+' : '−'
  return `${sign}${Math.abs(change.value)} niż tydzień wcześniej`
})
</script>

<template>
  <div class="week">
    <StreakRoute :days="days" :today="today" :width="width" />

    <dl class="week__figures">
      <div>
        <dt>Dni nauki</dt>
        <dd class="week__value">{{ activeDays }} z 7</dd>
      </div>
      <div>
        <dt>Zadania</dt>
        <dd class="week__value">{{ tasks }}</dd>
        <dd class="week__note">{{ changeText }}</dd>
      </div>
      <div>
        <dt>Skuteczność</dt>
        <dd class="week__value">{{ Math.round(recentScore * 100) }}%</dd>
        <dd class="week__note">w ostatnich zadaniach</dd>
      </div>
      <div>
        <dt>Seria</dt>
        <dd class="week__value">{{ streak }} {{ plural(streak, 'dzień', 'dni', 'dni') }}</dd>
        <dd class="week__note">najdłuższa: {{ longest }}</dd>
      </div>
    </dl>
  </div>
</template>

<style scoped>
.week {
  container-type: inline-size;
}

/* Liczby jak w rozkładzie jazdy: kreska nad każdą, bez osobnych kafelków w karcie. */
.week__figures {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem 1.25rem;
  margin-top: 1.25rem;
}

.week__figures > div {
  padding-top: 0.75rem;
  border-top: 1px solid var(--hairline);
}

.week dt {
  color: var(--ink-soft);
  font-size: 0.8125rem;
  font-weight: 650;
}

.week__value {
  margin: 0.125rem 0 0.2rem;
  font-size: 1.75rem;
  font-weight: 750;
  font-variant-numeric: tabular-nums;
  font-variation-settings: 'wdth' 90;
  letter-spacing: -0.02em;
  line-height: 1.1;
}

.week__note {
  color: var(--ink-soft);
  font-size: 0.8125rem;
  line-height: 1.35;
}

@container (min-width: 34rem) {
  .week__figures {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}
</style>
