<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { loadAccount, logOut, type Account } from '@/account'

const router = useRouter()

const account = ref<Account | null>(null)
const problem = ref('')

onMounted(async () => {
  try {
    account.value = await loadAccount()
    if (!account.value) await router.replace({ name: 'login' })
  } catch {
    problem.value = 'Serwer nie odpowiada. Spróbuj za chwilę.'
  }
})

async function logOutAndGoToLogin() {
  try {
    await logOut()
    await router.replace({ name: 'login' })
  } catch {
    problem.value = 'Serwer nie odpowiada. Spróbuj za chwilę.'
  }
}
</script>

<template>
  <main class="account">
    <h1>Konto</h1>
    <template v-if="account">
      <p>Zalogowano jako {{ account.email }}</p>
      <button class="button" type="button" @click="logOutAndGoToLogin">Wyloguj</button>
    </template>
    <p v-if="problem" class="account__problem" role="alert">{{ problem }}</p>
  </main>
</template>

<style scoped>
.account {
  display: grid;
  gap: 1.25rem;
  justify-items: start;
  max-width: 28rem;
  margin-inline: auto;
  padding: var(--gutter);
}

.account h1 {
  font-size: 2rem;
  font-weight: 800;
}

.account__problem {
  color: #b42318;
  font-weight: 600;
}
</style>
