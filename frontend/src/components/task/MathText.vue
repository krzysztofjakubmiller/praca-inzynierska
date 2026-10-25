<script setup lang="ts">
import { computed } from 'vue'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import { splitMath } from '@/panel/math'

const props = defineProps<{ text: string }>()

// Błędny LaTeX nie przerywa strony: KaTeX pokazuje go na czerwono, co ułatwia kontrolę.
const pieces = computed(() =>
  splitMath(props.text).map((piece) =>
    piece.kind === 'text'
      ? { text: piece.text, html: null }
      : {
          text: null,
          html: katex.renderToString(piece.tex, {
            displayMode: piece.display,
            throwOnError: false,
          }),
        },
  ),
)
</script>

<template>
  <span class="math-text">
    <template v-for="(piece, index) in pieces" :key="index">
      <!-- eslint-disable-next-line vue/no-v-html -- HTML pochodzi z KaTeX, nie od użytkownika -->
      <span v-if="piece.html" v-html="piece.html" />
      <span v-else class="math-text__plain">{{ piece.text }}</span>
    </template>
  </span>
</template>

<style scoped>
.math-text__plain {
  white-space: pre-line;
}
</style>
