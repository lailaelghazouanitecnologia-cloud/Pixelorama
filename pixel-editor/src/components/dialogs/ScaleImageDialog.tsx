/**
 * Scale Image Dialog
 * Scale the image to new dimensions (resizes content)
 */

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { useEditorStore } from "@/store/editor-store"

interface ScaleImageDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type Interpolation = 'nearest' | 'bilinear'

const PRESETS = [
  { label: '50%', scale: 0.5 },
  { label: '100%', scale: 1 },
  { label: '200%', scale: 2 },
  { label: '400%', scale: 4 },
  { label: '800%', scale: 8 },
]

export function ScaleImageDialog({ open, onOpenChange }: ScaleImageDialogProps) {
  const { width: currentWidth, height: currentHeight, scaleImage } = useEditorStore()

  const [width, setWidth] = useState(currentWidth)
  const [height, setHeight] = useState(currentHeight)
  const [keepRatio, setKeepRatio] = useState(true)
  const [aspectRatio, setAspectRatio] = useState(currentWidth / currentHeight)
  const [interpolation, setInterpolation] = useState<Interpolation>('nearest')

  useEffect(() => {
    if (open) {
      setWidth(currentWidth)
      setHeight(currentHeight)
      setAspectRatio(currentWidth / currentHeight)
    }
  }, [open, currentWidth, currentHeight])

  const handleWidthChange = (newWidth: number) => {
    setWidth(newWidth)
    if (keepRatio) {
      setHeight(Math.round(newWidth / aspectRatio))
    }
  }

  const handleHeightChange = (newHeight: number) => {
    setHeight(newHeight)
    if (keepRatio) {
      setWidth(Math.round(newHeight * aspectRatio))
    }
  }

  const handlePreset = (scale: number) => {
    const newWidth = Math.round(currentWidth * scale)
    const newHeight = Math.round(currentHeight * scale)
    setWidth(newWidth)
    setHeight(newHeight)
  }

  const handleScale = () => {
    scaleImage(width, height, interpolation)
    onOpenChange(false)
  }

  const scalePercent = {
    x: Math.round((width / currentWidth) * 100),
    y: Math.round((height / currentHeight) * 100),
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Scale Image</DialogTitle>
          <DialogDescription>
            Resize the image and its content to new dimensions
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Size */}
          <div className="text-xs text-pix-text-muted">
            Current size: {currentWidth} x {currentHeight}
          </div>

          {/* Presets */}
          <div className="space-y-1">
            <label className="text-xs font-medium">Presets</label>
            <div className="flex gap-1">
              {PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  className="btn text-xs px-2 py-1 flex-1"
                  onClick={() => handlePreset(preset.scale)}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* New Dimensions */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs">Width</label>
              <div className="flex gap-1 items-center">
                <input
                  type="number"
                  className="input flex-1"
                  value={width}
                  onChange={(e) => handleWidthChange(Math.max(1, Math.min(4096, parseInt(e.target.value) || 1)))}
                  min={1}
                  max={4096}
                />
                <span className="text-xs text-pix-text-muted w-12">
                  {scalePercent.x}%
                </span>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs">Height</label>
              <div className="flex gap-1 items-center">
                <input
                  type="number"
                  className="input flex-1"
                  value={height}
                  onChange={(e) => handleHeightChange(Math.max(1, Math.min(4096, parseInt(e.target.value) || 1)))}
                  min={1}
                  max={4096}
                />
                <span className="text-xs text-pix-text-muted w-12">
                  {scalePercent.y}%
                </span>
              </div>
            </div>
          </div>

          {/* Keep Ratio */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4"
              checked={keepRatio}
              onChange={(e) => setKeepRatio(e.target.checked)}
            />
            <span className="text-xs">Maintain aspect ratio</span>
          </label>

          {/* Interpolation */}
          <div className="space-y-1">
            <label className="text-xs font-medium">Interpolation</label>
            <div className="flex gap-2">
              <button
                className={`btn flex-1 text-xs ${interpolation === 'nearest' ? 'bg-pix-accent' : ''}`}
                onClick={() => setInterpolation('nearest')}
              >
                Nearest (Pixel Art)
              </button>
              <button
                className={`btn flex-1 text-xs ${interpolation === 'bilinear' ? 'bg-pix-accent' : ''}`}
                onClick={() => setInterpolation('bilinear')}
              >
                Bilinear (Smooth)
              </button>
            </div>
            <p className="text-xs text-pix-text-muted mt-1">
              {interpolation === 'nearest'
                ? 'Best for pixel art - preserves sharp edges'
                : 'Best for photos - produces smooth gradients'}
            </p>
          </div>
        </div>

        <DialogFooter>
          <button className="btn" onClick={() => onOpenChange(false)}>
            Cancel
          </button>
          <button
            className="btn bg-pix-accent"
            onClick={handleScale}
            disabled={width === currentWidth && height === currentHeight}
          >
            Scale
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
