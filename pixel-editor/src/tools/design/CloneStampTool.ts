/**
 * Clone Stamp Tool - Copy pixels from one area to another
 * Based on Pixelorama's clone stamp functionality
 *
 * Usage:
 * 1. Click to set source selection area (shown with magenta mask)
 * 2. Drag or click elsewhere to preview stamp destination
 * 3. Press Enter or double-click to apply the stamp
 * 4. Press Escape to cancel
 */

import { BaseTool } from '../base/BaseTool'
import { defineToolWithFactory, ToolRegistry } from '../registry'
import type { Point, CanvasMouseEvent, DrawingContext } from '@/core/types'
import { LayerType } from '@/core/types'
import { bresenhamLine } from '@/lib/drawing'
import { useToolsStore } from '@/store/tools-store'

// Stamp shape types
export type StampShape = 'circle' | 'square' | 'diamond' | 'custom'

// Clone stamp modes
export type CloneStampMode = 'selecting' | 'stamping' | 'preview'

export class CloneStampTool extends BaseTool {
  private brushSize: number = 16
  private opacity: number = 100
  private stampShape: StampShape = 'circle'
  private mode: CloneStampMode = 'selecting'

  // Source selection
  private sourcePoint: Point | null = null
  private sourceSet: boolean = false
  private sourceImageData: ImageData | null = null

  // Destination/preview
  private destPoint: Point | null = null
  private currentOffset: Point = { x: 0, y: 0 }
  private previewActive: boolean = false

  // Drawing state
  private undoImageData: ImageData | null = null
  private drawCache: Set<string> = new Set()

  // ============================================================================
  // Configuration
  // ============================================================================

  getBrushSize(): number {
    return this.brushSize
  }

  setBrushSize(size: number): void {
    this.brushSize = Math.max(1, Math.min(128, size))
  }

  getOpacity(): number {
    return this.opacity
  }

  setOpacity(opacity: number): void {
    this.opacity = Math.max(1, Math.min(100, opacity))
  }

  getStampShape(): StampShape {
    return this.stampShape
  }

  setStampShape(shape: StampShape): void {
    this.stampShape = shape
  }

  getSourcePoint(): Point | null {
    return this.sourcePoint
  }

  isSourceSet(): boolean {
    return this.sourceSet
  }

  getMode(): CloneStampMode {
    return this.mode
  }

  clearSource(): void {
    this.sourcePoint = null
    this.sourceSet = false
    this.sourceImageData = null
    this.mode = 'selecting'
    this.previewActive = false
    this.destPoint = null
  }

  // ============================================================================
  // Shape Mask Helpers
  // ============================================================================

  private isInsideShape(dx: number, dy: number, radius: number): boolean {
    switch (this.stampShape) {
      case 'circle':
        return Math.sqrt(dx * dx + dy * dy) <= radius
      case 'square':
        return Math.abs(dx) <= radius && Math.abs(dy) <= radius
      case 'diamond':
        return Math.abs(dx) + Math.abs(dy) <= radius
      case 'custom':
        // For custom, use circle with soft edges
        return Math.sqrt(dx * dx + dy * dy) <= radius
      default:
        return Math.sqrt(dx * dx + dy * dy) <= radius
    }
  }

  private getShapeFalloff(dx: number, dy: number, radius: number): number {
    const dist = Math.sqrt(dx * dx + dy * dy)
    switch (this.stampShape) {
      case 'circle':
        return 1 - (dist / radius) * 0.3
      case 'square':
        return 1.0 // No falloff for square
      case 'diamond':
        return 1 - ((Math.abs(dx) + Math.abs(dy)) / radius) * 0.2
      case 'custom':
        // Gaussian-like falloff
        return Math.exp(-(dist * dist) / (2 * radius * radius / 4))
      default:
        return 1 - (dist / radius) * 0.3
    }
  }

  // ============================================================================
  // Drawing Implementation
  // ============================================================================

