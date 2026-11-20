<script setup lang="ts">
import { ref } from 'vue'
import ArrowIcon from '@/components/landing/ArrowIcon.vue'
import ActivityHeatmap from '@/components/stats/ActivityHeatmap.vue'
import ForecastRange from '@/components/stats/ForecastRange.vue'
import LineProgress from '@/components/stats/LineProgress.vue'
import ProgressCharts from '@/components/stats/ProgressCharts.vue'
import StatCard from '@/components/stats/StatCard.vue'
import WeekNumbers from '@/components/stats/WeekNumbers.vue'
import { PRODUCT_NAME } from '@/config/product'
import { shortDate } from '@/stats/stats'
import SettingsPreview from './SettingsPreview.vue'
import {
  DAYS_LEFT_TEXT,
  EMAIL,
  EXAM,
  EXAM_DATE,
  LAST_SHEET,
  LIMIT,
  REVIEWS_TODAY_TEXT,
  ROUTE_START,
  STATS,
  TABS,
  TARGET,
  TRAVELLED,
  type Tab,
} from './demo'

// Wersja 4: spokojna strona bez kart. Zakładki konta to stacje na linii w kolorze egzaminu,
// a wykresy stoją wprost na tle, oddzielone cienkimi kreskami.
const tab = ref<Tab>('profil')
</script>

<template>
  <div class="route" :style="{ '--line': `var(--exam-${EXAM.id})` }">
    <header class="route__top">
      <RouterLink class="route__mark" :to="{ name: 'landing' }">{{ PRODUCT_NAME }}</RouterLink>
      <RouterLink class="route__map" :to="{ name: 'basic-matura' }">
        Mapa tematów
        <ArrowIcon />
      </RouterLink>
    </header>

    <div class="route__layout">
      <aside class="route__side">
        <nav class="route__stops" aria-label="Konto">
          <button
            v-for="item in TABS"
            :key="item.id"
            type="button"
            class="route__stop"
            :aria-pressed="tab === item.id"
            @click="tab = item.id"
          >
            <span class="route__dot" aria-hidden="true" />
            {{ item.label }}
          </button>
        </nav>
        <p class="route__email">{{ EMAIL }}</p>
      </aside>

      <main class="route__main">
        <template v-if="tab === 'profil'">
          <section class="route__head" aria-labelledby="route-title">
            <h1 id="route-title" class="route__title">{{ DAYS_LEFT_TEXT }} do matury</h1>
            <div class="route__strip">
              <div class="route__track" aria-hidden="true">
                <span :style="{ width: `${TRAVELLED * 100}%` }" />
              </div>
              <p class="route__ends">
                <span>{{ shortDate(ROUTE_START) }}</span>
                <span>{{ EXAM_DATE }}</span>
              </p>
            </div>
            <RouterLink class="route__go" :to="{ name: 'reviews', params: { exam: EXAM.id } }">
              Na dziś {{ REVIEWS_TODAY_TEXT }}
              <ArrowIcon />
            </RouterLink>
          </section>

          <StatCard
            v-slot="{ width }"
            class="route__part"
            title="Ostatnie 4 tygodnie"
            note="Dni nauki z rzędu łączy linia. Liczby pod spodem dotyczą ostatnich 7 dni."
          >
            <WeekNumbers
              :days="STATS.days"
              :recent-score="STATS.recentScore"
              :today="STATS.today"
              :width="width"
            />
          </StatCard>
          <div class="route__pair">
            <StatCard
              v-if="STATS.forecast"
              v-slot="{ width }"
              class="route__part"
              title="Prognoza wyniku"
              note="Szacunek na dzień matury, liczony z powtórek i wag działów."
            >
              <ForecastRange
                :forecast="STATS.forecast"
                :target="TARGET"
                :last-sheet="LAST_SHEET"
                :width="width"
              />
            </StatCard>
            <StatCard
              v-slot="{ width }"
              class="route__part"
              title="Kalendarz nauki"
              note="Kafelek to dzień."
            >
              <ActivityHeatmap :days="STATS.days" :today="STATS.today" :width="width" />
            </StatCard>
          </div>
          <StatCard class="route__part" title="Linie mapy">
            <LineProgress :lines="STATS.lines" />
          </StatCard>

          <section class="route__account" aria-labelledby="route-account">
            <h2 id="route-account" class="route__heading">Konto</h2>
            <p>Zalogowano jako {{ EMAIL }}</p>
            <div class="route__actions">
              <button type="button" class="button button--quiet">Wyloguj</button>
              <button type="button" class="route__link">Zmień hasło</button>
            </div>
          </section>
        </template>
        <ProgressCharts
          v-else-if="tab === 'postep'"
          :stats="STATS"
          :target="TARGET"
          :limit="LIMIT"
        />
        <SettingsPreview v-else />
      </main>
    </div>
  </div>
</template>

<style scoped>
.route__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 72rem;
  min-height: var(--header-h);
  margin-inline: auto;
  padding-inline: var(--gutter);
}

