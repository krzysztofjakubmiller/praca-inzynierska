<script setup lang="ts">
import { computed, ref } from 'vue'
import TaskFigure from '@/components/figures/TaskFigure.vue'
import StationIcon from '@/components/map/StationIcon.vue'
import MatchingTable from '@/components/task/MatchingTable.vue'
import MathText from '@/components/task/MathText.vue'
import OpenAnswer from '@/components/task/OpenAnswer.vue'
import TrueFalseTable from '@/components/task/TrueFalseTable.vue'
import { coordinatePlaneSpan, numberLineRange } from '@/figures'
import type { Difficulty } from '@/maps/types'
import {
  checkDemoTask,
  checkSolution,
  rateSolution,
  Rejected,
  taskSource,
  type Checked,
  type PracticeMode,
  type PracticeTask,
  type Rating,
} from '@/practice'

// Jedno zadanie od treści do oceny trudności. Strona z kolejnymi zadaniami podaje nowe zadanie
// z innym kluczem komponentu, więc stan zaczyna się od zera.
// demo: zadanie ze strony demo, sprawdzane bez konta, bez zapisu i bez oceny trudności.
const props = defineProps<{ task: PracticeTask; mode: PracticeMode; demo?: boolean }>()

const emit = defineEmits<{ checked: []; next: [] }>()

// Kształty stacji z mapy: od koła (łatwy) do pięciokąta (bardzo trudny).
const RATINGS: { rating: Rating; name: string; shape: Difficulty }[] = [
  { rating: 'latwy', name: 'łatwy', shape: 0 },
  { rating: 'sredni', name: 'średni', shape: 1 },
  { rating: 'trudny', name: 'trudny', shape: 2 },
  { rating: 'bardzo-trudny', name: 'bardzo trudny', shape: 3 },
]

const choices = computed(() =>
  Object.entries(props.task.choices ?? {}).map(([label, text]) => ({ label, text })),
)
const figures = computed(() => Object.values(props.task.figures ?? {}))
const range = computed(() => numberLineRange(figures.value))
const span = computed(() => coordinatePlaneSpan(figures.value))

const format = computed(() => props.task.answer_format)
const picked = ref(format.value === 'prawda-falsz' ? ' '.repeat(choices.value.length) : '')
const checked = ref<Checked | null>(null)
const rated = ref(false)
const afterExam = ref(false)
const busy = ref(false)
const problems = ref<string[]>([])

const complete = computed(() => {
  if (format.value === 'prawda-falsz') return !picked.value.includes(' ')
  if (format.value === 'dobieranie') return /\D/.test(picked.value) && /\d/.test(picked.value)
  return picked.value !== ''
})
const correct = computed(() => checked.value?.points === checked.value?.max_points)
const ratings = computed(() =>
  correct.value ? RATINGS : RATINGS.filter(({ rating }) => rating !== 'latwy'),
)

function pickTrueFalse(index: number, mark: 'P' | 'F') {
  picked.value = picked.value.slice(0, index) + mark + picked.value.slice(index + 1)
}

// Para w dobieraniu to zawsze litera i cyfra; nowy wybór zastępuje poprzedni z tej samej kolumny.
function pickMatching(label: string) {
  const letter = picked.value.replace(/\d/g, '')
  const digit = picked.value.replace(/\D/g, '')
  picked.value = /\d/.test(label) ? letter + label : label + digit
}

async function send(action: () => Promise<void>) {
  busy.value = true
  problems.value = []
  try {
    await action()
  } catch (error) {
    problems.value =
      error instanceof Rejected
        ? error.problems
        : ['Nie udało się połączyć z serwerem. Spróbuj jeszcze raz.']
  } finally {
    busy.value = false
  }
}

function check(given: { answer: string } | { points: number }) {
  return send(async () => {
    checked.value =
      props.demo && 'answer' in given
        ? await checkDemoTask(given.answer)
        : await checkSolution(props.task.id, props.mode, given)
    emit('checked')
  })
}

function rate(rating: Rating) {
  return send(async () => {
    const scheduled = await rateSolution(checked.value!.id, rating)
    rated.value = true
    afterExam.value = scheduled.after_exam
    if (!scheduled.after_exam) emit('next')
  })
}

// Klucz po sprawdzeniu w czytelnej postaci: „P, F” zamiast „PF”.
const keyText = computed(() => {
  const answer = checked.value?.answer ?? ''
  return format.value === 'prawda-falsz' ? answer.split('').join(', ') : answer
})
</script>

