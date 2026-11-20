<script setup lang="ts">
import { useId } from 'vue'
import StationMarker from '@/components/landing/StationMarker.vue'
import type { Exam } from '@/config/exams'

// Bilet ucznia jak z kasownika na wizytówce: egzamin, dane biletu i kupon z adresem konta.
// Przycisk na kuponie podaje strona, bo zależy od tego, czy bilet już jest.
defineProps<{ exam: Exam; facts: { name: string; value: string }[]; email: string }>()

const id = useId()
</script>

<template>
  <article class="ticket" :style="{ '--exam': `var(--exam-${exam.id})` }" :aria-labelledby="id">
    <div class="ticket__main">
      <div class="ticket__line" aria-hidden="true">
        <span class="ticket__track" />
        <StationMarker :shape="exam.solid" class="ticket__marker" />
      </div>
      <h2 :id="id" class="ticket__exam">{{ exam.name }}</h2>
      <dl class="ticket__facts">
        <div v-for="fact in facts" :key="fact.name">
          <dt>{{ fact.name }}</dt>
          <dd>{{ fact.value }}</dd>
        </div>
      </dl>
    </div>
    <div class="ticket__stub">
      <p class="ticket__owner">{{ email }}</p>
      <slot />
    </div>
  </article>
</template>

<style scoped>
/* Bilet: biały papier z linią w kolorze egzaminu i oddzielonym kuponem na dole. */
.ticket {
  --pad: clamp(1.25rem, 1rem + 1vw, 1.75rem);
  --notch: 0.7rem;
  position: relative;
  display: grid;
  border-radius: 1.25rem;
  background: var(--surface);
  box-shadow: var(--card-shadow);
}

.ticket__main {
  display: grid;
  gap: 1.1rem;
  padding: var(--pad);
}

/* Linia dochodzi do środka znacznika, a jego wypełnienie zakrywa jej koniec. */
.ticket__line {
  display: flex;
  align-items: center;
  margin-left: calc(-1 * var(--pad));
}

.ticket__track {
  flex: 0 0 min(45%, 10rem);
  height: 0.5rem;
  background: var(--exam);
}

.ticket .ticket__marker {
  --marker-fill: var(--exam);
  --marker-stroke: var(--exam);
  margin-left: -0.8rem;
  font-size: 1.6rem;
}

.ticket__exam {
  font-size: clamp(2.1rem, 1.6rem + 2vw, 2.75rem);
  font-weight: 800;
  font-stretch: 75%;
  line-height: 0.92;
  text-transform: uppercase;
}

.ticket__facts {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.9rem 1rem;
  margin: 0;
}

.ticket__facts dt {
  color: var(--ink-soft);
  font-size: 0.8125rem;
  font-weight: 650;
}

.ticket__facts dd {
  margin: 0;
  font-weight: 700;
}

/* Kupon oddziela perforacja z dwoma wycięciami w kolorze tła strony. */
.ticket__stub {
  position: relative;
  display: grid;
  gap: 0.75rem;
  justify-items: start;
  padding: var(--pad);
  border-top: 2px dashed var(--hairline);
}

.ticket__stub::before,
.ticket__stub::after {
  content: '';
  position: absolute;
  top: calc(-1 * var(--notch) - 1px);
  width: calc(2 * var(--notch));
  height: calc(2 * var(--notch));
  border-radius: 50%;
  background: var(--ground);
}

.ticket__stub::before {
  left: calc(-1 * var(--notch));
}

.ticket__stub::after {
  right: calc(-1 * var(--notch));
}

.ticket__owner {
  color: var(--ink-soft);
  font-size: 0.9375rem;
  overflow-wrap: anywhere;
}
</style>
