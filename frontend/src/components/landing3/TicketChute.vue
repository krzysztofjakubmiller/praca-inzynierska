<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue'
import type { Exam } from '@/config/exams'
import { daysToExam } from '@/landing2/content'
import type { TicketKind } from '@/utils/tickets'
import PaperTicket from './PaperTicket.vue'

// Szczelina, z której wysuwa się bilet. Po zmianie egzaminu stary bilet wraca do szczeliny
// i drukuje się nowy, a kupiony bilet zostaje z niej zabrany poza ekran.
export type ChutePhase = 'empty' | 'printing' | 'ready' | 'retracting' | 'taking'

const props = withDefaults(
  defineProps<{
    /** Egzamin do wydrukowania; bez niego szczelina jest pusta. */
    exam: Exam | null
    validUntil: string
    today: Date
    /** Bilet wyciągnięty jednym ruchem albo zerwany wzdłuż perforacji. */
    take?: 'pull' | 'tear'
    pickKind?: boolean
    buyLabel?: string
    /** Znak wydruku: gdy się zmieni, bilet drukuje się od nowa, nawet na ten sam egzamin. */
    token?: string
  }>(),
  { take: 'pull', pickKind: true, buyLabel: 'Kup bilet' },
)

const kind = defineModel<TicketKind>('kind', { required: true })
const emit = defineEmits<{ phase: [phase: ChutePhase]; taken: [] }>()

const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const root = useTemplateRef<HTMLElement>('root')
const shown = ref<Exam | null>(null)
// Okres wydrukowany na bilecie bez przełącznika: zmienia się dopiero z nowym wydrukiem.
const printedKind = ref<TicketKind>(kind.value)
let printedToken: string | undefined
const phase = ref<ChutePhase>('empty')
// Pasek papieru, który zostaje w szczelinie po zerwanym bilecie.
const scrap = ref(false)
let seen = false
let observer: IntersectionObserver | undefined

const days = computed(() => (shown.value ? daysToExam(shown.value.id, props.today) : 0))

function wanted(): string | undefined {
  return props.exam ? (props.token ?? props.exam.id) : undefined
}

function print(exam: Exam) {
  shown.value = exam
  printedKind.value = kind.value
  printedToken = wanted()
  scrap.value = false
  phase.value = still ? 'ready' : 'printing'
}

function feed() {
  if (!seen || phase.value === 'taking') return
  const exam = props.exam
  if (!shown.value) {
    if (exam) print(exam)
    return
  }
  if (exam && printedToken === wanted() && phase.value !== 'retracting') return
  if (still) {
    shown.value = null
    phase.value = 'empty'
    if (exam) print(exam)
    return
  }
  phase.value = 'retracting'
}

function onEnd() {
  if (phase.value === 'printing') {
    phase.value = 'ready'
  } else if (phase.value === 'retracting') {
    shown.value = null
    phase.value = 'empty'
    if (props.exam) print(props.exam)
  } else if (phase.value === 'taking') {
    leave()
  }
}

function leave() {
  shown.value = null
  phase.value = 'empty'
  emit('taken')
}

function buy() {
  if (phase.value !== 'ready') return
  if (still) {
    leave()
    return
  }
  scrap.value = props.take === 'tear'
  phase.value = 'taking'
}

watch(() => [props.exam, props.token], feed)

const ticketKind = computed({
  get: () => (props.pickKind ? kind.value : printedKind.value),
  set: (value) => (kind.value = value),
})
watch(phase, (value) => emit('phase', value))

onMounted(() => {
  // Pierwszy bilet drukuje się dopiero, gdy szczelinę widać na ekranie.
  observer = new IntersectionObserver(
    ([entry]) => {
      if (!entry?.isIntersecting) return
      seen = true
      observer?.disconnect()
      feed()
    },
    { threshold: 0.25 },
  )
  observer.observe(root.value!)
})

onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <div ref="root" class="chute">
    <div class="chute__slot" aria-hidden="true" />
    <div class="chute__window">
      <div v-if="scrap" class="chute__scrap" aria-hidden="true" />
      <div
        v-if="shown"
        class="chute__ticket"
        :class="[`is-${phase}`, `chute__ticket--${take}`]"
        @animationend.self="onEnd"
      >
        <PaperTicket
          v-model:kind="ticketKind"
          :exam="shown"
          :valid-until="validUntil"
          :days="days"
          :pick-kind="pickKind"
          :buy-label="buyLabel"
          :inert="phase !== 'ready'"
          @buy="buy"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.chute {
  position: relative;
}

.chute__slot {
  position: absolute;
  top: -0.6rem;
  right: -0.9rem;
  left: -0.9rem;
  z-index: 2;
  height: 1.2rem;
  border-radius: 999px;
  background: var(--chute-slot, #0b0c0f);
  box-shadow:
    inset 0 3px 4px rgb(0 0 0 / 0.8),
    0 1px 0 rgb(255 255 255 / 0.14),
    0 6px 10px -4px rgb(0 0 0 / 0.45);
}

/* Okno przycina bilet tylko od góry, na linii szczeliny. W dół i na boki bilet może wyjść
   dowolnie daleko, także poza ekran. */
.chute__window {
  position: relative;
  min-height: var(--chute-room, 31rem);
  clip-path: inset(0 -100vmax -300vmax -100vmax);
  perspective: 70rem;
}

.chute__ticket.is-printing {
  animation: chute-print 1.3s both;
}

.chute__ticket.is-retracting {
  animation: chute-back 0.42s cubic-bezier(0.5, 0, 0.9, 0.4) both;
}

.chute__ticket--pull.is-taking {
  animation: chute-pull 0.95s both;
}

.chute__ticket--tear.is-taking {
  animation: chute-tear 1.05s both;
}

/* Skrawek po zerwanym bilecie: wąski pasek z poszarpanym brzegiem. */
.chute__scrap {
  position: absolute;
  top: 0;
  right: 0.4rem;
  left: 0.4rem;
  height: 0.85rem;
  background: var(--tk-paper, #fff);
  mask:
    linear-gradient(#000 0 0) top / 100% calc(100% - 0.35rem) no-repeat,
    conic-gradient(from 135deg at 50% 0, #000 90deg, transparent 0) 0 100% / 0.7rem 0.36rem repeat-x;
}

/* Druk idzie skokami, jak głowica, która podaje papier po kawałku. */
@keyframes chute-print {
  0% {
    translate: 0 -102%;
    animation-timing-function: cubic-bezier(0.3, 0, 0.2, 1);
  }

  22% {
    translate: 0 -74%;
  }

  27% {
    translate: 0 -74%;
    animation-timing-function: cubic-bezier(0.3, 0, 0.2, 1);
  }

  48% {
    translate: 0 -44%;
  }

  53% {
    translate: 0 -44%;
    animation-timing-function: cubic-bezier(0.3, 0, 0.2, 1);
  }

  74% {
    translate: 0 -16%;
  }

  79% {
    translate: 0 -16%;
    animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
  }

  100% {
    translate: 0 0;
  }
}

@keyframes chute-back {
  to {
    translate: 0 -102%;
  }
}

/* Ręka chwyta bilet, wyciąga go do końca i zabiera poza ekran. */
@keyframes chute-pull {
  0% {
    translate: 0 0;
    rotate: 0deg;
    animation-timing-function: cubic-bezier(0.3, 0, 0.3, 1);
  }

  26% {
    translate: 0 1.5rem;
    rotate: -1.5deg;
    animation-timing-function: cubic-bezier(0.55, 0, 0.9, 0.5);
  }

  100% {
    translate: 22vw 130vh;
    rotate: 15deg;
  }
}

@keyframes chute-tear {
  0% {
    translate: 0 0;
    rotate: 0deg;
  }

  10% {
    translate: 0 0.3rem;
    rotate: -2.5deg;
  }

  20% {
    translate: 0 0.55rem;
    rotate: 3deg;
  }

  30% {
    translate: 0 0.9rem;
    rotate: 1.5deg;
    animation-timing-function: cubic-bezier(0.55, 0, 0.9, 0.5);
  }

  100% {
    translate: -14vw 130vh;
    rotate: -20deg;
  }
}
</style>
