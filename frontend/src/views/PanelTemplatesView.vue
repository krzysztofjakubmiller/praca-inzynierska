<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import PanelTabs from '@/components/panel/PanelTabs.vue'
import MathText from '@/components/task/MathText.vue'
import { panelApi, type ExamOptions, type TaskSummary } from '@/panel/api'
import { STATUS_LABELS, taskNumber, useProblems } from '@/panel/format'
import '@/assets/panel.css'

const { problems, run } = useProblems()

const exams = ref<ExamOptions[]>([])
const filters = ref({ exam: '', topic: '', template: '' })
const tasks = ref<TaskSummary[]>([])

const topics = computed(
  () => exams.value.find((exam) => exam.code === filters.value.exam)?.topics ?? [],
)

watch(
  filters,
  () =>
    run(async () => {
      ;[tasks.value, exams.value] = await Promise.all([
        panelApi.tasks(filters.value),
        panelApi.options(),
      ])
    }),
  { deep: true, immediate: true },
)

watch(
  () => filters.value.exam,
  () => {
    filters.value.topic = ''
  },
)
</script>

<template>
  <main class="panel">
    <PanelTabs />

    <ul v-if="problems.length" class="panel__problems">
      <li v-for="problem in problems" :key="problem">{{ problem }}</li>
    </ul>

    <section class="panel__card">
      <h2>Szablony wariantów ({{ tasks.length }})</h2>

      <div class="templates__filters">
        <label>
          Egzamin
          <select v-model="filters.exam">
            <option value="">wszystkie</option>
            <option v-for="exam in exams" :key="exam.code" :value="exam.code">
              {{ exam.name }}
            </option>
          </select>
        </label>
        <label>
          Temat
          <select v-model="filters.topic" :disabled="!filters.exam">
            <option value="">wszystkie</option>
            <option v-for="topic in topics" :key="topic.code" :value="topic.code">
              {{ topic.name }}
            </option>
          </select>
        </label>
        <label>
          Szablon
          <select v-model="filters.template">
            <option value="">wszystkie</option>
            <option value="brak">bez szablonu</option>
            <option v-for="(label, status) in STATUS_LABELS" :key="status" :value="status">
              {{ label }}
            </option>
          </select>
        </label>
      </div>

      <ol v-if="tasks.length" class="templates">
        <li v-for="task in tasks" :key="task.id">
          <RouterLink
            class="templates__row"
            :to="{ name: 'panel-template', params: { id: task.id } }"
          >
            <span class="templates__meta">
              id {{ task.id }} · {{ task.source }} {{ task.year }}, nr {{ taskNumber(task) }} ·
              {{ task.topic }}
            </span>
            <span
              v-if="task.template_status"
              class="panel__status"
              :data-status="task.template_status"
            >
              {{ STATUS_LABELS[task.template_status] }}
            </span>
            <span v-else class="templates__none">bez szablonu</span>
            <MathText class="templates__content" :text="task.content" />
          </RouterLink>
        </li>
      </ol>
      <p v-else>Brak zadań.</p>
    </section>
  </main>
</template>

<style scoped>
.templates__filters {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
  gap: 1rem;
}

.templates {
  display: grid;
  border-top: 1px solid var(--hairline);
  list-style: none;
  padding: 0;
}

.templates li {
  border-bottom: 1px solid var(--hairline);
}

.templates__row {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: start;
  gap: 0.35rem 1rem;
  padding: 0.9rem 0.25rem;
  color: inherit;
  text-decoration: none;
}

.templates__row:hover {
  background: var(--ground);
}

.templates__meta {
  font-weight: 650;
}

.templates__none {
  color: var(--ink-soft);
  font-size: 0.8rem;
  font-weight: 650;
}

.templates__content {
  grid-column: 1 / -1;
  color: var(--ink-soft);
}
</style>
