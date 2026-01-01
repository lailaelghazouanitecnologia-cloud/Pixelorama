/**
 * Smudge Tool - Blend/smear colors by dragging
 * Based on Pixelorama's smudge functionality
 *
 * The smudge tool picks up color from where you click and
 * blends it with colors along the stroke path.
 */

import { BaseTool } from '../base/BaseTool'
import { defineToolWithFactory, ToolRegistry } from '../registry'
import type { Point, CanvasMouseEvent, DrawingContext } from '@/core/types'
import { LayerType } from '@/core/types'
import { bresenhamLine } from '@/lib/drawing'
import { useToolsStore } from '@/store/tools-store'

export class SmudgeTool extends BaseTool {
  private brushSize: number = 4
  private strength: number = 50  // 0-100, how much to blend
  private sampleBuffer: ImageData | null = null
  private undoImageData: ImageData | null = null

  // ============================================================================
  // Configuration
  // ============================================================================

  getBrushSize(): number {
    return this.brushSize
  }

  setBrushSize(size: number): void {
    this.brushSize = Math.max(1, Math.min(64, size))
  }

  getStrength(): number {
    return this.strength
  }

  setStrength(strength: number): void {
    this.strength = Math.max(1, Math.min(100, strength))
  }

  // ============================================================================
  // Drawing Implementation
  // ============================================================================

  protected onDrawStart(
    pos: Point,
    _event: CanvasMouseEvent,
    ctx: DrawingContext
  ): void {
    const { ctx: context, canvas } = ctx

    // Save undo data
    this.undoImageData = context.getImageData(0, 0, canvas.width, canvas.height)

    // Sample initial area
    this.sampleBuffer = this.sampleArea(pos, context, canvas.width, canvas.height)

    // Apply initial smudge
    this.smudgeAt(pos, context, canvas.width, canvas.height)
  }

  protected onDrawMove(
    pos: Point,
    _event: CanvasMouseEvent,
    ctx: DrawingContext
  ): void {
    const { ctx: context, canvas } = ctx
    const lastPoint = this.getLastPoint()

    if (lastPoint) {
      // Draw line between points
      const points = bresenhamLine(lastPoint.x, lastPoint.y, pos.x, pos.y)

      for (const point of points) {
        this.smudgeAt(point, context, canvas.width, canvas.height)
      }
    } else {
      this.smudgeAt(pos, context, canvas.width, canvas.height)
    }
  }

  protected onDrawEnd(
    pos: Point,
    _event: CanvasMouseEvent,
    ctx: DrawingContext
  ): void {
    const { ctx: context, canvas } = ctx

    // Final smudge
    this.smudgeAt(pos, context, canvas.width, canvas.height)

    // Clear sample buffer
    this.sampleBuffer = null
    this.undoImageData = null
  }

  protected onDrawCancel(): void {
    this.sampleBuffer = null
    this.undoImageData = null
  }

  // ============================================================================
  // Smudge Operations
  // ============================================================================

  /**
   * Sample a circular area around a point
   */
  private sampleArea(
    pos: Point,
    context: CanvasRenderingContext2D,
    canvasWidth: number,
    canvasHeight: number
  ): ImageData {
    const radius = Math.floor(this.brushSize / 2)
    const size = this.brushSize

    // Create sample buffer
    const sampleData = new ImageData(size, size)

    // Get current canvas data
    const canvasData = context.getImageData(0, 0, canvasWidth, canvasHeight)

    // Sample pixels in brush area
    for (let dy = 0; dy < size; dy++) {
      for (let dx = 0; dx < size; dx++) {
        const px = pos.x - radius + dx
        const py = pos.y - radius + dy

        // Check if within circular brush
        const distX = dx - radius
        const distY = dy - radius
        const dist = Math.sqrt(distX * distX + distY * distY)

        if (dist > radius) continue

        // Bounds check
        if (px < 0 || px >= canvasWidth || py < 0 || py >= canvasHeight) {
          continue
        }

        const srcIdx = (py * canvasWidth + px) * 4
        const dstIdx = (dy * size + dx) * 4

        sampleData.data[dstIdx] = canvasData.data[srcIdx]
        sampleData.data[dstIdx + 1] = canvasData.data[srcIdx + 1]
        sampleData.data[dstIdx + 2] = canvasData.data[srcIdx + 2]
        sampleData.data[dstIdx + 3] = canvasData.data[srcIdx + 3]
      }
    }

    return sampleData
  }

