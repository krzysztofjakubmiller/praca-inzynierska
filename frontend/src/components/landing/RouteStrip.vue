<script setup lang="ts">
import type { Exam } from '@/config/exams'
import StationMarker from './StationMarker.vue'

/** `active` is the index of the current stop; the ticket office comes after the exams. */
defineProps<{ exams: readonly Exam[]; active: number }>()
</script>

<template>
  <nav class="route" aria-label="Trasa">
    <ol class="route__stops">
      <li
        v-for="(exam, index) in exams"
        :key="exam.id"
        class="route__stop"
        :class="{ 'route__stop--active': index === active }"
        :style="{ '--exam': `var(--exam-${exam.id})` }"
      >
        <a
          class="route__link"
          :href="`#${exam.id}`"
          :aria-current="index === active ? 'location' : undefined"
        >
          <StationMarker :solid="exam.solid" :soon="exam.soon" class="route__marker" />
          <span class="route__label">{{ exam.shortName }}</span>
        </a>
      </li>
      <li
        class="route__stop route__stop--terminus"
        :class="{ 'route__stop--active': active === exams.length }"
      >
        <a
          class="route__link"
          href="#bilety"
          :aria-current="active === exams.length ? 'location' : undefined"
        >
          <span class="route__terminus" aria-hidden="true" />
          <span class="route__label">Bilety</span>
        </a>
      </li>
    </ol>
  </nav>
</template>

<style scoped>
.route__stops {
  display: flex;
  align-items: center;
  padding: 0;
  list-style: none;
}

.route__stop {
  display: flex;
  align-items: center;
}

.route__stop + .route__stop::before {
  content: '';
  width: clamp(0.4rem, 3.2vw - 0.3rem, 1.5rem);
  height: 0.25rem;
  border-radius: 0.125rem;
  background: var(--ink);
}

.route__link {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  min-height: 2.75rem;
  padding-inline: 0.15rem;
  color: var(--ink-soft);
  font-size: 0.9375rem;
  font-weight: 550;
  text-decoration: none;
  transition: color 0.25s ease;
}

.route__link:hover,
.route__stop--active .route__link {
  color: var(--ink);
}

.route__stop--active .route__link {
  font-weight: 700;
}

.route__marker {
  font-size: 1.2rem;
}

.route__stop--active .route__marker {
  --marker-fill: var(--exam);
}

/* The end of a line: a short bar across it. */
.route__terminus {
  width: 0.25rem;
  height: 1.15rem;
  border-radius: 0.125rem;
  background: var(--ink);
}

@media (min-width: 48rem) {
  .route__stop + .route__stop::before {
    margin-inline: 0.35rem;
  }
}

@media (max-width: 47.99rem) {
  .route__stop:not(.route__stop--terminus) .route__label {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
}
</style>
