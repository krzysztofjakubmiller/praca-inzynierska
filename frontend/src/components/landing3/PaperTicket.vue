<script setup lang="ts">
import type { Exam } from '@/config/exams'
import { PRODUCT_NAME } from '@/config/product'
import { plural } from '@/utils/plural'
import { TICKET_NAMES, formatPrice, type TicketKind } from '@/utils/tickets'
import ArrowIcon from '@/components/landing/ArrowIcon.vue'
import SolidFigure from '@/components/landing2/SolidFigure.vue'
import TicketTrack, { type TrackMode } from './TicketTrack.vue'

// Papierowy bilet na jeden egzamin. Kolory bierze ze zmiennych --tk-*, więc każda strona
// ubiera go po swojemu, a długość ma zawsze tę samą, niezależnie od wybranego okresu.
withDefaults(
  defineProps<{
    exam: Exam
    validUntil: string
    days: number
    /** Bez przełącznika bilet tylko pokazuje okres wybrany gdzie indziej. */
    pickKind?: boolean
    buyLabel?: string
    track?: TrackMode
  }>(),
  { pickKind: true, buyLabel: 'Kup bilet', track: 'days' },
)

const kind = defineModel<TicketKind>('kind', { required: true })
defineEmits<{ buy: [] }>()

const rosette = Array.from({ length: 30 }, (_, index) => index * 6)
let dragFrom: { x: number; y: number } | undefined

function lean(ticket: HTMLElement, x: number, y: number) {
  ticket.style.setProperty('--ry', `${x * 9}deg`)
  ticket.style.setProperty('--rx', `${-y * 7}deg`)
  ticket.style.setProperty('--rz', `${x * 2.5}deg`)
  ticket.style.setProperty('--lean', `${x}`)
}

function onDown(event: PointerEvent) {
  if (event.pointerType !== 'mouse') dragFrom = { x: event.clientX, y: event.clientY }
}

// Mysz pochyla bilet samym położeniem. Palec go przeciąga: w bok kołysze, a ruch w pionie
// zostaje dla przewijania strony.
function onMove(event: PointerEvent) {
  const ticket = event.currentTarget as HTMLElement
  const box = ticket.getBoundingClientRect()
  if (event.pointerType === 'mouse') {
    lean(
      ticket,
      (event.clientX - box.left) / box.width - 0.5,
      (event.clientY - box.top) / box.height - 0.5,
    )
  } else if (dragFrom) {
    const x = Math.max(-1, Math.min(1, (event.clientX - dragFrom.x) / (box.width * 0.6)))
    lean(ticket, x, 0)
  }
}

function level(event: PointerEvent) {
  dragFrom = undefined
  const ticket = event.currentTarget as HTMLElement
  for (const name of ['--ry', '--rx', '--rz', '--lean']) ticket.style.removeProperty(name)
}
</script>

<template>
  <div
    class="tk"
    :style="{ '--tk-exam': `var(--exam-${exam.id})` }"
    @pointerdown="onDown"
    @pointermove="onMove"
    @pointerup="level"
    @pointercancel="level"
    @pointerleave="level"
  >
    <article class="tk__paper">
      <div class="tk__main">
        <p class="tk__micro" aria-hidden="true">{{ `${PRODUCT_NAME} · `.repeat(14) }}</p>
        <TicketTrack
          :shape="exam.solid"
          :mode="track"
          :days="days"
          aria-hidden="true"
          @arrive="$emit('buy')"
        />
        <h3 class="tk__name">
          <span v-for="word in exam.name.split(' ')" :key="word">{{ word }}</span>
        </h3>

        <div class="tk__seal" aria-hidden="true" @pointerdown.stop @pointermove.stop>
          <svg class="tk__rosette" viewBox="-50 -50 100 100">
            <ellipse
              v-for="angle in rosette"
              :key="angle"
              rx="47"
              ry="17"
              :transform="`rotate(${angle})`"
            />
          </svg>
          <span class="tk__disc" />
          <div class="tk__solid">
            <SolidFigure :kind="exam.solid" :fill="0.5" :weight="0.045" :spin="0.3" />
          </div>
        </div>

        <div v-if="pickKind" class="tk__kind" role="group" aria-label="Rodzaj biletu">
          <button
            v-for="option in ['monthly', 'annual'] as const"
            :key="option"
            class="tk__option"
            type="button"
            :aria-pressed="kind === option"
            @click="kind = option"
          >
            {{ TICKET_NAMES[option] }}
          </button>
        </div>
        <p v-else class="tk__kind-name">{{ TICKET_NAMES[kind] }}</p>

        <dl class="tk__fields">
          <div>
            <dt>Cena</dt>
            <dd class="tk__price">{{ formatPrice(exam.prices[kind]) }}</dd>
          </div>
          <div>
            <dt>Ważny</dt>
            <dd class="tk__valid">
              {{ kind === 'annual' ? `do ${validUntil}` : 'miesiąc, przedłużasz sam' }}
            </dd>
          </div>
          <div>
            <dt>Do egzaminu</dt>
            <dd>{{ days }} {{ plural(days, ['dzień', 'dni', 'dni']) }}</dd>
          </div>
        </dl>
        <div class="tk__foil" aria-hidden="true" />
      </div>
      <div class="tk__stub">
        <button class="button tk__buy" type="button" @click="$emit('buy')">
          {{ buyLabel }}
          <ArrowIcon />
        </button>
        <span class="tk__code" aria-hidden="true" />
      </div>
      <div class="tk__glare" aria-hidden="true" />
    </article>
  </div>
