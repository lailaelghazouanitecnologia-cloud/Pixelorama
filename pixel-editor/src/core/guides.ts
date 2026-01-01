/**
 * Guide System
 * Based on Pixelorama's guide functionality
 * Provides horizontal, vertical, and perspective guides for precise positioning
 */

export interface Guide {
  id: string
  type: 'horizontal' | 'vertical'
  position: number // In canvas pixels
  color: string
  locked: boolean
}

// Vanishing point for perspective guides
export interface VanishingPoint {
  id: string
  x: number
  y: number
  color: string
  visible: boolean
}

// Perspective guide line extending from vanishing point
export interface PerspectiveLine {
  id: string
  vanishingPointId: string
  angle: number // Angle in radians from vanishing point
  color: string
  visible: boolean
}

// Complete perspective guide system
export interface PerspectiveGuide {
  id: string
  name: string
  type: 'one-point' | 'two-point' | 'three-point' | 'custom'
  vanishingPoints: VanishingPoint[]
  lines: PerspectiveLine[]
  visible: boolean
  color: string
  opacity: number
}

export interface GuideState {
  guides: Guide[]
  perspectiveGuides: PerspectiveGuide[]
  showGuides: boolean
  showPerspectiveGuides: boolean
  snapToGuides: boolean
  guideColor: string
}

