/**
 * Resize Canvas Dialog
 * Resize the canvas with anchor options
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

interface ResizeCanvasDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type Anchor = 'top-left' | 'top' | 'top-right' | 'left' | 'center' | 'right' | 'bottom-left' | 'bottom' | 'bottom-right'

const ANCHORS: { value: Anchor; label: string }[] = [
  { value: 'top-left', label: '↖' },
  { value: 'top', label: '↑' },
  { value: 'top-right', label: '↗' },
  { value: 'left', label: '←' },
  { value: 'center', label: '•' },
  { value: 'right', label: '→' },
  { value: 'bottom-left', label: '↙' },
  { value: 'bottom', label: '↓' },
  { value: 'bottom-right', label: '↘' },
]

export function ResizeCanvasDialog({ open, onOpenChange }: ResizeCanvasDialogProps) {
  const { width: currentWidth, height: currentHeight, setCanvasSize } = useEditorStore()

  const [width, setWidth] = useState(currentWidth)
  const [height, setHeight] = useState(currentHeight)
  const [anchor, setAnchor] = useState<Anchor>('center')
  const [keepRatio, setKeepRatio] = useState(false)
  const [aspectRatio, setAspectRatio] = useState(currentWidth / currentHeight)

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

  const handleResize = () => {
    // For now, just set the new canvas size
    // TODO: Implement proper resize with anchor positioning and content preservation
    setCanvasSize(width, height)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[350px]">
        <DialogHeader>
          <DialogTitle>Resize Canvas</DialogTitle>
          <DialogDescription>
            Change the canvas dimensions. Content will be repositioned based on anchor.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Size */}
          <div className="text-pix-xs text-pix-text-muted">
            Current size: {currentWidth} x {currentHeight}
          </div>

          {/* New Dimensions */}
          <div className="grid grid-cols-2 gap-4">
            <div className="form-row flex-col items-start">
              <label>Width</label>
              <input
                type="number"
                className="input w-full"
                value={width}
                onChange={(e) => handleWidthChange(Math.max(1, Math.min(4096, parseInt(e.target.value) || 1)))}
                min={1}
                max={4096}
              />
            </div>
            <div className="form-row flex-col items-start">
              <label>Height</label>
              <input
                type="number"
                className="input w-full"
                value={height}
                onChange={(e) => handleHeightChange(Math.max(1, Math.min(4096, parseInt(e.target.value) || 1)))}
                min={1}
                max={4096}
              />
            </div>
          </div>

          {/* Keep Ratio */}
          <div className="form-row">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4"
                checked={keepRatio}
                onChange={(e) => setKeepRatio(e.target.checked)}
              />
              <span className="text-xs">Maintain aspect ratio</span>
            </label>
          </div>

          {/* Anchor */}
          <div className="form-row flex-col items-start">
            <label className="mb-2">Anchor</label>
            <div className="grid grid-cols-3 gap-1 mx-auto">
              {ANCHORS.map((a) => (
                <button
                  key={a.value}
                  className={`w-8 h-8 text-sm ${anchor === a.value ? 'bg-pix-accent' : 'btn'}`}
                  onClick={() => setAnchor(a.value)}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          {/* Size Change Info */}
          <div className="text-pix-xs text-pix-text-muted p-2 bg-pix-bg rounded">
            <div>
              Change: {width > currentWidth ? '+' : ''}{width - currentWidth} x {height > currentHeight ? '+' : ''}{height - currentHeight}
            </div>
          </div>
        </div>

        <DialogFooter>
          <button className="btn" onClick={() => onOpenChange(false)}>
            Cancel
          </button>
          <button className="btn bg-pix-accent" onClick={handleResize}>
            Resize
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
