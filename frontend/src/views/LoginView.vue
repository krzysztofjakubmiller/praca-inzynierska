<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { logIn, logInWithGoogle, register, type Problem } from '@/account'
import { EXAMS, type Exam } from '@/config/exams'
import { PRODUCT_NAME } from '@/config/product'
import { usePageGround } from '@/landing2/pageGround'
import { readPurchase } from '@/purchase'
import GoogleButton from '@/components/account/GoogleButton.vue'
import PasswordField from '@/components/account/PasswordField.vue'
import SolidFigure from '@/components/landing2/SolidFigure.vue'
import '@/assets/auth.css'
import '@/views/landing3/screens/screens.css'

const props = defineProps<{ mode: 'login' | 'register' }>()

const router = useRouter()
const route = useRoute()
// Logowanie w drodze po bilet pokazuje bryłę wybranego egzaminu, a potem prowadzi do płatności.
const purchase = computed(() => readPurchase(route.query))
// Bez wybranego biletu ekran pokazuje bryłę matury podstawowej.
const solid = computed(() => purchase.value.exam ?? EXAMS[1]!)
const SOLID_COLORS: Record<Exam['id'], string> = {
  e8: '#7fb0ff',
  'matura-podstawowa': '#4fd58d',
  'matura-rozszerzona': '#ff7a69',
}

usePageGround('#16224f')

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
  return router.replace(
    purchase.value.exam ? { name: 'payment', query: route.query } : { name: 'account' },
  )
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
  <div class="as as--a">
    <header class="as-top">
      <RouterLink class="as-top__mark" :to="{ name: 'home' }">{{ PRODUCT_NAME }}</RouterLink>
    </header>
    <main class="login">
      <div class="login__solid" :style="{ color: SOLID_COLORS[solid.id] }" aria-hidden="true">
        <SolidFigure :key="solid.id" :kind="solid.solid" :spin="0.12" :fill="0.9" :weight="0.035" />
      </div>

      <h1 class="as-title login__title">
        {{ mode === 'login' ? 'Zaloguj się' : 'Załóż konto' }}
      </h1>
      <p v-if="purchase.exam" class="login__ticket">
        Bilet: {{ purchase.exam.name }}. Po zalogowaniu przejdziesz do płatności.
      </p>

      <template v-if="sentTo">
        <p role="status">Wysłaliśmy link na adres {{ sentTo }}. Kliknij go, żeby założyć konto.</p>
        <p class="auth__note">Link jest ważny 24 godziny. Jeśli maila nie ma, zajrzyj do spamu.</p>
        <p>Jeśli link z maila otwarto na innym urządzeniu, zaloguj się tutaj:</p>
        <button
          class="button as-cta login__enter"
          type="button"
          :disabled="sending"
          @click="logInAfterConfirming"
        >
          Adres potwierdzony, zaloguj mnie
        </button>
        <p v-if="problem" class="auth__problem" role="alert">{{ problem }}</p>
      </template>
      <template v-else>
        <form class="auth__form login__form" @submit.prevent="submitForm">
          <label>
            <span class="as-label">Adres e-mail</span>
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
          <button class="button as-cta login__enter" type="submit" :disabled="sending">
            {{ mode === 'login' ? 'Wejdź' : 'Załóż konto' }}
          </button>
        </form>
        <p v-if="problem" class="auth__problem" role="alert">{{ problem }}</p>
        <p v-if="noPassword"><RouterLink :to="passwordLink">Dodaj hasło</RouterLink></p>

        <div class="login__google">
          <GoogleButton @credential="submitGoogle" />
          <p class="auth__note">
            Kontynuując przez Google, akceptujesz
            <RouterLink :to="{ name: 'terms' }" target="_blank">regulamin</RouterLink> i
            <RouterLink :to="{ name: 'privacy' }" target="_blank">politykę prywatności</RouterLink>.
          </p>
        </div>

        <p class="login__links">
          <template v-if="mode === 'login'">
            <RouterLink :to="passwordLink">Nie pamiętam hasła</RouterLink>
            <RouterLink :to="{ name: 'register', query: route.query }">Załóż konto</RouterLink>
          </template>
          <RouterLink v-else :to="{ name: 'login', query: route.query }">
            Mam już konto
          </RouterLink>
        </p>
      </template>
    </main>
  </div>
</template>

<style scoped>
.login {
  display: grid;
  gap: 1.5rem;
  align-content: center;
  flex: 1;
  width: min(100%, 26rem);
  margin-inline: auto;
  padding: 2rem var(--gutter) 3rem;
}

.login__solid {
  width: 9rem;
  height: 9rem;
  margin-left: -0.75rem;
}

.login__title {
  font-size: clamp(2.6rem, 2rem + 4vw, 3.75rem);
}

.login__ticket {
  font-weight: 650;
}

.login__form {
  justify-items: stretch;
}

.login :deep(input:not([type='checkbox'])) {
  min-height: 3.25rem;
  padding: 0 1rem;
  border: 2px solid var(--ink);
  border-radius: 0.8rem;
  background: var(--surface);
  color: var(--ink);
  caret-color: var(--accent);
}

.login__enter {
  width: 100%;
}

.login__google {
  display: grid;
  gap: 0.6rem;
}

.login__links {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 0.25rem 1.5rem;
}

.login__links a {
  display: inline-flex;
  align-items: center;
  min-height: 2.75rem;
  font-weight: 600;
}
</style>