// Generate unique guide ID
export function generateGuideId(): string {
  return `guide-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

// Create a new guide
export function createGuide(
  type: 'horizontal' | 'vertical',
  position: number,
  color: string = '#00ffff'
): Guide {
  return {
    id: generateGuideId(),
    type,
    position,
    color,
    locked: false,
  }
}

// Snap a position to the nearest guide
export function snapToGuide(
  position: number,
  guides: Guide[],
  type: 'horizontal' | 'vertical',
  snapDistance: number = 5
): { snapped: boolean; position: number; guideId?: string } {
  const relevantGuides = guides.filter(g => g.type === type)

  for (const guide of relevantGuides) {
    if (Math.abs(position - guide.position) <= snapDistance) {
      return {
        snapped: true,
        position: guide.position,
        guideId: guide.id,
      }
    }
  }

  return { snapped: false, position }
}

// Find guide at position
export function findGuideAt(
  x: number,
  y: number,
  guides: Guide[],
  tolerance: number = 3
): Guide | null {
  for (const guide of guides) {
    if (guide.type === 'horizontal') {
      if (Math.abs(y - guide.position) <= tolerance) {
        return guide
      }
    } else {
      if (Math.abs(x - guide.position) <= tolerance) {
        return guide
      }
    }
  }
  return null
}

// Check if point is near any guide
export function isNearGuide(
  x: number,
  y: number,
  guides: Guide[],
  tolerance: number = 5
): boolean {
  return findGuideAt(x, y, guides, tolerance) !== null
}

// Add center guides
export function addCenterGuides(
  width: number,
  height: number,
  color: string = '#00ffff'
): Guide[] {
  return [
    createGuide('horizontal', Math.floor(height / 2), color),
    createGuide('vertical', Math.floor(width / 2), color),
  ]
}

// Add thirds guides (rule of thirds)
export function addThirdsGuides(
  width: number,
  height: number,
  color: string = '#00ff00'
): Guide[] {
  return [
    createGuide('horizontal', Math.floor(height / 3), color),
    createGuide('horizontal', Math.floor((height * 2) / 3), color),
    createGuide('vertical', Math.floor(width / 3), color),
    createGuide('vertical', Math.floor((width * 2) / 3), color),
  ]
}

// Remove all guides
export function clearGuides(): Guide[] {
  return []
}

// ==========================================
// PERSPECTIVE GUIDE FUNCTIONS
// ==========================================

// Generate unique perspective guide ID
export function generatePerspectiveId(): string {
  return `perspective-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

// Create a vanishing point
export function createVanishingPoint(
  x: number,
  y: number,
  color: string = '#ff6b6b'
): VanishingPoint {
  return {
    id: generatePerspectiveId(),
    x,
    y,
    color,
    visible: true,
  }
}

// Create a perspective line from vanishing point
export function createPerspectiveLine(
  vanishingPointId: string,
  angle: number,
  color: string = '#4ecdc4'
): PerspectiveLine {
  return {
    id: generatePerspectiveId(),
    vanishingPointId,
    angle,
    color,
    visible: true,
  }
}

// Create a one-point perspective guide (single vanishing point on horizon)
export function createOnePointPerspective(
  canvasWidth: number,
  canvasHeight: number,
  vanishingPointX?: number,
  vanishingPointY?: number,
  lineCount: number = 8
): PerspectiveGuide {
  const vpX = vanishingPointX ?? Math.floor(canvasWidth / 2)
  const vpY = vanishingPointY ?? Math.floor(canvasHeight / 2)

  const vp = createVanishingPoint(vpX, vpY, '#ff6b6b')

  // Create evenly spaced lines radiating from vanishing point
  const lines: PerspectiveLine[] = []
  const angleStep = Math.PI / lineCount

  for (let i = 0; i < lineCount; i++) {
    const angle = -Math.PI / 2 + (i * angleStep)
    lines.push(createPerspectiveLine(vp.id, angle, '#4ecdc4'))
  }

  return {
    id: generatePerspectiveId(),
    name: 'One-Point Perspective',
    type: 'one-point',
    vanishingPoints: [vp],
    lines,
    visible: true,
    color: '#4ecdc4',
    opacity: 0.6,
  }
}

// Create a two-point perspective guide (two vanishing points on horizon)
export function createTwoPointPerspective(
  canvasWidth: number,
  canvasHeight: number,
  horizonY?: number,
  lineCount: number = 6
): PerspectiveGuide {
  const hY = horizonY ?? Math.floor(canvasHeight / 2)

  // Left and right vanishing points
  const vpLeft = createVanishingPoint(-canvasWidth * 0.5, hY, '#ff6b6b')
  const vpRight = createVanishingPoint(canvasWidth * 1.5, hY, '#ff9f43')

  const lines: PerspectiveLine[] = []

  // Lines from left VP (going right and down)
  for (let i = 0; i < lineCount; i++) {
    const angle = -Math.PI / 4 + (i * (Math.PI / 2) / lineCount)
    lines.push(createPerspectiveLine(vpLeft.id, angle, '#4ecdc4'))
  }

  // Lines from right VP (going left and down)
  for (let i = 0; i < lineCount; i++) {
    const angle = Math.PI - Math.PI / 4 + (i * (Math.PI / 2) / lineCount)
    lines.push(createPerspectiveLine(vpRight.id, angle, '#45b7d1'))
  }

  return {
    id: generatePerspectiveId(),
    name: 'Two-Point Perspective',
    type: 'two-point',
    vanishingPoints: [vpLeft, vpRight],
    lines,
    visible: true,
    color: '#4ecdc4',
    opacity: 0.6,
  }
}

// Create a three-point perspective guide (for dramatic angles)
export function createThreePointPerspective(
  canvasWidth: number,
  canvasHeight: number,
  lineCount: number = 4
): PerspectiveGuide {
  const centerX = Math.floor(canvasWidth / 2)
  const centerY = Math.floor(canvasHeight / 2)

  // Three vanishing points: left, right (on horizon), and bottom (for looking down)
  const vpLeft = createVanishingPoint(-canvasWidth * 0.3, centerY * 0.6, '#ff6b6b')
  const vpRight = createVanishingPoint(canvasWidth * 1.3, centerY * 0.6, '#ff9f43')
  const vpBottom = createVanishingPoint(centerX, canvasHeight * 2, '#a55eea')

  const lines: PerspectiveLine[] = []

  // Lines from each vanishing point
  for (let i = 0; i < lineCount; i++) {
    const offsetAngle = (i - lineCount / 2) * (Math.PI / 8 / lineCount)

    // From left VP
    lines.push(createPerspectiveLine(vpLeft.id, -Math.PI / 6 + offsetAngle, '#4ecdc4'))

    // From right VP
    lines.push(createPerspectiveLine(vpRight.id, Math.PI + Math.PI / 6 + offsetAngle, '#45b7d1'))

    // From bottom VP (vertical lines converging upward)
    lines.push(createPerspectiveLine(vpBottom.id, -Math.PI / 2 + offsetAngle, '#a55eea'))
  }

  return {
    id: generatePerspectiveId(),
    name: 'Three-Point Perspective',
    type: 'three-point',
    vanishingPoints: [vpLeft, vpRight, vpBottom],
    lines,
    visible: true,
    color: '#4ecdc4',
    opacity: 0.5,
  }
}

// Get the line equation from vanishing point at given angle
export function getPerspectiveLinePoints(
  vp: VanishingPoint,
  angle: number,
  canvasWidth: number,
  canvasHeight: number
): { x1: number; y1: number; x2: number; y2: number } {
  // Calculate line extending from VP through canvas
  const maxLength = Math.max(canvasWidth, canvasHeight) * 3

  const x2 = vp.x + Math.cos(angle) * maxLength
  const y2 = vp.y + Math.sin(angle) * maxLength

  return {
    x1: vp.x,
    y1: vp.y,
    x2,
    y2,
  }
}

// Add a custom line to a perspective guide
export function addPerspectiveLine(
  guide: PerspectiveGuide,
  vanishingPointId: string,
  angle: number
): PerspectiveGuide {
  const newLine = createPerspectiveLine(vanishingPointId, angle, guide.color)
  return {
    ...guide,
    lines: [...guide.lines, newLine],
  }
}

// Move a vanishing point
export function moveVanishingPoint(
  guide: PerspectiveGuide,
  vpId: string,
  newX: number,
  newY: number
): PerspectiveGuide {
  return {
    ...guide,
    vanishingPoints: guide.vanishingPoints.map(vp =>
      vp.id === vpId ? { ...vp, x: newX, y: newY } : vp
    ),
  }
}

// Toggle perspective guide visibility
export function togglePerspectiveGuide(guide: PerspectiveGuide): PerspectiveGuide {
  return {
    ...guide,
    visible: !guide.visible,
  }
}

// Find closest perspective line to a point (for snapping)
export function findClosestPerspectiveLine(
  x: number,
  y: number,
  guide: PerspectiveGuide,
  canvasWidth: number,
  canvasHeight: number,
  tolerance: number = 5
): { line: PerspectiveLine; distance: number } | null {
  let closest: { line: PerspectiveLine; distance: number } | null = null

  for (const line of guide.lines) {
    if (!line.visible) continue

    const vp = guide.vanishingPoints.find(v => v.id === line.vanishingPointId)
    if (!vp || !vp.visible) continue

    // Calculate distance from point to line
    const linePoints = getPerspectiveLinePoints(vp, line.angle, canvasWidth, canvasHeight)
    const distance = pointToLineDistance(
      x, y,
      linePoints.x1, linePoints.y1,
      linePoints.x2, linePoints.y2
    )

    if (distance <= tolerance && (!closest || distance < closest.distance)) {
      closest = { line, distance }
    }
  }

  return closest
}

// Helper: Calculate distance from point to line segment
function pointToLineDistance(
  px: number, py: number,
  x1: number, y1: number,
  x2: number, y2: number
): number {
  const A = px - x1
  const B = py - y1
  const C = x2 - x1
  const D = y2 - y1

  const dot = A * C + B * D
  const lenSq = C * C + D * D
  let param = -1

  if (lenSq !== 0) {
    param = dot / lenSq
  }

  let xx: number, yy: number

  if (param < 0) {
    xx = x1
    yy = y1
  } else if (param > 1) {
    xx = x2
    yy = y2
  } else {
    xx = x1 + param * C
    yy = y1 + param * D
  }

  const dx = px - xx
  const dy = py - yy

  return Math.sqrt(dx * dx + dy * dy)
}
