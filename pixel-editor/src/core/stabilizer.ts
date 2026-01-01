/**
 * Stroke Stabilizer/Smoother
 * Based on Pixelorama's stabilizer implementation in BaseTool.gd
 *
 * Provides smooth drawing by creating a "pulling" effect where the brush
 * follows the cursor at a controlled rate, reducing jitter and shakiness.
 *
 * Also includes additional smoothing algorithms:
 * - Moving Average: Averages the last N points
 * - Catmull-Rom: Spline interpolation for smooth curves
 * - Gaussian: Weighted smoothing with Gaussian kernel
 */

import type { Point } from '@/core/types'

export type StabilizerMode = 'pull' | 'moving_average' | 'catmull_rom' | 'gaussian'

export interface StabilizerConfig {
  enabled: boolean
  mode: StabilizerMode
  value: number // Higher = more stable but slower response
  windowSize?: number // For moving average
}

export const DEFAULT_STABILIZER_CONFIG: StabilizerConfig = {
  enabled: false,
  mode: 'pull',
  value: 16,
  windowSize: 4,
}

/**
 * Stroke Stabilizer class
 * Manages the stabilization state for a single stroke
 */
export class Stabilizer {
  private config: StabilizerConfig
  private center: Point = { x: 0, y: 0 }
  private pointHistory: Point[] = []
  private isActive: boolean = false

  constructor(config: Partial<StabilizerConfig> = {}) {
    this.config = { ...DEFAULT_STABILIZER_CONFIG, ...config }
  }

