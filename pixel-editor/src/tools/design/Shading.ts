/**
 * Shading Tool - Lighten/Darken pixels
 * Based on Pixelorama's Shading.gd
 */

import { BaseDrawTool, DrawToolConfig } from '../base/BaseDrawTool'
import { defineToolWithFactory, ToolRegistry } from '../registry'
import type { Point, CanvasMouseEvent, DrawingContext } from '@/core/types'
import { LayerType } from '@/core/types'
import { bresenhamLine } from '@/lib/drawing'

export enum ShadingMode {
  LIGHTEN = 'lighten',
  DARKEN = 'darken',
}

interface ShadingConfig extends DrawToolConfig {
  shadingMode: ShadingMode
  amount: number // 0-100
}

export class ShadingTool extends BaseDrawTool {
  private shadingMode: ShadingMode = ShadingMode.LIGHTEN
  private amount: number = 10

  constructor() {
    super()
    this.isEraser = false
  }

  override getConfig(): ShadingConfig {
    return {
      ...super.getConfig(),
      shadingMode: this.shadingMode,
      amount: this.amount,
    }
  }

  override setConfig(config: Partial<ShadingConfig>): void {
    if (config.shadingMode !== undefined) {
      this.shadingMode = config.shadingMode
    }
    if (config.amount !== undefined) {
      this.amount = Math.max(0, Math.min(100, config.amount))
    }
    super.setConfig(config)
  }

  getShadingMode(): ShadingMode {
    return this.shadingMode
  }

  setShadingMode(mode: ShadingMode): void {
    this.shadingMode = mode
    this.saveConfig()
  }

  getAmount(): number {
    return this.amount
  }

  setAmount(value: number): void {
    this.amount = Math.max(0, Math.min(100, value))
    this.saveConfig()
  }

  protected override drawPixel(
    x: number,
    y: number,
    context: CanvasRenderingContext2D,
    ctx: DrawingContext
  ): void {
    // Get current pixel color
    const imageData = context.getImageData(x, y, 1, 1)
    const data = imageData.data

    // Skip if pixel is fully transparent
    if (data[3] === 0) return

    // Convert to RGB
    let r = data[0]
    let g = data[1]
    let b = data[2]

    // Apply lighten/darken
    const factor = this.amount / 100

    if (this.shadingMode === ShadingMode.LIGHTEN) {
      // Lighten: blend towards white
      r = Math.min(255, r + (255 - r) * factor)
      g = Math.min(255, g + (255 - g) * factor)
      b = Math.min(255, b + (255 - b) * factor)
    } else {
      // Darken: blend towards black
      r = Math.max(0, r * (1 - factor))
      g = Math.max(0, g * (1 - factor))
      b = Math.max(0, b * (1 - factor))
    }

    // Set new color
    data[0] = Math.round(r)
    data[1] = Math.round(g)
    data[2] = Math.round(b)

    context.putImageData(imageData, x, y)
  }

  protected override drawBrush(pos: Point, ctx: DrawingContext): void {
    const { ctx: context, canvas } = ctx
    const halfSize = Math.floor(this.brushSize / 2)

    for (let dy = 0; dy < this.brushSize; dy++) {
      for (let dx = 0; dx < this.brushSize; dx++) {
        const px = pos.x - halfSize + dx
        const py = pos.y - halfSize + dy

        // Bounds check
        if (px < 0 || px >= canvas.width || py < 0 || py >= canvas.height) {
          continue
        }

        // Cache check to prevent double-processing
        const cacheKey = { x: px, y: py }
        if (this.isInCache(cacheKey)) {
          continue
        }
        this.addToCache(cacheKey)

        // Apply shading to pixel
        this.drawPixel(px, py, context, ctx)
      }
    }
  }

  protected override drawLineBetween(from: Point, to: Point, ctx: DrawingContext): void {
    const points = bresenhamLine(from.x, from.y, to.x, to.y)

    for (const point of points) {
      this.drawBrush(point, ctx)
    }
  }
}

// Register the tool
export const ShadingDefinition = defineToolWithFactory(
  'Shading',
  'Shading',
  'sun', // Icon name
  'design',
  () => new ShadingTool(),
  {
    layerTypes: [LayerType.PIXEL],
    hint: 'Lighten or darken pixels',
    shortcut: 'u',
  }
)

ToolRegistry.register(ShadingDefinition)
