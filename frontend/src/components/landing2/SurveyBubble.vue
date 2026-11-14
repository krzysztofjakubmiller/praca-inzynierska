<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue'
import {
  LIKERT,
  answers,
  blockedClicks,
  nextPage,
  saveAnswer,
  type PageId,
  type Visit,
} from '@/landing2/survey'

const props = defineProps<{ page: PageId }>()

const QUESTIONS = [
  {
    key: 'looks',
    text: 'Ile na 10 wygląda ta strona?',
    hint: '1 to bardzo źle, 10 to bardzo dobrze.',
  },
  { key: 'expensive', text: 'Czy ta strona wygląda drogo?', hint: '' },
  { key: 'buying', text: 'Czy ta strona zachęca do zakupu?', hint: '' },
] as const

type QuestionKey = (typeof QUESTIONS)[number]['key']

// Po tylu milisekundach znika zachęta obok dymka i komunikat o wyłączonym przycisku.
const HINT_MS = 7000
// Tyle pikseli przed końcem strony ankieta wysuwa się sama.
const END_MARGIN = 32

const log = useTemplateRef<HTMLElement>('log')
const open = ref(false)
const hint = ref<'rate' | 'blocked' | null>(null)
const draft = ref<Partial<Record<QuestionKey, number>>>({})
const comment = ref('')
// Numer pytania, na które teraz czekamy; 3 oznacza miejsce na komentarz i wysłanie.
const asked = ref(0)
const state = ref<'asking' | 'sending' | 'failed'>('asking')
const changing = ref(false)

const saved = computed(() => answers.value[props.page])
const next = computed(() => nextPage(props.page))

// Jak oceniający oglądał stronę: te liczby idą razem z oceną.
let deepest = 0
let seconds = 0
let visibleSince = performance.now()
let openedBy: Visit['openedBy'] = 'klik'
let triedTask = false
let endReached = false
let hintTimer = 0
const blockedBefore = blockedClicks.value

function answerLabel(key: QuestionKey): string {
  const value = draft.value[key]
  if (value === undefined) return ''
  return key === 'looks' ? `${value} na 10` : LIKERT[value - 1]!
}

function showHint(kind: 'rate' | 'blocked') {
  hint.value = kind
  window.clearTimeout(hintTimer)
  hintTimer = window.setTimeout(() => (hint.value = null), HINT_MS)
}

function measure() {
  const room = document.documentElement.scrollHeight - window.innerHeight
  if (room <= 0) return
  deepest = Math.max(deepest, Math.min(1, window.scrollY / room))
  if (endReached || window.scrollY < room - END_MARGIN) return
  endReached = true
  if (!saved.value && !open.value) {
    openedBy = 'koniec-strony'
    open.value = true
  }
}

function onVisibility() {
  if (document.hidden) seconds += (performance.now() - visibleSince) / 1000
  else visibleSince = performance.now()
}

function onSubmit(event: Event) {
  if (event.target instanceof Element && event.target.closest('.trial')) triedTask = true
}

function toggle() {
  open.value = !open.value
  hint.value = null
}

function choose(index: number, value: number) {
  draft.value[QUESTIONS[index]!.key] = value
  const missing = QUESTIONS.findIndex((question) => draft.value[question.key] === undefined)
  asked.value = missing === -1 ? QUESTIONS.length : missing
}

function change() {
  const current = saved.value
  if (current) {
    draft.value = { looks: current.looks, expensive: current.expensive, buying: current.buying }
    comment.value = current.comment
  }
  asked.value = 0
  changing.value = true
}

async function submit() {
  const { looks, expensive, buying } = draft.value
  if (looks === undefined || expensive === undefined || buying === undefined) return
  state.value = 'sending'
  const visibleNow = document.hidden ? 0 : (performance.now() - visibleSince) / 1000
  try {
    await saveAnswer(
      props.page,
      { looks, expensive, buying, comment: comment.value.trim() },
      {
        scrolled: Math.round(deepest * 100),
        seconds: Math.round(seconds + visibleNow),
        openedBy,
        triedTask,
        blockedClicks: blockedClicks.value - blockedBefore,
      },
    )
    state.value = 'asking'
    changing.value = false
  } catch {
    state.value = 'failed'
  }
}

