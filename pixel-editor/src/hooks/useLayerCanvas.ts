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
  const prevDimensionsRef = useRef<{ width: number; height: number } | null>(null)

  const {
    width,
    height,
    layers,
    currentLayerIndex,
    setLayerData,
  } = useEditorStore()

  // Initialize or reset manager when dimensions change
  useEffect(() => {
    const prevDims = prevDimensionsRef.current
    const dimensionsChanged = prevDims && (prevDims.width !== width || prevDims.height !== height)

    if (!managerRef.current || dimensionsChanged) {
      // Reset manager with new dimensions
      managerRef.current = resetLayerCanvasManager(width, height)
    }

    prevDimensionsRef.current = { width, height }
  }, [width, height])

  // Sync layers from store to manager
  useEffect(() => {
    const manager = managerRef.current
    if (!manager) return

    const currentIds = manager.getLayerIds()
    const storeIds = layers.map(l => l.id)

    // Check if we need to recreate layers (e.g., new project)
    const needsRecreate = currentIds.length === 1 && currentIds[0] === 'layer-1' &&
      storeIds.length === 1 && storeIds[0] === 'layer-1' &&
      layers[0]?.data

    // Add new layers or update existing ones
    for (let i = 0; i < layers.length; i++) {
      const layer = layers[i]

      // Create layer if it doesn't exist
      if (!currentIds.includes(layer.id)) {
        manager.createLayer(layer.id, i)
      }

      // Update layer properties
      manager.setLayerVisible(layer.id, layer.visible)
      manager.setLayerOpacity(layer.id, layer.opacity)
      manager.setLayerBlendMode(layer.id, layer.blendMode as any)
      manager.setLayerLocked(layer.id, layer.locked)

      // Restore layer data if exists (important for new projects with fill color)
      if (layer.data) {
        const existingData = manager.getLayerImageData(layer.id)
        // Only restore if layer is empty or we're doing initial setup
        if (!existingData || needsRecreate || isEmptyImageData(existingData)) {
          manager.setLayerImageData(layer.id, layer.data)
        }
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

  // Composite all layers with effects
  const composite = useCallback((): HTMLCanvasElement | null => {
    const manager = managerRef.current
    if (!manager) return null

    // Get the base composite canvas
    const compositeCanvas = manager.composite()

    // Check if any layer has effects
    const hasEffects = layers.some(l => l.effects && l.effects.length > 0)

    if (!hasEffects) {
      return compositeCanvas
    }

    // Re-composite with effects applied
    const { compositeFrameLayers } = require('@/core/layerCanvas')

    const layerDataList = layers.map(layer => {
      return {
        visible: layer.visible,
        opacity: layer.opacity,
        blendMode: layer.blendMode,
        data: manager.getLayerImageData(layer.id),
        effects: layer.effects,
      }
    })

    const effectsResult = compositeFrameLayers(width, height, layerDataList)
    if (!effectsResult) return compositeCanvas

    // Draw the effects result onto the composite canvas
    const ctx = compositeCanvas.getContext('2d')
    if (ctx) {
      ctx.clearRect(0, 0, width, height)
      ctx.putImageData(effectsResult, 0, 0)
    }

    return compositeCanvas
  }, [layers, width, height])

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

// Helper to check if ImageData is completely empty (all transparent)
function isEmptyImageData(imageData: ImageData): boolean {
  const data = imageData.data
  // Check alpha channel - if all 0, the image is empty
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] !== 0) return false
  }
  return true
}
