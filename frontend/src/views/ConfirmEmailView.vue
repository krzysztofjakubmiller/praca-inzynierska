<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { confirmEmail } from '@/account'
import '@/assets/auth.css'

const route = useRoute()
const router = useRouter()

const problem = ref('')

// Strona otwiera się z linku w mailu, więc klucz wysyłamy od razu, bez klikania.
onMounted(async () => {
  const key = route.query.klucz
  try {
    const result = await confirmEmail(typeof key === 'string' ? key : '')
    if (result === null) {
      await router.replace({ name: 'account' })
      return
    }
    problem.value = result.message
  } catch {
    problem.value = 'Serwer nie odpowiada. Spróbuj za chwilę.'
  }
})
</script>

<template>
  <main class="auth">
    <h1>Potwierdzenie adresu</h1>
    <p v-if="!problem">Zakładamy konto.</p>
    <template v-else>
      <p class="auth__problem" role="alert">{{ problem }}</p>
      <p><RouterLink :to="{ name: 'register' }">Zarejestruj się jeszcze raz</RouterLink></p>
    </template>
  </main>
</template>
