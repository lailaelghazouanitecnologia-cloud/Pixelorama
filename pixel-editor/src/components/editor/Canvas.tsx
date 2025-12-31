import { useRef, useEffect, useState, useCallback } from "react"
import { useEditorStore } from "@/store/editor-store"

interface Point {
  x: number
  y: number
}

export function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [lastPoint, setLastPoint] = useState<Point | null>(null)

  const {
    width,
    height,
    zoom,
    setZoom,
    currentTool,
    brushSize,
    primaryColor,
    secondaryColor,
    showGrid,
    layers,
    currentLayerIndex,
    setPrimaryColor,
  } = useEditorStore()

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Clear and set background
    ctx.fillStyle = "#1a1a1a"
    ctx.fillRect(0, 0, width, height)
  }, [width, height])

  // Get canvas position from mouse event
  const getCanvasPoint = useCallback((e: React.MouseEvent): Point => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    const scaleX = width / rect.width
    const scaleY = height / rect.height

    return {
      x: Math.floor((e.clientX - rect.left) * scaleX),
      y: Math.floor((e.clientY - rect.top) * scaleY),
    }
  }, [width, height])

  // Draw pixel
  const drawPixel = useCallback((x: number, y: number, color: string) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const layer = layers[currentLayerIndex]
    if (!layer.visible || layer.locked) return

    ctx.fillStyle = color

    const halfSize = Math.floor(brushSize / 2)
    for (let dx = 0; dx < brushSize; dx++) {
      for (let dy = 0; dy < brushSize; dy++) {
        const px = x - halfSize + dx
        const py = y - halfSize + dy
        if (px >= 0 && px < width && py >= 0 && py < height) {
          ctx.fillRect(px, py, 1, 1)
        }
      }
    }
  }, [brushSize, width, height, layers, currentLayerIndex])

  // Bresenham's line algorithm
  const drawLine = useCallback((from: Point, to: Point, color: string) => {
    const dx = Math.abs(to.x - from.x)
    const dy = Math.abs(to.y - from.y)
    const sx = from.x < to.x ? 1 : -1
    const sy = from.y < to.y ? 1 : -1
    let err = dx - dy

    let x = from.x
    let y = from.y

    while (true) {
      drawPixel(x, y, color)

      if (x === to.x && y === to.y) break

      const e2 = 2 * err
      if (e2 > -dy) {
        err -= dy
        x += sx
      }
      if (e2 < dx) {
        err += dx
        y += sy
      }
    }
  }, [drawPixel])

  // Flood fill
  const floodFill = useCallback((startX: number, startY: number, fillColor: string) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const imageData = ctx.getImageData(0, 0, width, height)
    const data = imageData.data

    const getPixelIndex = (x: number, y: number) => (y * width + x) * 4

    const getPixelColor = (x: number, y: number) => {
      const i = getPixelIndex(x, y)
      return [data[i], data[i + 1], data[i + 2], data[i + 3]]
    }

    const setPixelColor = (x: number, y: number, color: number[]) => {
      const i = getPixelIndex(x, y)
      data[i] = color[0]
      data[i + 1] = color[1]
      data[i + 2] = color[2]
      data[i + 3] = 255
    }

    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
      return result
        ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16), 255]
        : [0, 0, 0, 255]
    }

    const colorsMatch = (a: number[], b: number[]) =>
      a[0] === b[0] && a[1] === b[1] && a[2] === b[2]

    const targetColor = getPixelColor(startX, startY)
    const fillRgb = hexToRgb(fillColor)

    if (colorsMatch(targetColor, fillRgb)) return

    const stack: Point[] = [{ x: startX, y: startY }]
    const visited = new Set<string>()

    while (stack.length > 0) {
      const { x, y } = stack.pop()!
      const key = `${x},${y}`

      if (visited.has(key)) continue
      if (x < 0 || x >= width || y < 0 || y >= height) continue

      const currentColor = getPixelColor(x, y)
      if (!colorsMatch(currentColor, targetColor)) continue

      visited.add(key)
      setPixelColor(x, y, fillRgb)

      stack.push({ x: x + 1, y })
      stack.push({ x: x - 1, y })
      stack.push({ x, y: y + 1 })
      stack.push({ x, y: y - 1 })
    }

    ctx.putImageData(imageData, 0, 0)
  }, [width, height])

  // Pick color
  const pickColor = useCallback((x: number, y: number) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const pixel = ctx.getImageData(x, y, 1, 1).data
    const hex = `#${pixel[0].toString(16).padStart(2, "0")}${pixel[1].toString(16).padStart(2, "0")}${pixel[2].toString(16).padStart(2, "0")}`
    setPrimaryColor(hex)
  }, [setPrimaryColor])

  // Mouse handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const point = getCanvasPoint(e)
    const color = e.button === 2 ? secondaryColor : primaryColor

    setIsDrawing(true)
    setLastPoint(point)

    switch (currentTool) {
      case "pencil":
        drawPixel(point.x, point.y, color)
        break
      case "eraser":
        drawPixel(point.x, point.y, "#00000000")
        break
      case "bucket":
        floodFill(point.x, point.y, color)
        break
      case "picker":
        pickColor(point.x, point.y)
        break
    }
  }, [getCanvasPoint, currentTool, primaryColor, secondaryColor, drawPixel, floodFill, pickColor])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDrawing) return

    const point = getCanvasPoint(e)
    const color = e.buttons === 2 ? secondaryColor : primaryColor

    switch (currentTool) {
      case "pencil":
        if (lastPoint) {
          drawLine(lastPoint, point, color)
        }
        break
      case "eraser":
        if (lastPoint) {
          drawLine(lastPoint, point, "#1a1a1a")
        }
        break
    }

    setLastPoint(point)
  }, [isDrawing, getCanvasPoint, currentTool, primaryColor, secondaryColor, lastPoint, drawLine])

  const handleMouseUp = useCallback(() => {
    setIsDrawing(false)
    setLastPoint(null)
  }, [])

  // Zoom with wheel
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      const delta = e.deltaY > 0 ? -1 : 1
      setZoom(Math.max(1, Math.min(32, zoom + delta)))
    }
  }, [zoom, setZoom])

  // Prevent context menu
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
  }, [])

  const canvasWidth = width * zoom
  const canvasHeight = height * zoom

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-auto checker-bg flex items-center justify-center p-8"
      onWheel={handleWheel}
    >
      <div className="relative" style={{ width: canvasWidth, height: canvasHeight }}>
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="pixel-canvas shadow-2xl"
          style={{
            width: canvasWidth,
            height: canvasHeight,
            cursor: currentTool === "picker" ? "crosshair" : "crosshair",
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onContextMenu={handleContextMenu}
        />

        {/* Grid overlay */}
        {showGrid && zoom >= 4 && (
          <svg
            className="absolute inset-0 pointer-events-none"
            width={canvasWidth}
            height={canvasHeight}
          >
            <defs>
              <pattern
                id="grid"
                width={zoom}
                height={zoom}
                patternUnits="userSpaceOnUse"
              >
                <path
                  d={`M ${zoom} 0 L 0 0 0 ${zoom}`}
                  fill="none"
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="0.5"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        )}
      </div>
    </div>
  )
}
