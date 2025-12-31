/**
 * Canvas Component - Main drawing area
 * Based on Pixelorama's Canvas structure
 */

import { useRef, useEffect, useState, useCallback } from "react"
import { useEditorStore } from "@/store/editor-store"
import { getHistory, captureCanvasState } from "@/core/history"
import { ToolRegistry } from "@/tools/registry"
import { bresenhamLine, floodFill, hexToRgb } from "@/lib/drawing"

// Import and register tools
import "@/tools/design/Pencil"
import "@/tools/design/Eraser"
import "@/tools/design/Bucket"
import "@/tools/design/LineTool"
import "@/tools/design/RectangleTool"
import "@/tools/design/EllipseTool"
import "@/tools/utility/Pan"
import "@/tools/utility/Zoom"
import "@/tools/utility/ColorPicker"
import "@/tools/utility/Move"

interface Point {
  x: number
  y: number
}

export function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const previewCanvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [lastPoint, setLastPoint] = useState<Point | null>(null)
  const [shapeStart, setShapeStart] = useState<Point | null>(null)
  const [preDrawImageData, setPreDrawImageData] = useState<ImageData | null>(null)

  const {
    width,
    height,
    zoom,
    panX,
    panY,
    pan,
    setZoom,
    zoomIn,
    zoomOut,
    currentTool,
    brushSize,
    primaryColor,
    secondaryColor,
    showGrid,
    layers,
    currentLayerIndex,
    setPrimaryColor,
    setSecondaryColor,
    history,
  } = useEditorStore()

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set up for pixel art
    ctx.imageSmoothingEnabled = false

    // Clear canvas (transparent background)
    ctx.clearRect(0, 0, width, height)
  }, [width, height])

  // Get canvas position from mouse event
  const getCanvasPoint = useCallback((e: React.MouseEvent | React.PointerEvent): Point => {
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

  // Draw single pixel or brush
  const drawPixel = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number, color: string, size: number = brushSize) => {
    const layer = layers[currentLayerIndex]
    if (!layer.visible || layer.locked) return

    ctx.fillStyle = color

    if (size === 1) {
      if (x >= 0 && x < width && y >= 0 && y < height) {
        ctx.fillRect(x, y, 1, 1)
      }
    } else {
      const halfSize = Math.floor(size / 2)
      for (let dx = 0; dx < size; dx++) {
        for (let dy = 0; dy < size; dy++) {
          const px = x - halfSize + dx
          const py = y - halfSize + dy
          if (px >= 0 && px < width && py >= 0 && py < height) {
            ctx.fillRect(px, py, 1, 1)
          }
        }
      }
    }
  }, [brushSize, width, height, layers, currentLayerIndex])

  // Draw line using Bresenham
  const drawLine = useCallback((ctx: CanvasRenderingContext2D, from: Point, to: Point, color: string, size: number = brushSize) => {
    const points = bresenhamLine(from.x, from.y, to.x, to.y)
    points.forEach(p => drawPixel(ctx, p.x, p.y, color, size))
  }, [drawPixel, brushSize])

  // Flood fill
  const doFloodFill = useCallback((x: number, y: number, fillColor: string) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const rgb = hexToRgb(fillColor)
    if (!rgb) return

    floodFill(ctx, x, y, { r: rgb.r, g: rgb.g, b: rgb.b, a: 255 })
  }, [])

  // Pick color from canvas
  const pickColor = useCallback((x: number, y: number, isPrimary: boolean) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    if (x < 0 || x >= width || y < 0 || y >= height) return

    const pixel = ctx.getImageData(x, y, 1, 1).data
    if (pixel[3] === 0) return // Skip transparent pixels

    const hex = `#${pixel[0].toString(16).padStart(2, "0")}${pixel[1].toString(16).padStart(2, "0")}${pixel[2].toString(16).padStart(2, "0")}`

    if (isPrimary) {
      setPrimaryColor(hex)
    } else {
      setSecondaryColor(hex)
    }
  }, [width, height, setPrimaryColor, setSecondaryColor])

  // Draw shape preview on the preview canvas
  const drawShapePreview = useCallback((start: Point, end: Point, tool: string, color: string) => {
    const canvas = canvasRef.current
    const preview = previewCanvasRef.current
    if (!canvas || !preview) return

    const ctx = canvas.getContext("2d")
    const previewCtx = preview.getContext("2d")
    if (!ctx || !previewCtx) return

    // Clear preview
    previewCtx.clearRect(0, 0, width, height)

    // Restore original image
    if (preDrawImageData) {
      ctx.putImageData(preDrawImageData, 0, 0)
    }

    // Draw shape preview on main canvas (temporary)
    ctx.fillStyle = color
    ctx.strokeStyle = color

    const minX = Math.min(start.x, end.x)
    const minY = Math.min(start.y, end.y)
    const w = Math.abs(end.x - start.x)
    const h = Math.abs(end.y - start.y)

    switch (tool) {
      case 'line':
        drawLine(ctx, start, end, color, brushSize)
        break
      case 'rectangle':
        // Draw rectangle outline
        for (let x = minX; x <= minX + w; x++) {
          drawPixel(ctx, x, minY, color, 1)
          drawPixel(ctx, x, minY + h, color, 1)
        }
        for (let y = minY; y <= minY + h; y++) {
          drawPixel(ctx, minX, y, color, 1)
          drawPixel(ctx, minX + w, y, color, 1)
        }
        break
      case 'ellipse':
        // Draw ellipse using midpoint algorithm
        const cx = (start.x + end.x) / 2
        const cy = (start.y + end.y) / 2
        const rx = w / 2
        const ry = h / 2
        drawEllipse(ctx, cx, cy, rx, ry, color)
        break
    }
  }, [width, height, brushSize, preDrawImageData, drawLine, drawPixel])

  // Draw ellipse using midpoint algorithm
  const drawEllipse = useCallback((ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, color: string) => {
    if (rx <= 0 || ry <= 0) return

    ctx.fillStyle = color
    const setPixel = (x: number, y: number) => {
      if (x >= 0 && x < width && y >= 0 && y < height) {
        ctx.fillRect(Math.floor(x), Math.floor(y), 1, 1)
      }
    }

    // Simple ellipse drawing
    for (let angle = 0; angle < Math.PI * 2; angle += 0.01) {
      const x = cx + rx * Math.cos(angle)
      const y = cy + ry * Math.sin(angle)
      setPixel(x, y)
    }
  }, [width, height])

  // Handle pointer down
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const point = getCanvasPoint(e)
    const isPrimary = e.button !== 2
    const color = isPrimary ? primaryColor : secondaryColor

    // Capture state before drawing for undo
    const beforeState = captureCanvasState(canvas)
    setPreDrawImageData(beforeState)

    setIsDrawing(true)
    setLastPoint(point)

    switch (currentTool) {
      case "pencil":
        drawPixel(ctx, point.x, point.y, color)
        break
      case "eraser":
        ctx.clearRect(point.x - Math.floor(brushSize / 2), point.y - Math.floor(brushSize / 2), brushSize, brushSize)
        break
      case "bucket":
        doFloodFill(point.x, point.y, color)
        // Add to history immediately for bucket
        if (beforeState) {
          const afterState = captureCanvasState(canvas)
          if (afterState) {
            history.addImageAction("Fill", canvas, beforeState, afterState)
          }
        }
        break
      case "colorPicker":
        pickColor(point.x, point.y, isPrimary)
        break
      case "line":
      case "rectangle":
      case "ellipse":
        setShapeStart(point)
        break
      case "pan":
        // Pan handled in pointer move
        break
      case "zoom":
        if (isPrimary) {
          zoomIn()
        } else {
          zoomOut()
        }
        break
      case "move":
        // Move tool - to be implemented with selection
        break
    }

    // Capture pointer for better tracking
    canvas.setPointerCapture(e.pointerId)
  }, [getCanvasPoint, currentTool, primaryColor, secondaryColor, brushSize, drawPixel, doFloodFill, pickColor, history, zoomIn, zoomOut])

  // Handle pointer move
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDrawing) return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const point = getCanvasPoint(e)
    const isPrimary = (e.buttons & 1) !== 0
    const color = isPrimary ? primaryColor : secondaryColor

    switch (currentTool) {
      case "pencil":
        if (lastPoint) {
          drawLine(ctx, lastPoint, point, color)
        }
        break
      case "eraser":
        if (lastPoint) {
          const points = bresenhamLine(lastPoint.x, lastPoint.y, point.x, point.y)
          points.forEach(p => {
            ctx.clearRect(p.x - Math.floor(brushSize / 2), p.y - Math.floor(brushSize / 2), brushSize, brushSize)
          })
        }
        break
      case "line":
      case "rectangle":
      case "ellipse":
        if (shapeStart) {
          drawShapePreview(shapeStart, point, currentTool, color)
        }
        break
      case "pan":
        pan(e.movementX, e.movementY)
        break
      case "colorPicker":
        pickColor(point.x, point.y, isPrimary)
        break
    }

    setLastPoint(point)
  }, [isDrawing, getCanvasPoint, currentTool, primaryColor, secondaryColor, brushSize, lastPoint, shapeStart, drawLine, drawShapePreview, pan, pickColor])

  // Handle pointer up
  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!isDrawing) return

    const canvas = canvasRef.current
    if (!canvas) return

    // Add action to history for drawing tools
    if (preDrawImageData && ['pencil', 'eraser', 'line', 'rectangle', 'ellipse'].includes(currentTool)) {
      const afterState = captureCanvasState(canvas)
      if (afterState) {
        const toolName = currentTool.charAt(0).toUpperCase() + currentTool.slice(1)
        history.addImageAction(toolName, canvas, preDrawImageData, afterState)
      }
    }

    setIsDrawing(false)
    setLastPoint(null)
    setShapeStart(null)
    setPreDrawImageData(null)

    // Release pointer capture
    canvas.releasePointerCapture(e.pointerId)
  }, [isDrawing, currentTool, preDrawImageData, history])

  // Zoom with wheel
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()

    if (e.ctrlKey || e.metaKey) {
      // Zoom
      if (e.deltaY < 0) {
        zoomIn()
      } else {
        zoomOut()
      }
    } else {
      // Pan
      pan(-e.deltaX, -e.deltaY)
    }
  }, [zoomIn, zoomOut, pan])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Z for undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        history.undo()
      }
      // Ctrl+Shift+Z or Ctrl+Y for redo
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault()
        history.redo()
      }
      // Space for temporary pan
      if (e.key === ' ' && !e.repeat) {
        e.preventDefault()
        // Could switch to pan tool temporarily
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [history])

  // Prevent context menu
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
  }, [])

  // Get cursor based on tool
  const getCursor = () => {
    switch (currentTool) {
      case 'pan': return isDrawing ? 'grabbing' : 'grab'
      case 'zoom': return 'zoom-in'
      case 'colorPicker': return 'crosshair'
      case 'move': return 'move'
      default: return 'crosshair'
    }
  }

  const canvasWidth = width * zoom
  const canvasHeight = height * zoom

  return (
    <div
      ref={containerRef}
      className="canvas-container flex items-center justify-center"
      onWheel={handleWheel}
    >
      <div
        className="canvas-viewport"
        style={{
          transform: `translate(${panX}px, ${panY}px)`,
        }}
      >
        <div className="relative" style={{ width: canvasWidth, height: canvasHeight }}>
          {/* Main canvas */}
          <canvas
            ref={canvasRef}
            width={width}
            height={height}
            className="pixel-canvas shadow-2xl checker-bg"
            style={{
              width: canvasWidth,
              height: canvasHeight,
              cursor: getCursor(),
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            onContextMenu={handleContextMenu}
          />

          {/* Preview canvas for shape tools */}
          <canvas
            ref={previewCanvasRef}
            width={width}
            height={height}
            className="absolute inset-0 pointer-events-none pixel-canvas"
            style={{
              width: canvasWidth,
              height: canvasHeight,
            }}
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
    </div>
  )
}
