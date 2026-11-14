<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue'
import { DUTY_TALK, DUTY_TASK } from '@/landing2/content'
import MathText from './MathText.vue'
import WhoIcon from './WhoIcon.vue'

// Odstęp między kolejnymi porcjami znaków odpowiedzi i przerwy między wiadomościami.
const TYPE_MS = 26
const TYPE_CHARS = 2
const PAUSE_MS = 750

const root = useTemplateRef<HTMLElement>('root')
const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches

// Ile wiadomości jest już całych i ile znaków ma ta, która właśnie się pisze.
const done = ref(still ? DUTY_TALK.length : 0)
const typed = ref(0)
const finished = ref(still)
let timer = 0
let observer: IntersectionObserver | undefined

function next() {
  const message = DUTY_TALK[done.value]
  if (!message) {
    finished.value = true
    return
  }
  // Uczeń wysyła wiadomość w całości, odpowiedź Dyżurnego przychodzi strumieniem.
  if (message.from === 'duty' && typed.value < message.text.length) {
    typed.value += TYPE_CHARS
    timer = window.setTimeout(next, TYPE_MS)
    return
  }
  done.value++
  typed.value = 0
  timer = window.setTimeout(next, PAUSE_MS)
}

function replay() {
  window.clearTimeout(timer)
  done.value = 0
  typed.value = 0
  finished.value = false
  timer = window.setTimeout(next, 400)
}

function shownChars(index: number): number | undefined {
  return index === done.value ? typed.value : undefined
}

onMounted(() => {
  if (still || !root.value) return
  observer = new IntersectionObserver(
    ([entry]) => {
      if (!entry?.isIntersecting) return
      observer?.disconnect()
      timer = window.setTimeout(next, 500)
    },
    { threshold: 0.35 },
  )
  observer.observe(root.value)
})

onBeforeUnmount(() => {
  window.clearTimeout(timer)
  observer?.disconnect()
})
</script>

<template>
  <figure ref="root" class="chat">
    <figcaption class="chat__head">
      <span class="chat__duty">
        <WhoIcon who="duty" />
        Dyżurny
      </span>
      <span class="chat__note">przykładowa rozmowa</span>
    </figcaption>

    <p class="chat__task">
      <span class="chat__task-label">Zadanie</span>
      <MathText :text="DUTY_TASK" />
    </p>

    <!-- Czytnik ekranu dostaje całą rozmowę od razu, bez czekania na animację. -->
    <ol class="chat__transcript">
      <li v-for="(message, index) in DUTY_TALK" :key="index">
        {{ message.from === 'duty' ? 'Dyżurny' : 'Uczeń' }}:
        <MathText :text="message.text" />
      </li>
    </ol>

    <ol class="chat__log" aria-hidden="true">
      <li
        v-for="(message, index) in DUTY_TALK"
        :key="index"
        class="chat__message"
        :class="[
          `chat__message--${message.from}`,
          { 'chat__message--pending': index > done || (index === done && typed === 0) },
        ]"
      >
        <MathText :text="message.text" :shown="shownChars(index)" />
      </li>
    </ol>

    <button class="chat__replay" type="button" :disabled="!finished" @click="replay">
      Odtwórz jeszcze raz
    </button>
  </figure>
</template>

<style scoped>
.chat {
  display: grid;
  gap: 0.9rem;
  margin: 0;
  padding: clamp(1rem, 0.8rem + 1vw, 1.5rem);
  border-radius: var(--radius, 1.25rem);
  background: var(--card, var(--surface));
  color: var(--ink);
  box-shadow: var(--card-shadow, none);
}

.chat__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.4rem 0.75rem;
}

.chat__duty {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  font-weight: 750;
  letter-spacing: -0.01em;
}

.chat__duty .who {
  color: var(--duty, var(--ink));
  font-size: 1.35rem;
}

.chat__note {
  padding: 0.15rem 0.6rem;
  border: 1.5px dashed var(--ink-soft);
  border-radius: 999px;
  color: var(--ink-soft);
  font-size: 0.8125rem;
  font-weight: 600;
  white-space: nowrap;
}

.chat__task {
  padding: 0.8rem 0.95rem;
  border-radius: 0.85rem;
  background: var(--chat-task, var(--ground));
  font-weight: 600;
  line-height: 1.35;
}

.chat__task-label {
  display: block;
  color: var(--ink-soft);
  font-size: 0.8125rem;
  font-weight: 600;
}

.chat__transcript {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

.chat__log {
  display: grid;
  gap: 0.5rem;
  padding: 0;
  list-style: none;
}

.chat__message {
  max-width: 88%;
  padding: 0.55rem 0.85rem 0.6rem;
  border-radius: 1.1rem;
  font-size: 1rem;
  line-height: 1.4;
  transition:
    opacity 0.35s ease,
    translate 0.45s cubic-bezier(0.16, 1, 0.3, 1);
}

.chat__message--student {
  justify-self: end;
  border-bottom-right-radius: 0.3rem;
  background: var(--chat-student, var(--ink));
  color: var(--chat-student-ink, var(--ground));
}

.chat__message--duty {
  justify-self: start;
  border-bottom-left-radius: 0.3rem;
  background: var(--chat-duty, var(--ground));
  color: var(--chat-duty-ink, var(--ink));
}

/* Wiadomość, na którą jeszcze nie pora, trzyma swoje miejsce, żeby okno rozmowy nie skakało. */
.chat__message--pending {
  opacity: 0;
  translate: 0 0.5rem;
  transition: none;
}

.chat__replay {
  justify-self: start;
  min-height: 2.75rem;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  font-size: 0.9375rem;
  font-weight: 650;
  text-decoration: underline;
  text-decoration-thickness: 0.08em;
  text-underline-offset: 0.22em;
  cursor: pointer;
  transition: opacity 0.2s ease;
}

.chat__replay:disabled {
  opacity: 0;
  cursor: default;
}
</style>
