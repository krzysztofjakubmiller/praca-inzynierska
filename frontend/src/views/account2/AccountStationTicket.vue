<script setup lang="ts">
import { ref } from 'vue'
import ProgressCharts from '@/components/stats/ProgressCharts.vue'
import ProfileCharts from './ProfileCharts.vue'
import SettingsPreview from './SettingsPreview.vue'
import StationField from './StationField.vue'
import TicketPass from './TicketPass.vue'
import { LIMIT, STATS, TARGET, TICKET, type Tab } from './demo'

// Wersja 5: stacja z wersji 1 na górze i bilet z wersji 2 obok wykresów. Bilet zastępuje osobną
// kartę „Konto”: jest na nim adres ucznia, a pod nim zmiana hasła i wylogowanie. Dni do matury
// pokazuje już pole stacji, więc bilet mówi tylko o sobie.
const tab = ref<Tab>('profil')

const FACTS = [
  { name: 'Bilet', value: TICKET.name },
  { name: 'Ważny do', value: TICKET.until },
  { name: 'Zostało', value: TICKET.left },
]
</script>

<template>
  <div>
    <StationField v-model:tab="tab" />

    <div class="mixed" :class="{ 'mixed--profile': tab === 'profil' }">
      <main class="mixed__main">
        <ProfileCharts v-if="tab === 'profil'" />
        <ProgressCharts
          v-else-if="tab === 'postep'"
          :stats="STATS"
          :target="TARGET"
          :limit="LIMIT"
        />
        <SettingsPreview v-else class="mixed__settings" />
      </main>

      <!-- Na telefonie bilet jest pod wykresami, jak karta konta w wersji 1; na komputerze obok. -->
      <aside v-if="tab === 'profil'" class="mixed__side">
        <TicketPass :facts="FACTS" />
        <div class="mixed__account">
          <button type="button" class="mixed__link">Zmień hasło</button>
          <button type="button" class="mixed__link">Wyloguj</button>
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.mixed {
  display: grid;
  gap: 1.5rem;
  max-width: 68rem;
  margin-inline: auto;
  padding: clamp(1.25rem, 1rem + 1.5vw, 2rem) var(--gutter) 4rem;
}

.mixed__main {
  min-width: 0;
}

.mixed__side {
  display: grid;
  gap: 0.75rem;
  align-content: start;
  width: min(100%, 24rem);
}

.mixed__account {
  display: flex;
  gap: 1.5rem;
  padding-inline: 0.25rem;
}

.mixed__link {
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

.mixed__link:hover {
  color: var(--ink);
}

.mixed__settings {
  padding: clamp(1.25rem, 1rem + 1vw, 1.75rem);
  border-radius: var(--radius-small);
  background: var(--surface);
  box-shadow: var(--card-shadow);
}

@media (min-width: 60rem) {
  .mixed--profile {
    grid-template-columns: minmax(0, 1fr) 21rem;
    gap: 1.5rem;
  }

  .mixed__side {
    position: sticky;
    top: 1.5rem;
    align-self: start;
    width: 100%;
  }
}

/* Na szerokim ekranie bilet wjeżdża na pole stacji, jakby leżał na peronie. Niżej zabrakłoby
   miejsca obok tytułu i przycisku powtórek. */
@media (min-width: 72rem) {
  .mixed__side {
    z-index: 1;
    margin-top: -15rem;
  }
}
</style>
