/**
 * Pan Tool - Navigate the canvas by dragging
 * Based on Pixelorama's Pan.gd
 */

import { BaseTool } from '../base/BaseTool'
import { ToolRegistry, defineToolWithFactory } from '../registry'
import type { Point, ToolCategory } from '../../core/types'

export class PanTool extends BaseTool {
  private isDragging = false
  private lastPosition: Point = { x: 0, y: 0 }

  drawStart(pos: Point, event?: PointerEvent): void {
    super.drawStart(pos, event)
    this.isDragging = true
    this.lastPosition = { x: event?.clientX ?? pos.x, y: event?.clientY ?? pos.y }

    // Change cursor to grabbing
    if (this.canvas) {
      this.canvas.style.cursor = 'grabbing'
    }
  }

  drawMove(pos: Point, event?: PointerEvent): void {
    super.drawMove(pos, event)

    if (!this.isDragging || !event) return

    const currentPos = { x: event.clientX, y: event.clientY }
    const delta = {
      x: currentPos.x - this.lastPosition.x,
      y: currentPos.y - this.lastPosition.y
    }

    // Emit pan event - the canvas component should handle the actual panning
    this.emitEvent('pan', { delta })

    this.lastPosition = currentPos
  }

  drawEnd(pos: Point, event?: PointerEvent): void {
    super.drawEnd(pos, event)
    this.isDragging = false

    // Reset cursor
    if (this.canvas) {
      this.canvas.style.cursor = 'grab'
    }
  }

  activate(): void {
    super.activate()
    if (this.canvas) {
      this.canvas.style.cursor = 'grab'
    }
  }

  deactivate(): void {
    super.deactivate()
    if (this.canvas) {
      this.canvas.style.cursor = 'default'
    }
  }

  private emitEvent(type: string, detail: unknown): void {
    if (this.canvas) {
      this.canvas.dispatchEvent(new CustomEvent(`tool:${type}`, { detail, bubbles: true }))
    }
  }
}

// Tool definition
export const PanDefinition = defineToolWithFactory(
  'pan',
  'Pan',
  'hand', // Icon name
  'utility' as ToolCategory,
  () => new PanTool(),
  {
    shortcut: 'H',
    hint: 'Pan the canvas view (H)'
  }
)

// Register the tool
ToolRegistry.register(PanDefinition)
