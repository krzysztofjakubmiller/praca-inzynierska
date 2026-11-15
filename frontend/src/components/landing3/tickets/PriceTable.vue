<script setup lang="ts">
import { computed, ref } from 'vue'
import { EXAMS, type Exam } from '@/config/exams'
import { daysToExam } from '@/landing2/content'
import { useOffer } from '@/landing2/offer'
import { annualTicketValue, formatPrice, type TicketKind } from '@/utils/tickets'
import StationMarker from '@/components/landing/StationMarker.vue'
import PaperTicket from '../PaperTicket.vue'

// Najspokojniejszy wariant: tabela cen i jeden bilet, który pokazuje wybraną pozycję.
defineEmits<{ taken: [] }>()

const { today, validUntil, annualMonths } = useOffer()

const selected = ref<Exam['id']>('matura-podstawowa')
const kind = ref<TicketKind>('annual')
const exam = computed(() => EXAMS.find((item) => item.id === selected.value)!)

function pick(id: Exam['id'], column: TicketKind) {
  selected.value = id
  kind.value = column
}
</script>

<template>
  <div class="prices">
    <table class="prices__table">
      <thead>
        <tr>
          <th scope="col">Egzamin</th>
          <th scope="col">Miesięczny</th>
          <th scope="col">Roczny</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in EXAMS" :key="item.id" :style="{ '--exam': `var(--exam-${item.id})` }">
          <th scope="row">
            <StationMarker :shape="item.solid" class="prices__marker" />
            {{ item.name }}
          </th>
          <td v-for="column in ['monthly', 'annual'] as const" :key="column">
            <button
              class="prices__cell"
              type="button"
              :aria-pressed="selected === item.id && kind === column"
              @click="pick(item.id, column)"
            >
              <strong>{{ formatPrice(item.prices[column]) }}</strong>
              <span v-if="column === 'annual'">
                {{ formatPrice(annualTicketValue(item.prices, annualMonths).perMonth) }} za miesiąc
              </span>
              <span v-else>co miesiąc</span>
            </button>
          </td>
        </tr>
      </tbody>
    </table>

    <div class="prices__ticket">
      <Transition name="prices-swap" mode="out-in">
        <PaperTicket
          :key="exam.id"
          v-model:kind="kind"
          :exam="exam"
          :valid-until="validUntil"
          :days="daysToExam(exam.id, today)"
          :pick-kind="false"
          @buy="$emit('taken')"
        />
      </Transition>
    </div>
  </div>
</template>

<style scoped>
.prices {
  display: grid;
  gap: clamp(1.5rem, 1rem + 3vw, 3.5rem);
  align-items: center;
}

.prices__table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

.prices__table thead th {
  padding: 0 0.4rem 0.6rem;
  color: var(--ink-soft);
  font-size: 0.875rem;
  font-weight: 650;
  text-align: left;
}

.prices__table thead th:first-child {
  width: 34%;
  padding-left: 0;
}

.prices__table tbody tr {
  border-top: 1px solid var(--hairline);
}

.prices__table tbody th {
  padding: 0.75rem 0.5rem 0.75rem 0;
  font-size: clamp(0.95rem, 0.85rem + 0.5vw, 1.15rem);
  font-weight: 750;
  line-height: 1.15;
  text-align: left;
}

.prices__marker {
  --marker-fill: var(--exam);
  --marker-stroke: var(--exam);
  display: block;
  margin-bottom: 0.25rem;
  font-size: 1.1rem;
}

.prices__table td {
  padding: 0.45rem 0.2rem;
}

.prices__cell {
  display: grid;
  gap: 0.1rem;
  width: 100%;
  min-height: 3.6rem;
  padding: 0.45rem 0.7rem;
  border: 1.5px solid transparent;
  border-radius: 0.8rem;
  background: transparent;
  color: var(--ink);
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease;
}

.prices__cell strong {
  font-size: clamp(1.2rem, 1.05rem + 0.8vw, 1.6rem);
  font-weight: 800;
  font-stretch: 86%;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.prices__cell span {
  color: var(--ink-soft);
  font-size: 0.8125rem;
  line-height: 1.2;
}

.prices__cell:hover {
  border-color: var(--hairline);
}

.prices__cell[aria-pressed='true'] {
  border-color: var(--ink);
  background: color-mix(in srgb, var(--exam) 12%, transparent);
}

.prices__ticket {
  width: min(100%, 24rem);
  margin-inline: auto;
  perspective: 70rem;
}

.prices__ticket :deep(.tk__paper),
.prices__ticket :deep(.tk)::before {
  border-radius: 1.25rem;
}

.prices-swap-enter-active,
.prices-swap-leave-active {
  transition: opacity 0.2s ease;
}

.prices-swap-enter-from,
.prices-swap-leave-to {
  opacity: 0;
}

@media (min-width: 56rem) {
  .prices {
    grid-template-columns: minmax(0, 6fr) minmax(0, 5fr);
  }
}
</style>
