/**
 * BaseTool - Abstract base class for all tools.
 * Mirrors Pixelorama's BaseTool.gd architecture.
 *
 * Lifecycle:
 *   1. initialize() - Called once when tool is first instantiated
 *   2. activate()   - Called when tool becomes active
 *   3. drawStart()  - Mouse down
 *   4. drawMove()   - Mouse move while drawing
 *   5. drawEnd()    - Mouse up
 *   6. deactivate() - Called when switching to another tool
 *   7. cleanup()    - Called when tool is destroyed
 */

import type { Point, ToolConfig, CanvasMouseEvent, DrawingContext } from '@/core/types'
import type { ToolDefinition } from '../registry'

// ============================================================================
// Tool State
// ============================================================================

export interface ToolState {
  isActive: boolean
  isDrawing: boolean
  cursor: Point
  lastPoint: Point | null
  startPoint: Point | null
}

// ============================================================================
// BaseTool Class
// ============================================================================

export abstract class BaseTool {
  // Tool identity
  protected name: string = ''
  protected displayName: string = ''
  protected definition: ToolDefinition | null = null

  // Tool state
  protected state: ToolState = {
    isActive: false,
    isDrawing: false,
    cursor: { x: 0, y: 0 },
    lastPoint: null,
    startPoint: null,
  }

  // Configuration
  protected config: ToolConfig = {}

  // Drawing cache - stores already drawn pixels to avoid overdraw
  protected drawCache: Set<string> = new Set()

  // ============================================================================
  // Initialization
  // ============================================================================

  /**
   * Initialize the tool with its definition.
   * Called once when tool is first instantiated.
   */
  initialize(definition: ToolDefinition): void {
    this.definition = definition
    this.name = definition.name
    this.displayName = definition.displayName
    this.loadConfig()
  }

  /**
   * Get the tool name.
   */
  getName(): string {
    return this.name
  }

  /**
   * Get the display name.
   */
  getDisplayName(): string {
    return this.displayName
  }

  // ============================================================================
  // Configuration
  // ============================================================================

  /**
   * Get the current tool configuration.
   * Override in subclasses to add tool-specific config.
   */
  getConfig(): ToolConfig {
    return { ...this.config }
  }

  /**
   * Set the tool configuration.
   * Override in subclasses to handle tool-specific config.
   */
  setConfig(config: ToolConfig): void {
    this.config = { ...this.config, ...config }
    this.updateConfig()
  }

  /**
   * Save configuration to storage.
   */
  saveConfig(): void {
    const configKey = `tool_config_${this.name}`
    try {
      localStorage.setItem(configKey, JSON.stringify(this.getConfig()))
    } catch {
      // Storage may not be available
    }
  }

  /**
   * Load configuration from storage.
   */
  loadConfig(): void {
    const configKey = `tool_config_${this.name}`
    try {
      const stored = localStorage.getItem(configKey)
      if (stored) {
        this.setConfig(JSON.parse(stored))
      }
    } catch {
      // Storage may not be available or data corrupt
    }
  }

  /**
   * Called after config changes to update internal state.
   * Override in subclasses.
   */
  protected updateConfig(): void {
    // Override in subclasses
  }

  // ============================================================================
  // Lifecycle Methods
  // ============================================================================

  /**
   * Called when the tool becomes active.
   */
  activate(): void {
    this.state.isActive = true
    this.onActivate()
  }

  /**
   * Called when switching away from this tool.
   */
  deactivate(): void {
    if (this.state.isDrawing) {
      this.cancelDrawing()
    }
    this.state.isActive = false
    this.onDeactivate()
  }

  /**
   * Cleanup when tool is destroyed.
   */
  cleanup(): void {
    this.deactivate()
    this.drawCache.clear()
  }

  /**
   * Override to handle activation.
   */
  protected onActivate(): void {
    // Override in subclasses
  }

  /**
   * Override to handle deactivation.
   */
  protected onDeactivate(): void {
    // Override in subclasses
  }

