/**
 * TileMapTool - Tool for editing TileMap layers.
 * Supports tile placement, erasing, flood fill, and rectangle fill.
 */

import { BaseTool } from '../base/BaseTool'
import { defineToolWithFactory, ToolRegistry } from '../registry'
import type { Point, CanvasMouseEvent, DrawingContext } from '@/core/types'
import { LayerType } from '@/core/types'
import { useTileMapStore, type TileEditMode } from '@/store/tilemap-store'
import { useEditorStore } from '@/store/editor-store'
import {
  pixelToTile,
  tileToPixel,
  floodFillTiles,
  fillTileRect,
  isValidTilePosition,
  type TileMapData,
} from '@/core/tilemap'

export class TileMapTool extends BaseTool {
  private startTile: Point | null = null
  private previewTiles: Point[] = []
  private lastTile: Point | null = null
  private originalMapData: TileMapData | null = null

  protected onDrawStart(
    pos: Point,
    _event: CanvasMouseEvent,
    _ctx: DrawingContext
  ): void {
    const editorStore = useEditorStore.getState()
    const tileMapStore = useTileMapStore.getState()

    const layer = editorStore.layers[editorStore.currentLayerIndex]
    if (!layer || layer.type !== 'tilemap' || !layer.tilemapData) return

    const mapData = layer.tilemapData
    const tilePos = pixelToTile(pos.x, pos.y, mapData.tileWidth, mapData.tileHeight)

    if (!isValidTilePosition(tilePos.x, tilePos.y, mapData)) return

    this.startTile = tilePos
    this.lastTile = tilePos
    this.originalMapData = mapData

    const mode = tileMapStore.editMode

    if (mode === 'place' || mode === 'erase') {
      this.applyTileAtPosition(tilePos, mode)
    } else if (mode === 'fill') {
      this.applyFill(tilePos)
    } else if (mode === 'picker') {
      this.pickTile(tilePos)
    }
  }

  protected onDrawMove(
    pos: Point,
    _event: CanvasMouseEvent,
    _ctx: DrawingContext
  ): void {
    const editorStore = useEditorStore.getState()
    const tileMapStore = useTileMapStore.getState()

    const layer = editorStore.layers[editorStore.currentLayerIndex]
    if (!layer || layer.type !== 'tilemap' || !layer.tilemapData) return

    const mapData = layer.tilemapData
    const tilePos = pixelToTile(pos.x, pos.y, mapData.tileWidth, mapData.tileHeight)

    if (!isValidTilePosition(tilePos.x, tilePos.y, mapData)) return

    // Avoid processing same tile twice
    if (this.lastTile?.x === tilePos.x && this.lastTile?.y === tilePos.y) {
      return
    }

    const mode = tileMapStore.editMode

    if (mode === 'place' || mode === 'erase') {
      this.applyTileAtPosition(tilePos, mode)
    } else if (mode === 'rect') {
      // Update preview for rectangle mode
      this.updateRectPreview(tilePos)
    }

    this.lastTile = tilePos
  }

  protected onDrawEnd(
    pos: Point,
    _event: CanvasMouseEvent,
    _ctx: DrawingContext
  ): void {
    const editorStore = useEditorStore.getState()
    const tileMapStore = useTileMapStore.getState()

    const layer = editorStore.layers[editorStore.currentLayerIndex]
    if (!layer || layer.type !== 'tilemap' || !layer.tilemapData) return

    const mapData = layer.tilemapData
    const tilePos = pixelToTile(pos.x, pos.y, mapData.tileWidth, mapData.tileHeight)

    const mode = tileMapStore.editMode

    if (mode === 'rect' && this.startTile) {
      this.applyRectFill(this.startTile, tilePos)
    }

    this.startTile = null
    this.lastTile = null
    this.previewTiles = []
    this.originalMapData = null
  }

  protected onDrawCancel(): void {
    // Restore original map data if we have it
    if (this.originalMapData) {
      const editorStore = useEditorStore.getState()
      const layerIndex = editorStore.currentLayerIndex
      editorStore.setTileMapData(layerIndex, this.originalMapData)
    }

    this.startTile = null
    this.lastTile = null
    this.previewTiles = []
    this.originalMapData = null
  }

  private applyTileAtPosition(tilePos: Point, mode: TileEditMode): void {
    const editorStore = useEditorStore.getState()
    const tileMapStore = useTileMapStore.getState()
    const layerIndex = editorStore.currentLayerIndex

    if (mode === 'place') {
      const cell = tileMapStore.getCurrentTileCell()
      editorStore.updateTileAt(layerIndex, tilePos.x, tilePos.y, cell)
    } else if (mode === 'erase') {
      editorStore.clearTileAt(layerIndex, tilePos.x, tilePos.y)
    }
  }

