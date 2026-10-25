<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import StationMarker from '@/components/landing/StationMarker.vue'
import PracticeTask from '@/components/task/PracticeTask.vue'
import { EXAMS } from '@/config/exams'
import { TOPIC_MAPS } from '@/maps'
import { listGroups } from '@/maps/order'
import {
  nextInTopic,
  nextReview,
  randomTask,
  Rejected,
  type PracticeMode,
  type PracticeTask as Task,
} from '@/practice'

// Jedna strona dla trzech trybów: ćwiczenie tematu, powtórki i losowe. Różnią się tylko tym,
// skąd biorą kolejne zadanie i co mówią, gdy zadań zabraknie.
const props = defineProps<{ exam: string; mode: PracticeMode; topic?: string }>()

const router = useRouter()
const examInfo = computed(() => EXAMS.find((item) => item.id === props.exam)!)
const map = computed(() => TOPIC_MAPS.find((item) => item.examId === props.exam)!)
const title = computed(() => {
  if (props.mode === 'powtorka') return 'Powtórki'
  if (props.mode === 'losowe') return 'Losowe zadanie'
  return map.value.graph.stations[props.topic ?? '']?.name ?? examInfo.value.name
})

const task = ref<Task | null>(null)
const loaded = ref(false)
const checked = ref(false)
const problem = ref('')
// Ostatnie 3 pominięte albo zrobione zadania nie wracają od razu.
const recent = ref<number[]>([])
// Ćwiczenie: ile nierobionych zostało. Powtórki i losowe: ile zadań ma uczeń w powtórkach.
const count = ref(0)
const leftToday = ref(0)
const topicTotal = ref(0)
const more = ref(false)
const topics = ref<string[]>([])

// Każdy temat raz, na pierwszej linii, jak w widoku listy.
const groups = computed(() =>
  listGroups(map.value).map((group) => ({
    line: group.line,
    ids: group.stops.filter((stop) => !stop.repeat).map((stop) => stop.id),
  })),
)

function lineChosen(ids: string[]) {
  return ids.every((id) => topics.value.includes(id))
}

function toggleLine(ids: string[]) {
  const others = topics.value.filter((id) => !ids.includes(id))
  topics.value = lineChosen(ids) ? others : [...others, ...ids]
}

async function fetchNext(): Promise<Task | null> {
  if (props.mode === 'cwiczenie') {
    const next = await nextInTopic(props.exam, props.topic ?? '', recent.value)
    count.value = next.left
    topicTotal.value = next.total
    return next.task
  }
  if (props.mode === 'powtorka') {
    const next = await nextReview(props.exam, more.value, recent.value)
    count.value = next.cards
    leftToday.value = next.left_today
    return next.task
  }
  const next = await randomTask(props.exam, topics.value, recent.value)
  count.value = next.cards
  return next.task
}

async function loadNext() {
  problem.value = ''
  checked.value = false
  try {
    task.value = await fetchNext()
    loaded.value = true
    window.scrollTo(0, 0)
  } catch (error) {
    if (error instanceof Rejected && error.status === 401) {
      await router.replace({ name: 'login', query: { dalej: router.currentRoute.value.fullPath } })
      return
    }
    problem.value =
      error instanceof Rejected
        ? error.problems.join(' ')
        : 'Serwer nie odpowiada. Spróbuj za chwilę.'
  }
}

function remember() {
  if (task.value) recent.value = [...recent.value, task.value.id].slice(-3)
}

function done() {
  remember()
  loadNext()
}

function skip() {
  remember()
  loadNext()
}

function keepGoing() {
  more.value = true
  loadNext()
}

onMounted(loadNext)
watch(topics, loadNext)
</script>

