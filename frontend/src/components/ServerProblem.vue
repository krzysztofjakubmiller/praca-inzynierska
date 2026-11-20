<script setup lang="ts">
// Zamiast pustej strony, gdy serwer chwilowo nie odpowiada. Co znaczy „ponownie”, wie strona,
// która go pokazuje: jedna wczytuje jeszcze raz zadanie, inna całą stronę.
defineEmits<{ retry: [] }>()
</script>

<template>
  <section class="server-problem" role="alert">
    <h2 class="server-problem__title">Serwer nie odpowiada</h2>
    <p class="server-problem__text">Sprawdź internet albo spróbuj za chwilę.</p>
    <button type="button" class="button" @click="$emit('retry')">Spróbuj ponownie</button>
  </section>
</template>

<style scoped>
.server-problem {
  display: grid;
  justify-items: start;
  gap: 0.75rem;
  padding: clamp(1.25rem, 1rem + 1vw, 1.75rem);
  border-radius: var(--radius-small);
  background: var(--surface);
  color: var(--ink);
  box-shadow: var(--card-shadow);
}

.server-problem__title {
  font-size: 1.375rem;
  font-weight: 750;
}

.server-problem__text {
  color: var(--ink-soft);
}

.server-problem .button {
  margin-top: 0.25rem;
}
</style>
