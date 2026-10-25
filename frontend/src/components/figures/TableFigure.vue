<script setup lang="ts">
import MathText from '@/components/task/MathText.vue'
import type { TableCell, TableFigure } from '@/figures'

defineProps<{ figure: TableFigure }>()

const text = (cell: TableCell) => (typeof cell === 'string' ? cell : cell.text)
const colspan = (cell: TableCell) => (typeof cell === 'string' ? 1 : (cell.colspan ?? 1))
</script>

<template>
  <div class="table-figure">
    <table>
      <tbody>
        <tr v-for="(row, rowIndex) in figure.rows" :key="rowIndex">
          <component
            :is="rowIndex < (figure.header_rows ?? 0) ? 'th' : 'td'"
            v-for="(cell, cellIndex) in row"
            :key="cellIndex"
            :colspan="colspan(cell)"
          >
            <MathText :text="text(cell)" />
          </component>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
/* Szeroka tabela przewija się w poziomie zamiast rozpychać stronę na telefonie. */
.table-figure {
  overflow-x: auto;
}

table {
  margin-inline: auto;
  border-collapse: collapse;
  color: var(--ink);
  font-family: KaTeX_Main, 'Times New Roman', serif;
  font-size: 1.1rem;
}

th,
td {
  min-width: 3rem;
  padding: 0.55rem 0.9rem;
  border: 1px solid var(--ink);
  text-align: center;
}

th {
  font-weight: 400;
}
</style>
