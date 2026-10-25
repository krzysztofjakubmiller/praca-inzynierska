<script setup lang="ts">
import StationMarker from '@/components/landing/StationMarker.vue'

// Czarny znak ze znakiem zapytania na początku stron z przykładami, żeby nikt nie wziął
// przykładowych danych za swoje.
defineProps<{ label: string }>()
</script>

<template>
  <div class="demo-sign">
    <StationMarker shape="question" class="demo-sign__marker" />
    <p class="demo-sign__name">{{ label }}</p>
  </div>
</template>

<style scoped>
/* Czarny znak stacji jak „Jak to działa” na wizytówce: pas wychodzi zza lewej krawędzi. */
.demo-sign {
  --marker-fill: var(--ink);
  --marker-stroke: var(--surface);

  display: flex;
  align-items: center;
  gap: 0.3em;
  width: fit-content;
  max-width: calc(100% + var(--gutter));
  margin-left: calc(-1 * var(--gutter));
  padding: 0.2em 0.62em 0.24em var(--gutter);
  border-radius: 0 999px 999px 0;
  background: var(--ink);
  color: var(--ground);
  font-size: clamp(1.75rem, 1.1rem + 3.2vw, 3rem);
}

.demo-sign__marker {
  flex: none;
  font-size: 0.6em;
}

.demo-sign__name {
  font-weight: 800;
  font-stretch: 78%;
  letter-spacing: 0.005em;
  line-height: 1.02;
  text-transform: uppercase;
}
</style>