<template>
  <div class="practice">
    <header class="practice__top">
      <RouterLink
        class="practice__back"
        :to="`/${exam}`"
        :style="{ '--marker-fill': `var(--exam-${exam})` }"
      >
        <AppIcon name="chevron-left" class="practice__chevron" />
        <StationMarker :shape="examInfo.solid" class="practice__marker" />
        <span class="practice__title">{{ title }}</span>
      </RouterLink>
    </header>

    <main class="practice__main">
      <details v-if="mode === 'losowe'" class="practice__filters">
        <summary>Działy: {{ topics.length ? `wybrane (${topics.length})` : 'wszystkie' }}</summary>
        <div class="practice__switch" role="group" aria-label="Liczby w zadaniu">
          <button type="button" aria-pressed="true">Oryginał</button>
          <button type="button" aria-pressed="false" disabled>Zmienione liczby</button>
        </div>
        <p class="practice__note">Zmienione liczby pojawią się razem z wariantami zadań.</p>
        <fieldset v-for="group in groups" :key="group.line.id" class="practice__line">
          <legend>
            <label>
              <input
                type="checkbox"
                :checked="lineChosen(group.ids)"
                @change="toggleLine(group.ids)"
              />
              <span
                class="practice__swatch"
                :style="{ background: `var(--line-${group.line.color})` }"
                aria-hidden="true"
              />
              Linia {{ group.line.name }}
            </label>
          </legend>
          <label v-for="id in group.ids" :key="id" class="practice__topic">
            <input v-model="topics" type="checkbox" :value="id" />
            {{ map.graph.stations[id]?.name }}
          </label>
        </fieldset>
      </details>

      <p v-if="problem" class="practice__problem" role="alert">{{ problem }}</p>

      <template v-else-if="task">
        <p v-if="mode === 'cwiczenie'" class="practice__count">Nierobione w temacie: {{ count }}</p>
        <p v-else-if="mode === 'powtorka' && !more" class="practice__count">
          Na dziś zostało: {{ leftToday }}
        </p>
        <PracticeTask
          :key="task.id"
          :task="task"
          :mode="mode"
          @checked="checked = true"
          @next="done"
        />
        <button
          v-if="!checked"
          type="button"
          class="button button--quiet practice__skip"
          @click="skip"
        >
          Pomiń
        </button>
      </template>

      <section v-else-if="loaded" class="practice__empty">
        <template v-if="mode === 'cwiczenie' && !topicTotal">
          <h1>W tym temacie nie ma jeszcze zadań</h1>
          <p>Zadania z arkuszy dochodzą temat po temacie.</p>
          <RouterLink class="button" :to="`/${exam}`">Wróć do mapy</RouterLink>
        </template>
        <template v-else-if="mode === 'cwiczenie'">
          <h1>Wszystkie zadania z tego tematu są zrobione</h1>
          <p>Wrócą w powtórkach, kiedy przyjdzie na nie pora.</p>
          <RouterLink class="button" :to="`/${exam}`">Wróć do mapy</RouterLink>
        </template>
        <template v-else-if="mode === 'losowe' && topics.length">
          <h1>W wybranych działach nie ma jeszcze zrobionych zadań</h1>
          <p>Losowe zadania pochodzą z tematów, w których już coś było robione.</p>
        </template>
        <template v-else-if="!count">
          <h1>Nie ma jeszcze czego powtarzać</h1>
          <p>Tu wracają zrobione już zadania. Zacznij od „Ćwicz” przy temacie na mapie.</p>
          <RouterLink class="button" :to="`/${exam}`">Wróć do mapy</RouterLink>
        </template>
        <template v-else>
          <h1>Na dziś wystarczy</h1>
          <p>Powtórki na dziś są zrobione. Możesz robić dalej zadania, które wrócą najwcześniej.</p>
          <button type="button" class="button" @click="keepGoing">Rób dalej</button>
        </template>
      </section>
    </main>
  </div>
</template>

<style scoped>
.practice {
  min-height: 100svh;
}

.practice__top {
  display: flex;
  align-items: center;
  height: var(--header-h);
  padding-inline: var(--gutter);
  border-bottom: 1px solid var(--hairline);
}

.practice__back {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  min-width: 0;
  min-height: 2.75rem;
  margin-left: -0.5rem;
  padding: 0 0.875rem 0 0.25rem;
  border-radius: 999px;
  font-size: 1.0625rem;
  font-weight: 700;
  text-decoration: none;
  transition: background-color 0.2s ease;
}

.practice__back:hover {
  background: var(--hairline);
}

.practice__chevron {
  flex: none;
  width: 1.25rem;
  height: 1.25rem;
}

.practice__marker {
  flex: none;
  font-size: 1.1rem;
}

.practice__title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.practice__main {
  display: grid;
  gap: 1.25rem;
  max-width: 44rem;
  margin-inline: auto;
  padding: 1.5rem var(--gutter) 3rem;
}

.practice__count,
.practice__note {
  color: var(--ink-soft);
  font-size: 0.875rem;
}

.practice__skip {
  justify-self: start;
}

.practice__problem {
  color: var(--danger);
  font-weight: 600;
}

.practice__empty {
  display: grid;
  justify-items: start;
  gap: 1rem;
}

.practice__empty h1 {
  font-size: clamp(1.6rem, 1.2rem + 1.6vw, 2.25rem);
  font-weight: 750;
  font-stretch: 90%;
  line-height: 1.1;
}

.practice__empty p {
  max-width: 44ch;
}

.practice__filters {
  display: grid;
  gap: 1rem;
  padding: 1rem 1.25rem;
  border: 1px solid var(--hairline);
  border-radius: 1rem;
  background: var(--surface);
}

.practice__filters summary {
  min-height: 2.75rem;
  align-content: center;
  font-weight: 700;
  cursor: pointer;
}

.practice__filters[open] summary {
  margin-bottom: 0.75rem;
}

/* Jak przełącznik „Mapa | Lista” na stronie egzaminu. */
.practice__switch {
  display: inline-flex;
  gap: 0.25rem;
  padding: 0.25rem;
  border: 1.5px solid var(--hairline);
  border-radius: 999px;
}

.practice__switch button {
  min-height: 2.25rem;
  padding: 0 0.9rem;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--ink);
  font: inherit;
  font-weight: 600;
}

.practice__switch button[aria-pressed='true'] {
  background: var(--ink);
  color: var(--ground);
}

.practice__switch button:disabled {
  color: var(--ink-soft);
}

.practice__line {
  display: grid;
  gap: 0.25rem;
  margin: 0.75rem 0 0;
  padding: 0;
  border: 0;
}

.practice__line legend label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 2.75rem;
  font-weight: 700;
}

.practice__swatch {
  width: 1.5rem;
  height: 0.5rem;
  border-radius: 999px;
}

.practice__topic {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 2.75rem;
  padding-left: 1.75rem;
}
</style>
