<script setup lang="ts">
import { BASIC_MAP } from '@/maps'
import { stationPath } from '@/maps/shapes'
import { plural } from '@/utils/plural'

// Mapa rozłożona na cztery osobne linie, jak schematy nad drzwiami wagonu. Każda linia czyta się
// osobno, więc widać cztery krótkie trasy zamiast jednej dużej sieci.
const stations = BASIC_MAP.graph.stations
const lines = BASIC_MAP.graph.lines.map((line) => ({
  ...line,
  stops: line.stations.map((id) => ({
    id,
    name: stations[id].shortName ?? stations[id].name,
    shape: stationPath(stations[id].difficulty, { x: 0, y: 0 }, 7),
    // Kolory innych linii, na które można się tu przesiąść.
    transfers: BASIC_MAP.graph.lines
      .filter((other) => other.id !== line.id && other.stations.includes(id))
      .map((other) => other.color),
  })),
}))
const longest = Math.max(...lines.map((line) => line.stops.length))
</script>

<template>
  <section class="strips" aria-labelledby="strips-title">
    <div class="strips__head">
      <h2 id="strips-title" class="strips__title">Cztery linie do matury</h2>
      <p class="strips__text">
        Każdy dział matematyki to osobna linia. Kropka w innym kolorze oznacza przesiadkę.
      </p>
    </div>

    <ol class="strips__list" :style="{ '--longest': longest }">
      <li
        v-for="line in lines"
        :key="line.id"
        class="strip"
        :style="{ '--line': `var(--line-${line.color})`, '--stops': line.stops.length }"
      >
        <h3 class="strip__name">
          {{ line.name }}
          <span>
            {{ line.stops.length }}
            {{ plural(line.stops.length, ['stacja', 'stacje', 'stacji']) }}
          </span>
        </h3>
        <ol class="strip__stops">
          <li v-for="stop in line.stops" :key="stop.id" class="strip__stop">
            <span class="strip__label">{{ stop.name }}</span>
            <svg class="strip__shape" viewBox="-11 -11 22 22" aria-hidden="true">
              <path :d="stop.shape" />
            </svg>
            <span
              v-for="color in stop.transfers"
              :key="color"
              class="strip__transfer"
              :style="{ background: `var(--line-${color})` }"
              aria-hidden="true"
            />
          </li>
        </ol>
      </li>
    </ol>
  </section>
</template>

<style scoped>
.strips {
  --line-1: #a86f00;
  --line-2: #2a66d6;
  --line-3: #168344;
  --line-4: #d42f23;
  display: grid;
  gap: clamp(1.5rem, 1rem + 2vw, 2.5rem);
  align-content: center;
  padding: clamp(2.5rem, 2rem + 3vw, 5rem) max(var(--gutter), calc((100vw - 70rem) / 2));
  background: #fff;
}

.strips__head {
  display: grid;
  gap: 0.8rem;
}

.strips__title {
  max-width: 18ch;
  font-size: clamp(2rem, 1.5rem + 2.4vw, 3.4rem);
  font-weight: 800;
  font-stretch: 88%;
  letter-spacing: -0.028em;
  line-height: 1;
}

.strips__text {
  max-width: 46ch;
  color: var(--ink-soft);
  font-size: clamp(1.0625rem, 1rem + 0.4vw, 1.25rem);
  line-height: 1.45;
}

.strips__list {
  /* Krok między stacjami jest wspólny dla wszystkich linii, więc krótsza linia jest krótsza
     także na rysunku. Z prawej zostaje miejsce na pochyloną nazwę ostatniej stacji. */
  --step: calc((100% - 5.5rem) / (var(--longest) - 1));
  display: grid;
  gap: 1.5rem;
  padding: 0;
  list-style: none;
}

.strip {
  display: grid;
  gap: 0.25rem;
}

.strip__name {
  display: flex;
  align-items: baseline;
  gap: 0.75rem;
  color: var(--line);
  font-size: clamp(1.2rem, 1.1rem + 0.6vw, 1.5rem);
  font-weight: 800;
  font-stretch: 82%;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.strip__name span {
  color: var(--ink-soft);
  font-size: 0.875rem;
  font-stretch: 100%;
  font-weight: 600;
  letter-spacing: 0;
  text-transform: none;
}

.strip__stops {
  position: relative;
  display: flex;
  height: 9.8rem;
  padding: 0;
  list-style: none;
}

/* Tor linii, od pierwszej do ostatniej stacji. */
.strip__stops::before {
  content: '';
  position: absolute;
  bottom: 0.55rem;
  left: 0.55rem;
  width: calc(var(--step) * (var(--stops) - 1));
  height: 0.45rem;
  border-radius: 999px;
  background: var(--line);
}

.strip__stop {
  position: relative;
  flex: none;
  width: var(--step);
}

.strip__shape {
  position: absolute;
  bottom: 0.1rem;
  left: 0;
  width: 1.35rem;
  height: 1.35rem;
  fill: #fff;
  stroke: var(--line);
  stroke-width: 3.2;
  stroke-linejoin: round;
  overflow: visible;
}

.strip__label {
  position: absolute;
  bottom: 1.75rem;
  left: 0.75rem;
  font-size: clamp(0.72rem, 0.62rem + 0.45vw, 0.875rem);
  font-weight: 650;
  line-height: 1;
  white-space: nowrap;
  transform: rotate(-52deg);
  transform-origin: 0 100%;
}

.strip__transfer {
  position: absolute;
  bottom: 0.52rem;
  left: 0.42rem;
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
}
</style>
