/**
 * BaseDrawTool - Base class for drawing/painting tools.
 * Extends BaseTool with brush, color, and drawing-specific functionality.
 * Mirrors Pixelorama's BaseDraw.gd
 */

import { BaseTool } from './BaseTool'
import type { Point, ToolConfig, CanvasMouseEvent, DrawingContext, BrushConfig } from '@/core/types'
import { DEFAULT_BRUSH_SIZE, DEFAULT_BRUSH_OPACITY } from '@/core/constants'
import { bresenhamLine } from '@/lib/drawing'
import { useToolsStore } from '@/store/tools-store'
import { shouldDrawDithered } from '@/core/dithering'

// ============================================================================
// Draw Tool Config
// ============================================================================

export interface DrawToolConfig extends ToolConfig {
  brushSize: number
  brushOpacity: number
  pixelPerfect: boolean
  overwrite: boolean
  spacingMode: boolean
  spacing: { x: number; y: number }
}

// ============================================================================
// BaseDrawTool Class
// ============================================================================

export abstract class BaseDrawTool extends BaseTool {
  // Brush settings
  protected brushSize: number = DEFAULT_BRUSH_SIZE
  protected brushOpacity: number = DEFAULT_BRUSH_OPACITY
  protected pixelPerfect: boolean = false
  protected overwrite: boolean = false
  protected spacingMode: boolean = false
  protected spacing: { x: number; y: number } = { x: 1, y: 1 }

  // Drawing state
  protected isEraser: boolean = false
  protected lastSpacingPos: Point | null = null

  // Undo data
  protected undoImageData: ImageData | null = null

  // ============================================================================
  // Configuration
  // ============================================================================

  override getConfig(): DrawToolConfig {
    return {
      ...super.getConfig(),
      brushSize: this.brushSize,
      brushOpacity: this.brushOpacity,
      pixelPerfect: this.pixelPerfect,
      overwrite: this.overwrite,
      spacingMode: this.spacingMode,
      spacing: { ...this.spacing },
    }
  }

  override setConfig(config: Partial<DrawToolConfig>): void {
    if (config.brushSize !== undefined) {
      this.brushSize = Math.max(1, Math.min(128, config.brushSize))
    }
    if (config.brushOpacity !== undefined) {
      this.brushOpacity = Math.max(0, Math.min(100, config.brushOpacity))
    }
    if (config.pixelPerfect !== undefined) {
      this.pixelPerfect = config.pixelPerfect
    }
    if (config.overwrite !== undefined) {
      this.overwrite = config.overwrite
    }
    if (config.spacingMode !== undefined) {
      this.spacingMode = config.spacingMode
    }
    if (config.spacing !== undefined) {
      this.spacing = { ...config.spacing }
    }
    super.setConfig(config)
  }

  // ============================================================================
  // Overwrite & Spacing Methods
  // ============================================================================

  /**
   * Get overwrite mode state.
   */
  getOverwrite(): boolean {
    return this.overwrite
  }

  /**
   * Set overwrite mode.
   */
  setOverwrite(value: boolean): void {
    this.overwrite = value
    this.saveConfig()
  }

  /**
   * Get spacing mode state.
   */
  getSpacingMode(): boolean {
    return this.spacingMode
  }

  /**
   * Set spacing mode.
   */
  setSpacingMode(value: boolean): void {
    this.spacingMode = value
    this.saveConfig()
  }

  /**
   * Get spacing values.
   */
  getSpacing(): { x: number; y: number } {
    return { ...this.spacing }
  }

  /**
   * Set spacing values.
   */
  setSpacing(x: number, y: number): void {
    this.spacing = { x: Math.max(1, x), y: Math.max(1, y) }
    this.saveConfig()
  }

  /**
   * Check if a position should be drawn based on spacing.
   */
  protected shouldDrawAtPosition(pos: Point): boolean {
    if (!this.spacingMode) return true

    if (!this.lastSpacingPos) {
      this.lastSpacingPos = pos
      return true
    }

    const dx = Math.abs(pos.x - this.lastSpacingPos.x)
    const dy = Math.abs(pos.y - this.lastSpacingPos.y)

    if (dx >= this.spacing.x || dy >= this.spacing.y) {
      this.lastSpacingPos = pos
      return true
    }

    return false
  }

  // ============================================================================
  // Brush Methods
  // ============================================================================

  /**
   * Get current brush size.
   */
  getBrushSize(): number {
    return this.brushSize
  }

  /**
   * Set brush size.
   */
  setBrushSize(size: number): void {
    this.brushSize = Math.max(1, Math.min(128, size))
    this.saveConfig()
  }

  /**
   * Get brush opacity (0-100).
   */
  getBrushOpacity(): number {
    return this.brushOpacity
  }

  /**
   * Set brush opacity.
   */
  setBrushOpacity(opacity: number): void {
    this.brushOpacity = Math.max(0, Math.min(100, opacity))
    this.saveConfig()
  }

  /**
   * Get brush configuration.
   */
  getBrushConfig(): BrushConfig {
    return {
      size: this.brushSize,
      opacity: this.brushOpacity,
      hardness: 100,
      spacing: 0,
    }
  }

  // ============================================================================
  // Drawing Implementation
  // ============================================================================

  protected override onDrawStart(
    pos: Point,
    event: CanvasMouseEvent,
    ctx: DrawingContext
  ): void {
    // Save undo data before starting
    this.prepareUndo(ctx)

    // Reset spacing tracking
    this.lastSpacingPos = null

    // Draw initial point
    if (this.shouldDrawAtPosition(pos)) {
      this.drawBrush(pos, ctx)
    }
  }

