<script setup lang="ts" generic="Id extends string">
// Rząd wciskanych przycisków jak na obudowie kasownika. Wybrany zostaje wciśnięty i świeci
// mu się dioda. Kolor obudowy bierze ze zmiennej --tp-body.
defineProps<{
  keys: readonly { id: Id; lines: string[]; color: string }[]
  label: string
}>()

const selected = defineModel<Id | null>({ required: true })
</script>

<template>
  <div class="keys" role="radiogroup" :aria-label="label">
    <button
      v-for="item in keys"
      :key="item.id"
      class="keys__key"
      type="button"
      role="radio"
      :aria-checked="selected === item.id"
      :style="{ '--key': item.color }"
      @click="selected = item.id"
    >
      <span class="keys__cap">
        <span class="keys__led" aria-hidden="true" />
        <span class="keys__label">
          <span v-for="line in item.lines" :key="line">{{ line }}</span>
        </span>
      </span>
    </button>
  </div>
</template>

<style scoped>
.keys {
  --body: var(--tp-body, #14161d);
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(0, 1fr);
  gap: 0.7rem;
}

/* Przycisk siedzi we wnęce obudowy. */
.keys__key {
  position: relative;
  padding: 0 0 0.5rem;
  border: 0;
  border-radius: 0.9rem;
  background: none;
  color: inherit;
  font: inherit;
  cursor: pointer;
}

.keys__key::before {
  content: '';
  position: absolute;
  inset: 0.3rem -0.22rem -0.12rem;
  border-radius: 1.05rem;
  background: color-mix(in srgb, var(--body) 55%, #000);
  box-shadow:
    inset 0 2px 5px rgb(0 0 0 / 0.65),
    0 1px 0 rgb(255 255 255 / 0.12);
}

.keys__cap {
  --cap: var(--tp-cap, var(--key));
  --side: color-mix(in srgb, var(--cap) 58%, #000);
  position: relative;
  display: grid;
  gap: 0.35rem;
  justify-items: center;
  align-content: center;
  min-height: 4.6rem;
  padding: 0.55rem 0.3rem;
  border-radius: 0.8rem;
  background: linear-gradient(
    to bottom,
    color-mix(in srgb, var(--cap) 86%, #fff),
    var(--cap) 45%,
    color-mix(in srgb, var(--cap) 90%, #000)
  );
  color: var(--tp-cap-ink, #fff);
  box-shadow:
    0 0.45rem 0 var(--side),
    0 0.75rem 0.7rem -0.15rem rgb(0 0 0 / 0.5),
    inset 0 1px 0 rgb(255 255 255 / 0.4);
  transition:
    translate 0.09s ease-out,
    box-shadow 0.09s ease-out;
}

.keys__key:active .keys__cap,
.keys__key[aria-checked='true'] .keys__cap {
  translate: 0 0.32rem;
  box-shadow:
    0 0.13rem 0 var(--side),
    0 0.25rem 0.3rem -0.1rem rgb(0 0 0 / 0.5),
    inset 0 2px 3px rgb(0 0 0 / 0.22);
}

.keys__led {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background: rgb(0 0 0 / 0.35);
  box-shadow: inset 0 1px 1px rgb(0 0 0 / 0.5);
}

.keys__key[aria-checked='true'] .keys__led {
  background: var(--tp-led, #fff6c9);
  box-shadow: 0 0 0.45rem 0.1rem var(--tp-led, #fff6c9);
}

.keys__label {
  display: grid;
  font-size: clamp(0.78rem, 0.6rem + 0.9vw, 0.95rem);
  font-weight: 800;
  font-stretch: 80%;
  letter-spacing: 0.03em;
  line-height: 1.05;
  text-align: center;
  text-transform: uppercase;
}

/* Sam skrót, np. „E8”, jest krótki, więc może być większy. */
.keys__label span:only-child {
  font-size: 1.6em;
}

.keys__key:focus-visible {
  outline: 3px solid var(--tp-body-ink, #f4f5f7);
  outline-offset: 4px;
}
</style>
