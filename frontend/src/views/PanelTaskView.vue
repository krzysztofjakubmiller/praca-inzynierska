<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MathText from '@/components/panel/MathText.vue'
import {
  panelApi,
  type ExamOptions,
  type ReviewStatus,
  type TaskDetails,
  type TaskUpdate,
} from '@/panel/api'
import { ANSWER_FORMATS, STATUS_LABELS, taskNumber, useProblems } from '@/panel/format'
import '@/assets/panel.css'

const route = useRoute()
const router = useRouter()
const { problems, run } = useProblems()

const exams = ref<ExamOptions[]>([])
const task = ref<TaskDetails | null>(null)
// Kopia zadania edytowana w formularzu; task zostaje taki, jaki jest w bazie.
const form = ref<TaskDetails | null>(null)
const choices = ref<{ label: string; text: string }[]>([])
const saved = ref(false)

const exam = computed(() => exams.value.find((exam) => exam.code === task.value?.exam))
const closed = computed(() => form.value?.answer_format !== 'otwarte')
const sourceName = computed(
  () => exam.value?.sources.find((source) => source.code === form.value?.source)?.name,
)
const topicName = computed(
  () => exam.value?.topics.find((topic) => topic.code === form.value?.topic)?.name,
)

function fill(details: TaskDetails) {
  task.value = details
  form.value = { ...details }
  choices.value = Object.entries(details.choices ?? {}).map(([label, text]) => ({ label, text }))
}

watch(
  () => route.params.id,
  (id) =>
    run(async () => {
      saved.value = false
      if (!exams.value.length) exams.value = await panelApi.options()
      fill(await panelApi.task(Number(id)))
    }),
  { immediate: true },
)

function toUpdate(edited: TaskDetails, status: ReviewStatus): TaskUpdate {
  return {
    topic: edited.topic,
    source: edited.source,
    year: edited.year,
    month: edited.month,
    number: edited.number,
    // Pusty input liczbowy daje pusty tekst, a backend oczekuje null.
    subnumber: edited.subnumber || null,
    max_points: edited.max_points,
    content: edited.content,
    has_figure: edited.has_figure,
    answer_format: edited.answer_format,
    choices: closed.value
      ? Object.fromEntries(choices.value.map((choice) => [choice.label.trim(), choice.text]))
      : null,
    answer: edited.answer?.trim() || null,
    review_status: status,
  }
}

function save(status: ReviewStatus) {
  return run(async () => {
    fill(await panelApi.save(task.value!.id, toUpdate(form.value!, status)))
    saved.value = true
  })
}

async function goToNext(id: number) {
  const next = await panelApi.next(id)
  await router.push(next.id ? { name: 'panel-task', params: { id: next.id } } : { name: 'panel' })
}

function approveAndNext() {
  return run(async () => {
    const id = task.value!.id
    await panelApi.save(id, toUpdate(form.value!, 'sprawdzone'))
    await goToNext(id)
  })
}

function remove() {
  if (!window.confirm('Usunąć to zadanie z bazy?')) return
  return run(async () => {
    const id = task.value!.id
    await panelApi.remove(id)
    await goToNext(id)
  })
}
</script>

