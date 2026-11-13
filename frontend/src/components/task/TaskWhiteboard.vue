<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import AiTutorAvatar from '@/components/task/AiTutorAvatar.vue'
import { theme } from '@/theme'
import {
  drawStroke,
  drawStrokes,
  insideLasso,
  lineWidth,
  touches,
  type Point,
  type Stroke,
  type Tool,
} from '@/whiteboard'

// Brudnopis do zadania: palcem, rysikiem albo myszą. Pisze się w osobnym widoku na cały ekran,
// bo płótno w treści strony przejmowało przeciągnięcia i strony nie dało się przewinąć. Na
// stronie zostaje podgląd. Nic nie zapisuje; image() daje obraz tablicy dla Dyżurnego, a
// version() mówi, czy od ostatniego wysłania coś się zmieniło. Treść zadania przychodzi
// w slocie task, a rysunek z zadania w slocie figure i leży na początku tablicy, żeby dało się
// na nim pisać. chat pokazuje w rogu dymek Dyżurnego.
defineProps<{ chat?: boolean }>()
const emit = defineEmits<{ ask: [] }>()

// Kolor null to kolor tekstu z motywu: czarny w jasnym, jasny w ciemnym.
const COLORS: { name: string; color: string | null }[] = [
  { name: 'Kolor tekstu', color: null },
  { name: 'Niebieski', color: '#1d5fd1' },
  { name: 'Czerwony', color: '#d92d20' },
  { name: 'Zielony', color: '#15803d' },
]
type Mode = Tool | 'select'
const TOOLS: { tool: Mode; name: string; icon: 'pen' | 'line' | 'lasso' | 'eraser' }[] = [
  { tool: 'pen', name: 'Pisak', icon: 'pen' },
  { tool: 'line', name: 'Linia prosta', icon: 'line' },
  { tool: 'select', name: 'Zaznacz i przesuń', icon: 'lasso' },
  { tool: 'eraser', name: 'Gumka', icon: 'eraser' },
]
// Gotowe grubości w pikselach tablicy, jak w aplikacjach do notatek.
const PEN_SIZES = [
  { size: 2, name: 'Cienka linia' },
  { size: 3, name: 'Średnia linia' },
  { size: 6, name: 'Gruba linia' },
]
const ERASER_SIZES = [
  { size: 12, name: 'Mała gumka' },
  { size: 24, name: 'Średnia gumka' },
  { size: 48, name: 'Duża gumka' },
]
// Tablica ma wysokość trzech ekranów. Jeden palec zawsze pisze, więc widok przesuwają dwa
// palce albo suwaki.
const PAGES = 3
const MAX_ZOOM = 4
// Pisak przytrzymany w miejscu tyle milisekund zamienia kreskę w odcinek. Palec zawsze trochę
// drży, więc ruch do HOLD_SLACK pikseli liczy się jak stanie w miejscu.
const HOLD_TIME = 600
const HOLD_SLACK = 6
// Z takiej odległości od palca gumka do całych kresek łapie kreskę.
const STROKE_ERASER_REACH = 10
const FIGURE_WIDTH = 420

const sheet = useTemplateRef<HTMLDialogElement>('sheet')
const canvas = useTemplateRef<HTMLCanvasElement>('canvas')
const tool = ref<Mode>('pen')
// area ściera kawałek kreski pod palcem, stroke usuwa całą kreskę, której dotknie.
const eraserMode = ref<'area' | 'stroke'>('area')
const color = ref<string | null>(null)
// Osobna grubość pisaka i gumki: gumką ściera się większe kawałki niż się pisze. Linia
// prosta ma grubość pisaka.
const sizes = ref({ pen: 3, eraser: 24 })
const taskShown = ref(false)
const dashed = ref(false)
const offset = ref(0)
const offsetX = ref(0)
const zoom = ref(1)
const visibleWidth = ref(0)
const visibleHeight = ref(0)
// Rozmiar tablicy tylko rośnie. Po obróceniu tabletu ekran robi się węższy albo niższy, ale
// tablica zostaje taka, jaka była, żeby nic z niej nie zniknęło; resztę pokazują suwaki.
const boardWidth = ref(0)
const boardHeight = ref(0)
// Szerokość rysunku ustala się raz, żeby po obróceniu tabletu kreski nadal na nim leżały.
const figureWidth = ref(0)
const selected = ref(false)
const preview = ref<string | null>(null)