<template>
  <article class="practice-task" :style="{ '--figure-color': `var(--exam-${task.exam})` }">
    <p class="practice-task__meta">
      {{ task.topic_name }} · {{ taskSource(task) }} · {{ task.max_points }} pkt
    </p>

    <MathText :text="task.content" class="practice-task__content" />
    <TaskFigure
      v-if="task.figures?.content"
      :figure="task.figures.content"
      :range="range"
      :span="span"
    />

    <div v-if="format === 'wielokrotny-wybor'" class="practice-task__choices">
      <button
        v-for="choice in choices"
        :key="choice.label"
        type="button"
        class="practice-task__choice"
        :class="{
          'practice-task__choice--key': checked && checked.answer === choice.label,
          'practice-task__choice--wrong': checked && checked.answer !== choice.label,
        }"
        :aria-pressed="picked === choice.label"
        :disabled="checked !== null"
        @click="picked = choice.label"
      >
        <strong class="practice-task__label">{{ choice.label }}.</strong>
        <span class="practice-task__choice-body">
          <MathText :text="choice.text" />
          <TaskFigure
            v-if="task.figures?.[choice.label]"
            :figure="task.figures[choice.label]!"
            :range="range"
            :span="span"
          />
        </span>
      </button>
    </div>
    <TrueFalseTable
      v-else-if="format === 'prawda-falsz'"
      :choices="choices"
      :picked="picked"
      :answer="checked?.answer"
      @pick="pickTrueFalse"
    />
    <MatchingTable
      v-else-if="format === 'dobieranie'"
      :choices="choices"
      :connector="task.connector ?? ''"
      :picked="picked"
      :answer="checked?.answer"
      @pick="pickMatching"
    />
    <OpenAnswer v-else :task="task" @done="check" />

    <button
      v-if="format !== 'otwarte' && !checked"
      type="button"
      class="button practice-task__check"
      :disabled="!complete || busy"
      @click="check({ answer: picked })"
    >
      Sprawdź
    </button>

    <p v-for="problem in problems" :key="problem" class="practice-task__problem" role="alert">
      {{ problem }}
    </p>

    <template v-if="checked">
      <p class="practice-task__result" role="status">
        <template v-if="format === 'otwarte'"
          >{{ checked.points }} z {{ checked.max_points }} pkt</template
        >
        <template v-else-if="correct">Dobrze</template>
        <template v-else>Źle. Poprawna odpowiedź: {{ keyText }}</template>
      </p>

      <template v-if="afterExam">
        <p class="practice-task__after-exam" role="status">
          Opanowane. To zadanie nie wróci już przed maturą.
        </p>
        <button type="button" class="button practice-task__check" @click="emit('next')">
          Dalej
        </button>
      </template>
      <fieldset v-else-if="!demo" class="practice-task__rating">
        <legend>Jak trudne było to zadanie?</legend>
        <button
          v-for="option in ratings"
          :key="option.rating"
          type="button"
          class="button button--quiet practice-task__rate"
          :disabled="busy || rated"
          @click="rate(option.rating)"
        >
          <StationIcon :difficulty="option.shape" :share="1" />
          {{ option.name }}
        </button>
      </fieldset>
    </template>
  </article>
</template>

<style scoped>
.practice-task {
  display: grid;
  gap: 1.25rem;
  max-width: 44rem;
}

.practice-task__meta {
  color: var(--ink-soft);
  font-size: 0.875rem;
}

.practice-task__content {
  font-size: 1.0625rem;
  line-height: 1.55;
}

.practice-task__choices {
  display: grid;
  gap: 0.5rem;
}

.practice-task__choice {
  display: grid;
  grid-template-columns: 2rem minmax(0, 1fr);
  align-items: start;
  gap: 0.5rem;
  min-height: 3rem;
  padding: 0.75rem 1rem;
  border: 2px solid var(--hairline);
  border-radius: 1rem;
  background: var(--surface);
  color: var(--ink);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.practice-task__choice:hover:enabled {
  border-color: var(--ink-soft);
}

.practice-task__choice[aria-pressed='true'] {
  border-color: var(--ink);
}

.practice-task__choice:disabled {
  cursor: default;
}

/* Po sprawdzeniu: klucz ma gruby obrys, zła zaznaczona odpowiedź kolor błędu. */
.practice-task__choice--key {
  border-color: var(--ink);
  outline: 2px solid var(--ink);
  outline-offset: -4px;
}

.practice-task__choice--wrong[aria-pressed='true'] {
  border-color: var(--danger);
}

.practice-task__choice-body {
  display: grid;
  gap: 0.5rem;
  min-width: 0;
}

.practice-task__label {
  font-weight: 750;
}

.practice-task__check {
  justify-self: start;
}

.practice-task__problem {
  color: var(--danger);
  font-weight: 600;
}

.practice-task__result {
  font-size: 1.375rem;
  font-weight: 750;
}

.practice-task__after-exam {
  font-weight: 650;
}

.practice-task__rating {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin: 0;
  padding: 0;
  border: 0;
}

.practice-task__rating legend {
  margin-bottom: 0.5rem;
  font-weight: 650;
}

.practice-task__rate {
  font-size: 1rem;
}
</style>
