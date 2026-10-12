<script setup lang="ts">
import MathText from '@/components/panel/MathText.vue'

defineProps<{ choices: { label: string; text: string }[] }>()
</script>

<template>
  <table class="true-false">
    <tbody>
      <tr v-for="choice in choices" :key="choice.label">
        <td><MathText :text="choice.text" /></td>
        <td class="true-false__mark">P</td>
        <td class="true-false__mark">F</td>
      </tr>
    </tbody>
  </table>
</template>

<style scoped>
.true-false {
  width: 100%;
  border-collapse: collapse;
}

.true-false td {
  padding: 0.6rem 0.75rem;
  border: 1px solid var(--ink);
}

.true-false__mark {
  width: 2.75rem;
  font-weight: 700;
  text-align: center;
}
</style>
