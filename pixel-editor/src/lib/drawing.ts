/**
 * Drawing algorithms and utilities.
 * Implements standard pixel art algorithms.
 */

import type { Point, Color } from '@/core/types'

// ============================================================================
// Bresenham's Line Algorithm
// ============================================================================

/**
 * Generate points along a line using Bresenham's algorithm.
 * This ensures no gaps in diagonal lines.
 */
export function bresenhamLine(
  x0: number,
  y0: number,
  x1: number,
  y1: number
): Point[] {
  const points: Point[] = []

  const dx = Math.abs(x1 - x0)
  const dy = Math.abs(y1 - y0)
  const sx = x0 < x1 ? 1 : -1
  const sy = y0 < y1 ? 1 : -1

  let err = dx - dy
  let x = x0
  let y = y0

  while (true) {
    points.push({ x, y })

    if (x === x1 && y === y1) {
      break
    }

    const e2 = 2 * err

    if (e2 > -dy) {
      err -= dy
      x += sx
    }

    if (e2 < dx) {
      err += dx
      y += sy
    }
  }

  return points
}

// ============================================================================
// Circle/Ellipse Algorithms
// ============================================================================

/**
 * Generate points for an ellipse outline using midpoint algorithm.
 */
export function ellipsePoints(
  cx: number,
  cy: number,
  rx: number,
  ry: number
): Point[] {
  const points: Point[] = []

  if (rx === 0 || ry === 0) {
    return points
  }

  let x = 0
  let y = ry

  // Initial decision parameter for region 1
  let d1 = ry * ry - rx * rx * ry + 0.25 * rx * rx
  let dx = 2 * ry * ry * x
  let dy = 2 * rx * rx * y

  // Region 1
  while (dx < dy) {
    addEllipsePoints(points, cx, cy, x, y)

    if (d1 < 0) {
      x++
      dx += 2 * ry * ry
      d1 += dx + ry * ry
    } else {
      x++
      y--
      dx += 2 * ry * ry
      dy -= 2 * rx * rx
      d1 += dx - dy + ry * ry
    }
  }

  // Decision parameter for region 2
  let d2 = ry * ry * (x + 0.5) * (x + 0.5) + rx * rx * (y - 1) * (y - 1) - rx * rx * ry * ry

  // Region 2
  while (y >= 0) {
    addEllipsePoints(points, cx, cy, x, y)

    if (d2 > 0) {
      y--
      dy -= 2 * rx * rx
      d2 += rx * rx - dy
    } else {
      y--
      x++
      dx += 2 * ry * ry
      dy -= 2 * rx * rx
      d2 += dx - dy + rx * rx
    }
  }

  return points
}

function addEllipsePoints(
  points: Point[],
  cx: number,
  cy: number,
  x: number,
  y: number
): void {
  points.push({ x: cx + x, y: cy + y })
  points.push({ x: cx - x, y: cy + y })
  points.push({ x: cx + x, y: cy - y })
  points.push({ x: cx - x, y: cy - y })
}

/**
 * Generate filled ellipse points.
 */
export function ellipsePointsFilled(
  cx: number,
  cy: number,
  rx: number,
  ry: number
): Point[] {
  const points: Point[] = []

  for (let y = -ry; y <= ry; y++) {
    for (let x = -rx; x <= rx; x++) {
      // Check if point is inside ellipse
      const nx = x / rx
      const ny = y / ry
      if (nx * nx + ny * ny <= 1) {
        points.push({ x: cx + x, y: cy + y })
      }
    }
  }

  return points
}

// ============================================================================
// Rectangle
// ============================================================================

/**
 * Generate rectangle outline points.
 */
