/**
 * ToolManager - Central tool management and event routing.
 * Mirrors Pixelorama's Tools.gd architecture.
 *
 * Responsibilities:
 * - Route pointer events to active tool
 * - Manage tool state (colors, mirror, etc.)
 * - Handle tool switching
 * - Provide drawing context to tools
 */

import { ToolRegistry } from './registry'
import type { BaseTool } from './base/BaseTool'
import type { Point, DrawingContext, CanvasMouseEvent } from '@/core/types'
import { useEditorStore } from '@/store/editor-store'
import { useToolsStore } from '@/store/tools-store'
import { bresenhamLine } from '@/lib/drawing'

// ============================================================================
// Types
// ============================================================================

export interface ToolManagerState {
  activeButton: 'left' | 'right' | null
  isDrawing: boolean
  lastPosition: Point | null
  startPosition: Point | null
  stabilizerCenter: Point | null
}

export interface DrawingOptions {
  color: string
  brushSize: number
  mirrorH: boolean
  mirrorV: boolean
  overwrite: boolean
  spacingMode: boolean
  spacing: { x: number; y: number }
  // Tool-specific
  filled?: boolean
  tolerance?: number
  shadingType?: 'simple' | 'hue_shifting' | 'color_replace'
  shadingMode?: 'lighten' | 'darken'
  shadingAmount?: number
  shadingHueAmount?: number
  shadingSatAmount?: number
  shadingValueAmount?: number
  shadingColorArray?: string[]
  sprayDensity?: number
  sprayRadius?: number
}

// ============================================================================
// ToolManager Class
// ============================================================================

class ToolManagerClass {
  private state: ToolManagerState = {
    activeButton: null,
    isDrawing: false,
    lastPosition: null,
    startPosition: null,
    stabilizerCenter: null,
  }

  private currentTool: BaseTool | null = null
  private drawingCtx: DrawingContext | null = null
  private undoImageData: ImageData | null = null
  private sprayProcessed: Set<string> = new Set()

  // Callbacks for Canvas integration
  private onUpdateDisplay: (() => void) | null = null
  private onSaveLayerData: (() => void) | null = null
  private onAddToHistory: ((name: string, before: ImageData, after: ImageData) => void) | null = null

  // ============================================================================
  // Initialization
  // ============================================================================

  /**
   * Set callbacks for Canvas integration.
   */
  setCallbacks(callbacks: {
    onUpdateDisplay: () => void
    onSaveLayerData: () => void
    onAddToHistory: (name: string, before: ImageData, after: ImageData) => void
  }): void {
    this.onUpdateDisplay = callbacks.onUpdateDisplay
    this.onSaveLayerData = callbacks.onSaveLayerData
    this.onAddToHistory = callbacks.onAddToHistory
  }

  /**
   * Set the drawing context.
   */
  setDrawingContext(ctx: DrawingContext | null): void {
    this.drawingCtx = ctx
  }

  // ============================================================================
  // Event Handling (Main Entry Point)
  // ============================================================================

  /**
   * Handle pointer down event.
   * Routes to the appropriate tool's draw_start method.
   */
  handlePointerDown(
    pos: Point,
    button: 'left' | 'right',
    ctx: DrawingContext
  ): void {
    const toolsStore = useToolsStore.getState()
    const toolName = toolsStore.currentTool

    // Get tool instance
    this.currentTool = ToolRegistry.getInstance(toolName)
    if (!this.currentTool) {
      console.error(`Tool "${toolName}" not found`)
      return
    }

    // Set state
    this.state.activeButton = button
    this.state.isDrawing = true
    this.state.startPosition = pos
    this.state.lastPosition = pos
    this.state.stabilizerCenter = pos  // Initialize stabilizer center
    this.drawingCtx = ctx
    this.sprayProcessed.clear()

    // Save undo data
    this.undoImageData = ctx.ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height)

    // Get drawing options
    const options = this.getDrawingOptions(button)

    // Execute tool-specific drawing
    this.executeDrawStart(toolName, pos, options, ctx)

