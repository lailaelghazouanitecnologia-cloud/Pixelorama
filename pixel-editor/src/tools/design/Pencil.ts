/**
 * Pencil Tool - Basic drawing tool with Fill Inside support.
 * Based on Pixelorama's Pencil.gd
 *
 * Features:
 * - Basic pixel drawing with brush size
 * - Fill Inside: Automatically fill closed paths drawn with the pencil
 */

import { BaseDrawTool, DrawToolConfig } from '../base/BaseDrawTool'
import { defineToolWithFactory, ToolRegistry } from '../registry'
import type { Point, CanvasMouseEvent, DrawingContext } from '@/core/types'
import { LayerType } from '@/core/types'
import { useToolsStore } from '@/store/tools-store'

interface PencilToolConfig extends DrawToolConfig {
  fillInside: boolean
}

export class PencilTool extends BaseDrawTool {
  private fillInside: boolean = false
  private drawPoints: Point[] = []
  private fillInsideRect: { x: number; y: number; width: number; height: number } | null = null

  constructor() {
    super()
    this.isEraser = false
  }

  override getConfig(): PencilToolConfig {
    return {
      ...super.getConfig(),
      fillInside: this.fillInside,
    }
  }

  override setConfig(config: Partial<PencilToolConfig>): void {
    if (config.fillInside !== undefined) {
      this.fillInside = config.fillInside
    }
    super.setConfig(config)
  }

  getFillInside(): boolean {
    return this.fillInside
  }

  setFillInside(enabled: boolean): void {
    this.fillInside = enabled
    this.saveConfig()
  }

  protected override onDrawStart(
    pos: Point,
    event: CanvasMouseEvent,
    ctx: DrawingContext
  ): void {
    // Sync with store
    const { fillInside } = useToolsStore.getState()
    this.fillInside = fillInside

    // Reset fill tracking
    this.drawPoints = []
    this.fillInsideRect = null

    // Track point if fill inside is enabled
    if (this.fillInside) {
      this.drawPoints.push({ ...pos })
      this.fillInsideRect = { x: pos.x, y: pos.y, width: 0, height: 0 }
    }

    super.onDrawStart(pos, event, ctx)
  }

  protected override onDrawMove(
    pos: Point,
    event: CanvasMouseEvent,
    ctx: DrawingContext
  ): void {
    // Track point for fill inside
    if (this.fillInside) {
      this.drawPoints.push({ ...pos })
      this.expandFillRect(pos)
    }

    super.onDrawMove(pos, event, ctx)
  }

  protected override onDrawEnd(
    pos: Point,
    event: CanvasMouseEvent,
    ctx: DrawingContext
  ): void {
    // Track final point
    if (this.fillInside) {
      this.drawPoints.push({ ...pos })
      this.expandFillRect(pos)
    }

    // Fill inside if enabled and we have enough points
    if (this.fillInside && this.drawPoints.length > 3 && this.fillInsideRect) {
      this.fillPolygon(ctx)
    }

    // Reset tracking
    this.drawPoints = []
    this.fillInsideRect = null

    super.onDrawEnd(pos, event, ctx)
  }

  private expandFillRect(pos: Point): void {
    if (!this.fillInsideRect) {
      this.fillInsideRect = { x: pos.x, y: pos.y, width: 0, height: 0 }
      return
    }

    const minX = Math.min(this.fillInsideRect.x, pos.x)
    const minY = Math.min(this.fillInsideRect.y, pos.y)
    const maxX = Math.max(this.fillInsideRect.x + this.fillInsideRect.width, pos.x)
    const maxY = Math.max(this.fillInsideRect.y + this.fillInsideRect.height, pos.y)

    this.fillInsideRect = {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    }
  }

  /**
   * Fill the inside of the polygon defined by drawPoints.
   * Uses point-in-polygon algorithm (ray casting).
   */
  private fillPolygon(ctx: DrawingContext): void {
    if (!this.fillInsideRect || this.drawPoints.length < 4) return

    const { ctx: context, canvas } = ctx

    // Iterate over bounding box and fill points inside polygon
    for (let x = this.fillInsideRect.x; x <= this.fillInsideRect.x + this.fillInsideRect.width; x++) {
      for (let y = this.fillInsideRect.y; y <= this.fillInsideRect.y + this.fillInsideRect.height; y++) {
        // Bounds check
        if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) {
          continue
        }

        // Check if point is inside polygon
        if (this.isPointInPolygon({ x, y }, this.drawPoints)) {
          // Draw pixel (using parent method handles caching and dithering)
          this.drawPixel(x, y, context, ctx)
        }
      }
    }
  }

  /**
   * Check if a point is inside a polygon using ray casting algorithm.
   * Based on Geometry2D.is_point_in_polygon from Godot.
   */
  private isPointInPolygon(point: Point, polygon: Point[]): boolean {
    if (polygon.length < 3) return false

    let inside = false
    const x = point.x
    const y = point.y

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x
      const yi = polygon[i].y
      const xj = polygon[j].x
      const yj = polygon[j].y

      // Check if point is on the edge between vertices i and j
      const intersect = ((yi > y) !== (yj > y)) &&
        (x < (xj - xi) * (y - yi) / (yj - yi) + xi)

      if (intersect) {
        inside = !inside
      }
    }

    return inside
  }
}

// Register the tool
export const PencilDefinition = defineToolWithFactory(
  'pencil',
  'Pencil',
  'pencil',
  'design',
  () => new PencilTool(),
  {
    layerTypes: [LayerType.PIXEL, LayerType.TILEMAP],
    hint: 'Hold Shift to draw straight lines. Enable Fill Inside to fill closed paths.',
    shortcut: 'b',
  }
)

ToolRegistry.register(PencilDefinition)
