/**
 * Canvas Component - Main drawing area
 * Based on Pixelorama's Canvas structure
 */

import { useRef, useEffect, useState, useCallback } from "react"
import { useEditorStore } from "@/store/editor-store"
import { getHistory, captureCanvasState } from "@/core/history"
import { ToolRegistry } from "@/tools/registry"
import { bresenhamLine, floodFill, hexToRgb } from "@/lib/drawing"
import { useSelection } from "@/hooks/useSelection"
import { SelectionOperation, type SelectionRect } from "@/core/selection"
import { useLayerCanvas } from "@/hooks/useLayerCanvas"
import { compositeFrameLayers } from "@/core/layerCanvas"
import { getOnionSkinManager, renderOnionSkin, type OnionSkinSettings } from "@/core/onionSkin"

// Import and register tools
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
  const [lastPoint, setLastPoint] = useState<Point | null>(null)
  const [shapeStart, setShapeStart] = useState<Point | null>(null)
  const [preDrawImageData, setPreDrawImageData] = useState<ImageData | null>(null)
  const [selectionPreview, setSelectionPreview] = useState<SelectionRect | null>(null)
  const [onionSkinSettings, setOnionSkinSettings] = useState<OnionSkinSettings>(getOnionSkinManager().getSettings())
  const lastSpacingPosRef = useRef<Point | null>(null)

  // Layer canvas system
  const { getCurrentLayerCtx, getCurrentLayer, composite, saveCurrentLayerData, getManager } = useLayerCanvas()

  // Subscribe to onion skin settings changes
  useEffect(() => {
    const manager = getOnionSkinManager()
    const unsubscribe = manager.subscribe(setOnionSkinSettings)
    return unsubscribe
  }, [])

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
    frames,
    currentFrameIndex,
    setPrimaryColor,
    setSecondaryColor,
    history,
    selection,
    bucketTolerance,
    overwrite,
    spacingMode,
    spacing,
    filled,
    shadingMode,
    shadingAmount,
    mirrorH,
    mirrorV,
    sprayDensity,
    sprayRadius,
  } = useEditorStore()

  // Selection management
  const {
    hasSelection,
    selectRect,
    selectEllipse,
    selectMask,
    selectAll: doSelectAll,
    clearSelection,
    invertSelection,
    isSelected,
    getMask,
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

    // Get target color
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

  // Initialize display canvas and composite layers
  useEffect(() => {
    const displayCanvas = displayCanvasRef.current
    if (!displayCanvas) return

    const ctx = displayCanvas.getContext("2d")
    if (!ctx) return

    // Set up for pixel art
    ctx.imageSmoothingEnabled = false

    // Composite all layers and draw to display
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

    // Only render if enabled and we have frames
    if (!onionSkinSettings.enabled || frames.length === 0) return

    // Composite each frame's layers into ImageData for onion skinning
    const frameImageData: (ImageData | null)[] = frames.map(frame =>
      compositeFrameLayers(width, height, frame.layers)
    )

    // Render onion skin
    renderOnionSkin(ctx, currentFrameIndex, frameImageData, onionSkinSettings)
  }, [width, height, frames, currentFrameIndex, onionSkinSettings])

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

  // Draw single pixel or brush with mirror support
  const drawPixel = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number, color: string, size: number = brushSize) => {
    const layer = layers[currentLayerIndex]
    if (!layer.visible || layer.locked) return

    ctx.fillStyle = color

    const drawSinglePixel = (px: number, py: number) => {
      if (px >= 0 && px < width && py >= 0 && py < height) {
        if (overwrite) {
          // Overwrite mode: clear first, then draw
          ctx.clearRect(px, py, 1, 1)
        }
        ctx.fillRect(px, py, 1, 1)
      }
    }

    // Calculate center of canvas for mirroring
    const centerX = width / 2
    const centerY = height / 2

    // Get all positions to draw (including mirrored)
    const getPositions = (baseX: number, baseY: number): Point[] => {
      const positions: Point[] = [{ x: baseX, y: baseY }]

      if (mirrorH) {
        // Mirror horizontally around center
        const mirroredX = Math.floor(2 * centerX - baseX - 1)
        positions.push({ x: mirroredX, y: baseY })
      }

      if (mirrorV) {
        // Mirror vertically around center
        const mirroredY = Math.floor(2 * centerY - baseY - 1)
        positions.push({ x: baseX, y: mirroredY })
      }

      if (mirrorH && mirrorV) {
        // Mirror both (corner mirror)
        const mirroredX = Math.floor(2 * centerX - baseX - 1)
        const mirroredY = Math.floor(2 * centerY - baseY - 1)
        positions.push({ x: mirroredX, y: mirroredY })
      }

      return positions
    }

    if (size === 1) {
      const positions = getPositions(x, y)
      positions.forEach(p => drawSinglePixel(p.x, p.y))
    } else {
      const halfSize = Math.floor(size / 2)
      for (let dx = 0; dx < size; dx++) {
        for (let dy = 0; dy < size; dy++) {
          const px = x - halfSize + dx
          const py = y - halfSize + dy
          const positions = getPositions(px, py)
          positions.forEach(p => drawSinglePixel(p.x, p.y))
        }
      }
    }
  }, [brushSize, width, height, layers, currentLayerIndex, overwrite, mirrorH, mirrorV])

  // Apply shading (lighten/darken) to pixels with mirror support
  const shadePixel = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number, size: number = brushSize) => {
    const layer = layers[currentLayerIndex]
    if (!layer.visible || layer.locked) return

    const factor = shadingAmount / 100
    const centerX = width / 2
    const centerY = height / 2

    const applyShadingToPixel = (px: number, py: number) => {
      if (px < 0 || px >= width || py < 0 || py >= height) return

      // Get current pixel color
      const imageData = ctx.getImageData(px, py, 1, 1)
      const data = imageData.data

      // Skip if pixel is fully transparent
      if (data[3] === 0) return

      // Get RGB values
      let r = data[0]
      let g = data[1]
      let b = data[2]

      // Apply lighten/darken
      if (shadingMode === 'lighten') {
        // Lighten: blend towards white
        r = Math.min(255, r + (255 - r) * factor)
        g = Math.min(255, g + (255 - g) * factor)
        b = Math.min(255, b + (255 - b) * factor)
      } else {
        // Darken: blend towards black
        r = Math.max(0, r * (1 - factor))
        g = Math.max(0, g * (1 - factor))
        b = Math.max(0, b * (1 - factor))
      }

      // Set new color
      data[0] = Math.round(r)
      data[1] = Math.round(g)
      data[2] = Math.round(b)

      ctx.putImageData(imageData, px, py)
    }

    // Get all positions to shade (including mirrored)
    const getPositions = (baseX: number, baseY: number): Point[] => {
      const positions: Point[] = [{ x: baseX, y: baseY }]

      if (mirrorH) {
        const mirroredX = Math.floor(2 * centerX - baseX - 1)
        positions.push({ x: mirroredX, y: baseY })
      }

      if (mirrorV) {
        const mirroredY = Math.floor(2 * centerY - baseY - 1)
        positions.push({ x: baseX, y: mirroredY })
      }

      if (mirrorH && mirrorV) {
        const mirroredX = Math.floor(2 * centerX - baseX - 1)
        const mirroredY = Math.floor(2 * centerY - baseY - 1)
        positions.push({ x: mirroredX, y: mirroredY })
      }

      return positions
    }

    if (size === 1) {
      const positions = getPositions(x, y)
      positions.forEach(p => applyShadingToPixel(p.x, p.y))
    } else {
      const halfSize = Math.floor(size / 2)
      for (let dx = 0; dx < size; dx++) {
        for (let dy = 0; dy < size; dy++) {
          const px = x - halfSize + dx
          const py = y - halfSize + dy
          const positions = getPositions(px, py)
          positions.forEach(p => applyShadingToPixel(p.x, p.y))
        }
      }
    }
  }, [brushSize, width, height, layers, currentLayerIndex, shadingMode, shadingAmount, mirrorH, mirrorV])

  // Draw shading line using Bresenham
  const drawShadingLine = useCallback((ctx: CanvasRenderingContext2D, from: Point, to: Point, size: number = brushSize) => {
    const points = bresenhamLine(from.x, from.y, to.x, to.y)
    points.forEach(p => {
      shadePixel(ctx, p.x, p.y, size)
    })
  }, [shadePixel, brushSize])

  // Erase pixel or brush area with mirror support
  const erasePixel = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number, size: number = brushSize) => {
    const layer = layers[currentLayerIndex]
    if (!layer.visible || layer.locked) return

    const centerX = width / 2
    const centerY = height / 2
    const halfSize = Math.floor(size / 2)

    const doErase = (px: number, py: number) => {
      ctx.clearRect(px - halfSize, py - halfSize, size, size)
    }

    // Get all positions to erase (including mirrored)
    const positions: Point[] = [{ x, y }]

    if (mirrorH) {
      const mirroredX = Math.floor(2 * centerX - x - 1)
      positions.push({ x: mirroredX, y })
    }

    if (mirrorV) {
      const mirroredY = Math.floor(2 * centerY - y - 1)
      positions.push({ x, y: mirroredY })
    }

    if (mirrorH && mirrorV) {
      const mirroredX = Math.floor(2 * centerX - x - 1)
      const mirroredY = Math.floor(2 * centerY - y - 1)
      positions.push({ x: mirroredX, y: mirroredY })
    }

    positions.forEach(p => doErase(p.x, p.y))
  }, [brushSize, width, height, layers, currentLayerIndex, mirrorH, mirrorV])

  // Erase line using Bresenham with mirror support
  const eraseLine = useCallback((ctx: CanvasRenderingContext2D, from: Point, to: Point, size: number = brushSize) => {
    const points = bresenhamLine(from.x, from.y, to.x, to.y)
    points.forEach(p => {
      erasePixel(ctx, p.x, p.y, size)
    })
  }, [erasePixel, brushSize])

  // Track processed spray pixels per stroke
  const sprayProcessedRef = useRef<Set<string>>(new Set())

  // Spray random pixels with mirror support
  const sprayPixels = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number, color: string) => {
    const layer = layers[currentLayerIndex]
    if (!layer.visible || layer.locked) return

    ctx.fillStyle = color
    const centerX = width / 2
    const centerY = height / 2

    const drawSprayPixel = (px: number, py: number) => {
      if (px >= 0 && px < width && py >= 0 && py < height) {
        const key = `${px},${py}`
        if (!sprayProcessedRef.current.has(key)) {
          sprayProcessedRef.current.add(key)
          ctx.fillRect(px, py, 1, 1)
        }
      }
    }

    // Get positions including mirrored
    const getPositions = (baseX: number, baseY: number): Point[] => {
      const positions: Point[] = [{ x: baseX, y: baseY }]

      if (mirrorH) {
        const mirroredX = Math.floor(2 * centerX - baseX - 1)
        positions.push({ x: mirroredX, y: baseY })
      }

      if (mirrorV) {
        const mirroredY = Math.floor(2 * centerY - baseY - 1)
        positions.push({ x: baseX, y: mirroredY })
      }

      if (mirrorH && mirrorV) {
        const mirroredX = Math.floor(2 * centerX - baseX - 1)
        const mirroredY = Math.floor(2 * centerY - baseY - 1)
        positions.push({ x: mirroredX, y: mirroredY })
      }

      return positions
    }

    // Spray random pixels within radius
    for (let i = 0; i < sprayDensity; i++) {
      const angle = Math.random() * Math.PI * 2
      const distance = Math.sqrt(Math.random()) * sprayRadius

      const px = Math.floor(x + Math.cos(angle) * distance)
      const py = Math.floor(y + Math.sin(angle) * distance)

      const positions = getPositions(px, py)
      positions.forEach(p => drawSprayPixel(p.x, p.y))
    }
  }, [width, height, layers, currentLayerIndex, mirrorH, mirrorV, sprayDensity, sprayRadius])

  // Spray line using Bresenham
  const sprayLine = useCallback((ctx: CanvasRenderingContext2D, from: Point, to: Point, color: string) => {
    const points = bresenhamLine(from.x, from.y, to.x, to.y)
    points.forEach(p => {
      sprayPixels(ctx, p.x, p.y, color)
    })
  }, [sprayPixels])

  // Check if we should draw at position based on spacing mode
  const shouldDrawAtPosition = useCallback((pos: Point): boolean => {
    if (!spacingMode) return true

    const lastPos = lastSpacingPosRef.current
    if (!lastPos) {
      lastSpacingPosRef.current = pos
      return true
    }

    const dx = Math.abs(pos.x - lastPos.x)
    const dy = Math.abs(pos.y - lastPos.y)

    if (dx >= spacing.x || dy >= spacing.y) {
      lastSpacingPosRef.current = pos
      return true
    }

    return false
  }, [spacingMode, spacing])

  // Draw line using Bresenham with spacing support
  const drawLine = useCallback((ctx: CanvasRenderingContext2D, from: Point, to: Point, color: string, size: number = brushSize) => {
    const points = bresenhamLine(from.x, from.y, to.x, to.y)
    points.forEach(p => {
      if (shouldDrawAtPosition(p)) {
        drawPixel(ctx, p.x, p.y, color, size)
      }
    })
  }, [drawPixel, brushSize, shouldDrawAtPosition])

  // Flood fill - operates on current layer
  const doFloodFill = useCallback((x: number, y: number, fillColor: string) => {
    const ctx = getCurrentLayerCtx()
    if (!ctx) return

    const layer = layers[currentLayerIndex]
    if (!layer?.visible || layer?.locked) return

    const rgb = hexToRgb(fillColor)
    if (!rgb) return

    // Get current image data from the layer
    const imageData = ctx.getImageData(0, 0, width, height)

    // Get points to fill using flood fill algorithm with tolerance from store
    const pointsToFill = floodFill(imageData, x, y, bucketTolerance)

    // Fill the points with the new color
    for (const point of pointsToFill) {
      const index = (point.y * width + point.x) * 4
      imageData.data[index] = rgb.r
      imageData.data[index + 1] = rgb.g
      imageData.data[index + 2] = rgb.b
      imageData.data[index + 3] = 255
    }

    // Put the modified image data back
    ctx.putImageData(imageData, 0, 0)
  }, [getCurrentLayerCtx, layers, currentLayerIndex, width, height, bucketTolerance])

  // Pick color from composited canvas (visible result)
  const pickColor = useCallback((x: number, y: number, isPrimary: boolean) => {
    const composited = composite()
    if (!composited) return

    const ctx = composited.getContext("2d")
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
  }, [width, height, setPrimaryColor, setSecondaryColor, composite])

  // Draw shape preview on the preview canvas
  const drawShapePreview = useCallback((start: Point, end: Point, tool: string, color: string) => {
    const layerCtx = getCurrentLayerCtx()
    const preview = previewCanvasRef.current
    if (!layerCtx || !preview) return

    const previewCtx = preview.getContext("2d")
    if (!previewCtx) return

    // Clear preview
    previewCtx.clearRect(0, 0, width, height)

    // Restore original image on layer
    if (preDrawImageData) {
      layerCtx.putImageData(preDrawImageData, 0, 0)
    }

    // Draw shape preview on layer canvas (temporary)
    layerCtx.fillStyle = color
    layerCtx.strokeStyle = color

    const minX = Math.min(start.x, end.x)
    const minY = Math.min(start.y, end.y)
    const w = Math.abs(end.x - start.x)
    const h = Math.abs(end.y - start.y)

    switch (tool) {
      case 'line':
        drawLine(layerCtx, start, end, color, brushSize)
        break
      case 'rectangle':
        if (filled) {
          // Filled rectangle
          for (let y = minY; y <= minY + h; y++) {
            for (let x = minX; x <= minX + w; x++) {
              drawPixel(layerCtx, x, y, color, 1)
            }
          }
        } else {
          // Rectangle outline
          for (let x = minX; x <= minX + w; x++) {
            drawPixel(layerCtx, x, minY, color, 1)
            drawPixel(layerCtx, x, minY + h, color, 1)
          }
          for (let y = minY; y <= minY + h; y++) {
            drawPixel(layerCtx, minX, y, color, 1)
            drawPixel(layerCtx, minX + w, y, color, 1)
          }
        }
        break
      case 'ellipse':
        // Draw ellipse using midpoint algorithm
        const cx = (start.x + end.x) / 2
        const cy = (start.y + end.y) / 2
        const rx = w / 2
        const ry = h / 2
        drawEllipse(layerCtx, cx, cy, rx, ry, color, filled)
        break
    }

    // Update display canvas with composited result
    const displayCanvas = displayCanvasRef.current
    if (displayCanvas) {
      const displayCtx = displayCanvas.getContext("2d")
      if (displayCtx) {
        const composited = composite()
        if (composited) {
          displayCtx.clearRect(0, 0, width, height)
          displayCtx.drawImage(composited, 0, 0)
        }
      }
    }
  }, [width, height, brushSize, preDrawImageData, drawLine, drawPixel, drawEllipse, getCurrentLayerCtx, composite, filled])

  // Helper to update display canvas with composited layers
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

  // Draw ellipse using midpoint algorithm
  const drawEllipse = useCallback((ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, color: string, isFilled: boolean = false) => {
    if (rx <= 0 || ry <= 0) return

    ctx.fillStyle = color
    const setPixel = (x: number, y: number) => {
      if (x >= 0 && x < width && y >= 0 && y < height) {
        ctx.fillRect(Math.floor(x), Math.floor(y), 1, 1)
      }
    }

    if (isFilled) {
      // Filled ellipse - scan through bounding box
      const floorCx = Math.floor(cx)
      const floorCy = Math.floor(cy)
      const floorRx = Math.floor(rx)
      const floorRy = Math.floor(ry)
      for (let dy = -floorRy; dy <= floorRy; dy++) {
        for (let dx = -floorRx; dx <= floorRx; dx++) {
          // Check if point is inside ellipse
          const nx = dx / (floorRx || 1)
          const ny = dy / (floorRy || 1)
          if (nx * nx + ny * ny <= 1) {
            setPixel(floorCx + dx, floorCy + dy)
          }
        }
      }
    } else {
      // Outline ellipse
      for (let angle = 0; angle < Math.PI * 2; angle += 0.01) {
        const x = cx + rx * Math.cos(angle)
        const y = cy + ry * Math.sin(angle)
        setPixel(x, y)
      }
    }
  }, [width, height])

  // Handle pointer down
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    const displayCanvas = displayCanvasRef.current
    if (!displayCanvas) return

    const layerCtx = getCurrentLayerCtx()
    const currentLayerCanvas = getCurrentLayer()

    const point = getCanvasPoint(e)
    const isPrimary = e.button !== 2
    const color = isPrimary ? primaryColor : secondaryColor

    // Capture state before drawing for undo (from current layer)
    const beforeState = currentLayerCanvas?.ctx ? captureCanvasState(currentLayerCanvas.canvas) : null
    setPreDrawImageData(beforeState)

    setIsDrawing(true)
    setLastPoint(point)

    switch (currentTool) {
      case "pencil":
        // Reset spacing position at start of stroke
        lastSpacingPosRef.current = null
        if (layerCtx && shouldDrawAtPosition(point)) {
          drawPixel(layerCtx, point.x, point.y, color)
          updateDisplay()
        }
        break
      case "shading":
        if (layerCtx) {
          shadePixel(layerCtx, point.x, point.y)
          updateDisplay()
        }
        break
      case "spray":
        // Reset spray processed pixels at start of stroke
        sprayProcessedRef.current.clear()
        if (layerCtx) {
          sprayPixels(layerCtx, point.x, point.y, color)
          updateDisplay()
        }
        break
      case "eraser":
        if (layerCtx) {
          erasePixel(layerCtx, point.x, point.y)
          updateDisplay()
        }
        break
      case "bucket":
        doFloodFill(point.x, point.y, color)
        updateDisplay()
        // Add to history immediately for bucket (save layer data too)
        if (beforeState && currentLayerCanvas) {
          const afterState = captureCanvasState(currentLayerCanvas.canvas)
          if (afterState) {
            history.addImageAction("Fill", currentLayerCanvas.canvas, beforeState, afterState)
          }
        }
        saveCurrentLayerData()
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
      case "rectSelect":
      case "ellipseSelect":
        // Start rectangle/ellipse selection
        setShapeStart(point)
        // Check modifier keys for selection mode
        if (!e.shiftKey && !e.altKey && !e.ctrlKey) {
          clearSelection()
        }
        break
      case "magicWand":
        // Magic wand selection - use composited result
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

    // Capture pointer for better tracking
    displayCanvas.setPointerCapture(e.pointerId)
  }, [getCanvasPoint, currentTool, primaryColor, secondaryColor, brushSize, drawPixel, shadePixel, doFloodFill, pickColor, history, zoomIn, zoomOut, clearSelection, selectMask, width, height, getCurrentLayerCtx, getCurrentLayer, updateDisplay, composite, saveCurrentLayerData, shouldDrawAtPosition])

  // Handle pointer move
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDrawing) return

    const layerCtx = getCurrentLayerCtx()

    const point = getCanvasPoint(e)
    const isPrimary = (e.buttons & 1) !== 0
    const color = isPrimary ? primaryColor : secondaryColor

    switch (currentTool) {
      case "pencil":
        if (lastPoint && layerCtx) {
          drawLine(layerCtx, lastPoint, point, color)
          updateDisplay()
        }
        break
      case "shading":
        if (lastPoint && layerCtx) {
          drawShadingLine(layerCtx, lastPoint, point)
          updateDisplay()
        }
        break
      case "spray":
        if (lastPoint && layerCtx) {
          sprayLine(layerCtx, lastPoint, point, color)
          updateDisplay()
        }
        break
      case "eraser":
        if (lastPoint && layerCtx) {
          eraseLine(layerCtx, lastPoint, point)
          updateDisplay()
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
      case "rectSelect":
      case "ellipseSelect":
        if (shapeStart) {
          // Update selection preview
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

    setLastPoint(point)
  }, [isDrawing, getCanvasPoint, currentTool, primaryColor, secondaryColor, brushSize, lastPoint, shapeStart, drawLine, drawShadingLine, drawShapePreview, pan, pickColor, getCurrentLayerCtx, updateDisplay])

  // Handle pointer up
  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!isDrawing) return

    const displayCanvas = displayCanvasRef.current
    if (!displayCanvas) return

    const currentLayerCanvas = getCurrentLayer()
    const point = getCanvasPoint(e)

    // Add action to history for drawing tools and save layer data
    if (preDrawImageData && ['pencil', 'eraser', 'line', 'rectangle', 'ellipse', 'shading', 'spray'].includes(currentTool)) {
      if (currentLayerCanvas) {
        const afterState = captureCanvasState(currentLayerCanvas.canvas)
        if (afterState) {
          const toolName = currentTool.charAt(0).toUpperCase() + currentTool.slice(1)
          history.addImageAction(toolName, currentLayerCanvas.canvas, preDrawImageData, afterState)
        }
      }
      // Save layer data to store
      saveCurrentLayerData()
    }

    // Finalize rectangle or ellipse selection
    if ((currentTool === 'rectSelect' || currentTool === 'ellipseSelect') && shapeStart) {
      const rect: SelectionRect = {
        x: Math.min(shapeStart.x, point.x),
        y: Math.min(shapeStart.y, point.y),
        width: Math.max(1, Math.abs(point.x - shapeStart.x)),
        height: Math.max(1, Math.abs(point.y - shapeStart.y)),
      }

      // Determine selection operation from modifiers
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

    setIsDrawing(false)
    setLastPoint(null)
    setShapeStart(null)
    setPreDrawImageData(null)

    // Release pointer capture
    displayCanvas.releasePointerCapture(e.pointerId)
  }, [isDrawing, currentTool, preDrawImageData, history, getCanvasPoint, shapeStart, selectRect, selectEllipse, getCurrentLayer, saveCurrentLayerData])

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
          {/* Onion skin canvas (behind main canvas) */}
          <canvas
            ref={onionSkinCanvasRef}
            width={width}
            height={height}
            className="absolute inset-0 pointer-events-none pixel-canvas"
            style={{
              width: canvasWidth,
              height: canvasHeight,
            }}
          />

          {/* Display canvas - shows composited layers */}
          <canvas
            ref={displayCanvasRef}
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

          {/* Selection overlay canvas (marching ants) */}
          <canvas
            ref={selectionCanvasRef}
            width={width}
            height={height}
            className="absolute inset-0 pointer-events-none"
            style={{
              width: canvasWidth,
              height: canvasHeight,
              imageRendering: 'pixelated',
            }}
          />

          {/* Selection preview (while dragging) */}
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

          {/* Ellipse selection preview */}
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
