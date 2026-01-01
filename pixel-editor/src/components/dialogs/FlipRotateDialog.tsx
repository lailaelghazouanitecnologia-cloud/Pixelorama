/**
 * Flip/Rotate Dialog
 * Transform the current layer or selection
 */

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { useEditorStore } from "@/store/editor-store"
import {
  FlipHorizontal,
  FlipVertical,
  RotateCw,
  RotateCcw,
  RefreshCw,
} from "lucide-react"

interface FlipRotateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function FlipRotateDialog({ open, onOpenChange }: FlipRotateDialogProps) {
  const {
    flipHorizontal,
    flipVertical,
    rotate90CW,
    rotate90CCW,
    rotate180,
    hasSelection,
    layers,
    currentLayerIndex,
  } = useEditorStore()

  const currentLayer = layers[currentLayerIndex]
  const targetText = hasSelection ? "selection" : "current layer"

  const handleFlipH = () => {
    flipHorizontal()
    onOpenChange(false)
  }

  const handleFlipV = () => {
    flipVertical()
    onOpenChange(false)
  }

  const handleRotateCW = () => {
    rotate90CW()
    onOpenChange(false)
  }

  const handleRotateCCW = () => {
    rotate90CCW()
    onOpenChange(false)
  }

  const handleRotate180 = () => {
    rotate180()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Flip / Rotate</DialogTitle>
          <DialogDescription>
            Transform the {targetText}: "{currentLayer?.name}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Flip Options */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Flip</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                className="h-20 flex flex-col gap-2"
                onClick={handleFlipH}
              >
                <FlipHorizontal className="w-8 h-8" />
                <span className="text-xs">Flip Horizontal</span>
              </Button>
              <Button
                variant="outline"
                className="h-20 flex flex-col gap-2"
                onClick={handleFlipV}
              >
                <FlipVertical className="w-8 h-8" />
                <span className="text-xs">Flip Vertical</span>
              </Button>
            </div>
          </div>

          {/* Rotate Options */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Rotate</Label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant="outline"
                className="h-20 flex flex-col gap-2"
                onClick={handleRotateCCW}
              >
                <RotateCcw className="w-8 h-8" />
                <span className="text-xs">90° CCW</span>
              </Button>
              <Button
                variant="outline"
                className="h-20 flex flex-col gap-2"
                onClick={handleRotate180}
              >
                <RefreshCw className="w-8 h-8" />
                <span className="text-xs">180°</span>
              </Button>
              <Button
                variant="outline"
                className="h-20 flex flex-col gap-2"
                onClick={handleRotateCW}
              >
                <RotateCw className="w-8 h-8" />
                <span className="text-xs">90° CW</span>
              </Button>
            </div>
          </div>

          {/* Info */}
          <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded">
            <p>Transformations are applied to the {targetText}.</p>
            <p className="mt-1">Use Ctrl+Z to undo after applying.</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
