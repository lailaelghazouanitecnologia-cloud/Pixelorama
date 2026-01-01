/**
 * TileMap System - Support for tile-based layers
 * Based on Pixelorama's TileMapLayer functionality
 *
 * Provides tileset management, tile placement, and tilemap rendering
 * for game development workflows.
 */

import type { Point, Size, Rect, Color } from './types'

// ============================================================================
// Tileset Types
// ============================================================================

export interface Tile {
  readonly id: number
  readonly x: number  // Position in tileset (tile coordinates)
  readonly y: number
  readonly flipH: boolean
  readonly flipV: boolean
  readonly rotate90: boolean
  readonly isEmpty: boolean
}

export interface Tileset {
  readonly id: string
  readonly name: string
  readonly image: ImageData
  readonly tileWidth: number
  readonly tileHeight: number
  readonly columns: number
  readonly rows: number
  readonly spacing: number  // Space between tiles in pixels
  readonly margin: number   // Margin around tileset in pixels
}

export interface TilesetRef {
  readonly tilesetId: string
  readonly tileIndex: number  // Linear index in tileset
}

// ============================================================================
// TileMap Data
// ============================================================================

export interface TileCell {
  tilesetId: string | null
  tileIndex: number  // -1 means empty
  flipH: boolean
  flipV: boolean
  rotate90: boolean
}

export interface TileMapData {
  readonly width: number   // Map width in tiles
  readonly height: number  // Map height in tiles
  readonly tileWidth: number
  readonly tileHeight: number
  readonly cells: TileCell[][]  // [y][x] grid
  readonly tilesets: string[]   // Tileset IDs used by this map
}

// ============================================================================
// TileMap Layer
// ============================================================================

export interface TileMapLayer {
  readonly id: string
  readonly name: string
  readonly visible: boolean
  readonly locked: boolean
  readonly opacity: number
  readonly tilemapData: TileMapData
  readonly selectedTileset: string | null
  readonly selectedTileIndex: number
}

// ============================================================================
// Tileset Management
// ============================================================================

/**
 * Create an empty tile cell
 */
export function createEmptyTileCell(): TileCell {
  return {
    tilesetId: null,
    tileIndex: -1,
    flipH: false,
    flipV: false,
    rotate90: false,
  }
}

/**
 * Create a new tilemap data structure
 */
export function createTileMapData(
  widthInTiles: number,
  heightInTiles: number,
  tileWidth: number,
  tileHeight: number
): TileMapData {
  const cells: TileCell[][] = []

  for (let y = 0; y < heightInTiles; y++) {
    const row: TileCell[] = []
    for (let x = 0; x < widthInTiles; x++) {
      row.push(createEmptyTileCell())
    }
    cells.push(row)
  }

  return {
    width: widthInTiles,
    height: heightInTiles,
    tileWidth,
    tileHeight,
    cells,
    tilesets: [],
  }
}

/**
 * Create a tileset from an image
 */
export function createTileset(
  id: string,
  name: string,
  image: ImageData,
  tileWidth: number,
  tileHeight: number,
  spacing = 0,
  margin = 0
): Tileset {
  const usableWidth = image.width - 2 * margin + spacing
  const usableHeight = image.height - 2 * margin + spacing

  const columns = Math.floor(usableWidth / (tileWidth + spacing))
  const rows = Math.floor(usableHeight / (tileHeight + spacing))

  return {
    id,
    name,
    image,
    tileWidth,
    tileHeight,
    columns,
    rows,
    spacing,
    margin,
  }
}

/**
 * Get tile count in a tileset
 */
export function getTileCount(tileset: Tileset): number {
  return tileset.columns * tileset.rows
}

/**
 * Get tile position in tileset from index
 */
export function getTilePosition(tileset: Tileset, index: number): Point {
  const x = index % tileset.columns
  const y = Math.floor(index / tileset.columns)
  return { x, y }
}

/**
 * Get pixel rect of tile in tileset
 */
export function getTileRect(tileset: Tileset, index: number): Rect {
  const pos = getTilePosition(tileset, index)
  return {
    x: tileset.margin + pos.x * (tileset.tileWidth + tileset.spacing),
    y: tileset.margin + pos.y * (tileset.tileHeight + tileset.spacing),
    width: tileset.tileWidth,
    height: tileset.tileHeight,
  }
}

