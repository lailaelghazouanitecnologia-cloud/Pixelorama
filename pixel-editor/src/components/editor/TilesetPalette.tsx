/**
 * TilesetPalette Component - UI for selecting tiles from tilesets
 * Used when editing TileMap layers
 */

import { useRef, useEffect, useState, useCallback } from "react"
import { useTileMapStore } from "@/store/tilemap-store"
import { useEditorStore } from "@/store/editor-store"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  getTileRect,
  getTileCount,
  type Tileset,
} from "@/core/tilemap"

interface TilesetPaletteProps {
  className?: string
}

export function TilesetPalette({ className = "" }: TilesetPaletteProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [scale, setScale] = useState(2)
  const [hoveredTile, setHoveredTile] = useState<number | null>(null)

  const tilesets = useTileMapStore((s) => s.tilesets)
  const currentTilesetId = useTileMapStore((s) => s.currentTilesetId)
  const selectedTiles = useTileMapStore((s) => s.selectedTiles)
  const editMode = useTileMapStore((s) => s.editMode)
  const flipH = useTileMapStore((s) => s.flipH)
  const flipV = useTileMapStore((s) => s.flipV)
  const rotate90 = useTileMapStore((s) => s.rotate90)
  const selectTile = useTileMapStore((s) => s.selectTile)
  const selectTileset = useTileMapStore((s) => s.selectTileset)
  const setEditMode = useTileMapStore((s) => s.setEditMode)
  const toggleFlipH = useTileMapStore((s) => s.toggleFlipH)
  const toggleFlipV = useTileMapStore((s) => s.toggleFlipV)
  const toggleRotate90 = useTileMapStore((s) => s.toggleRotate90)

  const layers = useEditorStore((s) => s.layers)
  const currentLayerIndex = useEditorStore((s) => s.currentLayerIndex)

  const currentLayer = layers[currentLayerIndex]
  const isTileMapLayer = currentLayer?.type === 'tilemap'
  const currentTileset = currentTilesetId ? tilesets.get(currentTilesetId) : null

  // Render tileset to canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !currentTileset) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { image, tileWidth, tileHeight, columns, rows, spacing, margin } = currentTileset
    const width = margin * 2 + columns * (tileWidth + spacing) - spacing
    const height = margin * 2 + rows * (tileHeight + spacing) - spacing

    canvas.width = width
    canvas.height = height

    ctx.imageSmoothingEnabled = false
    ctx.clearRect(0, 0, width, height)

    // Draw tileset image
    const tempCanvas = new OffscreenCanvas(image.width, image.height)
    const tempCtx = tempCanvas.getContext('2d')!
    tempCtx.putImageData(image, 0, 0)
    ctx.drawImage(tempCanvas, 0, 0)

    // Draw grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'
    ctx.lineWidth = 1

    const tileCount = getTileCount(currentTileset)
    for (let i = 0; i < tileCount; i++) {
      const rect = getTileRect(currentTileset, i)
      ctx.strokeRect(rect.x + 0.5, rect.y + 0.5, rect.width - 1, rect.height - 1)
    }

    // Highlight selected tile
    if (selectedTiles && selectedTiles.tilesetId === currentTilesetId) {
      ctx.strokeStyle = '#ffcc00'
      ctx.lineWidth = 2
      const rect = getTileRect(currentTileset, selectedTiles.startIndex)
      ctx.strokeRect(rect.x, rect.y, rect.width, rect.height)
    }

    // Highlight hovered tile
    if (hoveredTile !== null) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'
      const rect = getTileRect(currentTileset, hoveredTile)
      ctx.fillRect(rect.x, rect.y, rect.width, rect.height)
    }
  }, [currentTileset, currentTilesetId, selectedTiles, hoveredTile])

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!currentTileset || !currentTilesetId) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = (e.clientX - rect.left) / scale
    const y = (e.clientY - rect.top) / scale

    const { tileWidth, tileHeight, columns, rows, spacing, margin } = currentTileset

    const tileX = Math.floor((x - margin) / (tileWidth + spacing))
    const tileY = Math.floor((y - margin) / (tileHeight + spacing))

    if (tileX >= 0 && tileX < columns && tileY >= 0 && tileY < rows) {
      const index = tileY * columns + tileX
      selectTile(currentTilesetId, index)
    }
  }, [currentTileset, currentTilesetId, scale, selectTile])

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!currentTileset) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = (e.clientX - rect.left) / scale
    const y = (e.clientY - rect.top) / scale

    const { tileWidth, tileHeight, columns, rows, spacing, margin } = currentTileset

    const tileX = Math.floor((x - margin) / (tileWidth + spacing))
    const tileY = Math.floor((y - margin) / (tileHeight + spacing))

    if (tileX >= 0 && tileX < columns && tileY >= 0 && tileY < rows) {
      setHoveredTile(tileY * columns + tileX)
    } else {
      setHoveredTile(null)
    }
  }, [currentTileset, scale])

  const handleCanvasMouseLeave = useCallback(() => {
    setHoveredTile(null)
  }, [])

  if (!isTileMapLayer) {
    return (
      <div className={`p-4 text-center text-muted-foreground ${className}`}>
        <p>Select a TileMap layer to edit tiles</p>
      </div>
    )
  }

  if (tilesets.size === 0) {
    return (
      <div className={`p-4 text-center text-muted-foreground ${className}`}>
        <p>No tilesets loaded</p>
        <p className="text-sm mt-2">Import a tileset image to start editing</p>
      </div>
    )
  }

  return (
    <div className={`flex flex-col gap-2 p-2 ${className}`}>
      {/* Tileset selector */}
      {tilesets.size > 1 && (
        <div className="flex gap-1 flex-wrap">
          {Array.from(tilesets.entries()).map(([id, tileset]) => (
            <Button
              key={id}
              variant={currentTilesetId === id ? "secondary" : "ghost"}
              size="sm"
              onClick={() => selectTileset(id)}
            >
              {tileset.name}
            </Button>
          ))}
        </div>
      )}

      {/* Tile editing tools */}
      <div className="flex gap-1 items-center">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={editMode === 'place' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setEditMode('place')}
            >
              <span className="text-xs">P</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Place Tile (P)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={editMode === 'erase' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setEditMode('erase')}
            >
              <span className="text-xs">E</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Erase Tile (E)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={editMode === 'fill' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setEditMode('fill')}
            >
              <span className="text-xs">F</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Fill (F)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={editMode === 'rect' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setEditMode('rect')}
            >
              <span className="text-xs">R</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Rectangle Fill (R)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={editMode === 'picker' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setEditMode('picker')}
            >
              <span className="text-xs">I</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Pick Tile (I)</TooltipContent>
        </Tooltip>

        <div className="w-px h-6 bg-border mx-1" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={flipH ? 'secondary' : 'ghost'}
              size="icon"
              onClick={toggleFlipH}
            >
              <span className="text-xs">H</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Flip Horizontal (X)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={flipV ? 'secondary' : 'ghost'}
              size="icon"
              onClick={toggleFlipV}
            >
              <span className="text-xs">V</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Flip Vertical (Y)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={rotate90 ? 'secondary' : 'ghost'}
              size="icon"
              onClick={toggleRotate90}
            >
              <span className="text-xs">R</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Rotate 90 (R)</TooltipContent>
        </Tooltip>
      </div>

      {/* Zoom controls */}
      <div className="flex gap-1 items-center">
        <span className="text-xs text-muted-foreground">Zoom:</span>
        {[1, 2, 4].map((z) => (
          <Button
            key={z}
            variant={scale === z ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setScale(z)}
          >
            {z}x
          </Button>
        ))}
      </div>

      {/* Tileset canvas */}
      <ScrollArea className="flex-1 min-h-[200px] max-h-[400px]">
        <div className="p-2">
          {currentTileset && (
            <canvas
              ref={canvasRef}
              className="cursor-crosshair"
              style={{
                width: currentTileset.image.width * scale,
                height: currentTileset.image.height * scale,
                imageRendering: 'pixelated',
              }}
              onClick={handleCanvasClick}
              onMouseMove={handleCanvasMouseMove}
              onMouseLeave={handleCanvasMouseLeave}
            />
          )}
        </div>
      </ScrollArea>

      {/* Selected tile info */}
      {selectedTiles && (
        <div className="text-xs text-muted-foreground">
          Selected: Tile #{selectedTiles.startIndex}
          {flipH && ' | Flip H'}
          {flipV && ' | Flip V'}
          {rotate90 && ' | Rotate 90'}
        </div>
      )}
    </div>
  )
}
