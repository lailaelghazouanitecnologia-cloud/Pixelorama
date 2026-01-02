/**
 * Rectangle Tool - Draw rectangles with square constraint.
 * Based on Pixelorama's RectangleTool.gd
 *
 * Features:
 * - Hold Shift to constrain to square
 * - Shows dimensions during drawing
 */

import { BaseDrawTool } from '../base/BaseDrawTool'
import { defineToolWithFactory, ToolRegistry } from '../registry'
import type { Point, Rect, CanvasMouseEvent, DrawingContext, ToolConfig } from '@/core/types'
import { LayerType } from '@/core/types'
import { rectanglePoints, rectanglePointsFilled } from '@/lib/drawing'

interface RectangleConfig extends ToolConfig {
  filled: boolean
}

export class RectangleTool extends BaseDrawTool {
  private filled: boolean = false
  private previewRect: Rect | null = null
  private isShiftHeld: boolean = false

  override getConfig(): RectangleConfig {
    return {
      ...super.getConfig(),
      filled: this.filled,
    }
  }

  override setConfig(config: Partial<RectangleConfig>): void {
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

    const points = this.filled
      ? rectanglePointsFilled(rect.x, rect.y, rect.width, rect.height)
      : rectanglePoints(rect.x, rect.y, rect.width, rect.height)

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
   * Calculate rectangle from start and end points
   * If constrainSquare is true, constrains to a square
   */
  private calculateRect(start: Point, end: Point, constrainSquare: boolean): Rect {
    let width = Math.abs(end.x - start.x) + 1
    let height = Math.abs(end.y - start.y) + 1

    if (constrainSquare) {
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

    ctx.strokeStyle = 'rgba(59, 130, 246, 0.8)'
    ctx.lineWidth = 1

    if (this.filled) {
      ctx.fillStyle = 'rgba(59, 130, 246, 0.3)'
      ctx.fillRect(x, y, width, height)
    }

    ctx.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1)

    // Draw dimensions info
    if (width > 1 || height > 1) {
      const dimText = `${width} × ${height}`

      ctx.font = '10px monospace'
      ctx.textBaseline = 'top'

      // Position text at bottom-right of rectangle
      const textX = x + width + 4
      const textY = y + height + 4

      // Draw background for readability
      const metrics = ctx.measureText(dimText)

      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
      ctx.fillRect(textX - 2, textY - 2, metrics.width + 4, 14)

      // Draw text (yellow when shift is held to indicate square mode)
      ctx.fillStyle = this.isShiftHeld ? '#fbbf24' : '#ffffff'
      ctx.fillText(dimText, textX, textY)
    }
  }
}

// Register the tool
export const RectangleToolDefinition = defineToolWithFactory(
  'rectangle',
  'Rectangle',
  'square',
  'design',
  () => new RectangleTool(),
  {
    layerTypes: [LayerType.PIXEL],
    hint: 'Click and drag to draw a rectangle. Hold Shift for square',
    shortcut: 'r',
  }
)

ToolRegistry.register(RectangleToolDefinition)
