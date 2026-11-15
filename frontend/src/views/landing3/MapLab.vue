<script setup lang="ts">
import { MAP_TEXT, MAP_TITLE } from '@/landing3/content'
import LabShell from '@/components/landing3/LabShell.vue'
import MapTeaser from '@/components/landing3/MapTeaser.vue'
import LineStrips from '@/components/landing3/maps/LineStrips.vue'
import PhoneMap from '@/components/landing3/maps/PhoneMap.vue'
import ProgressMap from '@/components/landing3/maps/ProgressMap.vue'
import TrainMap from '@/components/landing3/maps/TrainMap.vue'

// Jeden z pięciu sposobów pokazania mapy tematów na wizytówce.
defineProps<{ variant: string }>()
</script>

<template>
  <LabShell kind="mapa" :variant="variant">
    <section v-if="variant === '1'" class="lines" aria-labelledby="lines-title">
      <div class="lines__head">
        <h2 id="lines-title" class="lines__title">{{ MAP_TITLE }}</h2>
        <p class="lines__text">{{ MAP_TEXT }}</p>
      </div>
      <MapTeaser />
    </section>
    <TrainMap v-else-if="variant === '2'" />
    <ProgressMap v-else-if="variant === '3'" />
    <PhoneMap v-else-if="variant === '4'" />
    <LineStrips v-else />
  </LabShell>
</template>

<style scoped>
/* Wariant pierwszy stoi na granatowym polu, tak jak na stronie A. */
.lines {
  --ground: #16224f;
  --ink: #fff;
  --ink-soft: rgb(255 255 255 / 0.84);
  --hairline: rgb(255 255 255 / 0.28);
  --line-1: #ffd35c;
  --line-2: #7fb0ff;
  --line-3: #4fd58d;
  --line-4: #ff7a69;
  --mm-fill: #16224f;
  --mm-back: #fff;
  --mm-back-opacity: 0.3;
  --teaser-edge: rgb(255 255 255 / 0.4);
  --teaser-on: #fff;
  --teaser-on-ink: #16224f;
  --teaser-stop: rgb(255 255 255 / 0.12);
  display: grid;
  gap: clamp(1.5rem, 1.2rem + 1.6vw, 2.5rem);
  align-content: center;
  padding: clamp(2.5rem, 2rem + 3vw, 5rem) max(var(--gutter), calc((100vw - 70rem) / 2));
  background: var(--ground);
  color: var(--ink);
}

.lines :focus-visible {
  outline-color: #fff;
}

.lines__head {
  display: grid;
  gap: 0.8rem;
}

.lines__title {
  max-width: 18ch;
  font-size: clamp(2rem, 1.5rem + 2.4vw, 3.4rem);
  font-weight: 800;
  font-stretch: 88%;
  letter-spacing: -0.028em;
  line-height: 1;
  text-wrap: balance;
}

.lines__text {
  max-width: 46ch;
  font-size: clamp(1.0625rem, 1rem + 0.4vw, 1.25rem);
  line-height: 1.45;
}
</style>
