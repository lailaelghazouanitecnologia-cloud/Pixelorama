/**
 * Ellipse Tool - Draw ellipses and circles.
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
    _event: CanvasMouseEvent,
    ctx: DrawingContext
  ): void {
    this.prepareUndo(ctx)
    this.previewRect = { x: pos.x, y: pos.y, width: 0, height: 0 }
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

    const x = Math.min(startPoint.x, pos.x)
    const y = Math.min(startPoint.y, pos.y)
    const width = Math.abs(pos.x - startPoint.x) + 1
    const height = Math.abs(pos.y - startPoint.y) + 1

    this.previewRect = { x, y, width, height }
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

    const x = Math.min(startPoint.x, pos.x)
    const y = Math.min(startPoint.y, pos.y)
    const width = Math.abs(pos.x - startPoint.x) + 1
    const height = Math.abs(pos.y - startPoint.y) + 1

    const cx = x + Math.floor(width / 2)
    const cy = y + Math.floor(height / 2)
    const rx = Math.floor(width / 2)
    const ry = Math.floor(height / 2)

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
  }
}

// Register the tool
export const EllipseToolDefinition = defineToolWithFactory(
  'EllipseTool',
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
