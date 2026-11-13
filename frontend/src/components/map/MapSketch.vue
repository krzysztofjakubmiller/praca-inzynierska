<script setup lang="ts">
import '@fontsource/caveat/latin-400.css'

// Rysunki do tematów matury, wzorowane na rysunkach z arkuszy CKE.
// Wymiary każdego są w maps/basic/sketches.ts i maps/extended/sketches.ts.
defineProps<{ drawing: string }>()
</script>

<template>
  <g class="map-sketch">
    <template v-if="drawing === 'parabola'">
      <path d="M 2 30 L 58 30 M 54 27 L 58 30 L 54 33 M 14 42 L 14 2 M 11 6 L 14 2 L 17 6" />
      <path d="M 14 32.6 Q 36 -20.6 58 32.6" />
      <path class="map-sketch__dashed" d="M 36 6 L 36 30 M 14 6 L 36 6" />
      <circle class="map-sketch__dot" cx="36" cy="6" r="1.8" />
      <circle class="map-sketch__dot" cx="20.9" cy="30" r="1.8" />
      <circle class="map-sketch__dot" cx="51.1" cy="30" r="1.8" />
      <text x="39" y="9">W</text>
    </template>

    <template v-else-if="drawing === 'ostroslup'">
      <path d="M 4 44 L 36 50 L 50 38 M 4 44 L 27 6 L 36 50 M 27 6 L 50 38" />
      <path class="map-sketch__dashed" d="M 4 44 L 18 32 L 50 38 M 27 6 L 18 32 M 27 6 L 27 41" />
      <text x="29" y="30">H</text>
    </template>

    <template v-else-if="drawing === 'trojkat-prostokatny'">
      <path d="M 4 40 L 60 40 L 60 6 Z" />
      <path d="M 53 40 L 53 33 L 60 33" />
      <path d="M 18 40 A 14 14 0 0 0 16.5 33" />
      <text x="20" y="37">α</text>
      <text x="24" y="18">c</text>
      <text x="63" y="26">a</text>
      <text x="30" y="50">b</text>
    </template>

    <template v-else-if="drawing === 'okrag-opisany'">
      <circle cx="24" cy="24" r="20" />
      <path d="M 6.7 34 L 41.3 34 L 24 4 Z" />
      <circle class="map-sketch__dot" cx="24" cy="24" r="1.4" />
      <text x="14.5" y="29">O</text>
    </template>

    <template v-else-if="drawing === 'wykres-kolowy'">
      <circle cx="22" cy="22" r="18" />
      <path class="map-sketch__fill" d="M 22 22 L 22 4 A 18 18 0 0 1 40 22 Z" />
      <text x="7" y="31">25%</text>
    </template>

    <template v-else-if="drawing === 'histogram'">
      <path d="M 4 40 L 58 40 M 6 42 L 6 2" />
      <rect class="map-sketch__fill" x="9" y="29.8" width="8" height="10.2" />
      <rect class="map-sketch__fill" x="18.5" y="21.3" width="8" height="18.7" />
      <rect class="map-sketch__fill" x="28" y="9.4" width="8" height="30.6" />
      <rect class="map-sketch__fill" x="37.5" y="17.9" width="8" height="22.1" />
      <rect class="map-sketch__fill" x="47" y="28.1" width="8" height="11.9" />
      <path class="map-sketch__dashed" d="M 6 18 L 58 18" />
      <!-- Kreska nad x narysowana osobno, bo czcionka odręczna nie ma znaku łączącego. -->
      <text x="48" y="15">x</text>
      <path d="M 48 7.5 L 52.5 7.5" />
    </template>

    <template v-else-if="drawing === 'kostki'">
      <g transform="rotate(-8 15 18)">
        <rect x="3" y="6" width="24" height="24" rx="4" />
        <circle class="map-sketch__dot" cx="9" cy="12" r="1.8" />
        <circle class="map-sketch__dot" cx="15" cy="18" r="1.8" />
        <circle class="map-sketch__dot" cx="21" cy="24" r="1.8" />
      </g>
      <g transform="rotate(9 49 16)">
        <rect x="38" y="5" width="22" height="22" rx="4" />
        <circle class="map-sketch__dot" cx="44" cy="10" r="1.8" />
        <circle class="map-sketch__dot" cx="54" cy="10" r="1.8" />
        <circle class="map-sketch__dot" cx="44" cy="22" r="1.8" />
        <circle class="map-sketch__dot" cx="54" cy="22" r="1.8" />
      </g>
    </template>

    <template v-else-if="drawing === 'ckd'">
      <text class="map-sketch__large" x="2" y="15">c.k.d.</text>
      <rect class="map-sketch__dot" x="40" y="6" width="7" height="9" />
    </template>

    <template v-else-if="drawing === 'srodek-odcinka'">
      <path d="M 2 36 L 58 36 M 54 33 L 58 36 L 54 39 M 10 42 L 10 2 M 7 6 L 10 2 L 13 6" />
      <path d="M 18 30 L 52 8" />
      <circle class="map-sketch__dot" cx="18" cy="30" r="1.8" />
      <circle class="map-sketch__dot" cx="52" cy="8" r="1.8" />
      <circle class="map-sketch__dot" cx="35" cy="19" r="1.8" />
      <text x="12" y="26">A</text>
      <text x="53" y="18">B</text>
      <text x="34" y="28">S</text>
    </template>

    <template v-else-if="drawing === 'wykres-logarytmu'">
      <path d="M 2 34 L 58 34 M 54 31 L 58 34 L 54 37 M 10 42 L 10 2 M 7 6 L 10 2 L 13 6" />
      <path
        d="M 14 44.1 L 15 41.6 L 17 37.9 L 20 34 L 24 30.3 L 29 26.9 L 35 23.9 L 42 21.2 L 49 19 L 56 17.2"
      />
      <circle class="map-sketch__dot" cx="20" cy="34" r="1.8" />
      <text x="34" y="12"
        >log<tspan class="map-sketch__index" dy="2.5">2</tspan><tspan dy="-2.5">x</tspan></text
      >
    </template>

    <template v-else-if="drawing === 'sinusoida'">
      <path d="M 2 20 L 62 20 M 58 17 L 62 20 L 58 23 M 6 38 L 6 2 M 3 6 L 6 2 L 9 6" />
      <path d="M 6 20 C 14.3 4 23.7 4 32 20 C 40.3 36 49.7 36 58 20" />
      <path d="M 32 18 L 32 22 M 58 18 L 58 22" />
      <text x="27" y="30">π</text>
      <text x="58" y="30">2π</text>
      <text x="40" y="9">sin x</text>
    </template>

    <template v-else-if="drawing === 'wartosc-bezwzgledna'">
      <path d="M 2 36 L 58 36 M 54 33 L 58 36 L 54 39 M 20 42 L 20 2 M 17 6 L 20 2 L 23 6" />
      <path d="M 12 14 L 34 36 L 56 14" />
      <circle class="map-sketch__dot" cx="34" cy="36" r="1.8" />
      <text x="38" y="11">|x - 2|</text>
    </template>

    <template v-else-if="drawing === 'wzory-vieta'">
      <text x="2" y="10">
        x<tspan class="map-sketch__index" dy="2.5">1</tspan><tspan dy="-2.5"> + x</tspan
        ><tspan class="map-sketch__index" dy="2.5">2</tspan><tspan dy="-2.5"> = -b/a</tspan>
      </text>
      <text x="2" y="23">
        x<tspan class="map-sketch__index" dy="2.5">1</tspan><tspan dy="-2.5"> · x</tspan
        ><tspan class="map-sketch__index" dy="2.5">2</tspan><tspan dy="-2.5"> = c/a</tspan>
      </text>
      <path d="M 2 48 L 60 48 M 56 45 L 60 48 L 56 51 M 6 62 L 6 30 M 3 34 L 6 30 L 9 34" />
      <path d="M 12 32 Q 34 80 56 32" />
      <circle class="map-sketch__dot" cx="21.3" cy="48" r="1.8" />
      <circle class="map-sketch__dot" cx="46.7" cy="48" r="1.8" />
      <text x="11" y="60">x<tspan class="map-sketch__index" dy="2.5">1</tspan></text>
      <text x="48" y="60">x<tspan class="map-sketch__index" dy="2.5">2</tspan></text>
    </template>

    <template v-else-if="drawing === 'wykres-wykladniczej'">
      <path d="M 2 34 L 58 34 M 54 31 L 58 34 L 54 37 M 28 42 L 28 2 M 25 6 L 28 2 L 31 6" />
      <path d="M 4 33.25 L 12 32.5 L 20 31 L 28 28 L 36 22 L 40 17 L 44 10 L 47.2 2.3" />
      <circle class="map-sketch__dot" cx="28" cy="28" r="1.8" />
      <text x="21" y="27">1</text>
      <text x="48" y="22">y = 2<tspan class="map-sketch__index" dy="-4">x</tspan></text>
    </template>

    <template v-else-if="drawing === 'logarytm-w-wykladniku'">
      <text class="map-sketch__large" x="2" y="20">
        a<tspan class="map-sketch__index" dy="-7">log</tspan
        ><tspan class="map-sketch__small" dy="2">a</tspan
        ><tspan class="map-sketch__index" dy="-2">b</tspan><tspan dy="7"> = b</tspan>
      </text>
    </template>

    <template v-else-if="drawing === 'nierownosc'">
      <text class="map-sketch__large" x="2" y="16">
        a<tspan class="map-sketch__index" dy="-4">2</tspan><tspan dy="4">+ b</tspan
        ><tspan class="map-sketch__index" dy="-4">2</tspan>
      </text>
      <!-- Znak ≥ narysowany osobno, bo czcionka odręczna go nie ma. -->
      <path d="M 38 7 L 43 9.5 L 38 12 M 38 14.5 L 43 14.5" />
      <text class="map-sketch__large" x="46" y="16">2ab</text>
    </template>

    <template v-else-if="drawing === 'symbol-newtona'">
      <path d="M 8 4 Q 2 16 8 28 M 18 4 Q 24 16 18 28" />
      <text x="10.5" y="14">n</text>
      <text x="10.5" y="26">k</text>
      <text x="25" y="19">=</text>
      <text x="38" y="12">n!</text>
      <path d="M 31 16 L 58 16" />
      <text x="31" y="27">k!(n-k)!</text>
    </template>

    <template v-else-if="drawing === 'prawdopodobienstwo-warunkowe'">
      <text x="2" y="18">P(A|B) =</text>
      <text x="40" y="11">P(A<tspan dx="8">B)</tspan></text>
      <!-- Znak ∩ narysowany osobno, bo czcionka odręczna go nie ma. -->
      <path d="M 55.5 11 L 55.5 7.5 Q 58.5 2 61.5 7.5 L 61.5 11" />
      <path d="M 39 14 L 73 14" />
      <text x="46.7" y="26">P(B)</text>
    </template>

    <template v-else-if="drawing === 'wyrazy-ciagu'">
      <path d="M 2 38 L 58 38 M 54 35 L 58 38 L 54 41 M 6 42 L 6 2 M 3 6 L 6 2 L 9 6" />
      <circle class="map-sketch__dot" cx="12" cy="34" r="1.8" />
      <circle class="map-sketch__dot" cx="20" cy="32" r="1.8" />
      <circle class="map-sketch__dot" cx="28" cy="29" r="1.8" />
      <circle class="map-sketch__dot" cx="36" cy="24.5" r="1.8" />
      <circle class="map-sketch__dot" cx="44" cy="17.75" r="1.8" />
      <circle class="map-sketch__dot" cx="52" cy="7.6" r="1.8" />
      <text x="11" y="12">a<tspan class="map-sketch__index" dy="2.5">n</tspan></text>
    </template>

    <template v-else-if="drawing === 'suma-szeregu'">
      <rect x="2" y="2" width="40" height="40" />
      <path d="M 22 2 L 22 42 M 22 22 L 42 22 M 32 22 L 32 42 M 32 32 L 42 32 M 37 32 L 37 42" />
      <rect class="map-sketch__fill" x="2" y="2" width="20" height="40" />
      <text x="9" y="25">½</text>
      <text x="29" y="15">¼</text>
    </template>

    <template v-else-if="drawing === 'granica'">
      <text class="map-sketch__large" x="2" y="18">lim</text>
      <text x="2" y="29">x</text>
      <path d="M 8 26 L 15 26 M 12.5 23.5 L 15 26 L 12.5 28.5" />
      <!-- Znak ∞ narysowany osobno, bo czcionka odręczna go nie ma. -->
      <path
        d="M 17 26 C 18.5 23.5 21 23.5 22 26 C 23 28.5 25.5 28.5 27 26 C 25.5 23.5 23 23.5 22 26 C 21 28.5 18.5 28.5 17 26"
      />
      <text x="28" y="11">1</text>
      <path d="M 25 14 L 33 14" />
      <text x="27.5" y="23">x</text>
      <text x="37" y="17">= 0</text>
    </template>

    <template v-else-if="drawing === 'styczna-do-wykresu'">
      <path d="M 2 40 L 60 40 M 56 37 L 60 40 L 56 43 M 6 42 L 6 2 M 3 6 L 6 2 L 9 6" />
      <path d="M 8 38 Q 30 -6 52 38" />
      <path d="M 8 30 L 36 7.7" />
      <circle class="map-sketch__dot" cx="21.2" cy="19.5" r="1.8" />
      <text x="40" y="10">
        f'(x<tspan class="map-sketch__index" dy="2.5">0</tspan><tspan dy="-2.5">)</tspan>
      </text>
    </template>

    <template v-else-if="drawing === 'karton'">
      <path
        d="M 10 2 L 46 2 L 46 10 L 54 10 L 54 34 L 46 34 L 46 42 L 10 42 L 10 34 L 2 34 L 2 10 L 10 10 Z"
      />
      <path
        class="map-sketch__dashed"
        d="M 10 10 L 46 10 L 46 34 L 10 34 Z M 2 2 L 10 2 L 10 10 M 46 2 L 54 2 L 54 10 M 2 42 L 10 42 L 10 34 M 46 42 L 54 42 L 54 34"
      />
      <text x="12" y="9">x</text>
      <text x="3" y="18">x</text>
    </template>

    <template v-else-if="drawing === 'styczna-do-okregu'">
      <path d="M 2 42 L 58 42 M 54 39 L 58 42 L 54 45 M 6 46 L 6 2 M 3 6 L 6 2 L 9 6" />
      <circle cx="26" cy="24" r="13" />
      <path class="map-sketch__dashed" d="M 26 24 L 35.2 14.8" />
      <path d="M 21 0.6 L 55.2 34.8" />
      <path d="M 32.4 17.6 L 35.2 20.4 L 38 17.6" />
      <circle class="map-sketch__dot" cx="35.2" cy="14.8" r="1.8" />
    </template>

    <template v-else-if="drawing === 'czworokat-wpisany'">
      <circle cx="24" cy="24" r="20" />
      <path d="M 5.2 30.8 L 34 41.3 L 42.8 17.2 L 17.2 5.2 Z" />
      <text x="9" y="31">α</text>
      <text x="32" y="25">β</text>
    </template>

    <template v-else-if="drawing === 'przekroj-szescianu'">
      <path class="map-sketch__fill" d="M 4 16 L 32 44 L 46 4 Z" />
      <path
        d="M 4 44 L 32 44 L 32 16 L 4 16 Z M 4 16 L 18 4 L 46 4 L 32 16 M 32 44 L 46 32 L 46 4"
      />
      <path class="map-sketch__dashed" d="M 4 44 L 18 32 L 46 32 M 18 32 L 18 4" />
      <path d="M 4 16 L 32 44 L 46 4" />
    </template>
  </g>
</template>

<style scoped>
.map-sketch {
  opacity: 0.9;
}

.map-sketch path,
.map-sketch circle,
.map-sketch rect {
  fill: none;
  stroke: var(--sketch-color);
  stroke-width: 2.1;
  stroke-linecap: round;
  stroke-linejoin: round;
  /* Kreska ma tę samą grubość niezależnie od powiększenia rysunku. */
  vector-effect: non-scaling-stroke;
}

.map-sketch text {
  fill: var(--sketch-color);
  font:
    11px Caveat,
    cursive;
}

.map-sketch .map-sketch__large {
  font-size: 16px;
}

.map-sketch__index {
  font-size: 8px;
}

.map-sketch__small {
  font-size: 6px;
}

.map-sketch .map-sketch__dot {
  fill: var(--sketch-color);
  stroke: none;
}

.map-sketch .map-sketch__fill {
  fill: var(--sketch-color);
  fill-opacity: 0.18;
}

.map-sketch .map-sketch__dashed {
  stroke-dasharray: 3 3;
  stroke-width: 1.5;
}
</style>
