/**
 * Crop Tool - Resize canvas by selecting a crop region.
 * Based on Pixelorama's CropTool.gd
 *
 * Usage:
 * 1. Click and drag to select crop region
 * 2. Release to preview
 * 3. Double-click or Enter to apply crop
 * 4. Escape to cancel
 */

import { BaseTool } from '../base/BaseTool'
import { defineToolWithFactory, ToolRegistry } from '../registry'
import type { Point, CanvasMouseEvent, DrawingContext, Rect } from '@/core/types'
import { useEditorStore } from '@/store/editor-store'

export type CropMode = 'selection' | 'content' | 'manual'

export interface CropBounds {
  x: number
  y: number
  width: number
  height: number
}

export class CropTool extends BaseTool {
  private cropMode: CropMode = 'selection'
  private cropBounds: CropBounds | null = null
  private isDragging: boolean = false
  private dragHandle: string | null = null
  private lastClickTime: number = 0

  // Manual size input
  private manualWidth: number = 0
  private manualHeight: number = 0

  /**
   * Set crop mode
   */
  setCropMode(mode: CropMode): void {
    this.cropMode = mode
    if (mode === 'content') {
      this.cropToContent()
    }
  }

  getCropMode(): CropMode {
    return this.cropMode
  }

  /**
   * Get current crop bounds
   */
  getCropBounds(): CropBounds | null {
    return this.cropBounds ? { ...this.cropBounds } : null
  }

  /**
   * Set manual crop size
   */
  setManualSize(width: number, height: number): void {
    this.manualWidth = Math.max(1, width)
    this.manualHeight = Math.max(1, height)
  }

  /**
   * Reset crop bounds
   */
  resetCrop(): void {
    this.cropBounds = null
    this.isDragging = false
    this.dragHandle = null
  }

  protected override onActivate(): void {
    window.addEventListener('keydown', this.handleKeyDown)
  }

