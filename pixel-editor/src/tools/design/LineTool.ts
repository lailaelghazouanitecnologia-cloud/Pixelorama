/**
 * Line Tool - Draw straight lines with angle snapping.
 * Based on Pixelorama's LineTool.gd
 *
 * Features:
 * - Hold Shift to snap to 22.5° angle increments
 * - Shows angle and length during drawing
 */

import { BaseDrawTool } from '../base/BaseDrawTool'
import { defineToolWithFactory, ToolRegistry } from '../registry'
import type { Point, CanvasMouseEvent, DrawingContext } from '@/core/types'
import { LayerType } from '@/core/types'
import { bresenhamLine } from '@/lib/drawing'

export class LineTool extends BaseDrawTool {
  private previewPoints: Point[] = []
  private currentAngle: number = 0
  private currentLength: number = 0
  private isShiftHeld: boolean = false

  protected override onDrawStart(
    pos: Point,
    event: CanvasMouseEvent,
    ctx: DrawingContext
  ): void {
    this.prepareUndo(ctx)
    this.previewPoints = [pos]
    this.isShiftHeld = event.shiftKey
  }

  protected override onDrawMove(
    pos: Point,
    event: CanvasMouseEvent,
    _ctx: DrawingContext
  ): void {
    const startPoint = this.getStartPoint()
    if (!startPoint) {
      return
    }

    this.isShiftHeld = event.shiftKey

    // Calculate end point (with optional angle snapping)
    const endPoint = this.isShiftHeld
      ? this.getSnappedEndPoint(startPoint, pos)
      : pos

    // Calculate angle and length for display
    const dx = endPoint.x - startPoint.x
    const dy = endPoint.y - startPoint.y
    this.currentAngle = this.calculateAngle(dx, dy)
    this.currentLength = Math.sqrt(dx * dx + dy * dy)

    // Calculate preview line
    this.previewPoints = bresenhamLine(
      startPoint.x,
      startPoint.y,
      endPoint.x,
      endPoint.y
    )
  }

  protected override onDrawEnd(
    pos: Point,
    event: CanvasMouseEvent,
    ctx: DrawingContext
  ): void {
    const startPoint = this.getStartPoint()
    if (!startPoint) {
      return
    }

    // Calculate end point (with optional angle snapping)
    const endPoint = event.shiftKey
      ? this.getSnappedEndPoint(startPoint, pos)
      : pos

    // Draw final line
    const points = bresenhamLine(startPoint.x, startPoint.y, endPoint.x, endPoint.y)

    for (const point of points) {
      this.drawBrush(point, ctx)
    }

    this.previewPoints = []
    this.currentAngle = 0
    this.currentLength = 0
    this.commitUndo(ctx)
  }

  protected override onDrawCancel(): void {
    this.previewPoints = []
    this.currentAngle = 0
    this.currentLength = 0
    super.onDrawCancel()
  }

  /**
   * Calculate angle in degrees from delta x/y
   * Returns angle in 0-360 range
   */
  private calculateAngle(dx: number, dy: number): number {
    // atan2 returns angle in radians, -PI to PI
    // We convert to degrees and normalize to 0-360
    let angle = Math.atan2(-dy, dx) * (180 / Math.PI)
    if (angle < 0) angle += 360
    return angle
  }

  /**
   * Snap end point to 22.5° angle increments from start point
   * Matches Pixelorama's angle constraint behavior
   */
  private getSnappedEndPoint(start: Point, end: Point): Point {
    const dx = end.x - start.x
    const dy = end.y - start.y
    const distance = Math.sqrt(dx * dx + dy * dy)

    if (distance === 0) return end

    // Calculate current angle and snap to nearest 22.5°
    let angle = Math.atan2(dy, dx) * (180 / Math.PI)
    const snappedAngle = Math.round(angle / 22.5) * 22.5
    const snappedRad = snappedAngle * (Math.PI / 180)

    // For 45° angles (and multiples), adjust distance for pixel-perfect diagonals
    const normalizedAngle = ((snappedAngle % 90) + 90) % 90
    if (normalizedAngle === 45) {
      // For 45° diagonals, use the larger of dx or dy as the basis
      const maxDelta = Math.max(Math.abs(dx), Math.abs(dy))
      return {
        x: Math.round(start.x + Math.cos(snappedRad) * maxDelta * Math.SQRT2),
        y: Math.round(start.y + Math.sin(snappedRad) * maxDelta * Math.SQRT2),
      }
    }

    // For other angles, project onto the snapped angle direction
    return {
      x: Math.round(start.x + Math.cos(snappedRad) * distance),
      y: Math.round(start.y + Math.sin(snappedRad) * distance),
    }
  }

  override drawPreview(ctx: CanvasRenderingContext2D): void {
    if (this.previewPoints.length === 0) {
      return
    }

    ctx.fillStyle = 'rgba(59, 130, 246, 0.5)'

    for (const point of this.previewPoints) {
      const halfSize = Math.floor(this.brushSize / 2)
      ctx.fillRect(
        point.x - halfSize,
        point.y - halfSize,
        this.brushSize,
        this.brushSize
      )
    }

    // Draw angle/length info near the end point
    if (this.previewPoints.length > 1 && this.currentLength > 5) {
      const endPoint = this.previewPoints[this.previewPoints.length - 1]
      const angleText = `${this.currentAngle.toFixed(1)}°`
      const lengthText = `${Math.round(this.currentLength)}px`

      ctx.font = '10px monospace'
      ctx.textBaseline = 'bottom'

      // Position text slightly offset from end point
      const textX = endPoint.x + 8
      const textY = endPoint.y - 4

      // Draw background for readability
      const metrics1 = ctx.measureText(angleText)
      const metrics2 = ctx.measureText(lengthText)
      const maxWidth = Math.max(metrics1.width, metrics2.width)

      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
      ctx.fillRect(textX - 2, textY - 22, maxWidth + 4, 24)

      // Draw text
      ctx.fillStyle = this.isShiftHeld ? '#fbbf24' : '#ffffff'
      ctx.fillText(angleText, textX, textY - 10)
      ctx.fillStyle = '#ffffff'
      ctx.fillText(lengthText, textX, textY)
    }
  }
}

// Register the tool
export const LineToolDefinition = defineToolWithFactory(
  'line',
  'Line',
  'minus',
  'design',
  () => new LineTool(),
  {
    layerTypes: [LayerType.PIXEL],
    hint: 'Click and drag to draw a line. Hold Shift to snap to 22.5° angles',
    shortcut: 'l',
  }
)

ToolRegistry.register(LineToolDefinition)