  // ============================================================================
  // Drawing Lifecycle
  // ============================================================================

  /**
   * Start drawing operation.
   */
  drawStart(pos: Point, event: CanvasMouseEvent, ctx: DrawingContext): void {
    this.state.isDrawing = true
    this.state.startPoint = pos
    this.state.lastPoint = pos
    this.drawCache.clear()

    this.onDrawStart(pos, event, ctx)
  }

  /**
   * Continue drawing operation.
   */
  drawMove(pos: Point, event: CanvasMouseEvent, ctx: DrawingContext): void {
    // Handle case where user switches tools while drawing
    if (!this.state.isDrawing) {
      this.drawStart(pos, event, ctx)
      return
    }

    this.state.cursor = pos
    this.onDrawMove(pos, event, ctx)
    this.state.lastPoint = pos
  }

  /**
   * End drawing operation.
   */
  drawEnd(pos: Point, event: CanvasMouseEvent, ctx: DrawingContext): void {
    if (!this.state.isDrawing) {
      return
    }

    this.onDrawEnd(pos, event, ctx)

    this.state.isDrawing = false
    this.state.startPoint = null
    this.state.lastPoint = null
    this.drawCache.clear()
  }

  /**
   * Cancel current drawing operation.
   */
  cancelDrawing(): void {
    if (this.state.isDrawing) {
      this.onDrawCancel()
      this.state.isDrawing = false
      this.state.startPoint = null
      this.state.lastPoint = null
      this.drawCache.clear()
    }
  }

  /**
   * Override to handle draw start.
   */
  protected abstract onDrawStart(
    pos: Point,
    event: CanvasMouseEvent,
    ctx: DrawingContext
  ): void

  /**
   * Override to handle draw move.
   */
  protected abstract onDrawMove(
    pos: Point,
    event: CanvasMouseEvent,
    ctx: DrawingContext
  ): void

  /**
   * Override to handle draw end.
   */
  protected abstract onDrawEnd(
    pos: Point,
    event: CanvasMouseEvent,
    ctx: DrawingContext
  ): void

  /**
   * Override to handle draw cancel.
   */
  protected onDrawCancel(): void {
    // Override in subclasses for undo logic
  }

  // ============================================================================
  // Cursor and Preview
  // ============================================================================

  /**
   * Update cursor position (for preview).
   */
  cursorMove(pos: Point): void {
    this.state.cursor = pos
    this.onCursorMove(pos)
  }

  /**
   * Override for custom cursor movement handling.
   */
  protected onCursorMove(_pos: Point): void {
    // Override in subclasses
  }

  /**
   * Draw the tool indicator (cursor preview).
   * Called by canvas to render tool cursor.
   */
  abstract drawIndicator(
    ctx: CanvasRenderingContext2D,
    pos: Point,
    color: string
  ): void

  /**
   * Draw tool preview overlay.
   * Called for tools that show preview before committing.
   */
  drawPreview(_ctx: CanvasRenderingContext2D): void {
    // Override in subclasses for preview rendering
  }

  // ============================================================================
  // Helpers
  // ============================================================================

  /**
   * Check if a point has already been drawn in this stroke.
   */
  protected isInCache(pos: Point): boolean {
    return this.drawCache.has(`${pos.x},${pos.y}`)
  }

  /**
   * Add a point to the draw cache.
   */
  protected addToCache(pos: Point): void {
    this.drawCache.add(`${pos.x},${pos.y}`)
  }

  /**
   * Get the current drawing state.
   */
  isDrawing(): boolean {
    return this.state.isDrawing
  }

  /**
   * Get whether tool is active.
   */
  isActive(): boolean {
    return this.state.isActive
  }

  /**
   * Get current cursor position.
   */
  getCursor(): Point {
    return this.state.cursor
  }

  /**
   * Get start point of current stroke.
   */
  getStartPoint(): Point | null {
    return this.state.startPoint
  }

  /**
   * Get last drawn point.
   */
  getLastPoint(): Point | null {
    return this.state.lastPoint
  }
}