const maxOffset = computed(() => Math.max(0, boardHeight.value - visibleHeight.value / zoom.value))
const maxOffsetX = computed(() => Math.max(0, boardWidth.value - visibleWidth.value / zoom.value))

// Zwykła tablica, nie ref: kreski zmieniają się przy każdym ruchu palca, a Vue nie musi
// o tym wiedzieć, bo płótno rysuje się samo.
let strokes: Stroke[] = []
// Stany tablicy sprzed kolejnych zmian, do cofania, i stany cofnięte, do ponowienia. Wyczyść
// też jest zmianą, więc da się je cofnąć, gdy ktoś stuknie je przez pomyłkę.
const past: Stroke[][] = []
const future: Stroke[][] = []
let current: Stroke | null = null
let straight = false
let holdFrom: Point | null = null
let holdTimer: ReturnType<typeof setTimeout> | undefined
let erasing: { removed: boolean } | null = null
let selection = new Set<Stroke>()
let lasso: Point[] | null = null
let dragFrom: Point | null = null
// Palce na płótnie w pikselach ekranu. Drugi palec przerywa pisanie pierwszego i oba razem
// przesuwają i przybliżają tablicę.
const fingers = new Map<number, { x: number; y: number }>()
let pinch: {
  distance: number
  center: { x: number; y: number }
  zoom: number
  offsetX: number
  offset: number
} | null = null
let revision = 0
let observer: ResizeObserver | undefined

function themeColor(name: string, fallback: string): string {
  return canvas.value ? getComputedStyle(canvas.value).getPropertyValue(name).trim() : fallback
}

function selectionBox() {
  if (!selection.size) return null
  const points = [...selection].flatMap((stroke) => stroke.points)
  const PAD = 8
  return {
    left: Math.min(...points.map((point) => point.x - point.width)) - PAD,
    right: Math.max(...points.map((point) => point.x + point.width)) + PAD,
    top: Math.min(...points.map((point) => point.y - point.width)) - PAD,
    bottom: Math.max(...points.map((point) => point.y + point.width)) + PAD,
  }
}

// Kreski, a na nich obrys lassa i ramka zaznaczenia. Ramka nie trafia do obrazu dla Dyżurnego.
function paint(context: CanvasRenderingContext2D) {
  drawStrokes(context, strokes, themeColor('--ink', '#000'))
  const box = selectionBox()
  if (!lasso && !box) return
  context.save()
  context.setLineDash([6 / zoom.value, 4 / zoom.value])
  context.lineWidth = 1.5 / zoom.value
  context.strokeStyle = themeColor('--ink-soft', '#555')
  if (lasso) {
    context.beginPath()
    lasso.forEach((point) => context.lineTo(point.x, point.y))
    context.stroke()
  }
  if (box) context.strokeRect(box.left, box.top, box.right - box.left, box.bottom - box.top)
  context.restore()
}

// Płótno ma tyle pikseli, ile ekran, a rysujemy w pikselach CSS, więc linie są ostre na
// ekranach o dużej gęstości. Kreski mają współrzędne całej tablicy, a płótno pokazuje jej
// wycinek od offset, powiększony zoom razy. Zmiana rozmiaru czyści płótno, dlatego kreski
// rysują się od nowa.
function redraw() {
  const element = canvas.value
  const context = element?.getContext('2d')
  if (!element || !context) return
  visibleWidth.value = element.clientWidth
  visibleHeight.value = element.clientHeight
  boardWidth.value = Math.max(boardWidth.value, element.clientWidth)
  boardHeight.value = Math.max(boardHeight.value, element.clientHeight * PAGES)
  figureWidth.value ||= Math.min(FIGURE_WIDTH, boardWidth.value - 32)
  offset.value = Math.min(offset.value, maxOffset.value)
  offsetX.value = Math.min(offsetX.value, maxOffsetX.value)
  const scale = (window.devicePixelRatio || 1) * zoom.value
  element.width = Math.round(element.clientWidth * (window.devicePixelRatio || 1))
  element.height = Math.round(element.clientHeight * (window.devicePixelRatio || 1))
  context.setTransform(scale, 0, 0, scale, -offsetX.value * scale, -offset.value * scale)
  paint(context)
}

function repaint() {
  const element = canvas.value
  const context = element?.getContext('2d')
  if (!element || !context) return
  context.save()
  context.resetTransform()
  context.clearRect(0, 0, element.width, element.height)
  context.restore()
  paint(context)
}

