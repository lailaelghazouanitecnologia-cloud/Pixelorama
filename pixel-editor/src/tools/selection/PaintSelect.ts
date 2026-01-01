/**
 * PaintSelect Tool - Brush-based selection tool.
 * Based on Pixelorama's PaintSelect.gd
 *
 * Allows users to "paint" selections using brush strokes,
 * similar to quick selection in Photoshop but with pixel precision.
 */

import { BaseSelectionTool, SelectionMode } from '../base/BaseSelectionTool'
import { defineToolWithFactory, ToolRegistry } from '../registry'
import type { Point, Rect, CanvasMouseEvent, DrawingContext } from '@/core/types'
import { LayerType } from '@/core/types'
import { useToolsStore } from '@/store/tools-store'
import { useEditorStore } from '@/store/editor-store'
import { bresenhamLine } from '@/lib/drawing'

export class PaintSelectTool extends BaseSelectionTool {
  // Selection mask being painted
  private paintMask: Uint8Array | null = null
  private maskWidth: number = 0
  private maskHeight: number = 0

  // Brush settings
  private brushSize: number = 1

  // Points painted in current stroke
  private paintedPoints: Set<string> = new Set()

  /**
   * Get brush size
   */
  getBrushSize(): number {
    return this.brushSize
  }

  /**
   * Set brush size
   */
  setBrushSize(size: number): void {
    this.brushSize = Math.max(1, Math.min(64, size))
  }

  protected override onDrawStart(
    pos: Point,
    event: CanvasMouseEvent,
    ctx: DrawingContext
  ): void {
    const { canvas } = ctx

    // Initialize mask if needed
    if (!this.paintMask || this.maskWidth !== canvas.width || this.maskHeight !== canvas.height) {
      this.maskWidth = canvas.width
      this.maskHeight = canvas.height
      this.paintMask = new Uint8Array(this.maskWidth * this.maskHeight)
    }

    // Get mode from modifiers
    this.selectionState.mode = this.getModeFromEvent(event)
    this.selectionState.isSelecting = true

    // Clear mask for replace mode
    if (this.selectionState.mode === SelectionMode.REPLACE) {
      this.paintMask.fill(0)
    }

    // Get brush size from tools store
    this.brushSize = useToolsStore.getState().brushSize

    // Clear painted points for this stroke
    this.paintedPoints.clear()

    // Paint initial point
    this.paintAt(pos)
  }

  protected override onDrawMove(
    pos: Point,
    _event: CanvasMouseEvent,
    _ctx: DrawingContext
  ): void {
    if (!this.selectionState.isSelecting) return

    const lastPoint = this.getLastPoint()

    if (lastPoint) {
      // Draw line between points for smooth selection
      const points = bresenhamLine(lastPoint.x, lastPoint.y, pos.x, pos.y)
      for (const point of points) {
        this.paintAt(point)
      }
    } else {
      this.paintAt(pos)
    }
  }

  protected override onDrawEnd(
    _pos: Point,
    _event: CanvasMouseEvent,
    _ctx: DrawingContext
  ): void {
    if (!this.paintMask) return

    // Apply the painted mask as selection
    this.applyPaintedSelection()

    this.selectionState.isSelecting = false
    this.paintedPoints.clear()
  }

  protected override onDrawCancel(): void {
    this.selectionState.isSelecting = false
    this.paintedPoints.clear()
  }

  /**
   * Paint selection at a point with current brush size
   */
  private paintAt(pos: Point): void {
    if (!this.paintMask) return

    const halfSize = Math.floor(this.brushSize / 2)
    const isSubtract = this.selectionState.mode === SelectionMode.SUBTRACT

    for (let dy = -halfSize; dy < this.brushSize - halfSize; dy++) {
      for (let dx = -halfSize; dx < this.brushSize - halfSize; dx++) {
        const x = pos.x + dx
        const y = pos.y + dy

        // Check bounds
        if (x < 0 || x >= this.maskWidth || y < 0 || y >= this.maskHeight) {
          continue
        }

        // Check if within circular brush
        if (dx * dx + dy * dy > halfSize * halfSize && this.brushSize > 2) {
          continue
        }

        const index = y * this.maskWidth + x
        const key = `${x},${y}`

        // Track painted points for this stroke
        if (!this.paintedPoints.has(key)) {
          this.paintedPoints.add(key)

          if (isSubtract) {
            this.paintMask[index] = 0
          } else {
            this.paintMask[index] = 255
          }
        }
      }
    }
  }

