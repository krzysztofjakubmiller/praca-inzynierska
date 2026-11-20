<script setup lang="ts">
import ArrowIcon from '@/components/landing/ArrowIcon.vue'
import StationMarker from '@/components/landing/StationMarker.vue'
import { PRODUCT_NAME } from '@/config/product'
import {
  DAYS_LEFT_TEXT,
  EMAIL,
  EXAM,
  EXAM_DATE,
  REVIEWS_TODAY_TEXT,
  STREAK_TEXT,
  TRAVELLED,
  type Tab,
} from './demo'

// Góra konta jako stacja egzaminu z wizytówki: pole w kolorze egzaminu z liczbą dni do matury
// i zakładkami konta na dolnej krawędzi.
defineProps<{ tabs: readonly { id: Tab; label: string }[] }>()

const tab = defineModel<Tab>('tab', { required: true })
</script>

<template>
  <div class="station-field" :style="{ '--field': `var(--exam-${EXAM.id})` }">
    <section class="station__field" aria-labelledby="station-title">
      <header class="station__top">
        <RouterLink class="station__mark" :to="{ name: 'landing' }">{{ PRODUCT_NAME }}</RouterLink>
        <span class="station__email">{{ EMAIL }}</span>
        <RouterLink class="station__map" :to="{ name: 'basic-matura' }">Mapa tematów</RouterLink>
      </header>

      <StationMarker :shape="EXAM.solid" class="station__solid" />

      <div class="station__body">
        <h1 id="station-title" class="station__title">
          <span>{{ DAYS_LEFT_TEXT }}</span>
          <span>do matury</span>
        </h1>
        <p class="station__date">{{ EXAM.name }}, {{ EXAM_DATE }}</p>

        <div class="station__route" aria-hidden="true">
          <span class="station__travelled" :style="{ width: `${TRAVELLED * 100}%` }" />
        </div>

        <div class="station__today">
          <p>
            Na dziś <strong>{{ REVIEWS_TODAY_TEXT }}</strong
            >. Nauka bez przerwy od {{ STREAK_TEXT }}.
          </p>
          <RouterLink
            class="button station__go"
            :to="{ name: 'reviews', params: { exam: EXAM.id } }"
          >
            Zacznij powtórki
            <ArrowIcon />
          </RouterLink>
        </div>
      </div>

      <nav class="station__tabs" aria-label="Konto">
        <button
          v-for="item in tabs"
          :key="item.id"
          type="button"
          class="station__tab"
          :aria-pressed="tab === item.id"
          @click="tab = item.id"
        >
          {{ item.label }}
        </button>
      </nav>
    </section>
  </div>
</template>

<style scoped>
/* Kolor napisów strony pod polem, zapamiętany, zanim pole przestawi --ink na biały. Bierze go
   aktywna zakładka, która ma kolor tła strony. */
.station-field {
  --ink-on-ground: var(--ink);
}

/* Pole stacji: białe napisy na kolorze egzaminu, jak sekcje egzaminów na wizytówce. */
.station__field {
  --ink: #fff;
  --ink-soft: rgb(255 255 255 / 0.86);
  --hairline: rgb(255 255 255 / 0.3);
  position: relative;
  display: grid;
  gap: clamp(1.5rem, 1rem + 2vw, 2.5rem);
  padding: 0.75rem var(--gutter) 0;
  background: var(--field);
  color: #fff;
  overflow: clip;
}

.station__field ::selection {
  background: #fff;
  color: var(--field);
}

.station__field :focus-visible {
  outline-color: #fff;
}

/* Ciemna pigułka jak nagłówek wizytówki. */
.station__top {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 1rem;
  width: 100%;
  max-width: 68rem;
  height: 3.25rem;
  margin-inline: auto;
  padding-inline: 1.1rem 0.4rem;
  border-radius: 999px;
  background: #101421;
  box-shadow: 0 8px 24px -10px rgb(0 0 0 / 0.5);
}

.station__mark {
  margin-right: auto;
  font-weight: 800;
  font-stretch: 88%;
  text-decoration: none;
  white-space: nowrap;
}

.station__email {
  display: none;
  color: rgb(255 255 255 / 0.72);
  font-size: 0.875rem;
}

.station__map {
  display: flex;
  align-items: center;
  min-height: 2.5rem;
  padding-inline: 1rem;
  border-radius: 999px;
  background: #fff;
  color: #101421;
  font-size: 0.9375rem;
  font-weight: 700;
  text-decoration: none;
  white-space: nowrap;
}

/* Znak stacji egzaminu jako duży, nieruchomy rysunek w tle pola. Rozmiar idzie z font-size,
   bo znacznik ma 1em; gruba kreska znacznika w tej skali byłaby za ciężka. */
.station__field .station__solid {
  --marker-stroke: rgb(255 255 255 / 0.9);
  --marker-fill: transparent;
  position: absolute;
  top: 4.5rem;
  right: -3rem;
  font-size: clamp(12rem, 9rem + 16vw, 24rem);
  stroke-width: 0.45;
  opacity: 0.5;
}

.station__body {
  position: relative;
  display: grid;
  gap: 1rem;
  width: 100%;
  max-width: 68rem;
  margin-inline: auto;
  padding-top: clamp(2.5rem, 1.5rem + 5vw, 6rem);
}

.station__title {
  display: grid;
  font-size: clamp(3.25rem, 1.6rem + 7vw, 7.5rem);
  font-weight: 800;
  font-stretch: 75%;
  letter-spacing: 0.002em;
  line-height: 0.88;
  text-transform: uppercase;
}

.station__date {
  font-size: clamp(1.0625rem, 1rem + 0.4vw, 1.25rem);
  font-weight: 650;
}

/* Przejechana część roku szkolnego do matury. */
.station__route {
  height: 0.35rem;
  max-width: 40rem;
  border-radius: 999px;
  background: rgb(255 255 255 / 0.28);
}

.station__travelled {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: #fff;
}

.station__today {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1rem 1.5rem;
  margin-top: 0.5rem;
}

.station__today p {
  max-width: 34ch;
  font-size: 1.0625rem;
}

.station__go {
  border-color: #fff;
  background: #fff;
  color: #101421;
}

.station__go:hover {
  background: rgb(255 255 255 / 0.88);
}

/* Zakładki konta siedzą na dolnej krawędzi pola, jak karty segregatora. */
.station__tabs {
  display: flex;
  gap: 0.25rem;
  width: 100%;
  max-width: 68rem;
  margin-inline: auto;
  overflow-x: auto;
  scrollbar-width: none;
}

.station__tab {
  flex: none;
  min-height: 3rem;
  padding: 0 1.25rem;
  border: 0;
  border-radius: 0.9rem 0.9rem 0 0;
  background: transparent;
  color: #fff;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.station__tab:hover {
  background: rgb(255 255 255 / 0.14);
}

.station__tab[aria-pressed='true'] {
  background: var(--ground);
  color: var(--ink-on-ground);
}

@media (min-width: 48rem) {
  .station__email {
    display: block;
  }

  .station__field .station__solid {
    top: 5rem;
    right: max(var(--gutter), calc((100vw - 68rem) / 2));
    opacity: 0.75;
  }
}
</style>
