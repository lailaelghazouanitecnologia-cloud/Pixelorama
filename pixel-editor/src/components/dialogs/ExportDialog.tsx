/**
 * Export Dialog
 * Export the current project to various formats
 */

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { useEditorStore } from "@/store/editor-store"
import { downloadCanvas, type ExportOptions, type ExportFormat } from "@/core/export"

interface ExportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const FORMATS: { value: ExportFormat; label: string; ext: string }[] = [
  { value: 'png', label: 'PNG', ext: '.png' },
  { value: 'jpeg', label: 'JPEG', ext: '.jpg' },
  { value: 'webp', label: 'WebP', ext: '.webp' },
]

const SCALE_OPTIONS = [1, 2, 4, 8, 16]

export function ExportDialog({ open, onOpenChange }: ExportDialogProps) {
  const { projectName, width, height } = useEditorStore()

  const [fileName, setFileName] = useState(projectName || "untitled")
  const [format, setFormat] = useState<ExportFormat>('png')
  const [scale, setScale] = useState(1)
  const [quality, setQuality] = useState(90)
  const [includeBackground, setIncludeBackground] = useState(false)

  const handleExport = () => {
    const canvas = document.querySelector('canvas') as HTMLCanvasElement
    if (!canvas) return

    let exportCanvas = canvas

    // Scale if needed
    if (scale > 1) {
      exportCanvas = document.createElement('canvas')
      exportCanvas.width = canvas.width * scale
      exportCanvas.height = canvas.height * scale
      const ctx = exportCanvas.getContext('2d')
      if (ctx) {
        ctx.imageSmoothingEnabled = false
        ctx.drawImage(canvas, 0, 0, exportCanvas.width, exportCanvas.height)
      }
    }

    const options: ExportOptions = {
      format,
      quality: quality / 100,
      scale,
      includeBackground,
    }

    downloadCanvas(exportCanvas, fileName, options)
    onOpenChange(false)
  }

  const exportWidth = width * scale
  const exportHeight = height * scale

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Export Image</DialogTitle>
          <DialogDescription>
            Export your artwork to an image file.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Name */}
          <div className="form-row flex-col items-start">
            <label>File Name</label>
            <div className="flex items-center gap-2 w-full">
              <input
                type="text"
                className="input flex-1"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder="untitled"
              />
              <span className="text-pix-text-muted text-xs">
                {FORMATS.find(f => f.value === format)?.ext}
              </span>
            </div>
          </div>

          {/* Format */}
          <div className="form-row">
            <label>Format</label>
            <div className="flex gap-1">
              {FORMATS.map((f) => (
                <button
                  key={f.value}
                  className={`btn text-pix-xs py-0.5 px-3 ${format === f.value ? 'bg-pix-accent' : ''}`}
                  onClick={() => setFormat(f.value)}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Scale */}
          <div className="form-row">
            <label>Scale</label>
            <div className="flex gap-1">
              {SCALE_OPTIONS.map((s) => (
                <button
                  key={s}
                  className={`btn text-pix-xs py-0.5 px-2 ${scale === s ? 'bg-pix-accent' : ''}`}
                  onClick={() => setScale(s)}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>

          {/* Quality (for JPEG/WebP) */}
          {(format === 'jpeg' || format === 'webp') && (
            <div className="form-row">
              <label>Quality</label>
              <input
                type="range"
                className="slider flex-1"
                value={quality}
                onChange={(e) => setQuality(parseInt(e.target.value))}
                min={1}
                max={100}
              />
              <span className="text-pix-xs w-8 text-right">{quality}%</span>
            </div>
          )}

          {/* Include Background */}
          <div className="form-row">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4"
                checked={includeBackground}
                onChange={(e) => setIncludeBackground(e.target.checked)}
              />
              <span className="text-xs">Include background color</span>
            </label>
          </div>

          {/* Export Info */}
          <div className="text-pix-xs text-pix-text-muted p-2 bg-pix-bg rounded">
            <div>Output size: {exportWidth} x {exportHeight} pixels</div>
            <div>Original: {width} x {height} @ {scale}x scale</div>
          </div>
        </div>

        <DialogFooter>
          <button className="btn" onClick={() => onOpenChange(false)}>
            Cancel
          </button>
          <button className="btn bg-pix-accent" onClick={handleExport}>
            Export
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
