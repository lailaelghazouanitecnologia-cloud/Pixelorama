/**
 * TilePreview Component - Renders tiled copies around the main canvas
 * Used for previewing seamless tile patterns
 */

import { useRef, useEffect } from "react"

interface TilePreviewProps {
  sourceCanvas: HTMLCanvasElement | null
  width: number
  height: number
  canvasWidth: number
  canvasHeight: number
  offsetX: number
  offsetY: number
}

function TileCanvas({ sourceCanvas, width, height, canvasWidth, canvasHeight, offsetX, offsetY }: TilePreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !sourceCanvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.imageSmoothingEnabled = false
    ctx.clearRect(0, 0, width, height)
    ctx.drawImage(sourceCanvas, 0, 0)
  }, [sourceCanvas, width, height])

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="absolute pointer-events-none pixel-canvas"
      style={{
        width: canvasWidth,
        height: canvasHeight,
        left: offsetX,
        top: offsetY,
        opacity: 0.4,
      }}
    />
  )
}

interface TilePreviewGridProps {
  sourceCanvas: HTMLCanvasElement | null
  width: number
  height: number
  canvasWidth: number
  canvasHeight: number
  layers: unknown[]
  currentLayerIndex: number
}

export function TilePreviewGrid({
  sourceCanvas,
  width,
  height,
  canvasWidth,
  canvasHeight,
  layers,
  currentLayerIndex,
}: TilePreviewGridProps) {
  // Define the 8 positions around the center (excluding center which is the main canvas)
  const positions = [
    { x: -canvasWidth, y: -canvasHeight }, // top-left
    { x: 0, y: -canvasHeight },            // top
    { x: canvasWidth, y: -canvasHeight },  // top-right
    { x: -canvasWidth, y: 0 },             // left
    { x: canvasWidth, y: 0 },              // right
    { x: -canvasWidth, y: canvasHeight },  // bottom-left
    { x: 0, y: canvasHeight },             // bottom
    { x: canvasWidth, y: canvasHeight },   // bottom-right
  ]

  return (
    <>
      {positions.map((pos, index) => (
        <TileCanvas
          key={index}
          sourceCanvas={sourceCanvas}
          width={width}
          height={height}
          canvasWidth={canvasWidth}
          canvasHeight={canvasHeight}
          offsetX={pos.x}
          offsetY={pos.y}
        />
      ))}
    </>
  )
}