  /**
   * Apply smudge effect at a position
   */
  private smudgeAt(
    pos: Point,
    context: CanvasRenderingContext2D,
    canvasWidth: number,
    canvasHeight: number
  ): void {
    if (!this.sampleBuffer) return

    const radius = Math.floor(this.brushSize / 2)
    const size = this.brushSize
    const strengthFactor = this.strength / 100

    // Get current canvas data
    const canvasData = context.getImageData(0, 0, canvasWidth, canvasHeight)

    // New sample buffer for next iteration
    const newSample = new ImageData(size, size)

    // Apply smudge
    for (let dy = 0; dy < size; dy++) {
      for (let dx = 0; dx < size; dx++) {
        const px = pos.x - radius + dx
        const py = pos.y - radius + dy

        // Check if within circular brush
        const distX = dx - radius
        const distY = dy - radius
        const dist = Math.sqrt(distX * distX + distY * distY)

        if (dist > radius) continue

        // Bounds check
        if (px < 0 || px >= canvasWidth || py < 0 || py >= canvasHeight) {
          continue
        }

        const canvasIdx = (py * canvasWidth + px) * 4
        const sampleIdx = (dy * size + dx) * 4

        // Get sample color
        const sR = this.sampleBuffer.data[sampleIdx]
        const sG = this.sampleBuffer.data[sampleIdx + 1]
        const sB = this.sampleBuffer.data[sampleIdx + 2]
        const sA = this.sampleBuffer.data[sampleIdx + 3]

        // Get canvas color
        const cR = canvasData.data[canvasIdx]
        const cG = canvasData.data[canvasIdx + 1]
        const cB = canvasData.data[canvasIdx + 2]
        const cA = canvasData.data[canvasIdx + 3]

        // Calculate falloff based on distance from center
        const falloff = 1 - (dist / radius)
        const blend = strengthFactor * falloff

        // Blend colors
        const newR = Math.round(cR * (1 - blend) + sR * blend)
        const newG = Math.round(cG * (1 - blend) + sG * blend)
        const newB = Math.round(cB * (1 - blend) + sB * blend)
        const newA = Math.round(cA * (1 - blend) + sA * blend)

        // Apply to canvas
        canvasData.data[canvasIdx] = newR
        canvasData.data[canvasIdx + 1] = newG
        canvasData.data[canvasIdx + 2] = newB
        canvasData.data[canvasIdx + 3] = newA

        // Store for next sample (pick up new color)
        newSample.data[sampleIdx] = newR
        newSample.data[sampleIdx + 1] = newG
        newSample.data[sampleIdx + 2] = newB
        newSample.data[sampleIdx + 3] = newA
      }
    }

    // Update canvas
    context.putImageData(canvasData, 0, 0)

    // Update sample buffer (carry color along)
    this.sampleBuffer = newSample
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

    ctx.strokeStyle = color
    ctx.lineWidth = 1

    // Draw circular brush outline
    ctx.beginPath()
    ctx.arc(pos.x + 0.5, pos.y + 0.5, radius, 0, Math.PI * 2)
    ctx.stroke()

    // Draw crosshair
    ctx.beginPath()
    ctx.moveTo(pos.x - 2, pos.y + 0.5)
    ctx.lineTo(pos.x + 3, pos.y + 0.5)
    ctx.moveTo(pos.x + 0.5, pos.y - 2)
    ctx.lineTo(pos.x + 0.5, pos.y + 3)
    ctx.stroke()
  }
}

// Tool definition and registration
export const SmudgeToolDefinition = defineToolWithFactory(
  'smudge',
  'Smudge',
  'droplet',
  'design',
  () => new SmudgeTool(),
  {
    layerTypes: [LayerType.PIXEL],
    hint: 'Blend colors by dragging. Adjust strength for more/less blending.',
    shortcut: 'K',
  }
)

ToolRegistry.register(SmudgeToolDefinition)