  protected override onDrawMove(
    pos: Point,
    _event: CanvasMouseEvent,
    ctx: DrawingContext
  ): void {
    const lastPoint = this.getLastPoint()

    if (lastPoint) {
      // Use Bresenham's algorithm for smooth lines
      this.drawLineBetween(lastPoint, pos, ctx)
    } else {
      this.drawBrush(pos, ctx)
    }
  }

  protected override onDrawEnd(
    pos: Point,
    _event: CanvasMouseEvent,
    ctx: DrawingContext
  ): void {
    // Draw final point
    this.drawBrush(pos, ctx)

    // Commit undo
    this.commitUndo(ctx)
  }

  protected override onDrawCancel(): void {
    // Restore from undo data
    // This would require access to canvas context
    this.undoImageData = null
  }

  // ============================================================================
  // Brush Drawing
  // ============================================================================

  /**
   * Draw brush at a single point with symmetry support.
   */
  protected drawBrush(pos: Point, ctx: DrawingContext): void {
    const { ctx: context, canvas } = ctx
    const { mirrorH, mirrorV } = useToolsStore.getState()

    // Calculate all positions to draw (original + mirrored)
    const positions: Point[] = [pos]

    if (mirrorH) {
      const mirroredX = canvas.width - 1 - pos.x
      positions.push({ x: mirroredX, y: pos.y })
    }

    if (mirrorV) {
      const mirroredY = canvas.height - 1 - pos.y
      positions.push({ x: pos.x, y: mirroredY })
    }

    if (mirrorH && mirrorV) {
      const mirroredX = canvas.width - 1 - pos.x
      const mirroredY = canvas.height - 1 - pos.y
      positions.push({ x: mirroredX, y: mirroredY })
    }

    // Draw at all positions
    for (const drawPos of positions) {
      this.drawBrushAt(drawPos, context, ctx, canvas.width, canvas.height)
    }
  }

  /**
   * Draw brush at a specific position (internal method).
   */
  private drawBrushAt(
    pos: Point,
    context: CanvasRenderingContext2D,
    ctx: DrawingContext,
    canvasWidth: number,
    canvasHeight: number
  ): void {
    const halfSize = Math.floor(this.brushSize / 2)

    for (let dy = 0; dy < this.brushSize; dy++) {
      for (let dx = 0; dx < this.brushSize; dx++) {
        const px = pos.x - halfSize + dx
        const py = pos.y - halfSize + dy

        // Bounds check
        if (px < 0 || px >= canvasWidth || py < 0 || py >= canvasHeight) {
          continue
        }

        // Cache check to prevent overdraw
        const cacheKey = { x: px, y: py }
        if (this.isInCache(cacheKey)) {
          continue
        }
        this.addToCache(cacheKey)

        // Draw pixel
        this.drawPixel(px, py, context, ctx)
      }
    }
  }

  /**
   * Draw a single pixel.
   * Override in subclasses for different behavior (eraser, etc.)
   */
  protected drawPixel(
    x: number,
    y: number,
    context: CanvasRenderingContext2D,
    ctx: DrawingContext
  ): void {
    // Check dither pattern
    const { ditherPattern } = useToolsStore.getState()
    if (!shouldDrawDithered(x, y, ditherPattern)) {
      return
    }

    if (this.isEraser) {
      context.clearRect(x, y, 1, 1)
    } else {
      const alpha = this.brushOpacity / 100

      if (this.overwrite) {
        // Overwrite mode: completely replace the pixel
        context.clearRect(x, y, 1, 1)
        context.fillStyle = ctx.color
        context.globalAlpha = alpha
        context.fillRect(x, y, 1, 1)
        context.globalAlpha = 1
      } else {
        // Normal blend mode
        context.fillStyle = ctx.color
        context.globalAlpha = alpha
        context.fillRect(x, y, 1, 1)
        context.globalAlpha = 1
      }
    }
  }

  /**
   * Draw line between two points using Bresenham's algorithm.
   */
  protected drawLineBetween(from: Point, to: Point, ctx: DrawingContext): void {
    const points = bresenhamLine(from.x, from.y, to.x, to.y)

    for (const point of points) {
      if (this.shouldDrawAtPosition(point)) {
        this.drawBrush(point, ctx)
      }
    }
  }

  // ============================================================================
  // Undo/Redo
  // ============================================================================

  /**
   * Prepare undo data before drawing.
   */
  protected prepareUndo(ctx: DrawingContext): void {
    const { ctx: context, canvas } = ctx
    this.undoImageData = context.getImageData(0, 0, canvas.width, canvas.height)
  }

  /**
   * Commit undo data after drawing.
   * This would integrate with a history system.
   */
  protected commitUndo(_ctx: DrawingContext): void {
    // TODO: Integrate with history system
    // For now, just clear the undo data
    this.undoImageData = null
  }

  // ============================================================================
  // Indicator
  // ============================================================================

  override drawIndicator(
    ctx: CanvasRenderingContext2D,
    pos: Point,
    color: string
  ): void {
    const halfSize = Math.floor(this.brushSize / 2)
    const x = pos.x - halfSize
    const y = pos.y - halfSize

    ctx.strokeStyle = color
    ctx.lineWidth = 1

    // Draw brush outline
    ctx.strokeRect(x + 0.5, y + 0.5, this.brushSize - 1, this.brushSize - 1)
  }
}
