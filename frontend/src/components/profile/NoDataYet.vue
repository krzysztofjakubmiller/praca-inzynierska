<script setup lang="ts">
import type { Exam } from '@/config/exams'

defineProps<{ examId: Exam['id'] }>()
</script>

<template>
  <section class="no-data">
    <svg class="no-data__route" viewBox="0 0 200 24" aria-hidden="true">
      <line x1="12" x2="188" y1="12" y2="12" />
      <circle v-for="index in 5" :key="index" :cx="12 + (index - 1) * 44" cy="12" r="6.5" />
    </svg>
    <p class="no-data__text">
      Wykresy pojawią się po twoich pierwszych zadaniach. Do tego czasu zobacz, jak wygląda postęp
      ucznia po kilku tygodniach nauki.
    </p>
    <RouterLink class="button" :to="{ name: 'demo-progress', params: { exam: examId } }">
      Zobacz przykładowy postęp
    </RouterLink>
  </section>
</template>

<style scoped>
.no-data {
  display: grid;
  justify-items: start;
  gap: 1rem;
  padding: 1.25rem 1.25rem 1.5rem;
  border: 1px solid var(--hairline);
  border-radius: 1rem;
  background: var(--surface);
}

.no-data__route {
  width: 10rem;
  overflow: visible;
}

.no-data__route line {
  stroke: var(--track);
  stroke-width: 7;
  stroke-linecap: round;
}

.no-data__route circle {
  fill: var(--surface);
  stroke: var(--map-outline);
  stroke-width: 3;
}

.no-data__text {
  max-width: 40ch;
}

/* Na wąskim telefonie przycisk zajmuje całą szerokość, żeby długi napis się nie ucinał. */
@media (max-width: 24rem) {
  .no-data .button {
    width: 100%;
    white-space: normal;
  }
}
</style>
