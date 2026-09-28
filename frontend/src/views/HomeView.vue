<script setup lang="ts">
import { PRODUCT_NAME } from '@/config/product'
</script>

<template>
  <main class="home">
    <h1>{{ PRODUCT_NAME }}</h1>
    <nav aria-label="Strony">
      <ul class="home__links">
        <li><RouterLink :to="{ name: 'landing-a' }">Wizytówka A</RouterLink></li>
        <li><RouterLink :to="{ name: 'landing-b' }">Wizytówka B</RouterLink></li>
        <li><RouterLink :to="{ name: 'basic-matura' }">Matura podstawowa</RouterLink></li>
      </ul>
    </nav>
  </main>
</template>

<style scoped>
.home {
  display: grid;
  gap: 1.5rem;
  padding: var(--gutter);
}

.home__links {
  display: grid;
  gap: 0.75rem;
  padding: 0;
  list-style: none;
  font-size: 1.25rem;
}
</style>
