/**
 * Shading Tool - Lighten/Darken pixels with multiple modes
 * Based on Pixelorama's Shading.gd
 *
 * Supports three modes:
 * - SIMPLE: Basic lighten/darken blend
 * - HUE_SHIFTING: Advanced color shifting with hue, saturation, value
 * - COLOR_REPLACE: Replace colors using palette sequence
 */

import { BaseDrawTool, DrawToolConfig } from '../base/BaseDrawTool'
import { defineToolWithFactory, ToolRegistry } from '../registry'
import type { Point, DrawingContext } from '@/core/types'
import { LayerType } from '@/core/types'
import { bresenhamLine } from '@/lib/drawing'

// Shading type (what the tool does)
export enum ShadingType {
  SIMPLE = 'simple',
  HUE_SHIFTING = 'hue_shifting',
  COLOR_REPLACE = 'color_replace',
}

// Lighten or darken direction
export enum LightenDarken {
  LIGHTEN = 'lighten',
  DARKEN = 'darken',
}

interface ShadingConfig extends DrawToolConfig {
  shadingType: ShadingType
  lightenDarken: LightenDarken
  amount: number           // 0-100 for simple mode
  hueAmount: number        // 0-100 for hue shifting
  satAmount: number        // 0-100 for saturation shifting
  valueAmount: number      // 0-100 for value shifting
  colorArray: string[]     // Palette colors for color replace mode
}

// Hue limits for shifting (as fractions of 1.0)
const HUE_LIGHTEN_LIMIT = 60 / 360   // Yellow
const HUE_DARKEN_LIMIT = 240 / 360   // Blue
const SAT_LIGHTEN_LIMIT = 10 / 100
const VALUE_DARKEN_LIMIT = 10 / 100

// Color conversion utilities
function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  r /= 255
  g /= 255
  b /= 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min

  let h = 0
  const s = max === 0 ? 0 : delta / max
  const v = max

  if (delta !== 0) {
    if (max === r) {
      h = ((g - b) / delta) % 6
    } else if (max === g) {
      h = (b - r) / delta + 2
    } else {
      h = (r - g) / delta + 4
    }
    h /= 6
    if (h < 0) h += 1
  }

  return [h, s, v]
}

function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  h = ((h % 1) + 1) % 1
  const c = v * s
  const x = c * (1 - Math.abs(((h * 6) % 2) - 1))
  const m = v - c

  let r = 0, g = 0, b = 0

  const hi = Math.floor(h * 6) % 6
  switch (hi) {
    case 0: r = c; g = x; b = 0; break
    case 1: r = x; g = c; b = 0; break
    case 2: r = 0; g = c; b = x; break
    case 3: r = 0; g = x; b = c; break
    case 4: r = x; g = 0; b = c; break
    case 5: r = c; g = 0; b = x; break
  }

  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ]
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '')
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ]
}

export class ShadingTool extends BaseDrawTool {
  private shadingType: ShadingType = ShadingType.SIMPLE
  private lightenDarken: LightenDarken = LightenDarken.LIGHTEN
  private amount: number = 10
  private hueAmount: number = 10
  private satAmount: number = 10
  private valueAmount: number = 10
  private colorArray: string[] = []

  constructor() {
    super()
    this.isEraser = false
  }

  override getConfig(): ShadingConfig {
    return {
      ...super.getConfig(),
      shadingType: this.shadingType,
      lightenDarken: this.lightenDarken,
      amount: this.amount,
      hueAmount: this.hueAmount,
      satAmount: this.satAmount,
      valueAmount: this.valueAmount,
      colorArray: this.colorArray,
    }
  }

  override setConfig(config: Partial<ShadingConfig>): void {
    if (config.shadingType !== undefined) {
      this.shadingType = config.shadingType
    }
    if (config.lightenDarken !== undefined) {
      this.lightenDarken = config.lightenDarken
    }
    if (config.amount !== undefined) {
      this.amount = Math.max(0, Math.min(100, config.amount))
    }
    if (config.hueAmount !== undefined) {
      this.hueAmount = Math.max(0, Math.min(100, config.hueAmount))
    }
    if (config.satAmount !== undefined) {
      this.satAmount = Math.max(0, Math.min(100, config.satAmount))
    }
    if (config.valueAmount !== undefined) {
      this.valueAmount = Math.max(0, Math.min(100, config.valueAmount))
    }
    if (config.colorArray !== undefined) {
      this.colorArray = config.colorArray
    }
    super.setConfig(config)
  }

