/**
 * Layer Canvas System - Manages per-layer canvases and compositing
 * Based on Pixelorama's layer rendering architecture
 */

export interface LayerCanvas {
  id: string
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  visible: boolean
  opacity: number
  blendMode: GlobalCompositeOperation
  locked: boolean
}

export type BlendModeMapping = {
  normal: GlobalCompositeOperation
  multiply: GlobalCompositeOperation
  screen: GlobalCompositeOperation
  overlay: GlobalCompositeOperation
  darken: GlobalCompositeOperation
  lighten: GlobalCompositeOperation
}

const BLEND_MODE_MAP: BlendModeMapping = {
  normal: 'source-over',
  multiply: 'multiply',
  screen: 'screen',
  overlay: 'overlay',
  darken: 'darken',
  lighten: 'lighten',
}

/**
 * LayerManager - Manages multiple canvas layers and compositing
 */
export class LayerCanvasManager {
  private width: number
  private height: number
  private layers: Map<string, LayerCanvas> = new Map()
  private layerOrder: string[] = []
  private compositeCanvas: HTMLCanvasElement
  private compositeCtx: CanvasRenderingContext2D

  constructor(width: number, height: number) {
    this.width = width
    this.height = height

    // Create composite canvas
    this.compositeCanvas = document.createElement('canvas')
    this.compositeCanvas.width = width
    this.compositeCanvas.height = height
    this.compositeCtx = this.compositeCanvas.getContext('2d')!
    this.compositeCtx.imageSmoothingEnabled = false
  }

  /**
   * Create a new layer
   */
  createLayer(id: string, index?: number): LayerCanvas {
    const canvas = document.createElement('canvas')
    canvas.width = this.width
    canvas.height = this.height

    const ctx = canvas.getContext('2d')!
    ctx.imageSmoothingEnabled = false

    const layer: LayerCanvas = {
      id,
      canvas,
      ctx,
      visible: true,
      opacity: 100,
      blendMode: 'source-over',
      locked: false,
    }

    this.layers.set(id, layer)

    if (index !== undefined && index >= 0 && index <= this.layerOrder.length) {
      this.layerOrder.splice(index, 0, id)
    } else {
      this.layerOrder.push(id)
    }

    return layer
  }

  /**
   * Get a layer by ID
   */
  getLayer(id: string): LayerCanvas | undefined {
    return this.layers.get(id)
  }

  /**
   * Get layer by index
   */
  getLayerByIndex(index: number): LayerCanvas | undefined {
    const id = this.layerOrder[index]
    return id ? this.layers.get(id) : undefined
  }

  /**
   * Delete a layer
   */
  deleteLayer(id: string): boolean {
    if (!this.layers.has(id)) return false

    this.layers.delete(id)
    const index = this.layerOrder.indexOf(id)
    if (index !== -1) {
      this.layerOrder.splice(index, 1)
    }

    return true
  }

  /**
   * Duplicate a layer
   */
  duplicateLayer(id: string, newId: string): LayerCanvas | null {
    const original = this.layers.get(id)
    if (!original) return null

    const index = this.layerOrder.indexOf(id)
    const newLayer = this.createLayer(newId, index + 1)

    // Copy canvas content
    newLayer.ctx.drawImage(original.canvas, 0, 0)
    newLayer.visible = original.visible
    newLayer.opacity = original.opacity
    newLayer.blendMode = original.blendMode

    return newLayer
  }

  /**
   * Move layer to new position
   */
  moveLayer(fromIndex: number, toIndex: number): void {
    if (fromIndex < 0 || fromIndex >= this.layerOrder.length) return
    if (toIndex < 0 || toIndex >= this.layerOrder.length) return

    const [id] = this.layerOrder.splice(fromIndex, 1)
    this.layerOrder.splice(toIndex, 0, id)
  }

  /**
   * Set layer properties
   */
  setLayerVisible(id: string, visible: boolean): void {
    const layer = this.layers.get(id)
    if (layer) layer.visible = visible
  }

  setLayerOpacity(id: string, opacity: number): void {
    const layer = this.layers.get(id)
    if (layer) layer.opacity = Math.max(0, Math.min(100, opacity))
  }

  setLayerBlendMode(id: string, mode: keyof BlendModeMapping): void {
    const layer = this.layers.get(id)
    if (layer) layer.blendMode = BLEND_MODE_MAP[mode] || 'source-over'
  }

  setLayerLocked(id: string, locked: boolean): void {
    const layer = this.layers.get(id)
    if (layer) layer.locked = locked
  }

  /**
   * Composite all layers into one image
   */
  composite(): HTMLCanvasElement {
    this.compositeCtx.clearRect(0, 0, this.width, this.height)

    // Draw layers from bottom to top
    for (const id of this.layerOrder) {
      const layer = this.layers.get(id)
      if (!layer || !layer.visible) continue

      this.compositeCtx.globalAlpha = layer.opacity / 100
      this.compositeCtx.globalCompositeOperation = layer.blendMode
      this.compositeCtx.drawImage(layer.canvas, 0, 0)
    }

    // Reset composite settings
    this.compositeCtx.globalAlpha = 1
    this.compositeCtx.globalCompositeOperation = 'source-over'

    return this.compositeCanvas
  }

