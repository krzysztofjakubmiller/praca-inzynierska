<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import AiTutorAvatar from '@/components/task/AiTutorAvatar.vue'
import ChatEditor from '@/components/task/ChatEditor.vue'
import MathText from '@/components/task/MathText.vue'
import { keyboardInside } from '@/mathKeyboard'
import { shrinkPhoto, toBase64 } from '@/photo'
import {
  aiProblem,
  askAboutTask,
  gradeSolution,
  sendFeedback,
  type ChatMessage,
  type Feedback,
  type Graded,
  type Picture,
  type PracticeMode,
} from '@/practice'

// Rozmowa z Dyżurnym w arkuszu wysuwanym od dołu. Arkusz jest zamykany, a nie usuwany, więc
// rozmowa przetrwa zamknięcie i ponowne otwarcie. Żyje tylko na tej stronie; backend dostaje ją
// całą przy każdym pytaniu. Przed sprawdzeniem odpowiedzi AI tylko podpowiada.
// board: obraz tablicy, jeśli od ostatniego wysłania coś się na niej zmieniło.
// grading: jest przy złym wyniku zadania otwartego i przy dowodzie; wtedy zdjęcie albo nowa
// tablica idą najpierw do oceny według zasad CKE.
const props = defineProps<{
  taskId: number
  checked: boolean
  about: string
  board: () => Promise<Picture | null>
  grading: { solutionId: number | null; mode: PracticeMode; answers: string[] } | null
}>()

const emit = defineEmits<{ graded: [result: Graded] }>()

// preview to miniatura zdjęcia; przy obrazie tablicy jej nie ma.
type Attachment = { picture: Picture; preview: string | null }
// grade: napis z oceną na początku odpowiedzi Dyżurnego, żeby ponowne pytanie nie oceniało
// tego samego obrazu jeszcze raz.
type Shown = ChatMessage & { attachment?: Attachment; grade?: string }

const sheet = useTemplateRef<HTMLDialogElement>('sheet')
const list = useTemplateRef<HTMLElement>('list')
const messages = ref<Shown[]>([])
// Ocena pomocy to jeden mały link nad polem pytania, a nie przyciski pod każdą odpowiedzią.
// Dotyczy ostatniej odpowiedzi i da się ją wysłać raz na rozmowę.
const lastRequest = ref<number | null>(null)
const survey = ref<'link' | 'pytanie' | 'wyslana'>('link')

async function rateHelp(feedback: Feedback) {
  survey.value = 'wyslana'
  await sendFeedback(lastRequest.value!, feedback).catch(() => null)
}
const question = ref('')
// Zdjęcie wybrane do następnej wiadomości.
const photo = ref<Attachment | null>(null)
const photoProblem = ref('')
// Nowy klucz czyści edytor po wysłaniu pytania.
const editorKey = ref(0)
// Pytanie w drodze: odpowiedź dopisuje się kawałkami. Do historii trafia dopiero cała, więc
// urwana odpowiedź nie idzie do backendu przy następnym pytaniu.
const pending = ref<{
  question: Shown
  answer: string
  grade: string | null
  problem: { text: string; retry: boolean } | null
} | null>(null)
const busy = computed(() => pending.value !== null && !pending.value.problem)
let gradedBefore = false
const shown = computed(() => [...messages.value, ...(pending.value ? [pending.value.question] : [])])

// Szybszy model czasem źle odczytuje cyfry z tablicy albo zdjęcia. Po prośbie ucznia ostatnie
// pytanie idzie jeszcze raz do mocniejszego modelu, który odpowiada już do końca rozmowy.
const strong = ref(false)
const canReread = computed(() => {
  const asked = messages.value[messages.value.length - 2]
  return !strong.value && !pending.value && !!asked?.attachment && !!asked.content
})

function reread() {
  const [question, answer] = messages.value.slice(-2) as [Shown, Shown]
  strong.value = true
  messages.value = messages.value.slice(0, -2)
  send(question, answer.grade ?? '')
}

function open() {
  sheet.value?.showModal()
  keyboardInside(sheet.value)
}

function close() {
  sheet.value?.close()
}

// Zdarzenie close przychodzi z opóźnieniem (także po Esc); gdy uczeń zdążył już otworzyć
// arkusz ponownie, klawiatura ma w nim zostać.
function onClosed() {
  if (!sheet.value?.open) keyboardInside(null)
}

