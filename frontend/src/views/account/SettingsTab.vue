<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  DAILY_REVIEW_LIMITS,
  profile,
  updateProfile,
  type DailyReviews,
  type ProfileSettings,
} from '@/profile'
import { setDarkShade, setTheme, type DarkShade, type Theme } from '@/theme'

type Field = keyof ProfileSettings

const LEVELS = [
  { value: 'podstawowa', label: 'Podstawowa' },
  { value: 'rozszerzona', label: 'Rozszerzona' },
] as const
const THEMES: { value: Theme; label: string }[] = [
  { value: 'light', label: 'Jasny' },
  { value: 'dark', label: 'Ciemny' },
]
const SHADES: { value: DarkShade; label: string }[] = [
  { value: 'grey', label: 'Ciemnoszary' },
  { value: 'black', label: 'Czarny' },
]
const REVIEWS: { value: DailyReviews; label: string }[] = [
  { value: 'malo', label: 'mało' },
  { value: 'srednio', label: 'średnio' },
  { value: 'duzo', label: 'dużo' },
]

// Przy każdym polu osobny komunikat, bo na telefonie wspólny zniknąłby poza ekranem.
const saved = ref<Field | null>(null)
const problems = ref<Partial<Record<Field, string>>>({})
let hideSaved: ReturnType<typeof setTimeout> | undefined

async function save(field: Field, changes: Partial<ProfileSettings>) {
  problems.value = { ...problems.value, [field]: undefined }
  try {
    const found = await updateProfile(changes)
    if (found.length > 0) {
      problems.value = { ...problems.value, [field]: found.join(' ') }
      return
    }
    showSaved(field)
  } catch {
    problems.value = { ...problems.value, [field]: 'Serwer nie odpowiada. Spróbuj za chwilę.' }
  }
}

async function chooseTheme(value: Theme) {
  await setTheme(value)
  showSaved('theme')
}

async function chooseShade(value: DarkShade) {
  await setDarkShade(value)
  showSaved('dark_shade')
}

function showSaved(field: Field) {
  saved.value = field
  clearTimeout(hideSaved)
  hideSaved = setTimeout(() => (saved.value = null), 2000)
}

// Cel jest opcjonalny: puste pole zapisuje brak celu.
const targetText = ref('')
watch(
  () => profile.value?.target_percent,
  (value) => (targetText.value = String(value ?? '')),
  { immediate: true },
)
function saveTarget() {
  const text = targetText.value.trim()
  const value = text === '' ? null : Number(text)
  if (value === (profile.value?.target_percent ?? null)) return
  if (value !== null && !Number.isInteger(value)) {
    problems.value = { ...problems.value, target_percent: 'Cel podaj w procentach, od 1 do 100.' }
    return
  }
  save('target_percent', { target_percent: value })
}

const reviewIndex = computed(() =>
  REVIEWS.findIndex((item) => item.value === profile.value?.daily_reviews),
)
function chooseReviews(event: Event) {
  const item = REVIEWS[Number((event.target as HTMLInputElement).value)]!
  save('daily_reviews', { daily_reviews: item.value })
}
</script>

