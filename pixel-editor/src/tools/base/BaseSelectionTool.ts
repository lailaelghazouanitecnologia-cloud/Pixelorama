/**
 * BaseSelectionTool - Base class for selection tools.
 * Mirrors Pixelorama's BaseSelectionTool.gd
 */

import { BaseTool } from './BaseTool'
import type { Point, Rect, CanvasMouseEvent, DrawingContext } from '@/core/types'

// ============================================================================
// Selection Mode
// ============================================================================

export enum SelectionMode {
  REPLACE = 'replace',
  ADD = 'add',
  SUBTRACT = 'subtract',
  INTERSECT = 'intersect',
}

// ============================================================================
// Selection State
// ============================================================================

export interface SelectionState {
  bounds: Rect | null
  isSelecting: boolean
  mode: SelectionMode
}

// ============================================================================
// BaseSelectionTool Class
// ============================================================================

export abstract class BaseSelectionTool extends BaseTool {
  protected selectionState: SelectionState = {
    bounds: null,
    isSelecting: false,
    mode: SelectionMode.REPLACE,
  }

  // Preview rectangle during selection
  protected previewRect: Rect | null = null

  // ============================================================================
  // Selection Mode
  // ============================================================================

  /**
   * Get current selection mode.
   */
  getSelectionMode(): SelectionMode {
    return this.selectionState.mode
  }

  /**
   * Set selection mode.
   */
  setSelectionMode(mode: SelectionMode): void {
    this.selectionState.mode = mode
  }

  /**
   * Determine selection mode from event modifiers.
   */
  protected getModeFromEvent(event: CanvasMouseEvent): SelectionMode {
    if (event.shiftKey && event.altKey) {
      return SelectionMode.INTERSECT
    }
    if (event.shiftKey) {
      return SelectionMode.ADD
    }
    if (event.altKey) {
      return SelectionMode.SUBTRACT
    }
    return SelectionMode.REPLACE
  }

  // ============================================================================
  // Drawing Implementation
  // ============================================================================

  protected override onDrawStart(
    pos: Point,
    event: CanvasMouseEvent,
    _ctx: DrawingContext
  ): void {
    this.selectionState.isSelecting = true
    this.selectionState.mode = this.getModeFromEvent(event)

    this.previewRect = {
      x: pos.x,
      y: pos.y,
      width: 0,
      height: 0,
    }
  }

  protected override onDrawMove(
    pos: Point,
    _event: CanvasMouseEvent,
    _ctx: DrawingContext
  ): void {
    const startPoint = this.getStartPoint()
    if (!startPoint || !this.previewRect) {
      return
    }

    // Update preview rectangle
    this.previewRect = this.calculateRect(startPoint, pos)
  }

  protected override onDrawEnd(
    pos: Point,
    _event: CanvasMouseEvent,
    _ctx: DrawingContext
  ): void {
    const startPoint = this.getStartPoint()
    if (!startPoint) {
      return
    }

    // Finalize selection
    const rect = this.calculateRect(startPoint, pos)
    this.applySelection(rect)

    this.selectionState.isSelecting = false
    this.previewRect = null
  }

  protected override onDrawCancel(): void {
    this.selectionState.isSelecting = false
    this.previewRect = null
  }

  // ============================================================================
  // Selection Logic
  // ============================================================================

  /**
   * Calculate rectangle from two points.
   */
  protected calculateRect(start: Point, end: Point): Rect {
    const x = Math.min(start.x, end.x)
    const y = Math.min(start.y, end.y)
    const width = Math.abs(end.x - start.x)
    const height = Math.abs(end.y - start.y)

    return { x, y, width, height }
  }

  /**
   * Apply the selection to the current project.
   * Override in subclasses for different selection shapes.
   */
  protected abstract applySelection(rect: Rect): void

  /**
   * Clear the current selection.
   */
  clearSelection(): void {
    this.selectionState.bounds = null
    // TODO: Emit selection changed event
  }

  /**
   * Select all.
   */
  selectAll(_ctx: DrawingContext): void {
    // TODO: Implement select all
  }

  /**
   * Invert selection.
   */
  invertSelection(): void {
    // TODO: Implement invert selection
  }

  // ============================================================================
  // Indicator
  // ============================================================================

  override drawIndicator(
    ctx: CanvasRenderingContext2D,
    pos: Point,
    color: string
  ): void {
    // Draw crosshair cursor
    const size = 10

    ctx.strokeStyle = color
    ctx.lineWidth = 1

    // Horizontal line
    ctx.beginPath()
    ctx.moveTo(pos.x - size, pos.y + 0.5)
    ctx.lineTo(pos.x + size, pos.y + 0.5)
    ctx.stroke()

    // Vertical line
    ctx.beginPath()
    ctx.moveTo(pos.x + 0.5, pos.y - size)
    ctx.lineTo(pos.x + 0.5, pos.y + size)
    ctx.stroke()
  }

  override drawPreview(ctx: CanvasRenderingContext2D): void {
    if (!this.previewRect || !this.selectionState.isSelecting) {
      return
    }

    const { x, y, width, height } = this.previewRect

    // Draw selection rectangle with marching ants
    ctx.strokeStyle = '#3b82f6'
    ctx.lineWidth = 1
    ctx.setLineDash([4, 4])
    ctx.strokeRect(x + 0.5, y + 0.5, width, height)
    ctx.setLineDash([])

    // Fill with semi-transparent color
    ctx.fillStyle = 'rgba(59, 130, 246, 0.2)'
    ctx.fillRect(x, y, width, height)
  }
}
