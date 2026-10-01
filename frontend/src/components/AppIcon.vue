<script setup lang="ts">
defineProps<{
  name: 'menu' | 'close' | 'chevron-left' | 'chevron-right' | 'profile' | 'theme'
}>()
</script>

<template>
  <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
    <path v-if="name === 'menu'" d="M4 7H20M4 12H20M4 17H20" />
    <path v-else-if="name === 'close'" d="M6 6L18 18M18 6L6 18" />
    <path v-else-if="name === 'chevron-left'" d="M14.5 5.5L8 12L14.5 18.5" />
    <path v-else-if="name === 'chevron-right'" d="M9.5 5.5L16 12L9.5 18.5" />
    <template v-else-if="name === 'profile'">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="10" r="3" />
      <path d="M6.8 18.4C8 16.3 9.9 15.2 12 15.2S16 16.3 17.2 18.4" />
    </template>
    <template v-else>
      <circle cx="12" cy="12" r="8" />
      <path class="icon__fill" d="M12 4A8 8 0 0 1 12 20Z" />
    </template>
  </svg>
</template>

<style scoped>
.icon {
  width: 1.5rem;
  height: 1.5rem;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.icon__fill {
  fill: currentColor;
  stroke: none;
}
</style>
