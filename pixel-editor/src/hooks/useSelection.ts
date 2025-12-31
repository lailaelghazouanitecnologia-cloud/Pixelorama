/**
 * useSelection Hook - Manages selection state and rendering
 * Based on Pixelorama's selection handling
 */

import { useRef, useEffect, useCallback, useState } from 'react'
import { useEditorStore } from '@/store/editor-store'
import { SelectionManager, SelectionOperation, type SelectionRect } from '@/core/selection'

export interface UseSelectionOptions {
  canvas: HTMLCanvasElement | null
  overlayCanvas: HTMLCanvasElement | null
}

export function useSelection({ canvas, overlayCanvas }: UseSelectionOptions) {
  const selectionManagerRef = useRef<SelectionManager | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const marchingAntsOffsetRef = useRef(0)
  const [hasSelection, setHasSelection] = useState(false)

  const { width, height, setSelection, clearSelection: clearStoreSelection } = useEditorStore()

  // Initialize or resize selection manager
  useEffect(() => {
    if (!selectionManagerRef.current) {
      selectionManagerRef.current = new SelectionManager(width, height)
    } else {
      selectionManagerRef.current.resize(width, height)
    }

    // Subscribe to selection changes
    const unsubscribe = selectionManagerRef.current.subscribe((state) => {
      setHasSelection(state.active)
      if (state.active && state.rect) {
        setSelection({
          active: true,
          x: state.rect.x,
          y: state.rect.y,
          width: state.rect.width,
          height: state.rect.height,
        })
      } else {
        setSelection({ active: false })
      }
    })

    return () => {
      unsubscribe()
    }
  }, [width, height, setSelection])

  // Marching ants animation
  useEffect(() => {
    if (!overlayCanvas) return

    const ctx = overlayCanvas.getContext('2d')
    if (!ctx) return

    const animate = () => {
      if (!selectionManagerRef.current || !hasSelection) {
        ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height)
        animationFrameRef.current = requestAnimationFrame(animate)
        return
      }

      // Clear overlay
      ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height)

      // Update marching ants offset
      marchingAntsOffsetRef.current = (marchingAntsOffsetRef.current + 0.5) % 8

      // Draw selection outline
      selectionManagerRef.current.drawOutline(ctx, marchingAntsOffsetRef.current)

      animationFrameRef.current = requestAnimationFrame(animate)
    }

    animationFrameRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [overlayCanvas, hasSelection])

  // Selection operations
  const selectRect = useCallback((rect: SelectionRect, operation: SelectionOperation = SelectionOperation.REPLACE) => {
    selectionManagerRef.current?.selectRect(rect, operation)
  }, [])

  const selectEllipse = useCallback((rect: SelectionRect, operation: SelectionOperation = SelectionOperation.REPLACE) => {
    // Create ellipse mask from bounding rect
    const mask = new Uint8Array(width * height)
    const cx = rect.x + rect.width / 2
    const cy = rect.y + rect.height / 2
    const rx = rect.width / 2
    const ry = rect.height / 2

    if (rx <= 0 || ry <= 0) return

    for (let py = 0; py < height; py++) {
      for (let px = 0; px < width; px++) {
        // Check if point is inside ellipse
        const nx = (px - cx) / rx
        const ny = (py - cy) / ry
        if (nx * nx + ny * ny <= 1) {
          mask[py * width + px] = 255
        }
      }
    }

    selectionManagerRef.current?.selectMask(mask, operation)
  }, [width, height])

  const selectMask = useCallback((mask: Uint8Array, operation: SelectionOperation = SelectionOperation.REPLACE) => {
    selectionManagerRef.current?.selectMask(mask, operation)
  }, [])

  const selectAll = useCallback(() => {
    selectionManagerRef.current?.selectAll()
  }, [])

  const clearSelection = useCallback(() => {
    selectionManagerRef.current?.clear()
    clearStoreSelection()
  }, [clearStoreSelection])

  const invertSelection = useCallback(() => {
    selectionManagerRef.current?.invert()
  }, [])

  const isSelected = useCallback((x: number, y: number): boolean => {
    return selectionManagerRef.current?.isSelected(x, y) ?? false
  }, [])

  const getMask = useCallback((): Uint8Array | null => {
    return selectionManagerRef.current?.getMask() ?? null
  }, [])

  const getBoundingRect = useCallback((): SelectionRect | null => {
    return selectionManagerRef.current?.getBoundingRect() ?? null
  }, [])

  const moveSelection = useCallback((dx: number, dy: number) => {
    selectionManagerRef.current?.move(dx, dy)
  }, [])

  return {
    hasSelection,
    selectRect,
    selectEllipse,
    selectMask,
    selectAll,
    clearSelection,
    invertSelection,
    isSelected,
    getMask,
    getBoundingRect,
    moveSelection,
    manager: selectionManagerRef.current,
  }
}
