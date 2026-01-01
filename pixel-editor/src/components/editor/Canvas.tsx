/**
 * Canvas Component - Main drawing area
 * Based on Pixelorama's Canvas structure
 * Now delegates drawing operations to ToolManager
 */

import { useRef, useEffect, useState, useCallback } from "react"
import { useEditorStore } from "@/store/editor-store"
import { useToolsStore } from "@/store/tools-store"
import { getHistory, captureCanvasState } from "@/core/history"
import { ToolManager } from "@/tools/ToolManager"
import { bresenhamLine } from "@/lib/drawing"
import { useSelection } from "@/hooks/useSelection"
import { SelectionOperation, type SelectionRect } from "@/core/selection"
import { useLayerCanvas } from "@/hooks/useLayerCanvas"
import { compositeFrameLayers } from "@/core/layerCanvas"
import { getOnionSkinManager, renderOnionSkin, type OnionSkinSettings } from "@/core/onionSkin"
import { CanvasRulers, RULER_SIZE_PX } from "./Rulers"
import type { DrawingContext } from "@/core/types"

// Import and register tools (side effects)
import "@/tools/design/Pencil"
import "@/tools/design/Eraser"
import "@/tools/design/Bucket"
import "@/tools/design/LineTool"
import "@/tools/design/RectangleTool"
import "@/tools/design/EllipseTool"
import "@/tools/design/Shading"
import "@/tools/design/Spray"
import "@/tools/utility/Pan"
import "@/tools/utility/Zoom"
import "@/tools/utility/ColorPicker"
import "@/tools/utility/Move"
import "@/tools/selection/RectSelect"
import "@/tools/selection/EllipseSelect"
import "@/tools/selection/MagicWand"

interface Point {
  x: number
  y: number
}

