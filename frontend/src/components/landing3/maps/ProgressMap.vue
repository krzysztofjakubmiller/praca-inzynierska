<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue'
import { BASIC_MAP } from '@/maps'
import { listOrder } from '@/maps/order'
import { plural } from '@/utils/plural'
import MiniMap from '../MiniMap.vue'

// Ta sama mapa w czterech chwilach nauki. To przykład, a nie obietnica tempa: pokazuje,
// że stacje zamalowują się po kolei i mapa z czasem staje się twoja.
const order = listOrder(BASIC_MAP)
const STAGES = [
  { name: 'Start', done: 0, text: 'Mapa jest pusta. Wybierasz pierwszą stację.' },
  { name: 'Po 2 tygodniach', done: 5, text: 'Pierwsza linia prawie za tobą.' },
  { name: 'Po 2 miesiącach', done: 13, text: 'Ponad połowa mapy jest twoja.' },
  { name: 'Przed maturą', done: order.length, text: 'Cała mapa przejechana. Zostają powtórki.' },
]
// Odstęp między kolejnymi chwilami, gdy mapa po raz pierwszy pojawia się na ekranie.
const STEP_MS = 1300

const root = useTemplateRef<HTMLElement>('root')
const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const stage = ref(still ? 2 : 0)
const done = computed(() => new Set(order.slice(0, STAGES[stage.value]!.done)))
let timer = 0
let observer: IntersectionObserver | undefined

function pick(index: number) {
  window.clearInterval(timer)
  stage.value = index
}

onMounted(() => {
  if (still) return
  observer = new IntersectionObserver(
    ([entry]) => {
      if (!entry?.isIntersecting) return
      observer?.disconnect()
      timer = window.setInterval(() => {
        if (stage.value < 2) stage.value++
        else window.clearInterval(timer)
      }, STEP_MS)
    },
    { threshold: 0.5 },
  )
  observer.observe(root.value!)
})

onBeforeUnmount(() => {
  window.clearInterval(timer)
  observer?.disconnect()
})
</script>

<template>
  <section ref="root" class="grow" aria-labelledby="grow-title">
    <div class="grow__head">
      <h2 id="grow-title" class="grow__title">Mapa, która zapełnia się razem z tobą</h2>
      <p class="grow__text">
        Stacja zamalowuje się, gdy przerobisz jej zadania. Zobacz przykładowy postęp ucznia.
      </p>
    </div>

    <div class="grow__stages" role="group" aria-label="Chwila nauki">
      <button
        v-for="(item, index) in STAGES"
        :key="item.name"
        class="grow__stage"
        type="button"
        :aria-pressed="index === stage"
        @click="pick(index)"
      >
        {{ item.name }}
      </button>
    </div>

    <MiniMap class="grow__map" :done="done" />

    <p class="grow__state" aria-live="polite">
      <strong>
        {{ STAGES[stage]!.done }} z {{ order.length }}
        {{ plural(order.length, ['stacji', 'stacji', 'stacji']) }}
      </strong>
      {{ STAGES[stage]!.text }}
    </p>
  </section>
</template>

<style scoped>
.grow {
  --line-1: #c98500;
  --line-2: #2a66d6;
  --line-3: #168344;
  --line-4: #d42f23;
  --mm-fill: var(--ground);
  display: grid;
  gap: clamp(1.25rem, 1rem + 1.5vw, 2rem);
  align-content: center;
  padding: clamp(2.5rem, 2rem + 3vw, 5rem) max(var(--gutter), calc((100vw - 70rem) / 2));
}

.grow__head {
  display: grid;
  gap: 0.8rem;
}

.grow__title {
  max-width: 18ch;
  font-size: clamp(2rem, 1.5rem + 2.4vw, 3.4rem);
  font-weight: 800;
  font-stretch: 88%;
  letter-spacing: -0.028em;
  line-height: 1;
  text-wrap: balance;
}

.grow__text {
  max-width: 46ch;
  color: var(--ink-soft);
  font-size: clamp(1.0625rem, 1rem + 0.4vw, 1.25rem);
  line-height: 1.45;
}

.grow__stages {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.grow__stage {
  min-height: 2.75rem;
  padding: 0 1.1rem;
  border: 1.5px solid var(--ink);
  border-radius: 999px;
  background: transparent;
  color: var(--ink);
  font: inherit;
  font-weight: 650;
  cursor: pointer;
  transition:
    background-color 0.2s ease,
    color 0.2s ease;
}

.grow__stage[aria-pressed='true'] {
  background: var(--ink);
  color: var(--ground);
}

.grow__state {
  display: flex;
  flex-wrap: wrap;
  gap: 0.2rem 1rem;
  align-items: baseline;
  font-size: clamp(1.0625rem, 1rem + 0.4vw, 1.25rem);
}

.grow__state strong {
  font-size: 1.35em;
  font-weight: 800;
  font-stretch: 88%;
  font-variant-numeric: tabular-nums;
}
</style>
