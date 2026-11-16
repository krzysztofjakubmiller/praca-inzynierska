<script setup lang="ts">
import { ref } from 'vue'
import { EXAMS } from '@/config/exams'
import { daysToExam } from '@/landing2/content'
import { useOffer } from '@/landing2/offer'
import type { TicketKind } from '@/utils/tickets'
import PaperTicket from '../PaperTicket.vue'
import type { TrackMode } from '../TicketTrack.vue'

// Trzy zachowania paska przy napisie „Start”, każde na osobnym bilecie.
const emit = defineEmits<{ taken: [] }>()

const { today, validUntil } = useOffer()

const TRACKS: { mode: TrackMode; name: string; text: string }[] = [
  {
    mode: 'spring',
    name: 'Sprężyna',
    text: 'Złap stację i odciągnij ją w lewo. Po puszczeniu wraca na miejsce.',
  },
  {
    mode: 'days',
    name: 'Odliczanie',
    text: 'Odciągana stacja pokazuje, ile dni zostaje do egzaminu w danym miejscu trasy.',
  },
  {
    mode: 'ride',
    name: 'Dojazd',
    text: 'Wagonik dowieziony do stacji kupuje bilet, tak samo jak przycisk.',
  },
]

const kinds = ref<TicketKind[]>(['annual', 'annual', 'annual'])
</script>

<template>
  <ol class="trio">
    <li v-for="(track, index) in TRACKS" :key="track.mode" class="trio__item">
      <h3 class="trio__name">{{ track.name }}</h3>
      <p class="trio__text">{{ track.text }}</p>
      <PaperTicket
        v-model:kind="kinds[index]!"
        class="trio__ticket"
        :exam="EXAMS[index]!"
        :valid-until="validUntil"
        :days="daysToExam(EXAMS[index]!.id, today)"
        :track="track.mode"
        @buy="emit('taken')"
      />
    </li>
  </ol>
</template>

<style scoped>
.trio {
  display: grid;
  gap: 2.5rem 1.5rem;
  padding: 0;
  list-style: none;
}

.trio__item {
  display: grid;
  grid-template-rows: auto auto 1fr;
  gap: 0.4rem;
  width: min(100%, 24rem);
  margin-inline: auto;
}

.trio__name {
  font-size: 1.35rem;
  font-weight: 800;
  font-stretch: 88%;
  letter-spacing: -0.015em;
}

.trio__text {
  color: var(--ink-soft);
  line-height: 1.4;
}

.trio__ticket {
  align-self: start;
  margin-top: 0.75rem;
}

@media (min-width: 52rem) {
  .trio {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 80rem) {
  .trio {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>
