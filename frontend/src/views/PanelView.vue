<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import MathText from '@/components/panel/MathText.vue'
import { panelApi, type ExamOptions, type TaskSummary } from '@/panel/api'
import { STATUS_LABELS, taskNumber, useProblems } from '@/panel/format'
import { choosePhoto } from '@/panel/photo'
import '@/assets/panel.css'

const router = useRouter()
const { problems, run } = useProblems()

const exams = ref<ExamOptions[]>([])
const filters = ref({ exam: '', topic: '', status: 'do-sprawdzenia' })
const tasks = ref<TaskSummary[]>([])
const importText = ref('')
const notice = ref('')

const topics = computed(
  () => exams.value.find((exam) => exam.code === filters.value.exam)?.topics ?? [],
)

onMounted(() =>
  run(async () => {
    exams.value = await panelApi.options()
  }),
)

watch(
  filters,
  () =>
    run(async () => {
      tasks.value = await panelApi.tasks(filters.value)
    }),
  { deep: true, immediate: true },
)

// Temat należy do egzaminu, więc po zmianie egzaminu dawny filtr tematu traci sens.
watch(
  () => filters.value.exam,
  () => {
    filters.value.topic = ''
  },
)

function onPhoto(event: Event) {
  choosePhoto((event.target as HTMLInputElement).files?.[0])
}

function importTasks() {
  return run(async () => {
    const { ids } = await panelApi.importText(importText.value)
    importText.value = ''
    await router.push({ name: 'panel-task', params: { id: ids[0] } })
  })
}

function startReview() {
  return run(async () => {
    const { id } = await panelApi.next(0)
    if (id) await router.push({ name: 'panel-task', params: { id } })
    else notice.value = 'Wszystkie zadania są sprawdzone.'
  })
}
</script>

<template>
  <main class="panel">
    <header class="panel__header">
      <h1>Panel</h1>
      <RouterLink :to="{ name: 'home' }">Wszystkie strony</RouterLink>
    </header>

    <section class="panel__card">
      <h2>Import z Gemini</h2>
      <label>
        JSON od Gemini
        <textarea v-model="importText" rows="8" spellcheck="false" />
      </label>
      <label>
        Zdjęcie strony (zostaje tylko w przeglądarce)
        <input type="file" accept="image/*" @change="onPhoto" />
      </label>
      <div>
        <button type="button" class="button" :disabled="!importText.trim()" @click="importTasks">
          Importuj
        </button>
      </div>
    </section>

    <ul v-if="problems.length" class="panel__problems">
      <li v-for="problem in problems" :key="problem">{{ problem }}</li>
    </ul>
    <p v-if="notice" class="panel__notice">{{ notice }}</p>

    <section class="panel__card">
      <div class="task-list__toolbar">
        <h2>Zadania ({{ tasks.length }})</h2>
        <button type="button" class="button button--quiet" @click="startReview">
          Sprawdzaj po kolei
        </button>
      </div>

      <div class="task-list__filters">
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
          Status
          <select v-model="filters.status">
            <option value="">wszystkie</option>
            <option v-for="(label, status) in STATUS_LABELS" :key="status" :value="status">
              {{ label }}
            </option>
          </select>
        </label>
      </div>

      <ol v-if="tasks.length" class="task-list">
        <li v-for="task in tasks" :key="task.id">
          <RouterLink class="task-list__row" :to="{ name: 'panel-task', params: { id: task.id } }">
            <span class="task-list__meta">
              {{ task.source }} {{ task.year }}, nr {{ taskNumber(task) }} · {{ task.topic }}
            </span>
            <span class="panel__status" :data-status="task.review_status">
              {{ STATUS_LABELS[task.review_status] }}
            </span>
            <MathText class="task-list__content" :text="task.content" />
          </RouterLink>
        </li>
      </ol>
      <p v-else>Brak zadań.</p>
    </section>
  </main>
</template>

<style scoped>
.task-list__toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.task-list__filters {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
  gap: 1rem;
}

.task-list {
  display: grid;
  border-top: 1px solid var(--hairline);
  list-style: none;
  padding: 0;
}

.task-list__row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.35rem 1rem;
  padding: 0.9rem 0.25rem;
  border-bottom: 1px solid var(--hairline);
  color: inherit;
  text-decoration: none;
}

.task-list__row:hover {
  background: var(--ground);
}

.task-list__meta {
  font-weight: 650;
}

.task-list__content {
  grid-column: 1 / -1;
  display: -webkit-box;
  overflow: hidden;
  color: var(--ink-soft);
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
}
</style>
