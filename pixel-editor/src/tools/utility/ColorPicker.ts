/**
 * ColorPicker Tool - Pick colors from the canvas
 * Based on Pixelorama's ColorPicker.gd
 */

import { BaseTool } from '../base/BaseTool'
import { ToolRegistry, defineToolWithFactory } from '../registry'
import type { Point, ToolCategory, Color } from '../../core/types'
import { getPixelColor, rgbToHex } from '../../lib/drawing'

export enum ColorPickerMode {
  TOP_COLOR = 0,      // Pick from topmost visible layer
  CURRENT_LAYER = 1   // Pick from current layer only
}

export enum ColorSlot {
  PRIMARY = 0,
  SECONDARY = 1
}

export interface ColorPickerConfig {
  colorSlot: ColorSlot
  mode: ColorPickerMode
}

export class ColorPickerTool extends BaseTool {
  private colorSlot: ColorSlot = ColorSlot.PRIMARY
  private mode: ColorPickerMode = ColorPickerMode.TOP_COLOR

  getConfig(): ColorPickerConfig {
    return {
      colorSlot: this.colorSlot,
      mode: this.mode
    }
  }

  setConfig(config: Partial<ColorPickerConfig>): void {
    if (config.colorSlot !== undefined) {
      this.colorSlot = config.colorSlot
    }
    if (config.mode !== undefined) {
      this.mode = config.mode
    }
  }

  setColorSlot(slot: ColorSlot): void {
    this.colorSlot = slot
  }

  getColorSlot(): ColorSlot {
    return this.colorSlot
  }

  setMode(mode: ColorPickerMode): void {
    this.mode = mode
  }

  getMode(): ColorPickerMode {
    return this.mode
  }

  drawStart(pos: Point, event?: PointerEvent): void {
    super.drawStart(pos, event)
    this.pickColor(pos)
  }

  drawMove(pos: Point, event?: PointerEvent): void {
    super.drawMove(pos, event)
    this.pickColor(pos)
  }

  drawEnd(pos: Point, event?: PointerEvent): void {
    super.drawEnd(pos, event)
  }

  private pickColor(pos: Point): void {
    if (!this.canvas || !this.ctx) return

    // Ensure position is within bounds
    if (pos.x < 0 || pos.y < 0 || pos.x >= this.canvas.width || pos.y >= this.canvas.height) {
      return
    }

    const color = getPixelColor(this.ctx, pos.x, pos.y)

    // Skip fully transparent pixels
    if (color.a === 0) return

    const hexColor = rgbToHex(color.r, color.g, color.b)

    // Emit color picked event
    this.emitColorPicked(hexColor, color, this.colorSlot)
  }

  /**
   * Pick color from a specific image data at position
   */
  pickColorFromImageData(imageData: ImageData, pos: Point): Color | null {
    if (pos.x < 0 || pos.y < 0 || pos.x >= imageData.width || pos.y >= imageData.height) {
      return null
    }

    const index = (Math.floor(pos.y) * imageData.width + Math.floor(pos.x)) * 4
    const r = imageData.data[index]
    const g = imageData.data[index + 1]
    const b = imageData.data[index + 2]
    const a = imageData.data[index + 3]

    return { r, g, b, a }
  }

  /**
   * Pick the topmost visible color at position (checking multiple layers)
   */
  pickTopColor(layers: ImageData[], pos: Point): Color | null {
    // Iterate from top to bottom layer
    for (let i = layers.length - 1; i >= 0; i--) {
      const color = this.pickColorFromImageData(layers[i], pos)
      if (color && color.a > 0) {
        return color
      }
    }
    return null
  }

  private emitColorPicked(hex: string, color: Color, slot: ColorSlot): void {
    if (this.canvas) {
      this.canvas.dispatchEvent(new CustomEvent('tool:colorPicked', {
        detail: { hex, color, slot },
        bubbles: true
      }))
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
export const ColorPickerDefinition = defineToolWithFactory(
  'colorPicker',
  'Color Picker',
  'pipette', // Icon name
  'utility' as ToolCategory,
  () => new ColorPickerTool(),
  {
    shortcut: 'I',
    hint: 'Pick a color from the canvas (I). Right-click to pick secondary color.'
  }
)

// Register the tool
ToolRegistry.register(ColorPickerDefinition)