// Stuknięcie w tło nad arkuszem trafia w sam element dialog, ale w puste miejsce arkusza też,
// gdy układ przesunie się pod palcem (np. chowa się klawiatura wzorów). Dlatego liczy się
// tylko punkt powyżej arkusza.
function closeOutside(event: MouseEvent) {
  const box = sheet.value?.getBoundingClientRect()
  if (event.target === sheet.value && box && event.clientY < box.top) close()
}

// Arkusz ciągnięty za nagłówek w dół jedzie za palcem; puszczony po 80 px zamyka się, a bliżej
// wraca na miejsce.
const drag = ref<{ start: number; distance: number } | null>(null)

function startDrag(event: PointerEvent) {
  if ((event.target as HTMLElement).closest('button')) return
  drag.value = { start: event.clientY, distance: 0 }
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
}

function moveDrag(event: PointerEvent) {
  if (drag.value) drag.value.distance = Math.max(0, event.clientY - drag.value.start)
}

function endDrag() {
  if (drag.value && drag.value.distance > 80) close()
  drag.value = null
}

async function scrollToEnd() {
  await nextTick()
  if (list.value) list.value.scrollTop = list.value.scrollHeight
}

async function addPhoto(file: File) {
  photoProblem.value = ''
  try {
    const shrunk = await shrinkPhoto(file)
    photo.value = {
      picture: { image: await toBase64(shrunk), image_type: 'image/jpeg' },
      preview: URL.createObjectURL(shrunk),
    }
  } catch {
    photoProblem.value = 'Nie udało się wczytać zdjęcia. Zrób je jeszcze raz.'
  }
}

// Obraz idzie tylko z pytaniem, przy którym go dołączono. W historii zostaje o nim
// wzmianka, bo bez niej Dyżurny przy następnym pytaniu uznawał, że żadnego obrazu nie było.
function history(list: Shown[]): ChatMessage[] {
  return list.map(({ role, content, attachment }) => {
    if (!attachment) return { role, content }
    const note = attachment.preview ? '(Dołączone zdjęcie.)' : '(Dołączony obraz tablicy.)'
    return { role, content: content ? `${note}\n${content}` : note }
  })
}

// Ocena idzie przed odpowiedzią i trafia na początek tej samej wiadomości Dyżurnego, żeby
// w historii po pytaniu ucznia była zawsze jedna odpowiedź. grade: ocena tego obrazu, jeśli już
// jest (pusty napis, gdy obraz nie szedł do oceny); null znaczy, że trzeba ocenić.
async function send(question: Shown, grade: string | null = null) {
  pending.value = { question, answer: grade ?? '', grade, problem: null }
  const current = pending.value
  const picture = question.attachment?.picture ?? null
  scrollToEnd()
  try {
    let checked = props.checked || !!grade
    if (picture && props.grading && grade === null) {
      const { mode, answers, solutionId } = props.grading
      const graded = await gradeSolution(props.taskId, mode, answers, picture, solutionId)
      emit('graded', graded)
      checked = true
      // Punkty to najlepsza z ocen tego rozwiązania, a wyjaśnienie dotyczy tego obrazu, więc
      // przy kolejnej ocenie napis mówi wprost, że punkty nie spadły przez słabszy obraz.
      const score = `${graded.points} z ${graded.max_points} pkt`
      current.answer = gradedBefore
        ? `Najlepsza ocena tego rozwiązania: ${score}. Ten obraz: ${graded.explanation}`
        : `Ocena: ${score}. ${graded.explanation}`
      current.grade = current.answer
      gradedBefore = true
    }
    if (question.content) {
      if (current.answer) current.answer += '\n\n'
      const asked = history([...messages.value, question])
      lastRequest.value = await askAboutTask(
        props.taskId,
        asked,
        checked,
        picture,
        strong.value,
        (piece) => {
          current.answer += piece
          scrollToEnd()
        },
      )
    }
    const answer: Shown = { role: 'assistant', content: current.answer }
    if (current.grade) answer.grade = current.grade
    messages.value = [...messages.value, question, answer]
    pending.value = null
  } catch (error) {
    current.problem = aiProblem(error, 'Połączenie się urwało, zanim Dyżurny skończył odpowiadać.')
  }
  // Pod odpowiedzią dochodzi przypomnienie o ocenie albo przycisk ponowienia.
  scrollToEnd()
}

