<script setup lang="ts">
import { ref } from 'vue'
import ProgressCharts from '@/components/stats/ProgressCharts.vue'
import ProfileCharts from './ProfileCharts.vue'
import SettingsPreview from './SettingsPreview.vue'
import StationField from './StationField.vue'
import TicketPass from './TicketPass.vue'
import { EMAIL, LIMIT, PAYMENTS, STATS, TABS_WITH_PAYMENTS, TARGET, TICKET, type Tab } from './demo'

// Wersja 1: góra konta to stacja egzaminu z wizytówki. Niżej te same karty z wykresami co dziś,
// na jasnym tle. Bilet ma własną zakładkę razem z historią płatności.
const tab = ref<Tab>('profil')

const FACTS = [
  { name: 'Bilet', value: TICKET.name },
  { name: 'Cena', value: TICKET.price },
  { name: 'Ważny do', value: TICKET.until },
  { name: 'Zostało', value: TICKET.left },
]
</script>

<template>
  <div>
    <StationField v-model:tab="tab" :tabs="TABS_WITH_PAYMENTS" />

    <main class="station__main">
      <template v-if="tab === 'profil'">
        <ProfileCharts />
        <section class="station__card" aria-labelledby="station-account">
          <h2 id="station-account" class="station__heading">Konto</h2>
          <p>Zalogowano jako {{ EMAIL }}</p>
          <div class="station__actions">
            <button type="button" class="button button--quiet">Wyloguj</button>
            <button type="button" class="station__link">Zmień hasło</button>
          </div>
        </section>
      </template>
      <ProgressCharts v-else-if="tab === 'postep'" :stats="STATS" :target="TARGET" :limit="LIMIT" />
      <div v-else-if="tab === 'platnosci'" class="station__payments">
        <TicketPass :facts="FACTS" />
        <section class="station__card station__card--wide" aria-labelledby="station-history">
          <h2 id="station-history" class="station__heading">Historia płatności</h2>
          <ul class="station__history">
            <li v-for="payment in PAYMENTS" :key="payment.date" class="station__payment">
              <span>
                <strong>{{ payment.name }}</strong>
                <span class="station__when">{{ payment.date }}</span>
              </span>
              <span class="station__amount">{{ payment.amount }}</span>
            </li>
          </ul>
          <p class="station__note">Potwierdzenie każdej płatności przychodzi na {{ EMAIL }}.</p>
        </section>
      </div>
      <SettingsPreview v-else class="station__card" />
    </main>
  </div>
</template>

<style scoped>
.station__main {
  display: grid;
  gap: 1rem;
  max-width: 68rem;
  margin-inline: auto;
  padding: clamp(1.25rem, 1rem + 1.5vw, 2rem) var(--gutter) 4rem;
}

.station__card {
  display: grid;
  gap: 0.9rem;
  justify-items: start;
  padding: clamp(1.25rem, 1rem + 1vw, 1.75rem);
  border-radius: var(--radius-small);
  background: var(--surface);
  box-shadow: var(--card-shadow);
}

.station__card.settings-preview,
.station__card--wide {
  justify-items: stretch;
}

/* Bilet i historia obok siebie; na telefonie bilet jest pierwszy, bo to on mówi, do kiedy
   można się uczyć. */
.station__payments {
  display: grid;
  gap: 1rem;
  align-items: start;
}

.station__payments > .ticket-pass {
  width: min(100%, 24rem);
}

.station__history {
  display: grid;
  padding: 0;
  list-style: none;
}

.station__payment {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 1rem;
  padding-block: 0.85rem;
  border-top: 1px solid var(--hairline);
}

.station__payment > span:first-child {
  display: grid;
}

.station__when {
  color: var(--ink-soft);
  font-size: 0.875rem;
}

.station__amount {
  font-weight: 750;
  font-variant-numeric: tabular-nums;
}

.station__note {
  color: var(--ink-soft);
  font-size: 0.875rem;
}

@media (min-width: 52rem) {
  .station__payments {
    grid-template-columns: 22rem minmax(0, 1fr);
    gap: 1.5rem;
  }

  .station__payments > .ticket-pass {
    width: 100%;
  }
}

.station__heading {
  font-size: 1.25rem;
  font-weight: 750;
}

.station__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem 1.25rem;
}

.station__link {
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
</style>
