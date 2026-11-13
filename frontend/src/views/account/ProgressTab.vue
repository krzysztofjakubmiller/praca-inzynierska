<script setup lang="ts">
import { computed } from 'vue'
import NoDataYet from '@/components/profile/NoDataYet.vue'
import ExamHeading from '@/components/stats/ExamHeading.vue'
import ProgressCharts from '@/components/stats/ProgressCharts.vue'
import type { Exam } from '@/config/exams'
import { profile } from '@/profile'
import { useStudentStats } from '@/stats/stats'

const props = defineProps<{ exam: Exam['id'] }>()

// Postęp drugiego egzaminu widzi tylko uczeń rozszerzenia, bo uczy się obu poziomów.
const both = computed(() => profile.value?.level === 'rozszerzona')
const { stats, loaded } = useStudentStats(() => props.exam)
</script>

<template>
  <div class="progress-tab">
    <ExamHeading :exam-id="exam" :other-route="both ? 'account-progress' : undefined" />
    <ProgressCharts
      v-if="stats"
      :stats="stats"
      :target="profile?.target_percent ?? null"
      :limit="profile?.daily_review_limit ?? 20"
    />
    <NoDataYet v-else-if="loaded" :exam-id="exam" />
  </div>
</template>

<style scoped>
.progress-tab {
  display: grid;
  gap: 1.5rem;
}
</style>
