<script setup lang="ts">
import { ref } from 'vue'
import ProgressCharts from '@/components/stats/ProgressCharts.vue'
import ProfileCharts from './ProfileCharts.vue'
import SettingsPreview from './SettingsPreview.vue'
import StationField from './StationField.vue'
import { EMAIL, LIMIT, STATS, TARGET, type Tab } from './demo'

// Wersja 1: góra konta to stacja egzaminu z wizytówki. Niżej te same karty z wykresami co dziś,
// na jasnym tle.
const tab = ref<Tab>('profil')
</script>

<template>
  <div>
    <StationField v-model:tab="tab" />

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

.station__card.settings-preview {
  justify-items: stretch;
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
