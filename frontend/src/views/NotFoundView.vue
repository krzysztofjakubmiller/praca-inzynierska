<template>
  <main class="not-found">
    <h1 class="not-found__title">Nie ma takiej strony</h1>
    <p class="not-found__text">Adres jest błędny albo strona została usunięta.</p>
    <RouterLink class="button" :to="{ name: 'home' }">Strona główna</RouterLink>
  </main>
</template>

<style scoped>
.not-found {
  display: grid;
  align-content: center;
  justify-items: start;
  gap: 1.25rem;
  min-height: 100svh;
  max-width: 40rem;
  margin-inline: auto;
  padding: var(--gutter);
}

.not-found__title {
  font-size: clamp(2.6rem, 1.4rem + 5vw, 4.5rem);
  font-weight: 800;
  line-height: 0.95;
}

.not-found__text {
  font-size: clamp(1.125rem, 1rem + 0.55vw, 1.4rem);
}
</style>