  // Getters and setters for UI binding
  getShadingType(): ShadingType {
    return this.shadingType
  }

  setShadingType(type: ShadingType): void {
    this.shadingType = type
    this.saveConfig()
  }

  getLightenDarken(): LightenDarken {
    return this.lightenDarken
  }

  setLightenDarken(mode: LightenDarken): void {
    this.lightenDarken = mode
    this.saveConfig()
  }

  getAmount(): number {
    return this.amount
  }

  setAmount(value: number): void {
    this.amount = Math.max(0, Math.min(100, value))
    this.saveConfig()
  }

  getHueAmount(): number {
    return this.hueAmount
  }

  setHueAmount(value: number): void {
    this.hueAmount = Math.max(0, Math.min(100, value))
    this.saveConfig()
  }

  getSatAmount(): number {
    return this.satAmount
  }

  setSatAmount(value: number): void {
    this.satAmount = Math.max(0, Math.min(100, value))
    this.saveConfig()
  }

  getValueAmount(): number {
    return this.valueAmount
  }

  setValueAmount(value: number): void {
    this.valueAmount = Math.max(0, Math.min(100, value))
    this.saveConfig()
  }

  getColorArray(): string[] {
    return this.colorArray
  }

  setColorArray(colors: string[]): void {
    this.colorArray = colors
    this.saveConfig()
  }

  protected override drawPixel(
    x: number,
    y: number,
    context: CanvasRenderingContext2D,
    _ctx: DrawingContext
  ): void {
    const imageData = context.getImageData(x, y, 1, 1)
    const data = imageData.data

    // Skip fully transparent pixels (except for color replace)
    if (data[3] === 0 && this.shadingType !== ShadingType.COLOR_REPLACE) {
      return
    }

    let r = data[0]
    let g = data[1]
    let b = data[2]

    switch (this.shadingType) {
      case ShadingType.SIMPLE:
        [r, g, b] = this.applySimpleShading(r, g, b)
        break
      case ShadingType.HUE_SHIFTING:
        [r, g, b] = this.applyHueShifting(r, g, b)
        break
      case ShadingType.COLOR_REPLACE:
        const result = this.applyColorReplace(r, g, b)
        if (result) {
          [r, g, b] = result
        } else {
          return // No replacement found
        }
        break
    }

    data[0] = Math.round(r)
    data[1] = Math.round(g)
    data[2] = Math.round(b)
    context.putImageData(imageData, x, y)
  }

  private applySimpleShading(r: number, g: number, b: number): [number, number, number] {
    const factor = this.amount / 100

    if (this.lightenDarken === LightenDarken.LIGHTEN) {
      r = Math.min(255, r + (255 - r) * factor)
      g = Math.min(255, g + (255 - g) * factor)
      b = Math.min(255, b + (255 - b) * factor)
    } else {
      r = Math.max(0, r * (1 - factor))
      g = Math.max(0, g * (1 - factor))
      b = Math.max(0, b * (1 - factor))
    }

    return [r, g, b]
  }

  private applyHueShifting(r: number, g: number, b: number): [number, number, number] {
    let [h, s, v] = rgbToHsv(r, g, b)

    let hueShift = this.hueAmount / 360
    const satShift = this.satAmount / 100
    const valueShift = this.valueAmount / 100

    // Reverse hue direction for colors between yellow-green-blue
    if (this.hueRange(h)) {
      hueShift = -hueShift
    }

    if (this.lightenDarken === LightenDarken.LIGHTEN) {
      // Limit hue shift when lightening
      hueShift = this.hueLimitLighten(h, hueShift)
      h = ((h + hueShift) % 1 + 1) % 1

      // Reduce saturation (towards pastel)
      if (s > SAT_LIGHTEN_LIMIT) {
        s = Math.max(s - Math.min(satShift, s), SAT_LIGHTEN_LIMIT)
      }

      // Increase value (brighter)
      v = Math.min(1, v + valueShift)
    } else {
      // Limit hue shift when darkening
      hueShift = this.hueLimitDarken(h, hueShift)
      h = ((h - hueShift) % 1 + 1) % 1

      // Increase saturation
      s = Math.min(1, s + satShift)

      // Decrease value (darker)
      if (v > VALUE_DARKEN_LIMIT) {
        v = Math.max(v - Math.min(valueShift, v), VALUE_DARKEN_LIMIT)
      }
    }

    return hsvToRgb(h, s, v)
  }

