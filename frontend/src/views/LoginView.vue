<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { logIn, logInWithGoogle, register } from '@/account'
import GoogleButton from '@/components/account/GoogleButton.vue'

const props = defineProps<{ mode: 'login' | 'register' }>()

const router = useRouter()

const email = ref('')
const password = ref('')
const passwordVisible = ref(false)
const sending = ref(false)
const problem = ref('')

// Logowanie i rejestracja to ten sam komponent, więc Vue nie tworzy go od nowa przy przejściu
// między nimi. Wpisany adres może zostać, ale komunikat dotyczył poprzedniego formularza.
watch(
  () => props.mode,
  () => {
    problem.value = ''
  },
)

// Formularz i przycisk Google kończą się tak samo: przejściem na konto albo komunikatem.
async function send(attempt: () => Promise<string | null>) {
  sending.value = true
  problem.value = ''
  try {
    const message = await attempt()
    if (message === null) {
      await router.replace({ name: 'account' })
      return
    }
    problem.value = message
  } catch {
    problem.value = 'Serwer nie odpowiada. Spróbuj za chwilę.'
  } finally {
    sending.value = false
  }
}

function submitForm() {
  const submit = props.mode === 'login' ? logIn : register
  return send(() => submit(email.value, password.value))
}

function submitGoogle(credential: string) {
  return send(() => logInWithGoogle(credential))
}
</script>

<template>
  <main class="login">
    <h1>{{ mode === 'login' ? 'Logowanie' : 'Rejestracja' }}</h1>
    <GoogleButton @credential="submitGoogle" />
    <p class="login__or">albo e-mailem</p>
    <form class="login__form" @submit.prevent="submitForm">
      <label>
        E-mail
        <input v-model="email" type="email" autocomplete="email" required />
      </label>
      <div class="login__field">
        <label for="password">Hasło</label>
        <div class="login__password">
          <input
            id="password"
            v-model="password"
            :type="passwordVisible ? 'text' : 'password'"
            :autocomplete="mode === 'login' ? 'current-password' : 'new-password'"
            required
          />
          <button
            class="button button--quiet login__toggle"
            type="button"
            :aria-label="passwordVisible ? 'Ukryj hasło' : 'Pokaż hasło'"
            @click="passwordVisible = !passwordVisible"
          >
            {{ passwordVisible ? 'Ukryj' : 'Pokaż' }}
          </button>
        </div>
        <p v-if="mode === 'register'" class="login__hint">Co najmniej 12 znaków.</p>
      </div>
      <button class="button" type="submit" :disabled="sending">
        {{ mode === 'login' ? 'Zaloguj się' : 'Załóż konto' }}
      </button>
    </form>
    <p v-if="problem" class="login__problem" role="alert">{{ problem }}</p>
    <p v-if="mode === 'login'">
      Nie masz konta? <RouterLink :to="{ name: 'register' }">Załóż konto</RouterLink>
    </p>
    <p v-else>Masz już konto? <RouterLink :to="{ name: 'login' }">Zaloguj się</RouterLink></p>
  </main>
</template>

<style scoped>
.login {
  display: grid;
  gap: 1.25rem;
  max-width: 28rem;
  margin-inline: auto;
  padding: var(--gutter);
}

.login h1 {
  font-size: 2rem;
  font-weight: 800;
}

.login__form {
  display: grid;
  gap: 1rem;
  justify-items: start;
}

.login__form label,
.login__field {
  display: grid;
  gap: 0.35rem;
  width: 100%;
  font-weight: 600;
}

.login__form input {
  padding: 0.55em 0.7em;
  border: 1px solid var(--ink-soft);
  border-radius: 0.5rem;
  background: var(--surface);
  color: var(--ink);
  font: inherit;
}

.login__password {
  display: flex;
  gap: 0.5rem;
}

.login__password input {
  flex: 1;
  min-width: 0;
}

.login__hint,
.login__or {
  color: var(--ink-soft);
  font-weight: 400;
}

.login__form .button:disabled {
  opacity: 0.4;
  cursor: wait;
}

.login__problem {
  color: #b42318;
  font-weight: 600;
}
</style>
