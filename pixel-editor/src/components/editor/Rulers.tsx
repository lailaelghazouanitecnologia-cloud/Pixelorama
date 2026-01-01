/**
 * Rulers Component - Horizontal and vertical rulers for canvas
 * Based on Pixelorama's ruler system
 */

import { useEditorStore } from "@/store/editor-store"

interface RulerProps {
  orientation: 'horizontal' | 'vertical'
  size: number // canvas size in pixels
  zoom: number
  offset: number // pan offset
}

const RULER_SIZE = 16 // height/width of ruler in pixels

function Ruler({ orientation, size, zoom, offset }: RulerProps) {
  const isHorizontal = orientation === 'horizontal'
  const pixelSize = zoom

  // Calculate visible range
  const totalSize = size * zoom

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

  // Generate tick marks
  const ticks: { pos: number; label?: number }[] = []
  for (let i = 0; i <= size; i += tickInterval) {
    const pos = i * pixelSize + offset
    ticks.push({
      pos,
      label: i % majorTickInterval === 0 ? i : undefined
    })
  }

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
        <svg width="100%" height={RULER_SIZE}>
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
      <svg width={RULER_SIZE} height="100%">
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
            {/* Label */}
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
      </svg>
    </div>
  )
}

export function CanvasRulers() {
  const { width, height, zoom, panX, panY, showRulers } = useEditorStore()

  if (!showRulers) return null

  return (
    <>
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
        <Ruler orientation="horizontal" size={width} zoom={zoom} offset={panX} />
      </div>

      {/* Vertical ruler */}
      <div
        className="absolute left-0 z-10"
        style={{ top: RULER_SIZE, bottom: 0, width: RULER_SIZE }}
      >
        <Ruler orientation="vertical" size={height} zoom={zoom} offset={panY} />
      </div>
    </>
  )
}

export const RULER_SIZE_PX = RULER_SIZE
