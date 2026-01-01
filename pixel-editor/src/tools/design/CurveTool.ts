/**
 * Curve Tool - Draw Bézier curves.
 * Based on Pixelorama's CurveTool.gd
 *
 * Usage:
 * 1. Click to place start point
 * 2. Click to place end point
 * 3. Click to place control point(s)
 * 4. Double-click or Enter to commit the curve
 */

import { BaseDrawTool } from '../base/BaseDrawTool'
import { defineToolWithFactory, ToolRegistry } from '../registry'
import type { Point, CanvasMouseEvent, DrawingContext } from '@/core/types'
import { LayerType } from '@/core/types'

// Curve mode: quadratic (1 control point) or cubic (2 control points)
export type CurveMode = 'quadratic' | 'cubic'

// State machine for curve creation
export type CurveState = 'idle' | 'start_placed' | 'end_placed' | 'control1_placed' | 'ready'

interface CurvePoints {
  start: Point | null
  end: Point | null
  control1: Point | null
  control2: Point | null
}

export class CurveTool extends BaseDrawTool {
  private curveMode: CurveMode = 'quadratic'
  private curveState: CurveState = 'idle'
  private points: CurvePoints = {
    start: null,
    end: null,
    control1: null,
    control2: null,
  }
  private previewPoints: Point[] = []
  private lastClickTime: number = 0

  /**
   * Set curve mode (quadratic or cubic)
   */
  setCurveMode(mode: CurveMode): void {
    this.curveMode = mode
    this.resetCurve()
  }

  getCurveMode(): CurveMode {
    return this.curveMode
  }

  /**
   * Reset the curve state
   */
  resetCurve(): void {
    this.curveState = 'idle'
    this.points = { start: null, end: null, control1: null, control2: null }
    this.previewPoints = []
  }

  protected override onDrawStart(
    pos: Point,
    event: CanvasMouseEvent,
    ctx: DrawingContext
  ): void {
    const now = Date.now()
    const isDoubleClick = now - this.lastClickTime < 300
    this.lastClickTime = now

    // Double-click commits the curve
    if (isDoubleClick && this.curveState !== 'idle') {
      this.commitCurve(ctx)
      return
    }

    switch (this.curveState) {
      case 'idle':
        // Place start point
        this.prepareUndo(ctx)
        this.points.start = pos
        this.curveState = 'start_placed'
        break

      case 'start_placed':
        // Place end point
        this.points.end = pos
        this.curveState = 'end_placed'
        break

      case 'end_placed':
        // Place first control point
        this.points.control1 = pos
        if (this.curveMode === 'quadratic') {
          this.curveState = 'ready'
        } else {
          this.curveState = 'control1_placed'
        }
        break

      case 'control1_placed':
        // Place second control point (cubic only)
        this.points.control2 = pos
        this.curveState = 'ready'
        break

      case 'ready':
        // Commit and start new curve
        this.commitCurve(ctx)
        this.prepareUndo(ctx)
        this.points.start = pos
        this.curveState = 'start_placed'
        break
    }

    this.updatePreview(pos)
  }

  protected override onDrawMove(
    pos: Point,
    _event: CanvasMouseEvent,
    _ctx: DrawingContext
  ): void {
    this.updatePreview(pos)
  }

  protected override onDrawEnd(
    _pos: Point,
    _event: CanvasMouseEvent,
    _ctx: DrawingContext
  ): void {
    // Don't end drawing on mouse up for curve tool
    // We want click-to-place behavior
  }

  /**
   * Update the preview curve based on current state
   */
  private updatePreview(mousePos: Point): void {
    this.previewPoints = []

    if (!this.points.start) return

    const start = this.points.start
    const end = this.points.end || mousePos
    const control1 = this.points.control1 || (this.points.end ? mousePos : this.getMidpoint(start, end))
    const control2 = this.points.control2 || (this.curveState === 'control1_placed' ? mousePos : control1)

    if (this.curveMode === 'quadratic') {
      this.previewPoints = this.calculateQuadraticBezier(start, control1, end)
    } else {
      this.previewPoints = this.calculateCubicBezier(start, control1, control2, end)
    }
  }

