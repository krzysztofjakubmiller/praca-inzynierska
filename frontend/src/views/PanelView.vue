<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import MathText from '@/components/panel/MathText.vue'
import { panelApi, type ExamOptions, type TaskSummary } from '@/panel/api'
import { STATUS_LABELS, taskNumber, useProblems } from '@/panel/format'
import '@/assets/panel.css'

const router = useRouter()
const { problems, run } = useProblems()

const exams = ref<ExamOptions[]>([])
const filters = ref({ exam: '', topic: '', status: 'do-sprawdzenia' })
const tasks = ref<TaskSummary[]>([])
const selected = ref<number[]>([])
const importText = ref('')
const notice = ref('')

const topics = computed(
  () => exams.value.find((exam) => exam.code === filters.value.exam)?.topics ?? [],
)
const allSelected = computed(
  () => tasks.value.length > 0 && selected.value.length === tasks.value.length,
)
// Temat można zmienić tylko zadaniom z jednego egzaminu, bo każdy egzamin ma własne tematy.
const selectedExam = computed(() => {
  const codes = new Set(
    tasks.value.filter((task) => selected.value.includes(task.id)).map((task) => task.exam),
  )
  return codes.size === 1 ? [...codes][0] : null
})
const moveTopics = computed(
  () => exams.value.find((exam) => exam.code === selectedExam.value)?.topics ?? [],
)
const newTopic = ref('')

// Opcje pobierane razem z listą, żeby liczby zadań przy tematach były aktualne po każdej zmianie.
async function refreshTasks() {
  ;[tasks.value, exams.value] = await Promise.all([
    panelApi.tasks(filters.value),
    panelApi.options(),
  ])
  selected.value = []
}

function loadTasks() {
  selected.value = []
  return run(refreshTasks)
}

watch(filters, loadTasks, { deep: true, immediate: true })

// Temat należy do egzaminu, więc po zmianie egzaminu dawny filtr tematu traci sens.
watch(
  () => filters.value.exam,
  () => {
    filters.value.topic = ''
  },
)

function toggleAll() {
  selected.value = allSelected.value ? [] : tasks.value.map((task) => task.id)
}

function importTasks() {
  notice.value = ''
  return run(async () => {
    const { ids } = await panelApi.importText(importText.value)
    importText.value = ''
    await router.push({ name: 'panel-task', params: { id: ids[0] } })
  })
}

function removeSelected() {
  const count = selected.value.length
  if (!window.confirm(`Usunąć zaznaczone zadania (${count}) z bazy?`)) return
  notice.value = ''
  return run(async () => {
    for (const id of selected.value) await panelApi.remove(id)
    await refreshTasks()
    notice.value = `Usunięto zadań: ${count}.`
  })
}

function moveSelected() {
  notice.value = ''
  return run(async () => {
    const { changed } = await panelApi.changeTopic(selected.value, newTopic.value)
    await refreshTasks()
    notice.value = `Zmieniono temat zadań: ${changed}.`
  })
}

function reopenSelected() {
  notice.value = ''
  return run(async () => {
    const { changed } = await panelApi.reopen(selected.value)
    await refreshTasks()
    notice.value = `Przywrócono do sprawdzenia: ${changed}.`
  })
}

function startReview() {
  notice.value = ''
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
              {{ topic.name }} ({{ topic.tasks }})
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

      <div v-if="tasks.length" class="task-list__selection">
        <label class="task-list__check">
          <input type="checkbox" :checked="allSelected" @change="toggleAll" />
          Zaznacz wszystkie
        </label>
        <div class="task-list__actions">
          <label class="task-list__move">
            Przenieś do tematu
            <select v-model="newTopic" :disabled="!selectedExam">
              <option value="" disabled>wybierz</option>
              <option v-for="topic in moveTopics" :key="topic.code" :value="topic.code">
                {{ topic.name }}
              </option>
            </select>
          </label>
          <button
            type="button"
            class="button button--quiet"
            :disabled="!selectedExam || !newTopic"
            @click="moveSelected"
          >
            Zmień temat
          </button>
          <button
            type="button"
            class="button button--quiet"
            :disabled="!selected.length"
            @click="reopenSelected"
          >
            Przywróć do sprawdzenia
          </button>
          <button
            type="button"
            class="button button--quiet task-list__delete"
            :disabled="!selected.length"
            @click="removeSelected"
          >
            Usuń zaznaczone ({{ selected.length }})
          </button>
        </div>
      </div>

      <ol v-if="tasks.length" class="task-list">
        <li v-for="task in tasks" :key="task.id" class="task-list__item">
          <input
            v-model="selected"
            type="checkbox"
            :value="task.id"
            :aria-label="`Zaznacz zadanie ${task.id}`"
          />
          <RouterLink class="task-list__row" :to="{ name: 'panel-task', params: { id: task.id } }">
            <span class="task-list__meta">
              id {{ task.id }} · {{ task.source }} {{ task.year }}, nr {{ taskNumber(task) }} ·
              {{ task.topic }}
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
.task-list__toolbar,
.task-list__selection {
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

.task-list__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: end;
  gap: 0.75rem;
}

.task-list__move {
  min-width: 14rem;
}

.panel .task-list__check {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.task-list__delete:not(:disabled) {
  border-color: var(--panel-danger);
  color: var(--panel-danger);
}

.task-list__delete:not(:disabled):hover {
  background: var(--panel-danger);
  color: #fff;
}

.task-list {
  display: grid;
  border-top: 1px solid var(--hairline);
  list-style: none;
  padding: 0;
}

.task-list__item {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: start;
  gap: 0.75rem;
  border-bottom: 1px solid var(--hairline);
}

.task-list__item input {
  margin-top: 1.1rem;
}

.task-list__row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.35rem 1rem;
  padding: 0.9rem 0.25rem;
  color: inherit;
  text-decoration: none;
}

.task-list__row:hover {
  background: var(--ground);
}

.task-list__meta {
  font-weight: 650;
}

/* Bez tego plakietka rozciąga się na wysokość opisu, gdy ten zajmuje dwie linie. */
.task-list__row .panel__status {
  align-self: start;
}

.task-list__content {
  grid-column: 1 / -1;
  color: var(--ink-soft);
}
</style>
