/**
 * useLayerCanvas Hook - Integrates LayerCanvasManager with React and the store
 */

import { useEffect, useRef, useCallback } from 'react'
import { useEditorStore } from '@/store/editor-store'
import {
  LayerCanvasManager,
  getLayerCanvasManager,
  resetLayerCanvasManager,
} from '@/core/layerCanvas'

export function useLayerCanvas() {
  const managerRef = useRef<LayerCanvasManager | null>(null)

  const {
    width,
    height,
    layers,
    currentLayerIndex,
    setLayerData,
  } = useEditorStore()

  // Initialize or get manager
  useEffect(() => {
    if (!managerRef.current) {
      managerRef.current = getLayerCanvasManager(width, height)
    }
  }, [width, height])

  // Sync layers from store to manager
  useEffect(() => {
    const manager = managerRef.current
    if (!manager) return

    const currentIds = manager.getLayerIds()
    const storeIds = layers.map(l => l.id)

    // Add new layers
    for (let i = 0; i < layers.length; i++) {
      const layer = layers[i]
      if (!currentIds.includes(layer.id)) {
        manager.createLayer(layer.id, i)
      }

      // Update layer properties
      manager.setLayerVisible(layer.id, layer.visible)
      manager.setLayerOpacity(layer.id, layer.opacity)
      manager.setLayerBlendMode(layer.id, layer.blendMode as any)
      manager.setLayerLocked(layer.id, layer.locked)

      // Restore layer data if exists
      if (layer.data) {
        manager.setLayerImageData(layer.id, layer.data)
      }
    }

    // Remove deleted layers
    for (const id of currentIds) {
      if (!storeIds.includes(id)) {
        manager.deleteLayer(id)
      }
    }
  }, [layers])

  // Get current layer context for drawing
  const getCurrentLayerCtx = useCallback((): CanvasRenderingContext2D | null => {
    const manager = managerRef.current
    if (!manager) return null

    const layer = layers[currentLayerIndex]
    if (!layer) return null

    const layerCanvas = manager.getLayer(layer.id)
    return layerCanvas?.ctx || null
  }, [layers, currentLayerIndex])

  // Get current layer
  const getCurrentLayer = useCallback(() => {
    const manager = managerRef.current
    if (!manager) return null

    const layer = layers[currentLayerIndex]
    if (!layer) return null

    return manager.getLayer(layer.id)
  }, [layers, currentLayerIndex])

  // Composite all layers
  const composite = useCallback((): HTMLCanvasElement | null => {
    return managerRef.current?.composite() || null
  }, [])

  // Save current layer data to store
  const saveCurrentLayerData = useCallback(() => {
    const manager = managerRef.current
    if (!manager) return

    const layer = layers[currentLayerIndex]
    if (!layer) return

    const imageData = manager.getLayerImageData(layer.id)
    if (imageData) {
      setLayerData(currentLayerIndex, imageData)
    }
  }, [layers, currentLayerIndex, setLayerData])

  // Get manager
  const getManager = useCallback(() => managerRef.current, [])

  // Reset for new project
  const resetForNewProject = useCallback((newWidth: number, newHeight: number) => {
    managerRef.current = resetLayerCanvasManager(newWidth, newHeight)
  }, [])

  return {
    getCurrentLayerCtx,
    getCurrentLayer,
    composite,
    saveCurrentLayerData,
    getManager,
    resetForNewProject,
  }
}