function onScreen(event: PointerEvent) {
  const box = canvas.value!.getBoundingClientRect()
  return { x: event.clientX - box.left, y: event.clientY - box.top }
}

function pointOf(event: PointerEvent): Point {
  const { x, y } = onScreen(event)
  return {
    x: x / zoom.value + offsetX.value,
    y: y / zoom.value + offset.value,
    width: lineWidth(
      tool.value === 'eraser' ? sizes.value.eraser : sizes.value.pen,
      event.pointerType,
      event.pressure,
    ),
  }
}

function remember() {
  past.push(strokes)
  future.length = 0
}

function changed() {
  revision++
  repaint()
}

function select(chosen: Stroke[]) {
  selection = new Set(chosen)
  selected.value = chosen.length > 0
}

function start(event: PointerEvent) {
  if (event.pointerType === 'mouse' && event.button !== 0) return
  canvas.value?.setPointerCapture(event.pointerId)
  fingers.set(event.pointerId, onScreen(event))
  if (fingers.size === 2) {
    cancel()
    startPinch()
    return
  }
  if (fingers.size > 2 || pinch) return
  const point = pointOf(event)
  if (tool.value === 'select') return startSelect(point)
  if (tool.value === 'eraser' && eraserMode.value === 'stroke') {
    remember()
    erasing = { removed: false }
    eraseAt(point)
    return
  }
  // Linia prosta ma dwa punkty: początek i koniec, który idzie za palcem.
  current = { tool: tool.value, points: tool.value === 'line' ? [point, { ...point }] : [point] }
  if (tool.value !== 'eraser') {
    if (color.value) current.color = color.value
    if (dashed.value) current.dashed = true
  }
  straight = false
  if (tool.value === 'pen') waitForHold(point)
  remember()
  strokes = [...strokes, current]
  const context = canvas.value?.getContext('2d')
  if (context) drawStroke(context, current, themeColor('--ink', '#000'))
}

// Przeglądarka łączy szybkie ruchy w jedno zdarzenie; getCoalescedEvents oddaje wszystkie
// punkty pośrednie, żeby szybko pisana linia nie była kanciasta.
function move(event: PointerEvent) {
  if (fingers.has(event.pointerId)) fingers.set(event.pointerId, onScreen(event))
  if (pinch) {
    if (fingers.size === 2) movePinch()
    return
  }
  if (tool.value === 'select') return moveSelect(pointOf(event))
  if (erasing) return eraseAt(pointOf(event))
  if (!current) return
  if (current.tool === 'line' || straight) {
    const [start] = current.points
    current.points[1] = { ...pointOf(event), width: start!.width }
    repaint()
    return
  }
  const context = canvas.value?.getContext('2d')
  const events = event.getCoalescedEvents?.() ?? []
  for (const step of events.length ? events : [event]) {
    current.points.push(pointOf(step))
    if (context) drawStroke(context, current, themeColor('--ink', '#000'), current.points.length - 1)
  }
  const last = current.points[current.points.length - 1]!
  if (holdFrom && Math.hypot(last.x - holdFrom.x, last.y - holdFrom.y) > HOLD_SLACK) {
    waitForHold(last)
  }
}

function end(event: PointerEvent) {
  fingers.delete(event.pointerId)
  if (pinch) {
    if (!fingers.size) pinch = null
    return
  }
  clearTimeout(holdTimer)
  holdFrom = null
  if (tool.value === 'select') return endSelect()
  if (erasing) {
    if (erasing.removed) revision++
    else past.pop()
    erasing = null
    return
  }
  if (current) revision++
  current = null
}

// Drugi palec zjawił się, gdy pierwszy już coś zaczął: to początek gestu, a nie pisanie,
// więc zaczęta zmiana znika.
function cancel() {
  clearTimeout(holdTimer)
  if (current || erasing || dragFrom) strokes = past.pop() ?? strokes
  current = null
  erasing = null
  dragFrom = null
  lasso = null
  select([])
  repaint()
}

function waitForHold(point: Point) {
  holdFrom = point
  clearTimeout(holdTimer)
  holdTimer = setTimeout(straighten, HOLD_TIME)
}

function straighten() {
  if (!current || current.points.length < 2) return
  const first = current.points[0]!
  const last = current.points[current.points.length - 1]!
  if (Math.hypot(last.x - first.x, last.y - first.y) < 20) return
  current.points = [first, { ...last, width: first.width }]
  straight = true
  repaint()
}

