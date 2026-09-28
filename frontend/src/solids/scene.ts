import {
  Color,
  Euler,
  Group,
  OrthographicCamera,
  Scene,
  Vector3,
  WebGLRenderer,
  type InterleavedBufferAttribute,
} from 'three'
import { LineMaterial } from 'three/addons/lines/LineMaterial.js'
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js'
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js'
import type { SolidKind } from '@/config/exams'
import { solidEdges, type Edge } from './geometry'
import { wheelOffset } from './wheel'

// Pozycja spoczynkowa każdej bryły, dobrana tak, żeby krawędzie nie nakładały się na ekranie.
const POSES: Record<SolidKind, Euler> = {
  sphere: new Euler(0.42, 0, -0.22),
  tetrahedron: new Euler(0.3, -0.38, 0),
  cube: new Euler(0.52, 0.72, 0),
}

// Wszystkie bryły są wpisane w kulę o promieniu 1, przez co kula wyglądałaby na największą.
const SCALES: Record<SolidKind, number> = { sphere: 0.84, tetrahedron: 1.08, cube: 1 }

// Jaką część krótszego boku miejsca zajmuje bryła.
const FILL = 0.66

// Promień koła jako wielokrotność wysokości miejsca: bryła o krok dalej jest już niewidoczna,
// a jej tor nadal wyraźnie się wygina.
const WHEEL_RADIUS = 1.6

// Udział koloru tła w kolorze tylnych krawędzi.
const BACK_MIX = 0.5

const OUTLINE_SEGMENTS = 96

// Obrót bryły na jeden krok koła: 45 stopni w chwili, gdy bryły się mijają.
const TURN_PER_STEP = Math.PI / 2

export interface SolidSpec {
  kind: SolidKind
  color: string
}

/** Gdzie narysować bryłę: jej miejsce na ekranie (w pikselach CSS) i położenie na kole. */
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
  turn: Group
  materials: LineMaterial[]
  orient(angle: number): void
}

// Wygładzane końce linii (alphaToCoverage) zostawiają jaśniejsze pierścienie na łączeniach
// krótkich odcinków, dlatego końce są ostre, a wygładzanie robi renderer.
function lineMaterial(color: Color): LineMaterial {
  return new LineMaterial({ color, depthTest: false, depthWrite: false })
}

function lines(
  positions: number[] | Float32Array,
  material: LineMaterial,
  renderOrder: number,
): LineSegments2 {
  const segments = new LineSegments2(new LineSegmentsGeometry().setPositions(positions), material)
  segments.renderOrder = renderOrder
  segments.frustumCulled = false
  return segments
}

const UP = new Vector3(0, 1, 0)

// Oba bufory mieszczą wszystkie krawędzie, więc przy obrocie tylko nadpisujemy liczby.
function sortEdges(
  edges: Edge[],
  pose: Euler,
  angle: number,
  front: LineSegments2,
  back: LineSegments2,
) {
  const normal = new Vector3()
  const frontBuffer = (front.geometry.getAttribute('instanceStart') as InterleavedBufferAttribute)
    .data
  const backBuffer = (back.geometry.getAttribute('instanceStart') as InterleavedBufferAttribute)
    .data
  let frontCount = 0
  let backCount = 0
  for (const edge of edges) {
    // Kamera patrzy wzdłuż -z, więc ściana jest z przodu, gdy jej normalna ma dodatnie z.
    const facesCamera = edge.normals.some(
      (n) =>
        normal
          .set(...n)
          .applyEuler(pose)
          .applyAxisAngle(UP, angle).z > 0,
    )
    const target = facesCamera ? frontBuffer : backBuffer
    const index = facesCamera ? frontCount++ : backCount++
    target.array.set([...edge.a, ...edge.b], index * 6)
  }
  frontBuffer.needsUpdate = true
  backBuffer.needsUpdate = true
  front.geometry.instanceCount = frontCount
  back.geometry.instanceCount = backCount
}

// Sama siatka kuli nie pokazuje jej obrysu, więc obrys rysujemy osobno, zawsze przodem do kamery.
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
  const edges = solidEdges(kind)
  // Osobne tablice, bo three.js nie kopiuje przekazanej tablicy Float32Array.
  const front = lines(new Float32Array(edges.length * 6), frontMaterial, 1)
  const back = lines(new Float32Array(edges.length * 6), backMaterial, 0)
  const orient = (angle: number) => sortEdges(edges, pose, angle, front, back)
  orient(0)

  const body = new Group()
  body.rotation.copy(pose)
  body.add(back, front)
  body.scale.setScalar(SCALES[kind])

  const turn = new Group()
  turn.add(body)
  const group = new Group()
  group.add(turn)
  if (kind === 'sphere') {
    const outline = lines(outlinePositions(), frontMaterial, 1)
    outline.scale.setScalar(SCALES.sphere)
    group.add(outline)
  }
  return { group, turn, materials: [frontMaterial, backMaterial], orient }
}

export function createSolidScene(
  canvas: HTMLCanvasElement,
  specs: SolidSpec[],
  background: string,
): SolidScene {
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

  // Jednostka świata to piksel CSS; oś y jest skierowana w górę, więc punkt strony y rysujemy w -y.
  // Bryły mają setki pikseli głębokości, więc zakres głębi musi je całe zmieścić.
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
      // Największa bryła wystaje trochę poza kulę o promieniu 1.
      const reach = radius * 1.1
      solid.group.visible =
        x + reach > 0 && x - reach < width && y + reach > 0 && y - reach < height
      solid.group.position.set(x, -y, 0)
      solid.group.scale.setScalar(radius)
      const angle = Math.max(-1, Math.min(1, phase)) * TURN_PER_STEP
      if (Math.abs(angle - solid.turn.rotation.y) > 1e-4) {
        solid.turn.rotation.y = angle
        solid.orient(angle)
      }
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