/**
 * Extract a single tile from tileset as ImageData
 */
export function extractTile(tileset: Tileset, index: number): ImageData {
  const rect = getTileRect(tileset, index)
  const tileData = new ImageData(tileset.tileWidth, tileset.tileHeight)

  for (let y = 0; y < tileset.tileHeight; y++) {
    for (let x = 0; x < tileset.tileWidth; x++) {
      const srcIdx = ((rect.y + y) * tileset.image.width + (rect.x + x)) * 4
      const dstIdx = (y * tileset.tileWidth + x) * 4

      tileData.data[dstIdx] = tileset.image.data[srcIdx]
      tileData.data[dstIdx + 1] = tileset.image.data[srcIdx + 1]
      tileData.data[dstIdx + 2] = tileset.image.data[srcIdx + 2]
      tileData.data[dstIdx + 3] = tileset.image.data[srcIdx + 3]
    }
  }

  return tileData
}

// ============================================================================
// TileMap Operations
// ============================================================================

/**
 * Convert pixel coordinates to tile coordinates
 */
export function pixelToTile(
  px: number,
  py: number,
  tileWidth: number,
  tileHeight: number
): Point {
  return {
    x: Math.floor(px / tileWidth),
    y: Math.floor(py / tileHeight),
  }
}

/**
 * Convert tile coordinates to pixel coordinates
 */
export function tileToPixel(
  tx: number,
  ty: number,
  tileWidth: number,
  tileHeight: number
): Point {
  return {
    x: tx * tileWidth,
    y: ty * tileHeight,
  }
}

/**
 * Check if tile coordinates are within map bounds
 */
export function isValidTilePosition(
  tx: number,
  ty: number,
  mapData: TileMapData
): boolean {
  return tx >= 0 && tx < mapData.width && ty >= 0 && ty < mapData.height
}

/**
 * Get tile cell at position
 */
export function getTileAt(
  mapData: TileMapData,
  tx: number,
  ty: number
): TileCell | null {
  if (!isValidTilePosition(tx, ty, mapData)) {
    return null
  }
  return mapData.cells[ty][tx]
}

/**
 * Set tile at position (returns new TileMapData)
 */
export function setTileAt(
  mapData: TileMapData,
  tx: number,
  ty: number,
  cell: TileCell
): TileMapData {
  if (!isValidTilePosition(tx, ty, mapData)) {
    return mapData
  }

  const newCells = mapData.cells.map((row, y) =>
    y === ty
      ? row.map((c, x) => (x === tx ? { ...cell } : c))
      : row
  )

  return {
    ...mapData,
    cells: newCells,
  }
}

/**
 * Clear tile at position
 */
export function clearTileAt(
  mapData: TileMapData,
  tx: number,
  ty: number
): TileMapData {
  return setTileAt(mapData, tx, ty, createEmptyTileCell())
}

/**
 * Fill rectangle with tile
 */
export function fillTileRect(
  mapData: TileMapData,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  cell: TileCell
): TileMapData {
  const minX = Math.max(0, Math.min(startX, endX))
  const maxX = Math.min(mapData.width - 1, Math.max(startX, endX))
  const minY = Math.max(0, Math.min(startY, endY))
  const maxY = Math.min(mapData.height - 1, Math.max(startY, endY))

  const newCells = mapData.cells.map((row, y) => {
    if (y < minY || y > maxY) return row
    return row.map((c, x) => {
      if (x < minX || x > maxX) return c
      return { ...cell }
    })
  })

  return {
    ...mapData,
    cells: newCells,
  }
}

/**
 * Flood fill tiles starting from a position
 */
