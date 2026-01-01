/**
 * IsometricBoxTool - Draw isometric 3D boxes with shading.
 * Based on Pixelorama's IsometricBoxTool.gd
 *
 * Usage:
 * 1. Click to set origin
 * 2. Click to set side A (down-right edge)
 * 3. Click to set gap (horizontal section)
 * 4. Click to set side B (up-right edge)
 * 5. Click to set height (vertical)
 *
 * The tool creates a 3D isometric box with different face shading.
 */

import { BaseTool } from '../base/BaseTool'
import { defineToolWithFactory, ToolRegistry } from '../registry'
import type { Point, CanvasMouseEvent, DrawingContext } from '@/core/types'
import { LayerType } from '@/core/types'
import { useToolsStore } from '@/store/tools-store'
import { useEditorStore } from '@/store/editor-store'
import { bresenhamLine } from '@/lib/drawing'

export enum BoxState {
  SIDE_A = 0,
  SIDE_GAP = 1,
  SIDE_B = 2,
  HEIGHT = 3,
  READY = 4,
}

export enum EdgeBlendMode {
  TOOL_COLOR = 0,
  ADJUSTED_AVERAGE = 1,
  BLEND_INTERFACE = 2,
  NONE = 3,
}

interface IsometricBoxConfig {
  fillInside: boolean
  thickness: number
  edgeBlendMode: EdgeBlendMode
  leftShadeValue: number
  rightShadeValue: number
  leftShadeMode: 'lighten' | 'darken'
  rightShadeMode: 'lighten' | 'darken'
}

export class IsometricBoxTool extends BaseTool {
  private config: IsometricBoxConfig = {
    fillInside: true,
    thickness: 1,
    edgeBlendMode: EdgeBlendMode.TOOL_COLOR,
    leftShadeValue: 0.3,
    rightShadeValue: 0.15,
    leftShadeMode: 'darken',
    rightShadeMode: 'darken',
  }

  private isDrawing: boolean = false
  private currentState: BoxState = BoxState.SIDE_A
  private origin: Point = { x: 0, y: 0 }
  private controlPoints: Point[] = []
  private lastPixel: Point = { x: 0, y: 0 }

  // Configuration methods
  setFillInside(fill: boolean): void {
    this.config.fillInside = fill
  }

  getFillInside(): boolean {
    return this.config.fillInside
  }

  setThickness(thickness: number): void {
    this.config.thickness = Math.max(1, Math.min(16, thickness))
  }

  getThickness(): number {
    return this.config.thickness
  }

  setEdgeBlendMode(mode: EdgeBlendMode): void {
    this.config.edgeBlendMode = mode
  }

  setLeftShade(value: number, mode: 'lighten' | 'darken'): void {
    this.config.leftShadeValue = Math.max(0, Math.min(1, value))
    this.config.leftShadeMode = mode
  }

  setRightShade(value: number, mode: 'lighten' | 'darken'): void {
    this.config.rightShadeValue = Math.max(0, Math.min(1, value))
    this.config.rightShadeMode = mode
  }

  protected override onActivate(): void {
    window.addEventListener('keydown', this.handleKeyDown)
  }

