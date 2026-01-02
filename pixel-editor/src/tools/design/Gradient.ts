/**
 * Gradient Tool - Draw gradients between two points
 * Based on Pixelorama's Gradient functionality
 */

import { BaseTool } from '../base/BaseTool'
import { defineToolWithFactory, ToolRegistry } from '../registry'
import type { Point, CanvasMouseEvent, DrawingContext, ToolConfig, ToolCategory } from '@/core/types'
import { hexToRgb } from '@/lib/drawing'

export type GradientType = 'linear' | 'radial'
export type GradientInterpolation = 'linear' | 'step' | 'smooth'

interface GradientConfig extends ToolConfig {
  gradientType: GradientType
  interpolation: GradientInterpolation
  steps: number // For step interpolation
  dithering: boolean
}

export class GradientTool extends BaseTool {
  private startPos: Point | null = null
  private endPos: Point | null = null
  private gradientType: GradientType = 'linear'
  private interpolation: GradientInterpolation = 'linear'
  private steps: number = 8
  private dithering: boolean = true
  private previewData: ImageData | null = null

  override getConfig(): GradientConfig {
    return {
      ...super.getConfig(),
      gradientType: this.gradientType,
      interpolation: this.interpolation,
      steps: this.steps,
      dithering: this.dithering,
    }
  }

  override setConfig(config: Partial<GradientConfig>): void {
    if (config.gradientType !== undefined) {
      this.gradientType = config.gradientType
    }
    if (config.interpolation !== undefined) {
      this.interpolation = config.interpolation
    }
    if (config.steps !== undefined) {
      this.steps = Math.max(2, Math.min(256, config.steps))
    }
    if (config.dithering !== undefined) {
      this.dithering = config.dithering
    }
    super.setConfig(config)
  }

