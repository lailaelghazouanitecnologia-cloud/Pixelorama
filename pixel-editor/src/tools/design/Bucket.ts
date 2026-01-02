/**
 * Bucket Tool - Flood fill tool with pattern support.
 * Based on Pixelorama's Bucket.gd
 */

import { BaseTool } from '../base/BaseTool'
import { defineToolWithFactory, ToolRegistry } from '../registry'
import type { Point, CanvasMouseEvent, DrawingContext, ToolConfig } from '@/core/types'
import { LayerType } from '@/core/types'
import { floodFill, hexToRgb } from '@/lib/drawing'
import { usePatternStore } from '@/core/patterns'

interface BucketConfig extends ToolConfig {
  tolerance: number
  contiguous: boolean
}

export class BucketTool extends BaseTool {
  private tolerance: number = 0
  private contiguous: boolean = true

  override getConfig(): BucketConfig {
    return {
      ...super.getConfig(),
      tolerance: this.tolerance,
      contiguous: this.contiguous,
    }
  }

  override setConfig(config: Partial<BucketConfig>): void {
    if (config.tolerance !== undefined) {
      this.tolerance = Math.max(0, Math.min(255, config.tolerance))
    }
    if (config.contiguous !== undefined) {
      this.contiguous = config.contiguous
    }
    super.setConfig(config)
  }

  protected override onDrawStart(
    pos: Point,
    _event: CanvasMouseEvent,
    ctx: DrawingContext
  ): void {
    this.fill(pos, ctx)
  }

  protected override onDrawMove(): void {
    // Bucket doesn't do anything on move
  }

  protected override onDrawEnd(): void {
    // Nothing to do
  }

  private fill(pos: Point, ctx: DrawingContext): void {
    const { ctx: context, canvas, color } = ctx
    const patternStore = usePatternStore.getState()

    // Get image data
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height)

    // Get points to fill
    const points = floodFill(imageData, pos.x, pos.y, this.tolerance)

    if (points.length === 0) {
      return
    }

    // Check if using pattern fill
    if (patternStore.usePatternFill && patternStore.currentPattern) {
      this.fillWithPattern(imageData, points, patternStore.currentPattern.image, patternStore.patternOffset)
    } else {
      // Fill with solid color
      const fillColor = hexToRgb(color)
      for (const point of points) {
        const index = (point.y * canvas.width + point.x) * 4
        imageData.data[index] = fillColor.r
        imageData.data[index + 1] = fillColor.g
        imageData.data[index + 2] = fillColor.b
        imageData.data[index + 3] = fillColor.a
      }
    }

    // Put image data back
    context.putImageData(imageData, 0, 0)
  }

  private fillWithPattern(
    imageData: ImageData,
    points: Point[],
    pattern: ImageData,
    offset: { x: number; y: number }
  ): void {
    const patternWidth = pattern.width
    const patternHeight = pattern.height

    for (const point of points) {
      // Calculate pattern coordinates with offset and tiling
      const px = ((point.x + offset.x) % patternWidth + patternWidth) % patternWidth
      const py = ((point.y + offset.y) % patternHeight + patternHeight) % patternHeight

      // Get pattern pixel
      const patternIndex = (py * patternWidth + px) * 4
      const destIndex = (point.y * imageData.width + point.x) * 4

      // Copy pattern pixel (only if pattern pixel is not transparent)
      const patternAlpha = pattern.data[patternIndex + 3]
      if (patternAlpha > 0) {
        if (patternAlpha === 255) {
          // Fully opaque - direct copy
          imageData.data[destIndex] = pattern.data[patternIndex]
          imageData.data[destIndex + 1] = pattern.data[patternIndex + 1]
          imageData.data[destIndex + 2] = pattern.data[patternIndex + 2]
          imageData.data[destIndex + 3] = 255
        } else {
          // Semi-transparent - blend
          const alpha = patternAlpha / 255
          const invAlpha = 1 - alpha
          imageData.data[destIndex] = Math.round(
            pattern.data[patternIndex] * alpha + imageData.data[destIndex] * invAlpha
          )
          imageData.data[destIndex + 1] = Math.round(
            pattern.data[patternIndex + 1] * alpha + imageData.data[destIndex + 1] * invAlpha
          )
          imageData.data[destIndex + 2] = Math.round(
            pattern.data[patternIndex + 2] * alpha + imageData.data[destIndex + 2] * invAlpha
          )
          imageData.data[destIndex + 3] = Math.max(
            imageData.data[destIndex + 3],
            patternAlpha
          )
        }
      }
    }
  }

  override drawIndicator(
    ctx: CanvasRenderingContext2D,
    pos: Point,
    color: string
  ): void {
    // Draw bucket cursor (crosshair with fill indicator)
    ctx.strokeStyle = color
    ctx.lineWidth = 1

    // Crosshair
    ctx.beginPath()
    ctx.moveTo(pos.x - 5, pos.y + 0.5)
    ctx.lineTo(pos.x + 5, pos.y + 0.5)
    ctx.moveTo(pos.x + 0.5, pos.y - 5)
    ctx.lineTo(pos.x + 0.5, pos.y + 5)
    ctx.stroke()

    // Small square to indicate fill
    ctx.fillStyle = color
    ctx.fillRect(pos.x + 2, pos.y + 2, 4, 4)
  }
}

// Register the tool
export const BucketDefinition = defineToolWithFactory(
  'bucket',
  'Bucket Fill',
  'paint-bucket',
  'design',
  () => new BucketTool(),
  {
    layerTypes: [LayerType.PIXEL],
    hint: 'Fill contiguous area with color',
    shortcut: 'g',
  }
)

ToolRegistry.register(BucketDefinition)
