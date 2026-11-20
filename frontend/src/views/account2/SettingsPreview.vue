<script setup lang="ts">
import { EMAIL, EXAM, LIMIT, TARGET } from './demo'

// Same ustawienia wyglądają w każdej wersji tak samo; tu jest tylko ich spis z przykładowymi
// wartościami, żeby zakładka nie była pusta.
const ROWS = [
  { name: 'Egzamin', value: EXAM.name },
  { name: 'Cel na maturze', value: `${TARGET}%` },
  { name: 'Powtórki dziennie', value: `najwyżej ${LIMIT}` },
  { name: 'Motyw', value: 'Jasny' },
  { name: 'Adres e-mail', value: EMAIL },
  { name: 'Hasło', value: 'ustawione' },
]
</script>

<template>
  <section class="settings-preview" aria-labelledby="settings-preview-title">
    <h2 id="settings-preview-title" class="settings-preview__title">Ustawienia</h2>
    <dl class="settings-preview__rows">
      <div v-for="row in ROWS" :key="row.name" class="settings-preview__row">
        <dt>{{ row.name }}</dt>
        <dd>{{ row.value }}</dd>
      </div>
    </dl>
    <p class="settings-preview__note">
      Zmiana ustawień działa tak samo jak teraz w koncie, ta zakładka pokazuje tylko ich spis.
    </p>
  </section>
</template>

<style scoped>
.settings-preview {
  display: grid;
  gap: 1rem;
}

.settings-preview__title {
  font-size: 1.25rem;
  font-weight: 750;
}

.settings-preview__rows {
  display: grid;
  margin: 0;
}

.settings-preview__row {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 0.25rem 1rem;
  padding-block: 0.85rem;
  border-top: 1px solid var(--hairline);
}

.settings-preview__row dt {
  color: var(--ink-soft);
}

.settings-preview__row dd {
  margin: 0;
  font-weight: 650;
  overflow-wrap: anywhere;
}

.settings-preview__note {
  color: var(--ink-soft);
  font-size: 0.875rem;
}
</style>
