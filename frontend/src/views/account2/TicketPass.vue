<script setup lang="ts">
import { useId } from 'vue'
import StationMarker from '@/components/landing/StationMarker.vue'
import { EMAIL, EXAM } from './demo'

// Bilet ucznia jak z kasownika na wizytówce: stałe dane konta na papierze z kuponem.
withDefaults(defineProps<{ facts: { name: string; value: string }[]; level?: 1 | 2 }>(), {
  level: 2,
})

const id = useId()
</script>

<template>
  <article
    class="ticket-pass"
    :style="{ '--exam': `var(--exam-${EXAM.id})` }"
    :aria-labelledby="id"
  >
    <div class="ticket-pass__main">
      <div class="ticket-pass__line" aria-hidden="true">
        <span class="ticket-pass__track" />
        <StationMarker :shape="EXAM.solid" class="ticket-pass__marker" />
      </div>
      <component :is="`h${level}`" :id="id" class="ticket-pass__exam">{{ EXAM.name }}</component>
      <dl class="ticket-pass__facts">
        <div v-for="fact in facts" :key="fact.name">
          <dt>{{ fact.name }}</dt>
          <dd>{{ fact.value }}</dd>
        </div>
      </dl>
    </div>
    <div class="ticket-pass__stub">
      <p class="ticket-pass__owner">{{ EMAIL }}</p>
      <RouterLink class="button button--quiet" :to="{ name: 'coming-soon' }">
        Przedłuż bilet
      </RouterLink>
    </div>
  </article>
</template>

<style scoped>
/* Bilet: biały papier z linią w kolorze egzaminu i oddzielonym kuponem na dole. */
.ticket-pass {
  --pad: clamp(1.25rem, 1rem + 1vw, 1.75rem);
  --notch: 0.7rem;
  position: relative;
  display: grid;
  border-radius: 1.25rem;
  background: var(--surface);
  box-shadow: var(--card-shadow);
}

.ticket-pass__main {
  display: grid;
  gap: 1.1rem;
  padding: var(--pad);
}

/* Linia dochodzi do środka znacznika, a jego wypełnienie zakrywa jej koniec. */
.ticket-pass__line {
  display: flex;
  align-items: center;
  margin-left: calc(-1 * var(--pad));
}

.ticket-pass__track {
  flex: 0 0 min(45%, 10rem);
  height: 0.5rem;
  background: var(--exam);
}

.ticket-pass .ticket-pass__marker {
  --marker-fill: var(--exam);
  --marker-stroke: var(--exam);
  margin-left: -0.8rem;
  font-size: 1.6rem;
}

.ticket-pass__exam {
  font-size: clamp(2.1rem, 1.6rem + 2vw, 2.75rem);
  font-weight: 800;
  font-stretch: 75%;
  line-height: 0.92;
  text-transform: uppercase;
}

.ticket-pass__facts {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.9rem 1rem;
  margin: 0;
}

.ticket-pass__facts dt {
  color: var(--ink-soft);
  font-size: 0.8125rem;
  font-weight: 650;
}

.ticket-pass__facts dd {
  margin: 0;
  font-weight: 700;
}

/* Kupon oddziela perforacja z dwoma wycięciami w kolorze tła strony. */
.ticket-pass__stub {
  position: relative;
  display: grid;
  gap: 0.75rem;
  justify-items: start;
  padding: var(--pad);
  border-top: 2px dashed var(--hairline);
}

.ticket-pass__stub::before,
.ticket-pass__stub::after {
  content: '';
  position: absolute;
  top: calc(-1 * var(--notch) - 1px);
  width: calc(2 * var(--notch));
  height: calc(2 * var(--notch));
  border-radius: 50%;
  background: var(--ground);
}

.ticket-pass__stub::before {
  left: calc(-1 * var(--notch));
}

.ticket-pass__stub::after {
  right: calc(-1 * var(--notch));
}

.ticket-pass__owner {
  color: var(--ink-soft);
  font-size: 0.9375rem;
  overflow-wrap: anywhere;
}
</style>
