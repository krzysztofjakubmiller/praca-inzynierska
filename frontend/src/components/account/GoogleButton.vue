<script setup lang="ts">
import { onMounted, ref, useTemplateRef } from 'vue'
import { GOOGLE_CLIENT_ID, loadGoogleScript } from '@/google'

const emit = defineEmits<{ credential: [credential: string] }>()

const container = useTemplateRef('container')
const unavailable = ref(false)

onMounted(async () => {
  try {
    await loadGoogleScript()
  } catch {
    unavailable.value = true
    return
  }
  // Użytkownik mógł przejść na inną stronę, zanim skrypt się wczytał.
  if (!container.value) return
  const google = window.google!.accounts.id
  google.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: (response) => emit('credential', response.credential),
  })
  google.renderButton(container.value, {
    theme: 'outline',
    // W rozmiarze medium Google nie podmienia przycisku na „Kontynuuj jako …” z imieniem
    // zalogowanego użytkownika, więc strona nie przeskakuje przy wczytywaniu.
    size: 'medium',
    text: 'continue_with',
    shape: 'pill',
    locale: 'pl',
    // Szerokość formularza; więcej niż 400 px Google nie przyjmuje.
    width: String(Math.min(container.value.clientWidth, 400)),
  })
})
</script>

<template>
  <div class="google-button">
    <div v-if="!unavailable" ref="container" class="google-button__slot" />
    <p v-else class="google-button__problem">
      Nie udało się wczytać logowania przez Google.
    </p>
  </div>
</template>

<style scoped>
/* Miejsce zajęte od razu, żeby formularz nie zjeżdżał w dół, gdy skrypt Google narysuje przycisk. */
.google-button__slot {
  min-height: 32px;
}

.google-button__problem {
  color: var(--ink-soft);
}
</style>
