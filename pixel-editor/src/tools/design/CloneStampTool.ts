/**
 * Clone Stamp Tool - Copy pixels from one area to another
 * Based on Pixelorama's clone stamp functionality
 *
 * Alt+Click to set the source point, then paint to clone from that area.
 */

import { BaseTool } from '../base/BaseTool'
import { defineToolWithFactory, ToolRegistry } from '../registry'
import type { Point, CanvasMouseEvent, DrawingContext } from '@/core/types'
import { LayerType } from '@/core/types'
import { bresenhamLine } from '@/lib/drawing'
import { useToolsStore } from '@/store/tools-store'

export class CloneStampTool extends BaseTool {
  private brushSize: number = 8
  private opacity: number = 100
  private sourcePoint: Point | null = null
  private sourceSet: boolean = false
  private currentOffset: Point = { x: 0, y: 0 }
  private undoImageData: ImageData | null = null
  private sourceImageData: ImageData | null = null
  private drawCache: Set<string> = new Set()

  // ============================================================================
  // Configuration
  // ============================================================================

  getBrushSize(): number {
    return this.brushSize
  }

  setBrushSize(size: number): void {
    this.brushSize = Math.max(1, Math.min(64, size))
  }

  getOpacity(): number {
    return this.opacity
  }

  setOpacity(opacity: number): void {
    this.opacity = Math.max(1, Math.min(100, opacity))
  }

  getSourcePoint(): Point | null {
    return this.sourcePoint
  }

  isSourceSet(): boolean {
    return this.sourceSet
  }

  clearSource(): void {
    this.sourcePoint = null
    this.sourceSet = false
    this.sourceImageData = null
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

    // Alt+Click to set source
    if (event.altKey) {
      this.sourcePoint = { x: pos.x, y: pos.y }
      this.sourceSet = true
      // Capture source image data
      this.sourceImageData = context.getImageData(0, 0, canvas.width, canvas.height)
      return
    }

    // Can't clone without source
    if (!this.sourceSet || !this.sourcePoint) {
      return
    }

    // Calculate offset from source to current position
    this.currentOffset = {
      x: pos.x - this.sourcePoint.x,
      y: pos.y - this.sourcePoint.y,
    }

    // Save undo data
    this.undoImageData = context.getImageData(0, 0, canvas.width, canvas.height)

    // Capture fresh source if needed
    if (!this.sourceImageData) {
      this.sourceImageData = context.getImageData(0, 0, canvas.width, canvas.height)
    }

    // Clear draw cache
    this.drawCache.clear()

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

    // Update source point to maintain relative position
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
          // Check if within circular brush
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist > radius) continue

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

          // Calculate falloff
          const falloff = 1 - (dist / radius) * 0.3 // Soft edge
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
  // Indicator
  // ============================================================================

  drawIndicator(
    ctx: CanvasRenderingContext2D,
    pos: Point,
    color: string
  ): void {
    const radius = Math.floor(this.brushSize / 2)

    // Draw brush outline at cursor
    ctx.strokeStyle = color
    ctx.lineWidth = 1

    ctx.beginPath()
    ctx.arc(pos.x + 0.5, pos.y + 0.5, radius, 0, Math.PI * 2)
    ctx.stroke()

    // Draw source indicator if set
    if (this.sourceSet && this.sourcePoint) {
      // Calculate where source would be relative to current cursor
      const sourceX = pos.x - this.currentOffset.x
      const sourceY = pos.y - this.currentOffset.y

      // Draw source circle
      ctx.strokeStyle = '#ff6600'
      ctx.setLineDash([2, 2])
      ctx.beginPath()
      ctx.arc(sourceX + 0.5, sourceY + 0.5, radius, 0, Math.PI * 2)
      ctx.stroke()

      // Draw connecting line
      ctx.beginPath()
      ctx.moveTo(sourceX + 0.5, sourceY + 0.5)
      ctx.lineTo(pos.x + 0.5, pos.y + 0.5)
      ctx.stroke()

      ctx.setLineDash([])

      // Draw crosshair at source
      ctx.strokeStyle = '#ff6600'
      ctx.beginPath()
      ctx.moveTo(sourceX - 4, sourceY + 0.5)
      ctx.lineTo(sourceX + 5, sourceY + 0.5)
      ctx.moveTo(sourceX + 0.5, sourceY - 4)
      ctx.lineTo(sourceX + 0.5, sourceY + 5)
      ctx.stroke()
    }

    // Draw "Alt+Click to set source" hint if no source
    if (!this.sourceSet) {
      ctx.fillStyle = color
      ctx.font = '10px sans-serif'
      ctx.fillText('Alt+Click to set source', pos.x + radius + 5, pos.y)
    }
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
    hint: 'Alt+Click to set source, then paint to clone. Hold Alt to reset source.',
    shortcut: 'N',
  }
)

ToolRegistry.register(CloneStampToolDefinition)
