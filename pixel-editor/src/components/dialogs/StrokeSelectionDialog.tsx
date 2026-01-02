/**
 * StrokeSelectionDialog - Dialog for stroke selection settings
 * Allows configuring stroke width and position (inside/outside)
 */

import { useState, useCallback } from "react"
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
import { Slider } from "@/components/ui/slider"
import { useEditorStore } from "@/store/editor-store"

interface StrokeSelectionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function StrokeSelectionDialog({
  open,
  onOpenChange,
}: StrokeSelectionDialogProps) {
  const [strokeWidth, setStrokeWidth] = useState(1)
  const [strokePosition, setStrokePosition] = useState<'inside' | 'outside'>('inside')

  const { strokeSelection, primaryColor, selection } = useEditorStore()

  const handleApply = useCallback(() => {
    strokeSelection(primaryColor, strokeWidth, strokePosition === 'inside')
    onOpenChange(false)
  }, [strokeSelection, primaryColor, strokeWidth, strokePosition, onOpenChange])

  const handleClose = useCallback(() => {
    onOpenChange(false)
  }, [onOpenChange])

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Stroke Selection</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            Draw an outline around the selection using the current foreground color.
          </p>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="stroke-width">Stroke Width</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="stroke-width"
                  type="number"
                  min={1}
                  max={50}
                  value={strokeWidth}
                  onChange={(e) => setStrokeWidth(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))}
                  className="w-16 text-right"
                />
                <span className="text-sm text-muted-foreground w-6">px</span>
              </div>
            </div>

            <Slider
              value={[strokeWidth]}
              min={1}
              max={50}
              step={1}
              onValueChange={([v]) => setStrokeWidth(v)}
            />

            <div className="space-y-2">
              <Label>Stroke Position</Label>
              <div className="flex gap-2">
                <Button
                  variant={strokePosition === 'inside' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStrokePosition('inside')}
                  className="flex-1"
                >
                  Inside
                </Button>
                <Button
                  variant={strokePosition === 'outside' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStrokePosition('outside')}
                  className="flex-1"
                >
                  Outside
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <span className="text-sm text-muted-foreground">Color:</span>
              <div
                className="w-6 h-6 rounded border border-border"
                style={{ backgroundColor: primaryColor }}
              />
              <span className="text-sm font-mono">{primaryColor}</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleApply} disabled={!selection.active}>
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