export function floodFillTiles(
  mapData: TileMapData,
  startX: number,
  startY: number,
  newCell: TileCell
): TileMapData {
  if (!isValidTilePosition(startX, startY, mapData)) {
    return mapData
  }

  const targetCell = mapData.cells[startY][startX]

  // Don't fill if same tile
  if (
    targetCell.tilesetId === newCell.tilesetId &&
    targetCell.tileIndex === newCell.tileIndex &&
    targetCell.flipH === newCell.flipH &&
    targetCell.flipV === newCell.flipV &&
    targetCell.rotate90 === newCell.rotate90
  ) {
    return mapData
  }

  const newCells = mapData.cells.map(row => row.map(c => ({ ...c })))
  const visited = new Set<string>()
  const queue: Point[] = [{ x: startX, y: startY }]

  const isSameTile = (cell: TileCell): boolean => {
    return (
      cell.tilesetId === targetCell.tilesetId &&
      cell.tileIndex === targetCell.tileIndex
    )
  }

  while (queue.length > 0) {
    const { x, y } = queue.shift()!
    const key = `${x},${y}`

    if (visited.has(key)) continue
    if (!isValidTilePosition(x, y, mapData)) continue
    if (!isSameTile(newCells[y][x])) continue

    visited.add(key)
    newCells[y][x] = { ...newCell }

    queue.push({ x: x + 1, y })
    queue.push({ x: x - 1, y })
    queue.push({ x, y: y + 1 })
    queue.push({ x, y: y - 1 })
  }

  return {
    ...mapData,
    cells: newCells,
  }
}

// ============================================================================
// TileMap Rendering
// ============================================================================

/**
 * Render a single tile with transformations
 */
export function renderTile(
  ctx: CanvasRenderingContext2D,
  tileData: ImageData,
  destX: number,
  destY: number,
  flipH: boolean,
  flipV: boolean,
  rotate90: boolean
): void {
  const width = tileData.width
  const height = tileData.height

  ctx.save()
  ctx.translate(destX + width / 2, destY + height / 2)

  if (rotate90) {
    ctx.rotate(Math.PI / 2)
  }

  ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1)
  ctx.translate(-width / 2, -height / 2)

  // Create temp canvas for tile
  const tempCanvas = new OffscreenCanvas(width, height)
  const tempCtx = tempCanvas.getContext('2d')!
  tempCtx.putImageData(tileData, 0, 0)

  ctx.drawImage(tempCanvas, 0, 0)
  ctx.restore()
}

/**
 * Render entire tilemap to canvas
 */
export function renderTileMap(
  ctx: CanvasRenderingContext2D,
  mapData: TileMapData,
  tilesets: Map<string, Tileset>,
  opacity = 1
): void {
  const oldAlpha = ctx.globalAlpha
  ctx.globalAlpha = opacity

  // Cache extracted tiles
  const tileCache = new Map<string, ImageData>()

  for (let y = 0; y < mapData.height; y++) {
    for (let x = 0; x < mapData.width; x++) {
      const cell = mapData.cells[y][x]

      if (cell.tileIndex < 0 || !cell.tilesetId) continue

      const tileset = tilesets.get(cell.tilesetId)
      if (!tileset) continue

      const cacheKey = `${cell.tilesetId}:${cell.tileIndex}`
      let tileData = tileCache.get(cacheKey)

      if (!tileData) {
        tileData = extractTile(tileset, cell.tileIndex)
        tileCache.set(cacheKey, tileData)
      }

      const destX = x * mapData.tileWidth
      const destY = y * mapData.tileHeight

      renderTile(ctx, tileData, destX, destY, cell.flipH, cell.flipV, cell.rotate90)
    }
  }

  ctx.globalAlpha = oldAlpha
}

/**
 * Render tilemap to ImageData
 */
export function renderTileMapToImageData(
  mapData: TileMapData,
  tilesets: Map<string, Tileset>
): ImageData {
  const width = mapData.width * mapData.tileWidth
  const height = mapData.height * mapData.tileHeight

  const canvas = new OffscreenCanvas(width, height)
  const ctx = canvas.getContext('2d')!

  renderTileMap(ctx, mapData, tilesets)

  return ctx.getImageData(0, 0, width, height)
}

// ============================================================================
// TileMap Grid Display
// ============================================================================

/**
 * Render tile grid overlay
 */
export function renderTileGrid(
  ctx: CanvasRenderingContext2D,
  mapData: TileMapData,
  gridColor = 'rgba(128, 128, 128, 0.5)'
): void {
  const width = mapData.width * mapData.tileWidth
  const height = mapData.height * mapData.tileHeight

  ctx.strokeStyle = gridColor
  ctx.lineWidth = 1

  ctx.beginPath()

  // Vertical lines
  for (let x = 0; x <= mapData.width; x++) {
    const px = x * mapData.tileWidth
    ctx.moveTo(px + 0.5, 0)
    ctx.lineTo(px + 0.5, height)
  }

  // Horizontal lines
  for (let y = 0; y <= mapData.height; y++) {
    const py = y * mapData.tileHeight
    ctx.moveTo(0, py + 0.5)
    ctx.lineTo(width, py + 0.5)
  }

  ctx.stroke()
}