.route__mark {
  font-weight: 800;
  font-stretch: 88%;
  text-decoration: none;
}

.route__map {
  display: inline-flex;
  align-items: center;
  gap: 0.5em;
  min-height: 2.75rem;
  font-weight: 650;
}

.route__layout {
  display: grid;
  gap: 1.5rem;
  max-width: 72rem;
  margin-inline: auto;
  padding: 0.5rem var(--gutter) 4rem;
}

.route__side {
  display: grid;
  gap: 1rem;
  align-content: start;
}

/* Zakładki jako stacje na linii: na telefonie linia biegnie w poprzek, na komputerze w dół. */
.route__stops {
  position: relative;
  display: flex;
  justify-content: space-between;
}

.route__stops::before {
  content: '';
  position: absolute;
  top: calc(1.375rem - 0.2rem);
  right: 0.7rem;
  left: 0.7rem;
  height: 0.4rem;
  border-radius: 999px;
  background: var(--line);
}

.route__stop {
  position: relative;
  display: grid;
  justify-items: center;
  gap: 0.35rem;
  min-width: 4.5rem;
  padding: 0.7rem 0 0;
  border: 0;
  background: none;
  color: var(--ink-soft);
  font: inherit;
  font-weight: 650;
  cursor: pointer;
}

.route__stop:first-child {
  justify-items: start;
}

.route__stop:last-child {
  justify-items: end;
}

.route__dot {
  width: 1.4rem;
  height: 1.4rem;
  margin-top: -0.35rem;
  border: 0.25rem solid var(--line);
  border-radius: 50%;
  background: var(--ground);
}

.route__stop:hover {
  color: var(--ink);
}

.route__stop[aria-pressed='true'] {
  color: var(--ink);
  font-weight: 800;
}

.route__stop[aria-pressed='true'] .route__dot {
  border-color: var(--ink);
  background: var(--ink);
}

.route__email {
  display: none;
  color: var(--ink-soft);
  font-size: 0.875rem;
  overflow-wrap: anywhere;
}

.route__main {
  display: grid;
  min-width: 0;
}

.route__head {
  display: grid;
  gap: 1.25rem;
  justify-items: start;
  padding-bottom: 2.5rem;
}

.route__title {
  max-width: 12ch;
  font-size: clamp(2.75rem, 1.6rem + 5vw, 5.5rem);
  font-weight: 800;
  font-stretch: 75%;
  line-height: 0.9;
  text-transform: uppercase;
}

.route__strip {
  display: grid;
  gap: 0.4rem;
  width: min(100%, 36rem);
}

.route__track {
  height: 0.4rem;
  border-radius: 999px;
  background: var(--track);
}

.route__track span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--line);
}

.route__ends {
  display: flex;
  justify-content: space-between;
  color: var(--ink-soft);
  font-size: 0.875rem;
}

.route__go {
  display: inline-flex;
  align-items: center;
  gap: 0.5em;
  min-height: 2.75rem;
  font-size: clamp(1.125rem, 1rem + 0.5vw, 1.375rem);
  font-weight: 750;
  text-underline-offset: 0.2em;
}

.route__go:hover {
  --nudge: 0.2em;
  text-decoration-thickness: 2px;
}

/* Wykres bez karty: tytuł, kreska nad nim i dużo powietrza. Dwie klasy, żeby wygrać z wyglądem
   karty w samym StatCard. */
.route__main .route__part {
  padding: 1.5rem 0 2rem;
  border-top: 1px solid var(--hairline);
  border-radius: 0;
  background: none;
  box-shadow: none;
}

.route__part :deep(.stat-card__title) {
  font-size: 1.25rem;
  font-weight: 800;
  font-stretch: 82%;
  text-transform: uppercase;
}

.route__pair {
  display: grid;
}

.route__account {
  display: grid;
  gap: 0.9rem;
  justify-items: start;
  padding-top: 1.5rem;
  border-top: 1px solid var(--hairline);
}

.route__heading {
  font-size: 1.25rem;
  font-weight: 800;
  font-stretch: 82%;
  text-transform: uppercase;
}

.route__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem 1.25rem;
}

.route__link {
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
  .route__layout {
    grid-template-columns: 11rem minmax(0, 1fr);
    gap: 3rem;
    padding-top: 2rem;
  }

  .route__side {
    position: sticky;
    top: 1.5rem;
  }

  .route__stops {
    flex-direction: column;
    gap: 1.75rem;
  }

  .route__stops::before {
    top: 0.7rem;
    bottom: 0.7rem;
    left: calc(0.7rem - 0.2rem);
    right: auto;
    width: 0.4rem;
    height: auto;
  }

  .route__stop,
  .route__stop:first-child,
  .route__stop:last-child {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    min-width: 0;
    min-height: 2.75rem;
    padding: 0;
  }

  .route__dot {
    margin-top: 0;
  }

  .route__email {
    display: block;
  }

  .route__pair {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    column-gap: 2.5rem;
  }
}
</style>
