<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import MathText from '@/components/task/MathText.vue'
import TaskFigure from '@/components/figures/TaskFigure.vue'
import { coordinatePlaneSpan, numberLineRange } from '@/figures'
import { panelApi, Rejected, type TemplateDetails, type TemplatePreview } from '@/panel/api'
import { STATUS_LABELS, useProblems } from '@/panel/format'

const props = defineProps<{ taskId: number; exam: string }>()
const { problems, run } = useProblems()

const details = ref<TemplateDetails | null>(null)
const text = ref('')
const notice = ref('')

const check = computed(() => details.value?.check_result)
const canAccept = computed(
  () => check.value?.passed && details.value?.review_status !== 'sprawdzone',
)
const editedFromAi = computed(
  () =>
    details.value?.ai_body &&
    JSON.stringify(details.value.ai_body) !== JSON.stringify(details.value.body),
)

// Baza oddaje JSONB z kluczami w swojej kolejności (najpierw "answer"), a szablon czyta się
// najłatwiej od parametrów, przez treść, do liczb z oryginału.
const KEY_ORDER = [
  'params',
  'computed',
  'conditions',
  'content',
  'choices',
  'figures',
  'answer',
  'steps',
  'original',
]

function templateText(body: Record<string, unknown>): string {
  const keys = Object.keys(body).sort((a, b) => {
    const place = (key: string) => (KEY_ORDER.includes(key) ? KEY_ORDER.indexOf(key) : 99)
    return place(a) - place(b)
  })
  return JSON.stringify(Object.fromEntries(keys.map((key) => [key, body[key]])), null, 2)
}

function show(loaded: TemplateDetails | null) {
  details.value = loaded
  text.value = loaded ? templateText(loaded.body) : ''
}

watch(
  () => props.taskId,
  (id) =>
    run(async () => {
      notice.value = ''
      show(await panelApi.template(id))
    }),
  { immediate: true },
)

function save() {
  return run(async () => {
    let body: unknown
    try {
      body = JSON.parse(text.value)
    } catch {
      throw new Rejected(['Szablon: niepoprawny JSON'])
    }
    show(await panelApi.saveTemplate(props.taskId, body))
    notice.value = check.value?.passed ? 'Zapisano, szablon przeszedł sprawdzanie.' : 'Zapisano.'
  })
}

function accept() {
  return run(async () => {
    show(await panelApi.acceptTemplate(props.taskId))
    notice.value = 'Szablon zaakceptowany, uczniowie dostaną jego warianty.'
  })
}

function remove() {
  if (!window.confirm('Usunąć szablon tego zadania?')) return
  return run(async () => {
    await panelApi.removeTemplate(props.taskId)
    show(null)
    notice.value = 'Szablon usunięty.'
  })
}

function title(item: TemplatePreview): string {
  if (!item.variant) return 'Oryginał'
  return Object.entries(item.variant)
    .map(([name, value]) => `${name} = ${value}`)
    .join(', ')
}

function figuresOf(item: TemplatePreview) {
  const figures = Object.values(item.figures ?? {})
  return { range: numberLineRange(figures), span: coordinatePlaneSpan(figures) }
}
</script>

<template>
  <section
    class="panel__card template"
    aria-labelledby="template-title"
    :style="{ '--figure-color': `var(--exam-${exam})` }"
  >
    <h2 id="template-title">Szablon wariantów</h2>

    <p v-if="!details" class="template__meta">
      Zadanie nie ma szablonu. Wklej JSON szablonu i zapisz.
    </p>
    <template v-else>
      <p class="template__meta">
        <span class="panel__status" :data-status="details.review_status">
          {{ STATUS_LABELS[details.review_status] }}
        </span>
        {{ details.read_model ?? details.read_method }}
      </p>
      <p v-if="check" class="template__meta">
        {{ check.passed ? 'Przeszedł sprawdzanie' : 'Nie przeszedł sprawdzania' }}
        <template v-if="check.draws">
          · losowania: {{ check.successful }}/{{ check.draws }} · warianty z różnymi danymi:
          {{ check.distinct }}
        </template>
      </p>
      <ul v-if="check?.problems.length" class="panel__problems">
        <li v-for="problem in check.problems" :key="problem">{{ problem }}</li>
      </ul>
    </template>

    <ul v-if="problems.length" class="panel__problems">
      <li v-for="problem in problems" :key="problem">{{ problem }}</li>
    </ul>
    <p v-else-if="notice" class="panel__notice">{{ notice }}</p>

    <label>
      Szablon (JSON)
      <textarea v-model="text" rows="14" spellcheck="false" />
    </label>

    <div class="template__actions">
      <button type="button" class="button" :disabled="!canAccept" @click="accept">
        Zaakceptuj
      </button>
      <button type="button" class="button button--quiet" @click="save">Sprawdź i zapisz</button>
      <button
        v-if="details"
        type="button"
        class="button button--quiet template__delete"
        @click="remove"
      >
        Usuń szablon
      </button>
    </div>

    <details v-if="editedFromAi">
      <summary>Szablon od AI przed poprawkami</summary>
      <pre>{{ JSON.stringify(details?.ai_body, null, 2) }}</pre>
    </details>

    <ol v-if="details?.preview.length" class="template__preview">
      <li v-for="item in details.preview" :key="title(item)">
        <h3>{{ title(item) }}</h3>
        <MathText :text="item.content" />
        <TaskFigure
          v-if="item.figures?.content"
          :figure="item.figures.content"
          v-bind="figuresOf(item)"
        />
        <ol v-if="item.choices" class="template__choices">
          <li v-for="(choice, label) in item.choices" :key="label">
            <strong>{{ label }}.</strong> <MathText :text="choice" />
            <TaskFigure
              v-if="item.figures?.[label]"
              :figure="item.figures[label]!"
              v-bind="figuresOf(item)"
            />
          </li>
        </ol>
        <p>Klucz: <MathText :text="item.answer" /></p>
      </li>
    </ol>
  </section>
</template>

<style scoped>
.template {
  margin-top: 1.5rem;
}

.template__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  color: var(--ink-soft);
  font-weight: 600;
}

.template__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.template__delete {
  margin-left: auto;
  border-color: var(--panel-danger);
  color: var(--panel-danger);
}

.template__delete:hover {
  background: var(--panel-danger);
  color: #fff;
}

.template__preview {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 18rem), 1fr));
  gap: 1rem;
  list-style: none;
  padding: 0;
}

.template__preview > li {
  display: grid;
  align-content: start;
  gap: 0.5rem;
  padding: 1rem;
  border: 1px solid var(--hairline);
  border-radius: 0.75rem;
}

.template__preview h3 {
  margin: 0;
  font-size: 1rem;
}

.template__choices {
  display: grid;
  gap: 0.3rem;
  list-style: none;
  padding: 0;
}
</style>