  protected onDrawStart(
    pos: Point,
    event: CanvasMouseEvent,
    ctx: DrawingContext
  ): void {
    const { ctx: context, canvas } = ctx

    // If source not set, set it now
    if (!this.sourceSet) {
      this.sourcePoint = { x: pos.x, y: pos.y }
      this.sourceSet = true
      this.mode = 'stamping'
      // Capture source image data
      this.sourceImageData = context.getImageData(0, 0, canvas.width, canvas.height)
      return
    }

    // Alt+Click to reset source
    if (event.altKey) {
      this.sourcePoint = { x: pos.x, y: pos.y }
      this.sourceImageData = context.getImageData(0, 0, canvas.width, canvas.height)
      this.currentOffset = { x: 0, y: 0 }
      return
    }

    // Set destination and calculate offset
    this.destPoint = { x: pos.x, y: pos.y }
    this.currentOffset = {
      x: pos.x - this.sourcePoint!.x,
      y: pos.y - this.sourcePoint!.y,
    }

    // Save undo data
    this.undoImageData = context.getImageData(0, 0, canvas.width, canvas.height)

    // Clear draw cache
    this.drawCache.clear()

    // Start preview mode
    this.previewActive = true
    this.mode = 'preview'

    // Clone at initial position
    this.cloneAt(pos, context, canvas.width, canvas.height)
  }

  protected onDrawMove(
    pos: Point,
    event: CanvasMouseEvent,
    ctx: DrawingContext
  ): void {
    // Don't draw if setting source
    if (event.altKey) return

    // Can't clone without source
    if (!this.sourceSet || !this.sourcePoint || !this.sourceImageData) {
      return
    }

    const { ctx: context, canvas } = ctx
    const lastPoint = this.getLastPoint()

    if (lastPoint) {
      // Draw line between points
      const points = bresenhamLine(lastPoint.x, lastPoint.y, pos.x, pos.y)

      for (const point of points) {
        this.cloneAt(point, context, canvas.width, canvas.height)
      }
    } else {
      this.cloneAt(pos, context, canvas.width, canvas.height)
    }

    this.destPoint = { x: pos.x, y: pos.y }
  }

  protected onDrawEnd(
    pos: Point,
    event: CanvasMouseEvent,
    ctx: DrawingContext
  ): void {
    // Don't process if setting source
    if (event.altKey) return

    const { ctx: context, canvas } = ctx

    // Final clone
    if (this.sourceSet && this.sourcePoint && this.sourceImageData) {
      this.cloneAt(pos, context, canvas.width, canvas.height)
    }

    // Clear caches
    this.drawCache.clear()
    this.undoImageData = null
    this.previewActive = false
    this.mode = 'stamping'

    // Update source point to maintain relative position for next stroke
    if (this.sourcePoint) {
      this.sourcePoint = {
        x: pos.x - this.currentOffset.x,
        y: pos.y - this.currentOffset.y,
      }
    }
  }

  protected onDrawCancel(): void {
    this.drawCache.clear()
    this.undoImageData = null
    this.previewActive = false
  }

  // ============================================================================
  // Clone Operations
  // ============================================================================

