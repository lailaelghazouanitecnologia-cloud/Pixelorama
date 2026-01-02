/**
 * ReferenceImage Component - Overlay reference image for tracing
 * Based on Pixelorama's reference image feature
 */

import { useRef, useEffect, useState, useCallback } from "react"
import { useEditorStore } from "@/store/editor-store"
import { X, Lock, Unlock, Eye, EyeOff } from "lucide-react"

interface ReferenceImageState {
  src: string
  x: number
  y: number
  width: number
  height: number
  opacity: number
  locked: boolean
  visible: boolean
}

export function ReferenceImage() {
  const { width: canvasWidth, height: canvasHeight, zoom } = useEditorStore()

  const [refImage, setRefImage] = useState<ReferenceImageState | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  // Load reference image
  const handleLoadImage = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'

    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return

      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          // Scale image to fit canvas while maintaining aspect ratio
          const scale = Math.min(
            (canvasWidth * 0.8) / img.width,
            (canvasHeight * 0.8) / img.height
          )

          setRefImage({
            src: e.target?.result as string,
            x: (canvasWidth - img.width * scale) / 2,
            y: (canvasHeight - img.height * scale) / 2,
            width: img.width * scale,
            height: img.height * scale,
            opacity: 0.5,
            locked: false,
            visible: true,
          })
        }
        img.src = e.target?.result as string
      }
      reader.readAsDataURL(file)
    }

    input.click()
  }, [canvasWidth, canvasHeight])

  // Handle drag start
  const handleMouseDown = useCallback((e: React.MouseEvent, action: 'move' | 'resize') => {
    if (!refImage || refImage.locked) return

    e.preventDefault()
    e.stopPropagation()

    if (action === 'move') {
      setIsDragging(true)
    } else {
      setIsResizing(true)
    }

    setDragStart({ x: e.clientX, y: e.clientY })
  }, [refImage])

  // Handle drag
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!refImage) return

    const dx = (e.clientX - dragStart.x) / zoom
    const dy = (e.clientY - dragStart.y) / zoom

    if (isDragging) {
      setRefImage(prev => prev ? {
        ...prev,
        x: prev.x + dx,
        y: prev.y + dy,
      } : null)
    } else if (isResizing) {
      setRefImage(prev => prev ? {
        ...prev,
        width: Math.max(10, prev.width + dx),
        height: Math.max(10, prev.height + dy),
      } : null)
    }

    setDragStart({ x: e.clientX, y: e.clientY })
  }, [isDragging, isResizing, dragStart, zoom, refImage])

  // Handle drag end
  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
    setIsResizing(false)
  }, [])

  // Add/remove mouse listeners
  useEffect(() => {
    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp])

  // Toggle visibility
  const toggleVisibility = useCallback(() => {
    setRefImage(prev => prev ? { ...prev, visible: !prev.visible } : null)
  }, [])

  // Toggle lock
  const toggleLock = useCallback(() => {
    setRefImage(prev => prev ? { ...prev, locked: !prev.locked } : null)
  }, [])

  // Remove reference image
  const removeImage = useCallback(() => {
    setRefImage(null)
  }, [])

  // Adjust opacity
  const setOpacity = useCallback((opacity: number) => {
    setRefImage(prev => prev ? { ...prev, opacity } : null)
  }, [])

  // Listen for load reference image event
  useEffect(() => {
    const handler = () => handleLoadImage()
    window.addEventListener('editor:loadReferenceImage', handler)
    return () => window.removeEventListener('editor:loadReferenceImage', handler)
  }, [handleLoadImage])

  if (!refImage) return null

  return (
    <>
      {/* Reference image overlay */}
      {refImage.visible && (
        <div
          ref={containerRef}
          className="absolute pointer-events-none"
          style={{
            left: refImage.x * zoom,
            top: refImage.y * zoom,
            width: refImage.width * zoom,
            height: refImage.height * zoom,
            opacity: refImage.opacity,
          }}
        >
          <img
            src={refImage.src}
            alt="Reference"
            className="w-full h-full object-contain"
            style={{ imageRendering: 'pixelated' }}
            draggable={false}
          />

          {/* Move handle */}
          {!refImage.locked && (
            <div
              className="absolute inset-0 cursor-move pointer-events-auto"
              onMouseDown={(e) => handleMouseDown(e, 'move')}
            />
          )}

          {/* Resize handle */}
          {!refImage.locked && (
            <div
              className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize pointer-events-auto"
              style={{ backgroundColor: 'rgba(255,255,255,0.5)' }}
              onMouseDown={(e) => handleMouseDown(e, 'resize')}
            />
          )}

          {/* Border when not locked */}
          {!refImage.locked && (
            <div
              className="absolute inset-0 border-2 border-dashed pointer-events-none"
              style={{ borderColor: 'rgba(0, 150, 255, 0.5)' }}
            />
          )}
        </div>
      )}

      {/* Reference image controls */}
      <div
        className="absolute top-2 right-2 flex items-center gap-1 p-1 rounded"
        style={{ backgroundColor: 'var(--pix-bg-secondary)', border: '1px solid var(--pix-border)' }}
      >
        <span className="text-pix-xs text-pix-text-muted px-1">Ref</span>

        <button
          className="icon-btn"
          onClick={toggleVisibility}
          title={refImage.visible ? 'Hide Reference' : 'Show Reference'}
        >
          {refImage.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
        </button>

        <button
          className="icon-btn"
          onClick={toggleLock}
          title={refImage.locked ? 'Unlock Reference' : 'Lock Reference'}
        >
          {refImage.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
        </button>

        <input
          type="range"
          className="w-16 h-2"
          min={0}
          max={100}
          value={refImage.opacity * 100}
          onChange={(e) => setOpacity(parseInt(e.target.value) / 100)}
          title={`Opacity: ${Math.round(refImage.opacity * 100)}%`}
        />

        <button
          className="icon-btn"
          onClick={removeImage}
          title="Remove Reference Image"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </>
  )
}

/**
 * Trigger load reference image dialog
 */
export function loadReferenceImage(): void {
  window.dispatchEvent(new CustomEvent('editor:loadReferenceImage'))
}