// Tablica idzie z pytaniem tylko wtedy, gdy uczeń nie dołączył zdjęcia; zmieniona tablica
// pójdzie wtedy z następnym pytaniem.
async function ask() {
  if ((!question.value.trim() && !photo.value) || busy.value) return
  const content = question.value.trim()
  let attachment = photo.value
  question.value = ''
  photo.value = null
  editorKey.value++
  if (!attachment) {
    const board = await props.board()
    if (board) attachment = { picture: board, preview: null }
  }
  // Samo zdjęcie bez pytania przy ocenie wystarcza; poza oceną Dyżurny dostaje prośbę, żeby
  // na nie spojrzał.
  const text = content || (props.grading ? '' : 'Spójrz na to zdjęcie.')
  send({ role: 'user', content: text, attachment: attachment ?? undefined })
}

function retry() {
  if (pending.value) send(pending.value.question, pending.value.grade)
}

defineExpose({ open })
</script>

<template>
  <dialog
    ref="sheet"
    class="ai-tutor"
    :style="drag ? { transform: `translateY(${drag.distance}px)`, transition: 'none' } : undefined"
    aria-labelledby="ai-tutor-title"
    @click="closeOutside"
    @close="onClosed"
  >
    <header
      class="ai-tutor__head"
      @pointerdown="startDrag"
      @pointermove="moveDrag"
      @pointerup="endDrag"
      @pointercancel="drag = null"
    >
      <AiTutorAvatar class="ai-tutor__avatar" />
      <div class="ai-tutor__who">
        <h2 id="ai-tutor-title" class="ai-tutor__title">Dyżurny</h2>
        <p class="ai-tutor__about">{{ about }}</p>
      </div>
      <button type="button" class="icon-button" aria-label="Zamknij rozmowę" @click="close">
        <AppIcon name="close" />
      </button>
    </header>

    <div ref="list" class="ai-tutor__list">
      <p class="ai-tutor__message ai-tutor__message--assistant">
        <template v-if="grading">
          Masz rozwiązanie na kartce? Wyślij zdjęcie ikoną aparatu albo galerii, a ocenię je według
          zasad CKE i dostaniesz punkty za to, co jest dobrze. Tablicę przy zadaniu zobaczę, gdy
          o coś zapytasz.
        </template>
        <template v-else-if="checked">
          Napisz, który krok tego zadania chcesz przejść jeszcze raz. Możesz dołączyć zdjęcie, a
          tablicę przy zadaniu zobaczę sam.
        </template>
        <template v-else>
          Napisz, czego nie rozumiesz. Podpowiem metodę, ale wyniku nie zdradzę, dopóki nie
          sprawdzisz odpowiedzi.
        </template>
      </p>
      <div
        v-for="(message, index) in shown"
        :key="index"
        class="ai-tutor__message"
        :class="`ai-tutor__message--${message.role}`"
      >
        <img
          v-if="message.attachment?.preview"
          :src="message.attachment.preview"
          alt="Wysłane zdjęcie"
          class="ai-tutor__photo"
        />
        <p v-else-if="message.attachment" class="ai-tutor__board">Dołączona tablica</p>
        <MathText v-if="message.content" :text="message.content" />
      </div>
      <template v-if="pending">
        <div v-if="pending.problem" class="ai-tutor__message ai-tutor__message--assistant">
          <p class="ai-tutor__problem" role="alert">{{ pending.problem.text }}</p>
          <button
            v-if="pending.problem.retry"
            type="button"
            class="button button--quiet ai-tutor__retry"
            @click="retry"
          >
            Spróbuj ponownie
          </button>
        </div>
        <div v-else-if="pending.answer" class="ai-tutor__message ai-tutor__message--assistant">
          <MathText :text="pending.answer" />
        </div>
        <!-- Trzy stacje zapalają się po kolei, dopóki nie przyjdzie pierwszy kawałek odpowiedzi. -->
        <div v-else class="ai-tutor__message ai-tutor__message--assistant ai-tutor__typing" role="status">
          <span class="ai-tutor__stop" /><span class="ai-tutor__stop" /><span class="ai-tutor__stop" />
          <span class="ai-tutor__spoken">Dyżurny pisze</span>
        </div>
      </template>
      <p v-if="canReread" class="ai-tutor__reminder">
        Odczyt się nie zgadza?
        <button type="button" class="ai-tutor__link" @click="reread">Spróbuj jeszcze raz</button>
      </p>
      <p v-if="!pending && checked && messages.length" class="ai-tutor__reminder">
        To już wszystko?
        <button type="button" class="ai-tutor__link" @click="close">Wróć i oceń trudność</button>,
        a przejdziesz do następnego zadania.
      </p>
    </div>

    <p v-if="lastRequest" class="ai-tutor__survey">
      <button v-if="survey === 'link'" type="button" class="ai-tutor__link" @click="survey = 'pytanie'">
        Jak poszło Dyżurnemu?
      </button>
      <template v-else-if="survey === 'pytanie'">
        Czy pomógł?
        <button type="button" class="ai-tutor__link" @click="rateHelp('pomoglo')">Tak</button>
        <button type="button" class="ai-tutor__link" @click="rateHelp('nie-pomoglo')">Nie</button>
      </template>
      <template v-else>Dzięki za ocenę.</template>
    </p>

    <form class="ai-tutor__composer" @submit.prevent="ask">
      <div v-if="photo" class="ai-tutor__attached">
        <img :src="photo.preview!" alt="Zdjęcie do wysłania" class="ai-tutor__thumb" />
        <button type="button" class="ai-tutor__link" @click="photo = null">Usuń zdjęcie</button>
      </div>
      <p v-if="photoProblem" class="ai-tutor__problem" role="alert">{{ photoProblem }}</p>
      <ChatEditor
        :key="editorKey"
        v-model="question"
        :placeholder="grading ? 'Zapytaj albo wyślij zdjęcie rozwiązania' : 'Zapytaj o metodę albo krok'"
        @photo="addPhoto"
      >
        <template #actions>
          <button
            type="submit"
            class="button ai-tutor__send"
            aria-label="Wyślij"
            :disabled="(!question.trim() && !photo) || busy"
          >
            <AppIcon name="chevron-right" class="ai-tutor__send-arrow" />
          </button>
        </template>
      </ChatEditor>
    </form>
  </dialog>
