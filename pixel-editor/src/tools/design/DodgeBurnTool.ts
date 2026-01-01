/**
 * Dodge & Burn Tools - Selectively lighten or darken areas
 * Based on Pixelorama's shading functionality but with localized control
 *
 * Dodge: Lightens pixels (like photographic dodging)
 * Burn: Darkens pixels (like photographic burning)
 */

import { BaseTool } from '../base/BaseTool'
import { defineToolWithFactory, ToolRegistry } from '../registry'
import type { Point, CanvasMouseEvent, DrawingContext } from '@/core/types'
import { LayerType } from '@/core/types'
import { bresenhamLine } from '@/lib/drawing'
import { useToolsStore } from '@/store/tools-store'

// ============================================================================
// Types
// ============================================================================

export type DodgeBurnMode = 'dodge' | 'burn'
export type ToneRange = 'shadows' | 'midtones' | 'highlights'

// ============================================================================
// Dodge/Burn Tool
// ============================================================================

export class DodgeBurnTool extends BaseTool {
  private mode: DodgeBurnMode = 'dodge'
  private brushSize: number = 8
  private exposure: number = 50  // 0-100, strength of effect
  private range: ToneRange = 'midtones'
  private undoImageData: ImageData | null = null
  private drawCache: Set<string> = new Set()

  // ============================================================================
  // Configuration
  // ============================================================================

  getMode(): DodgeBurnMode {
    return this.mode
  }

  setMode(mode: DodgeBurnMode): void {
    this.mode = mode
  }

  toggleMode(): void {
    this.mode = this.mode === 'dodge' ? 'burn' : 'dodge'
  }

  getBrushSize(): number {
    return this.brushSize
  }

  setBrushSize(size: number): void {
    this.brushSize = Math.max(1, Math.min(64, size))
  }

  getExposure(): number {
    return this.exposure
  }

  setExposure(exposure: number): void {
    this.exposure = Math.max(1, Math.min(100, exposure))
  }

  getRange(): ToneRange {
    return this.range
  }

  setRange(range: ToneRange): void {
    this.range = range
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

    // Clear draw cache
    this.drawCache.clear()

    // Apply at initial position
    this.applyAt(pos, context, canvas.width, canvas.height)
  }

  protected onDrawMove(
    pos: Point,
    _event: CanvasMouseEvent,
    ctx: DrawingContext
  ): void {
    const { ctx: context, canvas } = ctx
    const lastPoint = this.getLastPoint()

    if (lastPoint) {
      const points = bresenhamLine(lastPoint.x, lastPoint.y, pos.x, pos.y)
      for (const point of points) {
        this.applyAt(point, context, canvas.width, canvas.height)
      }
    } else {
      this.applyAt(pos, context, canvas.width, canvas.height)
    }
  }

  protected onDrawEnd(
    pos: Point,
    _event: CanvasMouseEvent,
    ctx: DrawingContext
  ): void {
    const { ctx: context, canvas } = ctx

    // Apply at final position
    this.applyAt(pos, context, canvas.width, canvas.height)

    // Clear caches
    this.drawCache.clear()
    this.undoImageData = null
  }

  protected onDrawCancel(): void {
    this.drawCache.clear()
    this.undoImageData = null
  }

  // ============================================================================
  // Dodge/Burn Operations
  // ============================================================================