  private applyColorReplace(r: number, g: number, b: number): [number, number, number] | null {
    if (this.colorArray.length === 0) {
      return null
    }

    const currentHex = rgbToHex(r, g, b).toLowerCase()
    const index = this.colorArray.findIndex(c => c.toLowerCase() === currentHex)

    if (index === -1) {
      return null
    }

    if (this.lightenDarken === LightenDarken.LIGHTEN) {
      // Move to right (next color in palette)
      if (index < this.colorArray.length - 1) {
        return hexToRgb(this.colorArray[index + 1])
      }
    } else {
      // Move to left (previous color in palette)
      if (index > 0) {
        return hexToRgb(this.colorArray[index - 1])
      }
    }

    return null
  }

  // Returns true if color is roughly between yellow, green and blue
  private hueRange(hue: number): boolean {
    return hue > HUE_LIGHTEN_LIMIT && hue < HUE_DARKEN_LIMIT
  }

  private hueLimitLighten(hue: number, hueShift: number): number {
    // Colors between red-orange-yellow and blue-purple-red
    if (hueShift > 0) {
      if (hue < HUE_DARKEN_LIMIT) {
        // red-orange-yellow
        if (hue + hueShift >= HUE_LIGHTEN_LIMIT) {
          hueShift = HUE_LIGHTEN_LIMIT - hue
        }
      } else {
        // blue-purple-red
        if (hue + hueShift >= HUE_LIGHTEN_LIMIT + 1) {
          hueShift = HUE_LIGHTEN_LIMIT - hue
        }
      }
    } else if (hueShift < 0 && hue + hueShift <= HUE_LIGHTEN_LIMIT) {
      // yellow-green-blue
      hueShift = HUE_LIGHTEN_LIMIT - hue
    }
    return hueShift
  }

  private hueLimitDarken(hue: number, hueShift: number): number {
    // Colors between red-orange-yellow and blue-purple-red
    if (hueShift > 0) {
      if (hue < HUE_DARKEN_LIMIT) {
        // red-orange-yellow
        if (hue - hueShift <= HUE_DARKEN_LIMIT - 1) {
          hueShift = hue - HUE_DARKEN_LIMIT
        }
      } else {
        // blue-purple-red
        if (hue - hueShift <= HUE_DARKEN_LIMIT) {
          hueShift = hue - HUE_DARKEN_LIMIT
        }
      }
    } else if (hueShift < 0 && hue - hueShift >= HUE_DARKEN_LIMIT) {
      // yellow-green-blue
      hueShift = hue - HUE_DARKEN_LIMIT
    }
    return hueShift
  }

  protected override drawBrush(pos: Point, ctx: DrawingContext): void {
    const { ctx: context, canvas } = ctx
    const halfSize = Math.floor(this.brushSize / 2)

    for (let dy = 0; dy < this.brushSize; dy++) {
      for (let dx = 0; dx < this.brushSize; dx++) {
        const px = pos.x - halfSize + dx
        const py = pos.y - halfSize + dy

        if (px < 0 || px >= canvas.width || py < 0 || py >= canvas.height) {
          continue
        }

        const cacheKey = { x: px, y: py }
        if (this.isInCache(cacheKey)) {
          continue
        }
        this.addToCache(cacheKey)

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
  'shading',
  'Shading',
  'sun',
  'design',
  () => new ShadingTool(),
  {
    layerTypes: [LayerType.PIXEL],
    hint: 'Lighten or darken pixels with multiple shading modes',
    shortcut: 'u',
  }
)

ToolRegistry.register(ShadingDefinition)
