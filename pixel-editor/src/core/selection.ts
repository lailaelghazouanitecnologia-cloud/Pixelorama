/**
 * Selection System - Manages canvas selections
 * Based on Pixelorama's selection handling
 */

export enum SelectionOperation {
  REPLACE = 0,
  ADD = 1,
  SUBTRACT = 2,
  INTERSECT = 3
}

export interface SelectionRect {
  x: number
  y: number
  width: number
  height: number
}

export interface SelectionState {
  active: boolean
  rect: SelectionRect | null
  mask: Uint8Array | null
  width: number
  height: number
}

/**
 * Selection Manager - Handles selection state and operations
 */
export class SelectionManager {
  private mask: Uint8Array | null = null
  private width: number
  private height: number
  private boundingRect: SelectionRect | null = null
  private listeners: Set<(state: SelectionState) => void> = new Set()

  constructor(width: number, height: number) {
    this.width = width
    this.height = height
  }

  /**
   * Check if there's an active selection
   */
  hasSelection(): boolean {
    return this.mask !== null && this.boundingRect !== null
  }

  /**
   * Get current selection state
   */
  getState(): SelectionState {
    return {
      active: this.hasSelection(),
      rect: this.boundingRect,
      mask: this.mask,
      width: this.width,
      height: this.height
    }
  }

  /**
   * Select a rectangle area
   */
  selectRect(rect: SelectionRect, operation: SelectionOperation = SelectionOperation.REPLACE): void {
    // Clamp rect to canvas bounds
    const clampedRect = this.clampRect(rect)

    if (clampedRect.width <= 0 || clampedRect.height <= 0) {
      if (operation === SelectionOperation.REPLACE) {
        this.clear()
      }
      return
    }

    // Create or modify mask
    if (operation === SelectionOperation.REPLACE || !this.mask) {
      this.mask = new Uint8Array(this.width * this.height)
    }

    // Apply selection based on operation
    for (let y = clampedRect.y; y < clampedRect.y + clampedRect.height; y++) {
      for (let x = clampedRect.x; x < clampedRect.x + clampedRect.width; x++) {
        const index = y * this.width + x
        this.applyOperation(index, operation)
      }
    }

    // Update bounding rect
    this.updateBoundingRect()
    this.notifyListeners()
  }

  /**
   * Select using a mask
   */
  selectMask(mask: Uint8Array, operation: SelectionOperation = SelectionOperation.REPLACE): void {
    if (mask.length !== this.width * this.height) {
      console.error('Mask size does not match canvas size')
      return
    }

    if (operation === SelectionOperation.REPLACE || !this.mask) {
      this.mask = new Uint8Array(this.width * this.height)
    }

    for (let i = 0; i < mask.length; i++) {
      if (mask[i] > 0) {
        this.applyOperation(i, operation)
      }
    }

    this.updateBoundingRect()
    this.notifyListeners()
  }

  /**
   * Select all
   */
  selectAll(): void {
    this.mask = new Uint8Array(this.width * this.height)
    this.mask.fill(255)
    this.boundingRect = { x: 0, y: 0, width: this.width, height: this.height }
    this.notifyListeners()
  }

  /**
   * Clear selection
   */
  clear(): void {
    this.mask = null
    this.boundingRect = null
    this.notifyListeners()
  }

  /**
   * Invert selection
   */
  invert(): void {
    if (!this.mask) {
      // If no selection, select all
      this.selectAll()
      return
    }

    for (let i = 0; i < this.mask.length; i++) {
      this.mask[i] = this.mask[i] > 0 ? 0 : 255
    }

    this.updateBoundingRect()
    this.notifyListeners()
  }

  /**
   * Check if a point is within the selection
   */
  isSelected(x: number, y: number): boolean {
    if (!this.mask) return false
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return false
    return this.mask[y * this.width + x] > 0
  }

  /**
   * Get selection mask
   */
  getMask(): Uint8Array | null {
    return this.mask
  }

  /**
   * Get bounding rectangle of selection
   */
  getBoundingRect(): SelectionRect | null {
    return this.boundingRect
  }

  /**
   * Resize selection to match new canvas size
   */
  resize(newWidth: number, newHeight: number): void {
    if (this.mask) {
      const newMask = new Uint8Array(newWidth * newHeight)

      // Copy existing selection
      for (let y = 0; y < Math.min(this.height, newHeight); y++) {
        for (let x = 0; x < Math.min(this.width, newWidth); x++) {
          const oldIndex = y * this.width + x
          const newIndex = y * newWidth + x
          newMask[newIndex] = this.mask[oldIndex]
        }
      }

      this.mask = newMask
    }

    this.width = newWidth
    this.height = newHeight
    this.updateBoundingRect()
    this.notifyListeners()
  }

