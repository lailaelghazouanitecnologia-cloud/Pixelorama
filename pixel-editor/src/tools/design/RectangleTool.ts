/**
 * Rectangle Tool - Draw rectangles.
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

    const points = this.filled
      ? rectanglePointsFilled(x, y, width, height)
      : rectanglePoints(x, y, width, height)

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

    ctx.strokeStyle = 'rgba(59, 130, 246, 0.8)'
    ctx.lineWidth = 1

    if (this.filled) {
      ctx.fillStyle = 'rgba(59, 130, 246, 0.3)'
      ctx.fillRect(x, y, width, height)
    }

    ctx.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1)
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
    hint: 'Click and drag to draw a rectangle',
    shortcut: 'r',
  }
)

ToolRegistry.register(RectangleToolDefinition)
