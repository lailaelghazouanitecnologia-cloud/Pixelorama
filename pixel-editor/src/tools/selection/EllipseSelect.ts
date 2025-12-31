/**
 * Ellipse Selection Tool
 * Based on Pixelorama's EllipseSelect.gd
 */

import { BaseSelectionTool, SelectionMode } from '../base/BaseSelectionTool'
import { ToolRegistry, defineToolWithFactory } from '../registry'
import type { Point, ToolCategory } from '../../core/types'

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export class EllipseSelectTool extends BaseSelectionTool {
  private startPos: Point | null = null
  private currentRect: Rect = { x: 0, y: 0, width: 0, height: 0 }
  private isCircle = false // Shift key
  private expandFromCenter = false // Ctrl key

  drawStart(pos: Point, event?: PointerEvent): void {
    super.drawStart(pos, event)
    this.startPos = { x: pos.x, y: pos.y }
    this.currentRect = { x: pos.x, y: pos.y, width: 0, height: 0 }

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
  }

  drawMove(pos: Point, event?: PointerEvent): void {
    super.drawMove(pos, event)

    if (!this.startPos) return

    // Update modifier states
    this.isCircle = event?.shiftKey ?? false
    this.expandFromCenter = event?.ctrlKey ?? false

    // Calculate bounding rectangle for ellipse
    this.currentRect = this.calculateRect(this.startPos, pos)

    // Emit preview event
    this.emitSelectionPreview(this.currentRect)
  }

  drawEnd(pos: Point, event?: PointerEvent): void {
    if (!this.startPos) {
      super.drawEnd(pos, event)
      return
    }

    // Final rectangle calculation
    this.currentRect = this.calculateRect(this.startPos, pos)

    // Apply selection if rect has area
    if (this.currentRect.width > 0 && this.currentRect.height > 0) {
      this.applySelection(this.currentRect)
    } else if (this.selectionMode === SelectionMode.REPLACE) {
      // Click without drag clears selection
      this.clearSelection()
    }

    this.resetTool()
    super.drawEnd(pos, event)
  }

  private calculateRect(origin: Point, dest: Point): Rect {
    let rect: Rect

    if (this.expandFromCenter) {
      // Expand from center
      let width = Math.abs(dest.x - origin.x) * 2
      let height = Math.abs(dest.y - origin.y) * 2

      if (this.isCircle) {
        const size = Math.max(width, height)
        width = size
        height = size
      }

      rect = {
        x: origin.x - width / 2,
        y: origin.y - height / 2,
        width,
        height
      }
    } else if (this.isCircle) {
      // Circle mode
      const size = Math.min(Math.abs(dest.x - origin.x), Math.abs(dest.y - origin.y))
      rect = {
        x: origin.x < dest.x ? origin.x : origin.x - size,
        y: origin.y < dest.y ? origin.y : origin.y - size,
        width: size,
        height: size
      }
    } else {
      // Normal ellipse bounding box
      rect = {
        x: Math.min(origin.x, dest.x),
        y: Math.min(origin.y, dest.y),
        width: Math.abs(dest.x - origin.x),
        height: Math.abs(dest.y - origin.y)
      }
    }

    // Ensure at least 1 pixel
    rect.width = Math.max(1, rect.width)
    rect.height = Math.max(1, rect.height)

    return rect
  }

  private applySelection(rect: Rect): void {
    this.emitEvent('selection', {
      type: 'ellipse',
      rect,
      mode: this.selectionMode
    })
  }

  private clearSelection(): void {
    this.emitEvent('selectionClear', {})
  }

  private emitSelectionPreview(rect: Rect): void {
    this.emitEvent('selectionPreview', {
      type: 'ellipse',
      rect,
      mode: this.selectionMode
    })
  }

  private emitEvent(type: string, detail: unknown): void {
    if (this.canvas) {
      this.canvas.dispatchEvent(new CustomEvent(`tool:${type}`, { detail, bubbles: true }))
    }
  }

  private resetTool(): void {
    this.startPos = null
    this.currentRect = { x: 0, y: 0, width: 0, height: 0 }
    this.isCircle = false
    this.expandFromCenter = false
  }

  getCurrentRect(): Rect {
    return this.currentRect
  }

  activate(): void {
    super.activate()
    if (this.canvas) {
      this.canvas.style.cursor = 'crosshair'
    }
  }

  deactivate(): void {
    super.deactivate()
    this.resetTool()
    if (this.canvas) {
      this.canvas.style.cursor = 'default'
    }
  }
}

// Tool definition
export const EllipseSelectDefinition = defineToolWithFactory(
  'ellipseSelect',
  'Ellipse Select',
  'circle-dashed', // Icon name
  'selection' as ToolCategory,
  () => new EllipseSelectTool(),
  {
    shortcut: 'J',
    hint: 'Ellipse Select (J). Shift: circle, Alt: subtract, Ctrl+Shift: intersect'
  }
)

// Register the tool
ToolRegistry.register(EllipseSelectDefinition)
