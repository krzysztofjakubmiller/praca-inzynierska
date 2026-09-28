<script setup lang="ts">
import type { Exam } from '@/config/exams'
import StationMarker from './StationMarker.vue'

/** `active` to numer bieżącego przystanku; po egzaminach są opis aplikacji i bilety. */
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
          <StationMarker :shape="exam.solid" class="route__marker" />
          <span class="route__label">{{ exam.shortName }}</span>
        </a>
      </li>
      <li
        class="route__stop route__stop--about"
        :class="{ 'route__stop--active': active === exams.length }"
      >
        <a
          class="route__link"
          href="#jak-to-dziala"
          :aria-current="active === exams.length ? 'location' : undefined"
        >
          <StationMarker shape="question" class="route__marker" />
          <span class="route__label">Jak to działa</span>
        </a>
      </li>
      <li
        class="route__stop route__stop--tickets"
        :class="{ 'route__stop--active': active === exams.length + 1 }"
      >
        <a
          class="route__link"
          href="#bilety"
          :aria-current="active === exams.length + 1 ? 'location' : undefined"
        >
          <StationMarker shape="ticket" class="route__marker" />
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

.route__stop--tickets,
.route__stop--about {
  --exam: var(--ink);
}

.route__stop--active .route__marker {
  --marker-fill: var(--exam);
}

@media (min-width: 48rem) {
  .route__stop + .route__stop::before {
    margin-inline: 0.35rem;
  }
}

/* Na wąskim ekranie widać same znaczniki, nazwy zostają dla czytników ekranu. */
@media (max-width: 47.99rem) {
  .route__stop:not(.route__stop--tickets) .route__label {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
}

@media (max-width: 23.74rem) {
  .route__stop--tickets .route__label {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
}
</style>