<template>
  <main class="panel">
    <header class="review__header">
      <RouterLink :to="{ name: 'panel' }">Lista zadań</RouterLink>
      <template v-if="task && form">
        <!-- Opis z formularza, więc zmienia się na bieżąco przy poprawianiu źródła. -->
        <h1>{{ sourceName }} {{ form.year }}, zadanie {{ taskNumber(form) }}</h1>
        <p class="review__subtitle">
          {{ topicName }} · id {{ task.id }}
          <span class="panel__status" :data-status="task.review_status">
            {{ STATUS_LABELS[task.review_status] }}
          </span>
        </p>
      </template>
    </header>

    <ul v-if="problems.length" class="panel__problems">
      <li v-for="problem in problems" :key="problem">{{ problem }}</li>
    </ul>
    <p v-else-if="saved" class="panel__notice">Zapisano.</p>

    <div v-if="task && form" class="review">
      <form class="panel__card" @submit.prevent="save(form.review_status)">
        <label>
          Temat
          <select v-model="form.topic">
            <option v-for="topic in exam?.topics" :key="topic.code" :value="topic.code">
              {{ topic.name }}
            </option>
          </select>
        </label>

        <div class="review__numbers">
          <label>
            Źródło
            <select v-model="form.source">
              <option v-for="source in exam?.sources" :key="source.code" :value="source.code">
                {{ source.name }}
              </option>
            </select>
          </label>
          <label>Rok <input v-model.number="form.year" type="number" required /></label>
          <label>
            Miesiąc
            <input v-model.number="form.month" type="number" min="1" max="12" required />
          </label>
          <label>Numer <input v-model.number="form.number" type="number" min="1" required /></label>
          <label>Podpunkt <input v-model.number="form.subnumber" type="number" min="1" /></label>
          <label>
            Punkty
            <input v-model.number="form.max_points" type="number" min="1" required />
          </label>
        </div>

        <label>Treść <textarea v-model="form.content" rows="9" spellcheck="false" /></label>
        <label class="review__check">
          <input v-model="form.has_figure" type="checkbox" />
          Zadanie ma rysunek
        </label>

        <label>
          Format odpowiedzi
          <select v-model="form.answer_format">
            <option v-for="(label, format) in ANSWER_FORMATS" :key="format" :value="format">
              {{ label }}
            </option>
          </select>
        </label>

        <fieldset v-if="closed" class="review__choices">
          <legend>Warianty</legend>
          <div v-for="(choice, index) in choices" :key="index" class="review__choice">
            <input v-model="choice.label" aria-label="Etykieta" class="review__label" />
            <input v-model="choice.text" aria-label="Treść wariantu" spellcheck="false" />
            <button
              type="button"
              class="icon-button"
              aria-label="Usuń wariant"
              @click="choices.splice(index, 1)"
            >
              ×
            </button>
          </div>
          <div>
            <button
              type="button"
              class="button button--quiet"
              @click="choices.push({ label: '', text: '' })"
            >
              Dodaj wariant
            </button>
          </div>
        </fieldset>

        <label>
          Odpowiedź
          <input v-model="form.answer" placeholder="np. B, PFP, A2, $x=3$" spellcheck="false" />
        </label>

        <div class="review__actions">
          <button type="button" class="button" @click="approveAndNext">Sprawdzone, następne</button>
          <button type="submit" class="button button--quiet">Zapisz</button>
          <button type="button" class="button button--quiet review__delete" @click="remove">
            Usuń
          </button>
        </div>

        <details v-if="task.ai_content && task.ai_content !== task.content">
          <summary>Pierwotny odczyt ({{ task.read_model ?? task.read_method }})</summary>
          <pre>{{ task.ai_content }}</pre>
        </details>
      </form>

      <section class="panel__card" aria-labelledby="preview-title">
        <h2 id="preview-title">Podgląd</h2>
        <p class="review__meta">
          {{ sourceName }} {{ form.year }}, zadanie {{ taskNumber(form) }} ({{ form.max_points }}
          pkt)
        </p>
        <MathText :text="form.content" />
        <p v-if="form.has_figure" class="review__figure">Rysunek (jeszcze niedostępny)</p>
        <ol v-if="closed" class="review__preview-choices">
          <li v-for="(choice, index) in choices" :key="index">
            <strong>{{ choice.label }}.</strong> <MathText :text="choice.text" />
          </li>
        </ol>
        <p v-if="form.answer">Odpowiedź: <MathText :text="form.answer" /></p>
      </section>
    </div>
  </main>
</template>

<style scoped>
.review__header {
  display: grid;
  justify-items: start;
  gap: 0.5rem;
}

.review__subtitle {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  color: var(--ink-soft);
  font-weight: 600;
}

.review {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 24rem), 1fr));
  align-items: start;
  gap: 1.5rem;
}

.review__numbers {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(6rem, 1fr));
  gap: 0.75rem;
}

.panel .review__check {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.review__choices {
  display: grid;
  gap: 0.6rem;
  margin: 0;
  padding: 0.75rem 1rem 1rem;
  border: 1px solid var(--hairline);
  border-radius: 0.75rem;
}

.review__choices legend {
  padding-inline: 0.35rem;
  font-size: 0.9rem;
  font-weight: 600;
}

.review__choice {
  display: grid;
  grid-template-columns: 3.5rem 1fr auto;
  align-items: center;
  gap: 0.5rem;
}

.review__label {
  text-align: center;
}

.review__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.review__delete {
  margin-left: auto;
  border-color: var(--panel-danger);
  color: var(--panel-danger);
}

.review__delete:hover {
  background: var(--panel-danger);
  color: #fff;
}

.review__meta {
  color: var(--ink-soft);
  font-weight: 600;
}

.review__figure {
  padding: 1.5rem;
  border: 2px dashed var(--hairline);
  border-radius: 0.75rem;
  color: var(--ink-soft);
  text-align: center;
}

.review__preview-choices {
  display: grid;
  gap: 0.4rem;
  list-style: none;
  padding: 0;
}
</style>
