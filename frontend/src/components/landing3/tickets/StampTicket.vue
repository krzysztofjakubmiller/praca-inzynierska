<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { EXAMS, type Exam } from '@/config/exams'
import { daysToExam } from '@/landing2/content'
import { useOffer } from '@/landing2/offer'
import type { TicketKind } from '@/utils/tickets'
import PaperTicket from '../PaperTicket.vue'

// Bilet do skasowania: po zakupie wsuwa się do kasownika i wraca z pieczątką z datą.
const emit = defineEmits<{ taken: [] }>()

const { today, validUntil } = useOffer()
const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches

const selected = ref<Exam['id']>('matura-podstawowa')
const kind = ref<TicketKind>('annual')
const state = ref<'fresh' | 'stamping' | 'stamped'>('fresh')

const exam = computed(() => EXAMS.find((item) => item.id === selected.value)!)
const stampDate = new Intl.DateTimeFormat('pl-PL', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
}).format(today)

// Nowy egzamin albo okres to nowy, jeszcze nieskasowany bilet.
watch([selected, kind], () => (state.value = 'fresh'))

function press() {
  if (state.value === 'stamped') emit('taken')
  else state.value = still ? 'stamped' : 'stamping'
}
</script>

<template>
  <div class="stamp" :class="`stamp--${state}`">
    <div class="stamp__picker" role="radiogroup" aria-label="Egzamin">
      <button
        v-for="item in EXAMS"
        :key="item.id"
        class="stamp__pick"
        type="button"
        role="radio"
        :aria-checked="selected === item.id"
        @click="selected = item.id"
      >
        {{ item.shortName }}
      </button>
    </div>

    <div class="stamp__machine">
      <div class="stamp__head">
        <span class="stamp__plate">Kasownik</span>
        <span class="stamp__lamp" aria-hidden="true" />
      </div>
      <div class="stamp__window">
        <div class="stamp__ticket" @animationend.self="state = 'stamped'">
          <PaperTicket
            v-model:kind="kind"
            :exam="exam"
            :valid-until="validUntil"
            :days="daysToExam(exam.id, today)"
            :buy-label="state === 'stamped' ? 'Jedź dalej' : 'Skasuj bilet'"
            :inert="state === 'stamping'"
            @buy="press"
          />
          <p v-if="state === 'stamped'" class="stamp__mark" aria-live="polite">
            <span>Skasowano</span>
            <span>{{ stampDate }}</span>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.stamp {
  display: grid;
  gap: 1.25rem;
  width: min(100%, 25rem);
  margin-inline: auto;
}

.stamp__picker {
  display: flex;
  padding: 0.25rem;
  border: 2px solid var(--ink);
  border-radius: 999px;
  background: #fff;
}

.stamp__pick {
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

.stamp__pick[aria-checked='true'] {
  background: var(--ink);
  color: #fff;
}

/* Głowica kasownika: czerwona skrzynka, pod którą wsuwa się bilet. */
.stamp__head {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-inline: -0.9rem;
  padding: 0.9rem 1.1rem 1.4rem;
  border-radius: 1.2rem 1.2rem 0.7rem 0.7rem;
  background: linear-gradient(to bottom, #e2493c, #c9281c 40%, #a91d13);
  color: #fff;
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.35),
    inset 0 -0.55rem 0 #2a0b08,
    0 14px 18px -10px rgb(0 0 0 / 0.5);
}

.stamp__plate {
  font-size: 1.05rem;
  font-weight: 800;
  font-stretch: 78%;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.stamp__lamp {
  width: 0.7rem;
  height: 0.7rem;
  border-radius: 50%;
  background: #5c1711;
  box-shadow: inset 0 1px 2px rgb(0 0 0 / 0.5);
}

.stamp--stamped .stamp__lamp {
  background: #9dffb8;
  box-shadow: 0 0 0.5rem 0.1rem #9dffb8;
}

/* Okno przycina bilet tylko od góry, na dolnej krawędzi głowicy. */
.stamp__window {
  margin-top: -0.3rem;
  clip-path: inset(0 -100vmax -300vmax -100vmax);
  perspective: 70rem;
}

.stamp__ticket {
  position: relative;
}

.stamp--stamping .stamp__head {
  animation: stamp-thunk 1.25s both;
}

.stamp--stamping .stamp__ticket {
  animation: stamp-feed 1.25s both;
}

/* Odbicie pieczątki: podwójna ramka w kolorze egzaminu, lekko skręcona. */
.stamp__mark {
  position: absolute;
  top: 6.4rem;
  right: 0.9rem;
  display: grid;
  gap: 0.15rem;
  padding: 0.4rem 0.7rem;
  border: 3px double currentColor;
  border-radius: 0.4rem;
  color: #b3261b;
  font-size: 0.8125rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.08em;
  line-height: 1.1;
  text-align: center;
  text-transform: uppercase;
  mix-blend-mode: multiply;
  opacity: 0.86;
  rotate: -9deg;
  pointer-events: none;
}

.stamp__mark span:first-child {
  font-size: 1.15rem;
  letter-spacing: 0.12em;
}

@keyframes stamp-feed {
  0% {
    translate: 0 0;
    animation-timing-function: cubic-bezier(0.5, 0, 0.75, 0.6);
  }

  32% {
    translate: 0 -46%;
  }

  58% {
    translate: 0 -46%;
    animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
  }

  100% {
    translate: 0 0;
  }
}

/* Głowica przysiada, gdy stempel uderza w bilet. */
@keyframes stamp-thunk {
  0%,
  38%,
  52%,
  100% {
    translate: 0 0;
  }

  44% {
    translate: 0 0.3rem;
  }
}
</style>
