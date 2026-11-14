import { ref } from 'vue'
import { API_URL } from '@/access'

// Ankieta wizytówek: jedno urządzenie ocenia każdą stronę raz, a kolejna ocena zastępuje poprzednią.
// Urządzenie rozpoznajemy po losowym identyfikatorze zapisanym w przeglądarce.

// Strony główne to te, między którymi zapada wybór. Dodatkowe są dla chętnych.
export const PAGES = [
  { id: 'a', name: 'Stacje w kolorze', main: true, colors: ['#16224f', '#ff7a69'] },
  { id: 'b', name: 'Tablica odjazdów', main: true, colors: ['#131210', '#ffb224'] },
  { id: 'c', name: 'Bilet', main: true, colors: ['#dff1e5', '#126b38'] },
  { id: 'd', name: 'Peron', main: true, colors: ['#ffd026', '#17181a'] },
  { id: 'e', name: 'Obecna strona', main: true, colors: ['#f2f3f0', '#1d1f22'] },
  { id: 'f', name: 'Mapa tematów', main: false, colors: ['#111210', '#fe8e66'] },
  { id: 'g', name: 'Jedno zadanie', main: false, colors: ['#ffffff', '#1d1f22'] },
] as const

export type PageId = (typeof PAGES)[number]['id']

export const ROLES = [
  { id: 'uczen', name: 'Uczeń' },
  { id: 'student', name: 'Student' },
  { id: 'rodzic', name: 'Rodzic' },
] as const

export type Role = (typeof ROLES)[number]['id']

export const LIKERT = ['Zdecydowanie nie', 'Nie', 'Średnio', 'Tak', 'Zdecydowanie tak']

export interface Answer {
  looks: number
  expensive: number
  buying: number
  comment: string
}

/** Dane o tym, jak oceniający oglądał stronę; zbiera je dymek ankiety. */
export interface Visit {
  scrolled: number
  seconds: number
  openedBy: 'klik' | 'koniec-strony'
  triedTask: boolean
  blockedClicks: number
}

const KEYS = {
  device: 'ankieta-urzadzenie',
  // Dwójka w nazwie: po zmianie zestawu stron litery znaczą co innego niż w starych zapisach.
  answers: 'ankieta-oceny-2',
  order: 'ankieta-kolejnosc-2',
  podium: 'ankieta-podium-2',
  role: 'ankieta-kim',
}

function read<T>(key: string, fallback: T): T {
  const saved = localStorage.getItem(key)
  return saved ? (JSON.parse(saved) as T) : fallback
}

/** Oceny wystawione z tego urządzenia, żeby lista i dymek pokazywały, co już ocenione. */
export const answers = ref<Partial<Record<PageId, Answer>>>(read(KEYS.answers, {}))
export const podium = ref<PageId[]>(read(KEYS.podium, []))

/** Kim jest oceniający. Pytamy raz na urządzenie, a odpowiedź idzie z każdą oceną. */
export const role = ref<Role | null>(read<Role | null>(KEYS.role, null))

export function setRole(value: Role) {
  role.value = value
  localStorage.setItem(KEYS.role, JSON.stringify(value))
}

/** Rośnie, gdy oceniający kliknie przycisk prowadzący do części aplikacji zamkniętej hasłem. */
export const blockedClicks = ref(0)

// crypto.randomUUID działa tylko pod https i na localhost, a ankietę da się też otworzyć
// z telefonu po adresie w sieci domowej, więc identyfikator składamy sami z losowych bajtów.
function randomId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6]! & 0x0f) | 0x40
  bytes[8] = (bytes[8]! & 0x3f) | 0x80
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

function deviceId(): string {
  let id = localStorage.getItem(KEYS.device)
  if (!id) {
    id = randomId()
    localStorage.setItem(KEYS.device, id)
  }
  return id
}

function shuffled(ids: PageId[]): PageId[] {
  const order = [...ids]
  for (let index = order.length - 1; index > 0; index--) {
    const other = Math.floor(Math.random() * (index + 1))
    ;[order[index], order[other]] = [order[other]!, order[index]!]
  }
  return order
}

/**
 * Kolejność stron na liście, losowa i stała dla urządzenia: najpierw strony główne pomieszane
 * między sobą, potem dodatkowe. Bez losowania pierwsze strony z listy zbierałyby najwięcej ocen,
 * a ostatnie oceniałby ktoś już zmęczony.
 */
