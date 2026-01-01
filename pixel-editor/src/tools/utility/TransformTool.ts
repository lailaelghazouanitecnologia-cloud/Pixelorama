/**
 * Transform Tool - Interactive rotation, scale, and skew
 * Based on Pixelorama's transform functionality
 *
 * Allows interactive transformation of selection or layer content
 * with handles for scale, rotation, and skew.
 */

import { BaseTool } from '../base/BaseTool'
import { defineToolWithFactory, ToolRegistry } from '../registry'
import type { Point, CanvasMouseEvent, DrawingContext } from '@/core/types'
import { LayerType } from '@/core/types'

// ============================================================================
// Types
// ============================================================================

export type TransformHandle =
  | 'none'
  | 'move'
  | 'nw' | 'n' | 'ne'
  | 'w' | 'e'
  | 'sw' | 's' | 'se'
  | 'rotate'

export interface TransformState {
  // Original bounds
  originalX: number
  originalY: number
  originalWidth: number
  originalHeight: number

  // Current transform
  x: number
  y: number
  width: number
  height: number
  rotation: number  // In radians
  skewX: number
  skewY: number

  // Transform origin (0-1, relative to bounds)
  originX: number
  originY: number
}

// ============================================================================
// Transform Tool
// ============================================================================

export class TransformTool extends BaseTool {
  private transformState: TransformState | null = null
  private activeHandle: TransformHandle = 'none'
  private dragStart: Point = { x: 0, y: 0 }
  private originalImageData: ImageData | null = null
  private transformedImageData: ImageData | null = null
  private isTransforming: boolean = false
  private handleSize: number = 8

  // ============================================================================
  // Transform State
  // ============================================================================

  getTransformState(): TransformState | null {
    return this.transformState
  }

  isActive(): boolean {
    return this.isTransforming
  }

  /**
   * Initialize transform from selection or layer bounds
   */
  initTransform(
    x: number,
    y: number,
    width: number,
    height: number,
    imageData: ImageData
  ): void {
    this.transformState = {
      originalX: x,
      originalY: y,
      originalWidth: width,
      originalHeight: height,
      x,
      y,
      width,
      height,
      rotation: 0,
      skewX: 0,
      skewY: 0,
      originX: 0.5,
      originY: 0.5,
    }

    this.originalImageData = imageData
    this.transformedImageData = null
    this.isTransforming = true
  }

  /**
   * Apply and commit the transform
   */
  applyTransform(): ImageData | null {
    if (!this.transformState || !this.originalImageData) return null

    const result = this.renderTransform()
    this.clearTransform()
    return result
  }

  /**
   * Cancel the transform
   */
  cancelTransform(): void {
    this.clearTransform()
  }

  private clearTransform(): void {
    this.transformState = null
    this.originalImageData = null
    this.transformedImageData = null
    this.isTransforming = false
    this.activeHandle = 'none'
  }

  // ============================================================================
  // Drawing Implementation
  // ============================================================================

  protected onDrawStart(
    pos: Point,
    event: CanvasMouseEvent,
    ctx: DrawingContext
  ): void {
    if (!this.transformState) {
      // Initialize transform from current layer or selection
      this.initFromContext(ctx)
      return
    }

    // Determine which handle was clicked
    this.activeHandle = this.getHandleAtPosition(pos)
    this.dragStart = { x: pos.x, y: pos.y }
  }

  protected onDrawMove(
    pos: Point,
    event: CanvasMouseEvent,
    ctx: DrawingContext
  ): void {
    if (!this.transformState || this.activeHandle === 'none') return

    const dx = pos.x - this.dragStart.x
    const dy = pos.y - this.dragStart.y

    switch (this.activeHandle) {
      case 'move':
        this.transformState.x += dx
        this.transformState.y += dy
        break

      case 'nw':
        this.transformState.x += dx
        this.transformState.y += dy
        this.transformState.width -= dx
        this.transformState.height -= dy
        break

      case 'n':
        this.transformState.y += dy
        this.transformState.height -= dy
        break

      case 'ne':
        this.transformState.y += dy
        this.transformState.width += dx
        this.transformState.height -= dy
        break

      case 'w':
        this.transformState.x += dx
        this.transformState.width -= dx
        break

      case 'e':
        this.transformState.width += dx
        break

      case 'sw':
        this.transformState.x += dx
        this.transformState.width -= dx
        this.transformState.height += dy
        break

      case 's':
        this.transformState.height += dy
        break

      case 'se':
        this.transformState.width += dx
        this.transformState.height += dy
        break

      case 'rotate':
        // Calculate rotation based on angle from center
        const centerX = this.transformState.x + this.transformState.width / 2
        const centerY = this.transformState.y + this.transformState.height / 2

        const startAngle = Math.atan2(
          this.dragStart.y - centerY,
          this.dragStart.x - centerX
        )
        const currentAngle = Math.atan2(
          pos.y - centerY,
          pos.x - centerX
        )

        this.transformState.rotation += currentAngle - startAngle

        // Snap to 15 degree increments if shift is held
        if (event.shiftKey) {
          const snapAngle = Math.PI / 12 // 15 degrees
          this.transformState.rotation = Math.round(this.transformState.rotation / snapAngle) * snapAngle
        }
        break
    }

    // Update drag start for next frame
    this.dragStart = { x: pos.x, y: pos.y }

    // Invalidate transformed cache
    this.transformedImageData = null
  }

