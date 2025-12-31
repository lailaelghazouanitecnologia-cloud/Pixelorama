/**
 * useLayerManager - React hook for layer management
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { LayerManager, createLayerManager, type LayerData, type BlendMode } from '@/core/layers'
import { getHistory } from '@/core/history'

export interface UseLayerManagerOptions {
  width: number
  height: number
}

export interface UseLayerManagerReturn {
  // Layer manager instance
  manager: LayerManager | null

  // Layer data for UI
  layers: LayerInfo[]
  activeLayerIndex: number

  // Layer operations
  createLayer: (name?: string) => void
  deleteLayer: (index: number) => void
  duplicateLayer: (index: number) => void
  moveLayer: (from: number, to: number) => void
  mergeDown: (index: number) => void
  flatten: () => void
  clearLayer: (index: number) => void

  // Layer properties
  setActiveLayer: (index: number) => void
  setLayerVisibility: (index: number, visible: boolean) => void
  setLayerLocked: (index: number, locked: boolean) => void
  setLayerOpacity: (index: number, opacity: number) => void
  setLayerBlendMode: (index: number, blendMode: BlendMode) => void
  renameLayer: (index: number, name: string) => void

  // Canvas access
  getActiveLayerCanvas: () => HTMLCanvasElement | null
  getActiveLayerContext: () => CanvasRenderingContext2D | null
  getCompositeCanvas: () => HTMLCanvasElement | null
  composite: () => void

  // Thumbnails
  getLayerThumbnail: (index: number) => string

  // Resize
  resize: (width: number, height: number) => void
}

export interface LayerInfo {
  id: string
  name: string
  visible: boolean
  locked: boolean
  opacity: number
  blendMode: BlendMode
  thumbnail: string
}

export function useLayerManager(options: UseLayerManagerOptions): UseLayerManagerReturn {
  const { width, height } = options
  const managerRef = useRef<LayerManager | null>(null)
  const [layers, setLayers] = useState<LayerInfo[]>([])
  const [activeLayerIndex, setActiveLayerIndex] = useState(0)
  const history = getHistory()

  // Initialize manager
  useEffect(() => {
    if (!managerRef.current) {
      managerRef.current = createLayerManager(width, height)
      updateLayerState()
    }
  }, [width, height])

  // Update layer state from manager
  const updateLayerState = useCallback(() => {
    const manager = managerRef.current
    if (!manager) return

    const allLayers = manager.getAllLayers()
    const layerInfos: LayerInfo[] = allLayers.map((layer, index) => ({
      id: layer.id,
      name: layer.name,
      visible: layer.visible,
      locked: layer.locked,
      opacity: layer.opacity,
      blendMode: layer.blendMode,
      thumbnail: manager.getLayerThumbnail(index)
    }))

    setLayers(layerInfos)
    setActiveLayerIndex(manager.getActiveLayerIndex())
  }, [])

  // Create layer
  const createLayer = useCallback((name?: string) => {
    const manager = managerRef.current
    if (!manager) return

    manager.createLayer(name)
    manager.setActiveLayer(manager.getLayerCount() - 1)
    updateLayerState()
  }, [updateLayerState])

  // Delete layer
  const deleteLayer = useCallback((index: number) => {
    const manager = managerRef.current
    if (!manager) return

    // Save state for undo
    const layerData = manager.getLayerImageData(index)

    if (manager.deleteLayer(index)) {
      updateLayerState()
    }
  }, [updateLayerState])

  // Duplicate layer
  const duplicateLayer = useCallback((index: number) => {
    const manager = managerRef.current
    if (!manager) return

    if (manager.duplicateLayer(index)) {
      updateLayerState()
    }
  }, [updateLayerState])

  // Move layer
  const moveLayer = useCallback((from: number, to: number) => {
    const manager = managerRef.current
    if (!manager) return

    if (manager.moveLayer(from, to)) {
      updateLayerState()
    }
  }, [updateLayerState])

  // Merge down
  const mergeDown = useCallback((index: number) => {
    const manager = managerRef.current
    if (!manager) return

    if (manager.mergeDown(index)) {
      updateLayerState()
    }
  }, [updateLayerState])

  // Flatten
  const flatten = useCallback(() => {
    const manager = managerRef.current
    if (!manager) return

    manager.flatten()
    updateLayerState()
  }, [updateLayerState])

  // Clear layer
  const clearLayer = useCallback((index: number) => {
    const manager = managerRef.current
    if (!manager) return

    // Save state for undo
    const canvas = manager.getLayer(index)?.canvas
    if (canvas) {
      const beforeData = canvas.getContext('2d')!.getImageData(0, 0, width, height)

      manager.clearLayer(index)

      const afterData = canvas.getContext('2d')!.getImageData(0, 0, width, height)
      history.addAction(
        'Clear Layer',
        () => manager.setLayerImageData(index, beforeData),
        () => manager.setLayerImageData(index, afterData)
      )
    }

    updateLayerState()
  }, [width, height, updateLayerState, history])

  // Set active layer
  const setActiveLayerCallback = useCallback((index: number) => {
    const manager = managerRef.current
    if (!manager) return

    manager.setActiveLayer(index)
    setActiveLayerIndex(index)
  }, [])

  // Set visibility
  const setLayerVisibility = useCallback((index: number, visible: boolean) => {
    const manager = managerRef.current
    if (!manager) return

    manager.setLayerVisibility(index, visible)
    updateLayerState()
  }, [updateLayerState])

  // Set locked
  const setLayerLocked = useCallback((index: number, locked: boolean) => {
    const manager = managerRef.current
    if (!manager) return

    manager.setLayerLocked(index, locked)
    updateLayerState()
  }, [updateLayerState])

  // Set opacity
  const setLayerOpacity = useCallback((index: number, opacity: number) => {
    const manager = managerRef.current
    if (!manager) return

    manager.setLayerOpacity(index, opacity)
    updateLayerState()
  }, [updateLayerState])

  // Set blend mode
  const setLayerBlendMode = useCallback((index: number, blendMode: BlendMode) => {
    const manager = managerRef.current
    if (!manager) return

    manager.setLayerBlendMode(index, blendMode)
    updateLayerState()
  }, [updateLayerState])

  // Rename layer
  const renameLayer = useCallback((index: number, name: string) => {
    const manager = managerRef.current
    if (!manager) return

    manager.renameLayer(index, name)
    updateLayerState()
  }, [updateLayerState])

  // Get active layer canvas
  const getActiveLayerCanvas = useCallback((): HTMLCanvasElement | null => {
    const manager = managerRef.current
    if (!manager) return null
    return manager.getActiveLayer()?.canvas || null
  }, [])

  // Get active layer context
  const getActiveLayerContext = useCallback((): CanvasRenderingContext2D | null => {
    const manager = managerRef.current
    if (!manager) return null
    return manager.getActiveLayer()?.ctx || null
  }, [])

  // Get composite canvas
  const getCompositeCanvas = useCallback((): HTMLCanvasElement | null => {
    const manager = managerRef.current
    if (!manager) return null
    return manager.getCompositeCanvas()
  }, [])

  // Composite layers
  const composite = useCallback(() => {
    const manager = managerRef.current
    if (!manager) return
    manager.composite()
  }, [])

  // Get thumbnail
  const getLayerThumbnail = useCallback((index: number): string => {
    const manager = managerRef.current
    if (!manager) return ''
    return manager.getLayerThumbnail(index)
  }, [])

  // Resize
  const resize = useCallback((newWidth: number, newHeight: number) => {
    const manager = managerRef.current
    if (!manager) return
    manager.resize(newWidth, newHeight)
    updateLayerState()
  }, [updateLayerState])

  return {
    manager: managerRef.current,
    layers,
    activeLayerIndex,
    createLayer,
    deleteLayer,
    duplicateLayer,
    moveLayer,
    mergeDown,
    flatten,
    clearLayer,
    setActiveLayer: setActiveLayerCallback,
    setLayerVisibility,
    setLayerLocked,
    setLayerOpacity,
    setLayerBlendMode,
    renameLayer,
    getActiveLayerCanvas,
    getActiveLayerContext,
    getCompositeCanvas,
    composite,
    getLayerThumbnail,
    resize
  }
}