</template>

<style scoped>
.tk {
  --pad-t: clamp(1rem, 0.85rem + 0.9vw, 1.5rem);
  --notch: 0.75rem;
  --stub-h: calc(3rem + 2 * var(--pad-t));
  --paper: var(--tk-paper, #fff);
  --ink: var(--tk-ink, #1d1f22);
  --ink-soft: var(--tk-ink-soft, #55595f);
  --ink-raised: var(--tk-ink, #1d1f22);
  --ground: var(--paper);
  --hairline: color-mix(in srgb, var(--ink) 22%, transparent);
  --deep: var(--tk-deep, color-mix(in srgb, var(--tk-exam) 70%, #000));
  position: relative;
  isolation: isolate;
  color: var(--ink);
  transform: rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg)) rotateZ(var(--rz, 0deg));
  transform-origin: 50% 0;
  transition: transform 0.45s cubic-bezier(0.16, 1, 0.3, 1);
  touch-action: pan-y;
  user-select: none;
}

.tk::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  border-radius: 0 0 1.25rem 1.25rem;
  box-shadow:
    0 2px 2px rgb(0 0 0 / 0.12),
    0 22px 34px -12px rgb(0 0 0 / 0.34);
}

.tk__paper {
  position: relative;
  display: grid;
  border-radius: 0 0 1.25rem 1.25rem;
  background: var(--paper);
  overflow: hidden;
  mask:
    radial-gradient(
      circle var(--notch) at 0% calc(100% - var(--stub-h)),
      transparent calc(100% - 1px),
      #000 100%
    ),
    radial-gradient(
      circle var(--notch) at 100% calc(100% - var(--stub-h)),
      transparent calc(100% - 1px),
      #000 100%
    );
  mask-composite: intersect;
}

/* Giloszowe tło: cienkie fale w kolorze egzaminu, jak na papierze wartościowym. */
.tk__paper::before {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--tk-exam);
  opacity: 0.16;
  mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='14'%3E%3Cpath d='M0 7c8-9 16-9 24 0s16 9 24 0' fill='none' stroke='%23000' stroke-width='1'/%3E%3C/svg%3E")
    0 0 / 48px 14px;
  pointer-events: none;
}

.tk__main {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.8rem 1rem;
  padding: var(--pad-t);
}

.tk__main > * {
  grid-column: 1 / -1;
}

.tk__micro {
  margin: calc(-0.35 * var(--pad-t)) calc(-1 * var(--pad-t)) 0;
  color: var(--deep);
  font-size: 0.5rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  line-height: 1;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
}

.tk__name {
  display: grid;
  grid-column: 1;
  align-self: center;
  font-size: clamp(1.9rem, 1.1rem + 4vw, 2.3rem);
  font-weight: 800;
  font-stretch: 75%;
  letter-spacing: 0.004em;
  line-height: 0.92;
  text-transform: uppercase;
}

/* Pieczęć: rozeta z elips, a w środku bryła egzaminu, którą da się obrócić. Bryłę można
   złapać na całej pieczęci, bo sam środek jest za mały na palec. */
.tk__seal {
  position: relative;
  grid-column: 2;
  width: clamp(5.5rem, 26vw, 7.5rem);
  aspect-ratio: 1;
}

.tk__rosette {
  position: absolute;
  inset: 0;
  fill: none;
  stroke: var(--tk-exam);
  stroke-width: 0.55;
  opacity: 0.75;
}

.tk__disc {
  position: absolute;
  inset: 21%;
  border-radius: 50%;
  background: var(--paper);
}

.tk__solid {
  position: absolute;
  inset: 0;
  color: var(--deep);
}

.tk__kind {
  display: flex;
  gap: 0.4rem;
}

.tk__option {
  flex: 1 1 0;
  min-height: 2.75rem;
  padding: 0 0.5rem;
  border: 1.5px solid var(--ink);
  border-radius: 999px;
  background: transparent;
  color: var(--ink);
  font: inherit;
  font-size: 0.9375rem;
  font-weight: 650;
  white-space: nowrap;
  cursor: pointer;
  transition:
    background-color 0.2s ease,
    color 0.2s ease;
}

.tk__option[aria-pressed='true'] {
  background: var(--ink);
  color: var(--paper);
}

.tk__kind-name {
  display: flex;
  align-items: center;
  min-height: 2.75rem;
  font-size: 1.15rem;
  font-weight: 780;
  font-stretch: 82%;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.tk__fields {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 0.6rem 1.5rem;
  align-items: start;
}

.tk__fields > div:first-child {
  grid-row: span 2;
  align-self: end;
}

.tk__fields dt {
  color: var(--ink-soft);
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.09em;
  text-transform: uppercase;
}

.tk__fields dd {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1.2;
}

/* Miejsce na dwa wiersze, żeby dłuższy opis biletu miesięcznego nie wydłużał biletu. */
.tk__valid {
  min-height: 2.4em;
}

.tk__price {
  min-width: 4.2ch;
  font-size: clamp(2.5rem, 2rem + 2.6vw, 3.3rem);
  font-weight: 800;
  font-stretch: 82%;
  letter-spacing: -0.02em;
  line-height: 0.95;
  white-space: nowrap;
}

/* Pasek hologramu. Kolory przesuwają się razem z pochyleniem biletu i przewijaniem strony. */
.tk__foil {
  height: 1.4rem;
  border-radius: 0.3rem;
  background:
    repeating-linear-gradient(115deg, rgb(255 255 255 / 0.55) 0 2px, transparent 2px 7px),
    linear-gradient(100deg, #9fe8ff, #c9b6ff, #ffc2e6, #fff0a3, #a8ffd0, #9fe8ff, #c9b6ff, #ffc2e6)
      calc((var(--tk-shine) + var(--lean, 0)) * 100%) 0 / 320% 100%;
}

/* Połysk papieru: jasna smuga, która wędruje po całym bilecie. */
.tk__glare {
  position: absolute;
  inset: 0;
  background: linear-gradient(
      105deg,
      transparent 38%,
      rgb(255 255 255 / 0.5) 49%,
      rgb(255 255 255 / 0.12) 55%,
      transparent 64%
    )
    calc((var(--tk-shine) * 0.6 + 0.2 + var(--lean, 0) * 0.7) * 100%) 0 / 260% 100% no-repeat;
  mix-blend-mode: soft-light;
  pointer-events: none;
}

.tk__stub {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  height: var(--stub-h);
  padding-inline: var(--pad-t);
  border-top: 2px dashed var(--hairline);
}

.tk__buy {
  border-color: var(--tk-button, var(--ink));
  background: var(--tk-button, var(--ink));
  color: var(--tk-button-ink, var(--paper));
}

.tk__buy:hover {
  background: color-mix(in srgb, var(--tk-button, var(--ink)) 86%, #fff);
}

/* Kod kreskowy z samych pasków. */
.tk__code {
  width: 5.5rem;
  height: 2.4rem;
  background: repeating-linear-gradient(
    90deg,
    var(--ink) 0 2px,
    transparent 2px 5px,
    var(--ink) 5px 6px,
    transparent 6px 8px,
    var(--ink) 8px 11px,
    transparent 11px 13px
  );
}

.tk :focus-visible {
  outline-color: var(--ink);
}

@media (prefers-reduced-motion: no-preference) {
  @supports (animation-timeline: view()) {
    .tk {
      animation: tk-foil linear both;
      animation-timeline: view();
    }
  }
}

@media (prefers-reduced-motion: reduce) {
  .tk {
    transform: none;
    transition: none;
  }
}
</style>

<style>
/* Zarejestrowana liczba, żeby dało się ją płynnie animować przewijaniem. */
@property --tk-shine {
  syntax: '<number>';
  inherits: true;
  initial-value: 0.35;
}

@keyframes tk-foil {
  from {
    --tk-shine: 0.05;
  }

  to {
    --tk-shine: 0.95;
  }
}
</style>
