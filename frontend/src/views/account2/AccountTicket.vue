<script setup lang="ts">
import { ref } from 'vue'
import ArrowIcon from '@/components/landing/ArrowIcon.vue'
import ProgressCharts from '@/components/stats/ProgressCharts.vue'
import { PRODUCT_NAME } from '@/config/product'
import ProfileCharts from './ProfileCharts.vue'
import SettingsPreview from './SettingsPreview.vue'
import TicketPass from './TicketPass.vue'
import {
  DAYS_LEFT_TEXT,
  EXAM,
  EXAM_DATE,
  LIMIT,
  REVIEWS_TODAY_TEXT,
  SCORE,
  STATS,
  STREAK_TEXT,
  TABS,
  TARGET,
  TICKET,
  WEEK_TASKS,
  type Tab,
} from './demo'

// Wersja 2: konto zaczyna się od biletu ucznia, takiego jak w kasowniku na wizytówce. Bilet
// zbiera to, co stałe (egzamin, ważność, adres), a obok jest to, co zmienia się co dzień.
const tab = ref<Tab>('profil')

const FACTS = [
  { name: 'Bilet', value: TICKET.name },
  { name: 'Ważny do', value: TICKET.until },
  { name: 'Matura', value: EXAM_DATE },
  { name: 'Zostało', value: DAYS_LEFT_TEXT },
]
</script>

<template>
  <div class="pass">
    <header class="pass__top">
      <RouterLink class="pass__mark" :to="{ name: 'landing' }">{{ PRODUCT_NAME }}</RouterLink>
      <nav class="pass__tabs" aria-label="Konto">
        <button
          v-for="item in TABS"
          :key="item.id"
          type="button"
          class="pass__tab"
          :aria-pressed="tab === item.id"
          @click="tab = item.id"
        >
          {{ item.label }}
        </button>
      </nav>
      <RouterLink class="pass__map" :to="{ name: 'basic-matura' }">Mapa</RouterLink>
    </header>

    <div class="pass__layout">
      <aside class="pass__side">
        <TicketPass :facts="FACTS" :level="1" />
        <div class="pass__account">
          <button type="button" class="pass__link">Zmień hasło</button>
          <button type="button" class="pass__link">Wyloguj</button>
        </div>
      </aside>

      <main class="pass__content">
        <template v-if="tab === 'profil'">
          <section class="pass__today" aria-labelledby="pass-today">
            <h2 id="pass-today" class="pass__title">Na dziś {{ REVIEWS_TODAY_TEXT }}</h2>
            <ul class="pass__numbers">
              <li>
                <strong>{{ STREAK_TEXT }}</strong>
                <span>nauki z rzędu</span>
              </li>
              <li>
                <strong>{{ WEEK_TASKS }}</strong>
                <span>zadań w 7 dni</span>
              </li>
              <li>
                <strong>{{ SCORE }}%</strong>
                <span>skuteczności</span>
              </li>
            </ul>
            <RouterLink class="button" :to="{ name: 'reviews', params: { exam: EXAM.id } }">
              Zacznij powtórki
              <ArrowIcon />
            </RouterLink>
          </section>
          <ProfileCharts />
        </template>
        <ProgressCharts
          v-else-if="tab === 'postep'"
          :stats="STATS"
          :target="TARGET"
          :limit="LIMIT"
        />
        <SettingsPreview v-else class="pass__settings" />
      </main>
    </div>
  </div>
</template>

<style scoped>
.pass__top {
  position: relative;
  z-index: 1;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 1rem;
  min-height: var(--header-h);
  padding-inline: var(--gutter);
  background: var(--surface);
  box-shadow: var(--card-shadow);
}

.pass__mark {
  margin-right: auto;
  font-weight: 800;
  font-stretch: 88%;
  text-decoration: none;
  white-space: nowrap;
}

/* Na telefonie zakładki schodzą do drugiego rzędu paska, bo obok nazwy i mapy się nie mieszczą. */
.pass__tabs {
  display: flex;
  order: 1;
  flex-basis: 100%;
  margin-left: -0.6rem;
}

/* Zakładki jak przełącznik ekranów w makiecie aplikacji: aktywna jest podkreślona. */
.pass__tab {
  flex: none;
  min-height: 2.75rem;
  padding-inline: 0.6rem;
  border: 0;
  background: none;
  color: var(--ink-soft);
  font: inherit;
  font-size: 0.9375rem;
  font-weight: 650;
  cursor: pointer;
}

.pass__tab:hover {
  color: var(--ink);
}

.pass__tab[aria-pressed='true'] {
  color: var(--ink);
  text-decoration: underline;
  text-decoration-thickness: 0.14em;
  text-underline-offset: 0.3em;
}

.pass__map {
  display: flex;
  align-items: center;
  min-height: 2.5rem;
  padding-inline: 1rem;
  border-radius: 999px;
  background: var(--ink);
  color: var(--ground);
  font-size: 0.9375rem;
  font-weight: 700;
  text-decoration: none;
}

.pass__layout {
  display: grid;
  gap: 2rem;
  max-width: 72rem;
  margin-inline: auto;
  padding: clamp(1.25rem, 1rem + 2vw, 2.75rem) var(--gutter) 4rem;
}

.pass__side {
  display: grid;
  gap: 1rem;
  align-content: start;
  width: min(100%, 24rem);
}

.pass__account {
  display: flex;
  gap: 1.5rem;
  padding-inline: 0.25rem;
}

.pass__link {
  min-height: 2.75rem;
  padding: 0;
  border: 0;
  background: none;
  color: var(--ink-soft);
  font: inherit;
  font-weight: 650;
  text-decoration: underline;
  text-underline-offset: 0.25em;
  cursor: pointer;
}

.pass__link:hover {
  color: var(--ink);
}

.pass__content {
  display: grid;
  gap: 1.5rem;
  align-content: start;
  min-width: 0;
}

.pass__today {
  display: grid;
  gap: 1.25rem;
  justify-items: start;
}

.pass__title {
  font-size: clamp(2.25rem, 1.5rem + 3vw, 3.75rem);
  font-weight: 800;
  font-stretch: 75%;
  line-height: 0.92;
  text-transform: uppercase;
}

.pass__numbers {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem 2rem;
  padding: 0;
  list-style: none;
}

.pass__numbers li {
  display: grid;
}

.pass__numbers strong {
  font-size: 1.5rem;
  font-weight: 800;
  font-stretch: 82%;
  font-variant-numeric: tabular-nums;
}

.pass__numbers span {
  color: var(--ink-soft);
  font-size: 0.875rem;
}

.pass__settings {
  padding: clamp(1.25rem, 1rem + 1vw, 1.75rem);
  border-radius: var(--radius-small);
  background: var(--surface);
  box-shadow: var(--card-shadow);
}

@media (min-width: 40rem) {
  .pass__tabs {
    order: 0;
    flex-basis: auto;
    margin: 0 auto 0 0;
  }
}

@media (min-width: 60rem) {
  .pass__layout {
    grid-template-columns: 22rem minmax(0, 1fr);
    gap: 2.5rem;
  }

  .pass__side {
    position: sticky;
    top: 1.5rem;
  }
}
</style>
