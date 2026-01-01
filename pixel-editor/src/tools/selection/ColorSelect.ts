/**
 * Color Select Tool
 * Selects all pixels of a similar color across the entire canvas
 * Based on Pixelorama's ColorSelect.gd (Select by Color)
 */

import { BaseSelectionTool, SelectionMode } from '../base/BaseSelectionTool'
import { ToolRegistry, defineToolWithFactory } from '../registry'
import type { Point, ToolCategory, Color } from '../../core/types'

export interface ColorSelectConfig {
  tolerance: number  // 0-255, how different colors can be
  selectBy: 'color' | 'alpha'  // What to compare
}

export class ColorSelectTool extends BaseSelectionTool {
  private tolerance = 10
  private selectBy: 'color' | 'alpha' = 'color'

  getConfig(): ColorSelectConfig {
    return {
      tolerance: this.tolerance,
      selectBy: this.selectBy
    }
  }

  setConfig(config: Partial<ColorSelectConfig>): void {
    if (config.tolerance !== undefined) {
      this.tolerance = Math.max(0, Math.min(255, config.tolerance))
    }
    if (config.selectBy !== undefined) {
      this.selectBy = config.selectBy
    }
  }

  drawStart(pos: Point, event?: PointerEvent): void {
    super.drawStart(pos, event)

    if (!this.ctx || !this.canvas) return

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

    // Perform color selection across entire canvas
    this.selectByColor(pos)
  }

  drawMove(pos: Point, event?: PointerEvent): void {
    // Color select doesn't do anything on move
    super.drawMove(pos, event)
  }

  drawEnd(pos: Point, event?: PointerEvent): void {
    super.drawEnd(pos, event)
  }

  private selectByColor(pos: Point): void {
    if (!this.ctx || !this.canvas) return

    const width = this.canvas.width
    const height = this.canvas.height

    // Bounds check
    if (pos.x < 0 || pos.x >= width || pos.y < 0 || pos.y >= height) {
      return
    }

    const imageData = this.ctx.getImageData(0, 0, width, height)
    const data = imageData.data

    // Get target color at click position
    const targetIndex = (pos.y * width + pos.x) * 4
    const targetColor: Color = {
      r: data[targetIndex],
      g: data[targetIndex + 1],
      b: data[targetIndex + 2],
      a: data[targetIndex + 3]
    }

    // Create selection mask - select ALL matching pixels globally
    const mask = new Uint8Array(width * height)

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = y * width + x
        const pixelIndex = index * 4
        const color: Color = {
          r: data[pixelIndex],
          g: data[pixelIndex + 1],
          b: data[pixelIndex + 2],
          a: data[pixelIndex + 3]
        }

        if (this.colorsMatch(targetColor, color)) {
          mask[index] = 255
        }
      }
    }

    // Emit selection event with mask
    this.emitEvent('selection', {
      type: 'mask',
      mask,
      width,
      height,
      mode: this.selectionMode
    })
  }

  private colorsMatch(a: Color, b: Color): boolean {
    if (this.selectBy === 'alpha') {
      return Math.abs(a.a - b.a) <= this.tolerance
    }

    // Compare RGB with tolerance
    const dr = Math.abs(a.r - b.r)
    const dg = Math.abs(a.g - b.g)
    const db = Math.abs(a.b - b.b)
    const da = Math.abs(a.a - b.a)

    // Use euclidean distance for color comparison
    const distance = Math.sqrt(dr * dr + dg * dg + db * db)
    return distance <= this.tolerance * 1.732 && da <= this.tolerance
  }

  private emitEvent(type: string, detail: unknown): void {
    if (this.canvas) {
      this.canvas.dispatchEvent(new CustomEvent(`tool:${type}`, { detail, bubbles: true }))
    }
  }

  activate(): void {
    super.activate()
    if (this.canvas) {
      this.canvas.style.cursor = 'crosshair'
    }
  }

  deactivate(): void {
    super.deactivate()
    if (this.canvas) {
      this.canvas.style.cursor = 'default'
    }
  }
}

// Tool definition
export const ColorSelectDefinition = defineToolWithFactory(
  'colorSelect',
  'Select by Color',
  'colorSelect', // Icon name
  'selection' as ToolCategory,
  () => new ColorSelectTool(),
  {
    shortcut: 'U',
    hint: 'Select by Color (U). Select all pixels of similar color. Shift: add, Alt: subtract'
  }
)

// Register the tool
ToolRegistry.register(ColorSelectDefinition)
