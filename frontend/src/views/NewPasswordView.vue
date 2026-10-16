<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { setPassword } from '@/account'
import PasswordField from '@/components/account/PasswordField.vue'
import '@/assets/auth.css'

const route = useRoute()
const router = useRouter()

const password = ref('')
const sending = ref(false)
const problem = ref('')
// 400 oznacza wygasły albo użyty link, więc trzeba poprosić o nowy.
const linkExpired = ref(false)

async function savePassword() {
  sending.value = true
  problem.value = ''
  linkExpired.value = false
  const key = route.query.klucz
  try {
    const result = await setPassword(typeof key === 'string' ? key : '', password.value)
    if (result === null) {
      await router.replace({ name: 'account' })
      return
    }
    problem.value = result.message
    linkExpired.value = result.status === 400
  } catch {
    problem.value = 'Serwer nie odpowiada. Spróbuj za chwilę.'
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <main class="auth">
    <h1>Nowe hasło</h1>
    <form class="auth__form" @submit.prevent="savePassword">
      <PasswordField id="password" v-model="password" label="Hasło" autocomplete="new-password">
        <p class="auth__note">Co najmniej 12 znaków.</p>
      </PasswordField>
      <button class="button" type="submit" :disabled="sending">Zapisz hasło</button>
    </form>
    <p v-if="problem" class="auth__problem" role="alert">{{ problem }}</p>
    <p v-if="linkExpired">
      <RouterLink :to="{ name: 'password-link' }">Poproś o nowy link</RouterLink>
    </p>
  </main>
</template>
