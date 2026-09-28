import { Color, Euler, Group, OrthographicCamera, Scene, Vector3, WebGLRenderer } from 'three'
import { LineMaterial } from 'three/addons/lines/LineMaterial.js'
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js'
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js'
import type { SolidKind } from '@/config/exams'
import { solidEdges, type Edge } from './geometry'
import { wheelOffset } from './wheel'

// Resting pose of each solid, turned so that no two edges overlap on screen.
const POSES: Record<SolidKind, Euler> = {
  sphere: new Euler(0.42, 0, -0.22),
  tetrahedron: new Euler(0.3, -0.38, 0),
  cube: new Euler(0.52, 0.72, 0),
}

// All solids share the unit circumsphere, which makes the sphere look the biggest.
const SCALES: Record<SolidKind, number> = { sphere: 0.84, tetrahedron: 1.08, cube: 1 }

// Share of the place's shorter side taken by a solid.
const FILL = 0.66

// Wheel radius as a multiple of the place's height: large enough for a solid one step
// away to be out of sight, small enough for its path to visibly curve.
const WHEEL_RADIUS = 1.6

// Back edges fade into the background like a line running through a tunnel on a metro map.
const BACK_MIX = 0.5

const OUTLINE_SEGMENTS = 96

export interface SolidSpec {
  kind: SolidKind
  color: string
}

/** Where a solid is drawn: its resting place on the screen (CSS pixels) and its wheel phase. */
export interface SolidFrame {
  place: { left: number; top: number; width: number; height: number }
  phase: number
}

export interface SolidScene {
  draw(frames: SolidFrame[]): void
  resize(width: number, height: number): void
  dispose(): void
}

interface DrawnSolid {
  group: Group
  materials: LineMaterial[]
}

// Soft line ends (alphaToCoverage) leave lighter rings where short segments meet,
// so the ends stay hard and the antialiasing comes from the renderer.
function lineMaterial(color: Color): LineMaterial {
  return new LineMaterial({ color, depthTest: false, depthWrite: false })
}

function lines(positions: number[], material: LineMaterial, renderOrder: number): LineSegments2 {
  const segments = new LineSegments2(new LineSegmentsGeometry().setPositions(positions), material)
  segments.renderOrder = renderOrder
  segments.frustumCulled = false
  return segments
}

function splitByFacing(edges: Edge[], pose: Euler): { front: number[]; back: number[] } {
  const normal = new Vector3()
  const front: number[] = []
  const back: number[] = []
  for (const edge of edges) {
    // The camera looks along -z, so a surface faces it when its normal has a positive z.
    const facesCamera = edge.normals.some((n) => normal.set(...n).applyEuler(pose).z > 0)
    ;(facesCamera ? front : back).push(...edge.a, ...edge.b)
  }
  return { front, back }
}

// The sphere grid alone does not show its contour, so the contour is drawn facing the camera.
function outlinePositions(): number[] {
  const positions: number[] = []
  for (let index = 0; index < OUTLINE_SEGMENTS; index++) {
    const from = (index / OUTLINE_SEGMENTS) * 2 * Math.PI
    const to = ((index + 1) / OUTLINE_SEGMENTS) * 2 * Math.PI
    positions.push(Math.cos(from), Math.sin(from), 0, Math.cos(to), Math.sin(to), 0)
  }
  return positions
}

function buildSolid({ kind, color }: SolidSpec, background: Color): DrawnSolid {
  const frontMaterial = lineMaterial(new Color(color))
  const backMaterial = lineMaterial(new Color(color).lerp(background, BACK_MIX))
  const pose = POSES[kind]
  const { front, back } = splitByFacing(solidEdges(kind), pose)

  const body = new Group()
  body.rotation.copy(pose)
  body.add(lines(back, backMaterial, 0), lines(front, frontMaterial, 1))
  body.scale.setScalar(SCALES[kind])

  const group = new Group()
  group.add(body)
  if (kind === 'sphere') {
    const outline = lines(outlinePositions(), frontMaterial, 1)
    outline.scale.setScalar(SCALES.sphere)
    group.add(outline)
  }
  return { group, materials: [frontMaterial, backMaterial] }
}

export function createSolidScene(
  canvas: HTMLCanvasElement,
  specs: SolidSpec[],
  background: string,
): SolidScene {
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

  // One world unit is one CSS pixel; y points up, so a point on the page at y is drawn at -y.
  // Solids are hundreds of pixels deep, so the depth range must hold them whole.
  const camera = new OrthographicCamera(0, 1, 0, -1, -10000, 10000)
  const scene = new Scene()
  const backgroundColor = new Color(background)
  const solids = specs.map((spec) => buildSolid(spec, backgroundColor))
  for (const solid of solids) scene.add(solid.group)

  let width = 1
  let height = 1

  function draw(frames: SolidFrame[]) {
    solids.forEach((solid, index) => {
      const frame = frames[index]
      if (!frame) {
        solid.group.visible = false
        return
      }
      const { place, phase } = frame
      const size = FILL * Math.min(place.width, place.height)
      const offset = wheelOffset(phase, WHEEL_RADIUS * place.height)
      const x = place.left + place.width / 2 + offset.x
      const y = place.top + place.height / 2 + offset.y
      const radius = size / 2
      // The largest solid reaches a little past the unit sphere.
      const reach = radius * 1.1
      solid.group.visible =
        x + reach > 0 && x - reach < width && y + reach > 0 && y - reach < height
      solid.group.position.set(x, -y, 0)
      solid.group.scale.setScalar(radius)
      const linewidth = Math.min(10, Math.max(3.5, size * 0.019))
      for (const material of solid.materials) material.linewidth = linewidth
    })
    renderer.render(scene, camera)
  }

  function resize(newWidth: number, newHeight: number) {
    width = Math.max(1, newWidth)
    height = Math.max(1, newHeight)
    renderer.setSize(width, height, false)
    camera.right = width
    camera.bottom = -height
    camera.updateProjectionMatrix()
    for (const solid of solids) {
      for (const material of solid.materials) material.resolution.set(width, height)
    }
  }

  function dispose() {
    for (const solid of solids) {
      solid.group.traverse((object) => {
        if (object instanceof LineSegments2) object.geometry.dispose()
      })
      for (const material of solid.materials) material.dispose()
    }
    renderer.dispose()
    renderer.forceContextLoss()
  }

  return { draw, resize, dispose }
}
