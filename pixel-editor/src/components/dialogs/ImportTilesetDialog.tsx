/**
 * ImportTilesetDialog - Dialog for importing tileset images
 */

import { useState, useCallback, useRef } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { useTileMapStore } from "@/store/tilemap-store"

interface ImportTilesetDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ImportTilesetDialog({ open, onOpenChange }: ImportTilesetDialogProps) {
  const [name, setName] = useState("Tileset")
  const [tileWidth, setTileWidth] = useState(16)
  const [tileHeight, setTileHeight] = useState(16)
  const [spacing, setSpacing] = useState(0)
  const [margin, setMargin] = useState(0)
  const [imageData, setImageData] = useState<ImageData | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const addTileset = useTileMapStore((s) => s.addTileset)

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Set name from filename (without extension)
    const fileName = file.name.replace(/\.[^.]+$/, '')
    setName(fileName)

    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      // Create canvas to get ImageData
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0)
      const data = ctx.getImageData(0, 0, img.width, img.height)
      setImageData(data)
      setPreviewUrl(url)
    }

    img.src = url
  }, [])

  const handleImport = useCallback(() => {
    if (!imageData || !name) return

    const id = `tileset-${Date.now()}`
    addTileset(id, name, imageData, tileWidth, tileHeight, spacing, margin)

    // Reset and close
    setImageData(null)
    setPreviewUrl(null)
    setName("Tileset")
    onOpenChange(false)
  }, [imageData, name, tileWidth, tileHeight, spacing, margin, addTileset, onOpenChange])

  const handleClose = useCallback(() => {
    setImageData(null)
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
    setPreviewUrl(null)
    onOpenChange(false)
  }, [previewUrl, onOpenChange])

  const tileCount = imageData
    ? Math.floor((imageData.width - margin * 2 + spacing) / (tileWidth + spacing)) *
      Math.floor((imageData.height - margin * 2 + spacing) / (tileHeight + spacing))
    : 0

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Import Tileset</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* File input */}
          <div className="space-y-2">
            <Label>Image File</Label>
            <Input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
            />
          </div>

          {/* Preview */}
          {previewUrl && (
            <div className="border rounded p-2 bg-muted/50">
              <img
                src={previewUrl}
                alt="Tileset preview"
                className="max-w-full max-h-32 object-contain mx-auto"
                style={{ imageRendering: 'pixelated' }}
              />
              {imageData && (
                <p className="text-xs text-center text-muted-foreground mt-1">
                  {imageData.width} x {imageData.height} px
                </p>
              )}
            </div>
          )}

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="tileset-name">Name</Label>
            <Input
              id="tileset-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tileset name"
            />
          </div>

          {/* Tile dimensions */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tile-width">Tile Width</Label>
              <Input
                id="tile-width"
                type="number"
                min={1}
                max={256}
                value={tileWidth}
                onChange={(e) => setTileWidth(parseInt(e.target.value) || 16)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tile-height">Tile Height</Label>
              <Input
                id="tile-height"
                type="number"
                min={1}
                max={256}
                value={tileHeight}
                onChange={(e) => setTileHeight(parseInt(e.target.value) || 16)}
              />
            </div>
          </div>

          {/* Spacing and margin */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="spacing">Spacing</Label>
              <Input
                id="spacing"
                type="number"
                min={0}
                max={64}
                value={spacing}
                onChange={(e) => setSpacing(parseInt(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="margin">Margin</Label>
              <Input
                id="margin"
                type="number"
                min={0}
                max={64}
                value={margin}
                onChange={(e) => setMargin(parseInt(e.target.value) || 0)}
              />
            </div>
          </div>

          {/* Tile count */}
          {imageData && (
            <p className="text-sm text-muted-foreground">
              Detected {tileCount} tiles
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={!imageData}>
            Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
