/**
 * Polygon Selection Tool
 * Based on Pixelorama's PolygonSelect.gd
 * Allows click-to-add-vertex polygon selection
 */

import { BaseSelectionTool, SelectionMode } from '../base/BaseSelectionTool'
import { ToolRegistry, defineToolWithFactory } from '../registry'
import type { Point, ToolCategory, Rect } from '../../core/types'

export class PolygonSelectTool extends BaseSelectionTool {
  private points: Point[] = []
  private isDrawing = false
  private hoverPoint: Point | null = null
  private closeThreshold = 10 // pixels to close polygon

  drawStart(pos: Point, event?: PointerEvent): void {
    super.drawStart(pos, event)

    const clickPoint = { x: Math.round(pos.x), y: Math.round(pos.y) }

    // Check modifier keys for selection mode (only on first click)
    if (!this.isDrawing) {
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

    if (!this.isDrawing) {
      // Start new polygon
      this.isDrawing = true
      this.points = [clickPoint]
      this.emitPreview()
    } else {
      // Check if clicking near the first point to close
      if (this.points.length >= 3 && this.isNearFirstPoint(clickPoint)) {
        this.finishPolygon()
        return
      }

      // Add new point
      this.points.push(clickPoint)
      this.emitPreview()
    }
  }

  drawMove(pos: Point, _event?: PointerEvent): void {
    this.hoverPoint = { x: Math.round(pos.x), y: Math.round(pos.y) }

    if (this.isDrawing) {
      this.emitPreview()
    }
  }

  drawEnd(_pos: Point, _event?: PointerEvent): void {
    // Don't end on mouse up - polygon is completed by clicking near first point
    // or by double-clicking or pressing Enter
  }

  handleDoubleClick(pos: Point, _event?: PointerEvent): void {
    if (this.isDrawing && this.points.length >= 3) {
      // Double click finishes the polygon
      const finalPoint = { x: Math.round(pos.x), y: Math.round(pos.y) }

      // Only add final point if it's different from the last one
      const lastPoint = this.points[this.points.length - 1]
      if (finalPoint.x !== lastPoint.x || finalPoint.y !== lastPoint.y) {
        this.points.push(finalPoint)
      }

      this.finishPolygon()
    }
  }

  handleKeyDown(event: KeyboardEvent): boolean {
    if (event.key === 'Enter' && this.isDrawing && this.points.length >= 3) {
      this.finishPolygon()
      return true
    }

    if (event.key === 'Escape') {
      this.cancelPolygon()
      return true
    }

    if (event.key === 'Backspace' || event.key === 'Delete') {
      // Remove last point
      if (this.points.length > 1) {
        this.points.pop()
        this.emitPreview()
        return true
      } else if (this.points.length === 1) {
        this.cancelPolygon()
        return true
      }
    }

    return false
  }

  private isNearFirstPoint(point: Point): boolean {
    if (this.points.length === 0) return false

    const first = this.points[0]
    const distance = Math.sqrt(
      (point.x - first.x) ** 2 + (point.y - first.y) ** 2
    )

    return distance <= this.closeThreshold
  }

  private finishPolygon(): void {
    if (this.points.length < 3) {
      this.cancelPolygon()
      return
    }

    this.applySelection(this.calculateBounds())
    this.resetTool()
  }

  private cancelPolygon(): void {
    this.resetTool()
    this.emitEvent('selectionPreview', { type: 'clear' })
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

  private emitPreview(): void {
    this.emitEvent('selectionPreview', {
      type: 'polygon',
      points: [...this.points],
      hoverPoint: this.hoverPoint,
      mode: this.selectionMode,
      canClose: this.points.length >= 3 && this.hoverPoint && this.isNearFirstPoint(this.hoverPoint)
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
    this.hoverPoint = null
  }

  getPoints(): Point[] {
    return [...this.points]
  }

  isActive(): boolean {
    return this.isDrawing
  }

  activate(): void {
    super.activate()
    if (this.canvas) {
      this.canvas.style.cursor = 'crosshair'
    }
  }

  deactivate(): void {
    super.deactivate()
    this.cancelPolygon()
    if (this.canvas) {
      this.canvas.style.cursor = 'default'
    }
  }

  /**
   * Override drawPreview to draw polygon path with vertices
   */
  override drawPreview(ctx: CanvasRenderingContext2D): void {
    if (!this.isDrawing || this.points.length === 0) return

    const canClose = this.points.length >= 3 &&
                     this.hoverPoint &&
                     this.isNearFirstPoint(this.hoverPoint)

    // Draw filled polygon preview
    if (this.points.length >= 2) {
      ctx.fillStyle = 'rgba(59, 130, 246, 0.2)'
      ctx.beginPath()
      ctx.moveTo(this.points[0].x, this.points[0].y)
      for (let i = 1; i < this.points.length; i++) {
        ctx.lineTo(this.points[i].x, this.points[i].y)
      }
      if (this.hoverPoint) {
        ctx.lineTo(this.hoverPoint.x, this.hoverPoint.y)
      }
      ctx.closePath()
      ctx.fill()
    }

    // Draw polygon edges
    ctx.strokeStyle = '#3b82f6'
    ctx.lineWidth = 1
    ctx.setLineDash([4, 4])

    ctx.beginPath()
    ctx.moveTo(this.points[0].x + 0.5, this.points[0].y + 0.5)

    for (let i = 1; i < this.points.length; i++) {
      ctx.lineTo(this.points[i].x + 0.5, this.points[i].y + 0.5)
    }

    // Draw line to hover point
    if (this.hoverPoint) {
      ctx.lineTo(this.hoverPoint.x + 0.5, this.hoverPoint.y + 0.5)
    }

    // Draw closing line to start point
    if (canClose || this.points.length >= 3) {
      ctx.lineTo(this.points[0].x + 0.5, this.points[0].y + 0.5)
    }

    ctx.stroke()
    ctx.setLineDash([])

    // Draw vertex points
    ctx.fillStyle = '#3b82f6'
    for (const point of this.points) {
      ctx.beginPath()
      ctx.arc(point.x + 0.5, point.y + 0.5, 3, 0, Math.PI * 2)
      ctx.fill()
    }

    // Highlight first point if can close
    if (canClose) {
      ctx.fillStyle = '#22c55e'
      ctx.beginPath()
      ctx.arc(this.points[0].x + 0.5, this.points[0].y + 0.5, 5, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

// Tool definition
export const PolygonSelectDefinition = defineToolWithFactory(
  'polygonSelect',
  'Polygon Select',
  'hexagon',
  'selection' as ToolCategory,
  () => new PolygonSelectTool(),
  {
    shortcut: 'P',
    hint: 'Polygon Select (P). Click to add vertices, double-click or Enter to finish. Esc to cancel.'
  }
)

// Register the tool
ToolRegistry.register(PolygonSelectDefinition)