  protected override onDeactivate(): void {
    window.removeEventListener('keydown', this.handleKeyDown)
    this.resetCrop()
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') {
      e.preventDefault()
      this.resetCrop()
    } else if (e.key === 'Enter' && this.cropBounds) {
      e.preventDefault()
      this.applyCrop()
    }
  }

  protected override onDrawStart(
    pos: Point,
    _event: CanvasMouseEvent,
    ctx: DrawingContext
  ): void {
    const now = Date.now()
    const isDoubleClick = now - this.lastClickTime < 300
    this.lastClickTime = now

    // Double-click applies crop
    if (isDoubleClick && this.cropBounds) {
      this.applyCrop()
      return
    }

    // Check if clicking on a resize handle
    if (this.cropBounds) {
      const handle = this.getHandleAtPosition(pos)
      if (handle) {
        this.dragHandle = handle
        this.isDragging = true
        return
      }
    }

    // Start new crop selection
    this.cropBounds = {
      x: pos.x,
      y: pos.y,
      width: 1,
      height: 1,
    }
    this.isDragging = true
    this.dragHandle = null
  }

  protected override onDrawMove(
    pos: Point,
    _event: CanvasMouseEvent,
    ctx: DrawingContext
  ): void {
    if (!this.isDragging || !this.cropBounds) return

    const startPoint = this.getStartPoint()
    if (!startPoint && !this.dragHandle) return

    if (this.dragHandle) {
      // Resize existing crop bounds
      this.resizeCropBounds(pos)
    } else if (startPoint) {
      // Draw new selection rectangle
      const minX = Math.min(startPoint.x, pos.x)
      const minY = Math.min(startPoint.y, pos.y)
      const maxX = Math.max(startPoint.x, pos.x)
      const maxY = Math.max(startPoint.y, pos.y)

      this.cropBounds = {
        x: minX,
        y: minY,
        width: Math.max(1, maxX - minX),
        height: Math.max(1, maxY - minY),
      }
    }
  }

  protected override onDrawEnd(
    _pos: Point,
    _event: CanvasMouseEvent,
    _ctx: DrawingContext
  ): void {
    this.isDragging = false
    this.dragHandle = null
  }

  /**
   * Get handle at position for resizing
   */
  private getHandleAtPosition(pos: Point): string | null {
    if (!this.cropBounds) return null

    const { x, y, width, height } = this.cropBounds
    const handleSize = 8

    // Corner handles
    if (this.isNearPoint(pos, { x, y }, handleSize)) return 'nw'
    if (this.isNearPoint(pos, { x: x + width, y }, handleSize)) return 'ne'
    if (this.isNearPoint(pos, { x, y: y + height }, handleSize)) return 'sw'
    if (this.isNearPoint(pos, { x: x + width, y: y + height }, handleSize)) return 'se'

    // Edge handles
    if (this.isNearPoint(pos, { x: x + width / 2, y }, handleSize)) return 'n'
    if (this.isNearPoint(pos, { x: x + width / 2, y: y + height }, handleSize)) return 's'
    if (this.isNearPoint(pos, { x, y: y + height / 2 }, handleSize)) return 'w'
    if (this.isNearPoint(pos, { x: x + width, y: y + height / 2 }, handleSize)) return 'e'

    return null
  }

  private isNearPoint(pos: Point, target: Point, tolerance: number): boolean {
    return Math.abs(pos.x - target.x) <= tolerance && Math.abs(pos.y - target.y) <= tolerance
  }

  /**
   * Resize crop bounds based on handle being dragged
   */
  private resizeCropBounds(pos: Point): void {
    if (!this.cropBounds || !this.dragHandle) return

    const { x, y, width, height } = this.cropBounds
    let newX = x, newY = y, newWidth = width, newHeight = height

    switch (this.dragHandle) {
      case 'nw':
        newX = Math.min(pos.x, x + width - 1)
        newY = Math.min(pos.y, y + height - 1)
        newWidth = x + width - newX
        newHeight = y + height - newY
        break
      case 'ne':
        newY = Math.min(pos.y, y + height - 1)
        newWidth = Math.max(1, pos.x - x)
        newHeight = y + height - newY
        break
      case 'sw':
        newX = Math.min(pos.x, x + width - 1)
        newWidth = x + width - newX
        newHeight = Math.max(1, pos.y - y)
        break
      case 'se':
        newWidth = Math.max(1, pos.x - x)
        newHeight = Math.max(1, pos.y - y)
        break
      case 'n':
        newY = Math.min(pos.y, y + height - 1)
        newHeight = y + height - newY
        break
      case 's':
        newHeight = Math.max(1, pos.y - y)
        break
      case 'w':
        newX = Math.min(pos.x, x + width - 1)
        newWidth = x + width - newX
        break
      case 'e':
        newWidth = Math.max(1, pos.x - x)
        break
    }

    this.cropBounds = {
      x: newX,
      y: newY,
      width: newWidth,
      height: newHeight,
    }
  }

  /**
   * Automatically crop to content bounds
   */
  cropToContent(): void {
    const store = useEditorStore.getState()
    const layers = store.layers.filter(l => l.visible && l.type === 'pixel')

    if (layers.length === 0) return

    let minX = Infinity, minY = Infinity
    let maxX = -Infinity, maxY = -Infinity

    for (const layer of layers) {
      if (!layer.data) continue

      const data = layer.data.data
      const width = layer.data.width
      const height = layer.data.height

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4
          if (data[idx + 3] > 0) {
            minX = Math.min(minX, x)
            minY = Math.min(minY, y)
            maxX = Math.max(maxX, x)
            maxY = Math.max(maxY, y)
          }
        }
      }
    }

    if (minX === Infinity) {
      // No content found
      this.cropBounds = null
      return
    }

    this.cropBounds = {
      x: minX,
      y: minY,
      width: maxX - minX + 1,
      height: maxY - minY + 1,
    }
  }

  /**
   * Apply the crop to the canvas
   */
  applyCrop(): void {
    if (!this.cropBounds) return

    const store = useEditorStore.getState()
    const { x, y, width, height } = this.cropBounds

    // Validate bounds
    if (width <= 0 || height <= 0) {
      this.resetCrop()
      return
    }

    // Crop each layer
    const croppedLayers = store.layers.map(layer => {
      if (layer.type !== 'pixel' || !layer.data) return layer

      const oldData = layer.data
      const newData = new ImageData(width, height)

      // Copy pixels from old to new
      for (let ny = 0; ny < height; ny++) {
        for (let nx = 0; nx < width; nx++) {
          const oldX = x + nx
          const oldY = y + ny

          if (oldX >= 0 && oldX < oldData.width && oldY >= 0 && oldY < oldData.height) {
            const oldIdx = (oldY * oldData.width + oldX) * 4
            const newIdx = (ny * width + nx) * 4

            newData.data[newIdx] = oldData.data[oldIdx]
            newData.data[newIdx + 1] = oldData.data[oldIdx + 1]
            newData.data[newIdx + 2] = oldData.data[oldIdx + 2]
            newData.data[newIdx + 3] = oldData.data[oldIdx + 3]
          }
        }
      }

      return { ...layer, data: newData }
    })

    // Update store with new canvas size and layers
    store.setCanvasSize(width, height)
    store.setLayers(croppedLayers)

    this.resetCrop()
  }

  override drawPreview(ctx: CanvasRenderingContext2D): void {
    if (!this.cropBounds) return

    const { x, y, width, height } = this.cropBounds

    // Draw darkened overlay outside crop area
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'

    // Get canvas dimensions from context
    const canvasWidth = ctx.canvas.width
    const canvasHeight = ctx.canvas.height

    // Top
    ctx.fillRect(0, 0, canvasWidth, y)
    // Bottom
    ctx.fillRect(0, y + height, canvasWidth, canvasHeight - y - height)
    // Left
    ctx.fillRect(0, y, x, height)
    // Right
    ctx.fillRect(x + width, y, canvasWidth - x - width, height)

    // Draw crop rectangle border
    ctx.strokeStyle = '#3b82f6'
    ctx.lineWidth = 1
    ctx.setLineDash([4, 4])
    ctx.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1)
    ctx.setLineDash([])

    // Draw resize handles
    this.drawHandles(ctx, x, y, width, height)

    // Draw size info
    ctx.fillStyle = '#3b82f6'
    ctx.font = '10px monospace'
    ctx.fillText(`${width} x ${height}`, x, y - 4)
  }

  /**
   * Draw resize handles
   */
  private drawHandles(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    const handleSize = 6
    const halfHandle = handleSize / 2

    ctx.fillStyle = '#ffffff'
    ctx.strokeStyle = '#3b82f6'
    ctx.lineWidth = 1

    const handles = [
      // Corners
      { x: x, y: y },
      { x: x + width, y: y },
      { x: x, y: y + height },
      { x: x + width, y: y + height },
      // Edges
      { x: x + width / 2, y: y },
      { x: x + width / 2, y: y + height },
      { x: x, y: y + height / 2 },
      { x: x + width, y: y + height / 2 },
    ]

    for (const handle of handles) {
      ctx.fillRect(handle.x - halfHandle, handle.y - halfHandle, handleSize, handleSize)
      ctx.strokeRect(handle.x - halfHandle, handle.y - halfHandle, handleSize, handleSize)
    }
  }

  override drawIndicator(
    ctx: CanvasRenderingContext2D,
    pos: Point,
    color: string
  ): void {
    // Draw crop cursor
    ctx.strokeStyle = color
    ctx.lineWidth = 1

    // Crosshair
    ctx.beginPath()
    ctx.moveTo(pos.x - 8, pos.y)
    ctx.lineTo(pos.x + 8, pos.y)
    ctx.moveTo(pos.x, pos.y - 8)
    ctx.lineTo(pos.x, pos.y + 8)
    ctx.stroke()

    // L corners
    ctx.beginPath()
    ctx.moveTo(pos.x - 8, pos.y - 3)
    ctx.lineTo(pos.x - 8, pos.y - 8)
    ctx.lineTo(pos.x - 3, pos.y - 8)
    ctx.moveTo(pos.x + 8, pos.y - 3)
    ctx.lineTo(pos.x + 8, pos.y - 8)
    ctx.lineTo(pos.x + 3, pos.y - 8)
    ctx.moveTo(pos.x - 8, pos.y + 3)
    ctx.lineTo(pos.x - 8, pos.y + 8)
    ctx.lineTo(pos.x - 3, pos.y + 8)
    ctx.moveTo(pos.x + 8, pos.y + 3)
    ctx.lineTo(pos.x + 8, pos.y + 8)
    ctx.lineTo(pos.x + 3, pos.y + 8)
    ctx.stroke()
  }

  /**
   * Get hint text for UI
   */
  getHintText(): string {
    if (this.cropBounds) {
      return 'Double-click or Enter to apply crop, Escape to cancel'
    }
    return 'Click and drag to select crop region'
  }
}

// Register the tool
export const CropToolDefinition = defineToolWithFactory(
  'crop',
  'Crop',
  'crop',
  'utility',
  () => new CropTool(),
  {
    layerTypes: [],
    hint: 'Click and drag to select crop area, double-click to apply',
    shortcut: 'k',
  }
)

ToolRegistry.register(CropToolDefinition)