  /**
   * Clone pixels from source to destination
   */
  private cloneAt(
    pos: Point,
    context: CanvasRenderingContext2D,
    canvasWidth: number,
    canvasHeight: number
  ): void {
    if (!this.sourceImageData) return

    const radius = Math.floor(this.brushSize / 2)
    const opacityFactor = this.opacity / 100

    // Get current canvas data for blending
    const canvasData = context.getImageData(0, 0, canvasWidth, canvasHeight)

    // Apply mirror settings
    const { mirrorH, mirrorV } = useToolsStore.getState()
    const positions: Point[] = [pos]

    if (mirrorH) {
      positions.push({ x: canvasWidth - 1 - pos.x, y: pos.y })
    }
    if (mirrorV) {
      positions.push({ x: pos.x, y: canvasHeight - 1 - pos.y })
    }
    if (mirrorH && mirrorV) {
      positions.push({ x: canvasWidth - 1 - pos.x, y: canvasHeight - 1 - pos.y })
    }

    for (const drawPos of positions) {
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          // Check if within shape
          if (!this.isInsideShape(dx, dy, radius)) continue

          const destX = drawPos.x + dx
          const destY = drawPos.y + dy

          // Bounds check for destination
          if (destX < 0 || destX >= canvasWidth || destY < 0 || destY >= canvasHeight) {
            continue
          }

          // Check cache
          const cacheKey = `${destX},${destY}`
          if (this.drawCache.has(cacheKey)) continue
          this.drawCache.add(cacheKey)

          // Calculate source position
          const srcX = destX - this.currentOffset.x
          const srcY = destY - this.currentOffset.y

          // Bounds check for source
          if (srcX < 0 || srcX >= canvasWidth || srcY < 0 || srcY >= canvasHeight) {
            continue
          }

          const srcIdx = (srcY * canvasWidth + srcX) * 4
          const destIdx = (destY * canvasWidth + destX) * 4

          // Get source color
          const sR = this.sourceImageData.data[srcIdx]
          const sG = this.sourceImageData.data[srcIdx + 1]
          const sB = this.sourceImageData.data[srcIdx + 2]
          const sA = this.sourceImageData.data[srcIdx + 3]

          // Get destination color
          const dR = canvasData.data[destIdx]
          const dG = canvasData.data[destIdx + 1]
          const dB = canvasData.data[destIdx + 2]
          const dA = canvasData.data[destIdx + 3]

          // Calculate falloff based on shape
          const falloff = this.getShapeFalloff(dx, dy, radius)
          const blend = opacityFactor * falloff

          // Blend colors
          canvasData.data[destIdx] = Math.round(dR * (1 - blend) + sR * blend)
          canvasData.data[destIdx + 1] = Math.round(dG * (1 - blend) + sG * blend)
          canvasData.data[destIdx + 2] = Math.round(dB * (1 - blend) + sB * blend)
          canvasData.data[destIdx + 3] = Math.round(dA * (1 - blend) + sA * blend)
        }
      }
    }

    // Update canvas
    context.putImageData(canvasData, 0, 0)
  }

  // ============================================================================
  // Indicator with Magenta Mask Preview
  // ============================================================================

  drawIndicator(
    ctx: CanvasRenderingContext2D,
    pos: Point,
    color: string
  ): void {
    const radius = Math.floor(this.brushSize / 2)

    // Draw shape outline at cursor based on stamp shape
    ctx.strokeStyle = color
    ctx.lineWidth = 1

    this.drawShapeOutline(ctx, pos.x + 0.5, pos.y + 0.5, radius)

    // Draw source indicator with magenta mask if set
    if (this.sourceSet && this.sourcePoint) {
      // Calculate where source area is
      const sourceX = this.sourcePoint.x
      const sourceY = this.sourcePoint.y

      // Draw magenta mask overlay at source
      ctx.fillStyle = 'rgba(255, 0, 255, 0.25)' // Magenta with low opacity
      this.fillShape(ctx, sourceX, sourceY, radius)

      // Draw source outline
      ctx.strokeStyle = '#ff00ff' // Magenta
      ctx.lineWidth = 2
      this.drawShapeOutline(ctx, sourceX + 0.5, sourceY + 0.5, radius)

      // Draw crosshair at source center
      ctx.strokeStyle = '#ff00ff'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(sourceX - 6, sourceY + 0.5)
      ctx.lineTo(sourceX + 7, sourceY + 0.5)
      ctx.moveTo(sourceX + 0.5, sourceY - 6)
      ctx.lineTo(sourceX + 0.5, sourceY + 7)
      ctx.stroke()

      // Draw "SOURCE" label
      ctx.fillStyle = '#ff00ff'
      ctx.strokeStyle = '#000000'
      ctx.lineWidth = 2
      ctx.font = 'bold 10px sans-serif'
      ctx.strokeText('SOURCE', sourceX + radius + 5, sourceY - radius)
      ctx.fillText('SOURCE', sourceX + radius + 5, sourceY - radius)

      // If we have a destination offset, show preview
      if (this.currentOffset.x !== 0 || this.currentOffset.y !== 0) {
        // Draw preview destination with semi-transparent overlay
        const previewX = sourceX + this.currentOffset.x
        const previewY = sourceY + this.currentOffset.y

        // Draw connecting line
        ctx.strokeStyle = '#ff6600'
        ctx.lineWidth = 1
        ctx.setLineDash([4, 4])
        ctx.beginPath()
        ctx.moveTo(sourceX + 0.5, sourceY + 0.5)
        ctx.lineTo(previewX + 0.5, previewY + 0.5)
        ctx.stroke()
        ctx.setLineDash([])

        // Draw destination outline
        ctx.strokeStyle = '#ff6600'
        ctx.lineWidth = 2
        this.drawShapeOutline(ctx, previewX + 0.5, previewY + 0.5, radius)

        // Draw "DEST" label
        ctx.fillStyle = '#ff6600'
        ctx.strokeText('DEST', previewX + radius + 5, previewY - radius)
        ctx.fillText('DEST', previewX + radius + 5, previewY - radius)
      }

      // Show current mode and shape info
      ctx.fillStyle = '#ffffff'
      ctx.strokeStyle = '#000000'
      ctx.lineWidth = 2
      ctx.font = '9px sans-serif'
      const shapeText = `Shape: ${this.stampShape} | Size: ${this.brushSize}px`
      ctx.strokeText(shapeText, pos.x + radius + 5, pos.y + radius + 15)
      ctx.fillText(shapeText, pos.x + radius + 5, pos.y + radius + 15)
    } else {
      // Draw "Click to set source" hint
      ctx.fillStyle = '#ffffff'
      ctx.strokeStyle = '#000000'
      ctx.lineWidth = 2
      ctx.font = '10px sans-serif'
      const hint = 'Click to set source area'
      ctx.strokeText(hint, pos.x + radius + 5, pos.y)
      ctx.fillText(hint, pos.x + radius + 5, pos.y)
    }
  }

  private drawShapeOutline(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number): void {
    ctx.beginPath()
    switch (this.stampShape) {
      case 'circle':
        ctx.arc(cx, cy, radius, 0, Math.PI * 2)
        break
      case 'square':
        ctx.rect(cx - radius, cy - radius, radius * 2, radius * 2)
        break
      case 'diamond':
        ctx.moveTo(cx, cy - radius)
        ctx.lineTo(cx + radius, cy)
        ctx.lineTo(cx, cy + radius)
        ctx.lineTo(cx - radius, cy)
        ctx.closePath()
        break
      case 'custom':
        // Draw circle with inner circle for custom
        ctx.arc(cx, cy, radius, 0, Math.PI * 2)
        ctx.moveTo(cx + radius * 0.5, cy)
        ctx.arc(cx, cy, radius * 0.5, 0, Math.PI * 2)
        break
    }
    ctx.stroke()
  }

  private fillShape(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number): void {
    ctx.beginPath()
    switch (this.stampShape) {
      case 'circle':
        ctx.arc(cx, cy, radius, 0, Math.PI * 2)
        break
      case 'square':
        ctx.rect(cx - radius, cy - radius, radius * 2, radius * 2)
        break
      case 'diamond':
        ctx.moveTo(cx, cy - radius)
        ctx.lineTo(cx + radius, cy)
        ctx.lineTo(cx, cy + radius)
        ctx.lineTo(cx - radius, cy)
        ctx.closePath()
        break
      case 'custom':
        ctx.arc(cx, cy, radius, 0, Math.PI * 2)
        break
    }
    ctx.fill()
  }
}

// Tool definition and registration
export const CloneStampToolDefinition = defineToolWithFactory(
  'cloneStamp',
  'Clone Stamp',
  'stamp',
  'design',
  () => new CloneStampTool(),
  {
    layerTypes: [LayerType.PIXEL],
    hint: 'Click to set source, then paint to clone. Alt+Click to reset source.',
    shortcut: 'N',
  }
)

ToolRegistry.register(CloneStampToolDefinition)