  /**
   * Apply the painted mask as a selection
   */
  private applyPaintedSelection(): void {
    if (!this.paintMask) return

    const store = useEditorStore.getState()
    const mode = this.selectionState.mode

    // Calculate bounding rect
    let minX = this.maskWidth
    let minY = this.maskHeight
    let maxX = 0
    let maxY = 0
    let hasSelection = false

    for (let y = 0; y < this.maskHeight; y++) {
      for (let x = 0; x < this.maskWidth; x++) {
        if (this.paintMask[y * this.maskWidth + x] > 0) {
          hasSelection = true
          minX = Math.min(minX, x)
          minY = Math.min(minY, y)
          maxX = Math.max(maxX, x)
          maxY = Math.max(maxY, y)
        }
      }
    }

    if (!hasSelection) {
      if (mode === SelectionMode.REPLACE) {
        store.clearSelection()
      }
      return
    }

    // Create ImageData mask for the selection
    const maskImageData = new ImageData(this.maskWidth, this.maskHeight)
    for (let i = 0; i < this.paintMask.length; i++) {
      maskImageData.data[i * 4] = this.paintMask[i]
      maskImageData.data[i * 4 + 1] = this.paintMask[i]
      maskImageData.data[i * 4 + 2] = this.paintMask[i]
      maskImageData.data[i * 4 + 3] = this.paintMask[i]
    }

    // Apply selection based on mode
    if (mode === SelectionMode.REPLACE) {
      store.setSelection({
        active: true,
        x: minX,
        y: minY,
        width: maxX - minX + 1,
        height: maxY - minY + 1,
        mask: maskImageData,
      })
    } else if (mode === SelectionMode.ADD) {
      // Merge with existing selection
      const current = store.selection
      if (current.active && current.mask) {
        const merged = this.mergeMasks(current.mask, maskImageData, 'add')
        store.setSelection({
          active: true,
          x: Math.min(current.x, minX),
          y: Math.min(current.y, minY),
          width: Math.max(current.x + current.width, maxX + 1) - Math.min(current.x, minX),
          height: Math.max(current.y + current.height, maxY + 1) - Math.min(current.y, minY),
          mask: merged,
        })
      } else {
        store.setSelection({
          active: true,
          x: minX,
          y: minY,
          width: maxX - minX + 1,
          height: maxY - minY + 1,
          mask: maskImageData,
        })
      }
    } else if (mode === SelectionMode.SUBTRACT) {
      const current = store.selection
      if (current.active && current.mask) {
        const merged = this.mergeMasks(current.mask, maskImageData, 'subtract')
        // Recalculate bounds after subtraction
        store.setSelection({
          ...current,
          mask: merged,
        })
      }
    } else if (mode === SelectionMode.INTERSECT) {
      const current = store.selection
      if (current.active && current.mask) {
        const merged = this.mergeMasks(current.mask, maskImageData, 'intersect')
        store.setSelection({
          ...current,
          mask: merged,
        })
      }
    }
  }

  /**
   * Merge two selection masks
   */
  private mergeMasks(
    existing: ImageData,
    painted: ImageData,
    operation: 'add' | 'subtract' | 'intersect'
  ): ImageData {
    const result = new ImageData(
      new Uint8ClampedArray(existing.data),
      existing.width,
      existing.height
    )

    for (let i = 0; i < result.data.length; i += 4) {
      const existingValue = existing.data[i + 3]
      const paintedValue = painted.data[i + 3]

      let newValue: number
      switch (operation) {
        case 'add':
          newValue = Math.max(existingValue, paintedValue)
          break
        case 'subtract':
          newValue = paintedValue > 0 ? 0 : existingValue
          break
        case 'intersect':
          newValue = Math.min(existingValue, paintedValue)
          break
        default:
          newValue = paintedValue
      }

      result.data[i] = newValue
      result.data[i + 1] = newValue
      result.data[i + 2] = newValue
      result.data[i + 3] = newValue
    }

    return result
  }

  // Not used for paint select - we paint directly
  protected applySelection(_rect: Rect): void {
    // No-op - paint select uses mask-based selection
  }

  override drawIndicator(
    ctx: CanvasRenderingContext2D,
    pos: Point,
    color: string
  ): void {
    const halfSize = Math.floor(this.brushSize / 2)

    // Draw brush preview circle
    ctx.strokeStyle = color
    ctx.lineWidth = 1

    if (this.brushSize <= 2) {
      // Small brush - draw crosshair
      ctx.beginPath()
      ctx.moveTo(pos.x - 4, pos.y + 0.5)
      ctx.lineTo(pos.x + 4, pos.y + 0.5)
      ctx.moveTo(pos.x + 0.5, pos.y - 4)
      ctx.lineTo(pos.x + 0.5, pos.y + 4)
      ctx.stroke()
    } else {
      // Larger brush - draw circle
      ctx.beginPath()
      ctx.arc(pos.x + 0.5, pos.y + 0.5, halfSize, 0, Math.PI * 2)
      ctx.stroke()
    }

    // Show mode indicator
    const modeColor = this.getModeIndicatorColor()
    if (modeColor) {
      ctx.fillStyle = modeColor
      ctx.beginPath()
      ctx.arc(pos.x + halfSize + 4, pos.y - halfSize - 4, 3, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  private getModeIndicatorColor(): string | null {
    switch (this.selectionState.mode) {
      case SelectionMode.ADD:
        return '#22c55e' // green
      case SelectionMode.SUBTRACT:
        return '#ef4444' // red
      case SelectionMode.INTERSECT:
        return '#f59e0b' // amber
      default:
        return null
    }
  }

  override drawPreview(ctx: CanvasRenderingContext2D): void {
    if (!this.paintMask || !this.selectionState.isSelecting) return

    // Draw the current paint mask as overlay
    ctx.fillStyle = 'rgba(59, 130, 246, 0.3)'

    for (let y = 0; y < this.maskHeight; y++) {
      for (let x = 0; x < this.maskWidth; x++) {
        if (this.paintMask[y * this.maskWidth + x] > 0) {
          ctx.fillRect(x, y, 1, 1)
        }
      }
    }
  }
}

// Register the tool
export const PaintSelectToolDefinition = defineToolWithFactory(
  'paintSelect',
  'Paint Select',
  'paintbrush',
  'selection',
  () => new PaintSelectTool(),
  {
    layerTypes: [LayerType.PIXEL],
    hint: 'Paint to select pixels. Shift=Add, Alt=Subtract, Shift+Alt=Intersect',
    shortcut: 'a',
  }
)

ToolRegistry.register(PaintSelectToolDefinition)