function eraseAt(point: Point) {
  const reach = STROKE_ERASER_REACH / zoom.value
  const kept = strokes.filter(
    (stroke) => stroke.tool === 'eraser' || !touches(stroke, point.x, point.y, reach),
  )
  if (kept.length === strokes.length || !erasing) return
  strokes = kept
  erasing.removed = true
  repaint()
}

function middle() {
  const [a, b] = [...fingers.values()] as [{ x: number; y: number }, { x: number; y: number }]
  return { center: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, distance: Math.hypot(a.x - b.x, a.y - b.y) }
}

function startPinch() {
  const { center, distance } = middle()
  pinch = { distance: distance || 1, center, zoom: zoom.value, offsetX: offsetX.value, offset: offset.value }
}

// Punkt tablicy, który był między palcami na początku gestu, zostaje między nimi.
function movePinch() {
  if (!pinch) return
  const { center, distance } = middle()
  zoom.value = Math.min(MAX_ZOOM, Math.max(1, (pinch.zoom * distance) / pinch.distance))
  const x = pinch.offsetX + pinch.center.x / pinch.zoom - center.x / zoom.value
  const y = pinch.offset + pinch.center.y / pinch.zoom - center.y / zoom.value
  offsetX.value = Math.min(maxOffsetX.value, Math.max(0, x))
  offset.value = Math.min(maxOffset.value, Math.max(0, y))
}

// Lasso: obrysowane kreski zostają zaznaczone, a przeciągnięcie wewnątrz ramki je przesuwa.
// Kreski gumki też mogą być zaznaczone, żeby starte miejsca jechały razem z kreskami.
function startSelect(point: Point) {
  const box = selectionBox()
  if (box && point.x > box.left && point.x < box.right && point.y > box.top && point.y < box.bottom) {
    remember()
    // Przesuwane są kopie, bo zapamiętane stany do cofania trzymają te same kreski.
    const copies = new Map(
      [...selection].map((stroke) => [
        stroke,
        { ...stroke, points: stroke.points.map((each) => ({ ...each })) },
      ]),
    )
    strokes = strokes.map((stroke) => copies.get(stroke) ?? stroke)
    select([...copies.values()])
    dragFrom = point
    return
  }
  select([])
  lasso = [point]
  repaint()
}

function moveSelect(point: Point) {
  if (dragFrom) {
    const dx = point.x - dragFrom.x
    const dy = point.y - dragFrom.y
    for (const stroke of selection) {
      for (const each of stroke.points) {
        each.x += dx
        each.y += dy
      }
    }
    dragFrom = point
    repaint()
  } else if (lasso) {
    lasso.push(point)
    repaint()
  }
}

function endSelect() {
  if (dragFrom) {
    dragFrom = null
    revision++
  } else if (lasso) {
    const outline = lasso
    lasso = null
    select(strokes.filter((stroke) => insideLasso(stroke, outline)))
    repaint()
  }
}

function removeSelected() {
  remember()
  strokes = strokes.filter((stroke) => !selection.has(stroke))
  select([])
  changed()
}

function undo() {
  const previous = past.pop()
  if (!previous) return
  future.push(strokes)
  strokes = previous
  select([])
  changed()
}

function redo() {
  const next = future.pop()
  if (!next) return
  past.push(strokes)
  strokes = next
  select([])
  changed()
}

function clear() {
  if (!strokes.length) return
  remember()
  strokes = []
  select([])
  changed()
}

/** Numer zmiany tablicy, rośnie z każdą kreską; null, gdy tablica jest pusta. */
function version(): number | null {
  return strokes.length ? revision : null
}

// Model zmniejsza duży obraz przed odczytem, a zapis na wysokiej tablicy zajmuje jej mały
// kawałek; po zmniejszeniu cyfry się zlewały (69 czytane jako 68). Dlatego obraz zaczyna się
// przy pierwszej kresce, puste pasy między zapisami zwijają się do GAP, a całość idzie
// w skali do 2x, póki dłuższy bok nie przekroczy LONGEST.
const MARGIN = 16
const GAP = 40
const LONGEST = 1500