</template>

<style scoped>
/* Arkusz od dołu jak panel stacji na mapie: bez przyciemnienia strony, z cieniem do góry. */
.ai-tutor {
  width: min(100%, 44rem);
  max-width: 100%;
  height: min(80svh, 48rem);
  max-height: 100%;
  margin: auto auto 0;
  padding: 0;
  border: 0;
  border-radius: 1.25rem 1.25rem 0 0;
  background: var(--surface);
  color: var(--ink);
  box-shadow: 0 -10px 24px rgb(29 31 34 / 0.12);
  transition: transform 0.2s ease-out;
}

.ai-tutor[open] {
  display: grid;
  /* Pole pytania może zmaleć i przewijać się w sobie, gdy z klawiaturą wzorów brakuje
     miejsca; lista rozmowy ustępuje mu pierwsza. */
  grid-template-rows: auto minmax(0, 1fr) auto minmax(0, auto);
  /* Kolumna nie rośnie od szerokiej treści (długi wzór, pole równania), więc arkusz nigdy nie
     przewija się w bok. */
  grid-template-columns: minmax(0, 1fr);
  overflow-x: hidden;
  animation: ai-tutor-in 0.25s cubic-bezier(0.22, 1, 0.36, 1);
}

/* Klawiatura wzorów doczepiona do arkusza (patrz keyboardInside) leży na jego dole, w miejscu
   zrobionym paddingiem. Sam kontener ma wysokość 0, a przyciski rysują się w górę od dolnej
   krawędzi; inaczej niewidoczny kontener na całą wysokość arkusza mógłby łapać stuknięcia. */
.ai-tutor :deep(.ML__keyboard) {
  position: absolute;
  top: auto;
  right: 0;
  bottom: 0;
  left: 0;
  height: 0;
  overflow: visible;
}

/* MathLive przesuwa tło klawiatury w górę o zmierzoną wysokość i dodaje odstęp u góry, przez
   co na tablecie dolny rząd wychodził poza ekran. Tu tło stoi na dolnej krawędzi i ma
   wysokość swoich przycisków, więc całe mieści się nad nią. */
.ai-tutor :deep(.ML__keyboard .MLK__backdrop) {
  top: auto;
  bottom: 0;
  height: auto;
  transform: none;
}

.ai-tutor :deep(.ML__keyboard .MLK__plate) {
  position: relative;
  top: 0;
}

.ai-tutor::backdrop {
  background: transparent;
}