  protected override onDeactivate(): void {
    window.removeEventListener('keydown', this.handleKeyDown)
    this.clear()
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') {
      e.preventDefault()
      this.clear()
    } else if (e.key === 'Backspace' && this.isDrawing) {
      e.preventDefault()
      this.stepBack()
    }
  }

  private stepBack(): void {
    if (this.controlPoints.length > 0) {
      this.currentState--
      this.controlPoints.pop()
    } else {
      this.clear()
    }
  }

  private clear(): void {
    this.isDrawing = false
    this.currentState = BoxState.SIDE_A
    this.controlPoints = []
  }

  protected override onDrawStart(
    pos: Point,
    event: CanvasMouseEvent,
    ctx: DrawingContext
  ): void {
    // Apply angle constraint
    pos = this.applyAngleConstraint(pos, event)
    this.lastPixel = pos

    if (!this.isDrawing) {
      // Start new box
      this.isDrawing = true
      this.origin = pos
      this.controlPoints = []
      this.currentState = BoxState.SIDE_A
    } else {
      // Add control point with box constraint
      pos = this.applyBoxConstraint(this.lastPixel, pos, this.currentState)

      if (this.currentState < BoxState.READY) {
        this.controlPoints.push(pos)
      }
      this.currentState++

      // If we're ready, draw the shape
      if (this.currentState === BoxState.READY) {
        this.drawShape(ctx)
      }
    }
  }

  protected override onDrawMove(
    pos: Point,
    event: CanvasMouseEvent,
    _ctx: DrawingContext
  ): void {
    if (this.isDrawing) {
      // Apply constraints for preview
      pos = this.applyAngleConstraint(pos, event)
      pos = this.applyBoxConstraint(this.lastPixel, pos, this.currentState)
    }
    this.lastPixel = pos
  }

  protected override onDrawEnd(
    _pos: Point,
    _event: CanvasMouseEvent,
    _ctx: DrawingContext
  ): void {
    // Drawing continues until all points are set
  }

  /**
   * Constrain angle to 22.5 degree increments when Shift is held
   */
  private applyAngleConstraint(pos: Point, event: CanvasMouseEvent): Point {
    if (!event.shiftKey || this.currentState >= BoxState.HEIGHT) {
      return pos
    }

    const prevPoint = this.controlPoints.length > 0
      ? this.controlPoints[this.controlPoints.length - 1]
      : this.origin

    const dx = pos.x - prevPoint.x
    const dy = pos.y - prevPoint.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    let angle = Math.atan2(dy, dx)

    // Snap to 22.5 degree increments
    const snapAngle = Math.PI / 8
    angle = Math.round(angle / snapAngle) * snapAngle

    return {
      x: Math.round(prevPoint.x + Math.cos(angle) * distance),
      y: Math.round(prevPoint.y + Math.sin(angle) * distance),
    }
  }

  /**
   * Apply constraints based on current box state to ensure valid isometric shape
   */
  private applyBoxConstraint(oldPoint: Point, point: Point, state: BoxState): Point {
    const result = { ...point }

    switch (state) {
      case BoxState.SIDE_A:
        // Side A must go to the right of origin
        result.x = Math.max(this.origin.x, point.x)
        break

      case BoxState.SIDE_GAP:
        // Gap must have x >= side A's x
        if (this.controlPoints.length >= 1) {
          result.x = Math.max(this.controlPoints[0].x, point.x)
        }
        break

      case BoxState.SIDE_B:
        // Side B must have x >= gap's x
        if (this.controlPoints.length >= 2) {
          result.x = Math.max(this.controlPoints[1].x, point.x)
        }
        break

      case BoxState.HEIGHT:
        // Height is constrained to vertical movement only
        if (this.controlPoints.length >= 3) {
          result.x = this.controlPoints[2].x
          result.y = this.controlPoints[2].y - Math.abs(point.y - this.controlPoints[2].y)
        }
        break
    }

    return result
  }

  /**
   * Draw the final isometric box shape
   */
  private drawShape(ctx: DrawingContext): void {
    const { canvas, layer } = ctx

    if (layer.type !== 'pixel' || !layer.data) {
      this.clear()
      return
    }

    // Get control point vectors
    const a = {
      x: this.controlPoints[0].x - this.origin.x,
      y: this.controlPoints[0].y - this.origin.y,
    }
    const gap = {
      x: this.controlPoints[1].x - this.controlPoints[0].x,
      y: this.controlPoints[1].y - this.controlPoints[0].y,
    }
    const b = {
      x: this.controlPoints[2].x - this.controlPoints[1].x,
      y: this.controlPoints[2].y - this.controlPoints[1].y,
    }
    const boxHeight = Math.abs(this.controlPoints[3].y - this.controlPoints[2].y)

    // Get colors
    const toolsStore = useToolsStore.getState()
    const toolColor = toolsStore.primaryColor

    const leftColor = this.applyShade(
      toolColor,
      this.config.leftShadeValue,
      this.config.leftShadeMode
    )
    const rightColor = this.applyShade(
      toolColor,
      this.config.rightShadeValue,
      this.config.rightShadeMode
    )

    // Generate the isometric box image
    const boxImage = this.generateIsometricBox(
      a, gap, b, boxHeight,
      toolColor, leftColor, rightColor
    )

    if (!boxImage) {
      this.clear()
      return
    }

    // Calculate destination position
    const offset = Math.min(0, a.y, (a.y + gap.y), b.y, (b.y + gap.y), (a.y + b.y + gap.y)) - 1
    const dstX = this.origin.x - Math.floor(this.config.thickness / 2)
    const dstY = this.origin.y - boxHeight + offset - Math.floor(this.config.thickness / 2)

    // Save undo state
    const store = useEditorStore.getState()
    const undoData = new ImageData(
      new Uint8ClampedArray(layer.data.data),
      layer.data.width,
      layer.data.height
    )

    // Draw the box onto the layer
    this.blendImageData(boxImage, layer.data, dstX, dstY)

    // Record undo
    store.recordUndo('Draw Isometric Box', layer.id, undoData)

    this.clear()
  }

  /**
   * Generate the isometric box image with shaded faces
   */
  private generateIsometricBox(
    a: Point,
    gap: Point,
    b: Point,
    boxHeight: number,
    topColor: string,
    leftColor: string,
    rightColor: string
  ): ImageData | null {
    const h = { x: 0, y: boxHeight }

    // Calculate image dimensions
    const width = (a.x + gap.x + b.x) + this.config.thickness + 1
    const minY = Math.min(0, a.y, (a.y + gap.y), b.y, (b.y + gap.y), (a.y + b.y + gap.y))
    const maxY = Math.max(0, a.y, (a.y + gap.y), b.y, (b.y + gap.y), (a.y + b.y + gap.y))
    const height = maxY - minY + Math.abs(boxHeight) + this.config.thickness + 2

    if (width <= 0 || height <= 0) {
      return null
    }

    // Starting points for upper and lower plates
    const uSt = {
      x: Math.floor(this.config.thickness / 2),
      y: Math.abs(minY) + 1 + Math.floor(this.config.thickness / 2),
    }
    const bSt = { x: uSt.x, y: uSt.y + h.y }

    // Parse colors
    const topRgb = this.parseColor(topColor)
    const leftRgb = this.parseColor(leftColor)
    const rightRgb = this.parseColor(rightColor)

    // Create image
    const image = new ImageData(width, height)

    // Define polygons for each face
    const topPoly = this.createPolygon([
      uSt,
      { x: uSt.x + a.x, y: uSt.y + a.y },
      { x: uSt.x + a.x + gap.x, y: uSt.y + a.y + gap.y },
      { x: uSt.x + a.x + gap.x + b.x, y: uSt.y + a.y + gap.y + b.y },
      { x: uSt.x + a.x + gap.x + b.x, y: uSt.y + a.y + gap.y + b.y - 1 },
      { x: uSt.x + gap.x + b.x, y: uSt.y + gap.y + b.y - 1 },
      { x: uSt.x + b.x, y: uSt.y + b.y - 1 },
      { x: uSt.x, y: uSt.y - 1 },
    ])

    const leftPoly = this.createPolygon([
      bSt,
      { x: bSt.x + a.x, y: bSt.y + a.y },
      { x: bSt.x + a.x, y: bSt.y + a.y - h.y },
      { x: bSt.x, y: bSt.y - h.y },
    ])

    const rightPoly = this.createPolygon([
      { x: bSt.x + a.x + gap.x, y: bSt.y + a.y + gap.y },
      { x: bSt.x + a.x + gap.x + b.x, y: bSt.y + a.y + gap.y + b.y },
      { x: bSt.x + a.x + gap.x + b.x, y: bSt.y + a.y + gap.y + b.y - h.y },
      { x: bSt.x + a.x + gap.x, y: bSt.y + a.y + gap.y - h.y },
    ])

    // Generate edge lines
    const edges = this.generateBoxEdges(bSt, a, gap, b, h)

    // Fill the image
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const point = { x, y }
        const idx = (y * width + x) * 4

        // Check edges first
        if (this.isPointOnEdge(point, edges.top)) {
          this.setPixel(image.data, idx, this.getEdgeColor(topRgb, topRgb))
        } else if (this.isPointOnEdge(point, edges.bottomLeft) || this.isPointOnEdge(point, edges.left)) {
          this.setPixel(image.data, idx, this.getEdgeColor(leftRgb, leftRgb))
        } else if (this.isPointOnEdge(point, edges.bottomRight) || this.isPointOnEdge(point, edges.right)) {
          this.setPixel(image.data, idx, this.getEdgeColor(rightRgb, rightRgb))
        } else if (this.isPointOnEdge(point, edges.middle)) {
          this.setPixel(image.data, idx, this.getEdgeColor(leftRgb, rightRgb))
        }
        // Then fill faces
        else if (this.isPointInPolygon(point, topPoly)) {
          this.setPixel(image.data, idx, topRgb)
        } else if (this.isPointInPolygon(point, leftPoly)) {
          this.setPixel(image.data, idx, leftRgb)
        } else if (this.isPointInPolygon(point, rightPoly)) {
          this.setPixel(image.data, idx, rightRgb)
        }
      }
    }

    return image
  }

  /**
   * Generate edge lines for the box
   */
  private generateBoxEdges(
    bSt: Point,
    a: Point,
    gap: Point,
    b: Point,
    h: Point
  ): {
    top: Set<string>
    bottomLeft: Set<string>
    bottomRight: Set<string>
    left: Set<string>
    right: Set<string>
    middle: Set<string>
  } {
    const result = {
      top: new Set<string>(),
      bottomLeft: new Set<string>(),
      bottomRight: new Set<string>(),
      left: new Set<string>(),
      right: new Set<string>(),
      middle: new Set<string>(),
    }

    // Upper plate edges (moved up by height)
    const uSt = { x: bSt.x, y: bSt.y - h.y }

    // Top face edges
    this.addLineToSet(result.top, uSt, { x: uSt.x + a.x, y: uSt.y + a.y })
    this.addLineToSet(result.top, { x: uSt.x + a.x + gap.x, y: uSt.y + a.y + gap.y },
      { x: uSt.x + a.x + gap.x + b.x, y: uSt.y + a.y + gap.y + b.y })

    // Upper polygon edges
    const upperB = { x: uSt.x + a.x + gap.x + b.x, y: uSt.y + a.y + gap.y + b.y }
    const upperGapB = { x: uSt.x + gap.x + b.x, y: uSt.y + gap.y + b.y }
    const upperB2 = { x: uSt.x + b.x, y: uSt.y + b.y }
    this.addLineToSet(result.top, upperB, { x: upperB.x, y: upperB.y - 1 })
    this.addLineToSet(result.top, { x: upperB.x, y: upperB.y - 1 }, { x: upperGapB.x, y: upperGapB.y - 1 })
    this.addLineToSet(result.top, { x: upperGapB.x, y: upperGapB.y - 1 }, { x: upperB2.x, y: upperB2.y - 1 })
    this.addLineToSet(result.top, { x: upperB2.x, y: upperB2.y - 1 }, { x: uSt.x, y: uSt.y - 1 })

    // Bottom left edge
    this.addLineToSet(result.bottomLeft, bSt, { x: bSt.x + a.x, y: bSt.y + a.y })

    // Bottom right edge
    this.addLineToSet(result.bottomRight, { x: bSt.x + a.x + gap.x, y: bSt.y + a.y + gap.y },
      { x: bSt.x + a.x + gap.x + b.x, y: bSt.y + a.y + gap.y + b.y })

    // Left vertical edge
    this.addLineToSet(result.left, bSt, { x: bSt.x, y: bSt.y - h.y })

    // Right vertical edge
    const rightBottom = { x: bSt.x + a.x + gap.x + b.x, y: bSt.y + a.y + gap.y + b.y }
    this.addLineToSet(result.right, rightBottom, { x: rightBottom.x, y: rightBottom.y - h.y })

    // Middle edge (gap vertical)
    const gapStart = { x: bSt.x + a.x, y: bSt.y + a.y }
    const gapEnd = { x: bSt.x + a.x + gap.x, y: bSt.y + a.y + gap.y }
    for (const p of bresenhamLine(gapStart.x, gapStart.y, gapEnd.x, gapEnd.y)) {
      const topP = { x: p.x, y: p.y - h.y }
      this.addLineToSet(result.middle, p, topP)
    }

    return result
  }

  private addLineToSet(set: Set<string>, p1: Point, p2: Point): void {
    for (const p of bresenhamLine(p1.x, p1.y, p2.x, p2.y)) {
      set.add(`${p.x},${p.y}`)
    }
  }

  private isPointOnEdge(point: Point, edgeSet: Set<string>): boolean {
    return edgeSet.has(`${point.x},${point.y}`)
  }

  private createPolygon(points: Point[]): Point[] {
    return points
  }

  private isPointInPolygon(point: Point, polygon: Point[]): boolean {
    let inside = false
    const n = polygon.length

    for (let i = 0, j = n - 1; i < n; j = i++) {
      const xi = polygon[i].x, yi = polygon[i].y
      const xj = polygon[j].x, yj = polygon[j].y

      if (((yi > point.y) !== (yj > point.y)) &&
          (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)) {
        inside = !inside
      }
    }

    return inside
  }

  private parseColor(color: string): { r: number; g: number; b: number; a: number } {
    // Parse hex color
    const hex = color.replace('#', '')
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
      a: 255,
    }
  }

  private applyShade(color: string, amount: number, mode: 'lighten' | 'darken'): string {
    const rgb = this.parseColor(color)

    if (mode === 'lighten') {
      rgb.r = Math.min(255, rgb.r + (255 - rgb.r) * amount)
      rgb.g = Math.min(255, rgb.g + (255 - rgb.g) * amount)
      rgb.b = Math.min(255, rgb.b + (255 - rgb.b) * amount)
    } else {
      rgb.r = Math.max(0, rgb.r * (1 - amount))
      rgb.g = Math.max(0, rgb.g * (1 - amount))
      rgb.b = Math.max(0, rgb.b * (1 - amount))
    }

    const toHex = (n: number) => Math.round(n).toString(16).padStart(2, '0')
    return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`
  }

  private setPixel(
    data: Uint8ClampedArray,
    idx: number,
    color: { r: number; g: number; b: number; a: number }
  ): void {
    data[idx] = color.r
    data[idx + 1] = color.g
    data[idx + 2] = color.b
    data[idx + 3] = color.a
  }

  private getEdgeColor(
    faceColor: { r: number; g: number; b: number; a: number },
    _interfaceColor: { r: number; g: number; b: number; a: number }
  ): { r: number; g: number; b: number; a: number } {
    // For now, just return the face color
    // Could implement different blend modes here
    switch (this.config.edgeBlendMode) {
      case EdgeBlendMode.ADJUSTED_AVERAGE:
        // Slightly darken for edge visibility
        return {
          r: Math.max(0, faceColor.r - 20),
          g: Math.max(0, faceColor.g - 20),
          b: Math.max(0, faceColor.b - 20),
          a: faceColor.a,
        }
      case EdgeBlendMode.NONE:
        return faceColor
      default:
        return faceColor
    }
  }

  private blendImageData(
    src: ImageData,
    dst: ImageData,
    dstX: number,
    dstY: number
  ): void {
    for (let sy = 0; sy < src.height; sy++) {
      for (let sx = 0; sx < src.width; sx++) {
        const dx = dstX + sx
        const dy = dstY + sy

        if (dx < 0 || dx >= dst.width || dy < 0 || dy >= dst.height) {
          continue
        }

        const srcIdx = (sy * src.width + sx) * 4
        const dstIdx = (dy * dst.width + dx) * 4

        const srcA = src.data[srcIdx + 3] / 255
        if (srcA === 0) continue

        const dstA = dst.data[dstIdx + 3] / 255
        const outA = srcA + dstA * (1 - srcA)

        if (outA > 0) {
          dst.data[dstIdx] = (src.data[srcIdx] * srcA + dst.data[dstIdx] * dstA * (1 - srcA)) / outA
          dst.data[dstIdx + 1] = (src.data[srcIdx + 1] * srcA + dst.data[dstIdx + 1] * dstA * (1 - srcA)) / outA
          dst.data[dstIdx + 2] = (src.data[srcIdx + 2] * srcA + dst.data[dstIdx + 2] * dstA * (1 - srcA)) / outA
          dst.data[dstIdx + 3] = outA * 255
        }
      }
    }
  }

  override drawPreview(ctx: CanvasRenderingContext2D): void {
    if (!this.isDrawing) return

    const points: Point[] = [this.origin, ...this.controlPoints]

    // Add current mouse position as preview point
    if (this.currentState < BoxState.READY) {
      points.push(this.lastPixel)
    }

    // Draw control points
    ctx.fillStyle = '#ffffff'
    ctx.strokeStyle = '#3b82f6'
    ctx.lineWidth = 1

    for (const point of points) {
      ctx.beginPath()
      ctx.arc(point.x + 0.5, point.y + 0.5, 3, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()

      // Draw crosshair
      ctx.beginPath()
      ctx.moveTo(point.x - 2, point.y + 0.5)
      ctx.lineTo(point.x + 3, point.y + 0.5)
      ctx.moveTo(point.x + 0.5, point.y - 2)
      ctx.lineTo(point.x + 0.5, point.y + 3)
      ctx.stroke()
    }

    // Draw preview lines based on current state
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.7)'
    ctx.setLineDash([2, 2])

    if (points.length >= 2) {
      // Draw line from origin to side A
      ctx.beginPath()
      ctx.moveTo(points[0].x + 0.5, points[0].y + 0.5)
      ctx.lineTo(points[1].x + 0.5, points[1].y + 0.5)
      ctx.stroke()
    }

    if (points.length >= 3) {
      // Draw gap line
      ctx.beginPath()
      ctx.moveTo(points[1].x + 0.5, points[1].y + 0.5)
      ctx.lineTo(points[2].x + 0.5, points[2].y + 0.5)
      ctx.stroke()
    }

    if (points.length >= 4) {
      // Draw side B line
      ctx.beginPath()
      ctx.moveTo(points[2].x + 0.5, points[2].y + 0.5)
      ctx.lineTo(points[3].x + 0.5, points[3].y + 0.5)
      ctx.stroke()
    }

    if (points.length >= 5) {
      // Draw height line
      ctx.beginPath()
      ctx.moveTo(points[3].x + 0.5, points[3].y + 0.5)
      ctx.lineTo(points[4].x + 0.5, points[4].y + 0.5)
      ctx.stroke()
    }

    // Draw preview outline
    if (points.length >= 4) {
      this.drawBoxPreview(ctx, points)
    }

    ctx.setLineDash([])

    // Draw state indicator
    const stateNames = ['Side A', 'Gap', 'Side B', 'Height', 'Ready']
    ctx.fillStyle = '#3b82f6'
    ctx.font = '10px monospace'
    ctx.fillText(
      `Click to set: ${stateNames[this.currentState]}`,
      this.lastPixel.x + 10,
      this.lastPixel.y - 10
    )
  }

  private drawBoxPreview(ctx: CanvasRenderingContext2D, points: Point[]): void {
    const origin = points[0]
    const a = { x: points[1].x - origin.x, y: points[1].y - origin.y }
    const gap = { x: points[2].x - points[1].x, y: points[2].y - points[1].y }
    const b = { x: points[3].x - points[2].x, y: points[3].y - points[2].y }

    // Calculate the upper part of the box
    const upperA = { x: origin.x + b.x, y: origin.y + b.y }
    const upperGap = { x: upperA.x + gap.x, y: upperA.y + gap.y }
    const upperB = { x: upperGap.x + a.x, y: upperGap.y + a.y }

    ctx.strokeStyle = 'rgba(59, 130, 246, 0.5)'

    // Draw upper polygon
    ctx.beginPath()
    ctx.moveTo(origin.x + 0.5, origin.y + 0.5)
    ctx.lineTo(points[1].x + 0.5, points[1].y + 0.5)
    ctx.lineTo(points[2].x + 0.5, points[2].y + 0.5)
    ctx.lineTo(points[3].x + 0.5, points[3].y + 0.5)
    ctx.lineTo(upperB.x + 0.5, upperB.y + 0.5)
    ctx.lineTo(upperGap.x + 0.5, upperGap.y + 0.5)
    ctx.lineTo(upperA.x + 0.5, upperA.y + 0.5)
    ctx.closePath()
    ctx.stroke()

    // If we have height, draw the 3D box
    if (points.length >= 5) {
      const h = Math.abs(points[4].y - points[3].y)
      const heightVector = { x: 0, y: -h }

      // Move upper polygon up by height
      ctx.beginPath()
      ctx.moveTo(origin.x + heightVector.x + 0.5, origin.y + heightVector.y + 0.5)
      ctx.lineTo(points[1].x + heightVector.x + 0.5, points[1].y + heightVector.y + 0.5)
      ctx.lineTo(points[2].x + heightVector.x + 0.5, points[2].y + heightVector.y + 0.5)
      ctx.lineTo(points[3].x + heightVector.x + 0.5, points[3].y + heightVector.y + 0.5)
      ctx.lineTo(upperB.x + heightVector.x + 0.5, upperB.y + heightVector.y + 0.5)
      ctx.lineTo(upperGap.x + heightVector.x + 0.5, upperGap.y + heightVector.y + 0.5)
      ctx.lineTo(upperA.x + heightVector.x + 0.5, upperA.y + heightVector.y + 0.5)
      ctx.closePath()
      ctx.stroke()

      // Draw vertical edges
      ctx.beginPath()
      ctx.moveTo(origin.x + 0.5, origin.y + 0.5)
      ctx.lineTo(origin.x + heightVector.x + 0.5, origin.y + heightVector.y + 0.5)
      ctx.moveTo(points[3].x + 0.5, points[3].y + 0.5)
      ctx.lineTo(points[3].x + heightVector.x + 0.5, points[3].y + heightVector.y + 0.5)
      ctx.stroke()
    }
  }

  override drawIndicator(
    ctx: CanvasRenderingContext2D,
    pos: Point,
    color: string
  ): void {
    // Draw crosshair cursor
    ctx.strokeStyle = color
    ctx.lineWidth = 1

    ctx.beginPath()
    ctx.moveTo(pos.x - 6, pos.y + 0.5)
    ctx.lineTo(pos.x + 7, pos.y + 0.5)
    ctx.moveTo(pos.x + 0.5, pos.y - 6)
    ctx.lineTo(pos.x + 0.5, pos.y + 7)
    ctx.stroke()

    // Draw isometric icon hint
    ctx.strokeStyle = color
    ctx.beginPath()
    // Small isometric box outline
    ctx.moveTo(pos.x + 8, pos.y - 4)
    ctx.lineTo(pos.x + 12, pos.y - 2)
    ctx.lineTo(pos.x + 12, pos.y + 2)
    ctx.lineTo(pos.x + 8, pos.y + 4)
    ctx.lineTo(pos.x + 4, pos.y + 2)
    ctx.lineTo(pos.x + 4, pos.y - 2)
    ctx.closePath()
    ctx.stroke()
  }

  /**
   * Get hint text for UI
   */
  getHintText(): string {
    const hints = [
      'Click to set origin',
      'Click to set first side (down-right)',
      'Click to set gap (horizontal)',
      'Click to set second side (up-right)',
      'Click to set height',
    ]
    return hints[this.currentState] || 'Isometric box complete'
  }
}

// Register the tool
export const IsometricBoxToolDefinition = defineToolWithFactory(
  'isometricBox',
  'Isometric Box',
  'box',
  'design',
  () => new IsometricBoxTool(),
  {
    layerTypes: [LayerType.PIXEL],
    hint: 'Draw isometric 3D boxes. Click to set control points. Escape to cancel.',
    shortcut: 'x',
  }
)

ToolRegistry.register(IsometricBoxToolDefinition)
