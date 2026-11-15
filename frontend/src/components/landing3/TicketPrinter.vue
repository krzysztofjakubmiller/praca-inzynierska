<script setup lang="ts">
import { computed, ref } from 'vue'
import { EXAMS, type Exam } from '@/config/exams'
import { useOffer } from '@/landing2/offer'
import type { TicketKind } from '@/utils/tickets'
import TicketChute, { type ChutePhase } from './TicketChute.vue'

// Kasownik z trzema przyciskami: wciśnięty egzamin drukuje swój bilet. Kolory obudowy,
// przycisków i papieru ustawia strona przez zmienne --tp-* i --tk-*.
const emit = defineEmits<{ taken: [] }>()

const { today, validUntil } = useOffer()

const LABELS: Record<Exam['id'], string[]> = {
  e8: ['E8'],
  'matura-podstawowa': ['Matura', 'podstawowa'],
  'matura-rozszerzona': ['Matura', 'rozszerzona'],
}

const selected = ref<Exam['id'] | null>('matura-podstawowa')
const kind = ref<TicketKind>('annual')
const phase = ref<ChutePhase>('empty')
const taken = ref(false)

const exam = computed(() => EXAMS.find((item) => item.id === selected.value) ?? null)

const message = computed(() => {
  if (phase.value === 'printing' || phase.value === 'retracting') return 'Drukuję bilet'
  if (phase.value === 'ready') return 'Bilet gotowy'
  if (phase.value === 'taking') return 'Miłej podróży'
  return taken.value ? 'Bilet zabrany' : 'Wybierz egzamin'
})

function press(id: Exam['id']) {
  taken.value = false
  selected.value = id
}

function onTaken() {
  taken.value = true
  selected.value = null
  emit('taken')
}
</script>

<template>
  <div class="tp">
    <div class="tp__body">
      <p class="tp__display" aria-live="polite">
        <span
          class="tp__lamp"
          :class="{ 'tp__lamp--busy': phase !== 'empty' && phase !== 'ready' }"
        />
        {{ message }}
      </p>
      <div class="tp__keys" role="radiogroup" aria-label="Egzamin">
        <button
          v-for="item in EXAMS"
          :key="item.id"
          class="tp__key"
          type="button"
          role="radio"
          :aria-checked="selected === item.id"
          :style="{ '--key': `var(--exam-${item.id})` }"
          @click="press(item.id)"
        >
          <span class="tp__cap">
            <span class="tp__led" aria-hidden="true" />
            <span class="tp__label">
              <span v-for="line in LABELS[item.id]" :key="line">{{ line }}</span>
            </span>
          </span>
        </button>
      </div>
    </div>
    <TicketChute
      v-model:kind="kind"
      class="tp__chute"
      :exam="exam"
      :valid-until="validUntil"
      :today="today"
      @phase="phase = $event"
      @taken="onTaken"
    />
  </div>
</template>

