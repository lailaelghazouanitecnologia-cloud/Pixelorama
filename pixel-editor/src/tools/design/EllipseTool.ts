/**
 * Ellipse Tool - Draw ellipses and circles with circle constraint.
 * Based on Pixelorama's EllipseTool.gd
 *
 * Features:
 * - Hold Shift to constrain to circle
 * - Shows dimensions during drawing
 */

import { BaseDrawTool } from '../base/BaseDrawTool'
import { defineToolWithFactory, ToolRegistry } from '../registry'
import type { Point, Rect, CanvasMouseEvent, DrawingContext, ToolConfig } from '@/core/types'
import { LayerType } from '@/core/types'
import { ellipsePoints, ellipsePointsFilled } from '@/lib/drawing'

interface EllipseConfig extends ToolConfig {
  filled: boolean
}

export class EllipseTool extends BaseDrawTool {
  private filled: boolean = false
  private previewRect: Rect | null = null
  private isShiftHeld: boolean = false

  override getConfig(): EllipseConfig {
    return {
      ...super.getConfig(),
      filled: this.filled,
    }
  }

  override setConfig(config: Partial<EllipseConfig>): void {
    if (config.filled !== undefined) {
      this.filled = config.filled
    }
    super.setConfig(config)
  }

  protected override onDrawStart(
    pos: Point,
    event: CanvasMouseEvent,
    ctx: DrawingContext
  ): void {
    this.prepareUndo(ctx)
    this.previewRect = { x: pos.x, y: pos.y, width: 0, height: 0 }
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
    this.previewRect = this.calculateRect(startPoint, pos, event.shiftKey)
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

    const rect = this.calculateRect(startPoint, pos, event.shiftKey)

    const cx = rect.x + Math.floor(rect.width / 2)
    const cy = rect.y + Math.floor(rect.height / 2)
    const rx = Math.floor(rect.width / 2)
    const ry = Math.floor(rect.height / 2)

    const points = this.filled
      ? ellipsePointsFilled(cx, cy, rx, ry)
      : ellipsePoints(cx, cy, rx, ry)

    for (const point of points) {
      this.drawBrush(point, ctx)
    }

    this.previewRect = null
    this.commitUndo(ctx)
  }

  protected override onDrawCancel(): void {
    this.previewRect = null
    super.onDrawCancel()
  }

  /**
   * Calculate bounding rectangle from start and end points
   * If constrainCircle is true, constrains to a circle (square bounds)
   */
  private calculateRect(start: Point, end: Point, constrainCircle: boolean): Rect {
    let width = Math.abs(end.x - start.x) + 1
    let height = Math.abs(end.y - start.y) + 1

    if (constrainCircle) {
      // Use the larger dimension for both
      const size = Math.max(width, height)
      width = size
      height = size
    }

    // Calculate top-left corner based on drag direction
    const x = end.x >= start.x ? start.x : start.x - width + 1
    const y = end.y >= start.y ? start.y : start.y - height + 1

    return { x, y, width, height }
  }

  override drawPreview(ctx: CanvasRenderingContext2D): void {
    if (!this.previewRect) {
      return
    }

    const { x, y, width, height } = this.previewRect
    const cx = x + width / 2
    const cy = y + height / 2
    const rx = width / 2
    const ry = height / 2

    ctx.strokeStyle = 'rgba(59, 130, 246, 0.8)'
    ctx.lineWidth = 1

    ctx.beginPath()
    ctx.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI)

    if (this.filled) {
      ctx.fillStyle = 'rgba(59, 130, 246, 0.3)'
      ctx.fill()
    }

    ctx.stroke()

    // Draw dimensions info
    if (width > 1 || height > 1) {
      const dimText = this.isShiftHeld
        ? `⌀ ${width}`  // Diameter for circle
        : `${width} × ${height}`

      ctx.font = '10px monospace'
      ctx.textBaseline = 'top'

      // Position text at bottom-right of bounding box
      const textX = x + width + 4
      const textY = y + height + 4

      // Draw background for readability
      const metrics = ctx.measureText(dimText)

      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
      ctx.fillRect(textX - 2, textY - 2, metrics.width + 4, 14)

      // Draw text (yellow when shift is held to indicate circle mode)
      ctx.fillStyle = this.isShiftHeld ? '#fbbf24' : '#ffffff'
      ctx.fillText(dimText, textX, textY)
    }
  }
}

// Register the tool
export const EllipseToolDefinition = defineToolWithFactory(
  'ellipse',
  'Ellipse',
  'circle',
  'design',
  () => new EllipseTool(),
  {
    layerTypes: [LayerType.PIXEL],
    hint: 'Click and drag to draw an ellipse. Hold Shift for circle',
    shortcut: 'o',
  }
)

ToolRegistry.register(EllipseToolDefinition)
