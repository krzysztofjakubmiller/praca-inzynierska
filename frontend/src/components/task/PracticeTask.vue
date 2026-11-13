<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef } from 'vue'
import TaskFigure from '@/components/figures/TaskFigure.vue'
import StationIcon from '@/components/map/StationIcon.vue'
import AiFeedback from '@/components/task/AiFeedback.vue'
import AppIcon from '@/components/AppIcon.vue'
import AiSolution from '@/components/task/AiSolution.vue'
import AiTutor from '@/components/task/AiTutor.vue'
import AiTutorAvatar from '@/components/task/AiTutorAvatar.vue'
import MatchingTable from '@/components/task/MatchingTable.vue'
import MathText from '@/components/task/MathText.vue'
import OpenAnswer from '@/components/task/OpenAnswer.vue'
import TrueFalseTable from '@/components/task/TrueFalseTable.vue'
import TaskWhiteboard from '@/components/task/TaskWhiteboard.vue'
import { coordinatePlaneSpan, numberLineRange } from '@/figures'
import { toBase64 } from '@/photo'
import type { Difficulty } from '@/maps/types'
import {
  checkDemoTask,
  checkSolution,
  rateSolution,
  Rejected,
  taskSource,
  type Checked,
  type Graded,
  type Picture,
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
// Po złej odpowiedzi „Łatwe” zostaje wyszarzone zamiast znikać, żeby siatka 2 × 2 się nie
// rozjeżdżała.
const RATINGS: { rating: Rating; name: string; shape: Difficulty }[] = [
  { rating: 'latwy', name: 'Łatwe', shape: 0 },
  { rating: 'sredni', name: 'Średnie', shape: 1 },
  { rating: 'trudny', name: 'Trudne', shape: 2 },
  { rating: 'bardzo-trudny', name: 'Bardzo trudne', shape: 3 },
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
const graded = ref<Graded | null>(null)
const answers = ref<string[]>([])
// Zmiana tablicy, którą Dyżurny już widział, i ta, którą już ocenił; nowa kreska to nowa zmiana.
let boardSent: number | null = null
let boardGraded: number | null = null
const whiteboard = useTemplateRef<InstanceType<typeof TaskWhiteboard>>('whiteboard')
const tutor = useTemplateRef<InstanceType<typeof AiTutor>>('tutor')
const answer = useTemplateRef<HTMLElement>('answer')
const dock = useTemplateRef<HTMLElement>('dock')

const isOpen = computed(() => format.value === 'otwarte')
const isProof = computed(() => isOpen.value && !props.task.results?.length)
// Przy złym wyniku zadania otwartego i przy dowodzie zdjęcie albo tablica w czacie idą do
// oceny według zasad CKE, aż do oceny trudności. Ocenia się to samo rozwiązanie, więc zostaje
// najlepsza z ocen.
const grading = computed(() =>
  isOpen.value && !rated.value && (checked.value ? !correct.value : isProof.value)
    ? { solutionId: checked.value?.id ?? null, mode: props.mode, answers: answers.value }
    : null,
)

const complete = computed(() => {
  if (format.value === 'prawda-falsz') return !picked.value.includes(' ')
  if (format.value === 'dobieranie') return /\D/.test(picked.value) && /\d/.test(picked.value)
  return picked.value !== ''
})
const correct = computed(() => checked.value?.points === checked.value?.max_points)

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

// Tablica idzie do Dyżurnego, gdy coś się na niej zmieniło od ostatniego razu. Idzie też wtedy,
// gdy może być oceniona, a tej wersji jeszcze nie oceniono: uczeń często pyta o tablicę przed
// wysłaniem wyniku, a po złym wyniku tablica bez zmian nie szła już do oceny i zostawało 0 pkt.
async function newBoard(): Promise<Picture | null> {
  const version = whiteboard.value?.version() ?? null
  if (version === null) return null
  const forGrading = grading.value !== null && version !== boardGraded
  if (version === boardSent && !forGrading) return null
  const image = await whiteboard.value!.image()
  if (!image) return null
  boardSent = version
  if (grading.value) boardGraded = version
  return { image: await toBase64(image), image_type: 'image/png' }
}

// Ocena AI zastępuje wynik z programu, a ocena trudności trafia już do ocenionego rozwiązania.
function onGraded(result: Graded) {
  graded.value = result
  checked.value = result
  emit('checked')
}

// Po sprawdzeniu pulpit z oceną trudności rośnie i zasłaniał odpowiedzi, a kolory dobrej
// i złej odpowiedzi są pierwszym, co uczeń chce zobaczyć. Strona przewija się tak, żeby
// odpowiedzi kończyły się tuż nad pulpitem.
async function showAnswers() {
  await nextTick()
  if (!answer.value || !dock.value) return
  const hidden =
    answer.value.getBoundingClientRect().bottom - dock.value.getBoundingClientRect().top
  if (hidden > -12) window.scrollBy({ top: hidden + 12, behavior: 'smooth' })
}

function check(given: { answer: string } | { answers: string[] }) {
  if ('answers' in given) answers.value = given.answers
  return send(async () => {
    checked.value =
      props.demo && 'answer' in given
        ? await checkDemoTask(given.answer)
        : await checkSolution(props.task.id, props.mode, given)
    emit('checked')
    showAnswers()
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

// Po sprawdzeniu dobra odpowiedź jest zielona, a zła zaznaczona przez ucznia czerwona.
function resultOf(label: string): 'correct' | 'wrong' | '' {
  if (!checked.value) return ''
  if (checked.value.answer === label) return 'correct'
  return picked.value === label ? 'wrong' : ''
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
    <!-- Na tablicy rysunek leży na samej tablicy, więc w treści zostaje sam tekst. -->
    <TaskWhiteboard ref="whiteboard" :chat="!demo" @ask="tutor?.open()">
      <template #task>
        <MathText :text="task.content" />
      </template>
      <template v-if="task.figures?.content" #figure>
        <TaskFigure :figure="task.figures.content" :range="range" :span="span" quiet />
      </template>
    </TaskWhiteboard>

    <div ref="answer">
      <div v-if="format === 'wielokrotny-wybor'" class="practice-task__choices">
        <button
          v-for="choice in choices"
          :key="choice.label"
          type="button"
          class="practice-task__choice"
          :class="`practice-task__choice--${resultOf(choice.label)}`"
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
          <span v-if="resultOf(choice.label)" class="practice-task__sign" aria-hidden="true">
            {{ resultOf(choice.label) === 'correct' ? '✓' : '✗' }}
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
    </div>

    <template v-if="graded">
      <details class="practice-task__reading">
        <summary>Tak AI odczytało twoje rozwiązanie</summary>
        <MathText :text="graded.reading" />
      </details>
      <AiFeedback :request-id="graded.request_id" about="ocena" />
    </template>

    <AiSolution v-if="checked && !demo" :task-id="task.id" />

    <!-- Przed sprawdzeniem AI tylko podpowiada, po sprawdzeniu może wyjaśnić wszystko. -->
    <AiTutor
      v-if="!demo"
      ref="tutor"
      :task-id="task.id"
      :checked="checked !== null"
      :about="`${task.topic_name} · ${taskSource(task)}`"
      :board="newBoard"
      :grading="grading"
      @graded="onGraded"
    />

    <!-- Pulpit przyklejony do dołu ekranu: wynik i ocena trudności zostają pod kciukiem także
         przy długim zadaniu i długiej rozmowie z AI. -->
    <div
      v-if="checked || !isOpen || !demo || $slots.actions"
      ref="dock"
      class="practice-task__dock"
    >
      <div v-if="!checked" class="practice-task__actions">
        <button
          v-if="!isOpen"
          type="button"
          class="button practice-task__check"
          :disabled="!complete || busy"
          @click="check({ answer: picked })"
        >
          Sprawdź
        </button>
        <button
          v-else-if="isProof && !demo"
          type="button"
          class="button practice-task__check"
          @click="tutor?.open()"
        >
          Oddaj dowód dyżurnemu
        </button>
        <slot name="actions" />
      </div>

      <template v-else>
        <p class="practice-task__result" role="status">
          <template v-if="correct">Dobrze</template>
          <template v-else-if="isOpen">
            {{ checked.points }} z {{ checked.max_points }} pkt<template v-if="!isProof"
              >. Poprawny wynik: <MathText :text="checked.answer"
            /></template>
          </template>
          <template v-else>Źle. Poprawna odpowiedź: {{ keyText }}</template>
        </p>
        <p v-if="grading && !demo" class="practice-task__hint">
          Masz rozwiązanie na kartce albo tablicy?
          <button type="button" class="practice-task__link" @click="tutor?.open()">
            Wyślij je dyżurnemu</button
          >, a dostaniesz punkty za to, co jest dobrze.
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
          <legend class="practice-task__question">Jak trudne było to zadanie?</legend>
          <p class="practice-task__hint">Wybierz, a od razu przejdziesz do następnego.</p>
          <div class="practice-task__ratings">
            <button
              v-for="option in RATINGS"
              :key="option.rating"
              type="button"
              class="button button--quiet practice-task__rate"
              :disabled="busy || rated || (option.rating === 'latwy' && !correct)"
              @click="rate(option.rating)"
            >
              <StationIcon :difficulty="option.shape" :share="1" />
              {{ option.name }}
            </button>
          </div>
        </fieldset>
      </template>

      <p v-for="problem in problems" :key="problem" class="practice-task__problem" role="alert">
        {{ problem }}
      </p>

      <button v-if="!demo" type="button" class="practice-task__ask" @click="tutor?.open()">
        <AiTutorAvatar />
        Zapytaj dyżurnego
        <AppIcon name="chevron-right" class="practice-task__ask-arrow" />
      </button>
    </div>
  </article>
</template>

<style scoped>
/* Kolumna flex, a nie siatka: gdy strona da zadaniu więcej miejsca, niż zajmuje treść, pulpit
   schodzi na sam dół (margin-top: auto). */
.practice-task {
  display: flex;
  flex-direction: column;
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
  grid-template-columns: 2rem minmax(0, 1fr) auto;
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

/* Kolor nie jest jedynym sygnałem: obok stoi znak ✓ albo ✗, a wynik mówi też tekst pod spodem. */
.practice-task__choice.practice-task__choice--correct,
.practice-task__choice.practice-task__choice--wrong {
  --result: var(--correct);

  border-color: var(--result);
  outline: 2px solid var(--result);
  outline-offset: -4px;
}

.practice-task__choice.practice-task__choice--wrong {
  --result: var(--danger);
}

.practice-task__sign {
  display: grid;
  place-items: center;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 999px;
  background: var(--result);
  color: var(--surface);
  font-weight: 800;
}

.practice-task__choice-body {
  display: grid;
  gap: 0.5rem;
  min-width: 0;
}

.practice-task__label {
  font-weight: 750;
}

.practice-task__dock {
  position: sticky;
  bottom: 0;
  z-index: 1;
  display: grid;
  gap: 0.75rem;
  margin: auto calc(-1 * var(--gutter)) 0;
  padding: 1rem var(--gutter) calc(1rem + env(safe-area-inset-bottom));
  border-top: 1px solid var(--hairline);
  border-radius: 1.25rem 1.25rem 0 0;
  background: var(--surface);
  box-shadow: 0 -10px 24px rgb(29 31 34 / 0.12);
}

.practice-task__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.practice-task__check {
  justify-self: start;
}

.practice-task__problem {
  color: var(--danger);
  font-weight: 600;
}

.practice-task__result {
  font-size: 1.25rem;
  font-weight: 750;
  line-height: 1.3;
}

.practice-task__after-exam {
  font-weight: 650;
}

.practice-task__reading {
  color: var(--ink-soft);
}

.practice-task__reading summary {
  cursor: pointer;
}

.practice-task__rating {
  margin: 0;
  padding: 0;
  border: 0;
}

.practice-task__question {
  padding: 0;
  font-weight: 650;
}

.practice-task__link {
  padding: 0;
  border: 0;
  background: none;
  color: var(--ink);
  font: inherit;
  font-weight: 600;
  text-decoration: underline;
  cursor: pointer;
}

.practice-task__hint {
  margin-bottom: 0.625rem;
  color: var(--ink-soft);
  font-size: 0.875rem;
}

.practice-task__ratings {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.5rem;
}

/* Zwinięta rozmowa: wygląda jak pole do pisania, żeby było jasne, że tu się pyta. */
.practice-task__ask {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  min-height: 3rem;
  padding: 0 0.875rem 0 0.75rem;
  border: 1.5px solid var(--hairline);
  border-radius: 999px;
  background: var(--surface);
  color: var(--ink);
  font: inherit;
  font-weight: 600;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.2s ease;
}

.practice-task__ask:hover {
  border-color: var(--ink);
}

.practice-task__ask-arrow {
  width: 1.25rem;
  height: 1.25rem;
  margin-left: auto;
  rotate: -90deg;
}

.practice-task__rate {
  justify-content: flex-start;
  min-width: 0;
  padding-inline: 0.875rem;
  font-size: 1rem;
}
</style>
