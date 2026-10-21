<script setup lang="ts">
import { computed } from 'vue'
import { EXAMS, type Exam } from '@/config/exams'
import { daysBetween, longDate, plural, shortDate, type Sheet } from '@/stats/stats'

const props = defineProps<{
  sheets: readonly Sheet[]
  today: string
  examDate: string
  examId: Exam['id']
  width: number
}>()

const exam = computed(() => EXAMS.find((item) => item.id === props.examId)!)
// Trasa zaczyna się z początkiem roku szkolnego, który kończy się tą maturą.
const start = computed(() => `${Number(props.examDate.slice(0, 4)) - 1}-09-01`)
const length = computed(() => daysBetween(start.value, props.examDate))
const left = computed(() => Math.max(0, daysBetween(props.today, props.examDate)))
const leftText = computed(() => `za ${left.value} ${plural(left.value, 'dzień', 'dni', 'dni')}`)
const share = (day: string) =>
  Math.min(1, Math.max(0, daysBetween(start.value, day) / length.value))

// Na wąskiej karcie trasa biegnie w dół jak linia w widoku listy tematów, na szerokiej w prawo.
const across = computed(() => props.width >= 560)

interface Stop {
  key: string
  kind: 'done' | 'planned' | 'today'
  label: string
  detail: string
  share: number
}

const stops = computed<Stop[]>(() => {
  const list: Stop[] = props.sheets.map((sheet) => ({
    key: sheet.date,
    kind: sheet.percent === undefined ? 'planned' : 'done',
    label: across.value ? sheet.short : sheet.name,
    detail: shortDate(sheet.date) + (sheet.percent === undefined ? '' : ` · ${sheet.percent}%`),
    share: share(sheet.date),
  }))
  list.push({ key: 'today', kind: 'today', label: 'dziś', detail: '', share: share(props.today) })
  return list.sort((a, b) => a.share - b.share)
})

// Poziomo podpisy stoją na zmianę nad linią i pod nią, żeby sąsiednie stacje ich nie zasłaniały.
const ACROSS_LINE = 62
const acrossX = (value: number) => 24 + value * (props.width - 60)
const months = computed(() => {
  const names = ['wrz', 'paź', 'lis', 'gru', 'sty', 'lut', 'mar', 'kwi', 'maj']
  const year = Number(start.value.slice(0, 4))
  return names.map((name, index) => {
    const month = ((8 + index) % 12) + 1
    const day = `${month >= 9 ? year : year + 1}-${String(month).padStart(2, '0')}-01`
    return { name, x: acrossX(share(day)) }
  })
})

// Pionowo: odstępy według dat, ale co najmniej 30 px, żeby podpisy się nie zderzały.
const DOWN_TOP = 22
const downStops = computed(() => {
  let previous = DOWN_TOP
  return stops.value.map((stop) => {
    const y = Math.max(DOWN_TOP + 34 + stop.share * 420, previous + 30)
    previous = y
    return { ...stop, y }
  })
})
const downEnd = computed(() => (downStops.value[downStops.value.length - 1]?.y ?? DOWN_TOP) + 48)
const downToday = computed(() => downStops.value.find((stop) => stop.kind === 'today')!.y)

const summary = computed(
  () =>
    `Trasa od 1 września do matury ${longDate(props.examDate)}, ${leftText.value}. ` +
    props.sheets
      .map(
        (sheet) =>
          `${sheet.name} ${shortDate(sheet.date)}` +
          (sheet.percent === undefined ? ', zaplanowany' : `, ${sheet.percent}%`),
      )
      .join('. ') +
    '.',
)

function examShape(x: number, y: number, size: number): string {
  if (exam.value.solid === 'sphere') {
    return `M${x - size} ${y}a${size} ${size} 0 1 0 ${2 * size} 0a${size} ${size} 0 1 0 ${-2 * size} 0`
  }
  if (exam.value.solid === 'cube') {
    const half = size * 0.85
    return `M${x - half} ${y - half}h${2 * half}v${2 * half}h${-2 * half}z`
  }
  return `M${x} ${y - size * 1.1}L${x + size * 1.05} ${y + size * 0.75}L${x - size * 1.05} ${y + size * 0.75}z`
}
</script>

