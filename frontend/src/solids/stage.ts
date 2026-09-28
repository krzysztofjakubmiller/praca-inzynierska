import { Color, Euler, Group, OrthographicCamera, Scene, Vector3, WebGLRenderer } from 'three'
import { LineMaterial } from 'three/addons/lines/LineMaterial.js'
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js'
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js'
import type { SolidKind } from '@/config/exams'
import { solidEdges, type Edge } from './geometry'

// Resting pose of each solid, turned so that no two edges overlap on screen.
const POSES: Record<SolidKind, Euler> = {
  sphere: new Euler(0.42, 0, -0.22),
  tetrahedron: new Euler(0.3, -0.38, 0),
  cube: new Euler(0.52, 0.72, 0),
}

// All solids share the unit circumsphere, which makes the sphere look the biggest.
const SCALES: Record<SolidKind, number> = { sphere: 0.84, tetrahedron: 1.08, cube: 1 }

// Share of the stage's shorter side taken by a solid of radius 1.
const FILL = 0.66

// Back edges fade into the background like a line running through a tunnel on a metro map.
const BACK_MIX = 0.5

const OUTLINE_SEGMENTS = 96

export interface SolidStage {
  show(kind: SolidKind, color: string): void
  resize(width: number, height: number): void
  dispose(): void
}

// Soft line ends (alphaToCoverage) leave lighter rings where short segments meet,
// so the ends stay hard and the stage is rendered at a higher resolution instead.
function lineMaterial(): LineMaterial {
  return new LineMaterial({ depthTest: false, depthWrite: false })
}

function lines(material: LineMaterial, renderOrder: number): LineSegments2 {
  const segments = new LineSegments2(new LineSegmentsGeometry(), material)
  segments.renderOrder = renderOrder
  segments.frustumCulled = false
  return segments
}

function setPositions(segments: LineSegments2, positions: number[]) {
  segments.geometry.dispose()
  segments.geometry = new LineSegmentsGeometry().setPositions(positions)
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

export function createSolidStage(canvas: HTMLCanvasElement, background: string): SolidStage {
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(Math.max(window.devicePixelRatio, 2), 3))

  const scene = new Scene()
  const camera = new OrthographicCamera()
  camera.position.z = 10

  const frontMaterial = lineMaterial()
  const backMaterial = lineMaterial()
  const back = lines(backMaterial, 0)
  const front = lines(frontMaterial, 1)
  const outline = lines(frontMaterial, 1)
  setPositions(outline, outlinePositions())

  const solid = new Group()
  solid.add(back, front)
  scene.add(solid, outline)

  const backgroundColor = new Color(background)

  function render() {
    renderer.render(scene, camera)
  }

  function show(kind: SolidKind, color: string) {
    const pose = POSES[kind]
    const { front: frontPositions, back: backPositions } = splitByFacing(solidEdges(kind), pose)
    setPositions(front, frontPositions)
    setPositions(back, backPositions)
    solid.rotation.copy(pose)
    solid.scale.setScalar(SCALES[kind])
    outline.visible = kind === 'sphere'
    outline.scale.setScalar(SCALES.sphere)
    frontMaterial.color.set(color)
    backMaterial.color.set(color).lerp(backgroundColor, BACK_MIX)
    render()
  }

  function resize(width: number, height: number) {
    const w = Math.max(1, width)
    const h = Math.max(1, height)
    renderer.setSize(w, h, false)

    const half = 1 / FILL
    camera.left = -half * Math.max(w / h, 1)
    camera.right = -camera.left
    camera.top = half * Math.max(h / w, 1)
    camera.bottom = -camera.top
    camera.updateProjectionMatrix()

    const linewidth = Math.min(10, Math.max(4, Math.min(w, h) * 0.0125))
    for (const material of [frontMaterial, backMaterial]) {
      material.resolution.set(w, h)
      material.linewidth = linewidth
    }
    render()
  }

  function dispose() {
    for (const segments of [front, back, outline]) segments.geometry.dispose()
    frontMaterial.dispose()
    backMaterial.dispose()
    renderer.dispose()
    renderer.forceContextLoss()
  }

  return { show, resize, dispose }
}