  /**
   * Update configuration
   */
  setConfig(config: Partial<StabilizerConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * Get current configuration
   */
  getConfig(): StabilizerConfig {
    return { ...this.config }
  }

  /**
   * Start a new stroke at the given position
   */
  start(pos: Point): void {
    this.center = { ...pos }
    this.pointHistory = [{ ...pos }]
    this.isActive = true
  }

  /**
   * End the current stroke
   */
  end(): void {
    this.isActive = false
    this.pointHistory = []
  }

  /**
   * Get the stabilized position for a given raw cursor position
   */
  getStabilizedPosition(rawPos: Point): Point {
    if (!this.config.enabled || !this.isActive) {
      return rawPos
    }

    switch (this.config.mode) {
      case 'pull':
        return this.getPullStabilizedPosition(rawPos)
      case 'moving_average':
        return this.getMovingAveragePosition(rawPos)
      case 'catmull_rom':
        return this.getCatmullRomPosition(rawPos)
      case 'gaussian':
        return this.getGaussianSmoothedPosition(rawPos)
      default:
        return rawPos
    }
  }

  /**
   * Pull stabilization - Pixelorama's default method
   * The stabilized position "pulls" towards the cursor position
   */
  private getPullStabilizedPosition(rawPos: Point): Point {
    const dx = rawPos.x - this.center.x
    const dy = rawPos.y - this.center.y
    const distance = Math.sqrt(dx * dx + dy * dy)

    // Scale by stabilizer value (higher = more resistance)
    const scaledDistance = distance / this.config.value
    const angle = Math.atan2(dy, dx)

    // Move center towards cursor
    const newX = this.center.x + Math.cos(angle) * scaledDistance
    const newY = this.center.y + Math.sin(angle) * scaledDistance

    this.center = { x: newX, y: newY }

    return {
      x: Math.round(this.center.x),
      y: Math.round(this.center.y),
    }
  }

  /**
   * Moving average smoothing
   * Averages the last N positions for smooth movement
   */
  private getMovingAveragePosition(rawPos: Point): Point {
    // Add current position to history
    this.pointHistory.push({ ...rawPos })

    // Keep only the last windowSize points
    const windowSize = this.config.windowSize || 4
    while (this.pointHistory.length > windowSize) {
      this.pointHistory.shift()
    }

    // Calculate average
    let sumX = 0
    let sumY = 0
    for (const point of this.pointHistory) {
      sumX += point.x
      sumY += point.y
    }

    return {
      x: Math.round(sumX / this.pointHistory.length),
      y: Math.round(sumY / this.pointHistory.length),
    }
  }

  /**
   * Catmull-Rom spline interpolation
   * Creates smooth curves through control points
   */
  private getCatmullRomPosition(rawPos: Point): Point {
    // Add current position to history
    this.pointHistory.push({ ...rawPos })

    // Keep only the last 4 points for Catmull-Rom
    while (this.pointHistory.length > 4) {
      this.pointHistory.shift()
    }

    if (this.pointHistory.length < 4) {
      return rawPos
    }

    // Interpolate at t=1 (the end of the spline segment)
    const p0 = this.pointHistory[0]
    const p1 = this.pointHistory[1]
    const p2 = this.pointHistory[2]
    const p3 = this.pointHistory[3]

    // Catmull-Rom formula at t (using t=0.5 for middle interpolation)
    const t = 0.5 / (this.config.value / 16) // Adjust based on stabilizer value
    const t2 = t * t
    const t3 = t2 * t

    const x = 0.5 * (
      (2 * p1.x) +
      (-p0.x + p2.x) * t +
      (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
      (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3
    )

    const y = 0.5 * (
      (2 * p1.y) +
      (-p0.y + p2.y) * t +
      (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
      (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3
    )

    return { x: Math.round(x), y: Math.round(y) }
  }

  /**
   * Gaussian weighted smoothing
   * More weight to recent positions
   */
  private getGaussianSmoothedPosition(rawPos: Point): Point {
    // Add current position to history
    this.pointHistory.push({ ...rawPos })

    // Keep only the last windowSize points
    const windowSize = Math.min(this.config.value, 16)
    while (this.pointHistory.length > windowSize) {
      this.pointHistory.shift()
    }

    // Generate Gaussian weights
    const sigma = windowSize / 3
    const weights: number[] = []
    let weightSum = 0

    for (let i = 0; i < this.pointHistory.length; i++) {
      const x = i - (this.pointHistory.length - 1)
      const weight = Math.exp(-(x * x) / (2 * sigma * sigma))
      weights.push(weight)
      weightSum += weight
    }

    // Calculate weighted average
    let sumX = 0
    let sumY = 0
    for (let i = 0; i < this.pointHistory.length; i++) {
      const normalizedWeight = weights[i] / weightSum
      sumX += this.pointHistory[i].x * normalizedWeight
      sumY += this.pointHistory[i].y * normalizedWeight
    }

    return {
      x: Math.round(sumX),
      y: Math.round(sumY),
    }
  }

  /**
   * Get current stabilizer center (for visualization)
   */
  getCenter(): Point {
    return { ...this.center }
  }

  /**
   * Check if stabilizer is currently active
   */
  getIsActive(): boolean {
    return this.isActive
  }
}

/**
 * Interpolate between two points for smooth line drawing
 * Returns an array of points along the path
 */
export function interpolatePath(
  start: Point,
  end: Point,
  stepSize: number = 1
): Point[] {
  const points: Point[] = []
  const dx = end.x - start.x
  const dy = end.y - start.y
  const distance = Math.sqrt(dx * dx + dy * dy)

  if (distance === 0) {
    return [{ ...start }]
  }

  const steps = Math.ceil(distance / stepSize)
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    points.push({
      x: Math.round(start.x + dx * t),
      y: Math.round(start.y + dy * t),
    })
  }

  return points
}

/**
 * Apply pressure-based smoothing to a value
 * Useful for brush size/opacity dynamics
 */
export function smoothPressure(
  current: number,
  target: number,
  smoothingFactor: number = 0.3
): number {
  return current + (target - current) * smoothingFactor
}

/**
 * Predictive stroke ending
 * Generates additional points to complete a stroke naturally when released
 */
export function generateStrokeEnding(
  points: Point[],
  numExtraPoints: number = 3,
  decayFactor: number = 0.5
): Point[] {
  if (points.length < 2) {
    return []
  }

  const extraPoints: Point[] = []
  const lastPoint = points[points.length - 1]
  const secondLastPoint = points[points.length - 2]

  // Calculate velocity
  let vx = lastPoint.x - secondLastPoint.x
  let vy = lastPoint.y - secondLastPoint.y

  let currentPoint = { ...lastPoint }

  for (let i = 0; i < numExtraPoints; i++) {
    // Decay velocity
    vx *= decayFactor
    vy *= decayFactor

    // Add new point
    currentPoint = {
      x: Math.round(currentPoint.x + vx),
      y: Math.round(currentPoint.y + vy),
    }

    extraPoints.push(currentPoint)

    // Stop if velocity is negligible
    if (Math.abs(vx) < 0.5 && Math.abs(vy) < 0.5) {
      break
    }
  }

  return extraPoints
}

/**
 * Simplify a path by removing points that don't contribute significantly
 * Uses Ramer-Douglas-Peucker algorithm
 */
export function simplifyPath(points: Point[], epsilon: number = 1.0): Point[] {
  if (points.length <= 2) {
    return [...points]
  }

  // Find the point with the maximum distance from the line between first and last
  let maxDistance = 0
  let maxIndex = 0
  const start = points[0]
  const end = points[points.length - 1]

  for (let i = 1; i < points.length - 1; i++) {
    const distance = perpendicularDistance(points[i], start, end)
    if (distance > maxDistance) {
      maxDistance = distance
      maxIndex = i
    }
  }

  // If max distance is greater than epsilon, recursively simplify
  if (maxDistance > epsilon) {
    const left = simplifyPath(points.slice(0, maxIndex + 1), epsilon)
    const right = simplifyPath(points.slice(maxIndex), epsilon)

    // Combine results (removing duplicate point at maxIndex)
    return [...left.slice(0, -1), ...right]
  } else {
    // Just return endpoints
    return [start, end]
  }
}

/**
 * Calculate perpendicular distance from a point to a line
 */
function perpendicularDistance(point: Point, lineStart: Point, lineEnd: Point): number {
  const dx = lineEnd.x - lineStart.x
  const dy = lineEnd.y - lineStart.y

  if (dx === 0 && dy === 0) {
    // Line is actually a point
    const pdx = point.x - lineStart.x
    const pdy = point.y - lineStart.y
    return Math.sqrt(pdx * pdx + pdy * pdy)
  }

  const t = Math.max(0, Math.min(1,
    ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / (dx * dx + dy * dy)
  ))

  const projX = lineStart.x + t * dx
  const projY = lineStart.y + t * dy

  const pdx = point.x - projX
  const pdy = point.y - projY

  return Math.sqrt(pdx * pdx + pdy * pdy)
}
