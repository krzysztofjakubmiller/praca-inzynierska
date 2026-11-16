<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue'
import { EXAMS, type Exam } from '@/config/exams'
import { useOffer } from '@/landing2/offer'
import { formatPrice, type TicketKind } from '@/utils/tickets'
import StationMarker from '@/components/landing/StationMarker.vue'
import FitScreen from '../FitScreen.vue'
import TicketChute, { type ChutePhase } from '../TicketChute.vue'

// Kasownik z ekranem dotykowym. Na ekranie jest cały cennik w dwóch kolumnach, a dotknięcie
// ceny drukuje bilet. Bilet zrywa się dopiero po przejściu dalej.
const emit = defineEmits<{ taken: [exam: Exam['id'], kind: TicketKind] }>()

const { today, validUntil } = useOffer()

const COLUMNS: { kind: TicketKind; name: string }[] = [
  { kind: 'monthly', name: 'Miesięczny' },
  { kind: 'annual', name: 'Roczny' },
]

const selected = ref<{ exam: Exam['id']; kind: TicketKind } | null>(null)
const kind = ref<TicketKind>('annual')
const phase = ref<ChutePhase>('empty')
const taken = ref(false)
const fit = useTemplateRef<InstanceType<typeof FitScreen>>('fit')

const exam = computed(() => EXAMS.find((item) => item.id === selected.value?.exam) ?? null)
const token = computed(() =>
  selected.value ? `${selected.value.exam}-${selected.value.kind}` : undefined,
)

const message = computed(() => {
  if (phase.value === 'printing' || phase.value === 'retracting') return 'Drukuję bilet'
  if (phase.value === 'ready') return 'Bilet gotowy. Na bilecie wybierz Dalej.'
  if (phase.value === 'taking') return 'Miłej podróży'
  return taken.value ? 'Bilet zerwany. Możesz wydrukować kolejny.' : 'Dotknij ceny biletu'
})

function touch(id: Exam['id'], column: TicketKind) {
  taken.value = false
  kind.value = column
  selected.value = { exam: id, kind: column }
  fit.value?.show()
}

function onTaken() {
  const picked = selected.value
  taken.value = true
  selected.value = null
  if (picked) emit('taken', picked.exam, picked.kind)
}
</script>

<template>
  <FitScreen ref="fit" class="tv">
    <div class="tv__body">
      <div class="tv__screen">
        <p class="tv__status" aria-live="polite">{{ message }}</p>
        <table class="tv__table">
          <thead>
            <tr>
              <th scope="col"><span class="tv__sr">Bilet</span></th>
              <th v-for="column in COLUMNS" :key="column.kind" scope="col">{{ column.name }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in EXAMS" :key="item.id" :style="{ '--exam': `var(--tv-${item.id})` }">
              <th scope="row">
                <span class="tv__exam">
                  <StationMarker :shape="item.solid" class="tv__marker" />
                  {{ item.name }}
                </span>
              </th>
              <td v-for="column in COLUMNS" :key="column.kind">
                <button
                  class="tv__price"
                  type="button"
                  :aria-pressed="selected?.exam === item.id && selected.kind === column.kind"
                  :aria-label="`${item.name}, bilet ${column.name.toLowerCase()}, ${formatPrice(item.prices[column.kind])}`"
                  @click="touch(item.id, column.kind)"
                >
                  {{ formatPrice(item.prices[column.kind]) }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <div class="tv__out">
      <p v-if="phase === 'empty'" class="tv__hint" aria-hidden="true">Tu wysunie się bilet</p>
      <TicketChute
        v-model:kind="kind"
        :exam="exam"
        :token="token"
        :valid-until="validUntil"
        :today="today"
        :pick-kind="false"
        take="tear"
        buy-label="Dalej"
        @phase="phase = $event"
        @taken="onTaken"
      />
    </div>
  </FitScreen>
</template>

<style scoped>
.tv {
  --tv-e8: #7fb0ff;
  --tv-matura-podstawowa: #4fd58d;
  --tv-matura-rozszerzona: #ff8a7a;
  width: min(100%, 27rem);
  margin-inline: auto;
}

/* Żółta obudowa kasownika z czarną ramką ekranu. */
.tv__body {
  padding: 0.9rem 0.9rem 1.9rem;
  border-radius: 1.5rem 1.5rem 0.9rem 0.9rem;
  background: linear-gradient(to bottom, #ffdc57, #ffd026 30%, #eab800);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.55),
    inset 0 -2px 0 rgb(0 0 0 / 0.14),
    0 22px 30px -18px rgb(0 0 0 / 0.5);
}

.tv__screen {
  display: grid;
  gap: 0.6rem;
  padding: 0.85rem 0.75rem 0.75rem;
  border: 0.3rem solid #0c0d10;
  border-radius: 1rem;
  background: #15171c;
  color: #f4f5f7;
  box-shadow: inset 0 0 0 1px rgb(255 255 255 / 0.08);
}

.tv__status {
  min-height: 1.3em;
  color: #ffd95a;
  font-size: 0.9375rem;
  font-weight: 700;
  line-height: 1.3;
}

.tv__table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0.35rem;
  margin: -0.35rem;
  table-layout: fixed;
}

.tv__table thead th {
  padding-bottom: 0.1rem;
  color: #b9bdc7;
  font-size: 0.8125rem;
  font-weight: 650;
  text-align: center;
}

.tv__table thead th:first-child {
  width: 39%;
}

.tv__table tbody th {
  font-size: clamp(0.84rem, 0.72rem + 0.6vw, 0.975rem);
  font-weight: 700;
  line-height: 1.15;
  text-align: left;
}

.tv__exam {
  display: flex;
  align-items: center;
  gap: 0.45rem;
}

.tv__marker {
  --marker-fill: var(--exam);
  --marker-stroke: var(--exam);
  flex: none;
  font-size: 0.95rem;
}

.tv__price {
  width: 100%;
  min-height: 2.9rem;
  padding: 0 0.25rem;
  border: 1.5px solid rgb(255 255 255 / 0.22);
  border-radius: 0.7rem;
  background: #23262d;
  color: #fff;
  font: inherit;
  font-size: clamp(1.05rem, 0.9rem + 0.8vw, 1.3rem);
  font-weight: 800;
  font-stretch: 86%;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  cursor: pointer;
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease;
}

.tv__price:hover {
  border-color: var(--exam);
}

.tv__price:active {
  background: #2f333c;
}

.tv__price[aria-pressed='true'] {
  border-color: var(--exam);
  background: var(--exam);
  color: #101421;
}

.tv__price:focus-visible {
  outline: 3px solid #fff;
  outline-offset: 2px;
}

.tv__sr {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

.tv__out {
  position: relative;
  margin: -1.15rem 5% 0;
}

.tv__hint {
  position: absolute;
  inset: 1.5rem 0 auto;
  display: grid;
  place-items: center;
  height: 9rem;
  border: 2px dashed color-mix(in srgb, currentColor 30%, transparent);
  border-top: 0;
  border-radius: 0 0 1.25rem 1.25rem;
  color: var(--ink-soft);
  font-weight: 600;
}
</style>
