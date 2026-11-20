<script setup lang="ts">
import { computed, onMounted, provide, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { loadAccount, type Account } from '@/account'
import AccountStation from '@/components/account/AccountStation.vue'
import ServerProblem from '@/components/ServerProblem.vue'
import { EXAMS } from '@/config/exams'
import { accountExamId } from '@/lastExam'
import { profile, refreshProfile } from '@/profile'
import { ACCOUNT_STATS, currentStreak, localToday, useStudentStats } from '@/stats/stats'

const router = useRouter()
const route = useRoute()

const account = ref<Account | null>(null)
const problem = ref('')
const offline = ref(false)

const exam = computed(() => EXAMS.find((item) => item.id === accountExamId.value)!)
// Data z profilu dla poziomu matury, której jest konto; E8 nie ma jeszcze daty w profilu.
const examDate = computed(() => {
  if (exam.value.id === 'matura-rozszerzona') return profile.value?.exam_dates.rozszerzona
  if (exam.value.id === 'matura-podstawowa') return profile.value?.exam_dates.podstawowa
  return undefined
})

const studentStats = useStudentStats(() => exam.value.id)
provide(ACCOUNT_STATS, studentStats)

// Powtórek bywa więcej, niż uczeń ustawił na jeden dzień; tyle, ile wynosi limit, dostanie dziś.
const study = computed(() => {
  if (!studentStats.loaded.value) return undefined
  const stats = studentStats.stats.value
  if (!stats) return null
  return {
    reviews: Math.min(stats.reviewsAhead[0] ?? 0, profile.value?.daily_review_limit ?? Infinity),
    streak: currentStreak(stats.days),
  }
})

// Kolejne zakładki (np. prace domowe) dochodzą tutaj.
const tabs = computed(() =>
  [
    { label: 'Profil', to: { name: 'account' }, name: 'account' },
    { label: 'Ustawienia', to: { name: 'account-settings' }, name: 'account-settings' },
    {
      label: 'Postęp',
      to: { name: 'account-progress', params: { exam: exam.value.id } },
      name: 'account-progress',
    },
    { label: 'Płatności', to: { name: 'account-payments' }, name: 'account-payments' },
  ].map((tab) => ({ ...tab, current: route.name === tab.name })),
)

async function load() {
  offline.value = false
  try {
    account.value = await loadAccount()
  } catch {
    offline.value = true
    return
  }
  if (!account.value) {
    await router.replace({ name: 'login' })
    return
  }
  try {
    await refreshProfile()
  } catch {
    problem.value = 'Nie udało się wczytać ustawień. Spróbuj za chwilę.'
  }
}

onMounted(load)
</script>

<template>
  <div class="account">
    <AccountStation
      :exam="exam"
      :email="account?.email"
      :exam-date="examDate"
      :today="localToday()"
      :target="profile?.target_percent"
      :study="study"
      :tabs="tabs"
    />

    <main class="account__main">
      <ServerProblem v-if="offline" @retry="load" />
      <p v-if="problem" class="account__problem" role="alert">{{ problem }}</p>
      <RouterView v-if="account" :account="account" />
    </main>
  </div>
</template>

<style scoped>
.account {
  min-height: 100svh;
}

.account__main {
  max-width: 68rem;
  margin-inline: auto;
  padding: clamp(1.25rem, 1rem + 1.5vw, 2rem) var(--gutter) 4rem;
}

.account__problem {
  margin-bottom: 1rem;
  color: var(--danger);
  font-weight: 600;
}
</style>