  /**
   * Move selection by offset
   */
  move(dx: number, dy: number): void {
    if (!this.mask) return

    const newMask = new Uint8Array(this.width * this.height)

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const srcX = x - dx
        const srcY = y - dy

        if (srcX >= 0 && srcX < this.width && srcY >= 0 && srcY < this.height) {
          const srcIndex = srcY * this.width + srcX
          const dstIndex = y * this.width + x
          newMask[dstIndex] = this.mask[srcIndex]
        }
      }
    }

    this.mask = newMask
    this.updateBoundingRect()
    this.notifyListeners()
  }

  /**
   * Subscribe to selection changes
   */
  subscribe(listener: (state: SelectionState) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /**
   * Draw selection outline (marching ants)
   */
  drawOutline(ctx: CanvasRenderingContext2D, offset: number = 0): void {
    if (!this.mask || !this.boundingRect) return

    ctx.save()
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 1

    // Create dashed line pattern (marching ants)
    ctx.setLineDash([4, 4])
    ctx.lineDashOffset = -offset

    // Draw outline by finding edge pixels
    const rect = this.boundingRect
    ctx.beginPath()

    for (let y = rect.y; y < rect.y + rect.height; y++) {
      for (let x = rect.x; x < rect.x + rect.width; x++) {
        if (!this.isSelected(x, y)) continue

        // Check if this is an edge pixel
        const top = !this.isSelected(x, y - 1)
        const bottom = !this.isSelected(x, y + 1)
        const left = !this.isSelected(x - 1, y)
        const right = !this.isSelected(x + 1, y)

        if (top) {
          ctx.moveTo(x, y)
          ctx.lineTo(x + 1, y)
        }
        if (bottom) {
          ctx.moveTo(x, y + 1)
          ctx.lineTo(x + 1, y + 1)
        }
        if (left) {
          ctx.moveTo(x, y)
          ctx.lineTo(x, y + 1)
        }
        if (right) {
          ctx.moveTo(x + 1, y)
          ctx.lineTo(x + 1, y + 1)
        }
      }
    }

    ctx.stroke()

    // Draw white offset version
    ctx.strokeStyle = '#ffffff'
    ctx.lineDashOffset = -offset + 4
    ctx.stroke()

    ctx.restore()
  }

  private applyOperation(index: number, operation: SelectionOperation): void {
    if (!this.mask) return

    switch (operation) {
      case SelectionOperation.REPLACE:
      case SelectionOperation.ADD:
        this.mask[index] = 255
        break
      case SelectionOperation.SUBTRACT:
        this.mask[index] = 0
        break
      case SelectionOperation.INTERSECT:
        // Keep only if already selected
        if (this.mask[index] === 0) {
          this.mask[index] = 0
        }
        break
    }
  }

  private clampRect(rect: SelectionRect): SelectionRect {
    const x = Math.max(0, Math.floor(rect.x))
    const y = Math.max(0, Math.floor(rect.y))
    const right = Math.min(this.width, Math.ceil(rect.x + rect.width))
    const bottom = Math.min(this.height, Math.ceil(rect.y + rect.height))

    return {
      x,
      y,
      width: Math.max(0, right - x),
      height: Math.max(0, bottom - y)
    }
  }

  private updateBoundingRect(): void {
    if (!this.mask) {
      this.boundingRect = null
      return
    }

    let minX = this.width
    let minY = this.height
    let maxX = 0
    let maxY = 0
    let hasSelection = false

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.mask[y * this.width + x] > 0) {
          hasSelection = true
          minX = Math.min(minX, x)
          minY = Math.min(minY, y)
          maxX = Math.max(maxX, x)
          maxY = Math.max(maxY, y)
        }
      }
    }

    if (hasSelection) {
      this.boundingRect = {
        x: minX,
        y: minY,
        width: maxX - minX + 1,
        height: maxY - minY + 1
      }
    } else {
      this.boundingRect = null
      this.mask = null
    }
  }

  private notifyListeners(): void {
    const state = this.getState()
    this.listeners.forEach(listener => listener(state))
  }
}

/**
 * Create a new selection manager
 */
export function createSelectionManager(width: number, height: number): SelectionManager {
  return new SelectionManager(width, height)
}
