<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue'
import { EXAMS, type Exam } from '@/config/exams'
import { daysToExam } from '@/landing2/content'
import { plural } from '@/utils/plural'
import SolidFigure from '@/components/landing2/SolidFigure.vue'
import FlapText from './FlapText.vue'

// Sama tablica odjazdów, do wstawienia w dowolną stronę. Klapki ruszają dopiero, gdy tablicę
// widać, a potem co kilka sekund przełączają się między dniami do egzaminu a ceną biletu.
// Kliknięty rząd zgłasza swój egzamin, a strona prowadzi z nim do kasownika.
const props = defineProps<{ today: Date }>()
const emit = defineEmits<{ pick: [exam: Exam['id']] }>()

const SWAP_MS = 6000

// Egzamin ósmoklasisty ma krótszą nazwę, żeby wszystkie mieściły się w 18 polach.
const NAMES: Record<Exam['id'], string> = {
  e8: 'Ósmoklasisty',
  'matura-podstawowa': 'Matura podstawowa',
  'matura-rozszerzona': 'Matura rozszerzona',
}

const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const root = useTemplateRef<HTMLElement>('root')
// Przed pierwszym pokazaniem pola są puste, więc wejście na ekran przewija całą tablicę.
const seen = ref(still)
const showPrice = ref(false)
const clock = ref('')
let clockTimer = 0
let swapTimer = 0
let observer: IntersectionObserver | undefined

function info(exam: Exam): string {
  if (showPrice.value) return `od ${exam.prices.monthly} zł mies.`
  const days = daysToExam(exam.id, props.today)
  return `za ${days} ${plural(days, ['dzień', 'dni', 'dni'])}`
}

function readClock() {
  clock.value = new Intl.DateTimeFormat('pl-PL', { hour: '2-digit', minute: '2-digit' }).format(
    new Date(),
  )
}

onMounted(() => {
  readClock()
  clockTimer = window.setInterval(readClock, 20_000)
  if (still) return
  observer = new IntersectionObserver(
    ([entry]) => {
      window.clearInterval(swapTimer)
      if (!entry?.isIntersecting) return
      seen.value = true
      swapTimer = window.setInterval(() => (showPrice.value = !showPrice.value), SWAP_MS)
    },
    { threshold: 0.4 },
  )
  observer.observe(root.value!)
})

onBeforeUnmount(() => {
  window.clearInterval(clockTimer)
  window.clearInterval(swapTimer)
  observer?.disconnect()
})
</script>

<template>
  <div ref="root" class="board-box">
    <div class="board">
      <div class="board__head">
        <span>Odjazdy</span>
        <span class="board__clock" aria-hidden="true">{{ clock }}</span>
      </div>
      <ul class="board__rows">
        <li v-for="exam in EXAMS" :key="exam.id">
          <!-- Nazwa linku jest stała, bo pola tablicy są puste, dopóki nie widać jej na ekranie. -->
          <a
            class="board__row"
            href="#bilety"
            :aria-label="`${exam.name}, ${info(exam)}`"
            :style="{ '--exam': `var(--board-${exam.id})` }"
            @click.prevent="emit('pick', exam.id)"
          >
            <span class="board__solid" aria-hidden="true">
              <SolidFigure :kind="exam.solid" :drag="false" :fill="0.94" :weight="0.085" :spin="0" />
            </span>
            <FlapText
              class="board__name"
              :text="seen ? NAMES[exam.id] : ''"
              :cells="18"
              settled
            />
            <FlapText class="board__info" :text="seen ? info(exam) : ''" :cells="14" settled />
          </a>
        </li>
      </ul>
      <p class="board__notice"><slot /></p>
    </div>
  </div>
</template>

<style scoped>
.board-box {
  container-type: inline-size;
}

/* Ciemna płyta z rzędami klapek. Rozmiar pola liczy się z szerokości tablicy. */
.board {
  --cell: calc((100cqi - 4.5rem) / 18);
  --flap: var(--board-flap, #37342e);
  --lamp: var(--board-lamp, #ffb224);
  --board-e8: #6aa0ff;
  --board-matura-podstawowa: #3fcf80;
  --board-matura-rozszerzona: #ff7462;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 0.9rem;
  padding: 0.9rem 0.8rem 0;
  border-radius: 1rem;
  background: var(--board-body, #24221e);
  color: #f6f2e9;
  box-shadow:
    0 1px 0 rgb(255 255 255 / 0.08) inset,
    0 26px 40px -24px rgb(0 0 0 / 0.6);
  overflow: hidden;
}

.board :focus-visible {
  outline-color: var(--lamp);
}

.board__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding-inline: 0.2rem;
  color: var(--lamp);
  font-weight: 750;
  font-stretch: 82%;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.board__clock {
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.04em;
}

.board__rows {
  display: grid;
  gap: 0.75rem;
  padding: 0;
  list-style: none;
}

.board__row {
  display: grid;
  grid-template-columns: 2.1rem minmax(0, 1fr);
  gap: 0.3rem 0.6rem;
  align-items: center;
  border-radius: 0.5rem;
  color: inherit;
  text-decoration: none;
}

.board__solid {
  grid-row: 1;
  width: 2.1rem;
  height: 2.1rem;
  color: var(--exam);
}

.board__info {
  grid-column: 2;
  --flap: var(--board-flap-info, #3d3421);
  color: var(--lamp);
}

.board__row:hover .board__name {
  --flap: color-mix(in srgb, var(--board-flap, #37342e) 86%, #fff);
}

/* Pasek z matrycy diod pod rzędami. */
.board__notice {
  margin-inline: -0.8rem;
  padding: 0.6rem 1rem;
  border-top: 1px solid rgb(255 255 255 / 0.12);
  background:
    radial-gradient(circle, color-mix(in srgb, var(--lamp) 14%, transparent) 0.6px, transparent 0.9px)
      0 0 / 4px 4px,
    color-mix(in srgb, var(--board-body, #24221e) 78%, #000);
  color: var(--lamp);
  font-size: 0.875rem;
  font-weight: 650;
  font-stretch: 82%;
  letter-spacing: 0.09em;
  line-height: 1.35;
  text-transform: uppercase;
}

/* Na szerokiej tablicy nazwa i informacja stoją w jednym rzędzie. */
@container (min-width: 44rem) {
  .board {
    --cell: min(1.75rem, calc((100cqi - 7.5rem) / 32));
    gap: 1rem;
    padding: 1.1rem 1.25rem 0;
  }

  .board__row {
    grid-template-columns: 2.5rem auto minmax(0, 1fr);
    gap: 1rem;
  }

  .board__solid {
    width: 2.5rem;
    height: 2.5rem;
  }

  .board__info {
    grid-column: auto;
    justify-self: end;
  }

  .board__notice {
    margin-inline: -1.25rem;
    padding-inline: 1.45rem;
  }
}
</style>
