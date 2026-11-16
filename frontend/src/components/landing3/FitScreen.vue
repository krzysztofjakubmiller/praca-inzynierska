<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue'

// Zmniejsza zawartość tak, żeby cała mieściła się na wysokość w oknie. Kasownik z biletem
// ma być widać naraz także na niskim ekranie. Miejsce pod stały nagłówek strona podaje
// w zmiennej --fit-top.
const MIN_SCALE = 0.5
// Luz w pikselach między dołem zawartości a dołem okna.
const MARGIN = 12

const outer = useTemplateRef<HTMLElement>('outer')
const inner = useTemplateRef<HTMLElement>('inner')
const probe = useTemplateRef<HTMLElement>('probe')
const scale = ref(1)
const height = ref<number>()
// Bilet bywa o parę pikseli wyższy od pustej szczeliny. Skala trzyma się największej wysokości
// widzianej przy danej szerokości, żeby nie drgnęła w chwili wydruku.
let tallest = 0
let measuredWidth = 0
let observer: ResizeObserver | undefined

function headerRoom(): number {
  return parseFloat(getComputedStyle(outer.value!).scrollMarginTop) || 0
}

function fit() {
  if (!inner.value || !probe.value) return
  if (inner.value.offsetWidth !== measuredWidth) {
    measuredWidth = inner.value.offsetWidth
    tallest = 0
  }
  tallest = Math.max(tallest, inner.value.offsetHeight)
  const room = probe.value.offsetHeight - headerRoom() - MARGIN
  const next = Math.max(MIN_SCALE, Math.min(1, room / tallest))
  scale.value = next
  height.value = next < 1 ? tallest * next : undefined
}

const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Przewija stronę tak, żeby całą zawartość było widać, jeśli część jest poza oknem.
 * Z `always` zawartość staje u góry okna także wtedy, gdy już się mieści.
 */
function show(always = false) {
  if (!outer.value) return
  const box = outer.value.getBoundingClientRect()
  const fits = box.top >= headerRoom() - 1 && box.bottom <= window.innerHeight
  if (fits && !always) return
  outer.value.scrollIntoView({ block: 'start', behavior: calm ? 'auto' : 'smooth' })
}

// Przejazd do kasownika trwa tyle niezależnie od odległości.
const GLIDE_MS = 600
let glideFrame = 0

function centerTop(): number {
  const box = outer.value!.getBoundingClientRect()
  return window.scrollY + box.top - (window.innerHeight - box.height) / 2
}

function stopGlide() {
  cancelAnimationFrame(glideFrame)
  window.removeEventListener('wheel', stopGlide)
  window.removeEventListener('touchstart', stopGlide)
}

// Łagodny start i hamowanie.
function ease(progress: number): number {
  return progress < 0.5 ? 4 * progress ** 3 : 1 - (-2 * progress + 2) ** 3 / 2
}

/**
 * Szybki, płynny przejazd strony, aż zawartość stanie na środku wysokości okna. Płynne
 * przewijanie przeglądarki liczy cel raz, a sekcje po drodze dostają prawdziwą wysokość
 * dopiero na ekranie. Tutaj cel jest liczony w każdej klatce, więc zmiana wysokości
 * wchodzi w ruch zamiast skoku. Ruch kółkiem albo palcem przerywa przejazd.
 */
function center() {
  if (!outer.value) return
  stopGlide()
  if (calm) {
    window.scrollTo({ top: centerTop(), behavior: 'instant' })
    return
  }
  const from = window.scrollY
  const started = performance.now()
  const step = (now: number) => {
    const progress = Math.min(1, (now - started) / GLIDE_MS)
    // 'instant' wprost, bo 'auto' wziąłby płynne przewijanie ze stylu strony.
    window.scrollTo({ top: from + (centerTop() - from) * ease(progress), behavior: 'instant' })
    if (progress < 1) glideFrame = requestAnimationFrame(step)
    else stopGlide()
  }
  window.addEventListener('wheel', stopGlide, { passive: true })
  window.addEventListener('touchstart', stopGlide, { passive: true })
  glideFrame = requestAnimationFrame(step)
}

onMounted(() => {
  observer = new ResizeObserver(fit)
  observer.observe(inner.value!)
  observer.observe(probe.value!)
})

onBeforeUnmount(() => {
  observer?.disconnect()
  stopGlide()
})

defineExpose({ show, center })
</script>

<template>
  <div ref="outer" class="fit" :style="{ height: height ? `${height}px` : undefined }">
    <!-- Wysokość okna bez paska adresu, który na telefonie chowa się przy przewijaniu. -->
    <div ref="probe" class="fit__probe" />
    <div
      ref="inner"
      class="fit__inner"
      :style="{ transform: scale < 1 ? `scale(${scale})` : undefined }"
    >
      <slot />
    </div>
  </div>
</template>

<style scoped>
.fit {
  position: relative;
  scroll-margin-top: var(--fit-top, 0.75rem);
}

.fit__probe {
  position: absolute;
  top: 0;
  left: 0;
  width: 0;
  height: 100svh;
  visibility: hidden;
  pointer-events: none;
}

.fit__inner {
  transform-origin: 50% 0;
}
</style>
