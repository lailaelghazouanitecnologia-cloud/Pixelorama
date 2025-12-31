/**
 * Move Tool - Move layers or selections
 * Based on Pixelorama's Move.gd
 */

import { BaseTool } from '../base/BaseTool'
import { ToolRegistry, defineToolWithFactory } from '../registry'
import type { Point, ToolCategory } from '../../core/types'

export interface MoveToolConfig {
  snapToGrid: boolean
  gridSize: number
}

export class MoveTool extends BaseTool {
  private startPos: Point | null = null
  private offset: Point = { x: 0, y: 0 }
  private snapToGrid = false
  private gridSize = 8
  private isDragging = false
  private originalImageData: ImageData | null = null

  getConfig(): MoveToolConfig {
    return {
      snapToGrid: this.snapToGrid,
      gridSize: this.gridSize
    }
  }

  setConfig(config: Partial<MoveToolConfig>): void {
    if (config.snapToGrid !== undefined) {
      this.snapToGrid = config.snapToGrid
    }
    if (config.gridSize !== undefined) {
      this.gridSize = config.gridSize
    }
  }

  drawStart(pos: Point, event?: PointerEvent): void {
    super.drawStart(pos, event)

    if (!this.ctx || !this.canvas) return

    this.startPos = { x: pos.x, y: pos.y }
    this.offset = { x: 0, y: 0 }
    this.isDragging = true

    // Store original image data for undo
    this.originalImageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height)

    // Change cursor
    this.canvas.style.cursor = 'move'

    // Emit move start event
    this.emitEvent('moveStart', { position: pos })
  }

  drawMove(pos: Point, event?: PointerEvent): void {
    super.drawMove(pos, event)

    if (!this.isDragging || !this.startPos || !this.ctx || !this.canvas || !this.originalImageData) {
      return
    }

    // Calculate movement delta
    let deltaX = pos.x - this.startPos.x
    let deltaY = pos.y - this.startPos.y

    // Snap to grid if enabled (Ctrl held)
    if (this.snapToGrid || event?.ctrlKey) {
      deltaX = Math.round(deltaX / this.gridSize) * this.gridSize
      deltaY = Math.round(deltaY / this.gridSize) * this.gridSize
    }

    // Snap to axis if Shift is held
    if (event?.shiftKey) {
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        deltaY = 0
      } else {
        deltaX = 0
      }
    }

    this.offset = { x: deltaX, y: deltaY }

    // Clear and redraw with offset (preview)
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

    // Create temp canvas to handle the offset
    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = this.canvas.width
    tempCanvas.height = this.canvas.height
    const tempCtx = tempCanvas.getContext('2d')!
    tempCtx.putImageData(this.originalImageData, 0, 0)

    // Draw with offset
    this.ctx.drawImage(tempCanvas, deltaX, deltaY)

    // Emit move event
    this.emitEvent('moving', { delta: this.offset, position: pos })
  }

  drawEnd(pos: Point, event?: PointerEvent): void {
    if (!this.isDragging || !this.startPos || !this.ctx || !this.canvas) {
      super.drawEnd(pos, event)
      return
    }

    // Calculate final offset
    let deltaX = pos.x - this.startPos.x
    let deltaY = pos.y - this.startPos.y

    if (this.snapToGrid || event?.ctrlKey) {
      deltaX = Math.round(deltaX / this.gridSize) * this.gridSize
      deltaY = Math.round(deltaY / this.gridSize) * this.gridSize
    }

    if (event?.shiftKey) {
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        deltaY = 0
      } else {
        deltaX = 0
      }
    }

    // Emit move end event with undo data
    this.emitEvent('moveEnd', {
      delta: { x: deltaX, y: deltaY },
      originalImageData: this.originalImageData
    })

    this.resetTool()
    super.drawEnd(pos, event)
  }

  cancel(): void {
    // Restore original image
    if (this.originalImageData && this.ctx && this.canvas) {
      this.ctx.putImageData(this.originalImageData, 0, 0)
    }
    this.resetTool()
  }

  private resetTool(): void {
    this.startPos = null
    this.offset = { x: 0, y: 0 }
    this.isDragging = false
    this.originalImageData = null

    if (this.canvas) {
      this.canvas.style.cursor = 'move'
    }
  }

  private emitEvent(type: string, detail: unknown): void {
    if (this.canvas) {
      this.canvas.dispatchEvent(new CustomEvent(`tool:${type}`, { detail, bubbles: true }))
    }
  }

  activate(): void {
    super.activate()
    if (this.canvas) {
      this.canvas.style.cursor = 'move'
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
export const MoveDefinition = defineToolWithFactory(
  'move',
  'Move',
  'move', // Icon name
  'utility' as ToolCategory,
  () => new MoveTool(),
  {
    shortcut: 'V',
    hint: 'Move layer content (V). Hold Ctrl to snap to grid, Shift to constrain to axis.'
  }
)

// Register the tool
ToolRegistry.register(MoveDefinition)
