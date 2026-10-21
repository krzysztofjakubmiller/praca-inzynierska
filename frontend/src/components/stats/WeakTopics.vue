<script setup lang="ts">
import StationIcon from '@/components/map/StationIcon.vue'
import { plural, type WeakTopic } from '@/stats/stats'

defineProps<{ topics: readonly WeakTopic[] }>()

const percent = (topic: WeakTopic) => Math.round(topic.score * 100)
</script>

<template>
  <ol class="weak">
    <li v-for="topic in topics" :key="topic.name" class="weak__row">
      <StationIcon class="weak__icon" :difficulty="topic.difficulty" />
      <span class="weak__name">
        {{ topic.name }}
        <span class="weak__count">
          z {{ topic.attempts }} {{ plural(topic.attempts, 'wariantu', 'wariantów', 'wariantów') }}
        </span>
      </span>
      <span class="weak__bar" aria-hidden="true">
        <span class="weak__fill" :style="{ width: `${percent(topic)}%` }" />
      </span>
      <span class="weak__percent">{{ percent(topic) }}%</span>
    </li>
  </ol>
</template>

<style scoped>
.weak {
  display: grid;
  gap: 0.875rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.weak__row {
  display: grid;
  grid-template-columns: 1.25rem minmax(0, 9rem) minmax(3rem, 1fr) 2.75rem;
  align-items: center;
  gap: 0.6rem;
}

.weak__icon {
  font-size: 1.125rem;
}

.weak__name {
  font-size: 0.875rem;
  font-weight: 650;
  line-height: 1.25;
}

.weak__count {
  display: block;
  color: var(--ink-soft);
  font-size: 0.75rem;
  font-weight: 400;
}

/* Tor do 100% z kreską w połowie: poniżej niej temat liczy się jako słaby. */
.weak__bar {
  position: relative;
  height: 0.5rem;
  border-radius: 999px;
  background: var(--track);
}

.weak__bar::before {
  position: absolute;
  inset: -0.25rem auto -0.25rem 50%;
  width: 1px;
  background: var(--map-outline);
  content: '';
}

.weak__fill {
  position: absolute;
  inset: 0 auto 0 0;
  border-radius: 999px;
  background: var(--ink);
}

.weak__percent {
  font-size: 0.9375rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  text-align: right;
}
</style>