<template>
  <svg v-if="across" class="chart" :viewBox="`0 0 ${width} 124`" role="img" :aria-label="summary">
    <line
      class="chart__track"
      :x1="acrossX(0)"
      :x2="acrossX(1)"
      :y1="ACROSS_LINE"
      :y2="ACROSS_LINE"
      stroke-width="8"
    />
    <line
      class="chart__ink-line"
      :x1="acrossX(0)"
      :x2="acrossX(share(today))"
      :y1="ACROSS_LINE"
      :y2="ACROSS_LINE"
      stroke-width="8"
    />
    <g v-for="month in months" :key="month.name">
      <line class="chart__grid" :x1="month.x" :x2="month.x" y1="102" y2="108" />
      <text :x="month.x + 3" y="120">{{ month.name }}</text>
    </g>
    <g v-for="(stop, index) in stops" :key="stop.key">
      <circle
        v-if="stop.kind === 'today'"
        class="chart__today"
        :cx="acrossX(stop.share)"
        :cy="ACROSS_LINE"
        r="10"
      />
      <circle
        v-else
        class="chart__station"
        :class="{ 'chart__station--planned': stop.kind === 'planned' }"
        :cx="acrossX(stop.share)"
        :cy="ACROSS_LINE"
        r="6.5"
      />
      <text
        :class="stop.kind === 'planned' ? '' : 'chart__strong'"
        :x="acrossX(stop.share)"
        :y="index % 2 === 0 ? ACROSS_LINE - 22 : ACROSS_LINE + 32"
        text-anchor="middle"
      >
        {{ stop.label }}
      </text>
    </g>
    <path
      class="route__exam"
      :d="examShape(acrossX(1), ACROSS_LINE, 10)"
      :style="{ fill: `var(--exam-${examId})` }"
    />
    <text class="chart__strong" :x="width" :y="ACROSS_LINE - 22" text-anchor="end">Matura</text>
    <text :x="width" :y="ACROSS_LINE + 32" text-anchor="end">{{ leftText }}</text>
  </svg>

  <svg
    v-else
    class="chart"
    :viewBox="`0 0 ${width} ${downEnd + 8}`"
    role="img"
    :aria-label="summary"
  >
    <line class="chart__track" x1="12" x2="12" :y1="DOWN_TOP" :y2="downEnd - 14" stroke-width="8" />
    <line class="chart__ink-line" x1="12" x2="12" :y1="DOWN_TOP" :y2="downToday" stroke-width="8" />
    <text class="chart__strong" x="32" :y="DOWN_TOP + 4">1 września</text>
    <g v-for="stop in downStops" :key="stop.key">
      <circle v-if="stop.kind === 'today'" class="chart__today" cx="12" :cy="stop.y" r="10" />
      <circle
        v-else
        class="chart__station"
        :class="{ 'chart__station--planned': stop.kind === 'planned' }"
        cx="12"
        :cy="stop.y"
        r="6.5"
      />
      <text x="32" :y="stop.y + 4">
        <tspan :class="stop.kind === 'planned' ? '' : 'chart__strong'">{{ stop.label }}</tspan>
        <tspan v-if="stop.detail" dx="6">{{ stop.detail }}</tspan>
      </text>
    </g>
    <path
      class="route__exam"
      :d="examShape(12, downEnd - 14, 10)"
      :style="{ fill: `var(--exam-${examId})` }"
    />
    <text x="32" :y="downEnd - 10">
      <tspan class="chart__strong">Matura</tspan>
      <tspan dx="6">{{ shortDate(examDate) }} · {{ leftText }}</tspan>
    </text>
  </svg>
</template>

<style scoped>
.route__exam {
  stroke: var(--ink);
  stroke-width: 3;
  stroke-linejoin: round;
}
</style>