<style scoped>
.tp {
  --body: var(--tp-body, #14161d);
  --body-ink: var(--tp-body-ink, #f4f5f7);
  width: min(100%, 27rem);
  margin-inline: auto;
}

/* Obudowa: blacha z lekkim światłem od góry i wnęką na bilet u dołu. */
.tp__body {
  position: relative;
  display: grid;
  gap: 1rem;
  padding: 1rem 1rem 1.9rem;
  border-radius: 1.5rem 1.5rem 0.9rem 0.9rem;
  background: linear-gradient(
    to bottom,
    color-mix(in srgb, var(--body) 90%, #fff),
    var(--body) 30%,
    color-mix(in srgb, var(--body) 88%, #000)
  );
  color: var(--body-ink);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.2),
    inset 0 -2px 0 rgb(0 0 0 / 0.25),
    0 22px 30px -18px rgb(0 0 0 / 0.55);
}

.tp__display {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  min-height: 2.6rem;
  padding: 0.35rem 0.9rem;
  border-radius: 0.5rem;
  background: var(--tp-screen, #07080a);
  color: var(--tp-screen-ink, #c8f7d6);
  box-shadow: inset 0 2px 5px rgb(0 0 0 / 0.7);
  font-size: 0.9375rem;
  font-weight: 700;
  font-stretch: 82%;
  letter-spacing: 0.09em;
  text-transform: uppercase;
}

.tp__lamp {
  flex: none;
  width: 0.55rem;
  height: 0.55rem;
  border-radius: 50%;
  background: currentColor;
}

.tp__keys {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.7rem;
}

/* Przycisk siedzi we wnęce obudowy. Wybrany zostaje wciśnięty i świeci mu się dioda. */
.tp__key {
  position: relative;
  padding: 0 0 0.5rem;
  border: 0;
  border-radius: 0.9rem;
  background: none;
  color: inherit;
  font: inherit;
  cursor: pointer;
}

.tp__key::before {
  content: '';
  position: absolute;
  inset: 0.3rem -0.22rem -0.12rem;
  border-radius: 1.05rem;
  background: color-mix(in srgb, var(--body) 55%, #000);
  box-shadow:
    inset 0 2px 5px rgb(0 0 0 / 0.65),
    0 1px 0 rgb(255 255 255 / 0.12);
}

.tp__cap {
  --cap: var(--tp-cap, var(--key));
  --side: color-mix(in srgb, var(--cap) 58%, #000);
  position: relative;
  display: grid;
  gap: 0.35rem;
  justify-items: center;
  align-content: center;
  min-height: 4.6rem;
  padding: 0.55rem 0.3rem;
  border-radius: 0.8rem;
  background: linear-gradient(
    to bottom,
    color-mix(in srgb, var(--cap) 86%, #fff),
    var(--cap) 45%,
    color-mix(in srgb, var(--cap) 90%, #000)
  );
  color: var(--tp-cap-ink, #fff);
  box-shadow:
    0 0.45rem 0 var(--side),
    0 0.75rem 0.7rem -0.15rem rgb(0 0 0 / 0.5),
    inset 0 1px 0 rgb(255 255 255 / 0.4);
  transition:
    translate 0.09s ease-out,
    box-shadow 0.09s ease-out;
}

.tp__key:active .tp__cap,
.tp__key[aria-checked='true'] .tp__cap {
  translate: 0 0.32rem;
  box-shadow:
    0 0.13rem 0 var(--side),
    0 0.25rem 0.3rem -0.1rem rgb(0 0 0 / 0.5),
    inset 0 2px 3px rgb(0 0 0 / 0.22);
}

.tp__led {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background: rgb(0 0 0 / 0.35);
  box-shadow: inset 0 1px 1px rgb(0 0 0 / 0.5);
}

.tp__key[aria-checked='true'] .tp__led {
  background: var(--tp-led, #fff6c9);
  box-shadow: 0 0 0.45rem 0.1rem var(--tp-led, #fff6c9);
}

.tp__label {
  display: grid;
  font-size: clamp(0.78rem, 0.6rem + 0.9vw, 0.95rem);
  font-weight: 800;
  font-stretch: 80%;
  letter-spacing: 0.03em;
  line-height: 1.05;
  text-align: center;
  text-transform: uppercase;
}

/* Samo „E8” jest krótkie, więc może być większe. */
.tp__label span:only-child {
  font-size: 1.6em;
}

.tp__key:focus-visible {
  outline: 3px solid var(--body-ink);
  outline-offset: 4px;
}

.tp__chute {
  margin: -1.15rem 5% 0;
}

@media (prefers-reduced-motion: no-preference) {
  .tp__lamp--busy {
    animation: tp-blink 0.5s steps(2, jump-none) infinite;
  }
}

@keyframes tp-blink {
  to {
    opacity: 0.25;
  }
}
</style>