  protected override onDrawStart(
    pos: Point,
    _event: CanvasMouseEvent,
    ctx: DrawingContext
  ): void {
    this.startPos = { x: Math.round(pos.x), y: Math.round(pos.y) }
    this.endPos = { x: Math.round(pos.x), y: Math.round(pos.y) }

    // Save current state for preview
    this.previewData = ctx.ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height)
  }

  protected override onDrawMove(
    pos: Point,
    _event: CanvasMouseEvent,
    ctx: DrawingContext
  ): void {
    if (!this.startPos || !this.previewData) return

    this.endPos = { x: Math.round(pos.x), y: Math.round(pos.y) }

    // Restore original data
    ctx.ctx.putImageData(this.previewData, 0, 0)

    // Draw preview gradient
    this.drawGradient(ctx)
  }

  protected override onDrawEnd(
    _pos: Point,
    _event: CanvasMouseEvent,
    ctx: DrawingContext
  ): void {
    if (!this.startPos || !this.endPos) {
      this.resetTool()
      return
    }

    // Restore original and draw final gradient
    if (this.previewData) {
      ctx.ctx.putImageData(this.previewData, 0, 0)
    }

    this.drawGradient(ctx)
    this.resetTool()
  }

  protected override onDrawCancel(): void {
    this.resetTool()
  }

  private resetTool(): void {
    this.startPos = null
    this.endPos = null
    this.previewData = null
  }

  private drawGradient(ctx: DrawingContext): void {
    if (!this.startPos || !this.endPos) return

    const { ctx: context, canvas, color, secondaryColor } = ctx
    const width = canvas.width
    const height = canvas.height

    const startColor = hexToRgb(color)
    const endColor = hexToRgb(secondaryColor || '#ffffff')

    const imageData = context.getImageData(0, 0, width, height)

    if (this.gradientType === 'linear') {
      this.drawLinearGradient(imageData, startColor, endColor, width, height)
    } else {
      this.drawRadialGradient(imageData, startColor, endColor, width, height)
    }

    context.putImageData(imageData, 0, 0)
  }

  private drawLinearGradient(
    imageData: ImageData,
    startColor: { r: number; g: number; b: number; a: number },
    endColor: { r: number; g: number; b: number; a: number },
    width: number,
    height: number
  ): void {
    if (!this.startPos || !this.endPos) return

    const dx = this.endPos.x - this.startPos.x
    const dy = this.endPos.y - this.startPos.y
    const len = Math.sqrt(dx * dx + dy * dy)

    if (len === 0) return

    // Normalized direction
    const nx = dx / len
    const ny = dy / len

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        // Project point onto gradient line
        const px = x - this.startPos.x
        const py = y - this.startPos.y
        let t = (px * nx + py * ny) / len

        // Clamp t to [0, 1]
        t = Math.max(0, Math.min(1, t))

        // Apply interpolation
        t = this.applyInterpolation(t)

        // Apply dithering
        if (this.dithering) {
          t = this.applyDithering(t, x, y)
        }

        // Interpolate color
        const r = Math.round(startColor.r + (endColor.r - startColor.r) * t)
        const g = Math.round(startColor.g + (endColor.g - startColor.g) * t)
        const b = Math.round(startColor.b + (endColor.b - startColor.b) * t)
        const a = Math.round(startColor.a + (endColor.a - startColor.a) * t)

        const idx = (y * width + x) * 4

        // Alpha blend with existing pixel
        if (a > 0) {
          const alpha = a / 255
          imageData.data[idx] = Math.round(r * alpha + imageData.data[idx] * (1 - alpha))
          imageData.data[idx + 1] = Math.round(g * alpha + imageData.data[idx + 1] * (1 - alpha))
          imageData.data[idx + 2] = Math.round(b * alpha + imageData.data[idx + 2] * (1 - alpha))
          imageData.data[idx + 3] = Math.min(255, imageData.data[idx + 3] + a)
        }
      }
    }
  }

  private drawRadialGradient(
    imageData: ImageData,
    startColor: { r: number; g: number; b: number; a: number },
    endColor: { r: number; g: number; b: number; a: number },
    width: number,
    height: number
  ): void {
    if (!this.startPos || !this.endPos) return

    const dx = this.endPos.x - this.startPos.x
    const dy = this.endPos.y - this.startPos.y
    const radius = Math.sqrt(dx * dx + dy * dy)

    if (radius === 0) return

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const px = x - this.startPos.x
        const py = y - this.startPos.y
        const dist = Math.sqrt(px * px + py * py)
        let t = dist / radius

        // Clamp t to [0, 1]
        t = Math.max(0, Math.min(1, t))

        // Apply interpolation
        t = this.applyInterpolation(t)

        // Apply dithering
        if (this.dithering) {
          t = this.applyDithering(t, x, y)
        }

        // Interpolate color
        const r = Math.round(startColor.r + (endColor.r - startColor.r) * t)
        const g = Math.round(startColor.g + (endColor.g - startColor.g) * t)
        const b = Math.round(startColor.b + (endColor.b - startColor.b) * t)
        const a = Math.round(startColor.a + (endColor.a - startColor.a) * t)

        const idx = (y * width + x) * 4

        if (a > 0) {
          const alpha = a / 255
          imageData.data[idx] = Math.round(r * alpha + imageData.data[idx] * (1 - alpha))
          imageData.data[idx + 1] = Math.round(g * alpha + imageData.data[idx + 1] * (1 - alpha))
          imageData.data[idx + 2] = Math.round(b * alpha + imageData.data[idx + 2] * (1 - alpha))
          imageData.data[idx + 3] = Math.min(255, imageData.data[idx + 3] + a)
        }
      }
    }
  }

  private applyInterpolation(t: number): number {
    switch (this.interpolation) {
      case 'step':
        return Math.floor(t * this.steps) / this.steps
      case 'smooth':
        // Smooth step interpolation
        return t * t * (3 - 2 * t)
      case 'linear':
      default:
        return t
    }
  }

  private applyDithering(t: number, x: number, y: number): number {
    // Ordered dithering using Bayer matrix
    const bayer4x4 = [
      [0, 8, 2, 10],
      [12, 4, 14, 6],
      [3, 11, 1, 9],
      [15, 7, 13, 5],
    ]

    const threshold = bayer4x4[y % 4][x % 4] / 16
    const step = 1 / this.steps
    const quantized = Math.floor(t / step) * step
    const nextStep = quantized + step

    return t + (threshold - 0.5) * step < nextStep ? quantized : Math.min(1, nextStep)
  }

  override drawIndicator(
    ctx: CanvasRenderingContext2D,
    pos: Point,
    color: string,
    secondaryColor?: string
  ): void {
    const startColor = color
    const endColor = secondaryColor || '#ffffff'

    if (this.startPos) {
      const dx = pos.x - this.startPos.x
      const dy = pos.y - this.startPos.y
      const len = Math.sqrt(dx * dx + dy * dy)

      // Draw main gradient line
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(this.startPos.x + 0.5, this.startPos.y + 0.5)
      ctx.lineTo(pos.x + 0.5, pos.y + 0.5)
      ctx.stroke()

      // Draw black outline for visibility
      ctx.strokeStyle = '#000000'
      ctx.lineWidth = 1
      ctx.setLineDash([2, 2])
      ctx.beginPath()
      ctx.moveTo(this.startPos.x + 0.5, this.startPos.y + 0.5)
      ctx.lineTo(pos.x + 0.5, pos.y + 0.5)
      ctx.stroke()
      ctx.setLineDash([])

      // Draw color stops along the line
      const numStops = this.interpolation === 'step' ? this.steps : 5
      for (let i = 0; i <= numStops; i++) {
        const t = i / numStops
        const stopX = this.startPos.x + dx * t
        const stopY = this.startPos.y + dy * t

        // Interpolate color for this stop
        const startRgb = hexToRgb(startColor)
        const endRgb = hexToRgb(endColor)
        const r = Math.round(startRgb.r + (endRgb.r - startRgb.r) * t)
        const g = Math.round(startRgb.g + (endRgb.g - startRgb.g) * t)
        const b = Math.round(startRgb.b + (endRgb.b - startRgb.b) * t)
        const stopColor = `rgb(${r},${g},${b})`

        // Draw color stop circle
        const radius = (i === 0 || i === numStops) ? 5 : 3
        ctx.fillStyle = stopColor
        ctx.beginPath()
        ctx.arc(stopX, stopY, radius, 0, Math.PI * 2)
        ctx.fill()

        // Draw outline
        ctx.strokeStyle = '#000000'
        ctx.lineWidth = 1
        ctx.stroke()
      }

      // Draw start point label with color
      ctx.fillStyle = startColor
      ctx.strokeStyle = '#000000'
      ctx.lineWidth = 2
      ctx.font = 'bold 10px sans-serif'
      ctx.strokeText('START', this.startPos.x + 8, this.startPos.y - 8)
      ctx.fillText('START', this.startPos.x + 8, this.startPos.y - 8)

      // Draw end point label with color
      ctx.fillStyle = endColor
      ctx.strokeText('END', pos.x + 8, pos.y - 8)
      ctx.fillText('END', pos.x + 8, pos.y - 8)

      // Show gradient type indicator
      if (this.gradientType === 'radial' && len > 10) {
        // Draw radius circle for radial gradient
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'
        ctx.lineWidth = 1
        ctx.setLineDash([4, 4])
        ctx.beginPath()
        ctx.arc(this.startPos.x, this.startPos.y, len, 0, Math.PI * 2)
        ctx.stroke()
        ctx.setLineDash([])
      }

      // Show length in pixels
      if (len > 20) {
        const midX = (this.startPos.x + pos.x) / 2
        const midY = (this.startPos.y + pos.y) / 2
        const lengthText = `${Math.round(len)}px`
        ctx.fillStyle = '#ffffff'
        ctx.strokeStyle = '#000000'
        ctx.lineWidth = 2
        ctx.font = '9px sans-serif'
        ctx.strokeText(lengthText, midX + 5, midY - 5)
        ctx.fillText(lengthText, midX + 5, midY - 5)
      }
    } else {
      // Draw crosshair when not dragging
      ctx.strokeStyle = color
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(pos.x - 5, pos.y + 0.5)
      ctx.lineTo(pos.x + 6, pos.y + 0.5)
      ctx.moveTo(pos.x + 0.5, pos.y - 5)
      ctx.lineTo(pos.x + 0.5, pos.y + 6)
      ctx.stroke()
    }
  }

  // Getters for configuration
  getGradientType(): GradientType { return this.gradientType }
  getInterpolation(): GradientInterpolation { return this.interpolation }
  getSteps(): number { return this.steps }
  getDithering(): boolean { return this.dithering }

  // Setters for configuration
  setGradientType(type: GradientType): void { this.gradientType = type }
  setInterpolation(interpolation: GradientInterpolation): void { this.interpolation = interpolation }
  setSteps(steps: number): void { this.steps = Math.max(2, Math.min(256, steps)) }
  setDithering(enabled: boolean): void { this.dithering = enabled }
}

// Tool definition
export const GradientDefinition = defineToolWithFactory(
  'gradient',
  'Gradient',
  'gradient',
  'design' as ToolCategory,
  () => new GradientTool(),
  {
    shortcut: 'F',
    hint: 'Gradient (F). Drag to create gradient from primary to secondary color'
  }
)

// Register the tool
ToolRegistry.register(GradientDefinition)
