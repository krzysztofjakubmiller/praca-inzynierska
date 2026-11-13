<script setup lang="ts">
defineProps<{
  name:
    | 'menu'
    | 'close'
    | 'chevron-left'
    | 'chevron-right'
    | 'profile'
    | 'theme'
    | 'image'
    | 'camera'
    | 'back'
    | 'undo'
    | 'pen'
    | 'line'
    | 'eraser'
    | 'trash'
    | 'task'
    | 'line-solid'
    | 'line-dashed'
    | 'redo'
    | 'lasso'
    | 'erase-area'
    | 'erase-stroke'
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
    <template v-else-if="name === 'image'">
      <rect x="3.5" y="5" width="17" height="14" rx="2.5" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="M4 17L9.5 12.5L13 15.5L16 13L20 16.5" />
    </template>
    <template v-else-if="name === 'camera'">
      <path
        d="M4 8.5C4 7.7 4.7 7 5.5 7H8L9.5 5H14.5L16 7H18.5C19.3 7 20 7.7 20 8.5V17.5C20 18.3 19.3 19 18.5 19H5.5C4.7 19 4 18.3 4 17.5Z"
      />
      <circle cx="12" cy="13" r="3.2" />
    </template>
    <path v-else-if="name === 'back'" d="M19 12H5M11 6L5 12L11 18" />
    <path
      v-else-if="name === 'undo'"
      d="M9 6.5L4.5 11L9 15.5M5 11H14.5C17.3 11 19.5 13.2 19.5 16V18"
    />
    <path
      v-else-if="name === 'pen'"
      d="M4.5 19.5L5.5 15L15.6 4.9C16.4 4.1 17.6 4.1 18.4 4.9L19.1 5.6C19.9 6.4 19.9 7.6 19.1 8.4L9 18.5ZM14 6.5L17.5 10"
    />
    <template v-else-if="name === 'line'">
      <path d="M6.5 17.5L17.5 6.5" />
      <circle cx="5.5" cy="18.5" r="1.5" />
      <circle cx="18.5" cy="5.5" r="1.5" />
    </template>
    <path
      v-else-if="name === 'eraser'"
      d="M8.5 19.5L3.9 14.9C3.3 14.3 3.3 13.4 3.9 12.8L12.8 3.9C13.4 3.3 14.3 3.3 14.9 3.9L20.1 9.1C20.7 9.7 20.7 10.6 20.1 11.2L11.8 19.5ZM8.4 8.3L15.7 15.6M8.5 19.5H20"
    />
    <path
      v-else-if="name === 'trash'"
      d="M4.5 7H19.5M9.5 7V4.5H14.5V7M6.5 7L7.3 19C7.4 19.6 7.8 20 8.4 20H15.6C16.2 20 16.6 19.6 16.7 19L17.5 7M10 11V16M14 11V16"
    />
    <path
      v-else-if="name === 'task'"
      d="M7.5 3.5H14L18.5 8V19C18.5 19.8 17.8 20.5 17 20.5H7.5C6.7 20.5 6 19.8 6 19V5C6 4.2 6.7 3.5 7.5 3.5ZM14 3.5V8H18.5M9 12.5H15.5M9 16H15.5"
    />
    <path v-else-if="name === 'line-solid'" d="M3.5 12H20.5" />
    <path v-else-if="name === 'line-dashed'" d="M3.5 12H6.5M10.5 12H13.5M17.5 12H20.5" />
    <path
      v-else-if="name === 'redo'"
      d="M15 6.5L19.5 11L15 15.5M19 11H9.5C6.7 11 4.5 13.2 4.5 16V18"
    />
    <template v-else-if="name === 'lasso'">
      <ellipse cx="12" cy="10" rx="8" ry="5.5" stroke-dasharray="3 2.5" />
      <path d="M8.5 15C7.5 17 8.5 20 11 19.5" />
    </template>
    <circle v-else-if="name === 'erase-area'" cx="12" cy="12" r="7" stroke-dasharray="3 2.5" />
    <path
      v-else-if="name === 'erase-stroke'"
      d="M3.5 13C5.5 8 8.5 8 10.5 11.5S14.5 15 16 11M15 15L20 20M20 15L15 20"
    />
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