  /**
   * Get ImageData from a specific layer
   */
  getLayerImageData(id: string): ImageData | null {
    const layer = this.layers.get(id)
    if (!layer) return null
    return layer.ctx.getImageData(0, 0, this.width, this.height)
  }

  /**
   * Set ImageData for a specific layer
   */
  setLayerImageData(id: string, imageData: ImageData): void {
    const layer = this.layers.get(id)
    if (layer) {
      layer.ctx.putImageData(imageData, 0, 0)
    }
  }

  /**
   * Clear a layer
   */
  clearLayer(id: string): void {
    const layer = this.layers.get(id)
    if (layer) {
      layer.ctx.clearRect(0, 0, this.width, this.height)
    }
  }

  /**
   * Get composite canvas
   */
  getCompositeCanvas(): HTMLCanvasElement {
    return this.compositeCanvas
  }

  /**
   * Resize all layers
   */
  resize(newWidth: number, newHeight: number): void {
    // Store current content
    const layerData: Map<string, ImageData> = new Map()
    for (const [id, layer] of this.layers) {
      layerData.set(id, layer.ctx.getImageData(0, 0, this.width, this.height))
    }

    // Update dimensions
    this.width = newWidth
    this.height = newHeight

    // Resize composite canvas
    this.compositeCanvas.width = newWidth
    this.compositeCanvas.height = newHeight

    // Resize and restore each layer
    for (const [id, layer] of this.layers) {
      layer.canvas.width = newWidth
      layer.canvas.height = newHeight
      layer.ctx.imageSmoothingEnabled = false

      const data = layerData.get(id)
      if (data) {
        // Center the old content
        const offsetX = Math.floor((newWidth - data.width) / 2)
        const offsetY = Math.floor((newHeight - data.height) / 2)
        layer.ctx.putImageData(data, offsetX, offsetY)
      }
    }
  }

  /**
   * Get layer count
   */
  get count(): number {
    return this.layerOrder.length
  }

  /**
   * Get all layer IDs in order
   */
  getLayerIds(): string[] {
    return [...this.layerOrder]
  }

  /**
   * Get dimensions
   */
  getSize(): { width: number; height: number } {
    return { width: this.width, height: this.height }
  }
}

// Singleton manager for the current project
let currentManager: LayerCanvasManager | null = null

export function getLayerCanvasManager(width?: number, height?: number): LayerCanvasManager {
  if (!currentManager && width && height) {
    currentManager = new LayerCanvasManager(width, height)
    // Create default layer
    currentManager.createLayer('layer-1')
  }
  return currentManager!
}

export function resetLayerCanvasManager(width: number, height: number): LayerCanvasManager {
  currentManager = new LayerCanvasManager(width, height)
  currentManager.createLayer('layer-1')
  return currentManager
}

/**
 * Composite frame layers into a single ImageData
 * Used for onion skinning and frame preview
 */
export function compositeFrameLayers(
  width: number,
  height: number,
  layers: Array<{
    visible: boolean
    opacity: number
    blendMode: string
    data: ImageData | null
    effects?: import('@/core/layerEffects').AnyLayerEffect[]
  }>
): ImageData | null {
  if (layers.length === 0) return null

  // Dynamically import to avoid circular dependencies
  const { applyLayerEffects } = require('@/core/layerEffects')

  // Create temporary canvases
  const compositeCanvas = document.createElement('canvas')
  compositeCanvas.width = width
  compositeCanvas.height = height
  const compositeCtx = compositeCanvas.getContext('2d')
  if (!compositeCtx) return null

  compositeCtx.imageSmoothingEnabled = false

  const layerCanvas = document.createElement('canvas')
  layerCanvas.width = width
  layerCanvas.height = height
  const layerCtx = layerCanvas.getContext('2d')
  if (!layerCtx) return null

  layerCtx.imageSmoothingEnabled = false

  // Blend mode mapping
  const blendModeMap: Record<string, GlobalCompositeOperation> = {
    'normal': 'source-over',
    'multiply': 'multiply',
    'screen': 'screen',
    'overlay': 'overlay',
    'darken': 'darken',
    'lighten': 'lighten',
  }

  // Composite layers from bottom to top
  for (const layer of layers) {
    if (!layer.visible || !layer.data) continue

    // Apply layer effects if any
    let layerData = layer.data
    if (layer.effects && layer.effects.length > 0) {
      layerData = applyLayerEffects(layer.data, layer.effects)
    }

    // Draw layer data to temp canvas
    layerCtx.clearRect(0, 0, width, height)
    layerCtx.putImageData(layerData, 0, 0)

    // Composite onto main canvas
    compositeCtx.globalAlpha = layer.opacity / 100
    compositeCtx.globalCompositeOperation = blendModeMap[layer.blendMode] || 'source-over'
    compositeCtx.drawImage(layerCanvas, 0, 0)
  }

  // Reset composite settings
  compositeCtx.globalAlpha = 1
  compositeCtx.globalCompositeOperation = 'source-over'

  return compositeCtx.getImageData(0, 0, width, height)
}
