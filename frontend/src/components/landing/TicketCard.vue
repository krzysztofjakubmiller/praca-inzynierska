<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue'
import type { Exam } from '@/config/exams'
import { TICKET_NAMES, formatPrice } from '@/utils/tickets'
import ArrowIcon from './ArrowIcon.vue'
import StationMarker from './StationMarker.vue'

/** `order` is the ticket's place on the list; the lines are drawn one after another. */
defineProps<{ exam: Exam; validUntil: string; order: number }>()

const ticket = useTemplateRef<HTMLElement>('ticket')
// waiting: out of sight, line not drawn yet; arriving: in sight, line being drawn.
const stage = ref<'complete' | 'waiting' | 'arriving'>('complete')
let observer: IntersectionObserver | undefined

// The line is hidden only once the script runs, so without it the ticket is complete.
onMounted(() => {
  if (!('IntersectionObserver' in window) || !ticket.value) return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  stage.value = 'waiting'
  observer = new IntersectionObserver(
    ([entry]) => {
      if (!entry?.isIntersecting) return
      stage.value = 'arriving'
      observer?.disconnect()
    },
    { threshold: 0.4 },
  )
  observer.observe(ticket.value)
})

onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <article
    ref="ticket"
    class="ticket"
    :class="`ticket--${stage}`"
    :style="{ '--exam': `var(--exam-${exam.id})`, '--order': order }"
    :aria-labelledby="`bilet-${exam.id}`"
  >
    <div class="ticket__main">
      <div class="ticket__line" aria-hidden="true">
        <span class="ticket__track" />
        <StationMarker :shape="exam.solid" class="ticket__marker" />
      </div>
      <h3 :id="`bilet-${exam.id}`" class="ticket__name">{{ exam.name }}</h3>
      <p class="ticket__description">{{ exam.ticketDescription }}</p>
      <dl class="ticket__options">
        <div class="ticket__option">
          <dt>{{ TICKET_NAMES.monthly }}</dt>
          <dd>
            <span class="ticket__price">{{ formatPrice(exam.prices.monthly) }}</span>
            <span class="ticket__term">miesięcznie</span>
          </dd>
        </div>
        <div class="ticket__option">
          <dt>{{ TICKET_NAMES.annual }}</dt>
          <dd>
            <span class="ticket__price">{{ formatPrice(exam.prices.annual) }}</span>
            <span class="ticket__term">ważny do {{ validUntil }}</span>
          </dd>
        </div>
      </dl>
    </div>
    <div class="ticket__stub">
      <RouterLink class="button button--quiet" :to="{ name: 'coming-soon' }">
        Zobacz kosztorys
        <ArrowIcon />
      </RouterLink>
    </div>
  </article>
</template>

<style scoped>
.ticket {
  --pad: clamp(1.25rem, 0.9rem + 1.6vw, 2rem);
  --notch: 0.7rem;
  --reach: min(42%, 11rem);
  --arrival: calc(var(--order) * 140ms);
  display: grid;
  border-radius: 1.25rem;
  background: var(--surface);
  box-shadow:
    0 1px 2px rgb(29 31 34 / 0.06),
    0 14px 32px -18px rgb(29 31 34 / 0.28);
  transition:
    translate 0.3s ease,
    box-shadow 0.3s ease;
}

.ticket__main {
  display: grid;
  gap: 0.9rem;
  padding: var(--pad);
}

/*
 * The exam's line runs in from the edge of the ticket to the middle of its station;
 * the station's white fill covers the end of the line.
 */
.ticket__line {
  display: flex;
  align-items: center;
  margin-left: calc(-1 * var(--pad));
}

.ticket__track {
  flex: 0 0 var(--reach);
  height: 0.5rem;
  background: var(--exam);
  transform-origin: left;
  transition: flex-basis 0.35s ease;
}

.ticket__marker {
  margin-left: -0.8rem;
  font-size: 1.6rem;
}

