<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'

// Strona tymczasowa na czas budowy aplikacji: szybkie przejście do każdej strony.
const PAGES: { label: string; to: RouteLocationRaw }[] = [
  { label: 'Wizytówka', to: { name: 'landing' } },
  { label: 'Matura podstawowa (mapa tematów)', to: { name: 'basic-matura' } },
  { label: 'Matura rozszerzona (mapa tematów)', to: { name: 'extended-matura' } },
  { label: 'Panel właściciela', to: { name: 'panel' } },
  { label: 'Wkrótce', to: { name: 'coming-soon' } },
  { label: 'Strona 404', to: '/nie-ma-takiej-strony' },
]
</script>

<template>
  <main class="start">
    <h1>Strony</h1>
    <ul class="start__list">
      <li v-for="page in PAGES" :key="page.label">
        <RouterLink :to="page.to">{{ page.label }}</RouterLink>
      </li>
    </ul>
  </main>
</template>

<style scoped>
.start {
  display: grid;
  gap: 1.5rem;
  max-width: 40rem;
  margin-inline: auto;
  padding: var(--gutter);
}

.start h1 {
  font-size: 2rem;
  font-weight: 800;
}

.start__list {
  display: grid;
  gap: 0.75rem;
  font-size: 1.15rem;
  font-weight: 600;
}
</style>
