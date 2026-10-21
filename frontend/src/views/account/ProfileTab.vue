<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { logOut, type Account } from '@/account'
import AccountSecurity from '@/components/account/AccountSecurity.vue'
import ExamCountdown from '@/components/profile/ExamCountdown.vue'
import NoDataYet from '@/components/profile/NoDataYet.vue'
import ActivityHeatmap from '@/components/stats/ActivityHeatmap.vue'
import ForecastRange from '@/components/stats/ForecastRange.vue'
import LineProgress from '@/components/stats/LineProgress.vue'
import StatCard from '@/components/stats/StatCard.vue'
import WeekNumbers from '@/components/stats/WeekNumbers.vue'
import { profile } from '@/profile'
import { localToday, studentStats } from '@/stats/stats'

defineProps<{ account: Account }>()

const router = useRouter()
const problem = ref('')

const level = computed(() => profile.value?.level ?? 'podstawowa')
const examId = computed(() =>
  level.value === 'rozszerzona' ? 'matura-rozszerzona' : 'matura-podstawowa',
)
const stats = studentStats()
const doneSheets = stats?.sheets.filter((sheet) => sheet.percent !== undefined) ?? []
const lastSheet = doneSheets[doneSheets.length - 1]?.percent

async function logOutAndGoToLogin() {
  try {
    await logOut()
    profile.value = null
    await router.replace({ name: 'login' })
  } catch {
    problem.value = 'Serwer nie odpowiada. Spróbuj za chwilę.'
  }
}
</script>

<template>
  <div class="profile-tab">
    <ExamCountdown
      v-if="profile"
      :exam-id="examId"
      :exam-date="profile.exam_dates[level]"
      :today="localToday()"
      :target="profile.target_percent"
    />
    <h1 v-else class="profile-tab__title">Profil</h1>

    <div v-if="stats" class="profile-tab__charts">
      <StatCard
        v-slot="{ width }"
        class="profile-tab__wide"
        title="Ostatnie 4 tygodnie"
        note="Dni nauki z rzędu łączy linia. Liczby pod spodem dotyczą ostatnich 7 dni."
      >
        <WeekNumbers
          :days="stats.days"
          :recent-score="stats.recentScore"
          :today="stats.today"
          :width="width"
        />
      </StatCard>
      <StatCard
        v-slot="{ width }"
        title="Prognoza wyniku"
        note="Szacunek na dzień matury, liczony z powtórek i wag działów."
      >
        <ForecastRange
          :forecast="stats.forecast"
          :target="profile?.target_percent ?? null"
          :last-sheet="lastSheet"
          :width="width"
        />
      </StatCard>
      <StatCard v-slot="{ width }" title="Kalendarz nauki" note="Kafelek to dzień.">
        <ActivityHeatmap :days="stats.days" :today="stats.today" :width="width" />
      </StatCard>
      <StatCard class="profile-tab__wide" title="Linie mapy">
        <LineProgress :lines="stats.lines" />
      </StatCard>
      <RouterLink
        class="button button--quiet profile-tab__more"
        :to="{ name: 'account-progress', params: { exam: examId } }"
      >
        Cały postęp
      </RouterLink>
    </div>
    <NoDataYet v-else :exam-id="examId" />

    <section class="profile-tab__account" aria-labelledby="account-heading">
      <h2 id="account-heading" class="profile-tab__heading">Konto</h2>
      <p>Zalogowano jako {{ account.email }}</p>
      <button class="button button--quiet" type="button" @click="logOutAndGoToLogin">
        Wyloguj
      </button>
      <p v-if="problem" class="profile-tab__problem" role="alert">{{ problem }}</p>
      <AccountSecurity :has-password="account.has_password" />
    </section>
  </div>
</template>

<style scoped>
.profile-tab {
  display: grid;
  gap: 1.75rem;
  container-type: inline-size;
}

.profile-tab__title {
  font-size: clamp(1.6rem, 1.2rem + 1.6vw, 2.25rem);
  font-weight: 750;
}

.profile-tab__charts {
  display: grid;
  gap: 0.75rem;
}

.profile-tab__more {
  justify-self: start;
}

.profile-tab__account {
  display: grid;
  justify-items: start;
  gap: 1rem;
  padding-top: 1.75rem;
  border-top: 1px solid var(--hairline);
}

.profile-tab__heading {
  font-size: 1.375rem;
  font-weight: 750;
  font-variation-settings: 'wdth' 90;
}

.profile-tab__problem {
  color: var(--danger);
  font-weight: 600;
}

.profile-tab__account :deep(.security) {
  max-width: 28rem;
  margin-top: 1.25rem;
}

@container (min-width: 44rem) {
  .profile-tab__charts {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .profile-tab__wide,
  .profile-tab__more {
    grid-column: 1 / -1;
  }
}
</style>
