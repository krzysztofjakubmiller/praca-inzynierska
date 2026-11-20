<script setup lang="ts">
import { ref, watch } from 'vue'
import StationMarker from '@/components/landing/StationMarker.vue'
import { EXAMS } from '@/config/exams'
import {
  profile,
  updateProfile,
  type DailyReviews,
  type LearningDifficulties,
  type ProfileSettings,
} from '@/profile'
import { rememberExam } from '@/lastExam'
import { setDarkShade, setTheme, type DarkShade, type Theme } from '@/theme'

type Field = keyof ProfileSettings

const LEVELS = [
  {
    value: 'podstawowa',
    label: 'Podstawowa',
    note: 'Tylko poziom podstawowy.',
    exam: EXAMS.find((exam) => exam.id === 'matura-podstawowa')!,
  },
  {
    value: 'rozszerzona',
    label: 'Rozszerzona',
    note: 'Oba poziomy, mapą jest rozszerzenie.',
    exam: EXAMS.find((exam) => exam.id === 'matura-rozszerzona')!,
  },
] as const
const THEMES: { value: Theme; label: string }[] = [
  { value: 'light', label: 'Jasny' },
  { value: 'dark', label: 'Ciemny' },
]
const SHADES: { value: DarkShade; label: string }[] = [
  { value: 'navy', label: 'Granatowy' },
  { value: 'grey', label: 'Grafitowy' },
  { value: 'black', label: 'Czarny' },
]
const REVIEWS: { value: DailyReviews; label: string }[] = [
  { value: 'malo', label: 'Mało' },
  { value: 'srednio', label: 'Średnio' },
  { value: 'duzo', label: 'Dużo' },
]
const DIFFICULTIES: { value: LearningDifficulties; label: string; hint: string }[] = [
  {
    value: 'brak',
    label: 'Brak',
    hint: 'AI ocenia rozwiązania według standardowych zasad CKE.',
  },
  {
    value: 'specyficzne',
    label: 'Specyficzne trudności',
    hint: 'Masz opinię poradni o dysleksji, dysgrafii albo dysortografii. AI uwzględnia przy ocenie kryteria CKE dla specyficznych trudności.',
  },
  {
    value: 'dyskalkulia',
    label: 'Dyskalkulia',
    hint: 'Masz opinię poradni o dyskalkulii. AI ocenia przede wszystkim według zasad CKE dla osób z dyskalkulią.',
  },
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

// Zmiana poziomu to przejście na drugą maturę, więc konto przełącza się na nią od razu, tak jak
// po otwarciu jej mapy.
async function chooseLevel(level: (typeof LEVELS)[number]['value']) {
  await save('level', { level })
  if (!problems.value.level) {
    rememberExam(level === 'rozszerzona' ? 'matura-rozszerzona' : 'matura-podstawowa')
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
</script>

<template>
  <div v-if="profile" class="settings">
    <section class="settings__group settings__group--wide" aria-labelledby="settings-learning">
      <h2 id="settings-learning" class="settings__heading">Matura</h2>

      <div class="settings__matura">
        <div class="settings__field">
          <p id="settings-level" class="settings__label">Poziom</p>
          <div class="settings__tiles" role="radiogroup" aria-labelledby="settings-level">
            <label
              v-for="item in LEVELS"
              :key="item.value"
              class="settings__tile"
              :style="{ '--marker-fill': `var(--exam-${item.exam.id})` }"
            >
              <input
                type="radio"
                name="level"
                :value="item.value"
                :checked="profile.level === item.value"
                @change="chooseLevel(item.value)"
              />
              <span class="settings__tile-body">
                <StationMarker :shape="item.exam.solid" class="settings__tile-marker" />
                <strong>{{ item.label }}</strong>
                <span class="settings__tile-note">{{ item.note }}</span>
              </span>
            </label>
          </div>
          <p v-if="saved === 'level'" class="settings__saved" role="status">Zapisano</p>
          <p v-if="problems.level" class="settings__problem" role="alert">{{ problems.level }}</p>
        </div>

        <div class="settings__side">
          <div class="settings__field">
            <p id="settings-year" class="settings__label">Rok matury</p>
            <div class="settings__choice" role="radiogroup" aria-labelledby="settings-year">
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
          </div>

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
                placeholder="brak"
                aria-describedby="target-hint"
                @change="saveTarget"
              />
              <span class="settings__unit" aria-hidden="true">%</span>
            </div>
            <p id="target-hint" class="settings__hint">
              Wynik, do którego dążysz. Pokazuje się na wykresach arkuszy i prognozy. Możesz
              zostawić puste.
            </p>
            <p v-if="saved === 'target_percent'" class="settings__saved" role="status">Zapisano</p>
            <p v-if="problems.target_percent" class="settings__problem" role="alert">
              {{ problems.target_percent }}
            </p>
          </div>
        </div>
      </div>
    </section>

    <section class="settings__group" aria-labelledby="settings-reviews">
      <h2 id="settings-reviews" class="settings__heading">Powtórki</h2>
      <div class="settings__field">
        <p id="settings-daily" class="settings__label">Ile powtórek dziennie</p>
        <div
          class="settings__tiles settings__tiles--row"
          role="radiogroup"
          aria-labelledby="settings-daily"
        >
          <label v-for="(item, index) in REVIEWS" :key="item.value" class="settings__tile">
            <input
              type="radio"
              name="daily-reviews"
              :value="item.value"
              :checked="profile.daily_reviews === item.value"
              @change="save('daily_reviews', { daily_reviews: item.value })"
            />
            <span class="settings__tile-body settings__tile-body--center">
              <span class="settings__bars" aria-hidden="true">
                <span
                  v-for="bar in 3"
                  :key="bar"
                  :class="{ 'settings__bar--on': bar <= index + 1 }"
                />
              </span>
              <strong>{{ item.label }}</strong>
            </span>
          </label>
        </div>
        <p class="settings__hint">
          Najwięcej {{ profile.daily_review_limit }} powtórek jednego dnia. Resztę aplikacja
          przesuwa na kolejne dni, a nowe zadania możesz robić bez limitu.
        </p>
        <p v-if="saved === 'daily_reviews'" class="settings__saved" role="status">Zapisano</p>
        <p v-if="problems.daily_reviews" class="settings__problem" role="alert">
          {{ problems.daily_reviews }}
        </p>
      </div>
    </section>

    <section class="settings__group" aria-labelledby="settings-look">
      <h2 id="settings-look" class="settings__heading">Wygląd</h2>
      <div class="settings__field">
        <p id="settings-theme" class="settings__label">Motyw</p>
        <div
          class="settings__tiles settings__tiles--two"
          role="radiogroup"
          aria-labelledby="settings-theme"
        >
          <label v-for="item in THEMES" :key="item.value" class="settings__tile">
            <input
              type="radio"
              name="theme"
              :value="item.value"
              :checked="profile.theme === item.value"
              @change="chooseTheme(item.value)"
            />
            <span class="settings__tile-body">
              <span class="settings__preview" :class="`settings__preview--${item.value}`">
                <span />
                <span />
              </span>
              <strong>{{ item.label }}</strong>
            </span>
          </label>
        </div>
        <p v-if="saved === 'theme'" class="settings__saved" role="status">Zapisano</p>
      </div>
      <div v-if="profile.theme === 'dark'" class="settings__field">
        <p id="settings-shade" class="settings__label">Tło ciemnego motywu</p>
        <div class="settings__choice" role="radiogroup" aria-labelledby="settings-shade">
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
      </div>
    </section>

    <section class="settings__group settings__group--wide" aria-labelledby="settings-difficulties">
      <h2 id="settings-difficulties" class="settings__heading">Ocena rozwiązań</h2>
      <div class="settings__field">
        <p id="settings-opinion" class="settings__label">
          Opinia poradni o trudnościach w uczeniu się
        </p>
        <div
          class="settings__tiles settings__tiles--three"
          role="radiogroup"
          aria-labelledby="settings-opinion"
        >
          <label v-for="item in DIFFICULTIES" :key="item.value" class="settings__tile">
            <input
              type="radio"
              name="learning-difficulties"
              :value="item.value"
              :checked="profile.learning_difficulties === item.value"
              @change="save('learning_difficulties', { learning_difficulties: item.value })"
            />
            <span class="settings__tile-body">
              <strong>{{ item.label }}</strong>
              <span class="settings__tile-note">{{ item.hint }}</span>
            </span>
          </label>
        </div>
        <p v-if="saved === 'learning_difficulties'" class="settings__saved" role="status">
          Zapisano
        </p>
        <p v-if="problems.learning_difficulties" class="settings__problem" role="alert">
          {{ problems.learning_difficulties }}
        </p>
      </div>
    </section>
  </div>
</template>

<style scoped>
/* Wariant A: karty w dwóch kolumnach, a wybory jako duże kafelki zamiast małych pigułek. */
.settings {
  display: grid;
  gap: 1rem;
  align-items: start;
}

.settings__group {
  display: grid;
  gap: 1.5rem;
  padding: clamp(1.25rem, 1rem + 1vw, 2rem);
  border-radius: var(--radius-small);
  background: var(--surface);
  box-shadow: var(--card-shadow);
}

.settings__heading {
  font-size: clamp(1.5rem, 1.3rem + 0.8vw, 2rem);
  font-weight: 800;
  font-stretch: 75%;
  line-height: 0.95;
  text-transform: uppercase;
}

.settings__matura {
  display: grid;
  gap: 1.5rem;
}

.settings__side {
  display: grid;
  gap: 1.5rem;
  align-content: start;
}

.settings__field {
  display: grid;
  align-content: start;
  justify-items: start;
  gap: 0.6rem;
  min-width: 0;
}

.settings__label {
  font-size: 0.9375rem;
  font-weight: 650;
}

/* Kafelki: każdy to zwykły przycisk opcji, schowany pod kartą z opisem. */
.settings__tiles {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.6rem;
  justify-self: stretch;
}

/* Opisy opinii poradni są długie, więc na telefonie kafelki stoją jeden pod drugim. */
.settings__tiles--three {
  grid-template-columns: minmax(0, 1fr);
}

/* Krótkie kafelki z ilością powtórek mieszczą się w rzędzie także na telefonie. */
.settings__tiles.settings__tiles--row {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.settings__tile {
  position: relative;
  display: grid;
}

.settings__tile input,
.settings__choice input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.settings__tile-body {
  display: grid;
  align-content: start;
  gap: 0.3rem;
  min-height: 100%;
  padding: 0.9rem 1rem;
  border: 2px solid transparent;
  border-radius: 0.9rem;
  background: var(--ground);
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    background-color 0.15s ease;
}

.settings__tile-body--center {
  justify-items: center;
  text-align: center;
}

.settings__tile-body:hover {
  border-color: var(--ink-soft);
}

.settings__tile input:checked + .settings__tile-body {
  border-color: var(--ink);
  background: var(--surface);
}

.settings__tile input:focus-visible + .settings__tile-body {
  outline: 3px solid var(--ink);
  outline-offset: 2px;
}

.settings__tile strong {
  font-size: 1.0625rem;
  font-weight: 750;
}

.settings__tile-note {
  color: var(--ink-soft);
  font-size: 0.875rem;
  line-height: 1.4;
}

.settings__tile-marker {
  margin-bottom: 0.35rem;
  font-size: 1.6rem;
}

/* Słupki pokazują, ile powtórek przyjdzie: jeden, dwa albo trzy. */
.settings__bars {
  display: flex;
  align-items: flex-end;
  gap: 0.2rem;
  height: 1.5rem;
  margin-bottom: 0.25rem;
}

.settings__bars span {
  width: 0.45rem;
  border-radius: 0.15rem;
  background: var(--track);
}

.settings__bars span:nth-child(1) {
  height: 40%;
}

.settings__bars span:nth-child(2) {
  height: 70%;
}

.settings__bars span:nth-child(3) {
  height: 100%;
}

.settings__bars .settings__bar--on {
  background: var(--ink);
}

/* Mały podgląd motywu: tło i karta w jego kolorach. */
.settings__preview {
  display: grid;
  grid-template-columns: 1fr 1.6fr;
  gap: 0.3rem;
  width: 100%;
  height: 3.25rem;
  margin-bottom: 0.35rem;
  padding: 0.4rem;
  border: 1px solid var(--hairline);
  border-radius: 0.6rem;
}

.settings__preview span {
  border-radius: 0.3rem;
}

.settings__preview--light {
  background: #e6e9f2;
}

.settings__preview--light span {
  background: #fff;
}

.settings__preview--dark {
  background: #14161d;
}

.settings__preview--dark span {
  background: #262a36;
}

.settings__preview span:first-child {
  background: #168344;
}

/* Wybór roku i tła jak przełącznik „Mapa | Lista”: pigułka z pigułkami w środku. */
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
  background: #14161d;
}

.settings__swatch--black {
  background: #000000;
}

.settings__swatch--navy {
  background: #16224f;
}

/* Cel dużą cyfrą, jak liczby na wykresach. */
.settings__target {
  position: relative;
}

.settings__input {
  width: 7.5rem;
  min-height: 3.5rem;
  padding: 0 2.5rem 0 1rem;
  border: 2px solid var(--ink);
  border-radius: 0.8rem;
  background: var(--ground);
  color: var(--ink);
  font: inherit;
  font-size: 1.75rem;
  font-weight: 800;
  font-stretch: 82%;
  font-variant-numeric: tabular-nums;
}

.settings__input::placeholder {
  color: var(--ink-soft);
}

.settings__unit {
  position: absolute;
  top: 50%;
  right: 1rem;
  color: var(--ink-soft);
  font-size: 1.25rem;
  font-weight: 700;
  translate: 0 -50%;
}

.settings__hint {
  max-width: 48ch;
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

@media (min-width: 40rem) {
  .settings__tiles--three {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (min-width: 56rem) {
  .settings {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .settings__group--wide {
    grid-column: 1 / -1;
  }

  .settings__matura {
    grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr);
    gap: 2.5rem;
  }
}
</style>
