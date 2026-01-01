/**
 * Guide System
 * Based on Pixelorama's guide functionality
 * Provides horizontal and vertical guides for precise positioning
 */

export interface Guide {
  id: string
  type: 'horizontal' | 'vertical'
  position: number // In canvas pixels
  color: string
  locked: boolean
}

export interface GuideState {
  guides: Guide[]
  showGuides: boolean
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
