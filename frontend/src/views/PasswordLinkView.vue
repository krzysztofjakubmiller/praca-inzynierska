<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { requestPasswordLink } from '@/account'
import '@/assets/auth.css'

const route = useRoute()

const email = ref(typeof route.query.adres === 'string' ? route.query.adres : '')
const sending = ref(false)
const problem = ref('')
const sentTo = ref('')

async function sendLink() {
  sending.value = true
  problem.value = ''
  try {
    const result = await requestPasswordLink(email.value)
    if (result === null) {
      sentTo.value = email.value.trim()
      return
    }
    problem.value = result.message
  } catch {
    problem.value = 'Serwer nie odpowiada. Spróbuj za chwilę.'
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <main class="auth">
    <h1>Ustaw hasło</h1>
    <template v-if="sentTo">
      <p role="status">Wysłaliśmy link na adres {{ sentTo }}. Kliknij go, żeby ustawić hasło.</p>
      <p class="auth__note">Link jest ważny godzinę. Jeśli maila nie ma, zajrzyj do spamu.</p>
    </template>
    <template v-else>
      <p>
        Wyślemy link do ustawienia nowego hasła. Tak samo dodasz hasło do konta założonego przez
        Google.
      </p>
      <form class="auth__form" @submit.prevent="sendLink">
        <label>
          E-mail
          <input v-model="email" type="email" autocomplete="email" required />
        </label>
        <button class="button" type="submit" :disabled="sending">Wyślij link</button>
      </form>
      <p v-if="problem" class="auth__problem" role="alert">{{ problem }}</p>
    </template>
    <p><RouterLink :to="{ name: 'login' }">Wróć do logowania</RouterLink></p>
  </main>
</template>