// Kreski w nowych miejscach: bez marginesów i pustych pasów.
function packed(): { strokes: Stroke[]; width: number; height: number } {
  const spans = strokes.map((stroke) => ({
    top: Math.min(...stroke.points.map((point) => point.y - point.width)),
    bottom: Math.max(...stroke.points.map((point) => point.y + point.width)),
  }))
  const left = Math.min(...strokes.flatMap((stroke) => stroke.points.map((p) => p.x - p.width)))
  const right = Math.max(...strokes.flatMap((stroke) => stroke.points.map((p) => p.x + p.width)))
  // Kreski od najwyższej: następna, która zaczyna się dalej niż GAP pod dotychczasowym
  // zapisem, otwiera nowy pas, a cały pas przesuwa się w górę.
  const order = strokes.map((_, index) => index).sort((a, b) => spans[a]!.top - spans[b]!.top)
  const shifts: number[] = []
  let shift = 0
  let bandBottom = -Infinity
  for (const index of order) {
    const span = spans[index]!
    if (span.top > bandBottom + GAP) {
      const placedBottom = bandBottom === -Infinity ? MARGIN - GAP : bandBottom - shift
      shift = span.top - (placedBottom + GAP)
    }
    bandBottom = Math.max(bandBottom, span.bottom)
    shifts[index] = shift
  }
  const moved = strokes.map((stroke, index) => ({
    ...stroke,
    points: stroke.points.map((point) => ({
      ...point,
      x: point.x - left + MARGIN,
      y: point.y - shifts[index]!,
    })),
  }))
  const height = Math.max(...spans.map((span, index) => span.bottom - shifts[index]!)) + MARGIN
  return { strokes: moved, width: right - left + 2 * MARGIN, height }
}

/**
 * Obraz tablicy jako PNG: kreski w kolorze tekstu są czarne, kolorowe zostają, tło białe,
 * niezależnie od motywu. Obraz obejmuje cały zapis, a nie widoczny wycinek tablicy.
 */
function image(): Promise<Blob | null> {
  if (!strokes.length) return Promise.resolve(null)
  const board = packed()
  const scale = Math.min(2, LONGEST / Math.max(board.width, board.height))
  const width = Math.ceil(board.width * scale)
  const height = Math.ceil(board.height * scale)
  // Gumka wycina piksele, więc kreski idą najpierw na przezroczystą warstwę, a dopiero ona
  // na białe tło; inaczej starte miejsca byłyby dziurami w tle.
  const ink = document.createElement('canvas')
  ink.width = width
  ink.height = height
  const inkContext = ink.getContext('2d')
  const result = document.createElement('canvas')
  result.width = width
  result.height = height
  const resultContext = result.getContext('2d')
  if (!inkContext || !resultContext) return Promise.resolve(null)
  inkContext.scale(scale, scale)
  drawStrokes(inkContext, board.strokes, '#000')
  resultContext.fillStyle = '#fff'
  resultContext.fillRect(0, 0, width, height)
  resultContext.drawImage(ink, 0, 0)
  return new Promise((resolve) => result.toBlob(resolve, 'image/png'))
}

function open() {
  sheet.value?.showModal()
  nextTick(redraw)
}

async function close() {
  sheet.value?.close()
  const blob = await image()
  if (preview.value) URL.revokeObjectURL(preview.value)
  preview.value = blob ? URL.createObjectURL(blob) : null
}

defineExpose({ image, version })

onMounted(() => {
  observer = new ResizeObserver(redraw)
  if (canvas.value) observer.observe(canvas.value)
})
onBeforeUnmount(() => {
  observer?.disconnect()
  clearTimeout(holdTimer)
})

watch([offset, offsetX, zoom], redraw)
watch(tool, () => {
  lasso = null
  select([])
  repaint()
})
// Kolor tekstu bierze się z motywu, więc po jego zmianie kreski rysują się nowym kolorem.
watch(theme, () => nextTick(redraw))
</script>

