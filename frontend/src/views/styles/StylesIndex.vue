<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'

// Podglądy tego, jak styl wizytówki przenosi się na ekrany aplikacji. Każdy styl to wizytówka
// i jej podstrony w jednej liście.
const STYLES: { name: string; pages: { label: string; to: RouteLocationRaw }[] }[] = [
  {
    name: 'Tablica odjazdów',
    pages: [
      { label: 'Wizytówka', to: '/wizytowka/b' },
      { label: 'Logowanie', to: { name: 'style-board-login' } },
      { label: 'Mapa tematów', to: { name: 'style-board-map' } },
      { label: 'Zadanie', to: { name: 'style-board-task' } },
    ],
  },
]
</script>

<template>
  <main class="styles">
    <h1>Style stron</h1>
    <section v-for="style in STYLES" :key="style.name" class="styles__group">
      <h2>{{ style.name }}</h2>
      <ul class="styles__list">
        <li v-for="page in style.pages" :key="page.label">
          <RouterLink :to="page.to">{{ page.label }}</RouterLink>
        </li>
      </ul>
    </section>
    <p><RouterLink :to="{ name: 'home' }">Wróć do listy stron</RouterLink></p>
  </main>
</template>

<style scoped>
.styles {
  display: grid;
  gap: 1.75rem;
  max-width: 40rem;
  margin-inline: auto;
  padding: var(--gutter);
}

.styles h1 {
  font-size: 2rem;
  font-weight: 800;
}

.styles__group {
  display: grid;
  gap: 0.75rem;
}

.styles h2 {
  font-size: 1.35rem;
  font-weight: 750;
}

.styles__list {
  display: grid;
  gap: 0.75rem;
  font-size: 1.15rem;
  font-weight: 600;
}
</style>
