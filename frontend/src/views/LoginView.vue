<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { logIn, logInWithGoogle, register, type Problem } from '@/account'
import GoogleButton from '@/components/account/GoogleButton.vue'
import PasswordField from '@/components/account/PasswordField.vue'
import '@/assets/auth.css'

const props = defineProps<{ mode: 'login' | 'register' }>()

const router = useRouter()

const email = ref('')
const password = ref('')
const acceptedTerms = ref(false)
const sending = ref(false)
const problem = ref('')
const noPassword = ref(false)
const sentTo = ref('')

// Strona ustawiania hasła dostaje adres wpisany już w formularzu.
const passwordLink = computed(() => ({
  name: 'password-link',
  query: email.value.trim() ? { adres: email.value.trim() } : {},
}))

// Logowanie i rejestracja to ten sam komponent, więc Vue nie tworzy go od nowa przy przejściu
// między nimi. Wpisany adres może zostać, ale komunikaty dotyczyły poprzedniego formularza.
watch(
  () => props.mode,
  () => {
    problem.value = ''
    noPassword.value = false
    sentTo.value = ''
  },
)

async function send(attempt: () => Promise<Problem | null>, onSuccess: () => unknown) {
  sending.value = true
  problem.value = ''
  noPassword.value = false
  try {
    const result = await attempt()
    if (result === null) {
      await onSuccess()
      return
    }
    problem.value = result.message
    // 403 przy logowaniu oznacza konto założone przez Google, które nie ma jeszcze hasła.
    noPassword.value = result.status === 403
  } catch {
    problem.value = 'Serwer nie odpowiada. Spróbuj za chwilę.'
  } finally {
    sending.value = false
  }
}

function openAccount() {
  return router.replace({ name: 'account' })
}

function submitForm() {
  if (props.mode === 'login') {
    return send(() => logIn(email.value, password.value), openAccount)
  }
  return send(
    () => register(email.value, password.value, acceptedTerms.value),
    () => {
      sentTo.value = email.value.trim()
    },
  )
}

// Link z maila mógł zostać otwarty na telefonie, który zalogował tylko siebie. Ta karta wciąż
// pamięta adres i hasło z formularza, więc wystarczy nimi się zalogować.
function logInAfterConfirming() {
  return send(() => logIn(email.value, password.value), openAccount)
}

function submitGoogle(credential: string) {
  return send(() => logInWithGoogle(credential), openAccount)
}
</script>

<template>
  <main class="auth">
    <h1>{{ mode === 'login' ? 'Logowanie' : 'Rejestracja' }}</h1>
    <template v-if="sentTo">
      <p role="status">Wysłaliśmy link na adres {{ sentTo }}. Kliknij go, żeby założyć konto.</p>
      <p class="auth__note">Link jest ważny 24 godziny. Jeśli maila nie ma, zajrzyj do spamu.</p>
      <p>Jeśli link z maila otwarto na innym urządzeniu, zaloguj się tutaj:</p>
      <button class="button" type="button" :disabled="sending" @click="logInAfterConfirming">
        Adres potwierdzony, zaloguj mnie
      </button>
      <p v-if="problem" class="auth__problem" role="alert">{{ problem }}</p>
    </template>
    <template v-else>
      <GoogleButton @credential="submitGoogle" />
      <p class="auth__note">
        Kontynuując przez Google, akceptujesz
        <RouterLink :to="{ name: 'terms' }" target="_blank">regulamin</RouterLink> i
        <RouterLink :to="{ name: 'privacy' }" target="_blank">politykę prywatności</RouterLink>.
      </p>
      <p class="auth__note">albo e-mailem</p>
      <form class="auth__form" @submit.prevent="submitForm">
        <label>
          E-mail
          <input v-model="email" type="email" autocomplete="email" required />
        </label>
        <PasswordField
          id="password"
          v-model="password"
          label="Hasło"
          :autocomplete="mode === 'login' ? 'current-password' : 'new-password'"
        >
          <p v-if="mode === 'register'" class="auth__note">Co najmniej 12 znaków.</p>
        </PasswordField>
        <!-- Linki otwierają się w nowej karcie, żeby nie zgubić wpisanych danych. -->
        <label v-if="mode === 'register'" class="auth__consent">
          <input v-model="acceptedTerms" type="checkbox" required />
          <span>
            Akceptuję
            <RouterLink :to="{ name: 'terms' }" target="_blank">regulamin</RouterLink> i
            <RouterLink :to="{ name: 'privacy' }" target="_blank">politykę prywatności</RouterLink>.
          </span>
        </label>
        <button class="button" type="submit" :disabled="sending">
          {{ mode === 'login' ? 'Zaloguj się' : 'Załóż konto' }}
        </button>
      </form>
      <p v-if="problem" class="auth__problem" role="alert">{{ problem }}</p>
      <p v-if="noPassword"><RouterLink :to="passwordLink">Dodaj hasło</RouterLink></p>
      <template v-if="mode === 'login'">
        <p><RouterLink :to="passwordLink">Nie pamiętam hasła</RouterLink></p>
        <p>Nie masz konta? <RouterLink :to="{ name: 'register' }">Załóż konto</RouterLink></p>
      </template>
      <p v-else>Masz już konto? <RouterLink :to="{ name: 'login' }">Zaloguj się</RouterLink></p>
    </template>
  </main>
</template>
