<script setup lang="ts">
import { ref } from 'vue'
import ArrowIcon from '@/components/landing/ArrowIcon.vue'
import StationMarker from '@/components/landing/StationMarker.vue'
import FlapText from '@/components/landing3/FlapText.vue'
import ProgressCharts from '@/components/stats/ProgressCharts.vue'
import { PRODUCT_NAME } from '@/config/product'
import { longDate, shortDate } from '@/stats/stats'
import ProfileCharts from './ProfileCharts.vue'
import SettingsPreview from './SettingsPreview.vue'
import {
  DAYS_LEFT_TEXT,
  EMAIL,
  EXAM,
  LIMIT,
  NEXT_SHEET,
  REVIEWS_TODAY,
  STATS,
  STREAK_TEXT,
  TABS,
  TARGET,
  type Tab,
} from './demo'

// Wersja 3: najważniejsze liczby dnia na tablicy odjazdów z wizytówki. Tablica stoi bez ruchu:
// klapki przewijają się tylko przy zmianie tekstu, a tu tekst się nie zmienia.
const tab = ref<Tab>('profil')

const forecast = STATS.forecast ? `${STATS.forecast.low}-${STATS.forecast.high}%` : 'brak'
const ROWS = [
  { name: 'Do matury', value: DAYS_LEFT_TEXT },
  { name: 'Powtórki dziś', value: String(REVIEWS_TODAY) },
  { name: 'Seria', value: STREAK_TEXT },
  { name: 'Prognoza', value: forecast },
  { name: 'Cel', value: `${TARGET}%` },
]
</script>

<template>
  <div class="timetable">
    <section class="timetable__field" aria-labelledby="timetable-title">
      <header class="timetable__top">
        <RouterLink class="timetable__mark" :to="{ name: 'landing' }">{{
          PRODUCT_NAME
        }}</RouterLink>
        <RouterLink class="timetable__map" :to="{ name: 'basic-matura' }">Mapa</RouterLink>
      </header>

      <div class="timetable__hero">
        <div class="timetable__intro">
          <h1 id="timetable-title" class="timetable__title">
            <span v-for="word in EXAM.name.split(' ')" :key="word">{{ word }}</span>
          </h1>
          <p class="timetable__email">{{ EMAIL }}</p>
          <RouterLink
            class="button timetable__go"
            :to="{ name: 'reviews', params: { exam: EXAM.id } }"
          >
            Zacznij powtórki
            <ArrowIcon />
          </RouterLink>
        </div>

        <div class="timetable__box">
          <div class="board">
            <p class="board__head">
              <span>
                <StationMarker :shape="EXAM.solid" class="board__marker" />
                Twój rozkład
              </span>
              <span>{{ longDate(STATS.today) }}</span>
            </p>
            <ul class="board__rows">
              <li v-for="row in ROWS" :key="row.name" class="board__row">
                <FlapText class="board__name" :text="row.name" :cells="13" settled />
                <FlapText class="board__value" :text="row.value" :cells="7" settled />
              </li>
            </ul>
            <p v-if="NEXT_SHEET" class="board__notice">
              Następny arkusz: {{ shortDate(NEXT_SHEET.date) }}
            </p>
          </div>
        </div>
      </div>

      <nav class="timetable__tabs" aria-label="Konto">
        <button
          v-for="item in TABS"
          :key="item.id"
          type="button"
          class="timetable__tab"
          :aria-pressed="tab === item.id"
          @click="tab = item.id"
        >
          {{ item.label }}
        </button>
      </nav>
    </section>

    <main class="timetable__main">
      <template v-if="tab === 'profil'">
        <ProfileCharts />
        <section class="timetable__card" aria-labelledby="timetable-account">
          <h2 id="timetable-account" class="timetable__heading">Konto</h2>
          <p>Zalogowano jako {{ EMAIL }}</p>
          <div class="timetable__actions">
            <button type="button" class="button button--quiet">Wyloguj</button>
            <button type="button" class="timetable__link">Zmień hasło</button>
          </div>
        </section>
      </template>
      <ProgressCharts v-else-if="tab === 'postep'" :stats="STATS" :target="TARGET" :limit="LIMIT" />
      <SettingsPreview v-else class="timetable__card timetable__card--settings" />
    </main>
  </div>
</template>

<style scoped>
/* Granatowe pole jak początek wizytówki. */
.timetable__field {
  --ink: #fff;
  --ink-soft: rgb(255 255 255 / 0.84);
  --hairline: rgb(255 255 255 / 0.26);
  display: grid;
  gap: clamp(1.75rem, 1rem + 3vw, 3rem);
  padding: 0 var(--gutter);
  background: #16224f;
  color: #fff;
}

.timetable__field ::selection {
  background: #fff;
  color: #16224f;
}

.timetable__field :focus-visible {
  outline-color: #fff;
}

