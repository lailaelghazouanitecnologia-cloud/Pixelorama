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
   * Expand selection by a given number of pixels
   * Uses morphological dilation
   */
  expand(pixels: number): void {
    if (!this.mask || pixels <= 0) return

    const newMask = new Uint8Array(this.width * this.height)

    // For each pixel in the canvas
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const index = y * this.width + x

        // Check if any pixel within 'pixels' distance is selected
        let isNearSelected = false

        for (let dy = -pixels; dy <= pixels && !isNearSelected; dy++) {
          for (let dx = -pixels; dx <= pixels && !isNearSelected; dx++) {
            // Use circular distance for smooth expansion
            if (dx * dx + dy * dy <= pixels * pixels) {
              const nx = x + dx
              const ny = y + dy

              if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
                if (this.mask[ny * this.width + nx] > 0) {
                  isNearSelected = true
                }
              }
            }
          }
        }

        newMask[index] = isNearSelected ? 255 : 0
      }
    }

    this.mask = newMask
    this.updateBoundingRect()
    this.notifyListeners()
  }

  /**
   * Contract selection by a given number of pixels
   * Uses morphological erosion
   */
  contract(pixels: number): void {
    if (!this.mask || pixels <= 0) return

    const newMask = new Uint8Array(this.width * this.height)

    // For each pixel in the canvas
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const index = y * this.width + x

        // Only consider currently selected pixels
        if (this.mask[index] === 0) {
          newMask[index] = 0
          continue
        }

        // Check if all pixels within 'pixels' distance are selected
        let allSelected = true

        for (let dy = -pixels; dy <= pixels && allSelected; dy++) {
          for (let dx = -pixels; dx <= pixels && allSelected; dx++) {
            // Use circular distance for smooth contraction
            if (dx * dx + dy * dy <= pixels * pixels) {
              const nx = x + dx
              const ny = y + dy

              // Out of bounds counts as unselected
              if (nx < 0 || nx >= this.width || ny < 0 || ny >= this.height) {
                allSelected = false
              } else if (this.mask[ny * this.width + nx] === 0) {
                allSelected = false
              }
            }
          }
        }

        newMask[index] = allSelected ? 255 : 0
      }
    }

    this.mask = newMask
    this.updateBoundingRect()
    this.notifyListeners()
  }

  /**
   * Feather selection edges with a Gaussian blur
   * Creates soft, anti-aliased selection edges
   */
  feather(radius: number): void {
    if (!this.mask || radius <= 0) return

    // Apply Gaussian blur to the mask
    const blurred = this.gaussianBlur(this.mask, radius)

    this.mask = blurred
    this.updateBoundingRect()
    this.notifyListeners()
  }

  /**
   * Apply Gaussian blur to a mask
   */
  private gaussianBlur(mask: Uint8Array, radius: number): Uint8Array {
    const kernel = this.createGaussianKernel(radius)
    const kernelSize = kernel.length
    const halfKernel = Math.floor(kernelSize / 2)

    // Create temporary buffer for horizontal pass
    const temp = new Float32Array(this.width * this.height)
    const result = new Uint8Array(this.width * this.height)

    // Horizontal pass
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        let sum = 0
        let weightSum = 0

        for (let k = 0; k < kernelSize; k++) {
          const kx = x + k - halfKernel

          if (kx >= 0 && kx < this.width) {
            const value = mask[y * this.width + kx]
            sum += value * kernel[k]
            weightSum += kernel[k]
          }
        }

        temp[y * this.width + x] = weightSum > 0 ? sum / weightSum : 0
      }
    }

    // Vertical pass
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        let sum = 0
        let weightSum = 0

        for (let k = 0; k < kernelSize; k++) {
          const ky = y + k - halfKernel

          if (ky >= 0 && ky < this.height) {
            const value = temp[ky * this.width + x]
            sum += value * kernel[k]
            weightSum += kernel[k]
          }
        }

        result[y * this.width + x] = weightSum > 0 ? Math.round(sum / weightSum) : 0
      }
    }

    return result
  }

  /**
   * Create a 1D Gaussian kernel
   */
  private createGaussianKernel(radius: number): Float32Array {
    const sigma = radius / 3
    const size = Math.ceil(radius) * 2 + 1
    const kernel = new Float32Array(size)
    const center = Math.floor(size / 2)

    let sum = 0
    for (let i = 0; i < size; i++) {
      const x = i - center
      const value = Math.exp(-(x * x) / (2 * sigma * sigma))
      kernel[i] = value
      sum += value
    }

    // Normalize
    for (let i = 0; i < size; i++) {
      kernel[i] /= sum
    }

    return kernel
  }

  /**
   * Grow selection to include similar adjacent pixels (color threshold based)
   */
  grow(imageData: ImageData, tolerance: number = 0): void {
    if (!this.mask) return

    const data = imageData.data
    const newMask = new Uint8Array(this.mask)
    let changed = true

    // Keep growing until no more pixels are added
    while (changed) {
      changed = false

      for (let y = 0; y < this.height; y++) {
        for (let x = 0; x < this.width; x++) {
          const index = y * this.width + x
          if (newMask[index] > 0) continue // Already selected

          // Check if any neighbor is selected
          const neighbors = [
            { dx: -1, dy: 0 },
            { dx: 1, dy: 0 },
            { dx: 0, dy: -1 },
            { dx: 0, dy: 1 },
          ]

          for (const { dx, dy } of neighbors) {
            const nx = x + dx
            const ny = y + dy

            if (nx < 0 || nx >= this.width || ny < 0 || ny >= this.height) continue
            if (newMask[ny * this.width + nx] === 0) continue

            // Check color similarity
            const idx1 = (y * this.width + x) * 4
            const idx2 = (ny * this.width + nx) * 4

            const dr = Math.abs(data[idx1] - data[idx2])
            const dg = Math.abs(data[idx1 + 1] - data[idx2 + 1])
            const db = Math.abs(data[idx1 + 2] - data[idx2 + 2])
            const da = Math.abs(data[idx1 + 3] - data[idx2 + 3])

            const distance = Math.sqrt(dr * dr + dg * dg + db * db)

            if (distance <= tolerance && da <= tolerance) {
              newMask[index] = 255
              changed = true
              break
            }
          }
        }
      }

      this.mask = new Uint8Array(newMask)
    }

    this.updateBoundingRect()
    this.notifyListeners()
  }

  /**
   * Border selection - select only the edge pixels
   */
  border(pixels: number): void {
    if (!this.mask || pixels <= 0) return

    // First contract by pixels
    const contracted = new Uint8Array(this.mask.length)

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const index = y * this.width + x

        if (this.mask[index] === 0) {
          contracted[index] = 0
          continue
        }

        let allSelected = true

        for (let dy = -pixels; dy <= pixels && allSelected; dy++) {
          for (let dx = -pixels; dx <= pixels && allSelected; dx++) {
            if (dx * dx + dy * dy <= pixels * pixels) {
              const nx = x + dx
              const ny = y + dy

              if (nx < 0 || nx >= this.width || ny < 0 || ny >= this.height) {
                allSelected = false
              } else if (this.mask[ny * this.width + nx] === 0) {
                allSelected = false
              }
            }
          }
        }

        contracted[index] = allSelected ? 255 : 0
      }
    }

    // Border = original - contracted
    for (let i = 0; i < this.mask.length; i++) {
      this.mask[i] = this.mask[i] > 0 && contracted[i] === 0 ? 255 : 0
    }

    this.updateBoundingRect()
    this.notifyListeners()
  }

  /**
   * Smooth selection edges
   */
  smooth(): void {
    if (!this.mask) return

    const newMask = new Uint8Array(this.mask.length)

    // Apply 3x3 averaging kernel
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        let sum = 0
        let count = 0

        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx
            const ny = y + dy

            if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
              sum += this.mask[ny * this.width + nx]
              count++
            }
          }
        }

        // Threshold at 50% to maintain binary selection
        newMask[y * this.width + x] = (sum / count) >= 128 ? 255 : 0
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
