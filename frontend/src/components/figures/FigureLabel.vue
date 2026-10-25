<script setup lang="ts">
import MathText from '@/components/task/MathText.vue'

defineProps<{ at: [number, number]; text: string }>()

// SVG nie składa wzorów, więc napis to HTML z KaTeX wstawiony w foreignObject. Pole jest
// szersze niż napis, a sam napis jest wyśrodkowany na punkcie at.
const WIDTH = 240
const HEIGHT = 40
</script>

<template>
  <foreignObject :x="at[0] - WIDTH / 2" :y="at[1] - HEIGHT / 2" :width="WIDTH" :height="HEIGHT">
    <div class="figure-label"><MathText :text="text" /></div>
  </foreignObject>
</template>

<style scoped>
.figure-label {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--ink);
  font-family: KaTeX_Main, 'Times New Roman', serif;
  font-size: 16px;
  line-height: 1;
  white-space: nowrap;
}
</style>