/* Out of sight: no line yet. In sight: the line runs in from the edge, then its station appears. */
.ticket--waiting .ticket__track {
  scale: 0 1;
}

.ticket--waiting .ticket__marker {
  scale: 0;
}

.ticket--arriving .ticket__track {
  animation: draw-line 0.9s cubic-bezier(0.22, 1, 0.36, 1) var(--arrival) both;
}

.ticket--arriving .ticket__marker {
  animation: show-station 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) calc(var(--arrival) + 0.6s) both;
}

@keyframes draw-line {
  from {
    scale: 0 1;
  }
}

@keyframes show-station {
  from {
    scale: 0;
  }
}

/* Pointing at a ticket is like holding it to a validator: the line reaches on and the station lights up. */
.ticket:focus-within {
  --marker-fill: var(--exam);
  translate: 0 -3px;
  box-shadow:
    0 2px 4px rgb(29 31 34 / 0.08),
    0 22px 40px -20px rgb(29 31 34 / 0.36);
}

.ticket:focus-within .ticket__track {
  flex-basis: calc(var(--reach) + 1.5rem);
}

@media (hover: hover) {
  .ticket:hover {
    --marker-fill: var(--exam);
    translate: 0 -3px;
    box-shadow:
      0 2px 4px rgb(29 31 34 / 0.08),
      0 22px 40px -20px rgb(29 31 34 / 0.36);
  }

  .ticket:hover .ticket__track {
    flex-basis: calc(var(--reach) + 1.5rem);
  }
}

@media (prefers-reduced-motion: reduce) {
  .ticket,
  .ticket__track {
    transition: none;
  }
}

.ticket__name {
  font-size: clamp(1.6rem, 1.2rem + 1.6vw, 2.25rem);
  font-weight: 750;
  font-stretch: 90%;
  letter-spacing: -0.02em;
}

.ticket__description {
  max-width: 40ch;
  color: var(--ink-soft);
}

.ticket__options {
  display: grid;
  margin-top: 0.4rem;
}

.ticket__option {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: baseline;
  gap: 0.25rem 1rem;
  padding-block: 0.8rem;
  border-top: 1px solid var(--hairline);
}

.ticket__option dt {
  font-weight: 600;
}

.ticket__option dd {
  display: grid;
  justify-items: end;
  text-align: right;
}

.ticket__price {
  font-size: clamp(1.6rem, 1.3rem + 1.2vw, 2.1rem);
  font-weight: 750;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
  line-height: 1.05;
}

.ticket__term {
  color: var(--ink-soft);
  font-size: 0.875rem;
}

/* Tear-off stub, separated by a perforation with two notches. */
.ticket__stub {
  position: relative;
  display: flex;
  align-items: center;
  padding: var(--pad);
  border-top: 2px dashed var(--hairline);
}

.ticket__stub::before,
.ticket__stub::after {
  content: '';
  position: absolute;
  top: calc(-1 * var(--notch) - 1px);
  width: calc(2 * var(--notch));
  height: calc(2 * var(--notch));
  border-radius: 50%;
  background: var(--ground);
}

.ticket__stub::before {
  left: calc(-1 * var(--notch));
}

.ticket__stub::after {
  right: calc(-1 * var(--notch));
}

@media (min-width: 48rem) {
  .ticket {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .ticket__stub {
    justify-content: center;
    padding-inline: clamp(1.5rem, 0.5rem + 2vw, 2.5rem);
    border-top: 0;
    border-left: 2px dashed var(--hairline);
  }

  .ticket__stub::before,
  .ticket__stub::after {
    left: calc(-1 * var(--notch) - 1px);
  }

  .ticket__stub::before {
    top: calc(-1 * var(--notch));
  }

  .ticket__stub::after {
    top: auto;
    right: auto;
    bottom: calc(-1 * var(--notch));
  }
}
</style>
