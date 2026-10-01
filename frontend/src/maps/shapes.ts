import type { Point } from './geometry'
import type { Difficulty } from './types'

function round(value: number): number {
  return Math.round(value * 100) / 100
}

function polygon(points: readonly Point[]): string {
  return `M ${points.map((point) => `${round(point.x)} ${round(point.y)}`).join(' L ')} Z`
}

// Wielokąt foremny od górnego wierzchołka, zgodnie z ruchem wskazówek zegara.
function regular(center: Point, radius: number, sides: number, shift: number): Point[] {
  return Array.from({ length: sides }, (_, index) => {
    const angle = -Math.PI / 2 + (index * 2 * Math.PI) / sides
    return {
      x: center.x + radius * Math.cos(angle),
      y: center.y + shift + radius * Math.sin(angle),
    }
  })
}

/**
 * Obrys stacji o danej trudności. Ścieżka zaczyna się na godzinie 12 i biegnie zgodnie
 * z ruchem wskazówek zegara, żeby kontur postępu rósł od tego samego miejsca.
 * Wymiary figur są dobrane tak, żeby wyglądały na równie duże jak koło o promieniu `r`.
 */
export function stationPath(difficulty: Difficulty, center: Point, r: number): string {
  const { x, y } = center
  switch (difficulty) {
    case 0:
      return (
        `M ${round(x)} ${round(y - r)} A ${round(r)} ${round(r)} 0 1 1 ${round(x)} ${round(y + r)} ` +
        `A ${round(r)} ${round(r)} 0 1 1 ${round(x)} ${round(y - r)} Z`
      )
    case 1: {
      // Trójkąt lekko w dół, żeby jego środek wizualny wypadał na środku stacji.
      const radius = r * 1.25
      return polygon(regular(center, radius, 3, radius * 0.15))
    }
    case 2: {
      const half = r * 0.88
      return polygon([
        { x, y: y - half },
        { x: x + half, y: y - half },
        { x: x + half, y: y + half },
        { x: x - half, y: y + half },
        { x: x - half, y: y - half },
      ])
    }
    case 3: {
      const radius = r * 1.1
      return polygon(regular(center, radius, 5, radius * 0.05))
    }
  }
}