<template>
  <div v-if="profile" class="settings">
    <h1 class="settings__title">Ustawienia</h1>

    <section class="settings__group" aria-labelledby="settings-learning">
      <h2 id="settings-learning" class="settings__heading">Matura</h2>

      <fieldset class="settings__field">
        <legend>Poziom</legend>
        <div class="settings__choice">
          <label v-for="item in LEVELS" :key="item.value">
            <input
              type="radio"
              name="level"
              :value="item.value"
              :checked="profile.level === item.value"
              @change="save('level', { level: item.value })"
            />
            <span>{{ item.label }}</span>
          </label>
        </div>
        <p class="settings__hint">Rozszerzona oznacza naukę obu poziomów.</p>
        <p v-if="saved === 'level'" class="settings__saved" role="status">Zapisano</p>
        <p v-if="problems.level" class="settings__problem" role="alert">{{ problems.level }}</p>
      </fieldset>

      <fieldset class="settings__field">
        <legend>Rok matury</legend>
        <div class="settings__choice">
          <label v-for="year in profile.exam_years" :key="year">
            <input
              type="radio"
              name="exam-year"
              :value="year"
              :checked="profile.exam_year === year"
              @change="save('exam_year', { exam_year: year })"
            />
            <span>{{ year }}</span>
          </label>
        </div>
        <p v-if="saved === 'exam_year'" class="settings__saved" role="status">Zapisano</p>
        <p v-if="problems.exam_year" class="settings__problem" role="alert">
          {{ problems.exam_year }}
        </p>
      </fieldset>

      <div class="settings__field">
        <label class="settings__label" for="target">Cel</label>
        <div class="settings__target">
          <input
            id="target"
            v-model="targetText"
            class="settings__input"
            type="text"
            inputmode="numeric"
            maxlength="3"
            placeholder="bez celu"
            aria-describedby="target-hint"
            @change="saveTarget"
          />
          <span class="settings__unit" aria-hidden="true">%</span>
        </div>
        <p id="target-hint" class="settings__hint">
          Wynik, do którego dążysz. Pokazuje się na wykresach arkuszy i prognozy. Możesz zostawić
          puste.
        </p>
        <p v-if="saved === 'target_percent'" class="settings__saved" role="status">Zapisano</p>
        <p v-if="problems.target_percent" class="settings__problem" role="alert">
          {{ problems.target_percent }}
        </p>
      </div>
    </section>

    <section class="settings__group" aria-labelledby="settings-reviews">
      <h2 id="settings-reviews" class="settings__heading">Powtórki</h2>
      <div class="settings__field">
        <label class="settings__label" for="daily-reviews">Ile powtórek dziennie</label>
        <input
          id="daily-reviews"
          class="settings__range"
          type="range"
          min="0"
          max="2"
          step="1"
          :value="reviewIndex"
          :aria-valuetext="`${REVIEWS[reviewIndex]?.label}, do ${DAILY_REVIEW_LIMITS[profile.daily_reviews]} dziennie`"
          @change="chooseReviews"
        />
        <div class="settings__ticks" aria-hidden="true">
          <span
            v-for="item in REVIEWS"
            :key="item.value"
            :class="{ 'settings__tick--on': item.value === profile.daily_reviews }"
          >
            {{ item.label }}
          </span>
        </div>
        <p class="settings__hint">
          Najwięcej {{ DAILY_REVIEW_LIMITS[profile.daily_reviews] }} powtórek jednego dnia. Resztę
          aplikacja przesuwa na kolejne dni, a nowe zadania możesz robić bez limitu.
        </p>
        <p v-if="saved === 'daily_reviews'" class="settings__saved" role="status">Zapisano</p>
        <p v-if="problems.daily_reviews" class="settings__problem" role="alert">
          {{ problems.daily_reviews }}
        </p>
      </div>
    </section>

    <section class="settings__group" aria-labelledby="settings-look">
      <h2 id="settings-look" class="settings__heading">Wygląd</h2>
      <fieldset class="settings__field">
        <legend>Motyw</legend>
        <div class="settings__choice">
          <label v-for="item in THEMES" :key="item.value">
            <input
              type="radio"
              name="theme"
              :value="item.value"
              :checked="profile.theme === item.value"
              @change="chooseTheme(item.value)"
            />
            <span>{{ item.label }}</span>
          </label>
        </div>
        <p v-if="saved === 'theme'" class="settings__saved" role="status">Zapisano</p>
      </fieldset>
      <fieldset v-if="profile.theme === 'dark'" class="settings__field">
        <legend>Tło ciemnego motywu</legend>
        <div class="settings__choice">
          <label v-for="item in SHADES" :key="item.value">
            <input
              type="radio"
              name="dark-shade"
              :value="item.value"
              :checked="profile.dark_shade === item.value"
              @change="chooseShade(item.value)"
            />
            <span>
              <span class="settings__swatch" :class="`settings__swatch--${item.value}`" />
              {{ item.label }}
            </span>
          </label>
        </div>
        <p v-if="saved === 'dark_shade'" class="settings__saved" role="status">Zapisano</p>
      </fieldset>
    </section>
  </div>
</template>

<style scoped>
.settings {
  display: grid;
  gap: 2.25rem;
  max-width: 34rem;
}