export function pageOrder(): PageId[] {
  const ids = PAGES.map((page) => page.id)
  const saved = read<PageId[]>(KEYS.order, [])
  if (saved.length === ids.length && ids.every((id) => saved.includes(id))) return saved
  const order = [true, false].flatMap((main) =>
    shuffled(PAGES.filter((page) => page.main === main).map((page) => page.id)),
  )
  localStorage.setItem(KEYS.order, JSON.stringify(order))
  return order
}

/** Następna nieoceniona strona w kolejności tego urządzenia. */
export function nextPage(after: PageId): PageId | undefined {
  const order = pageOrder()
  const start = order.indexOf(after)
  return [...order.slice(start + 1), ...order.slice(0, start)].find((id) => !answers.value[id])
}

export function deviceKind(
  userAgent: string,
  touchPoints: number,
): 'telefon' | 'tablet' | 'komputer' {
  // iPad od kilku lat przedstawia się jak komputer Mac, a zdradza go dopiero ekran dotykowy.
  const tablet =
    /iPad|Tablet/.test(userAgent) ||
    (/Macintosh/.test(userAgent) && touchPoints > 1) ||
    (/Android/.test(userAgent) && !/Mobile/.test(userAgent))
  if (tablet) return 'tablet'
  return /Mobi|iPhone|Android/.test(userAgent) ? 'telefon' : 'komputer'
}

interface DeviceHints {
  getHighEntropyValues(
    hints: string[],
  ): Promise<{ model?: string; platform?: string; platformVersion?: string }>
}

async function deviceDetails() {
  const userAgent = navigator.userAgent
  let model: string | null = null
  let system: string | null = null
  // Dokładny model telefonu podają tylko przeglądarki z rodziny Chrome, i to nie zawsze.
  const hints = (navigator as Navigator & { userAgentData?: DeviceHints }).userAgentData
  if (hints) {
    try {
      const high = await hints.getHighEntropyValues(['model', 'platform', 'platformVersion'])
      model = high.model || null
      system = high.platform ? `${high.platform} ${high.platformVersion ?? ''}`.trim() : null
    } catch {
      // Strona może nie dostać zgody na te dane; wtedy zostaje to, co widać w nazwie przeglądarki.
    }
  }
  model ??=
    userAgent.match(/iPhone|iPad/)?.[0] ?? userAgent.match(/Android [\d.]+; ([^;)]+)/)?.[1] ?? null
  system ??=
    userAgent.match(/Android [\d.]+|iPhone OS [\d_]+|Windows NT [\d.]+|Mac OS X [\d_.]+/)?.[0] ??
    null
  return {
    user_agent: userAgent.slice(0, 400),
    model: model?.slice(0, 80) ?? null,
    system: system?.slice(0, 80) ?? null,
    // Gęstość pikseli bywa ułamkiem z długim ogonem, np. 2.0000000298.
    screen: `${screen.width}x${screen.height}@${Math.round(window.devicePixelRatio * 100) / 100}`,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    language: navigator.language.slice(0, 24),
    touch: navigator.maxTouchPoints > 0,
  }
}

async function send(path: string, body: unknown) {
  const response = await fetch(`${API_URL}/api/survey/${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!response.ok) throw new Error(`ankieta: serwer odpowiedział kodem ${response.status}`)
}

export async function saveAnswer(page: PageId, answer: Answer, visit: Visit) {
  const rated = Object.keys(answers.value).filter((id) => id !== page).length
  await send(`answers/${page}`, {
    device_id: deviceId(),
    looks: answer.looks,
    expensive: answer.expensive,
    buying: answer.buying,
    comment: answer.comment,
    scrolled: visit.scrolled,
    seconds: visit.seconds,
    device: deviceKind(navigator.userAgent, navigator.maxTouchPoints),
    details: {
      ...(await deviceDetails()),
      order: rated + 1,
      opened_by: visit.openedBy,
      tried_task: visit.triedTask,
      blocked_clicks: visit.blockedClicks,
      role: role.value,
    },
  })
  answers.value = { ...answers.value, [page]: answer }
  localStorage.setItem(KEYS.answers, JSON.stringify(answers.value))
}

export async function savePodium(pages: PageId[]) {
  await send('podium', { device_id: deviceId(), pages })
  podium.value = pages
  localStorage.setItem(KEYS.podium, JSON.stringify(pages))
}
