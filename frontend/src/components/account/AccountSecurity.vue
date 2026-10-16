<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { changePassword, deleteAccount, logOutEverywhere } from '@/account'
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
// Formularz usuwania pojawia się dopiero po kliknięciu „Usuń konto”, żeby nie kusił na co dzień.
const deleting = ref(false)
const deleteEmail = ref('')
const deleteProblem = ref('')

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

async function removeAccount() {
  deleteProblem.value = ''
  try {
    const result = await deleteAccount(deleteEmail.value)
    if (result) {
      deleteProblem.value = result.message
      return
    }
    await router.replace({ name: 'login' })
  } catch {
    deleteProblem.value = 'Serwer nie odpowiada. Spróbuj za chwilę.'
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
    <h3>Usunięcie konta</h3>
    <button
      v-if="!deleting"
      class="button button--quiet"
      type="button"
      @click="deleting = true"
    >
      Usuń konto
    </button>
    <form v-else class="auth__form security__delete" @submit.prevent="removeAccount">
      <p>Usunięcia nie da się cofnąć. Znikną konto i wszystkie jego dane.</p>
      <label>
        Wpisz adres konta, żeby potwierdzić
        <input id="delete-email" v-model="deleteEmail" type="email" autocomplete="off" required />
      </label>
      <button class="button" type="submit">Usuń konto na zawsze</button>
      <p v-if="deleteProblem" class="auth__problem" role="alert">{{ deleteProblem }}</p>
    </form>
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