  protected onDrawEnd(
    pos: Point,
    event: CanvasMouseEvent,
    ctx: DrawingContext
  ): void {
    this.activeHandle = 'none'
  }

  protected onDrawCancel(): void {
    this.activeHandle = 'none'
  }

  // ============================================================================
  // Handle Detection
  // ============================================================================

  private getHandleAtPosition(pos: Point): TransformHandle {
    if (!this.transformState) return 'none'

    const { x, y, width, height } = this.transformState
    const hs = this.handleSize / 2

    // Check rotation handle (above top center)
    const rotateX = x + width / 2
    const rotateY = y - 20
    if (this.isNear(pos, rotateX, rotateY, hs + 4)) {
      return 'rotate'
    }

    // Check corner handles
    if (this.isNear(pos, x, y, hs)) return 'nw'
    if (this.isNear(pos, x + width, y, hs)) return 'ne'
    if (this.isNear(pos, x, y + height, hs)) return 'sw'
    if (this.isNear(pos, x + width, y + height, hs)) return 'se'

    // Check edge handles
    if (this.isNear(pos, x + width / 2, y, hs)) return 'n'
    if (this.isNear(pos, x + width / 2, y + height, hs)) return 's'
    if (this.isNear(pos, x, y + height / 2, hs)) return 'w'
    if (this.isNear(pos, x + width, y + height / 2, hs)) return 'e'

    // Check if inside bounds (move)
    if (pos.x >= x && pos.x <= x + width && pos.y >= y && pos.y <= y + height) {
      return 'move'
    }

    return 'none'
  }

  private isNear(pos: Point, x: number, y: number, threshold: number): boolean {
    const dx = pos.x - x
    const dy = pos.y - y
    return dx * dx + dy * dy <= threshold * threshold
  }

  // ============================================================================
  // Rendering
  // ============================================================================

  private initFromContext(ctx: DrawingContext): void {
    const { ctx: context, canvas } = ctx

    // Get current layer/selection data
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height)

    // Find bounds of non-transparent pixels
    const bounds = this.findContentBounds(imageData)