  private applyAt(
    pos: Point,
    context: CanvasRenderingContext2D,
    canvasWidth: number,
    canvasHeight: number
  ): void {
    const radius = Math.floor(this.brushSize / 2)
    const exposureFactor = this.exposure / 100

    // Get current canvas data
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

          const px = drawPos.x + dx
          const py = drawPos.y + dy

          // Bounds check
          if (px < 0 || px >= canvasWidth || py < 0 || py >= canvasHeight) {
            continue
          }

          // Check cache (only apply once per stroke)
          const cacheKey = `${px},${py}`
          if (this.drawCache.has(cacheKey)) continue
          this.drawCache.add(cacheKey)

          const idx = (py * canvasWidth + px) * 4

          // Get current color
          const r = canvasData.data[idx]
          const g = canvasData.data[idx + 1]
          const b = canvasData.data[idx + 2]
          const a = canvasData.data[idx + 3]

          // Skip fully transparent pixels
          if (a === 0) continue

          // Calculate luminance (0-255)
          const luminance = 0.299 * r + 0.587 * g + 0.114 * b

          // Check if pixel is in the selected range
          const rangeMultiplier = this.getRangeMultiplier(luminance)

          // Calculate falloff based on distance
          const falloff = 1 - (dist / radius)
          const strength = exposureFactor * falloff * rangeMultiplier

          // Apply dodge or burn
          let newR: number, newG: number, newB: number

          if (this.mode === 'dodge') {
            // Lighten: move towards white
            newR = Math.min(255, r + (255 - r) * strength)
            newG = Math.min(255, g + (255 - g) * strength)
            newB = Math.min(255, b + (255 - b) * strength)
          } else {
            // Burn: move towards black
            newR = Math.max(0, r - r * strength)
            newG = Math.max(0, g - g * strength)
            newB = Math.max(0, b - b * strength)
          }

          canvasData.data[idx] = Math.round(newR)
          canvasData.data[idx + 1] = Math.round(newG)
          canvasData.data[idx + 2] = Math.round(newB)
        }
      }
    }

    // Update canvas
    context.putImageData(canvasData, 0, 0)
  }

  /**
   * Get multiplier based on tone range
   * Shadows: affects dark pixels more
   * Midtones: affects medium pixels more
   * Highlights: affects bright pixels more
   */
  private getRangeMultiplier(luminance: number): number {
    switch (this.range) {
      case 'shadows':
        // More effect on darker pixels (luminance 0-85)
        if (luminance < 85) return 1
        if (luminance < 128) return 1 - (luminance - 85) / 43
        return 0
      case 'midtones':
        // More effect on medium pixels (luminance 85-170)
        if (luminance < 85) return luminance / 85
        if (luminance < 170) return 1
        return 1 - (luminance - 170) / 85
      case 'highlights':
        // More effect on brighter pixels (luminance 170-255)
        if (luminance < 128) return 0
        if (luminance < 170) return (luminance - 128) / 42
        return 1
      default:
        return 1
    }
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

    // Choose color based on mode
    const modeColor = this.mode === 'dodge' ? '#ffcc00' : '#663300'

    ctx.strokeStyle = modeColor
    ctx.lineWidth = 2

    // Draw circular brush outline
    ctx.beginPath()
    ctx.arc(pos.x + 0.5, pos.y + 0.5, radius, 0, Math.PI * 2)
    ctx.stroke()

    // Draw inner circle for falloff preview
    ctx.strokeStyle = color
    ctx.lineWidth = 1
    ctx.setLineDash([2, 2])
    ctx.beginPath()
    ctx.arc(pos.x + 0.5, pos.y + 0.5, radius * 0.5, 0, Math.PI * 2)
    ctx.stroke()
    ctx.setLineDash([])

    // Draw mode indicator
    ctx.fillStyle = modeColor
    ctx.font = 'bold 10px sans-serif'
    const label = this.mode === 'dodge' ? 'D' : 'B'
    ctx.fillText(label, pos.x + radius + 3, pos.y - radius)

    // Draw crosshair
    ctx.strokeStyle = color
    ctx.beginPath()
    ctx.moveTo(pos.x - 3, pos.y + 0.5)
    ctx.lineTo(pos.x + 4, pos.y + 0.5)
    ctx.moveTo(pos.x + 0.5, pos.y - 3)
    ctx.lineTo(pos.x + 0.5, pos.y + 4)
    ctx.stroke()
  }
}

// ============================================================================
// Tool Definitions
// ============================================================================

// Dodge Tool (shared class, different default mode)
export const DodgeToolDefinition = defineToolWithFactory(
  'dodge',
  'Dodge',
  'sun',
  'design',
  () => {
    const tool = new DodgeBurnTool()
    tool.setMode('dodge')
    return tool
  },
  {
    layerTypes: [LayerType.PIXEL],
    hint: 'Lighten areas. Adjust exposure and tone range for precise control.',
    shortcut: 'O',
  }
)

// Burn Tool (shared class, different default mode)
export const BurnToolDefinition = defineToolWithFactory(
  'burn',
  'Burn',
  'flame',
  'design',
  () => {
    const tool = new DodgeBurnTool()
    tool.setMode('burn')
    return tool
  },
  {
    layerTypes: [LayerType.PIXEL],
    hint: 'Darken areas. Adjust exposure and tone range for precise control.',
    shortcut: 'Shift+O',
  }
)

ToolRegistry.register(DodgeToolDefinition)
ToolRegistry.register(BurnToolDefinition)
