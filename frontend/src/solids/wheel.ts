// The solids sit on one invisible wheel turning clockwise. A solid's phase says where it is
// on that wheel, counted in steps between neighbouring solids: 0 is its resting place,
// positive values are still to come (below), negative ones are already gone (above).

/** Angle between neighbouring solids on the wheel. */
export const WHEEL_STEP = (40 * Math.PI) / 180

// How fast a solid drifts while it rests, as a share of the average speed.
const DRIFT = 0.12
// The higher the power, the longer a solid rests and the more suddenly it leaves.
const POWER = 4

/**
 * Half of a change of solids, from resting (0) to the moment of swapping (1): slow drift
 * at first, then a sudden rush. Played backwards it is the arrival: fast, then braking.
 */
function leave(progress: number): number {
  return DRIFT * progress + (1 - DRIFT) * progress ** POWER
}

/**
 * Wheel position for a scroll position measured in stations, where whole numbers are the
 * middles of stations. Near a middle the wheel barely moves; between stations it turns
 * one step quickly. Before the middle of the first station the first solid stands still,
 * and the wheel stops once it has turned to `last`.
 */
export function stairPhase(position: number, last: number): number {
  if (position <= 0) return 0
  if (position >= last) return last
  const whole = Math.floor(position)
  const part = position - whole
  return part < 0.5 ? whole + leave(part * 2) / 2 : whole + 1 - leave((1 - part) * 2) / 2
}

/**
 * Phase of a solid that travels with the page, from its place on the screen: 1 when its slot
 * is at the bottom edge, 0 in the middle, -1 at the top edge. It rests in the middle of the
 * screen and is half a step away, out of sight, at either edge.
 */
export function edgePhase(screenPosition: number): number {
  const distance = Math.min(1, Math.abs(screenPosition))
  return (Math.sign(screenPosition) * leave(distance)) / 2
}

/**
 * Offset of a solid from its resting place on a wheel of the given radius, in screen
 * directions: x to the right, y down. The wheel's centre is to the right of the resting
 * place, so a solid arrives from below right and leaves upwards to the right.
 */
export function wheelOffset(phase: number, radius: number): { x: number; y: number } {
  const angle = phase * WHEEL_STEP
  return { x: radius * (1 - Math.cos(angle)), y: radius * Math.sin(angle) }
}
