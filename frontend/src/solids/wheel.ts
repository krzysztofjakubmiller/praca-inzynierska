// Bryły siedzą na jednym niewidocznym kole obracającym się zgodnie z ruchem wskazówek zegara.
// Faza bryły to jej położenie na kole liczone w krokach między sąsiednimi bryłami: 0 to miejsce
// spoczynku, wartości dodatnie oznaczają bryłę dopiero nadjeżdżającą (z dołu), ujemne już odjeżdżającą.

/** Kąt między sąsiednimi bryłami na kole. */
export const WHEEL_STEP = (40 * Math.PI) / 180

// Prędkość powolnego dryfu w spoczynku jako ułamek średniej prędkości.
const DRIFT = 0.12
// Im wyższa potęga, tym dłużej bryła stoi i tym gwałtowniej odjeżdża.
const POWER = 4

/**
 * Połowa zmiany bryły, od spoczynku (0) do chwili mijania się brył (1): najpierw powolny dryf,
 * potem nagłe przyspieszenie. Odwrócona daje wjazd: najpierw szybko, potem hamowanie.
 */
function leave(progress: number): number {
  return DRIFT * progress + (1 - DRIFT) * progress ** POWER
}

/**
 * Położenie koła dla pozycji przewijania liczonej w stacjach (liczby całkowite to środki stacji).
 * Przy środku stacji koło prawie stoi, między stacjami szybko obraca się o jeden krok.
 * Przed środkiem pierwszej stacji koło stoi, a zatrzymuje się po dojściu do `last`.
 */
export function stairPhase(position: number, last: number): number {
  if (position <= 0) return 0
  if (position >= last) return last
  const whole = Math.floor(position)
  const part = position - whole
  return part < 0.5 ? whole + leave(part * 2) / 2 : whole + 1 - leave((1 - part) * 2) / 2
}

/**
 * Faza bryły, która jedzie razem ze stroną, zależna od położenia jej miejsca na ekranie:
 * 1 przy dolnej krawędzi, 0 na środku, -1 przy górnej. Na krawędziach bryła jest pół kroku dalej.
 */
export function edgePhase(screenPosition: number): number {
  const distance = Math.min(1, Math.abs(screenPosition))
  return (Math.sign(screenPosition) * leave(distance)) / 2
}

/**
 * Przesunięcie bryły względem miejsca spoczynku na kole o danym promieniu (x w prawo, y w dół).
 * Środek koła leży na prawo od miejsca spoczynku, więc bryła wjeżdża z dołu i odjeżdża w górę,
 * w obu przypadkach odchylając się w prawo.
 */
export function wheelOffset(phase: number, radius: number): { x: number; y: number } {
  const angle = phase * WHEEL_STEP
  return { x: radius * (1 - Math.cos(angle)), y: radius * Math.sin(angle) }
}
