/**
 * Line Tool - Draw straight lines.
 */

import { BaseDrawTool } from '../base/BaseDrawTool'
import { defineToolWithFactory, ToolRegistry } from '../registry'
import type { Point, CanvasMouseEvent, DrawingContext } from '@/core/types'
import { LayerType } from '@/core/types'
import { bresenhamLine } from '@/lib/drawing'

export class LineTool extends BaseDrawTool {
  private previewPoints: Point[] = []

  protected override onDrawStart(
    pos: Point,
    _event: CanvasMouseEvent,
    ctx: DrawingContext
  ): void {
    this.prepareUndo(ctx)
    this.previewPoints = [pos]
  }

  protected override onDrawMove(
    pos: Point,
    _event: CanvasMouseEvent,
    _ctx: DrawingContext
  ): void {
    const startPoint = this.getStartPoint()
    if (!startPoint) {
      return
    }

    // Calculate preview line
    this.previewPoints = bresenhamLine(
      startPoint.x,
      startPoint.y,
      pos.x,
      pos.y
    )
  }

  protected override onDrawEnd(
    pos: Point,
    _event: CanvasMouseEvent,
    ctx: DrawingContext
  ): void {
    const startPoint = this.getStartPoint()
    if (!startPoint) {
      return
    }

    // Draw final line
    const points = bresenhamLine(startPoint.x, startPoint.y, pos.x, pos.y)

    for (const point of points) {
      this.drawBrush(point, ctx)
    }

    this.previewPoints = []
    this.commitUndo(ctx)
  }

  protected override onDrawCancel(): void {
    this.previewPoints = []
    super.onDrawCancel()
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
    hint: 'Click and drag to draw a line',
    shortcut: 'l',
  }
)

ToolRegistry.register(LineToolDefinition)