    if (bounds) {
      // Extract content
      const contentData = context.getImageData(
        bounds.x,
        bounds.y,
        bounds.width,
        bounds.height
      )

      this.initTransform(bounds.x, bounds.y, bounds.width, bounds.height, contentData)

      // Clear the original area
      context.clearRect(bounds.x, bounds.y, bounds.width, bounds.height)
    }
  }

  private findContentBounds(imageData: ImageData): { x: number; y: number; width: number; height: number } | null {
    const { width, height, data } = imageData

    let minX = width
    let minY = height
    let maxX = 0
    let maxY = 0
    let hasContent = false

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const alpha = data[(y * width + x) * 4 + 3]
        if (alpha > 0) {
          hasContent = true
          minX = Math.min(minX, x)
          minY = Math.min(minY, y)
          maxX = Math.max(maxX, x)
          maxY = Math.max(maxY, y)
        }
      }
    }

    if (!hasContent) return null

    return {
      x: minX,
      y: minY,
      width: maxX - minX + 1,
      height: maxY - minY + 1,
    }
  }

  /**
   * Render the transformed image
   */
  private renderTransform(): ImageData | null {
    if (!this.transformState || !this.originalImageData) return null

    const { width, height, rotation, skewX, skewY } = this.transformState
    const srcWidth = this.originalImageData.width
    const srcHeight = this.originalImageData.height

    // Create output buffer
    const result = new ImageData(
      Math.abs(Math.round(width)),
      Math.abs(Math.round(height))
    )

    const scaleX = width / srcWidth
    const scaleY = height / srcHeight
    const cos = Math.cos(-rotation)
    const sin = Math.sin(-rotation)
    const centerX = result.width / 2
    const centerY = result.height / 2
    const srcCenterX = srcWidth / 2
    const srcCenterY = srcHeight / 2

    // Sample each destination pixel
    for (let y = 0; y < result.height; y++) {
      for (let x = 0; x < result.width; x++) {
        // Transform to source coordinates
        let srcX = x - centerX
        let srcY = y - centerY

        // Apply inverse rotation
        const rotX = srcX * cos - srcY * sin
        const rotY = srcX * sin + srcY * cos

        // Apply inverse scale
        srcX = rotX / scaleX + srcCenterX
        srcY = rotY / scaleY + srcCenterY

        // Sample source (nearest neighbor for pixel art)
        const sampleX = Math.round(srcX)
        const sampleY = Math.round(srcY)

        if (sampleX >= 0 && sampleX < srcWidth && sampleY >= 0 && sampleY < srcHeight) {
          const srcIdx = (sampleY * srcWidth + sampleX) * 4
          const dstIdx = (y * result.width + x) * 4

          result.data[dstIdx] = this.originalImageData.data[srcIdx]
          result.data[dstIdx + 1] = this.originalImageData.data[srcIdx + 1]
          result.data[dstIdx + 2] = this.originalImageData.data[srcIdx + 2]
          result.data[dstIdx + 3] = this.originalImageData.data[srcIdx + 3]
        }
      }
    }

    return result
  }

  // ============================================================================
  // Indicator / Preview
  // ============================================================================

  drawIndicator(
    ctx: CanvasRenderingContext2D,
    pos: Point,
    color: string
  ): void {
    // Draw crosshair if not transforming
    if (!this.transformState) {
      ctx.strokeStyle = color
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(pos.x - 5, pos.y)
      ctx.lineTo(pos.x + 6, pos.y)
      ctx.moveTo(pos.x, pos.y - 5)
      ctx.lineTo(pos.x, pos.y + 6)
      ctx.stroke()
      return
    }

    const { x, y, width, height, rotation } = this.transformState
    const hs = this.handleSize

    ctx.save()

    // Apply rotation around center
    const centerX = x + width / 2
    const centerY = y + height / 2
    ctx.translate(centerX, centerY)
    ctx.rotate(rotation)
    ctx.translate(-centerX, -centerY)

    // Draw bounding box
    ctx.strokeStyle = '#00aaff'
    ctx.lineWidth = 1
    ctx.setLineDash([4, 4])
    ctx.strokeRect(x, y, width, height)
    ctx.setLineDash([])

    // Draw handles
    ctx.fillStyle = '#ffffff'
    ctx.strokeStyle = '#00aaff'
    ctx.lineWidth = 1

    // Corner handles
    this.drawHandle(ctx, x, y, hs)
    this.drawHandle(ctx, x + width, y, hs)
    this.drawHandle(ctx, x, y + height, hs)
    this.drawHandle(ctx, x + width, y + height, hs)

    // Edge handles
    this.drawHandle(ctx, x + width / 2, y, hs)
    this.drawHandle(ctx, x + width / 2, y + height, hs)
    this.drawHandle(ctx, x, y + height / 2, hs)
    this.drawHandle(ctx, x + width, y + height / 2, hs)

    // Rotation handle
    const rotateY = y - 20
    ctx.beginPath()
    ctx.moveTo(x + width / 2, y)
    ctx.lineTo(x + width / 2, rotateY)
    ctx.stroke()

    ctx.beginPath()
    ctx.arc(x + width / 2, rotateY, 5, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()

    // Draw center point
    ctx.fillStyle = '#ff0000'
    ctx.beginPath()
    ctx.arc(centerX, centerY, 3, 0, Math.PI * 2)
    ctx.fill()

    ctx.restore()
  }

  private drawHandle(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number
  ): void {
    const hs = size / 2
    ctx.fillRect(x - hs, y - hs, size, size)
    ctx.strokeRect(x - hs, y - hs, size, size)
  }

  drawPreview(ctx: CanvasRenderingContext2D): void {
    if (!this.transformState || !this.originalImageData) return

    // Render transformed content
    const transformed = this.renderTransform()
    if (!transformed) return

    ctx.save()

    const { x, y, width, height, rotation } = this.transformState
    const centerX = x + width / 2
    const centerY = y + height / 2

    // Apply rotation
    ctx.translate(centerX, centerY)
    ctx.rotate(rotation)
    ctx.translate(-centerX, -centerY)

    // Draw transformed image
    const tempCanvas = new OffscreenCanvas(transformed.width, transformed.height)
    const tempCtx = tempCanvas.getContext('2d')!
    tempCtx.putImageData(transformed, 0, 0)

    ctx.drawImage(tempCanvas, x, y)

    ctx.restore()
  }
}

// Tool definition and registration
export const TransformToolDefinition = defineToolWithFactory(
  'transform',
  'Transform',
  'move',
  'utility',
  () => new TransformTool(),
  {
    layerTypes: [LayerType.PIXEL],
    hint: 'Drag handles to scale, drag inside to move, drag rotation handle to rotate. Shift+drag for constrained rotation.',
    shortcut: 'T',
  }
)

ToolRegistry.register(TransformToolDefinition)
