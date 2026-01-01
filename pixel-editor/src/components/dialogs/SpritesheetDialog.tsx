/**
 * Spritesheet Export Dialog
 * Export animation frames as a spritesheet
 */

import { useState, useEffect, useRef, useMemo } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { useEditorStore } from "@/store/editor-store"
import { createSpriteSheet, downloadCanvas, type SpriteSheetOptions } from "@/core/export"
import { compositeFrameLayers } from "@/core/layerCanvas"

interface SpritesheetDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type LayoutDirection = 'horizontal' | 'vertical' | 'custom'

export function SpritesheetDialog({ open, onOpenChange }: SpritesheetDialogProps) {
  const {
    projectName,
    width,
    height,
    frames,
    layers,
    animationTags
  } = useEditorStore()

  const previewCanvasRef = useRef<HTMLCanvasElement>(null)

  const [layout, setLayout] = useState<LayoutDirection>('horizontal')
  const [columns, setColumns] = useState(frames.length)
  const [rows, setRows] = useState(1)
  const [padding, setPadding] = useState(0)
  const [scale, setScale] = useState(1)
  const [format, setFormat] = useState<'png' | 'webp'>('png')
  const [exportTag, setExportTag] = useState<string>('all')
  const [isExporting, setIsExporting] = useState(false)

  // Calculate which frames to export based on tag selection
  const framesToExport = useMemo(() => {
    if (exportTag === 'all') {
      return frames.map((_, index) => index)
    }
    const tag = animationTags.find(t => t.id === exportTag)
    if (!tag) return frames.map((_, index) => index)
    const indices: number[] = []
    for (let i = tag.fromFrame; i <= tag.toFrame; i++) {
      if (i < frames.length) indices.push(i)
    }
    return indices
  }, [exportTag, animationTags, frames])

  // Update layout when frame count changes
  useEffect(() => {
    const frameCount = framesToExport.length
    if (layout === 'horizontal') {
      setColumns(frameCount)
      setRows(1)
    } else if (layout === 'vertical') {
      setColumns(1)
      setRows(frameCount)
    }
  }, [layout, framesToExport.length])

  // Calculate spritesheet dimensions
  const sheetWidth = useMemo(() => {
    return columns * width * scale + (columns - 1) * padding
  }, [columns, width, scale, padding])

  const sheetHeight = useMemo(() => {
    return rows * height * scale + (rows - 1) * padding
  }, [rows, height, scale, padding])

  // Generate preview
  useEffect(() => {
    if (!open || !previewCanvasRef.current) return

    const previewCtx = previewCanvasRef.current.getContext('2d')
    if (!previewCtx) return

    // Calculate preview scale to fit in 200x200 box
    const maxPreviewSize = 200
    const previewScale = Math.min(
      maxPreviewSize / sheetWidth,
      maxPreviewSize / sheetHeight,
      1
    )

    previewCanvasRef.current.width = Math.ceil(sheetWidth * previewScale)
    previewCanvasRef.current.height = Math.ceil(sheetHeight * previewScale)

    // Clear and draw preview background
    previewCtx.fillStyle = '#1a1a2e'
    previewCtx.fillRect(0, 0, previewCanvasRef.current.width, previewCanvasRef.current.height)

    // Draw grid to show frame positions
    previewCtx.strokeStyle = '#3b82f6'
    previewCtx.lineWidth = 1

    const cellWidth = (width * scale + padding) * previewScale
    const cellHeight = (height * scale + padding) * previewScale

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < columns; col++) {
        const frameIndex = row * columns + col
        if (frameIndex < framesToExport.length) {
          const x = col * cellWidth
          const y = row * cellHeight
          previewCtx.strokeRect(x + 0.5, y + 0.5, width * scale * previewScale - 1, height * scale * previewScale - 1)

          // Draw frame number
          previewCtx.fillStyle = '#fff'
          previewCtx.font = '10px monospace'
          previewCtx.fillText(String(framesToExport[frameIndex] + 1), x + 2, y + 12)
        }
      }
    }
  }, [open, columns, rows, width, height, scale, padding, sheetWidth, sheetHeight, framesToExport])

  const handleLayoutChange = (newLayout: LayoutDirection) => {
    setLayout(newLayout)
    const frameCount = framesToExport.length
    if (newLayout === 'horizontal') {
      setColumns(frameCount)
      setRows(1)
    } else if (newLayout === 'vertical') {
      setColumns(1)
      setRows(frameCount)
    }
  }

  const handleCustomDimensions = (newColumns: number, newRows: number) => {
    setLayout('custom')
    setColumns(Math.max(1, newColumns))
    setRows(Math.max(1, newRows))
  }

  const handleExport = async () => {
    setIsExporting(true)

    try {
      // Render each frame to a canvas
      const frameCanvases: HTMLCanvasElement[] = []

      for (const frameIndex of framesToExport) {
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')!
        ctx.imageSmoothingEnabled = false

        // Composite all visible layers for this frame
        compositeFrameLayers(ctx, layers, frameIndex, width, height)

        frameCanvases.push(canvas)
      }

      // Create spritesheet
      const options: SpriteSheetOptions = {
        format,
        columns,
        rows,
        padding,
        scale
      }

      const spritesheet = createSpriteSheet(frameCanvases, options)

      // Apply scale if needed
      let finalCanvas = spritesheet
      if (scale !== 1) {
        const scaledCanvas = document.createElement('canvas')
        scaledCanvas.width = spritesheet.width * scale
        scaledCanvas.height = spritesheet.height * scale
        const ctx = scaledCanvas.getContext('2d')!
        ctx.imageSmoothingEnabled = false
        ctx.drawImage(spritesheet, 0, 0, scaledCanvas.width, scaledCanvas.height)
        finalCanvas = scaledCanvas
      }

      // Download
      const tagSuffix = exportTag === 'all' ? '' : `_${animationTags.find(t => t.id === exportTag)?.name || ''}`
      const filename = `${projectName || 'spritesheet'}${tagSuffix}_${columns}x${rows}`
      await downloadCanvas(finalCanvas, filename, { format })

      onOpenChange(false)
    } catch (error) {
      console.error('Failed to export spritesheet:', error)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Export Spritesheet</DialogTitle>
          <DialogDescription>
            Combine animation frames into a single spritesheet image
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Tag selection */}
          {animationTags.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-medium">Frames to Export</label>
              <select
                value={exportTag}
                onChange={(e) => setExportTag(e.target.value)}
                className="input w-full text-sm"
              >
                <option value="all">All Frames ({frames.length})</option>
                {animationTags.map((tag) => (
                  <option key={tag.id} value={tag.id}>
                    {tag.name} (frames {tag.fromFrame + 1}-{tag.toFrame + 1})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Layout */}
          <div className="space-y-2">
            <label className="text-xs font-medium">Layout</label>
            <div className="flex gap-2">
              <button
                className={`btn flex-1 text-xs ${layout === 'horizontal' ? 'bg-pix-accent' : ''}`}
                onClick={() => handleLayoutChange('horizontal')}
              >
                Horizontal
              </button>
              <button
                className={`btn flex-1 text-xs ${layout === 'vertical' ? 'bg-pix-accent' : ''}`}
                onClick={() => handleLayoutChange('vertical')}
              >
                Vertical
              </button>
              <button
                className={`btn flex-1 text-xs ${layout === 'custom' ? 'bg-pix-accent' : ''}`}
                onClick={() => setLayout('custom')}
              >
                Custom
              </button>
            </div>
          </div>

          {/* Custom dimensions */}
          {layout === 'custom' && (
            <div className="flex gap-4">
              <div className="flex-1 space-y-1">
                <label className="text-xs">Columns</label>
                <input
                  type="number"
                  value={columns}
                  onChange={(e) => handleCustomDimensions(parseInt(e.target.value) || 1, rows)}
                  className="input w-full text-sm"
                  min={1}
                  max={framesToExport.length}
                />
              </div>
              <div className="flex-1 space-y-1">
                <label className="text-xs">Rows</label>
                <input
                  type="number"
                  value={rows}
                  onChange={(e) => handleCustomDimensions(columns, parseInt(e.target.value) || 1)}
                  className="input w-full text-sm"
                  min={1}
                  max={framesToExport.length}
                />
              </div>
            </div>
          )}

          {/* Padding and Scale */}
          <div className="flex gap-4">
            <div className="flex-1 space-y-1">
              <label className="text-xs">Padding (px)</label>
              <input
                type="number"
                value={padding}
                onChange={(e) => setPadding(Math.max(0, parseInt(e.target.value) || 0))}
                className="input w-full text-sm"
                min={0}
                max={32}
              />
            </div>
            <div className="flex-1 space-y-1">
              <label className="text-xs">Scale</label>
              <select
                value={scale}
                onChange={(e) => setScale(parseInt(e.target.value))}
                className="input w-full text-sm"
              >
                <option value={1}>1x</option>
                <option value={2}>2x</option>
                <option value={4}>4x</option>
                <option value={8}>8x</option>
              </select>
            </div>
            <div className="flex-1 space-y-1">
              <label className="text-xs">Format</label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as 'png' | 'webp')}
                className="input w-full text-sm"
              >
                <option value="png">PNG</option>
                <option value="webp">WebP</option>
              </select>
            </div>
          </div>

          {/* Preview */}
          <div className="space-y-2">
            <label className="text-xs font-medium">Preview</label>
            <div className="flex justify-center p-4 bg-pix-bg rounded border border-pix-border">
              <canvas
                ref={previewCanvasRef}
                className="border border-pix-border"
                style={{ imageRendering: 'pixelated' }}
              />
            </div>
          </div>

          {/* Info */}
          <div className="text-xs text-pix-text-muted bg-pix-bg rounded p-2 space-y-1">
            <div>Frames: {framesToExport.length} ({width}x{height} each)</div>
            <div>Output: {sheetWidth}x{sheetHeight} pixels</div>
            {scale > 1 && (
              <div>Scaled: {sheetWidth * scale}x{sheetHeight * scale} pixels</div>
            )}
          </div>
        </div>

        <DialogFooter>
          <button className="btn" onClick={() => onOpenChange(false)}>
            Cancel
          </button>
          <button
            className="btn bg-pix-accent"
            onClick={handleExport}
            disabled={isExporting || framesToExport.length === 0}
          >
            {isExporting ? 'Exporting...' : 'Export'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
