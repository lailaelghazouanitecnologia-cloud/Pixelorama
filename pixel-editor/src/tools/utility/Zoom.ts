/**
 * Zoom Tool - Zoom in/out of the canvas
 * Based on Pixelorama's Zoom.gd
 */

import { BaseTool } from '../base/BaseTool'
import { ToolRegistry, defineToolWithFactory } from '../registry'
import type { Point, ToolCategory } from '../../core/types'

export enum ZoomMode {
  ZOOM_OUT = 0,
  ZOOM_IN = 1
}

export interface ZoomToolConfig {
  zoomMode: ZoomMode
}

export class ZoomTool extends BaseTool {
  private zoomMode: ZoomMode = ZoomMode.ZOOM_IN
  private lastMousePos: Point = { x: 0, y: 0 }
  private isDragging = false

  // Zoom levels commonly used in pixel art editors
  static readonly ZOOM_LEVELS = [0.125, 0.25, 0.5, 1, 2, 4, 8, 16, 32, 64]
  static readonly DEFAULT_ZOOM = 1
  static readonly MIN_ZOOM = 0.125
  static readonly MAX_ZOOM = 64

  getConfig(): ZoomToolConfig {
    return { zoomMode: this.zoomMode }
  }

  setConfig(config: Partial<ZoomToolConfig>): void {
    if (config.zoomMode !== undefined) {
      this.zoomMode = config.zoomMode
    }
  }

  setZoomMode(mode: ZoomMode): void {
    this.zoomMode = mode
  }

  getZoomMode(): ZoomMode {
    return this.zoomMode
  }

  toggleZoomMode(): void {
    this.zoomMode = this.zoomMode === ZoomMode.ZOOM_IN ? ZoomMode.ZOOM_OUT : ZoomMode.ZOOM_IN
  }

  drawStart(pos: Point, event?: PointerEvent): void {
    super.drawStart(pos, event)
    this.isDragging = true
    this.lastMousePos = { x: event?.clientX ?? pos.x, y: event?.clientY ?? pos.y }

    // Perform initial zoom on click
    const zoomDelta = this.zoomMode === ZoomMode.ZOOM_IN ? 1 : -1
    this.emitZoom(zoomDelta, pos)
  }

  drawMove(pos: Point, event?: PointerEvent): void {
    super.drawMove(pos, event)

    if (!this.isDragging || !event) return

    // Drag to zoom: moving right zooms in, moving left zooms out
    const deltaX = event.clientX - this.lastMousePos.x

    // Only trigger zoom if moved enough pixels
    if (Math.abs(deltaX) > 10) {
      const zoomDelta = deltaX > 0 ? 0.1 : -0.1
      this.emitZoom(zoomDelta, pos)
      this.lastMousePos = { x: event.clientX, y: event.clientY }
    }
  }

  drawEnd(pos: Point, event?: PointerEvent): void {
    super.drawEnd(pos, event)
    this.isDragging = false
  }

  // Static helper to get next zoom level
  static getNextZoomLevel(currentZoom: number, direction: 1 | -1): number {
    const levels = ZoomTool.ZOOM_LEVELS
    const currentIndex = levels.findIndex(level => level >= currentZoom)

    if (direction > 0) {
      // Zoom in
      const nextIndex = currentIndex < levels.length - 1 ? currentIndex + 1 : currentIndex
      return levels[nextIndex]
    } else {
      // Zoom out
      const prevIndex = currentIndex > 0 ? currentIndex - 1 : 0
      return levels[prevIndex]
    }
  }

  // Fit canvas to viewport
  fitToFrame(canvasSize: { width: number; height: number }, viewportSize: { width: number; height: number }): number {
    const scaleX = viewportSize.width / canvasSize.width
    const scaleY = viewportSize.height / canvasSize.height
    return Math.min(scaleX, scaleY) * 0.9 // 90% to leave some margin
  }

  private emitZoom(delta: number, center: Point): void {
    if (this.canvas) {
      this.canvas.dispatchEvent(new CustomEvent('tool:zoom', {
        detail: { delta, center },
        bubbles: true
      }))
    }
  }

  activate(): void {
    super.activate()
    this.updateCursor()
  }

  private updateCursor(): void {
    if (this.canvas) {
      this.canvas.style.cursor = this.zoomMode === ZoomMode.ZOOM_IN ? 'zoom-in' : 'zoom-out'
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
export const ZoomDefinition = defineToolWithFactory(
  'zoom',
  'Zoom',
  'zoom-in', // Icon name
  'utility' as ToolCategory,
  () => new ZoomTool(),
  {
    shortcut: 'Z',
    hint: 'Zoom in/out (Z). Hold Alt to toggle mode.'
  }
)

// Register the tool
ToolRegistry.register(ZoomDefinition)