<template>
  <section class="whiteboard">
    <button type="button" class="whiteboard__open" @click="open">
      <span class="whiteboard__name">Tablica</span>
      <span class="whiteboard__hint">{{ preview ? 'Dopisz coś' : 'Brudnopis na cały ekran' }}</span>
      <AppIcon name="chevron-right" class="whiteboard__arrow" />
    </button>
    <img v-if="preview" :src="preview" alt="Podgląd tablicy" class="whiteboard__preview" />

    <dialog ref="sheet" class="whiteboard__sheet" aria-label="Tablica" @cancel.prevent="close">
      <div class="whiteboard__bars">
        <div class="whiteboard__bar" role="toolbar" aria-label="Narzędzia tablicy">
          <button
            type="button"
            class="whiteboard__icon"
            title="Gotowe"
            aria-label="Gotowe"
            @click="close"
          >
            <AppIcon name="back" />
          </button>
          <button
            type="button"
            class="whiteboard__icon"
            title="Cofnij"
            aria-label="Cofnij"
            @click="undo"
          >
            <AppIcon name="undo" />
          </button>
          <button
            type="button"
            class="whiteboard__icon"
            title="Ponów"
            aria-label="Ponów"
            @click="redo"
          >
            <AppIcon name="redo" />
          </button>
          <span class="whiteboard__divider" />
          <button
            v-for="option in TOOLS"
            :key="option.tool"
            type="button"
            class="whiteboard__icon"
            :title="option.name"
            :aria-label="option.name"
            :aria-pressed="tool === option.tool"
            @click="tool = option.tool"
          >
            <AppIcon :name="option.icon" />
          </button>
          <span class="whiteboard__divider" />
          <button
            type="button"
            class="whiteboard__icon"
            title="Wyczyść"
            aria-label="Wyczyść"
            @click="clear"
          >
            <AppIcon name="trash" />
          </button>
          <button
            type="button"
            class="whiteboard__icon"
            title="Treść zadania"
            aria-label="Treść zadania"
            :aria-expanded="taskShown"
            @click="taskShown = !taskShown"
          >
            <AppIcon name="task" />
          </button>
        </div>

        <div class="whiteboard__bar" role="group" aria-label="Ustawienia narzędzia">
          <template v-if="tool === 'pen' || tool === 'line'">
            <button
              type="button"
              class="whiteboard__icon whiteboard__icon--marked"
              title="Linia ciągła"
              aria-label="Linia ciągła"
              :aria-pressed="!dashed"
              @click="dashed = false"
            >
              <AppIcon name="line-solid" />
            </button>
            <button
              type="button"
              class="whiteboard__icon whiteboard__icon--marked"
              title="Linia przerywana"
              aria-label="Linia przerywana"
              :aria-pressed="dashed"
              @click="dashed = true"
            >
              <AppIcon name="line-dashed" />
            </button>
            <span class="whiteboard__divider" />
            <button
              v-for="option in COLORS"
              :key="option.name"
              type="button"
              class="whiteboard__icon whiteboard__icon--marked"
              :title="option.name"
              :aria-label="option.name"
              :aria-pressed="color === option.color"
              @click="color = option.color"
            >
              <span
                class="whiteboard__swatch"
                :style="{ background: option.color ?? 'var(--ink)' }"
              />
            </button>
            <span class="whiteboard__divider" />
            <button
              v-for="option in PEN_SIZES"
              :key="option.size"
              type="button"
              class="whiteboard__icon whiteboard__icon--marked"
              :title="option.name"
              :aria-label="option.name"
              :aria-pressed="sizes.pen === option.size"
              @click="sizes.pen = option.size"
            >
              <span
                class="whiteboard__dot"
                :style="{ width: `${option.size * 2 + 2}px`, height: `${option.size * 2 + 2}px` }"
              />
            </button>
          </template>
          <template v-else-if="tool === 'eraser'">
            <button
              type="button"
              class="whiteboard__icon whiteboard__icon--marked"
              title="Ściera kawałek pod palcem"
              aria-label="Ściera kawałek pod palcem"
              :aria-pressed="eraserMode === 'area'"
              @click="eraserMode = 'area'"
            >
              <AppIcon name="erase-area" />
            </button>
            <button
              type="button"
              class="whiteboard__icon whiteboard__icon--marked"
              title="Usuwa całą kreskę"
              aria-label="Usuwa całą kreskę"
              :aria-pressed="eraserMode === 'stroke'"
              @click="eraserMode = 'stroke'"
            >
              <AppIcon name="erase-stroke" />
            </button>
            <template v-if="eraserMode === 'area'">
              <span class="whiteboard__divider" />
              <button
                v-for="option in ERASER_SIZES"
                :key="option.size"
                type="button"
                class="whiteboard__icon whiteboard__icon--marked"
                :title="option.name"
                :aria-label="option.name"
                :aria-pressed="sizes.eraser === option.size"
                @click="sizes.eraser = option.size"
              >
                <span
                  class="whiteboard__dot whiteboard__dot--ring"
                  :style="{ width: `${option.size / 3 + 4}px`, height: `${option.size / 3 + 4}px` }"
                />
              </button>
            </template>
          </template>
          <button
            v-else-if="selected"
            type="button"
            class="whiteboard__action"
            @click="removeSelected"
          >
            Usuń zaznaczone
          </button>
          <p v-else class="whiteboard__tip">Obrysuj kreski palcem, potem je przeciągnij.</p>
        </div>
      </div>
      <div v-if="taskShown" class="whiteboard__task">
        <slot name="task" />
      </div>
      <div
        class="whiteboard__area"
        :style="{
          backgroundSize: `${0.5 * zoom}cm ${0.5 * zoom}cm`,
          backgroundPosition: `${-offsetX * zoom}px ${-offset * zoom}px`,
        }"
      >
        <div
          v-if="$slots.figure && figureWidth"
          class="whiteboard__figure"
          :style="{
            width: `${figureWidth}px`,
            transform: `scale(${zoom}) translate(${-offsetX}px, ${-offset}px)`,
          }"
        >
          <slot name="figure" />
        </div>
        <canvas
          ref="canvas"
          class="whiteboard__canvas"
          :class="{ 'whiteboard__canvas--eraser': tool === 'eraser' }"
          aria-label="Tablica do pisania rozwiązania"
          @pointerdown="start"
          @pointermove="move"
          @pointerup="end"
          @pointercancel="end"
        />
        <input
          v-model.number="offset"
          type="range"
          class="whiteboard__scroll"
          min="0"
          :max="maxOffset"
          aria-label="Przewiń tablicę w dół"
        />
        <input
          v-if="maxOffsetX > 0"
          v-model.number="offsetX"
          type="range"
          class="whiteboard__scroll-x"
          min="0"
          :max="maxOffsetX"
          aria-label="Przewiń tablicę w bok"
        />
        <button
          v-if="chat"
          type="button"
          class="whiteboard__chat"
          title="Zapytaj Dyżurnego"
          aria-label="Zapytaj Dyżurnego"
          @click="emit('ask')"
        >
          <AiTutorAvatar />
        </button>
      </div>
    </dialog>
  </section>
