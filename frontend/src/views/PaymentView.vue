<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { loadAccount } from '@/account'
import { EXAMS, type Exam } from '@/config/exams'
import { usePageGround } from '@/landing2/pageGround'
import { readPurchase } from '@/purchase'
import { TICKET_NAMES, formatPrice, type TicketKind } from '@/utils/tickets'
import ArrowIcon from '@/components/landing/ArrowIcon.vue'
import SolidFigure from '@/components/landing2/SolidFigure.vue'

// Wybór biletu i sposobu płatności. Na razie sam wygląd: przycisk zapłaty prowadzi do „Wkrótce”.
const route = useRoute()
const router = useRouter()
const purchase = readPurchase(route.query)

const METHODS = [
  { id: 'blik', name: 'BLIK', note: 'Kod z aplikacji banku' },
  { id: 'karta', name: 'Karta', note: 'Visa albo Mastercard' },
  { id: 'przelew', name: 'Szybki przelew', note: 'Przez twój bank' },
]
const KINDS: { id: TicketKind; note: string }[] = [
  { id: 'monthly', note: 'Przedłużasz co miesiąc.' },
  { id: 'annual', note: 'Płacisz raz, działa do końca sierpnia po egzaminie.' },
]

// Egzamin wybrany wcześniej, na wizytówce albo na stronie logowania, jest już ustalony.
const examId = ref<Exam['id']>(purchase.exam?.id ?? 'matura-podstawowa')
const kind = ref<TicketKind>(purchase.kind)
const method = ref('blik')

const exam = computed(() => EXAMS.find((item) => item.id === examId.value)!)

usePageGround('#16224f')

// Bilet kupuje się na konto, więc niezalogowany wraca stąd na logowanie z tym samym wyborem.
onMounted(async () => {
  const account = await loadAccount().catch(() => null)
  if (!account) router.replace({ name: 'login', query: route.query })
})
</script>

<template>
  <main class="pay" :style="{ '--exam': `var(--solid-${exam.id})` }">
    <header class="pay__head">
      <div class="pay__solid" aria-hidden="true">
        <SolidFigure :key="exam.id" :kind="exam.solid" :spin="0.2" :fill="0.9" :weight="0.04" />
      </div>
      <div>
        <h1 class="pay__title">Bilet</h1>
        <p class="pay__exam">{{ exam.name }}</p>
      </div>
    </header>

    <form class="pay__form" @submit.prevent="router.push({ name: 'coming-soon' })">
      <fieldset v-if="!purchase.exam" class="pay__group">
        <legend>Egzamin</legend>
        <label v-for="item in EXAMS" :key="item.id" class="pay__option">
          <input v-model="examId" type="radio" name="egzamin" :value="item.id" />
          <span class="pay__name">{{ item.name }}</span>
          <span class="pay__note">od {{ formatPrice(item.prices.monthly) }} miesięcznie</span>
        </label>
      </fieldset>

      <fieldset class="pay__group">
        <legend>Okres</legend>
        <label v-for="item in KINDS" :key="item.id" class="pay__option">
          <input v-model="kind" type="radio" name="okres" :value="item.id" />
          <span class="pay__name">{{ TICKET_NAMES[item.id] }}</span>
          <span class="pay__note">{{ item.note }}</span>
          <strong class="pay__price">{{ formatPrice(exam.prices[item.id]) }}</strong>
        </label>
      </fieldset>

      <fieldset class="pay__group">
        <legend>Płatność</legend>
        <label v-for="item in METHODS" :key="item.id" class="pay__option">
          <input v-model="method" type="radio" name="platnosc" :value="item.id" />
          <span class="pay__name">{{ item.name }}</span>
          <span class="pay__note">{{ item.note }}</span>
        </label>
      </fieldset>

      <button class="button pay__submit" type="submit">
        Zapłać {{ formatPrice(exam.prices[kind]) }}
        <ArrowIcon />
      </button>
    </form>
  </main>
</template>

<style scoped>
.pay {
  --ground: #16224f;
  --ink: #fff;
  --ink-soft: rgb(255 255 255 / 0.82);
  --hairline: rgb(255 255 255 / 0.28);
  --solid-e8: #7fb0ff;
  --solid-matura-podstawowa: #4fd58d;
  --solid-matura-rozszerzona: #ff7a69;
  display: grid;
  gap: 2rem;
  align-content: center;
  max-width: 34rem;
  min-height: 100svh;
  margin-inline: auto;
  padding: var(--gutter);
  color: var(--ink);
}

.pay :focus-visible {
  outline-color: #fff;
}

.pay__head {
  display: flex;
  align-items: center;
  gap: 1.25rem;
}

.pay__solid {
  flex: none;
  width: 6.5rem;
  height: 6.5rem;
  color: var(--exam);
}

.pay__title {
  font-size: clamp(2.6rem, 2rem + 3vw, 4rem);
  font-weight: 800;
  font-stretch: 75%;
  line-height: 0.9;
  text-transform: uppercase;
}

.pay__exam {
  margin-top: 0.4rem;
  font-size: 1.2rem;
  font-weight: 700;
}

.pay__form {
  display: grid;
  gap: 1.75rem;
}

.pay__group {
  display: grid;
  gap: 0.5rem;
  padding: 0;
  border: 0;
}

.pay__group legend {
  margin-bottom: 0.6rem;
  color: var(--ink-soft);
  font-size: 0.8125rem;
  font-weight: 700;
  letter-spacing: 0.09em;
  text-transform: uppercase;
}

/* Cała pozycja jest polem wyboru. Wybrana wypełnia się bielą. */
.pay__option {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.1rem 1rem;
  align-items: center;
  min-height: 3.5rem;
  padding: 0.7rem 1.1rem;
  border: 1.5px solid var(--hairline);
  border-radius: 1rem;
  cursor: pointer;
  transition:
    background-color 0.15s ease,
    color 0.15s ease;
}

.pay__option input {
  position: absolute;
  inset: 0;
  margin: 0;
  border-radius: inherit;
  opacity: 0;
  cursor: pointer;
}

.pay__option:has(input:checked) {
  border-color: #fff;
  background: #fff;
  color: #16224f;
}

.pay__option:has(input:focus-visible) {
  outline: 3px solid #fff;
  outline-offset: 3px;
}

.pay__name {
  font-size: 1.1rem;
  font-weight: 750;
}

.pay__note {
  grid-column: 1;
  font-size: 0.9375rem;
  opacity: 0.82;
}

.pay__price {
  grid-row: 1 / span 2;
  grid-column: 2;
  font-size: 1.5rem;
  font-weight: 800;
  font-stretch: 82%;
  font-variant-numeric: tabular-nums;
}

.pay__submit {
  justify-self: start;
}
</style>
