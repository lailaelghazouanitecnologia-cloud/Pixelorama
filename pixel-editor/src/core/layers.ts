/**
 * Layer System - Multi-layer canvas management
 * Based on Pixelorama's layer architecture
 */

export type BlendMode =
  | 'normal'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'darken'
  | 'lighten'
  | 'color-dodge'
  | 'color-burn'
  | 'hard-light'
  | 'soft-light'
  | 'difference'
  | 'exclusion'

export interface LayerData {
  id: string
  name: string
  visible: boolean
  locked: boolean
  opacity: number
  blendMode: BlendMode
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
}

export interface LayerManagerOptions {
  width: number
  height: number
}

/**
 * LayerManager - Manages multiple drawing layers
 */
export class LayerManager {
  private layers: LayerData[] = []
  private activeLayerIndex = 0
  private width: number
  private height: number
  private compositeCanvas: HTMLCanvasElement
  private compositeCtx: CanvasRenderingContext2D

  constructor(options: LayerManagerOptions) {
    this.width = options.width
    this.height = options.height

    // Create composite canvas for final output
    this.compositeCanvas = document.createElement('canvas')
    this.compositeCanvas.width = this.width
    this.compositeCanvas.height = this.height
    this.compositeCtx = this.compositeCanvas.getContext('2d')!
    this.compositeCtx.imageSmoothingEnabled = false
  }