/**
 * Highlight a tile cell
 */
export function highlightTile(
  ctx: CanvasRenderingContext2D,
  tx: number,
  ty: number,
  tileWidth: number,
  tileHeight: number,
  color = 'rgba(255, 255, 0, 0.3)'
): void {
  ctx.fillStyle = color
  ctx.fillRect(
    tx * tileWidth,
    ty * tileHeight,
    tileWidth,
    tileHeight
  )
}

// ============================================================================
// Auto-Tiling Support
// ============================================================================

export type AutoTileRule = {
  readonly mask: boolean[][]  // 3x3 neighbor mask (true = same tile required)
  readonly tileIndex: number
}

export interface AutoTileConfig {
  readonly rules: AutoTileRule[]
  readonly defaultTileIndex: number
}

/**
 * Get neighbor mask for a tile position
 */
export function getNeighborMask(
  mapData: TileMapData,
  tx: number,
  ty: number,
  matchTilesetId: string
): boolean[][] {
  const mask: boolean[][] = []

  for (let dy = -1; dy <= 1; dy++) {
    const row: boolean[] = []
    for (let dx = -1; dx <= 1; dx++) {
      const nx = tx + dx
      const ny = ty + dy

      if (!isValidTilePosition(nx, ny, mapData)) {
        row.push(true)  // Out of bounds treated as matching
      } else {
        const cell = mapData.cells[ny][nx]
        row.push(cell.tilesetId === matchTilesetId && cell.tileIndex >= 0)
      }
    }
    mask.push(row)
  }

  return mask
}

/**
 * Match auto-tile rule
 */
export function matchAutoTileRule(
  neighborMask: boolean[][],
  rule: AutoTileRule
): boolean {
  for (let y = 0; y < 3; y++) {
    for (let x = 0; x < 3; x++) {
      if (rule.mask[y][x] && !neighborMask[y][x]) {
        return false
      }
    }
  }
  return true
}

/**
 * Get auto-tile index for a position
 */
export function getAutoTileIndex(
  mapData: TileMapData,
  tx: number,
  ty: number,
  tilesetId: string,
  config: AutoTileConfig
): number {
  const neighborMask = getNeighborMask(mapData, tx, ty, tilesetId)

  for (const rule of config.rules) {
    if (matchAutoTileRule(neighborMask, rule)) {
      return rule.tileIndex
    }
  }

  return config.defaultTileIndex
}

// ============================================================================
// Tileset Palette UI Helpers
// ============================================================================

/**
 * Get tileset preview as ImageData (scaled to fit)
 */
export function getTilesetPreview(
  tileset: Tileset,
  maxWidth: number,
  maxHeight: number
): ImageData {
  const scale = Math.min(
    maxWidth / tileset.image.width,
    maxHeight / tileset.image.height,
    1  // Don't upscale
  )

  const width = Math.floor(tileset.image.width * scale)
  const height = Math.floor(tileset.image.height * scale)

  const canvas = new OffscreenCanvas(width, height)
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingEnabled = false

  const tempCanvas = new OffscreenCanvas(tileset.image.width, tileset.image.height)
  const tempCtx = tempCanvas.getContext('2d')!
  tempCtx.putImageData(tileset.image, 0, 0)

  ctx.drawImage(tempCanvas, 0, 0, width, height)

  return ctx.getImageData(0, 0, width, height)
}

/**
 * Get tile index from click position in tileset preview
 */
export function getTileIndexFromClick(
  tileset: Tileset,
  clickX: number,
  clickY: number,
  previewScale: number
): number {
  const tileX = Math.floor(
    (clickX / previewScale - tileset.margin) / (tileset.tileWidth + tileset.spacing)
  )
  const tileY = Math.floor(
    (clickY / previewScale - tileset.margin) / (tileset.tileHeight + tileset.spacing)
  )

  if (tileX < 0 || tileX >= tileset.columns || tileY < 0 || tileY >= tileset.rows) {
    return -1
  }

  return tileY * tileset.columns + tileX
}

// ============================================================================
// Export Types
// ============================================================================

export type { Point, Size, Rect } from './types'
