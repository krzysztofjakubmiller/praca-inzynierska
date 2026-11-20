<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import type { Account } from '@/account'
import AccountTicket from '@/components/account/AccountTicket.vue'
import { EXAMS } from '@/config/exams'
import { accountExamId } from '@/lastExam'
import { purchaseRoute } from '@/purchase'
import { TICKET_NAMES, annualTicketEnd, formatPrice } from '@/utils/tickets'

defineProps<{ account: Account }>()

const router = useRouter()

// Backend nie sprzedaje jeszcze biletów, więc zakładka pokazuje bilet do kupienia na egzamin
// konta, z cenami, i pustą historię. Gdy płatności ruszą, tu pojawi się kupiony bilet.
const exam = computed(() => EXAMS.find((item) => item.id === accountExamId.value)!)
const annualEnd = new Intl.DateTimeFormat('pl-PL', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
}).format(annualTicketEnd(new Date()))

const facts = computed(() => [
  { name: 'Bilet', value: 'jeszcze nie kupiony' },
  { name: TICKET_NAMES.monthly, value: `${formatPrice(exam.value.prices.monthly)} miesięcznie` },
  {
    name: TICKET_NAMES.annual,
    value: `${formatPrice(exam.value.prices.annual)}, ważny do ${annualEnd}`,
  },
])

async function buy() {
  await router.push(await purchaseRoute(exam.value.id, 'monthly'))
}
</script>

<template>
  <div class="payments">
    <AccountTicket :exam="exam" :facts="facts" :email="account.email">
      <button type="button" class="button" @click="buy">Kup bilet</button>
    </AccountTicket>
    <section class="payments__history" aria-labelledby="payments-history">
      <h2 id="payments-history" class="payments__heading">Historia płatności</h2>
      <p>Nie ma jeszcze żadnej płatności.</p>
      <p class="payments__note">Potwierdzenie każdej płatności przyjdzie na {{ account.email }}.</p>
    </section>
  </div>
</template>

<style scoped>
/* Bilet i historia obok siebie, a na telefonie bilet nad historią. */
.payments {
  display: grid;
  gap: 1rem;
  align-items: start;
}

.payments > .ticket {
  width: min(100%, 24rem);
}

.payments__history {
  display: grid;
  gap: 0.75rem;
  padding: clamp(1.25rem, 1rem + 1vw, 1.75rem);
  border-radius: var(--radius-small);
  background: var(--surface);
  box-shadow: var(--card-shadow);
}

.payments__heading {
  font-size: 1.25rem;
  font-weight: 750;
}

.payments__note {
  color: var(--ink-soft);
  font-size: 0.875rem;
}

@media (min-width: 52rem) {
  .payments {
    grid-template-columns: 22rem minmax(0, 1fr);
    gap: 1.5rem;
  }

  .payments > .ticket {
    width: 100%;
  }
}
</style>
