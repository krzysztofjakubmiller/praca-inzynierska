<script setup lang="ts">
defineProps<{ down?: boolean }>()
</script>

<template>
  <svg class="arrow" :class="{ 'arrow--down': down }" viewBox="0 0 20 12" aria-hidden="true">
    <path d="M1.5 6h15M12.4 1.8 16.6 6l-4.2 4.2" />
  </svg>
</template>

<style scoped>
.arrow {
  flex: none;
  width: 1.1em;
  height: 0.66em;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.3;
  stroke-linecap: round;
  stroke-linejoin: round;
  transform: rotate(var(--turn, 0deg)) translateX(var(--nudge, 0));
  transition: transform 0.25s ease;
}

.arrow--down {
  --turn: 90deg;
}
</style>
