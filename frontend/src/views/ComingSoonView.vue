<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

// Po wejściu prosto z linku nie ma strony, do której można wrócić.
function goBack() {
  if (window.history.state?.back) router.back()
  else router.push({ name: 'home' })
}
</script>

<template>
  <main class="soon">
    <h1 class="soon__title">Wkrótce</h1>
    <p class="soon__text">Zakup biletów i kosztorys jeszcze nie działają. Pracujemy nad tym.</p>
    <button type="button" class="button button--quiet" @click="goBack">Wróć</button>
  </main>
</template>

<style scoped>
.soon {
  display: grid;
  align-content: center;
  justify-items: start;
  gap: 1.25rem;
  min-height: 100svh;
  padding: var(--gutter);
  max-width: 40rem;
  margin-inline: auto;
}

.soon__title {
  font-size: clamp(3rem, 1.4rem + 6.4vw, 6rem);
  font-weight: 800;
  font-stretch: 112%;
  letter-spacing: -0.035em;
}

.soon__text {
  max-width: 32ch;
  font-size: clamp(1.125rem, 1rem + 0.55vw, 1.4rem);
  line-height: 1.45;
}
</style>
