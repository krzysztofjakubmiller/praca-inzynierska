<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

/** Napis na tablicy klapkowej: po zmianie tekstu każde pole przewija kilka znaków i staje. */
const props = defineProps<{
  text: string
  /** Stała liczba pól; krótszy tekst dopełniają puste. */
  cells: number
  /** Opóźnienie pierwszego przewinięcia w milisekundach, żeby rzędy tablicy ruszały po kolei. */
  delay?: number
}>()

const LETTERS = 'ABCDEFGHIJKLMNOPRSTUWYZ0123456789'
const TICK_MS = 60
// Pierwsze pole staje po tylu przewinięciach, każde następne trochę później.
const FIRST_STOP = 3
const STOP_STEP = 0.42

const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const goal = computed(() => props.text.toUpperCase().padEnd(props.cells, ' ').slice(0, props.cells))
const shown = ref([...goal.value])
let timer = 0
let startTimer = 0

function flip() {
  window.clearInterval(timer)
  if (still) {
    shown.value = [...goal.value]
    return
  }
  let tick = 0
  const before = [...shown.value]
  timer = window.setInterval(() => {
    tick++
    let moving = false
    ;[...goal.value].forEach((char, index) => {
      // Pole, które ma pokazywać to samo co przedtem, nie kręci się wcale.
      if (char === before[index] && shown.value[index] === char) return
      if (tick >= FIRST_STOP + index * STOP_STEP) {
        shown.value[index] = char
        before[index] = char
        return
      }
      moving = true
      shown.value[index] = LETTERS[Math.floor(Math.random() * LETTERS.length)]!
    })
    if (!moving) window.clearInterval(timer)
  }, TICK_MS)
}

onMounted(() => {
  // Przy otwarciu strony wszystkie pola przewijają się do swoich znaków.
  if (still) return
  shown.value = shown.value.map((char) => (char === ' ' ? ' ' : '·'))
  startTimer = window.setTimeout(flip, props.delay ?? 0)
})
watch(goal, flip)
onBeforeUnmount(() => {
  window.clearTimeout(startTimer)
  window.clearInterval(timer)
})
</script>

<template>
  <span class="flap">
    <span class="flap__text">{{ text }}</span>
    <span class="flap__cells" aria-hidden="true">
      <!-- Pola zostają te same, podmienia się sam znak: to dużo tańsze niż tworzenie pola od
           nowa przy każdym przewinięciu. -->
      <span v-for="(char, index) in shown" :key="index" class="flap__cell">{{ char }}</span>
    </span>
  </span>
</template>

<style scoped>
.flap {
  display: block;
}

.flap__text {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

.flap__cells {
  display: flex;
  gap: calc(var(--cell) * 0.1);
}

/* Pole ma stały rozmiar, więc zmiana znaku nie musi przeliczać układu reszty strony. */
.flap__cell {
  position: relative;
  display: grid;
  flex: none;
  place-items: center;
  width: calc(var(--cell) * 0.9);
  height: calc(var(--cell) * 1.5);
  border-radius: calc(var(--cell) * 0.12);
  background: var(--flap, #23211e);
  font-size: calc(var(--cell) * 1.16);
  font-weight: 720;
  font-stretch: 75%;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  contain: strict;
}

/* Szczelina między górną a dolną klapką. */
.flap__cell::after {
  content: '';
  position: absolute;
  top: 50%;
  right: 0;
  left: 0;
  height: 1px;
  background: rgb(0 0 0 / 0.55);
}
</style>
