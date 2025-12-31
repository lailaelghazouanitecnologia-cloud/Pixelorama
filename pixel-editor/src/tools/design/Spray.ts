/**
 * Spray/Airbrush Tool - Randomly places pixels within a radius
 * A common feature in pixel art editors
 */

import { BaseDrawTool, DrawToolConfig } from '../base/BaseDrawTool'
import { defineToolWithFactory, ToolRegistry } from '../registry'
import type { Point, CanvasMouseEvent, DrawingContext } from '@/core/types'
import { LayerType } from '@/core/types'
import { bresenhamLine } from '@/lib/drawing'

interface SprayConfig extends DrawToolConfig {
  density: number // Pixels per spray (1-20)
  radius: number  // Spray radius (1-64)
}

export class SprayTool extends BaseDrawTool {
  private density: number = 5
  private radius: number = 8
  private processedPixels: Set<string> = new Set()

  constructor() {
    super()
    this.isEraser = false
  }

  override getConfig(): SprayConfig {
    return {
      ...super.getConfig(),
      density: this.density,
      radius: this.radius,
    }
  }

  override setConfig(config: Partial<SprayConfig>): void {
    if (config.density !== undefined) {
      this.density = Math.max(1, Math.min(20, config.density))
    }
    if (config.radius !== undefined) {
      this.radius = Math.max(1, Math.min(64, config.radius))
    }
    super.setConfig(config)
  }

  getDensity(): number {
    return this.density
  }

  setDensity(value: number): void {
    this.density = Math.max(1, Math.min(20, value))
    this.saveConfig()
  }

  getRadius(): number {
    return this.radius
  }

  setRadius(value: number): void {
    this.radius = Math.max(1, Math.min(64, value))
    this.saveConfig()
  }

  override onDrawStart(event: CanvasMouseEvent, ctx: DrawingContext): void {
    super.onDrawStart(event, ctx)
    // Clear processed pixels at start of stroke
    this.processedPixels.clear()
  }

  override onDrawEnd(event: CanvasMouseEvent, ctx: DrawingContext): void {
    super.onDrawEnd(event, ctx)
    this.processedPixels.clear()
  }

  protected override drawBrush(pos: Point, ctx: DrawingContext): void {
    const { ctx: context, canvas } = ctx

    // Spray random pixels within radius
    for (let i = 0; i < this.density; i++) {
      // Random angle and distance (uniform distribution in circle)
      const angle = Math.random() * Math.PI * 2
      const distance = Math.sqrt(Math.random()) * this.radius

      const px = Math.floor(pos.x + Math.cos(angle) * distance)
      const py = Math.floor(pos.y + Math.sin(angle) * distance)

      // Bounds check
      if (px < 0 || px >= canvas.width || py < 0 || py >= canvas.height) {
        continue
      }

      // Create unique key for this pixel
      const key = `${px},${py}`

      // Skip if already processed (prevents overdraw in same stroke)
      if (this.processedPixels.has(key)) {
        continue
      }
      this.processedPixels.add(key)

      // Draw the pixel
      this.drawPixel(px, py, context, ctx)
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
export const SprayDefinition = defineToolWithFactory(
  'Spray',
  'Spray',
  'spray-can', // Icon name
  'design',
  () => new SprayTool(),
  {
    layerTypes: [LayerType.PIXEL],
    hint: 'Spray random pixels (Shift+S)',
    shortcut: 'S',
  }
)

ToolRegistry.register(SprayDefinition)
