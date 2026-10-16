<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { changePassword, logOutEverywhere } from '@/account'
import PasswordField from '@/components/account/PasswordField.vue'
import '@/assets/auth.css'

const props = defineProps<{ hasPassword: boolean }>()

const router = useRouter()

// Po dodaniu hasła do konta z Google formularz od razu przechodzi w zmianę hasła.
const passwordSet = ref(props.hasPassword)
const current = ref('')
const next = ref('')
const sending = ref(false)
const problem = ref('')
const saved = ref(false)

async function savePassword() {
  sending.value = true
  problem.value = ''
  saved.value = false
  try {
    const result = await changePassword(passwordSet.value ? current.value : null, next.value)
    if (result) {
      problem.value = result.message
      return
    }
    passwordSet.value = true
    saved.value = true
    current.value = ''
    next.value = ''
  } catch {
    problem.value = 'Serwer nie odpowiada. Spróbuj za chwilę.'
  } finally {
    sending.value = false
  }
}

async function logOutAllDevices() {
  try {
    const result = await logOutEverywhere()
    if (result) {
      problem.value = result.message
      return
    }
    await router.replace({ name: 'login' })
  } catch {
    problem.value = 'Serwer nie odpowiada. Spróbuj za chwilę.'
  }
}
</script>

<template>
  <section class="security">
    <h2>Bezpieczeństwo</h2>
    <form class="auth__form" @submit.prevent="savePassword">
      <h3>{{ passwordSet ? 'Zmień hasło' : 'Dodaj hasło' }}</h3>
      <p v-if="!passwordSet" class="auth__note">
        Konto loguje się przez Google. Z hasłem zalogujesz się też samym adresem e-mail.
      </p>
      <PasswordField
        v-if="passwordSet"
        id="current-password"
        v-model="current"
        label="Obecne hasło"
        autocomplete="current-password"
      />
      <PasswordField id="new-password" v-model="next" label="Nowe hasło" autocomplete="new-password">
        <p class="auth__note">Co najmniej 12 znaków.</p>
      </PasswordField>
      <button class="button" type="submit" :disabled="sending">Zapisz hasło</button>
    </form>
    <p v-if="saved" role="status">Hasło zapisane.</p>
    <p v-if="problem" class="auth__problem" role="alert">{{ problem }}</p>
    <button class="button button--quiet" type="button" @click="logOutAllDevices">
      Wyloguj ze wszystkich urządzeń
    </button>
  </section>
</template>

<style scoped>
.security {
  display: grid;
  gap: 1rem;
  justify-items: start;
  width: 100%;
}

.security h2 {
  font-size: 1.4rem;
  font-weight: 800;
}

.security h3 {
  font-size: 1.1rem;
  font-weight: 700;
}
</style>
