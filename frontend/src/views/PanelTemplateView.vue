<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import PanelTabs from '@/components/panel/PanelTabs.vue'
import TemplateReview from '@/components/panel/TemplateReview.vue'
import { panelApi, type ExamOptions, type TaskDetails } from '@/panel/api'
import { taskNumber, useProblems } from '@/panel/format'
import '@/assets/panel.css'

const route = useRoute()
const { problems, run } = useProblems()

const exams = ref<ExamOptions[]>([])
const task = ref<TaskDetails | null>(null)

const exam = computed(() => exams.value.find((exam) => exam.code === task.value?.exam))
const sourceName = computed(
  () => exam.value?.sources.find((source) => source.code === task.value?.source)?.name,
)
const topicName = computed(
  () => exam.value?.topics.find((topic) => topic.code === task.value?.topic)?.name,
)

watch(
  () => route.params.id,
  (id) =>
    run(async () => {
      if (!exams.value.length) exams.value = await panelApi.options()
      task.value = await panelApi.task(Number(id))
    }),
  { immediate: true },
)
</script>

<template>
  <main class="panel">
    <PanelTabs />

    <ul v-if="problems.length" class="panel__problems">
      <li v-for="problem in problems" :key="problem">{{ problem }}</li>
    </ul>

    <template v-if="task">
      <header class="template-page__header">
        <h1>{{ sourceName }} {{ task.year }}, zadanie {{ taskNumber(task) }}</h1>
        <p class="template-page__subtitle">
          {{ topicName }} · id {{ task.id }} ·
          <RouterLink :to="{ name: 'panel-task', params: { id: task.id } }">
            Edytuj zadanie
          </RouterLink>
        </p>
      </header>

      <TemplateReview :task-id="task.id" :exam="task.exam" />
    </template>
  </main>
</template>

<style scoped>
.template-page__header {
  display: grid;
  gap: 0.5rem;
}

.template-page__subtitle {
  color: var(--ink-soft);
  font-weight: 600;
}
</style>