  /**
   * Create a new layer
   */
  createLayer(name?: string, index?: number): LayerData {
    const id = `layer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const layerName = name || `Layer ${this.layers.length + 1}`

    const canvas = document.createElement('canvas')
    canvas.width = this.width
    canvas.height = this.height
    const ctx = canvas.getContext('2d')!
    ctx.imageSmoothingEnabled = false

    const layer: LayerData = {
      id,
      name: layerName,
      visible: true,
      locked: false,
      opacity: 100,
      blendMode: 'normal',
      canvas,
      ctx
    }

    if (index !== undefined && index >= 0 && index <= this.layers.length) {
      this.layers.splice(index, 0, layer)
    } else {
      this.layers.push(layer)
    }

    return layer
  }

  /**
   * Delete a layer by index
   */
  deleteLayer(index: number): boolean {
    if (this.layers.length <= 1) return false
    if (index < 0 || index >= this.layers.length) return false

    this.layers.splice(index, 1)

    // Adjust active layer index if needed
    if (this.activeLayerIndex >= this.layers.length) {
      this.activeLayerIndex = this.layers.length - 1
    }

    return true
  }

  /**
   * Duplicate a layer
   */
  duplicateLayer(index: number): LayerData | null {
    const original = this.layers[index]
    if (!original) return null

    const newLayer = this.createLayer(`${original.name} copy`, index + 1)

    // Copy canvas content
    newLayer.ctx.drawImage(original.canvas, 0, 0)
    newLayer.opacity = original.opacity
    newLayer.blendMode = original.blendMode

    return newLayer
  }

  /**
   * Move a layer from one position to another
   */
  moveLayer(fromIndex: number, toIndex: number): boolean {
    if (fromIndex < 0 || fromIndex >= this.layers.length) return false
    if (toIndex < 0 || toIndex >= this.layers.length) return false

    const [layer] = this.layers.splice(fromIndex, 1)
    this.layers.splice(toIndex, 0, layer)

    // Update active layer index if affected
    if (this.activeLayerIndex === fromIndex) {
      this.activeLayerIndex = toIndex
    }

    return true
  }

  /**
   * Merge a layer with the one below it
   */
  mergeDown(index: number): boolean {
    if (index <= 0 || index >= this.layers.length) return false

    const upperLayer = this.layers[index]
    const lowerLayer = this.layers[index - 1]

    // Draw upper layer onto lower layer with proper blending
    lowerLayer.ctx.globalAlpha = upperLayer.opacity / 100
    lowerLayer.ctx.globalCompositeOperation = this.getCompositeOperation(upperLayer.blendMode)
    lowerLayer.ctx.drawImage(upperLayer.canvas, 0, 0)
    lowerLayer.ctx.globalAlpha = 1
    lowerLayer.ctx.globalCompositeOperation = 'source-over'

    // Remove upper layer
    this.layers.splice(index, 1)

    if (this.activeLayerIndex >= index) {
      this.activeLayerIndex = Math.max(0, this.activeLayerIndex - 1)
    }

    return true
  }

  /**
   * Flatten all visible layers into one
   */
  flatten(): LayerData {
    // Create new layer with composite
    const flatLayer = this.createLayer('Flattened', 0)

    // Draw composite onto flat layer
    this.composite()
    flatLayer.ctx.drawImage(this.compositeCanvas, 0, 0)

    // Remove all other layers
    this.layers = [flatLayer]
    this.activeLayerIndex = 0

    return flatLayer
  }

  /**
   * Get layer by index
   */
  getLayer(index: number): LayerData | null {
    return this.layers[index] || null
  }

  /**
   * Get active layer
   */
  getActiveLayer(): LayerData | null {
    return this.layers[this.activeLayerIndex] || null
  }

  /**
   * Set active layer
   */
  setActiveLayer(index: number): boolean {
    if (index < 0 || index >= this.layers.length) return false
    this.activeLayerIndex = index
    return true
  }

  /**
   * Get active layer index
   */
  getActiveLayerIndex(): number {
    return this.activeLayerIndex
  }

  /**
   * Get all layers
   */
  getAllLayers(): LayerData[] {
    return [...this.layers]
  }

  /**
   * Get layer count
   */
  getLayerCount(): number {
    return this.layers.length
  }

  /**
   * Set layer visibility
   */
  setLayerVisibility(index: number, visible: boolean): void {
    const layer = this.layers[index]
    if (layer) {
      layer.visible = visible
    }
  }

  /**
   * Set layer locked state
   */
  setLayerLocked(index: number, locked: boolean): void {
    const layer = this.layers[index]
    if (layer) {
      layer.locked = locked
    }
  }

  /**
   * Set layer opacity (0-100)
   */
  setLayerOpacity(index: number, opacity: number): void {
    const layer = this.layers[index]
    if (layer) {
      layer.opacity = Math.max(0, Math.min(100, opacity))
    }
  }

  /**
   * Set layer blend mode
   */
  setLayerBlendMode(index: number, blendMode: BlendMode): void {
    const layer = this.layers[index]
    if (layer) {
      layer.blendMode = blendMode
    }
  }

  /**
   * Rename layer
   */
  renameLayer(index: number, name: string): void {
    const layer = this.layers[index]
    if (layer) {
      layer.name = name
    }
  }

  /**
   * Composite all visible layers into the composite canvas
   */
  composite(): HTMLCanvasElement {
    // Clear composite canvas
    this.compositeCtx.clearRect(0, 0, this.width, this.height)

    // Draw layers from bottom to top (index 0 is bottom)
    for (const layer of this.layers) {
      if (!layer.visible) continue

      this.compositeCtx.globalAlpha = layer.opacity / 100
      this.compositeCtx.globalCompositeOperation = this.getCompositeOperation(layer.blendMode)
      this.compositeCtx.drawImage(layer.canvas, 0, 0)
    }

    // Reset composite operation
    this.compositeCtx.globalAlpha = 1
    this.compositeCtx.globalCompositeOperation = 'source-over'

    return this.compositeCanvas
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
  resize(newWidth: number, newHeight: number, anchor: 'center' | 'top-left' = 'top-left'): void {
    const offsetX = anchor === 'center' ? Math.floor((newWidth - this.width) / 2) : 0
    const offsetY = anchor === 'center' ? Math.floor((newHeight - this.height) / 2) : 0

    for (const layer of this.layers) {
      const tempCanvas = document.createElement('canvas')
      tempCanvas.width = this.width
      tempCanvas.height = this.height
      const tempCtx = tempCanvas.getContext('2d')!
      tempCtx.drawImage(layer.canvas, 0, 0)

      layer.canvas.width = newWidth
      layer.canvas.height = newHeight
      layer.ctx.imageSmoothingEnabled = false
      layer.ctx.clearRect(0, 0, newWidth, newHeight)
      layer.ctx.drawImage(tempCanvas, offsetX, offsetY)
    }

    // Resize composite canvas
    this.compositeCanvas.width = newWidth
    this.compositeCanvas.height = newHeight
    this.compositeCtx.imageSmoothingEnabled = false

    this.width = newWidth
    this.height = newHeight
  }

  /**
   * Clear a layer
   */
  clearLayer(index: number): void {
    const layer = this.layers[index]
    if (layer) {
      layer.ctx.clearRect(0, 0, this.width, this.height)
    }
  }

  /**
   * Get image data from a layer
   */
  getLayerImageData(index: number): ImageData | null {
    const layer = this.layers[index]
    if (!layer) return null
    return layer.ctx.getImageData(0, 0, this.width, this.height)
  }

  /**
   * Set image data to a layer
   */
  setLayerImageData(index: number, imageData: ImageData): void {
    const layer = this.layers[index]
    if (layer) {
      layer.ctx.putImageData(imageData, 0, 0)
    }
  }

  /**
   * Get layer thumbnail as data URL
   */
  getLayerThumbnail(index: number, size = 32): string {
    const layer = this.layers[index]
    if (!layer) return ''

    const thumbCanvas = document.createElement('canvas')
    thumbCanvas.width = size
    thumbCanvas.height = size
    const thumbCtx = thumbCanvas.getContext('2d')!
    thumbCtx.imageSmoothingEnabled = false

    // Calculate aspect ratio
    const aspectRatio = this.width / this.height
    let drawWidth = size
    let drawHeight = size
    let offsetX = 0
    let offsetY = 0

    if (aspectRatio > 1) {
      drawHeight = size / aspectRatio
      offsetY = (size - drawHeight) / 2
    } else {
      drawWidth = size * aspectRatio
      offsetX = (size - drawWidth) / 2
    }

    thumbCtx.drawImage(layer.canvas, offsetX, offsetY, drawWidth, drawHeight)
    return thumbCanvas.toDataURL()
  }

  /**
   * Convert blend mode to canvas composite operation
   */
  private getCompositeOperation(blendMode: BlendMode): GlobalCompositeOperation {
    const modeMap: Record<BlendMode, GlobalCompositeOperation> = {
      'normal': 'source-over',
      'multiply': 'multiply',
      'screen': 'screen',
      'overlay': 'overlay',
      'darken': 'darken',
      'lighten': 'lighten',
      'color-dodge': 'color-dodge',
      'color-burn': 'color-burn',
      'hard-light': 'hard-light',
      'soft-light': 'soft-light',
      'difference': 'difference',
      'exclusion': 'exclusion'
    }
    return modeMap[blendMode] || 'source-over'
  }

  /**
   * Export layers as serializable data
   */
  serialize(): object[] {
    return this.layers.map((layer, index) => ({
      id: layer.id,
      name: layer.name,
      visible: layer.visible,
      locked: layer.locked,
      opacity: layer.opacity,
      blendMode: layer.blendMode,
      imageData: layer.canvas.toDataURL(),
      isActive: index === this.activeLayerIndex
    }))
  }

  /**
   * Import layers from serialized data
   */
  async deserialize(data: object[]): Promise<void> {
    this.layers = []

    for (const layerData of data as any[]) {
      const layer = this.createLayer(layerData.name)
      layer.id = layerData.id
      layer.visible = layerData.visible
      layer.locked = layerData.locked
      layer.opacity = layerData.opacity
      layer.blendMode = layerData.blendMode

      if (layerData.isActive) {
        this.activeLayerIndex = this.layers.length - 1
      }

      // Load image data
      if (layerData.imageData) {
        const img = new Image()
        await new Promise<void>((resolve) => {
          img.onload = () => {
            layer.ctx.drawImage(img, 0, 0)
            resolve()
          }
          img.src = layerData.imageData
        })
      }
    }
  }
}

/**
 * Create a new layer manager
 */
export function createLayerManager(width: number, height: number): LayerManager {
  const manager = new LayerManager({ width, height })
  manager.createLayer('Layer 1') // Create default layer
  return manager
}