.timetable__top,
.timetable__hero,
.timetable__tabs {
  width: 100%;
  max-width: 72rem;
  margin-inline: auto;
}

.timetable__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: var(--header-h);
  border-bottom: 1px solid var(--hairline);
}

.timetable__mark {
  font-weight: 800;
  font-stretch: 88%;
  text-decoration: none;
}

.timetable__map {
  display: flex;
  align-items: center;
  min-height: 2.5rem;
  padding-inline: 1rem;
  border-radius: 999px;
  background: #fff;
  color: #16224f;
  font-size: 0.9375rem;
  font-weight: 700;
  text-decoration: none;
}

.timetable__hero {
  display: grid;
  gap: 2rem;
  align-items: end;
}

.timetable__intro {
  display: grid;
  gap: 1rem;
  justify-items: start;
  container-type: inline-size;
}

/* Rozmiar od szerokości kolumny: „PODSTAWOWA” musi się zmieścić obok tablicy. */
.timetable__title {
  display: grid;
  font-size: min(6rem, 16cqi);
  font-weight: 800;
  font-stretch: 75%;
  line-height: 0.88;
  text-transform: uppercase;
}

.timetable__email {
  color: var(--ink-soft);
}

.timetable__go {
  margin-top: 0.5rem;
  border-color: #fff;
  background: #fff;
  color: #16224f;
}

.timetable__go:hover {
  background: rgb(255 255 255 / 0.88);
}

/* Tablica w kolorach tablicy z wizytówki 3.5: granatowa płyta i żółte lampki. */
.timetable__box {
  container-type: inline-size;
}

.board {
  --cell: min(1.6rem, calc((100cqi - 2.6rem) / 21.6));
  --flap: #232a42;
  --lamp: #ffd35c;
  display: grid;
  gap: 0.9rem;
  padding: 0.9rem 0.9rem 0;
  border-radius: 1rem;
  background: #101421;
  color: #f6f2e9;
  box-shadow:
    0 1px 0 rgb(255 255 255 / 0.08) inset,
    0 26px 40px -24px rgb(0 0 0 / 0.6);
  overflow: hidden;
}

.board__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.25rem 1rem;
  color: var(--lamp);
  font-size: 0.875rem;
  font-weight: 750;
  font-stretch: 82%;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.board__head span {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.board .board__marker {
  --marker-fill: transparent;
  --marker-stroke: var(--lamp);
  font-size: 1.1rem;
}

.board__rows {
  display: grid;
  gap: 0.6rem;
  padding: 0;
  list-style: none;
}

.board__row {
  display: flex;
  justify-content: space-between;
  gap: calc(var(--cell) * 0.6);
}

.board__value {
  --flap: #2c2f3d;
  color: var(--lamp);
}

/* Pasek z matrycy diod pod rzędami, jak na tablicy z wizytówki. */
.board__notice {
  margin-inline: -0.9rem;
  padding: 0.6rem 0.9rem;
  border-top: 1px solid rgb(255 255 255 / 0.12);
  background:
    radial-gradient(circle, rgb(255 211 92 / 0.14) 0.6px, transparent 0.9px) 0 0 / 4px 4px,
    #0b0e18;
  color: var(--lamp);
  font-size: 0.875rem;
  font-weight: 650;
  font-stretch: 82%;
  letter-spacing: 0.09em;
  text-transform: uppercase;
}

.timetable__tabs {
  display: flex;
  gap: 0.25rem;
  overflow-x: auto;
  scrollbar-width: none;
}

.timetable__tab {
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
}

.timetable__tab:hover {
  background: rgb(255 255 255 / 0.12);
}

.timetable__tab[aria-pressed='true'] {
  background: var(--ground);
  color: var(--on-ground);
}

.timetable {
  --on-ground: var(--ink);
}

.timetable__main {
  display: grid;
  gap: 1rem;
  max-width: 72rem;
  margin-inline: auto;
  padding: clamp(1.25rem, 1rem + 1.5vw, 2rem) var(--gutter) 4rem;
}

.timetable__card {
  display: grid;
  gap: 0.9rem;
  justify-items: start;
  padding: clamp(1.25rem, 1rem + 1vw, 1.75rem);
  border-radius: var(--radius-small);
  background: var(--surface);
  box-shadow: var(--card-shadow);
}

.timetable__card--settings {
  justify-items: stretch;
}

.timetable__heading {
  font-size: 1.25rem;
  font-weight: 750;
}

.timetable__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem 1.25rem;
}

.timetable__link {
  min-height: 2.75rem;
  padding: 0;
  border: 0;
  background: none;
  color: var(--ink);
  font: inherit;
  font-weight: 650;
  text-decoration: underline;
  text-underline-offset: 0.25em;
  cursor: pointer;
}

@media (min-width: 56rem) {
  .timetable__hero {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.15fr);
    gap: 3rem;
  }
}
</style>
