<script setup lang="ts">
import { computed } from 'vue'
import { mathParts } from '@/landing2/content'

/** `shown` to liczba widocznych znaków; reszta trzyma miejsce, żeby dymek nie zmieniał rozmiaru. */
const props = defineProps<{ text: string; shown?: number }>()

const pieces = computed(() => {
  const limit = props.shown ?? Infinity
  let offset = 0
  return mathParts(props.text).flatMap((part) => {
    const visible = Math.max(0, Math.min(part.text.length, limit - offset))
    offset += part.text.length
    return [
      { kind: part.kind, text: part.text.slice(0, visible), hidden: false },
      { kind: part.kind, text: part.text.slice(visible), hidden: true },
    ].filter((piece) => piece.text)
  })
})
</script>

<template>
  <template v-for="(piece, index) in pieces" :key="index">
    <component
      :is="piece.kind === 'text' ? 'span' : piece.kind"
      :class="{ 'math-rest': piece.hidden }"
      >{{ piece.text }}</component
    >
  </template>
</template>

<style scoped>
.math-rest {
  visibility: hidden;
}

sup,
sub {
  font-size: 0.72em;
  line-height: 0;
}
</style>