// Nowe pytanie pojawia się na dole rozmowy, więc okno samo do niego zjeżdża.
watch([asked, open, state], async () => {
  await nextTick()
  log.value?.scrollTo({ top: log.value.scrollHeight })
})

watch(blockedClicks, () => showHint('blocked'))

onMounted(() => {
  window.addEventListener('scroll', measure, { passive: true })
  document.addEventListener('visibilitychange', onVisibility)
  document.addEventListener('submit', onSubmit, true)
  if (!saved.value) showHint('rate')
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', measure)
  document.removeEventListener('visibilitychange', onVisibility)
  document.removeEventListener('submit', onSubmit, true)
  window.clearTimeout(hintTimer)
})
</script>

<template>
  <div class="survey" @keydown.esc="open = false">
    <Transition name="survey-pop">
      <section v-if="open" class="survey__panel" role="dialog" aria-label="Ankieta o tej stronie">
        <header class="survey__head">
          <span class="survey__avatar" aria-hidden="true">M</span>
          <p class="survey__who">
            <strong>Matma po kolei</strong>
            <span>3 krótkie pytania o tę stronę</span>
          </p>
          <button class="survey__close" type="button" aria-label="Zamknij ankietę" @click="toggle">
            <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 5l10 10M15 5L5 15" /></svg>
          </button>
        </header>

        <div ref="log" class="survey__log">
          <template v-if="saved && !changing">
            <p class="survey__message">
              Dziękujemy! Twoja ocena tej strony to {{ saved.looks }} na 10.
            </p>
            <div class="survey__after">
              <RouterLink v-if="next" class="survey__send" :to="`/wizytowka/${next}`">
                Następna strona
              </RouterLink>
              <RouterLink class="survey__link" :to="{ name: 'survey' }">Lista stron</RouterLink>
              <button class="survey__link" type="button" @click="change">Zmień ocenę</button>
            </div>
          </template>

          <template v-else>
            <template v-for="(question, index) in QUESTIONS" :key="question.key">
              <template v-if="index <= asked || draft[question.key] !== undefined">
                <p class="survey__message">
                  {{ question.text }}
                  <span v-if="question.hint" class="survey__aside">{{ question.hint }}</span>
                </p>
                <div
                  v-if="index === asked"
                  class="survey__options"
                  :class="{ 'survey__options--scale': question.key === 'looks' }"
                  role="group"
                  :aria-label="question.text"
                >
                  <template v-if="question.key === 'looks'">
                    <button
                      v-for="value in 10"
                      :key="value"
                      class="survey__option"
                      type="button"
                      :aria-pressed="draft.looks === value"
                      @click="choose(index, value)"
                    >
                      {{ value }}
                    </button>
                  </template>
                  <template v-else>
                    <button
                      v-for="(label, position) in LIKERT"
                      :key="label"
                      class="survey__option"
                      type="button"
                      :aria-pressed="draft[question.key] === position + 1"
                      @click="choose(index, position + 1)"
                    >
                      {{ label }}
                    </button>
                  </template>
                </div>
                <button
                  v-else
                  class="survey__reply"
                  type="button"
                  :aria-label="`Twoja odpowiedź: ${answerLabel(question.key)}. Zmień`"
                  @click="asked = index"
                >
                  {{ answerLabel(question.key) }}
                </button>
              </template>
            </template>

            <template v-if="asked === QUESTIONS.length">
              <label class="survey__message" for="survey-comment">
                Chcesz coś dodać?
                <span class="survey__aside">Komentarz nie jest obowiązkowy.</span>
              </label>
              <textarea
                id="survey-comment"
                v-model="comment"
                class="survey__comment"
                rows="2"
                maxlength="2000"
                placeholder="Co ci się podoba, a co przeszkadza?"
              />
              <p v-if="state === 'failed'" class="survey__error" role="alert">
                Nie udało się wysłać oceny. Sprawdź połączenie i spróbuj jeszcze raz.
              </p>
              <button
                class="survey__send"
                type="button"
                :disabled="state === 'sending'"
                @click="submit"
              >
                {{ state === 'sending' ? 'Wysyłam…' : 'Wyślij ocenę' }}
              </button>
            </template>
          </template>
        </div>
      </section>
    </Transition>

    <Transition name="survey-hint">
      <p v-if="hint && !open" class="survey__hint" role="status">
        {{
          hint === 'rate'
            ? 'Oceń tę stronę'
            : 'To podgląd do ankiety. Ten przycisk zadziała w gotowej aplikacji.'
        }}
      </p>
    </Transition>

    <button
      class="survey__bubble"
      type="button"
      :aria-expanded="open"
      aria-label="Ankieta: oceń tę stronę"
      @click="toggle"
    >
      <svg v-if="open" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
      <svg v-else-if="saved" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 12.5l4.5 4.5L19 7.5" />
      </svg>
      <svg v-else viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 5.5h16v10.5H10.5L6 20v-4H4z" />
      </svg>
      <span v-if="!saved && !open" class="survey__dot" aria-hidden="true" />
    </button>
  </div>