  /**
   * Commit the curve to the canvas
   */
  private commitCurve(ctx: DrawingContext): void {
    if (this.previewPoints.length === 0) {
      this.resetCurve()
      return
    }

    // Draw all points in the curve
    for (const point of this.previewPoints) {
      this.drawBrush(point, ctx)
    }

    this.commitUndo(ctx)
    this.resetCurve()
  }

  /**
   * Get midpoint between two points
   */
  private getMidpoint(p1: Point, p2: Point): Point {
    return {
      x: Math.floor((p1.x + p2.x) / 2),
      y: Math.floor((p1.y + p2.y) / 2),
    }
  }

  /**
   * Calculate points on a quadratic Bézier curve
   * P(t) = (1-t)²P0 + 2(1-t)tP1 + t²P2
   */
  private calculateQuadraticBezier(p0: Point, p1: Point, p2: Point): Point[] {
    const points: Point[] = []
    const seen = new Set<string>()

    // Estimate number of steps based on curve length
    const steps = this.estimateSteps(p0, p1, p2)

    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const mt = 1 - t

      const x = Math.round(mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x)
      const y = Math.round(mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y)

      const key = `${x},${y}`
      if (!seen.has(key)) {
        seen.add(key)
        points.push({ x, y })
      }
    }

    // Fill gaps using line algorithm
    return this.fillGaps(points)
  }

  /**
   * Calculate points on a cubic Bézier curve
   * P(t) = (1-t)³P0 + 3(1-t)²tP1 + 3(1-t)t²P2 + t³P3
   */
  private calculateCubicBezier(p0: Point, p1: Point, p2: Point, p3: Point): Point[] {
    const points: Point[] = []
    const seen = new Set<string>()

    // Estimate number of steps based on curve length
    const steps = this.estimateStepsCubic(p0, p1, p2, p3)

    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const mt = 1 - t

      const x = Math.round(
        mt * mt * mt * p0.x +
        3 * mt * mt * t * p1.x +
        3 * mt * t * t * p2.x +
        t * t * t * p3.x
      )
      const y = Math.round(
        mt * mt * mt * p0.y +
        3 * mt * mt * t * p1.y +
        3 * mt * t * t * p2.y +
        t * t * t * p3.y
      )

      const key = `${x},${y}`
      if (!seen.has(key)) {
        seen.add(key)
        points.push({ x, y })
      }
    }

    // Fill gaps using line algorithm
    return this.fillGaps(points)
  }

  /**
   * Estimate number of steps for quadratic curve
   */
  private estimateSteps(p0: Point, p1: Point, p2: Point): number {
    const d1 = this.distance(p0, p1)
    const d2 = this.distance(p1, p2)
    return Math.max(Math.ceil((d1 + d2) * 2), 20)
  }

  /**
   * Estimate number of steps for cubic curve
   */
  private estimateStepsCubic(p0: Point, p1: Point, p2: Point, p3: Point): number {
    const d1 = this.distance(p0, p1)
    const d2 = this.distance(p1, p2)
    const d3 = this.distance(p2, p3)
    return Math.max(Math.ceil((d1 + d2 + d3) * 2), 30)
  }

  /**
   * Calculate distance between two points
   */
  private distance(p1: Point, p2: Point): number {
    const dx = p2.x - p1.x
    const dy = p2.y - p1.y
    return Math.sqrt(dx * dx + dy * dy)
  }

  /**
   * Fill gaps between points using Bresenham-like interpolation
   */
  private fillGaps(points: Point[]): Point[] {
    if (points.length < 2) return points

    const result: Point[] = []
    const seen = new Set<string>()

    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i]
      const p2 = points[i + 1]

      // Add current point
      const key1 = `${p1.x},${p1.y}`
      if (!seen.has(key1)) {
        seen.add(key1)
        result.push(p1)
      }

      // If there's a gap, interpolate
      const dx = Math.abs(p2.x - p1.x)
      const dy = Math.abs(p2.y - p1.y)

      if (dx > 1 || dy > 1) {
        const linePoints = this.bresenham(p1.x, p1.y, p2.x, p2.y)
        for (const lp of linePoints) {
          const key = `${lp.x},${lp.y}`
          if (!seen.has(key)) {
            seen.add(key)
            result.push(lp)
          }
        }
      }
    }

    // Add last point
    const last = points[points.length - 1]
    const lastKey = `${last.x},${last.y}`
    if (!seen.has(lastKey)) {
      result.push(last)
    }

    return result
  }

  /**
   * Bresenham's line algorithm for filling gaps
   */
  private bresenham(x0: number, y0: number, x1: number, y1: number): Point[] {
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

      if (x === x1 && y === y1) break

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

  protected override onDrawCancel(): void {
    this.resetCurve()
    super.onDrawCancel()
  }

  override drawPreview(ctx: CanvasRenderingContext2D): void {
    // Draw preview curve
    if (this.previewPoints.length > 0) {
      ctx.fillStyle = 'rgba(59, 130, 246, 0.5)'
      const halfSize = Math.floor(this.brushSize / 2)

      for (const point of this.previewPoints) {
        ctx.fillRect(
          point.x - halfSize,
          point.y - halfSize,
          this.brushSize,
          this.brushSize
        )
      }
    }

    // Draw control points
    this.drawControlPoints(ctx)
  }

  /**
   * Draw control point indicators
   */
  private drawControlPoints(ctx: CanvasRenderingContext2D): void {
    const pointSize = 6

    // Start point (green)
    if (this.points.start) {
      ctx.fillStyle = '#22c55e'
      ctx.fillRect(
        this.points.start.x - pointSize / 2,
        this.points.start.y - pointSize / 2,
        pointSize,
        pointSize
      )
    }

    // End point (red)
    if (this.points.end) {
      ctx.fillStyle = '#ef4444'
      ctx.fillRect(
        this.points.end.x - pointSize / 2,
        this.points.end.y - pointSize / 2,
        pointSize,
        pointSize
      )
    }

    // Control point 1 (blue)
    if (this.points.control1) {
      ctx.fillStyle = '#3b82f6'
      ctx.beginPath()
      ctx.arc(this.points.control1.x, this.points.control1.y, pointSize / 2, 0, Math.PI * 2)
      ctx.fill()

      // Draw line from start to control1
      if (this.points.start) {
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.5)'
        ctx.setLineDash([2, 2])
        ctx.beginPath()
        ctx.moveTo(this.points.start.x, this.points.start.y)
        ctx.lineTo(this.points.control1.x, this.points.control1.y)
        ctx.stroke()
        ctx.setLineDash([])
      }
    }

    // Control point 2 (purple, cubic only)
    if (this.points.control2) {
      ctx.fillStyle = '#a855f7'
      ctx.beginPath()
      ctx.arc(this.points.control2.x, this.points.control2.y, pointSize / 2, 0, Math.PI * 2)
      ctx.fill()

      // Draw line from control2 to end
      if (this.points.end) {
        ctx.strokeStyle = 'rgba(168, 85, 247, 0.5)'
        ctx.setLineDash([2, 2])
        ctx.beginPath()
        ctx.moveTo(this.points.control2.x, this.points.control2.y)
        ctx.lineTo(this.points.end.x, this.points.end.y)
        ctx.stroke()
        ctx.setLineDash([])
      }
    }
  }

  /**
   * Get current curve state for UI display
   */
  getCurveState(): CurveState {
    return this.curveState
  }

  /**
   * Get hint text based on current state
   */
  getHintText(): string {
    switch (this.curveState) {
      case 'idle':
        return 'Click to place start point'
      case 'start_placed':
        return 'Click to place end point'
      case 'end_placed':
        return `Click to place control point${this.curveMode === 'cubic' ? ' 1' : ''}`
      case 'control1_placed':
        return 'Click to place control point 2'
      case 'ready':
        return 'Double-click to commit curve, or click to start new'
      default:
        return ''
    }
  }
}

// Register the tool
export const CurveToolDefinition = defineToolWithFactory(
  'curve',
  'Curve',
  'spline',
  'design',
  () => new CurveTool(),
  {
    layerTypes: [LayerType.PIXEL],
    hint: 'Click to place points, double-click to commit Bézier curve',
    shortcut: 'c',
  }
)

ToolRegistry.register(CurveToolDefinition)