@keyframes ai-tutor-in {
  from {
    transform: translateY(100%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .ai-tutor[open] {
    animation: none;
  }
}

/* Nagłówek łapie przeciąganie sam, bez przewijania strony pod spodem. */
.ai-tutor__head {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1.25rem var(--sheet-pad) 0.75rem;
  border-bottom: 1px solid var(--hairline);
  touch-action: none;
  cursor: grab;
}

/* Uchwyt jak na arkuszach w telefonie: znak, że arkusz da się ściągnąć w dół. */
.ai-tutor__head::before {
  position: absolute;
  top: 0.5rem;
  left: 50%;
  width: 2.5rem;
  height: 0.25rem;
  border-radius: 1rem;
  background: var(--hairline);
  content: '';
  translate: -50%;
}

.ai-tutor__avatar {
  font-size: 1.5rem;
}

.ai-tutor__who {
  flex: 1;
  min-width: 0;
}

.ai-tutor__title {
  font-size: 1.0625rem;
  font-weight: 700;
}

.ai-tutor__about {
  overflow: hidden;
  color: var(--ink-soft);
  font-size: 0.875rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ai-tutor__list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  overflow-y: auto;
  padding: 1rem var(--sheet-pad);
  overscroll-behavior: contain;
}

.ai-tutor__message {
  /* Przewija się cała lista, nigdy pojedynczy dymek. */
  flex-shrink: 0;
  max-width: 90%;
  overflow-wrap: anywhere;
  padding: 0.75rem 1rem;
  border-radius: 1rem;
  line-height: 1.5;
}

.ai-tutor__message--user {
  align-self: flex-end;
  background: var(--hairline);
}

.ai-tutor__message--assistant {
  align-self: flex-start;
  border: 2px solid var(--hairline);
}

.ai-tutor__survey {
  display: flex;
  gap: 0.75rem;
  align-items: baseline;
  padding: 0.5rem var(--sheet-pad) 0;
  border-top: 1px solid var(--hairline);
  color: var(--ink-soft);
  font-size: 0.875rem;
}

.ai-tutor__link {
  padding: 0;
  border: 0;
  background: none;
  color: var(--ink);
  font: inherit;
  font-weight: 600;
  text-decoration: underline;
  /* Przeglądarka przerywa podkreślenie pod ogonkami liter (j, p, y, ż), a przy pogrubionym
     tekście zostawały z niego same kreski. Linia leży niżej i idzie bez przerw. */
  text-decoration-thickness: 1px;
  text-decoration-skip-ink: none;
  text-underline-offset: 0.25em;
  cursor: pointer;
}

.ai-tutor__reminder {
  flex-shrink: 0;
  color: var(--ink-soft);
  font-size: 0.875rem;
}

.ai-tutor__composer {
  overflow-y: auto;
  padding: 0.75rem var(--sheet-pad) calc(0.75rem + env(safe-area-inset-bottom));
  border-top: 1px solid var(--hairline);
}

/* Z klawiaturą wzorów arkusz zajmuje cały widoczny ekran, żeby nad nią zmieściło się pole.
   dvh, a nie 100%: na tablecie 100% bywało wyższe niż widoczna część i dolny rząd klawiatury
   wychodził poza ekran. */
.ai-tutor[data-keyboard] {
  height: 100dvh;
  max-height: 100dvh;
}

.ai-tutor__survey + .ai-tutor__composer {
  border-top: 0;
}

/* Okrągły przycisk ze strzałką do góry, żeby zmieścił się w jednym wierszu z „+ tekst”
   i „+ równanie” także na wąskim telefonie. */
.ai-tutor__send {
  width: 2.75rem;
  min-height: 2.75rem;
  margin-left: auto;
  padding: 0;
}

.ai-tutor__send-arrow {
  width: 1.375rem;
  height: 1.375rem;
  rotate: -90deg;
}

.ai-tutor__photo {
  display: block;
  max-width: 100%;
  max-height: 16rem;
  margin-bottom: 0.5rem;
  border-radius: 0.5rem;
}

.ai-tutor__board {
  color: var(--ink-soft);
  font-size: 0.875rem;
}

.ai-tutor__attached {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
}

.ai-tutor__thumb {
  width: 3.5rem;
  height: 3.5rem;
  border-radius: 0.5rem;
  object-fit: cover;
}

.ai-tutor__problem {
  color: var(--danger);
  font-weight: 600;
}

.ai-tutor__retry {
  margin-top: 0.5rem;
}

.ai-tutor__typing {
  display: flex;
  gap: 0.375rem;
  padding-block: 1rem;
}

.ai-tutor__stop {
  width: 0.625rem;
  height: 0.625rem;
  border: 2px solid var(--ink);
  border-radius: 50%;
  background: var(--surface);
  animation: ai-tutor-stop 1.2s ease-in-out infinite;
}

.ai-tutor__stop:nth-child(2) {
  animation-delay: 0.2s;
}

.ai-tutor__stop:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes ai-tutor-stop {
  40% {
    background: var(--ink);
  }
}

@media (prefers-reduced-motion: reduce) {
  .ai-tutor__stop {
    animation: none;
  }
}

.ai-tutor__spoken {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
</style>