</template>

<style scoped>
.whiteboard {
  display: grid;
  border: 1px solid var(--hairline);
  border-radius: 1rem;
  background: var(--surface);
}

.whiteboard__open {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-height: 2.75rem;
  padding: 0 0.75rem 0 1rem;
  border: 0;
  background: transparent;
  color: var(--ink);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.whiteboard__name {
  font-weight: 700;
}

.whiteboard__hint {
  flex: 1;
  color: var(--ink-soft);
  font-size: 0.875rem;
}

.whiteboard__arrow {
  width: 1.25rem;
  height: 1.25rem;
  color: var(--ink-soft);
}

/* Podgląd na białym tle jak obraz dla Dyżurnego, niezależnie od motywu. */
.whiteboard__preview {
  justify-self: start;
  max-width: calc(100% - 2rem);
  max-height: 8rem;
  margin: 0 1rem 1rem;
  border-radius: 0.5rem;
  background: #fff;
}

.whiteboard__sheet {
  width: 100%;
  max-width: 100%;
  height: 100%;
  max-height: 100%;
  margin: 0;
  padding: 0;
  border: 0;
  background: var(--surface);
  color: var(--ink);
}

/* Treść zadania pokazuje się na żądanie, więc płótno bierze resztę wysokości w kolumnie. */
.whiteboard__sheet[open] {
  display: flex;
  flex-direction: column;
}

/* Pasek jak w aplikacjach do notatek: narzędzia w zaokrąglonych paskach nad tablicą,
   wybrane narzędzie i opcja zaznaczone. */
.whiteboard__bars {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.5rem;
  background: var(--ground);
  border-bottom: 1px solid var(--hairline);
}

.whiteboard__bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 0.125rem;
  min-height: 3.25rem;
  padding: 0.25rem 0.5rem;
  border-radius: 1.5rem;
  background: var(--surface);
  box-shadow: 0 1px 3px var(--hairline);
}

.whiteboard__icon {
  position: relative;
  display: grid;
  place-items: center;
  width: 2.75rem;
  height: 2.75rem;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--ink);
  cursor: pointer;
}

.whiteboard__icon:hover {
  background: var(--hairline);
}

.whiteboard__icon[aria-pressed='true'] {
  background: var(--track);
}

/* Opcje (rodzaj linii, kolor, grubość) mają pod spodem kropkę zamiast tła, jak w pasku
   narzędzi. */
.whiteboard__icon--marked[aria-pressed='true'] {
  background: transparent;
}