.settings__title {
  font-size: clamp(1.6rem, 1.2rem + 1.6vw, 2.25rem);
  font-weight: 750;
  font-variation-settings: 'wdth' 90;
  letter-spacing: -0.02em;
}

.settings__group {
  display: grid;
  gap: 1.5rem;
}

.settings__heading {
  padding-bottom: 0.6rem;
  border-bottom: 1px solid var(--hairline);
  font-size: 1.0625rem;
  font-weight: 700;
}

.settings__field {
  display: grid;
  justify-items: start;
  gap: 0.6rem;
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}

.settings__field legend,
.settings__label {
  margin-bottom: 0.6rem;
  padding: 0;
  font-size: 0.9375rem;
  font-weight: 650;
}

.settings__label {
  margin-bottom: 0;
}

/* Wybór jednej opcji jak przełącznik „Mapa | Lista”: pigułka z pigułkami w środku. */
.settings__choice {
  display: inline-flex;
  flex-wrap: wrap;
  padding: 0.125rem;
  border: 1.5px solid var(--hairline);
  border-radius: 1.5rem;
}

.settings__choice label {
  position: relative;
}

.settings__choice input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.settings__choice label > span {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  min-height: 2.75rem;
  padding: 0 1.1rem;
  border-radius: 999px;
  font-size: 0.9375rem;
  font-weight: 600;
  cursor: pointer;
  transition:
    background-color 0.2s ease,
    color 0.2s ease;
}

.settings__choice label > span:hover {
  background: var(--hairline);
}

.settings__choice input:checked + span {
  background: var(--ink);
  color: var(--ground);
}

.settings__choice input:focus-visible + span {
  outline: 3px solid var(--ink);
  outline-offset: 2px;
}

.settings__swatch {
  flex: none;
  width: 0.875rem;
  height: 0.875rem;
  border: 1.5px solid var(--ink-soft);
  border-radius: 50%;
}

.settings__swatch--grey {
  background: #111210;
}

.settings__swatch--black {
  background: #070706;
}

.settings__target {
  position: relative;
}

.settings__input {
  width: 8rem;
  min-height: 2.75rem;
  padding: 0 2.25rem 0 0.9rem;
  border: 1.5px solid var(--ink-soft);
  border-radius: 0.75rem;
  background: var(--surface);
  color: var(--ink);
  font: inherit;
  font-variant-numeric: tabular-nums;
}

.settings__input::placeholder {
  color: var(--ink-soft);
}

.settings__unit {
  position: absolute;
  top: 50%;
  right: 0.9rem;
  color: var(--ink-soft);
  font-weight: 600;
  translate: 0 -50%;
}

/* Suwak jak odcinek linii: gruby tor z okrągłymi końcami, uchwyt to stacja. */
.settings__range {
  width: min(100%, 20rem);
  height: 2.75rem;
  margin: 0;
  background: transparent;
  cursor: pointer;
  appearance: none;
}

.settings__range::-webkit-slider-runnable-track {
  height: 7px;
  border-radius: 999px;
  background: var(--track);
}

.settings__range::-moz-range-track {
  height: 7px;
  border-radius: 999px;
  background: var(--track);
}

.settings__range::-webkit-slider-thumb {
  width: 1.5rem;
  height: 1.5rem;
  margin-top: calc((7px - 1.5rem) / 2);
  border: 3px solid var(--ink);
  border-radius: 50%;
  background: var(--surface);
  appearance: none;
}

.settings__range::-moz-range-thumb {
  box-sizing: border-box;
  width: 1.5rem;
  height: 1.5rem;
  border: 3px solid var(--ink);
  border-radius: 50%;
  background: var(--surface);
}

.settings__ticks {
  display: flex;
  justify-content: space-between;
  width: min(100%, 20rem);
  margin-top: -0.5rem;
  color: var(--ink-soft);
  font-size: 0.875rem;
}

.settings__tick--on {
  color: var(--ink);
  font-weight: 700;
}

.settings__hint {
  max-width: 44ch;
  color: var(--ink-soft);
  font-size: 0.875rem;
  line-height: 1.4;
}

.settings__saved {
  color: var(--ink);
  font-size: 0.875rem;
  font-weight: 650;
}

.settings__problem {
  color: var(--danger);
  font-size: 0.875rem;
  font-weight: 600;
}
</style>
