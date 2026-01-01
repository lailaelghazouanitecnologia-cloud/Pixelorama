/**
 * Rulers Component - Horizontal and vertical rulers for canvas
 * Based on Pixelorama's ruler system
 * Shows pixel coordinates that sync with canvas pan position
 */

import { useRef, useEffect, useState } from "react"
import { useEditorStore } from "@/store/editor-store"
import { useUIStore } from "@/store/ui-store"

const RULER_SIZE = 16 // height/width of ruler in pixels

interface RulerProps {
  orientation: 'horizontal' | 'vertical'
  canvasSize: number // canvas size in pixels
  zoom: number
  offset: number // pan offset in screen pixels
  containerSize: number // visible container size in screen pixels
  cursorPixel: number | null // cursor position in canvas pixels
}

function Ruler({ orientation, canvasSize, zoom, offset, containerSize, cursorPixel }: RulerProps) {
  const isHorizontal = orientation === 'horizontal'

  // Calculate the canvas position centered in container
  const canvasScreenSize = canvasSize * zoom
  const centerOffset = (containerSize - canvasScreenSize) / 2
  const totalOffset = centerOffset + offset

  // Determine tick intervals based on zoom level
  const getTickInterval = () => {
    if (zoom >= 16) return 1
    if (zoom >= 8) return 2
    if (zoom >= 4) return 4
    if (zoom >= 2) return 8
    if (zoom >= 1) return 16
    return 32
  }

  const tickInterval = getTickInterval()
  const majorTickInterval = tickInterval * 4 // Label every 4th tick

  // Generate tick marks - only for visible range for performance
  const ticks: { pos: number; label?: number }[] = []

  // Calculate visible pixel range
  const startPixel = Math.max(0, Math.floor(-totalOffset / zoom))
  const endPixel = Math.min(canvasSize, Math.ceil((containerSize - totalOffset) / zoom))

  // Align to tick interval
  const alignedStart = Math.floor(startPixel / tickInterval) * tickInterval

  for (let i = alignedStart; i <= endPixel; i += tickInterval) {
    const pos = i * zoom + totalOffset
    if (pos >= 0 && pos <= containerSize) {
      ticks.push({
        pos,
        label: i % majorTickInterval === 0 ? i : undefined
      })
    }
  }

  // Cursor indicator position
  const cursorPos = cursorPixel !== null ? cursorPixel * zoom + totalOffset : null

  if (isHorizontal) {
    return (
      <div
        className="absolute top-0 left-0 right-0 select-none overflow-hidden"
        style={{
          height: RULER_SIZE,
          backgroundColor: 'var(--pix-bg-secondary)',
          borderBottom: '1px solid var(--pix-border)'
        }}
      >
        <svg width="100%" height={RULER_SIZE} style={{ display: 'block' }}>
          {ticks.map((tick, i) => (
            <g key={i}>
              {/* Tick line */}
              <line
                x1={tick.pos}
                y1={tick.label !== undefined ? 4 : 10}
                x2={tick.pos}
                y2={RULER_SIZE}
                stroke="var(--pix-text-muted)"
                strokeWidth="1"
              />
              {/* Label */}
              {tick.label !== undefined && (
                <text
                  x={tick.pos + 2}
                  y={10}
                  fill="var(--pix-text-muted)"
                  fontSize="8"
                  fontFamily="monospace"
                >
                  {tick.label}
                </text>
              )}
            </g>
          ))}
          {/* Cursor indicator */}
          {cursorPos !== null && cursorPos >= 0 && cursorPos <= containerSize && (
            <line
              x1={cursorPos}
              y1={0}
              x2={cursorPos}
              y2={RULER_SIZE}
              stroke="var(--pix-accent)"
              strokeWidth="1"
            />
          )}
        </svg>
      </div>
    )
  }

  // Vertical ruler
  return (
    <div
      className="absolute top-0 left-0 bottom-0 select-none overflow-hidden"
      style={{
        width: RULER_SIZE,
        backgroundColor: 'var(--pix-bg-secondary)',
        borderRight: '1px solid var(--pix-border)'
      }}
    >
      <svg width={RULER_SIZE} height="100%" style={{ display: 'block' }}>
        {ticks.map((tick, i) => (
          <g key={i}>
            {/* Tick line */}
            <line
              x1={tick.label !== undefined ? 4 : 10}
              y1={tick.pos}
              x2={RULER_SIZE}
              y2={tick.pos}
              stroke="var(--pix-text-muted)"
              strokeWidth="1"
            />
            {/* Label - rotated for vertical */}
            {tick.label !== undefined && (
              <text
                x={2}
                y={tick.pos + 8}
                fill="var(--pix-text-muted)"
                fontSize="8"
                fontFamily="monospace"
                transform={`rotate(-90, 2, ${tick.pos})`}
              >
                {tick.label}
              </text>
            )}
          </g>
        ))}
        {/* Cursor indicator */}
        {cursorPos !== null && cursorPos >= 0 && cursorPos <= containerSize && (
          <line
            x1={0}
            y1={cursorPos}
            x2={RULER_SIZE}
            y2={cursorPos}
            stroke="var(--pix-accent)"
            strokeWidth="1"
          />
        )}
      </svg>
    </div>
  )
}

export function CanvasRulers() {
  const { width, height, zoom, panX, panY, showRulers } = useEditorStore()
  const { cursorPosition, cursorInCanvas } = useUIStore()
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })

  // Track container size for proper ruler calculations
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current?.parentElement) {
        const parent = containerRef.current.parentElement
        setContainerSize({
          width: parent.clientWidth - RULER_SIZE,
          height: parent.clientHeight - RULER_SIZE,
        })
      }
    }

    updateSize()

    const resizeObserver = new ResizeObserver(updateSize)
    if (containerRef.current?.parentElement) {
      resizeObserver.observe(containerRef.current.parentElement)
    }

    return () => resizeObserver.disconnect()
  }, [])

  if (!showRulers) return null

  // Get cursor pixel position for ruler indicators
  const cursorX = cursorInCanvas && cursorPosition ? cursorPosition.x : null
  const cursorY = cursorInCanvas && cursorPosition ? cursorPosition.y : null

  return (
    <div ref={containerRef}>
      {/* Corner box */}
      <div
        className="absolute top-0 left-0 z-10"
        style={{
          width: RULER_SIZE,
          height: RULER_SIZE,
          backgroundColor: 'var(--pix-bg-secondary)',
          borderRight: '1px solid var(--pix-border)',
          borderBottom: '1px solid var(--pix-border)'
        }}
      />

      {/* Horizontal ruler */}
      <div
        className="absolute top-0 z-10"
        style={{ left: RULER_SIZE, right: 0, height: RULER_SIZE }}
      >
        <Ruler
          orientation="horizontal"
          canvasSize={width}
          zoom={zoom}
          offset={panX}
          containerSize={containerSize.width}
          cursorPixel={cursorX}
        />
      </div>

      {/* Vertical ruler */}
      <div
        className="absolute left-0 z-10"
        style={{ top: RULER_SIZE, bottom: 0, width: RULER_SIZE }}
      >
        <Ruler
          orientation="vertical"
          canvasSize={height}
          zoom={zoom}
          offset={panY}
          containerSize={containerSize.height}
          cursorPixel={cursorY}
        />
      </div>
    </div>
  )
}

export const RULER_SIZE_PX = RULER_SIZE
