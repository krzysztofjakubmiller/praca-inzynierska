<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { tryPassword, type PasswordKind } from '@/access'
import AuthShell from '@/components/account/AuthShell.vue'

const props = defineProps<{ kind: PasswordKind }>()

const route = useRoute()
const router = useRouter()

const password = ref('')
const checking = ref(false)
const problem = ref('')

async function enter() {
  checking.value = true
  problem.value = ''
  try {
    if (await tryPassword(props.kind, password.value)) {
      const next = route.query.dalej
      await router.replace(typeof next === 'string' && next.startsWith('/') ? next : '/')
      return
    }
    problem.value = 'Złe hasło.'
  } catch {
    problem.value = 'Serwer nie odpowiada. Spróbuj za chwilę.'
  } finally {
    checking.value = false
  }
}
</script>

<template>
  <AuthShell>
    <template v-if="kind === 'panel'">
      <h1 class="as-title auth__title">Panel właściciela</h1>
      <p>Panel ma osobne hasło.</p>
    </template>
    <template v-else>
      <section class="access__survey">
        <h1 class="as-title auth__title">Wypełnij ankietę</h1>
        <p>Pomóż wybrać wygląd strony głównej. Bez hasła i bez zakładania konta.</p>
        <RouterLink class="button as-cta" :to="{ name: 'survey' }">Wypełnij ankietę</RouterLink>
      </section>
      <h2 class="access__heading">Wpisz hasło dostępu</h2>
      <p>Aplikacja jest w budowie, reszta stron otwiera się tylko z hasłem.</p>
    </template>
    <form class="auth__form" @submit.prevent="enter">
      <label>
        <span class="as-label">Hasło</span>
        <input v-model="password" type="password" autocomplete="current-password" required />
      </label>
      <!-- Przy ankiecie główny przycisk prowadzi do ankiety, więc wejście z hasłem jest spokojne. -->
      <button
        class="button"
        :class="kind === 'panel' ? 'as-cta' : 'button--quiet'"
        type="submit"
        :disabled="checking"
      >
        Wejdź
      </button>
    </form>
    <p v-if="checking">Sprawdzam hasło.</p>
    <p v-if="problem" class="auth__problem" role="alert">{{ problem }}</p>
  </AuthShell>
</template>

<style scoped>
.access__survey {
  display: grid;
  gap: 1rem;
  justify-items: start;
  margin-bottom: 0.5rem;
  padding-bottom: 2rem;
  border-bottom: 1px solid var(--hairline);
}

.access__heading {
  font-size: 1.35rem;
  font-weight: 750;
}
</style>
