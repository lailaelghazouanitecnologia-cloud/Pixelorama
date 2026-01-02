/**
 * Bucket Tool - Flood fill tool with pattern support and fill area modes.
 * Based on Pixelorama's Bucket.gd
 *
 * Fill Area modes:
 * - 'area': Contiguous flood fill (default)
 * - 'colors': Fill all pixels with same color
 * - 'selection': Fill only selected area
 */

import { BaseTool } from '../base/BaseTool'
import { defineToolWithFactory, ToolRegistry } from '../registry'
import type { Point, CanvasMouseEvent, DrawingContext, ToolConfig } from '@/core/types'
import { LayerType } from '@/core/types'
import { floodFill, hexToRgb, colorsMatch } from '@/lib/drawing'
import { usePatternStore } from '@/core/patterns'
import { useToolsStore } from '@/store/tools-store'
import { useEditorStore } from '@/store/editor-store'

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
    const toolsStore = useToolsStore.getState()
    const fillArea = toolsStore.bucketFillArea

    switch (fillArea) {
      case 'area':
        this.fillArea(pos, ctx)
        break
      case 'colors':
        this.fillColors(pos, ctx)
        break
      case 'selection':
        this.fillSelection(ctx)
        break
    }
  }

  protected override onDrawMove(): void {
    // Bucket doesn't do anything on move
  }

  protected override onDrawEnd(): void {
    // Nothing to do
  }

  /**
   * Fill contiguous area (flood fill)
   */
  private fillArea(pos: Point, ctx: DrawingContext): void {
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

  /**
   * Fill all pixels with same color (non-contiguous)
   */
  private fillColors(pos: Point, ctx: DrawingContext): void {
    const { ctx: context, canvas, color } = ctx
    const patternStore = usePatternStore.getState()

    // Get image data
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height)

    // Get target color at click position
    const targetIndex = (pos.y * canvas.width + pos.x) * 4
    const targetR = imageData.data[targetIndex]
    const targetG = imageData.data[targetIndex + 1]
    const targetB = imageData.data[targetIndex + 2]
    const targetA = imageData.data[targetIndex + 3]

    const fillColor = hexToRgb(color)
    const points: Point[] = []

    // Find all matching pixels
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const index = (y * canvas.width + x) * 4
        if (colorsMatch(
          imageData.data[index],
          imageData.data[index + 1],
          imageData.data[index + 2],
          imageData.data[index + 3],
          targetR, targetG, targetB, targetA,
          this.tolerance
        )) {
          points.push({ x, y })
        }
      }
    }

    if (points.length === 0) {
      return
    }

    // Fill with pattern or color
    if (patternStore.usePatternFill && patternStore.currentPattern) {
      this.fillWithPattern(imageData, points, patternStore.currentPattern.image, patternStore.patternOffset)
    } else {
      for (const point of points) {
        const index = (point.y * canvas.width + point.x) * 4
        imageData.data[index] = fillColor.r
        imageData.data[index + 1] = fillColor.g
        imageData.data[index + 2] = fillColor.b
        imageData.data[index + 3] = fillColor.a
      }
    }

    context.putImageData(imageData, 0, 0)
  }

  /**
   * Fill only selected area
   */
  private fillSelection(ctx: DrawingContext): void {
    const { ctx: context, canvas, color } = ctx
    const editorStore = useEditorStore.getState()
    const patternStore = usePatternStore.getState()
    const selection = editorStore.selection

    if (!selection.active) {
      return
    }

    // Get image data
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
    const fillColor = hexToRgb(color)
    const points: Point[] = []

    // Get pixels in selection
    if (selection.mask) {
      // Complex selection with mask
      for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
          const maskIndex = (y * canvas.width + x) * 4 + 3
          if (selection.mask.data[maskIndex] > 0) {
            points.push({ x, y })
          }
        }
      }
    } else {
      // Simple rectangular selection
      for (let y = selection.y; y < selection.y + selection.height; y++) {
        for (let x = selection.x; x < selection.x + selection.width; x++) {
          if (x >= 0 && x < canvas.width && y >= 0 && y < canvas.height) {
            points.push({ x, y })
          }
        }
      }
    }

    if (points.length === 0) {
      return
    }

    // Fill with pattern or color
    if (patternStore.usePatternFill && patternStore.currentPattern) {
      this.fillWithPattern(imageData, points, patternStore.currentPattern.image, patternStore.patternOffset)
    } else {
      for (const point of points) {
        const index = (point.y * canvas.width + point.x) * 4
        imageData.data[index] = fillColor.r
        imageData.data[index + 1] = fillColor.g
        imageData.data[index + 2] = fillColor.b
        imageData.data[index + 3] = fillColor.a
      }
    }

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