.whiteboard__icon--marked[aria-pressed='true']::after {
  content: '';
  position: absolute;
  bottom: 0.15rem;
  width: 0.35rem;
  height: 0.35rem;
  border-radius: 50%;
  background: var(--ink);
}

.whiteboard__swatch {
  width: 1.6rem;
  height: 1.6rem;
  border-radius: 50%;
}

.whiteboard__dot {
  border-radius: 50%;
  background: var(--ink);
}

.whiteboard__dot--ring {
  border: 2px solid var(--ink);
  background: transparent;
}

.whiteboard__divider {
  width: 1px;
  height: 1.75rem;
  margin: 0 0.25rem;
  background: var(--hairline);
}

.whiteboard__tip {
  padding: 0 0.75rem;
  color: var(--ink-soft);
  font-size: 0.875rem;
}

.whiteboard__action {
  min-height: 2.5rem;
  padding: 0 1rem;
  border: 0;
  border-radius: 1.25rem;
  background: var(--track);
  color: var(--ink);
  font: inherit;
  font-size: 0.9375rem;
  font-weight: 600;
  cursor: pointer;
}

/* Na telefonie pierwszy pasek ma dziesięć przycisków w jednym wierszu, więc przycisk dostaje
   dziesiątą część szerokości ekranu bez odstępów i dwóch kresek podziału. */
@media (max-width: 30rem) {
  .whiteboard__bars {
    gap: 0.25rem;
    padding: 0.25rem;
  }

  .whiteboard__bar {
    gap: 0;
    min-height: 0;
    padding: 0.125rem 0;
  }

  .whiteboard__icon {
    width: min(2.5rem, calc((100vw - 0.5rem - 2px) / 10));
    height: 2.5rem;
  }

  .whiteboard__divider {
    margin: 0;
  }
}

.whiteboard__task {
  max-height: 45svh;
  overflow-y: auto;
  padding: 0.75rem var(--sheet-pad);
  border-bottom: 1px solid var(--hairline);
}

/* Kratka co pół centymetra jak w zeszycie jest tłem pod płótnem, więc nie trafia do obrazu dla
   Dyżurnego; przesuwa się i rośnie razem z widokiem tablicy. */
.whiteboard__area {
  --grid: color-mix(in srgb, var(--ink) 9%, transparent);

  position: relative;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  background-image:
    linear-gradient(var(--grid) 1px, transparent 1px),
    linear-gradient(90deg, var(--grid) 1px, transparent 1px);
}

/* Rysunek leży pod płótnem, więc pisze się po nim, a gumka go nie ściera. */
.whiteboard__figure {
  position: absolute;
  top: 0;
  left: 0;
  padding: 1rem;
  transform-origin: 0 0;
  pointer-events: none;
}

/* touch-action: none, bo inaczej przeciągnięcie palcem przewijałoby widok zamiast pisać. */
.whiteboard__canvas {
  position: relative;
  display: block;
  width: 100%;
  height: 100%;
  touch-action: none;
  cursor: crosshair;
}

.whiteboard__canvas--eraser {
  cursor: cell;
}

/* Poziomy suwak pojawia się, gdy tablica jest szersza niż widok: po obróceniu tabletu albo
   po przybliżeniu. */
.whiteboard__scroll-x {
  position: absolute;
  right: 2.5rem;
  bottom: 0.25rem;
  left: 0.75rem;
  height: 2rem;
  margin: 0;
  accent-color: var(--ink);
}

/* Pionowy suwak przy prawej krawędzi: góra to początek tablicy. Kończy się nad dymkiem. */
.whiteboard__scroll {
  position: absolute;
  top: 0.75rem;
  right: 0.25rem;
  bottom: 6.5rem;
  width: 2rem;
  margin: 0;
  writing-mode: vertical-lr;
  accent-color: var(--ink);
}

/* Dymek czatu jak w komunikatorach: okrągły znak Dyżurnego w prawym dolnym rogu. */
.whiteboard__chat {
  position: absolute;
  right: 0.75rem;
  bottom: 2.5rem;
  display: grid;
  place-items: center;
  width: 3.5rem;
  height: 3.5rem;
  padding: 0;
  border: 1px solid var(--hairline);
  border-radius: 50%;
  background: var(--surface);
  box-shadow: 0 4px 14px rgb(29 31 34 / 0.18);
  font-size: 1.4rem;
  cursor: pointer;
}

.whiteboard__chat:active {
  translate: 0 1px;
}
</style>