    // Update display
    this.onUpdateDisplay?.()
  }

  /**
   * Handle pointer move event.
   */
  handlePointerMove(
    pos: Point,
    button: 'left' | 'right',
    ctx: DrawingContext
  ): void {
    if (!this.state.isDrawing || !this.currentTool) return

    const toolsStore = useToolsStore.getState()
    const toolName = toolsStore.currentTool
    const options = this.getDrawingOptions(button)
    const lastPos = this.state.lastPosition

    // Apply stabilizer if enabled
    const stabilizedPos = this.getStabilizedPosition(pos, toolsStore)

    // Execute tool-specific drawing
    this.executeDrawMove(toolName, stabilizedPos, lastPos, options, ctx)

    // Update last position with stabilized position
    this.state.lastPosition = stabilizedPos

    // Update display
    this.onUpdateDisplay?.()
  }

  /**
   * Handle pointer up event.
   */
  handlePointerUp(
    pos: Point,
    button: 'left' | 'right',
    ctx: DrawingContext
  ): void {
    if (!this.state.isDrawing) return

    const toolsStore = useToolsStore.getState()
    const toolName = toolsStore.currentTool
    const options = this.getDrawingOptions(button)

    // Execute tool-specific end
    this.executeDrawEnd(toolName, pos, options, ctx)

    // Commit to history
    if (this.undoImageData && this.shouldSaveHistory(toolName)) {
      const afterData = ctx.ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height)
      const displayName = toolName.charAt(0).toUpperCase() + toolName.slice(1)
      this.onAddToHistory?.(displayName, this.undoImageData, afterData)
    }

    // Save layer data
    this.onSaveLayerData?.()

    // Update display
    this.onUpdateDisplay?.()

    // Reset state
    this.state.isDrawing = false
    this.state.activeButton = null
    this.state.lastPosition = null
    this.state.startPosition = null
    this.state.stabilizerCenter = null
    this.undoImageData = null
  }

  // ============================================================================
  // Tool Execution
  // ============================================================================

  private executeDrawStart(
    toolName: string,
    pos: Point,
    options: DrawingOptions,
    ctx: DrawingContext
  ): void {
    switch (toolName) {
      case 'pencil':
        this.drawPixelWithMirror(ctx, pos, options)
        break
      case 'eraser':
        this.erasePixelWithMirror(ctx, pos, options)
        break
      case 'shading':
        this.shadePixelWithMirror(ctx, pos, options)
        break
      case 'spray':
        this.sprayPixelsWithMirror(ctx, pos, options)
        break
      case 'bucket':
        this.floodFill(ctx, pos, options)
        break
      case 'line':
      case 'curve':
      case 'rectangle':
      case 'ellipse':
        // Shape tools - just record start, draw on end
        break
      case 'colorPicker':
        this.pickColor(ctx, pos, options)
        break
      case 'move':
        // Move tool - record start position, original image is already saved
        break
      case 'pan':
      case 'zoom':
        // Handled by Canvas directly
        break
      default:
        // Delegate to tool instance for tools not handled above
        // (gradient, text, smudge, cloneStamp, dodgeBurn, selection tools, etc.)
        if (this.currentTool) {
          const event = this.createCanvasEvent(pos, options)
          this.currentTool.drawStart(pos, event, ctx)
        }
        break
    }
  }

  private executeDrawMove(
    toolName: string,
    pos: Point,
    lastPos: Point | null,
    options: DrawingOptions,
    ctx: DrawingContext
  ): void {
    if (!lastPos) return

    switch (toolName) {
      case 'pencil':
        this.drawLineWithMirror(ctx, lastPos, pos, options)
        break
      case 'eraser':
        this.eraseLineWithMirror(ctx, lastPos, pos, options)
        break
      case 'shading':
        this.shadeLineWithMirror(ctx, lastPos, pos, options)
        break
      case 'spray':
        this.sprayLineWithMirror(ctx, lastPos, pos, options)
        break
      case 'line':
      case 'curve':
      case 'rectangle':
      case 'ellipse':
        // Shape preview - handled by Canvas
        break
      case 'move':
        // Move preview - redraw canvas content with offset
        this.moveLayerPreview(ctx, pos)
        break
      default:
        // Delegate to tool instance
        if (this.currentTool) {
          const event = this.createCanvasEvent(pos, options)
          this.currentTool.drawMove(pos, event, ctx)
        }
        break
    }
  }

  private executeDrawEnd(
    toolName: string,
    pos: Point,
    options: DrawingOptions,
    ctx: DrawingContext
  ): void {
    // Delegate to tool instance for tools that need end handling
    if (this.currentTool) {
      const event = this.createCanvasEvent(pos, options)
      this.currentTool.drawEnd(pos, event, ctx)
    }
  }

  /**
   * Create a minimal CanvasMouseEvent for tool delegation.
   */
  private createCanvasEvent(pos: Point, _options: DrawingOptions): CanvasMouseEvent {
    return {
      canvasX: pos.x,
      canvasY: pos.y,
      clientX: pos.x,
      clientY: pos.y,
      button: this.state.activeButton === 'left' ? 0 : 2,
      pressure: 1,
      shiftKey: false,
      ctrlKey: false,
      altKey: false,
    }
  }

  // ============================================================================
  // Drawing Operations
  // ============================================================================

  /**
   * Get mirrored positions for a point.
   */
  private getMirrorPositions(pos: Point, options: DrawingOptions, ctx: DrawingContext): Point[] {
    const positions: Point[] = [pos]
    const centerX = ctx.canvas.width / 2
    const centerY = ctx.canvas.height / 2

    if (options.mirrorH) {
      const mirroredX = Math.floor(2 * centerX - pos.x - 1)
      positions.push({ x: mirroredX, y: pos.y })
    }

    if (options.mirrorV) {
      const mirroredY = Math.floor(2 * centerY - pos.y - 1)
      positions.push({ x: pos.x, y: mirroredY })
    }

    if (options.mirrorH && options.mirrorV) {
      const mirroredX = Math.floor(2 * centerX - pos.x - 1)
      const mirroredY = Math.floor(2 * centerY - pos.y - 1)
      positions.push({ x: mirroredX, y: mirroredY })
    }

    return positions
  }

  /**
   * Draw a single pixel with brush size and mirroring.
   */
  private drawPixelWithMirror(
    ctx: DrawingContext,
    pos: Point,
    options: DrawingOptions
  ): void {
    const { ctx: context, canvas } = ctx
    context.fillStyle = options.color

    const halfSize = Math.floor(options.brushSize / 2)

    const drawSingle = (px: number, py: number) => {
      if (px < 0 || px >= canvas.width || py < 0 || py >= canvas.height) return

      if (options.overwrite) {
        context.clearRect(px, py, 1, 1)
      }
      context.fillRect(px, py, 1, 1)
    }

    // For each pixel in brush
    for (let dy = 0; dy < options.brushSize; dy++) {
      for (let dx = 0; dx < options.brushSize; dx++) {
        const px = pos.x - halfSize + dx
        const py = pos.y - halfSize + dy

        // Get mirror positions
        const positions = this.getMirrorPositions({ x: px, y: py }, options, ctx)
        positions.forEach(p => drawSingle(p.x, p.y))
      }
    }
  }

  /**
   * Draw a line with mirroring.
   */
  private drawLineWithMirror(
    ctx: DrawingContext,
    from: Point,
    to: Point,
    options: DrawingOptions
  ): void {
    const points = bresenhamLine(from.x, from.y, to.x, to.y)
    points.forEach(p => this.drawPixelWithMirror(ctx, p, options))
  }

  /**
   * Erase with mirroring.
   */
  private erasePixelWithMirror(
    ctx: DrawingContext,
    pos: Point,
    options: DrawingOptions
  ): void {
    const { ctx: context, canvas } = ctx
    const halfSize = Math.floor(options.brushSize / 2)

    const positions = this.getMirrorPositions(pos, options, ctx)
    positions.forEach(p => {
      context.clearRect(p.x - halfSize, p.y - halfSize, options.brushSize, options.brushSize)
    })
  }

  private eraseLineWithMirror(
    ctx: DrawingContext,
    from: Point,
    to: Point,
    options: DrawingOptions
  ): void {
    const points = bresenhamLine(from.x, from.y, to.x, to.y)
    points.forEach(p => this.erasePixelWithMirror(ctx, p, options))
  }

  /**
   * Shade pixel (lighten/darken) with mirroring.
   */
  private shadePixelWithMirror(
    ctx: DrawingContext,
    pos: Point,
    options: DrawingOptions
  ): void {
    const { ctx: context, canvas } = ctx
    const factor = (options.shadingAmount || 10) / 100
    const halfSize = Math.floor(options.brushSize / 2)

    const shade = (px: number, py: number) => {
      if (px < 0 || px >= canvas.width || py < 0 || py >= canvas.height) return

      const imageData = context.getImageData(px, py, 1, 1)
      const data = imageData.data
      if (data[3] === 0) return

      let r = data[0], g = data[1], b = data[2]

      if (options.shadingMode === 'lighten') {
        r = Math.min(255, r + (255 - r) * factor)
        g = Math.min(255, g + (255 - g) * factor)
        b = Math.min(255, b + (255 - b) * factor)
      } else {
        r = Math.max(0, r * (1 - factor))
        g = Math.max(0, g * (1 - factor))
        b = Math.max(0, b * (1 - factor))
      }

      data[0] = Math.round(r)
      data[1] = Math.round(g)
      data[2] = Math.round(b)
      context.putImageData(imageData, px, py)
    }

    for (let dy = 0; dy < options.brushSize; dy++) {
      for (let dx = 0; dx < options.brushSize; dx++) {
        const px = pos.x - halfSize + dx
        const py = pos.y - halfSize + dy
        const positions = this.getMirrorPositions({ x: px, y: py }, options, ctx)
        positions.forEach(p => shade(p.x, p.y))
      }
    }
  }

  private shadeLineWithMirror(
    ctx: DrawingContext,
    from: Point,
    to: Point,
    options: DrawingOptions
  ): void {
    const points = bresenhamLine(from.x, from.y, to.x, to.y)
    points.forEach(p => this.shadePixelWithMirror(ctx, p, options))
  }

  /**
   * Spray pixels with mirroring.
   */
  private sprayPixelsWithMirror(
    ctx: DrawingContext,
    pos: Point,
    options: DrawingOptions
  ): void {
    const { ctx: context, canvas } = ctx
    context.fillStyle = options.color

    const density = options.sprayDensity || 5
    const radius = options.sprayRadius || 8

    const drawSpray = (px: number, py: number) => {
      if (px < 0 || px >= canvas.width || py < 0 || py >= canvas.height) return
      const key = `${px},${py}`
      if (this.sprayProcessed.has(key)) return
      this.sprayProcessed.add(key)
      context.fillRect(px, py, 1, 1)
    }

    for (let i = 0; i < density; i++) {
      const angle = Math.random() * Math.PI * 2
      const distance = Math.sqrt(Math.random()) * radius
      const px = Math.floor(pos.x + Math.cos(angle) * distance)
      const py = Math.floor(pos.y + Math.sin(angle) * distance)

      const positions = this.getMirrorPositions({ x: px, y: py }, options, ctx)
      positions.forEach(p => drawSpray(p.x, p.y))
    }
  }

  private sprayLineWithMirror(
    ctx: DrawingContext,
    from: Point,
    to: Point,
    options: DrawingOptions
  ): void {
    const points = bresenhamLine(from.x, from.y, to.x, to.y)
    points.forEach(p => this.sprayPixelsWithMirror(ctx, p, options))
  }

  /**
   * Flood fill at position.
   */
  private floodFill(
    ctx: DrawingContext,
    pos: Point,
    options: DrawingOptions
  ): void {
    const { ctx: context, canvas } = ctx
    const tolerance = options.tolerance || 0

    // Get fill color RGB
    const fillColor = this.hexToRgb(options.color)
    if (!fillColor) return

    const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
    const data = imageData.data
    const width = canvas.width
    const height = canvas.height

    // Get target color
    const targetIdx = (pos.y * width + pos.x) * 4
    const targetR = data[targetIdx]
    const targetG = data[targetIdx + 1]
    const targetB = data[targetIdx + 2]
    const targetA = data[targetIdx + 3]

    // Don't fill if clicking on same color
    if (targetR === fillColor.r && targetG === fillColor.g &&
        targetB === fillColor.b && targetA === 255) {
      return
    }

    const colorsMatch = (idx: number): boolean => {
      const dr = Math.abs(data[idx] - targetR)
      const dg = Math.abs(data[idx + 1] - targetG)
      const db = Math.abs(data[idx + 2] - targetB)
      const da = Math.abs(data[idx + 3] - targetA)
      const distance = Math.sqrt(dr * dr + dg * dg + db * db)
      return distance <= tolerance * 1.732 && da <= tolerance
    }

    const stack: Point[] = [pos]
    const visited = new Set<number>()

    while (stack.length > 0) {
      const p = stack.pop()!
      const idx = p.y * width + p.x

      if (visited.has(idx)) continue
      if (p.x < 0 || p.x >= width || p.y < 0 || p.y >= height) continue
      if (!colorsMatch(idx * 4)) continue

      visited.add(idx)

      // Fill pixel
      const pixelIdx = idx * 4
      data[pixelIdx] = fillColor.r
      data[pixelIdx + 1] = fillColor.g
      data[pixelIdx + 2] = fillColor.b
      data[pixelIdx + 3] = 255

      stack.push({ x: p.x + 1, y: p.y })
      stack.push({ x: p.x - 1, y: p.y })
      stack.push({ x: p.x, y: p.y + 1 })
      stack.push({ x: p.x, y: p.y - 1 })
    }

    context.putImageData(imageData, 0, 0)
  }

  /**
   * Pick color from canvas.
   */
  private pickColor(
    ctx: DrawingContext,
    pos: Point,
    options: DrawingOptions
  ): void {
    const { ctx: context, canvas } = ctx

    if (pos.x < 0 || pos.x >= canvas.width || pos.y < 0 || pos.y >= canvas.height) return

    const pixel = context.getImageData(pos.x, pos.y, 1, 1).data
    if (pixel[3] === 0) return

    const hex = `#${pixel[0].toString(16).padStart(2, '0')}${pixel[1].toString(16).padStart(2, '0')}${pixel[2].toString(16).padStart(2, '0')}`

    const store = useEditorStore.getState()
    if (this.state.activeButton === 'left') {
      store.setPrimaryColor(hex)
    } else {
      store.setSecondaryColor(hex)
    }
  }

  // ============================================================================
  // Move Tool
  // ============================================================================

  /**
   * Preview layer content moved by offset from start position.
   */
  private moveLayerPreview(ctx: DrawingContext, pos: Point): void {
    if (!this.undoImageData || !this.state.startPosition) return

    const { ctx: context, canvas } = ctx
    const deltaX = pos.x - this.state.startPosition.x
    const deltaY = pos.y - this.state.startPosition.y

    // Clear canvas
    context.clearRect(0, 0, canvas.width, canvas.height)

    // Create temp canvas with original content
    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = canvas.width
    tempCanvas.height = canvas.height
    const tempCtx = tempCanvas.getContext('2d')!
    tempCtx.putImageData(this.undoImageData, 0, 0)

    // Draw with offset
    context.drawImage(tempCanvas, deltaX, deltaY)
  }

  // ============================================================================
  // Helpers
  // ============================================================================

  private getDrawingOptions(button: 'left' | 'right'): DrawingOptions {
    const editorStore = useEditorStore.getState()
    const toolsStore = useToolsStore.getState()
    return {
      // Colors from editor-store
      color: button === 'left' ? editorStore.primaryColor : editorStore.secondaryColor,
      // Tool settings from tools-store
      brushSize: toolsStore.brushSize,
      mirrorH: toolsStore.mirrorH,
      mirrorV: toolsStore.mirrorV,
      overwrite: toolsStore.overwrite,
      spacingMode: toolsStore.spacingMode,
      spacing: toolsStore.spacing,
      filled: toolsStore.filled,
      tolerance: toolsStore.bucketTolerance,
      shadingType: toolsStore.shadingType,
      shadingMode: toolsStore.shadingMode,
      shadingAmount: toolsStore.shadingAmount,
      shadingHueAmount: toolsStore.shadingHueAmount,
      shadingSatAmount: toolsStore.shadingSatAmount,
      shadingValueAmount: toolsStore.shadingValueAmount,
      shadingColorArray: toolsStore.shadingColorArray,
      sprayDensity: toolsStore.sprayDensity,
      sprayRadius: toolsStore.sprayRadius,
    }
  }

  private shouldSaveHistory(toolName: string): boolean {
    // All tools that modify the canvas should save history
    // Note: gradient is now a dialog-based effect, not a tool
    const historyTools = [
      'pencil', 'eraser', 'bucket', 'line', 'curve', 'rectangle', 'ellipse',
      'shading', 'spray', 'move', 'text', 'smudge', 'cloneStamp',
      'dodgeBurn', 'isometricBox', 'transform', 'crop'
    ]
    return historyTools.includes(toolName)
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16),
    } : null
  }

  /**
   * Apply stabilizer smoothing to position.
   * Based on Pixelorama's _get_stabilized_position in BaseTool.gd
   */
  private getStabilizedPosition(pos: Point, toolsStore: ReturnType<typeof useToolsStore.getState>): Point {
    if (!toolsStore.stabilizerEnabled || !this.state.stabilizerCenter) {
      return pos
    }

    const center = this.state.stabilizerCenter
    const dx = pos.x - center.x
    const dy = pos.y - center.y
    const distance = Math.sqrt(dx * dx + dy * dy)

    if (distance === 0) {
      return pos
    }

    // Move center by a fraction of the distance based on stabilizer value
    // Higher value = more smoothing (slower following)
    const moveDistance = distance / toolsStore.stabilizerValue
    const angle = Math.atan2(dy, dx)

    const newCenter: Point = {
      x: Math.round(center.x + Math.cos(angle) * moveDistance),
      y: Math.round(center.y + Math.sin(angle) * moveDistance),
    }

    // Update stabilizer center
    this.state.stabilizerCenter = newCenter

    return newCenter
  }

  // ============================================================================
  // State Accessors
  // ============================================================================

  isDrawing(): boolean {
    return this.state.isDrawing
  }

  getLastPosition(): Point | null {
    return this.state.lastPosition
  }

  getStartPosition(): Point | null {
    return this.state.startPosition
  }

  getActiveButton(): 'left' | 'right' | null {
    return this.state.activeButton
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const ToolManager = new ToolManagerClass()
