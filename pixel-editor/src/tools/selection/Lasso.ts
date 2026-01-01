/**
 * Lasso Selection Tool
 * Based on Pixelorama's Lasso.gd
 * Allows freehand polygon selection
 */

import { BaseSelectionTool, SelectionMode } from '../base/BaseSelectionTool'
import { ToolRegistry, defineToolWithFactory } from '../registry'
import type { Point, ToolCategory, Rect } from '../../core/types'

export class LassoTool extends BaseSelectionTool {
  private points: Point[] = []
  private isDrawing = false

  drawStart(pos: Point, event?: PointerEvent): void {
    super.drawStart(pos, event)
    this.isDrawing = true
    this.points = [{ x: Math.round(pos.x), y: Math.round(pos.y) }]

    // Check modifier keys for selection mode
    if (event?.shiftKey && !event?.ctrlKey) {
      this.selectionMode = SelectionMode.ADD
    } else if (event?.altKey) {
      this.selectionMode = SelectionMode.SUBTRACT
    } else if (event?.ctrlKey && event?.shiftKey) {
      this.selectionMode = SelectionMode.INTERSECT
    } else {
      this.selectionMode = SelectionMode.REPLACE
    }
  }

  drawMove(pos: Point, event?: PointerEvent): void {
    super.drawMove(pos, event)

    if (!this.isDrawing) return

    const lastPoint = this.points[this.points.length - 1]
    const newPoint = { x: Math.round(pos.x), y: Math.round(pos.y) }

    // Only add point if moved enough (at least 1 pixel)
    if (
      Math.abs(newPoint.x - lastPoint.x) >= 1 ||
      Math.abs(newPoint.y - lastPoint.y) >= 1
    ) {
      this.points.push(newPoint)
      this.emitPreview()
    }
  }

  drawEnd(pos: Point, event?: PointerEvent): void {
    if (!this.isDrawing) {
      super.drawEnd(pos, event)
      return
    }

    // Add final point
    const finalPoint = { x: Math.round(pos.x), y: Math.round(pos.y) }
    this.points.push(finalPoint)

    // Close the polygon (add first point at end)
    if (this.points.length > 2) {
      this.applySelection(this.calculateBounds())
    } else if (this.selectionMode === SelectionMode.REPLACE) {
      // Click without drawing clears selection
      this.clearSelection()
    }

    this.resetTool()
    super.drawEnd(pos, event)
  }

  protected applySelection(_rect: Rect): void {
    if (this.points.length < 3) return

    // Create selection mask from polygon
    const mask = this.createPolygonMask()

    this.emitEvent('selection', {
      type: 'polygon',
      points: [...this.points],
      mask,
      mode: this.selectionMode,
      bounds: this.calculateBounds()
    })
  }

  private createPolygonMask(): boolean[][] | null {
    if (this.points.length < 3) return null

    const bounds = this.calculateBounds()
    if (bounds.width <= 0 || bounds.height <= 0) return null

    // Create mask array
    const mask: boolean[][] = Array(bounds.height)
      .fill(null)
      .map(() => Array(bounds.width).fill(false))

    // Fill polygon using scanline algorithm
    for (let y = 0; y < bounds.height; y++) {
      const scanY = bounds.y + y
      const intersections: number[] = []

      // Find all intersections with polygon edges
      for (let i = 0; i < this.points.length; i++) {
        const p1 = this.points[i]
        const p2 = this.points[(i + 1) % this.points.length]

        // Check if edge crosses this scanline
        if ((p1.y <= scanY && p2.y > scanY) || (p2.y <= scanY && p1.y > scanY)) {
          // Calculate x intersection
          const t = (scanY - p1.y) / (p2.y - p1.y)
          const x = p1.x + t * (p2.x - p1.x)
          intersections.push(x)
        }
      }

      // Sort intersections
      intersections.sort((a, b) => a - b)

      // Fill between pairs of intersections
      for (let i = 0; i < intersections.length - 1; i += 2) {
        const x1 = Math.max(0, Math.round(intersections[i]) - bounds.x)
        const x2 = Math.min(bounds.width - 1, Math.round(intersections[i + 1]) - bounds.x)

        for (let x = x1; x <= x2; x++) {
          if (x >= 0 && x < bounds.width) {
            mask[y][x] = true
          }
        }
      }
    }

    return mask
  }

  private calculateBounds(): Rect {
    if (this.points.length === 0) {
      return { x: 0, y: 0, width: 0, height: 0 }
    }

    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity

    for (const point of this.points) {
      minX = Math.min(minX, point.x)
      minY = Math.min(minY, point.y)
      maxX = Math.max(maxX, point.x)
      maxY = Math.max(maxY, point.y)
    }

    return {
      x: Math.floor(minX),
      y: Math.floor(minY),
      width: Math.ceil(maxX - minX) + 1,
      height: Math.ceil(maxY - minY) + 1
    }
  }

  private clearSelection(): void {
    this.emitEvent('selectionClear', {})
  }

  private emitPreview(): void {
    this.emitEvent('selectionPreview', {
      type: 'polygon',
      points: [...this.points],
      mode: this.selectionMode
    })
  }

  private emitEvent(type: string, detail: unknown): void {
    if (this.canvas) {
      this.canvas.dispatchEvent(new CustomEvent(`tool:${type}`, { detail, bubbles: true }))
    }
  }

  private resetTool(): void {
    this.isDrawing = false
    this.points = []
  }

  getPoints(): Point[] {
    return [...this.points]
  }

  activate(): void {
    super.activate()
    if (this.canvas) {
      this.canvas.style.cursor = 'crosshair'
    }
  }

  deactivate(): void {
    super.deactivate()
    this.resetTool()
    if (this.canvas) {
      this.canvas.style.cursor = 'default'
    }
  }

  /**
   * Override drawPreview to draw polygon path
   */
  override drawPreview(ctx: CanvasRenderingContext2D): void {
    if (!this.isDrawing || this.points.length < 2) return

    ctx.strokeStyle = '#3b82f6'
    ctx.lineWidth = 1
    ctx.setLineDash([4, 4])

    // Draw polygon path
    ctx.beginPath()
    ctx.moveTo(this.points[0].x + 0.5, this.points[0].y + 0.5)

    for (let i = 1; i < this.points.length; i++) {
      ctx.lineTo(this.points[i].x + 0.5, this.points[i].y + 0.5)
    }

    // Draw closing line to start point
    ctx.lineTo(this.points[0].x + 0.5, this.points[0].y + 0.5)
    ctx.stroke()

    ctx.setLineDash([])

    // Fill with semi-transparent color
    ctx.fillStyle = 'rgba(59, 130, 246, 0.2)'
    ctx.beginPath()
    ctx.moveTo(this.points[0].x, this.points[0].y)
    for (let i = 1; i < this.points.length; i++) {
      ctx.lineTo(this.points[i].x, this.points[i].y)
    }
    ctx.closePath()
    ctx.fill()
  }
}

// Tool definition
export const LassoDefinition = defineToolWithFactory(
  'lasso',
  'Lasso',
  'pen-tool',
  'selection' as ToolCategory,
  () => new LassoTool(),
  {
    shortcut: 'Q',
    hint: 'Lasso Select (Q). Shift: add, Alt: subtract, Ctrl+Shift: intersect'
  }
)

// Register the tool
ToolRegistry.register(LassoDefinition)