</template>

<style scoped>
/* Dymek ma własne, stałe kolory, żeby wyglądał tak samo na każdej wizytówce. */
.survey {
  --s-ink: #1d1f22;
  --s-soft: #5a5e65;
  --s-paper: #ffffff;
  --s-wash: #eff0ed;
  --s-accent: #2459c7;
  position: fixed;
  right: max(0.9rem, env(safe-area-inset-right));
  bottom: max(0.9rem, env(safe-area-inset-bottom));
  z-index: 60;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  color: var(--s-ink);
  font-family: var(--font-sans);
  font-size: 1rem;
  line-height: 1.4;
}

.survey :focus-visible {
  outline: 3px solid var(--s-accent);
  outline-offset: 2px;
}

.survey__bubble {
  position: relative;
  display: grid;
  flex: none;
  place-items: center;
  width: 3.75rem;
  height: 3.75rem;
  padding: 0;
  border: 2px solid var(--s-paper);
  border-radius: 50%;
  background: var(--s-ink);
  color: var(--s-paper);
  box-shadow:
    0 2px 4px rgb(0 0 0 / 0.2),
    0 10px 24px -6px rgb(0 0 0 / 0.5);
  cursor: pointer;
  transition: scale 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.survey__bubble:hover {
  scale: 1.06;
}

.survey__bubble:active {
  scale: 0.96;
}

.survey__bubble svg {
  width: 1.7rem;
  height: 1.7rem;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.survey__dot {
  position: absolute;
  top: -0.1rem;
  right: -0.1rem;
  width: 0.95rem;
  height: 0.95rem;
  border: 2px solid var(--s-paper);
  border-radius: 50%;
  background: #e23b2e;
}

.survey__hint {
  max-width: min(15rem, calc(100vw - 6.5rem));
  padding: 0.5rem 0.85rem;
  border-radius: 1rem 1rem 0.3rem 1rem;
  background: var(--s-paper);
  box-shadow:
    0 1px 2px rgb(0 0 0 / 0.14),
    0 8px 20px -6px rgb(0 0 0 / 0.35);
  font-size: 0.9375rem;
  font-weight: 650;
  line-height: 1.3;
}

/* Okno rozmowy wyrasta z dymka: rośnie od jego środka. */
.survey__panel {
  position: absolute;
  right: 0;
  bottom: calc(100% + 0.7rem);
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  width: min(23rem, calc(100vw - 1.8rem));
  max-height: min(36rem, calc(100svh - 6.5rem));
  border-radius: 1.3rem 1.3rem 0.4rem 1.3rem;
  background: var(--s-paper);
  box-shadow:
    0 2px 5px rgb(0 0 0 / 0.14),
    0 26px 52px -14px rgb(0 0 0 / 0.55);
  overflow: hidden;
  transform-origin: calc(100% - 1.9rem) calc(100% + 2.4rem);
}

.survey__head {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  padding: 0.75rem 0.6rem 0.75rem 0.95rem;
  background: var(--s-ink);
  color: var(--s-paper);
}

.survey__avatar {
  display: grid;
  flex: none;
  place-items: center;
  width: 2.3rem;
  height: 2.3rem;
  border-radius: 50%;
  background: var(--s-paper);
  color: var(--s-ink);
  font-weight: 800;
}

.survey__who {
  display: grid;
  margin-right: auto;
  line-height: 1.25;
}

.survey__who span {
  color: #c9cbd0;
  font-size: 0.8125rem;
}

.survey__close {
  display: grid;
  place-items: center;
  width: 2.75rem;
  height: 2.75rem;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: inherit;
  cursor: pointer;
}

.survey__close:hover {
  background: rgb(255 255 255 / 0.14);
}

.survey__close svg {
  width: 1.15rem;
  height: 1.15rem;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.2;
  stroke-linecap: round;
}

.survey__head :focus-visible {
  outline-color: var(--s-paper);
}

.survey__log {
  display: grid;
  gap: 0.55rem;
  align-content: start;
  padding: 0.95rem;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.survey__message {
  justify-self: start;
  max-width: 92%;
  padding: 0.55rem 0.85rem 0.6rem;
  border-radius: 1.1rem 1.1rem 1.1rem 0.3rem;
  background: var(--s-wash);
  font-weight: 600;
}

.survey__aside {
  display: block;
  color: var(--s-soft);
  font-size: 0.875rem;
  font-weight: 400;
}

.survey__options {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  justify-content: flex-end;
  padding-left: 1rem;
}

.survey__options--scale {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
}

.survey__option {
  min-height: 2.75rem;
  padding: 0 0.85rem;
  border: 1.5px solid var(--s-accent);
  border-radius: 999px;
  background: var(--s-paper);
  color: var(--s-accent);
  font: inherit;
  font-weight: 650;
  font-variant-numeric: tabular-nums;
  cursor: pointer;
  transition:
    background-color 0.15s ease,
    color 0.15s ease;
}

.survey__option:hover,
.survey__option[aria-pressed='true'] {
  background: var(--s-accent);
  color: var(--s-paper);
}

.survey__reply {
  justify-self: end;
  max-width: 92%;
  padding: 0.55rem 0.9rem 0.6rem;
  border: 0;
  border-radius: 1.1rem 1.1rem 0.3rem 1.1rem;
  background: var(--s-accent);
  color: var(--s-paper);
  font: inherit;
  font-weight: 650;
  cursor: pointer;
}

.survey__comment {
  width: 100%;
  min-height: 4.25rem;
  padding: 0.6rem 0.8rem;
  border: 1.5px solid #b9bcc2;
  border-radius: 0.9rem;
  background: var(--s-paper);
  color: var(--s-ink);
  caret-color: var(--s-accent);
  font: inherit;
  resize: vertical;
}

.survey__comment::placeholder {
  color: var(--s-soft);
}

.survey__error {
  color: #b42318;
  font-size: 0.9375rem;
  font-weight: 600;
}

.survey__send {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 3rem;
  padding: 0 1.3rem;
  border: 0;
  border-radius: 999px;
  background: var(--s-ink);
  color: var(--s-paper);
  font: inherit;
  font-weight: 700;
  text-decoration: none;
  cursor: pointer;
}

.survey__send:disabled {
  opacity: 0.6;
  cursor: default;
}

.survey__after {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem 1rem;
}

.survey__link {
  min-height: 2.75rem;
  padding: 0;
  border: 0;
  background: none;
  color: var(--s-ink);
  font: inherit;
  font-weight: 650;
  line-height: 2.75rem;
  text-decoration: underline;
  text-underline-offset: 0.2em;
  cursor: pointer;
}

.survey-pop-enter-active {
  transition:
    scale 0.34s cubic-bezier(0.16, 1, 0.3, 1),
    opacity 0.2s ease;
}

.survey-pop-leave-active {
  transition:
    scale 0.2s ease-in,
    opacity 0.18s ease;
}

.survey-pop-enter-from,
.survey-pop-leave-to {
  opacity: 0;
  scale: 0.2;
}

.survey-hint-enter-active,
.survey-hint-leave-active {
  transition:
    opacity 0.25s ease,
    translate 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}

.survey-hint-enter-from,
.survey-hint-leave-to {
  opacity: 0;
  translate: 0.6rem 0;
}

@media (prefers-reduced-motion: reduce) {
  .survey__bubble,
  .survey-pop-enter-active,
  .survey-pop-leave-active,
  .survey-hint-enter-active,
  .survey-hint-leave-active {
    transition: none;
  }
}
</style>
