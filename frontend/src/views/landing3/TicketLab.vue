<script setup lang="ts">
import { ref, watch } from 'vue'
import { TICKETS_TEXT } from '@/landing3/content'
import LabShell from '@/components/landing3/LabShell.vue'
import TicketPrinter from '@/components/landing3/TicketPrinter.vue'
import PriceTable from '@/components/landing3/tickets/PriceTable.vue'
import StampTicket from '@/components/landing3/tickets/StampTicket.vue'
import TicketStack from '@/components/landing3/tickets/TicketStack.vue'
import TouchValidator from '@/components/landing3/tickets/TouchValidator.vue'
import TrackTrio from '@/components/landing3/tickets/TrackTrio.vue'

// Jeden ze sposobów pokazania biletu na wizytówce. Na prawdziwej stronie zabranie biletu
// prowadzi do zakupu; tutaj zostaje tylko potwierdzenie, żeby dało się próbować dalej.
const props = defineProps<{ variant: string }>()

const TEXTS: Record<string, string> = {
  '1': TICKETS_TEXT,
  '2': 'Dotknij ceny na ekranie kasownika, a wydrukuje się twój bilet.',
  '3': 'Trzy bilety, po jednym na egzamin. Wysuń ten, którego potrzebujesz.',
  '4': 'Wybierz bilet i skasuj go, tak jak w tramwaju.',
  '5': 'Wszystkie ceny w jednym miejscu. Wybierz pozycję, a zobaczysz swój bilet.',
  '6': 'Pasek przy napisie „Start” da się złapać. Na każdym bilecie zachowuje się inaczej.',
}

const taken = ref(false)
watch(
  () => props.variant,
  () => (taken.value = false),
)
</script>

<template>
  <LabShell kind="bilet" :variant="variant">
    <section class="bay" :class="`bay--${variant}`" aria-labelledby="bay-title">
      <div class="bay__head">
        <h2 id="bay-title" class="bay__title">Bilety</h2>
        <p class="bay__text">{{ TEXTS[variant] }}</p>
        <p v-if="taken" class="bay__done" role="status">
          Bilet zabrany. Na stronie w tym miejscu zaczyna się zakup.
        </p>
      </div>
      <TicketPrinter v-if="variant === '1'" @taken="taken = true" />
      <TouchValidator v-else-if="variant === '2'" @taken="taken = true" />
      <TicketStack v-else-if="variant === '3'" @taken="taken = true" />
      <StampTicket v-else-if="variant === '4'" @taken="taken = true" />
      <PriceTable v-else-if="variant === '5'" class="bay__wide" @taken="taken = true" />
      <TrackTrio v-else @taken="taken = true" />
    </section>
  </LabShell>
</template>

<style scoped>
.bay {
  display: grid;
  gap: clamp(1.5rem, 1.2rem + 1.6vw, 2.5rem);
  align-content: start;
  padding: clamp(2rem, 1.5rem + 3vw, 4.5rem) max(var(--gutter), calc((100vw - 66rem) / 2))
    clamp(3rem, 2rem + 4vw, 6rem);
  background: var(--ground);
  color: var(--ink);
}

.bay__head {
  display: grid;
  gap: 0.8rem;
  align-content: start;
}

.bay__title {
  font-size: clamp(2rem, 1.5rem + 2.4vw, 3.4rem);
  font-weight: 800;
  font-stretch: 88%;
  letter-spacing: -0.028em;
  line-height: 1;
}

.bay__text {
  max-width: 40ch;
  font-size: clamp(1.0625rem, 1rem + 0.4vw, 1.25rem);
  line-height: 1.45;
}

.bay__done {
  max-width: 40ch;
  font-weight: 700;
}

/* Kasownik z przyciskami stoi na granatowym polu, tak jak na stronie A. */
.bay--1 {
  --ground: #16224f;
  --ink: #fff;
  --ink-soft: rgb(255 255 255 / 0.84);
  --tp-body: #0b1027;
  --tp-screen-ink: #9fd0ff;
  --tk-button: #16224f;
}

.bay--1 :focus-visible {
  outline-color: #fff;
}

.bay--2 {
  --ground: #f4f1ea;
}

.bay--3 {
  --ground: #dff1e5;
}

.bay--4 {
  --ground: #fbe5e1;
}

.bay--5 {
  --ground: #fff;
}

/* Trzy bilety obok siebie potrzebują szerszego pola niż jeden kasownik. */
.bay--6 {
  --ground: #e6e9f2;
  padding-inline: max(var(--gutter), calc((100vw - 78rem) / 2));
}

@media (min-width: 56rem) {
  .bay:not(.bay--5, .bay--6) {
    grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
    column-gap: var(--gutter);
  }

  .bay__head {
    position: sticky;
    top: 2rem;
  }

  :is(.bay--5, .bay--6) .bay__head {
    position: static;
  }
}
</style>
