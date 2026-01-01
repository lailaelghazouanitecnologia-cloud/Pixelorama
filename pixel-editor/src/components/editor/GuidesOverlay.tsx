/**
 * Guides Overlay Component
 * Renders horizontal and vertical guides on the canvas
 * Guides can be created by clicking on rulers
 */

import { useCallback, useState } from "react"
import { useEditorStore } from "@/store/editor-store"
import type { Guide } from "@/core/guides"

interface GuidesOverlayProps {
  canvasWidth: number  // Canvas width in screen pixels
  canvasHeight: number // Canvas height in screen pixels
}

export function GuidesOverlay({ canvasWidth, canvasHeight }: GuidesOverlayProps) {
  const { guides, showGuides, zoom, removeGuide, updateGuide } = useEditorStore()
  const [draggingGuide, setDraggingGuide] = useState<string | null>(null)

  // Handle guide drag start
  const handleGuideMouseDown = useCallback((e: React.MouseEvent, guide: Guide) => {
    if (guide.locked) return
    e.preventDefault()
    e.stopPropagation()
    setDraggingGuide(guide.id)
  }, [])

  // Handle guide drag
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!draggingGuide) return

    const guide = guides.find(g => g.id === draggingGuide)
    if (!guide || guide.locked) return

    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // Convert to canvas pixels
    const canvasX = Math.round(x / zoom)
    const canvasY = Math.round(y / zoom)

    if (guide.type === 'horizontal') {
      updateGuide(guide.id, { position: canvasY })
    } else {
      updateGuide(guide.id, { position: canvasX })
    }
  }, [draggingGuide, guides, zoom, updateGuide])

  // Handle guide drag end
  const handleMouseUp = useCallback(() => {
    setDraggingGuide(null)
  }, [])

  // Handle double-click to remove guide
  const handleGuideDoubleClick = useCallback((e: React.MouseEvent, guide: Guide) => {
    e.preventDefault()
    e.stopPropagation()
    if (!guide.locked) {
      removeGuide(guide.id)
    }
  }, [removeGuide])

  if (!showGuides || guides.length === 0) return null

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      width={canvasWidth}
      height={canvasHeight}
      style={{ overflow: 'visible' }}
      onMouseMove={draggingGuide ? handleMouseMove : undefined}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {guides.map((guide) => {
        const screenPos = guide.position * zoom
        const isActive = draggingGuide === guide.id

        if (guide.type === 'horizontal') {
          return (
            <line
              key={guide.id}
              x1={0}
              y1={screenPos}
              x2={canvasWidth}
              y2={screenPos}
              stroke={guide.color}
              strokeWidth={isActive ? 2 : 1}
              strokeDasharray={guide.locked ? "4,2" : "none"}
              opacity={0.8}
              style={{ pointerEvents: 'auto', cursor: guide.locked ? 'not-allowed' : 'ns-resize' }}
              onMouseDown={(e) => handleGuideMouseDown(e, guide)}
              onDoubleClick={(e) => handleGuideDoubleClick(e, guide)}
            />
          )
        } else {
          return (
            <line
              key={guide.id}
              x1={screenPos}
              y1={0}
              x2={screenPos}
              y2={canvasHeight}
              stroke={guide.color}
              strokeWidth={isActive ? 2 : 1}
              strokeDasharray={guide.locked ? "4,2" : "none"}
              opacity={0.8}
              style={{ pointerEvents: 'auto', cursor: guide.locked ? 'not-allowed' : 'ew-resize' }}
              onMouseDown={(e) => handleGuideMouseDown(e, guide)}
              onDoubleClick={(e) => handleGuideDoubleClick(e, guide)}
            />
          )
        }
      })}
    </svg>
  )
}

// Mini component for adding guides from rulers
interface RulerGuideCreatorProps {
  orientation: 'horizontal' | 'vertical'
}

export function RulerGuideCreator({ orientation }: RulerGuideCreatorProps) {
  const { addGuide, zoom } = useEditorStore()

  const handleClick = useCallback((e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const position = orientation === 'horizontal'
      ? Math.round((e.clientX - rect.left) / zoom)
      : Math.round((e.clientY - rect.top) / zoom)

    addGuide(orientation === 'horizontal' ? 'vertical' : 'horizontal', position)
  }, [addGuide, orientation, zoom])

  return (
    <div
      className="absolute inset-0 cursor-crosshair"
      onClick={handleClick}
      title="Click to add guide"
    />
  )
}
