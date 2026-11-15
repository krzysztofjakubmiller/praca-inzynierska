<script setup lang="ts">
import { ref } from 'vue'
import { EXAMS, type Exam } from '@/config/exams'
import { daysToExam } from '@/landing2/content'
import { useOffer } from '@/landing2/offer'
import type { TicketKind } from '@/utils/tickets'
import PaperTicket from '../PaperTicket.vue'

// Trzy bilety leżą jeden na drugim, jak trzymane w ręku. Dotknięcie wystającego biletu
// wysuwa go na wierzch, a kupiony bilet zostaje wyciągnięty z ręki.
const emit = defineEmits<{ taken: [] }>()

const { today, validUntil } = useOffer()
const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches

const front = ref<Exam['id']>('matura-podstawowa')
const kind = ref<TicketKind>('annual')
const taking = ref(false)

// Jak głęboko pod wierzchnim biletem leży dany bilet: 0 to wierzch.
function depth(id: Exam['id']): number {
  const order = EXAMS.map((exam) => exam.id)
  const count = order.length
  return (order.indexOf(id) - order.indexOf(front.value) + count) % count
}

function buy() {
  if (still) {
    emit('taken')
    return
  }
  taking.value = true
}

function onEnd() {
  if (!taking.value) return
  taking.value = false
  emit('taken')
}
</script>

<template>
  <div class="stack">
    <div class="stack__picker" role="radiogroup" aria-label="Egzamin">
      <button
        v-for="exam in EXAMS"
        :key="exam.id"
        class="stack__pick"
        type="button"
        role="radio"
        :aria-checked="front === exam.id"
        @click="front = exam.id"
      >
        {{ exam.shortName }}
      </button>
    </div>

    <div class="stack__hand">
      <div
        v-for="exam in EXAMS"
        :key="exam.id"
        class="stack__ticket"
        :class="{ 'stack__ticket--taking': taking && front === exam.id }"
        :style="{ '--depth': depth(exam.id) }"
        @click="front = exam.id"
        @animationend.self="onEnd"
      >
        <PaperTicket
          v-model:kind="kind"
          :exam="exam"
          :valid-until="validUntil"
          :days="daysToExam(exam.id, today)"
          :inert="front !== exam.id || taking"
          @buy="buy"
        />
        <span v-if="front !== exam.id" class="stack__tag" aria-hidden="true">{{ exam.name }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.stack {
  display: grid;
  gap: 1.25rem;
  width: min(100%, 25rem);
  margin-inline: auto;
}

.stack__picker {
  display: flex;
  padding: 0.25rem;
  border: 2px solid var(--ink);
  border-radius: 999px;
  background: #fff;
}

.stack__pick {
  flex: 1 1 0;
  min-height: 2.75rem;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--ink);
  font: inherit;
  font-weight: 700;
  cursor: pointer;
  transition:
    background-color 0.2s ease,
    color 0.2s ease;
}

.stack__pick[aria-checked='true'] {
  background: var(--ink);
  color: #fff;
}

/* Bilety zajmują to samo pole siatki. Głębszy jest wysunięty w górę, mniejszy i lekko skręcony,
   więc spod wierzchniego widać jego nazwę. */
.stack__hand {
  display: grid;
  padding-top: 7.4rem;
  perspective: 70rem;
}

.stack__ticket {
  grid-area: 1 / 1;
  z-index: calc(3 - var(--depth));
  translate: 0 calc(var(--depth) * -3.7rem);
  rotate: calc(var(--depth) * var(--depth) * 1.3deg - var(--depth) * 3.6deg);
  scale: calc(1 - var(--depth) * 0.05);
  position: relative;
  transform-origin: 50% 0;
  cursor: pointer;
  transition:
    translate 0.55s cubic-bezier(0.16, 1, 0.3, 1),
    rotate 0.55s cubic-bezier(0.16, 1, 0.3, 1),
    scale 0.55s cubic-bezier(0.16, 1, 0.3, 1);
}

.stack__ticket :deep(.tk__paper) {
  border-radius: 1.25rem;
}

.stack__ticket :deep(.tk)::before {
  border-radius: 1.25rem;
}

/* Nazwa egzaminu na widocznym pasku biletu, który leży pod spodem. */
.stack__tag {
  position: absolute;
  top: 1.5rem;
  left: 50%;
  padding: 0.1rem 0.6rem 0.15rem;
  border-radius: 0.3rem;
  background: #fff;
  font-size: 0.875rem;
  font-weight: 800;
  font-stretch: 80%;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  white-space: nowrap;
  translate: -50% 0;
}

.stack__ticket--taking {
  animation: stack-take 0.9s both;
}

@keyframes stack-take {
  0% {
    animation-timing-function: cubic-bezier(0.3, 0, 0.3, 1);
  }

  25% {
    translate: 0 1.4rem;
    rotate: -2deg;
    animation-timing-function: cubic-bezier(0.55, 0, 0.9, 0.5);
  }

  100% {
    translate: 20vw 130vh;
    rotate: 16deg;
  }
}

@media (prefers-reduced-motion: reduce) {
  .stack__ticket {
    transition: none;
  }
}
</style>