export function rectanglePoints(
  x: number,
  y: number,
  width: number,
  height: number
): Point[] {
  const points: Point[] = []

  // Top edge
  for (let i = 0; i < width; i++) {
    points.push({ x: x + i, y })
  }

  // Right edge
  for (let i = 1; i < height; i++) {
    points.push({ x: x + width - 1, y: y + i })
  }

  // Bottom edge
  for (let i = width - 2; i >= 0; i--) {
    points.push({ x: x + i, y: y + height - 1 })
  }

  // Left edge
  for (let i = height - 2; i > 0; i--) {
    points.push({ x, y: y + i })
  }

  return points
}

/**
 * Generate filled rectangle points.
 */
export function rectanglePointsFilled(
  x: number,
  y: number,
  width: number,
  height: number
): Point[] {
  const points: Point[] = []

  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      points.push({ x: x + px, y: y + py })
    }
  }

  return points
}

// ============================================================================
// Flood Fill
// ============================================================================

/**
 * Flood fill algorithm.
 * Returns array of points that should be filled.
 */
export function floodFill(
  imageData: ImageData,
  startX: number,
  startY: number,
  tolerance: number = 0
): Point[] {
  const { width, height, data } = imageData
  const points: Point[] = []

  // Bounds check
  if (startX < 0 || startX >= width || startY < 0 || startY >= height) {
    return points
  }

  const visited = new Set<string>()
  const stack: Point[] = [{ x: startX, y: startY }]

  // Get target color
  const targetIndex = (startY * width + startX) * 4
  const targetR = data[targetIndex]
  const targetG = data[targetIndex + 1]
  const targetB = data[targetIndex + 2]
  const targetA = data[targetIndex + 3]

  const colorsMatch = (index: number): boolean => {
    const dr = Math.abs(data[index] - targetR)
    const dg = Math.abs(data[index + 1] - targetG)
    const db = Math.abs(data[index + 2] - targetB)
    const da = Math.abs(data[index + 3] - targetA)
    return dr <= tolerance && dg <= tolerance && db <= tolerance && da <= tolerance
  }

  while (stack.length > 0) {
    const { x, y } = stack.pop()!
    const key = `${x},${y}`

    if (visited.has(key)) {
      continue
    }

    if (x < 0 || x >= width || y < 0 || y >= height) {
      continue
    }

    const index = (y * width + x) * 4
    if (!colorsMatch(index)) {
      continue
    }

    visited.add(key)
    points.push({ x, y })

    // Add neighbors
    stack.push({ x: x + 1, y })
    stack.push({ x: x - 1, y })
    stack.push({ x, y: y + 1 })
    stack.push({ x, y: y - 1 })
  }

  return points
}

// ============================================================================
// Color Utilities
// ============================================================================

/**
 * Convert hex color to RGB.
 */
export function hexToRgb(hex: string): Color {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)

  if (!result) {
    return { r: 0, g: 0, b: 0, a: 255 }
  }

  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
    a: 255,
  }
}

/**
 * Convert RGB to hex color.
 */
export function rgbToHex(r: number, g: number, b: number): string {
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
}

/**
 * Get pixel color from ImageData.
 */
export function getPixelColor(
  imageData: ImageData,
  x: number,
  y: number
): Color {
  const index = (y * imageData.width + x) * 4
  return {
    r: imageData.data[index],
    g: imageData.data[index + 1],
    b: imageData.data[index + 2],
    a: imageData.data[index + 3],
  }
}

/**
 * Set pixel color in ImageData.
 */
export function setPixelColor(
  imageData: ImageData,
  x: number,
  y: number,
  color: Color
): void {
  const index = (y * imageData.width + x) * 4
  imageData.data[index] = color.r
  imageData.data[index + 1] = color.g
  imageData.data[index + 2] = color.b
  imageData.data[index + 3] = color.a
}

// ============================================================================
// Distance and Math
// ============================================================================

/**
 * Calculate distance between two points.
 */
export function distance(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x
  const dy = p2.y - p1.y
  return Math.sqrt(dx * dx + dy * dy)
}

/**
 * Clamp a value between min and max.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}
