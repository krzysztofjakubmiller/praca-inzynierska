<script setup lang="ts">
import { computed } from 'vue'
import AccountBoard from './AccountBoard.vue'
import AccountRoute from './AccountRoute.vue'
import AccountStation from './AccountStation.vue'
import AccountStationTicket from './AccountStationTicket.vue'
import AccountTicket from './AccountTicket.vue'

// Wersje wyglądu konta do wyboru, na wymyślonych danych. Wybrana jest pierwsza, więc to ona
// otwiera się pod /konto2. Przełącznik u góry nie jest częścią żadnej z nich.
const props = defineProps<{ variant: string }>()

const VARIANTS = [
  { id: '1', name: 'Stacja', component: AccountStation },
  { id: '2', name: 'Bilet', component: AccountTicket },
  { id: '3', name: 'Tablica', component: AccountBoard },
  { id: '4', name: 'Trasa', component: AccountRoute },
  { id: '5', name: 'Stacja z biletem', component: AccountStationTicket },
]

const current = computed(() => VARIANTS.find((item) => item.id === props.variant) ?? VARIANTS[0]!)
</script>

<template>
  <div>
    <nav class="drafts" aria-label="Wersje konta">
      <span class="drafts__label">Wersje konta</span>
      <RouterLink
        v-for="item in VARIANTS"
        :key="item.id"
        class="drafts__link"
        :to="`/konto2/${item.id}`"
        :aria-current="item.id === current.id ? 'page' : undefined"
      >
        {{ item.id }}. {{ item.name }}
      </RouterLink>
    </nav>
    <component :is="current.component" :key="current.id" />
  </div>
</template>

<style scoped>
.drafts {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.4rem var(--gutter);
  background: #101421;
  color: #fff;
  overflow-x: auto;
  scrollbar-width: none;
}

.drafts__label {
  flex: none;
  margin-right: 0.5rem;
  color: rgb(255 255 255 / 0.66);
  font-size: 0.8125rem;
  font-weight: 650;
}

.drafts__link {
  flex: none;
  display: flex;
  align-items: center;
  min-height: 2.25rem;
  padding-inline: 0.8rem;
  border-radius: 999px;
  font-size: 0.875rem;
  font-weight: 650;
  text-decoration: none;
}

.drafts__link:hover {
  background: rgb(255 255 255 / 0.12);
}

.drafts__link[aria-current='page'] {
  background: #fff;
  color: #101421;
}

.drafts :focus-visible {
  outline-color: #fff;
}
</style>
