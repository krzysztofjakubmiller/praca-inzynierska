<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { tryPassword } from '@/access'

const route = useRoute()
const router = useRouter()

const password = ref('')
const checking = ref(false)
const problem = ref('')

async function enter() {
  checking.value = true
  problem.value = ''
  try {
    if (await tryPassword(password.value)) {
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
  <main class="access">
    <h1>Wejście</h1>
    <p>Strona jest w budowie, wejście tylko z hasłem.</p>
    <form class="access__form" @submit.prevent="enter">
      <label>
        Hasło
        <input v-model="password" type="password" autocomplete="current-password" required />
      </label>
      <button class="button" type="submit" :disabled="checking">Wejdź</button>
    </form>
    <p v-if="checking">Sprawdzam hasło.</p>
    <p v-if="problem" class="access__problem" role="alert">{{ problem }}</p>
  </main>
</template>

<style scoped>
.access {
  display: grid;
  gap: 1.25rem;
  max-width: 28rem;
  margin-inline: auto;
  padding: var(--gutter);
}

.access h1 {
  font-size: 2rem;
  font-weight: 800;
}

.access__form {
  display: grid;
  gap: 1rem;
  justify-items: start;
}

.access__form label {
  display: grid;
  gap: 0.35rem;
  width: 100%;
  font-weight: 600;
}

.access__form input {
  padding: 0.55em 0.7em;
  border: 1px solid var(--ink-soft);
  border-radius: 0.5rem;
  background: var(--surface);
  color: var(--ink);
  font: inherit;
}

.access__form .button:disabled {
  opacity: 0.4;
  cursor: wait;
}

.access__problem {
  color: #b42318;
  font-weight: 600;
}
</style>