export function Canvas() {
  const displayCanvasRef = useRef<HTMLCanvasElement>(null)
  const previewCanvasRef = useRef<HTMLCanvasElement>(null)
  const selectionCanvasRef = useRef<HTMLCanvasElement>(null)
  const onionSkinCanvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [shapeStart, setShapeStart] = useState<Point | null>(null)
  const [preDrawImageData, setPreDrawImageData] = useState<ImageData | null>(null)
  const [selectionPreview, setSelectionPreview] = useState<SelectionRect | null>(null)
  const [onionSkinSettings, setOnionSkinSettings] = useState<OnionSkinSettings>(getOnionSkinManager().getSettings())

  // Layer canvas system
  const { getCurrentLayerCtx, getCurrentLayer, composite, saveCurrentLayerData } = useLayerCanvas()

  // Subscribe to onion skin settings changes
  useEffect(() => {
    const manager = getOnionSkinManager()
    const unsubscribe = manager.subscribe(setOnionSkinSettings)
    return unsubscribe
  }, [])

  // Canvas/view state from editor-store
  const {
    width,
    height,
    zoom,
    panX,
    panY,
    pan,
    zoomIn,
    zoomOut,
    primaryColor,
    secondaryColor,
    showGrid,
    showRulers,
    layers,
    currentLayerIndex,
    frames,
    currentFrameIndex,
    isPlaying,
    fps,
    nextFrame,
    history,
  } = useEditorStore()

  // Tool state from tools-store
  const { currentTool, brushSize, filled } = useToolsStore()

  // Selection management
  const {
    selectRect,
    selectEllipse,
    selectMask,
    clearSelection,
  } = useSelection({
    canvas: displayCanvasRef.current,
    overlayCanvas: selectionCanvasRef.current,
  })

  // Helper: Flood fill selection mask (for magic wand)
  const floodSelectMask = useCallback((
    imageData: ImageData,
    startX: number,
    startY: number,
    tolerance: number = 0
  ): Uint8Array => {
    const data = imageData.data
    const w = imageData.width
    const h = imageData.height
    const mask = new Uint8Array(w * h)

    if (startX < 0 || startX >= w || startY < 0 || startY >= h) {
      return mask
    }

    const targetIndex = (startY * w + startX) * 4
    const targetR = data[targetIndex]
    const targetG = data[targetIndex + 1]
    const targetB = data[targetIndex + 2]
    const targetA = data[targetIndex + 3]

    const stack: Point[] = [{ x: startX, y: startY }]
    const visited = new Set<number>()

    const colorsMatch = (index: number): boolean => {
      const pixelIndex = index * 4
      const dr = Math.abs(data[pixelIndex] - targetR)
      const dg = Math.abs(data[pixelIndex + 1] - targetG)
      const db = Math.abs(data[pixelIndex + 2] - targetB)
      const da = Math.abs(data[pixelIndex + 3] - targetA)
      const distance = Math.sqrt(dr * dr + dg * dg + db * db)
      return distance <= tolerance * 1.732 && da <= tolerance
    }

    while (stack.length > 0) {
      const pos = stack.pop()!
      const index = pos.y * w + pos.x

      if (visited.has(index)) continue
      if (pos.x < 0 || pos.x >= w || pos.y < 0 || pos.y >= h) continue
      if (!colorsMatch(index)) continue

      visited.add(index)
      mask[index] = 255

      stack.push({ x: pos.x + 1, y: pos.y })
      stack.push({ x: pos.x - 1, y: pos.y })
      stack.push({ x: pos.x, y: pos.y + 1 })
      stack.push({ x: pos.x, y: pos.y - 1 })
    }

    return mask
  }, [])

  // Update display canvas with composited layers
  const updateDisplay = useCallback(() => {
    const displayCanvas = displayCanvasRef.current
    if (!displayCanvas) return

    const displayCtx = displayCanvas.getContext("2d")
    if (!displayCtx) return

    const composited = composite()
    if (composited) {
      displayCtx.clearRect(0, 0, width, height)
      displayCtx.drawImage(composited, 0, 0)
    }
  }, [composite, width, height])

  // Initialize ToolManager callbacks
  useEffect(() => {
    ToolManager.setCallbacks({
      onUpdateDisplay: updateDisplay,
      onSaveLayerData: saveCurrentLayerData,
      onAddToHistory: (name, before, after) => {
        const currentLayerCanvas = getCurrentLayer()
        if (currentLayerCanvas) {
          history.addImageAction(name, currentLayerCanvas.canvas, before, after)
        }
      },
    })
  }, [updateDisplay, saveCurrentLayerData, getCurrentLayer, history])

  // Initialize display canvas and composite layers
  useEffect(() => {
    const displayCanvas = displayCanvasRef.current
    if (!displayCanvas) return

    const ctx = displayCanvas.getContext("2d")
    if (!ctx) return

    ctx.imageSmoothingEnabled = false

    const composited = composite()
    if (composited) {
      ctx.clearRect(0, 0, width, height)
      ctx.drawImage(composited, 0, 0)
    }
  }, [width, height, layers, currentLayerIndex, composite])

  // Render onion skin effect
  useEffect(() => {
    const onionCanvas = onionSkinCanvasRef.current
    if (!onionCanvas) return

    const ctx = onionCanvas.getContext("2d")
    if (!ctx) return

    ctx.imageSmoothingEnabled = false
    ctx.clearRect(0, 0, width, height)

    if (!onionSkinSettings.enabled || frames.length === 0) return

    const frameImageData: (ImageData | null)[] = frames.map(frame =>
      compositeFrameLayers(width, height, frame.layers)
    )

    renderOnionSkin(ctx, currentFrameIndex, frameImageData, onionSkinSettings)
  }, [width, height, frames, currentFrameIndex, onionSkinSettings])

  // Animation playback loop
  useEffect(() => {
    if (!isPlaying || frames.length <= 1) return

    // Calculate interval based on FPS (default to 12 if not set)
    const effectiveFps = fps || 12
    const intervalMs = 1000 / effectiveFps

    const intervalId = setInterval(() => {
      nextFrame()
    }, intervalMs)

    return () => clearInterval(intervalId)
  }, [isPlaying, fps, frames.length, nextFrame])

  // Get canvas position from mouse event
  const getCanvasPoint = useCallback((e: React.MouseEvent | React.PointerEvent): Point => {
    const canvas = displayCanvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    const scaleX = width / rect.width
    const scaleY = height / rect.height

    return {
      x: Math.floor((e.clientX - rect.left) * scaleX),
      y: Math.floor((e.clientY - rect.top) * scaleY),
    }
  }, [width, height])

  // Check if tool is handled by ToolManager
  const isToolManagedTool = (tool: string): boolean => {
    return ['pencil', 'eraser', 'bucket', 'shading', 'spray', 'colorPicker', 'move'].includes(tool)
  }

  // Get DrawingContext for ToolManager
  const getDrawingContext = useCallback((): DrawingContext | null => {
    const layerCanvas = getCurrentLayer()
    const layerCtx = getCurrentLayerCtx()
    if (!layerCanvas || !layerCtx) return null

    return {
      ctx: layerCtx,
      canvas: layerCanvas.canvas,
      color: primaryColor,
      width,
      height,
    }
  }, [getCurrentLayer, getCurrentLayerCtx, primaryColor, width, height])

  // Draw shape preview (for line, rectangle, ellipse tools)
  const drawShapePreview = useCallback((start: Point, end: Point, tool: string, color: string) => {
    const layerCtx = getCurrentLayerCtx()
    if (!layerCtx) return

    // Restore original image
    if (preDrawImageData) {
      layerCtx.putImageData(preDrawImageData, 0, 0)
    }

    layerCtx.fillStyle = color
    layerCtx.strokeStyle = color

    const minX = Math.min(start.x, end.x)
    const minY = Math.min(start.y, end.y)
    const w = Math.abs(end.x - start.x)
    const h = Math.abs(end.y - start.y)

    switch (tool) {
      case 'line':
        const points = bresenhamLine(start.x, start.y, end.x, end.y)
        points.forEach(p => {
          if (p.x >= 0 && p.x < width && p.y >= 0 && p.y < height) {
            layerCtx.fillRect(p.x, p.y, 1, 1)
          }
        })
        break

      case 'rectangle':
        if (filled) {
          layerCtx.fillRect(minX, minY, w + 1, h + 1)
        } else {
          for (let x = minX; x <= minX + w; x++) {
            layerCtx.fillRect(x, minY, 1, 1)
            layerCtx.fillRect(x, minY + h, 1, 1)
          }
          for (let y = minY; y <= minY + h; y++) {
            layerCtx.fillRect(minX, y, 1, 1)
            layerCtx.fillRect(minX + w, y, 1, 1)
          }
        }
        break

      case 'ellipse':
        const cx = (start.x + end.x) / 2
        const cy = (start.y + end.y) / 2
        const rx = w / 2
        const ry = h / 2

        if (rx <= 0 || ry <= 0) break

        if (filled) {
          const floorCx = Math.floor(cx)
          const floorCy = Math.floor(cy)
          const floorRx = Math.floor(rx)
          const floorRy = Math.floor(ry)
          for (let dy = -floorRy; dy <= floorRy; dy++) {
            for (let dx = -floorRx; dx <= floorRx; dx++) {
              const nx = dx / (floorRx || 1)
              const ny = dy / (floorRy || 1)
              if (nx * nx + ny * ny <= 1) {
                const px = floorCx + dx
                const py = floorCy + dy
                if (px >= 0 && px < width && py >= 0 && py < height) {
                  layerCtx.fillRect(px, py, 1, 1)
                }
              }
            }
          }
        } else {
          for (let angle = 0; angle < Math.PI * 2; angle += 0.01) {
            const x = Math.floor(cx + rx * Math.cos(angle))
            const y = Math.floor(cy + ry * Math.sin(angle))
            if (x >= 0 && x < width && y >= 0 && y < height) {
              layerCtx.fillRect(x, y, 1, 1)
            }
          }
        }
        break
    }

    updateDisplay()
  }, [width, height, filled, preDrawImageData, getCurrentLayerCtx, updateDisplay])

  // Handle pointer down
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    const displayCanvas = displayCanvasRef.current
    if (!displayCanvas) return

    const currentLayerCanvas = getCurrentLayer()
    const point = getCanvasPoint(e)
    const isPrimary = e.button !== 2
    const button: 'left' | 'right' = isPrimary ? 'left' : 'right'
    const color = isPrimary ? primaryColor : secondaryColor

    // Capture state before drawing
    const beforeState = currentLayerCanvas?.ctx
      ? captureCanvasState(currentLayerCanvas.canvas)
      : null
    setPreDrawImageData(beforeState)
    setIsDrawing(true)

    // Handle tool-managed tools via ToolManager
    if (isToolManagedTool(currentTool)) {
      const ctx = getDrawingContext()
      if (ctx) {
        ctx.color = color
        ToolManager.handlePointerDown(point, button, ctx)
      }
      displayCanvas.setPointerCapture(e.pointerId)
      return
    }

    // Handle other tools directly
    switch (currentTool) {
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

      case "rectSelect":
      case "ellipseSelect":
        setShapeStart(point)
        if (!e.shiftKey && !e.altKey && !e.ctrlKey) {
          clearSelection()
        }
        break

      case "magicWand":
        const compositedCanvas = composite()
        if (compositedCanvas) {
          const compositedCtx = compositedCanvas.getContext("2d")
          if (compositedCtx) {
            const imageData = compositedCtx.getImageData(0, 0, width, height)
            const mask = floodSelectMask(imageData, point.x, point.y, 0)
            const operation = e.shiftKey ? SelectionOperation.ADD
              : e.altKey ? SelectionOperation.SUBTRACT
              : e.ctrlKey && e.shiftKey ? SelectionOperation.INTERSECT
              : SelectionOperation.REPLACE
            selectMask(mask, operation)
          }
        }
        break
    }

    displayCanvas.setPointerCapture(e.pointerId)
  }, [getCanvasPoint, currentTool, primaryColor, secondaryColor, zoomIn, zoomOut, clearSelection, selectMask, width, height, getCurrentLayer, getDrawingContext, composite, floodSelectMask])

  // Handle pointer move
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDrawing) return

    const point = getCanvasPoint(e)
    const isPrimary = (e.buttons & 1) !== 0
    const button: 'left' | 'right' = isPrimary ? 'left' : 'right'
    const color = isPrimary ? primaryColor : secondaryColor

    // Handle tool-managed tools via ToolManager
    if (isToolManagedTool(currentTool)) {
      const ctx = getDrawingContext()
      if (ctx) {
        ctx.color = color
        ToolManager.handlePointerMove(point, button, ctx)
      }
      return
    }

    // Handle other tools directly
    switch (currentTool) {
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

      case "rectSelect":
      case "ellipseSelect":
        if (shapeStart) {
          const rect: SelectionRect = {
            x: Math.min(shapeStart.x, point.x),
            y: Math.min(shapeStart.y, point.y),
            width: Math.abs(point.x - shapeStart.x),
            height: Math.abs(point.y - shapeStart.y),
          }
          setSelectionPreview(rect)
        }
        break
    }
  }, [isDrawing, getCanvasPoint, currentTool, primaryColor, secondaryColor, shapeStart, drawShapePreview, pan, getDrawingContext])

  // Handle pointer up
  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!isDrawing) return

    const displayCanvas = displayCanvasRef.current
    if (!displayCanvas) return

    const currentLayerCanvas = getCurrentLayer()
    const point = getCanvasPoint(e)
    const isPrimary = (e.buttons & 1) === 0 ? e.button !== 2 : (e.buttons & 1) !== 0
    const button: 'left' | 'right' = isPrimary ? 'left' : 'right'
    const color = isPrimary ? primaryColor : secondaryColor

    // Handle tool-managed tools via ToolManager
    if (isToolManagedTool(currentTool)) {
      const ctx = getDrawingContext()
      if (ctx) {
        ctx.color = color
        ToolManager.handlePointerUp(point, button, ctx)
      }
    } else {
      // Handle shape tools
      if (['line', 'rectangle', 'ellipse'].includes(currentTool) && shapeStart) {
        // Finalize shape - already drawn in preview
        if (preDrawImageData && currentLayerCanvas) {
          const afterState = captureCanvasState(currentLayerCanvas.canvas)
          if (afterState) {
            const toolName = currentTool.charAt(0).toUpperCase() + currentTool.slice(1)
            history.addImageAction(toolName, currentLayerCanvas.canvas, preDrawImageData, afterState)
          }
        }
        saveCurrentLayerData()
      }

      // Handle selection tools
      if ((currentTool === 'rectSelect' || currentTool === 'ellipseSelect') && shapeStart) {
        const rect: SelectionRect = {
          x: Math.min(shapeStart.x, point.x),
          y: Math.min(shapeStart.y, point.y),
          width: Math.max(1, Math.abs(point.x - shapeStart.x)),
          height: Math.max(1, Math.abs(point.y - shapeStart.y)),
        }

        const operation = e.shiftKey ? SelectionOperation.ADD
          : e.altKey ? SelectionOperation.SUBTRACT
          : e.ctrlKey && e.shiftKey ? SelectionOperation.INTERSECT
          : SelectionOperation.REPLACE

        if (currentTool === 'ellipseSelect') {
          selectEllipse(rect, operation)
        } else {
          selectRect(rect, operation)
        }
        setSelectionPreview(null)
      }
    }

    setIsDrawing(false)
    setShapeStart(null)
    setPreDrawImageData(null)

    displayCanvas.releasePointerCapture(e.pointerId)
  }, [isDrawing, currentTool, preDrawImageData, history, getCanvasPoint, shapeStart, selectRect, selectEllipse, getCurrentLayer, saveCurrentLayerData, getDrawingContext, primaryColor, secondaryColor])

  // Zoom with wheel - use effect for non-passive listener (needed for Ctrl+wheel)
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleWheel = (e: WheelEvent) => {
      // Prevent browser zoom
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        if (e.deltaY < 0) {
          zoomIn()
        } else {
          zoomOut()
        }
      } else {
        // Pan with scroll
        e.preventDefault()
        pan(-e.deltaX, -e.deltaY)
      }
    }

    // Add with passive: false to allow preventDefault on Ctrl+wheel
    container.addEventListener('wheel', handleWheel, { passive: false })
    return () => container.removeEventListener('wheel', handleWheel)
  }, [zoomIn, zoomOut, pan])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        history.undo()
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault()
        history.redo()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [history])

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
  }, [])

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

  // Calculate ruler offset for canvas area
  const rulerOffset = showRulers ? RULER_SIZE_PX : 0

  return (
    <div
      ref={containerRef}
      className="canvas-container relative"
    >
      {/* Rulers */}
      <CanvasRulers />

      {/* Canvas area - offset by ruler size */}
      <div
        className="absolute flex items-center justify-center"
        style={{
          top: rulerOffset,
          left: rulerOffset,
          right: 0,
          bottom: 0,
        }}
      >
        <div
          className="canvas-viewport"
          style={{
            transform: `translate(${panX}px, ${panY}px)`,
          }}
        >
        <div className="relative" style={{ width: canvasWidth, height: canvasHeight }}>
          {/* Onion skin canvas */}
          <canvas
            ref={onionSkinCanvasRef}
            width={width}
            height={height}
            className="absolute inset-0 pointer-events-none pixel-canvas"
            style={{ width: canvasWidth, height: canvasHeight }}
          />

          {/* Display canvas */}
          <canvas
            ref={displayCanvasRef}
            width={width}
            height={height}
            className="pixel-canvas shadow-2xl checker-bg"
            style={{ width: canvasWidth, height: canvasHeight, cursor: getCursor() }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            onContextMenu={handleContextMenu}
          />

          {/* Preview canvas */}
          <canvas
            ref={previewCanvasRef}
            width={width}
            height={height}
            className="absolute inset-0 pointer-events-none pixel-canvas"
            style={{ width: canvasWidth, height: canvasHeight }}
          />

          {/* Selection overlay */}
          <canvas
            ref={selectionCanvasRef}
            width={width}
            height={height}
            className="absolute inset-0 pointer-events-none"
            style={{ width: canvasWidth, height: canvasHeight, imageRendering: 'pixelated' }}
          />

          {/* Selection preview - Rectangle */}
          {selectionPreview && currentTool === 'rectSelect' && (
            <div
              className="absolute pointer-events-none border border-dashed border-white"
              style={{
                left: selectionPreview.x * zoom,
                top: selectionPreview.y * zoom,
                width: selectionPreview.width * zoom,
                height: selectionPreview.height * zoom,
                boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.5)',
              }}
            />
          )}

          {/* Selection preview - Ellipse */}
          {selectionPreview && currentTool === 'ellipseSelect' && (
            <svg
              className="absolute inset-0 pointer-events-none"
              width={canvasWidth}
              height={canvasHeight}
              style={{ overflow: 'visible' }}
            >
              <ellipse
                cx={(selectionPreview.x + selectionPreview.width / 2) * zoom}
                cy={(selectionPreview.y + selectionPreview.height / 2) * zoom}
                rx={selectionPreview.width * zoom / 2}
                ry={selectionPreview.height * zoom / 2}
                fill="none"
                stroke="white"
                strokeWidth="1"
                strokeDasharray="4,4"
              />
              <ellipse
                cx={(selectionPreview.x + selectionPreview.width / 2) * zoom}
                cy={(selectionPreview.y + selectionPreview.height / 2) * zoom}
                rx={selectionPreview.width * zoom / 2}
                ry={selectionPreview.height * zoom / 2}
                fill="none"
                stroke="rgba(0,0,0,0.5)"
                strokeWidth="1"
                strokeDasharray="4,4"
                strokeDashoffset="4"
              />
            </svg>
          )}

          {/* Grid overlay */}
          {showGrid && zoom >= 4 && (
            <svg
              className="absolute inset-0 pointer-events-none"
              width={canvasWidth}
              height={canvasHeight}
            >
              <defs>
                <pattern id="grid" width={zoom} height={zoom} patternUnits="userSpaceOnUse">
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
    </div>
  )
}
