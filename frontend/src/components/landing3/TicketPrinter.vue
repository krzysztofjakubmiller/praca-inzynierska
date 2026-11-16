<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue'
import { EXAMS, type Exam } from '@/config/exams'
import { useOffer } from '@/landing2/offer'
import type { TicketKind } from '@/utils/tickets'
import FitScreen from './FitScreen.vue'
import KeyRow from './KeyRow.vue'
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
const KEYS = EXAMS.map((item) => ({
  id: item.id,
  lines: LABELS[item.id],
  color: `var(--exam-${item.id})`,
}))

const fit = useTemplateRef<InstanceType<typeof FitScreen>>('fit')

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

function press(id: Exam['id'] | null) {
  taken.value = false
  selected.value = id
  fit.value?.show()
}

function onTaken() {
  taken.value = true
  selected.value = null
  emit('taken')
}
</script>

<template>
  <FitScreen ref="fit" class="tp">
    <div class="tp__body">
      <p class="tp__display" aria-live="polite">
        <span
          class="tp__lamp"
          :class="{ 'tp__lamp--busy': phase !== 'empty' && phase !== 'ready' }"
        />
        {{ message }}
      </p>
      <KeyRow :model-value="selected" :keys="KEYS" label="Egzamin" @update:model-value="press" />
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
  </FitScreen>
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