  private applyFill(tilePos: Point): void {
    const editorStore = useEditorStore.getState()
    const tileMapStore = useTileMapStore.getState()

    const layer = editorStore.layers[editorStore.currentLayerIndex]
    if (!layer || layer.type !== 'tilemap' || !layer.tilemapData) return

    const cell = tileMapStore.getCurrentTileCell()
    const newMapData = floodFillTiles(layer.tilemapData, tilePos.x, tilePos.y, cell)

    editorStore.setTileMapData(editorStore.currentLayerIndex, newMapData)
  }

  private applyRectFill(start: Point, end: Point): void {
    const editorStore = useEditorStore.getState()
    const tileMapStore = useTileMapStore.getState()

    const layer = editorStore.layers[editorStore.currentLayerIndex]
    if (!layer || layer.type !== 'tilemap' || !layer.tilemapData) return

    const cell = tileMapStore.getCurrentTileCell()
    const newMapData = fillTileRect(
      layer.tilemapData,
      start.x,
      start.y,
      end.x,
      end.y,
      cell
    )

    editorStore.setTileMapData(editorStore.currentLayerIndex, newMapData)
  }

  private pickTile(tilePos: Point): void {
    const editorStore = useEditorStore.getState()
    const tileMapStore = useTileMapStore.getState()

    const layer = editorStore.layers[editorStore.currentLayerIndex]
    if (!layer || layer.type !== 'tilemap' || !layer.tilemapData) return

    const mapData = layer.tilemapData
    const cell = mapData.cells[tilePos.y]?.[tilePos.x]

    if (cell && cell.tilesetId && cell.tileIndex >= 0) {
      tileMapStore.selectTile(cell.tilesetId, cell.tileIndex)
      tileMapStore.setFlipH(cell.flipH)
      tileMapStore.setFlipV(cell.flipV)
      tileMapStore.setRotate90(cell.rotate90)
    }
  }

  private updateRectPreview(currentPos: Point): void {
    if (!this.startTile) return

    const minX = Math.min(this.startTile.x, currentPos.x)
    const maxX = Math.max(this.startTile.x, currentPos.x)
    const minY = Math.min(this.startTile.y, currentPos.y)
    const maxY = Math.max(this.startTile.y, currentPos.y)

    this.previewTiles = []
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        this.previewTiles.push({ x, y })
      }
    }
  }

  drawIndicator(ctx: CanvasRenderingContext2D, pos: Point, color: string): void {
    const editorStore = useEditorStore.getState()
    const layer = editorStore.layers[editorStore.currentLayerIndex]

    if (!layer || layer.type !== 'tilemap' || !layer.tilemapData) {
      // Draw standard crosshair if not on tilemap layer
      ctx.strokeStyle = color
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(pos.x - 4, pos.y)
      ctx.lineTo(pos.x + 4, pos.y)
      ctx.moveTo(pos.x, pos.y - 4)
      ctx.lineTo(pos.x, pos.y + 4)
      ctx.stroke()
      return
    }

    const mapData = layer.tilemapData
    const tilePos = pixelToTile(pos.x, pos.y, mapData.tileWidth, mapData.tileHeight)
    const pixelPos = tileToPixel(tilePos.x, tilePos.y, mapData.tileWidth, mapData.tileHeight)

    // Highlight current tile
    ctx.strokeStyle = color
    ctx.lineWidth = 2
    ctx.strokeRect(
      pixelPos.x,
      pixelPos.y,
      mapData.tileWidth,
      mapData.tileHeight
    )

    // Draw semi-transparent fill
    ctx.fillStyle = `${color}33`
    ctx.fillRect(
      pixelPos.x,
      pixelPos.y,
      mapData.tileWidth,
      mapData.tileHeight
    )
  }

  drawPreview(ctx: CanvasRenderingContext2D): void {
    const editorStore = useEditorStore.getState()
    const tileMapStore = useTileMapStore.getState()

    const layer = editorStore.layers[editorStore.currentLayerIndex]
    if (!layer || layer.type !== 'tilemap' || !layer.tilemapData) return

    const mapData = layer.tilemapData

    // Draw rectangle preview
    if (tileMapStore.editMode === 'rect' && this.previewTiles.length > 0) {
      ctx.fillStyle = 'rgba(100, 200, 255, 0.3)'
      ctx.strokeStyle = 'rgba(100, 200, 255, 0.8)'
      ctx.lineWidth = 1

      for (const tile of this.previewTiles) {
        const pixelPos = tileToPixel(tile.x, tile.y, mapData.tileWidth, mapData.tileHeight)
        ctx.fillRect(pixelPos.x, pixelPos.y, mapData.tileWidth, mapData.tileHeight)
        ctx.strokeRect(pixelPos.x, pixelPos.y, mapData.tileWidth, mapData.tileHeight)
      }
    }
  }
}

// Tool definition and registration
export const TileMapToolDefinition = defineToolWithFactory(
  'tilemap',
  'TileMap',
  'grid',
  'utility',
  () => new TileMapTool(),
  {
    layerTypes: [LayerType.TILEMAP],
    hint: 'Place and edit tiles on TileMap layers',
    shortcut: 'Y',
  }
)

ToolRegistry.register(TileMapToolDefinition)
