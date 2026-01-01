/**
 * Grid Settings Dialog
 * Configure grid display and snapping options
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
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useEditorStore } from "@/store/editor-store"

interface GridSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function GridSettingsDialog({ open, onOpenChange }: GridSettingsDialogProps) {
  const {
    gridSize,
    gridType,
    showGrid,
    snapToGrid,
    isometricCellWidth,
    isometricCellHeight,
    setGridSize,
    setGridType,
    toggleGrid,
    toggleSnapToGrid,
    setIsometricCellSize,
  } = useEditorStore()

  const [localGridSize, setLocalGridSize] = useState(gridSize)
  const [localGridType, setLocalGridType] = useState(gridType)
  const [localShowGrid, setLocalShowGrid] = useState(showGrid)
  const [localSnapToGrid, setLocalSnapToGrid] = useState(snapToGrid)
  const [localIsoWidth, setLocalIsoWidth] = useState(isometricCellWidth)
  const [localIsoHeight, setLocalIsoHeight] = useState(isometricCellHeight)

  // Sync local state when dialog opens
  useEffect(() => {
    if (open) {
      setLocalGridSize(gridSize)
      setLocalGridType(gridType)
      setLocalShowGrid(showGrid)
      setLocalSnapToGrid(snapToGrid)
      setLocalIsoWidth(isometricCellWidth)
      setLocalIsoHeight(isometricCellHeight)
    }
  }, [open, gridSize, gridType, showGrid, snapToGrid, isometricCellWidth, isometricCellHeight])

  const handleApply = () => {
    setGridSize(localGridSize)
    setGridType(localGridType)
    if (localShowGrid !== showGrid) toggleGrid()
    if (localSnapToGrid !== snapToGrid) toggleSnapToGrid()
    setIsometricCellSize(localIsoWidth, localIsoHeight)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Grid Settings</DialogTitle>
          <DialogDescription>
            Configure the grid display and snapping behavior.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Show Grid */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="show-grid"
              checked={localShowGrid}
              onChange={(e) => setLocalShowGrid(e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <Label htmlFor="show-grid">Show Grid</Label>
          </div>

          {/* Snap to Grid */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="snap-grid"
              checked={localSnapToGrid}
              onChange={(e) => setLocalSnapToGrid(e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <Label htmlFor="snap-grid">Snap to Grid</Label>
          </div>

          {/* Grid Type */}
          <div className="space-y-2">
            <Label>Grid Type</Label>
            <div className="flex gap-2">
              <Button
                variant={localGridType === 'rectangular' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setLocalGridType('rectangular')}
                className="flex-1"
              >
                Rectangular
              </Button>
              <Button
                variant={localGridType === 'isometric' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setLocalGridType('isometric')}
                className="flex-1"
              >
                Isometric
              </Button>
            </div>
          </div>

          {/* Grid Size (for rectangular) */}
          {localGridType === 'rectangular' && (
            <div className="space-y-2">
              <Label htmlFor="grid-size">Grid Size (pixels)</Label>
              <Input
                id="grid-size"
                type="number"
                min={1}
                max={64}
                value={localGridSize}
                onChange={(e) => setLocalGridSize(Math.max(1, Math.min(64, parseInt(e.target.value) || 1)))}
              />
            </div>
          )}

          {/* Isometric Settings */}
          {localGridType === 'isometric' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="iso-width">Cell Width</Label>
                  <Input
                    id="iso-width"
                    type="number"
                    min={1}
                    max={32}
                    value={localIsoWidth}
                    onChange={(e) => setLocalIsoWidth(Math.max(1, Math.min(32, parseInt(e.target.value) || 1)))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="iso-height">Cell Height</Label>
                  <Input
                    id="iso-height"
                    type="number"
                    min={1}
                    max={32}
                    value={localIsoHeight}
                    onChange={(e) => setLocalIsoHeight(Math.max(1, Math.min(32, parseInt(e.target.value) || 1)))}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Isometric ratio: {localIsoWidth}:{localIsoHeight}
              </p>
            </div>
          )}

          {/* Grid Preview */}
          <div className="border rounded p-3 bg-muted/30">
            <div
              className="w-full h-24 relative overflow-hidden rounded"
              style={{
                backgroundColor: '#1a1a2e',
                backgroundImage: localGridType === 'rectangular'
                  ? `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                     linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`
                  : 'none',
                backgroundSize: localGridType === 'rectangular'
                  ? `${localGridSize * 2}px ${localGridSize * 2}px`
                  : 'auto',
              }}
            >
              {localGridType === 'isometric' && (
                <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.3 }}>
                  <pattern id="iso-preview" width={localIsoWidth * 8} height={localIsoHeight * 8} patternUnits="userSpaceOnUse">
                    <path
                      d={`M0 ${localIsoHeight * 4} L${localIsoWidth * 4} 0 L${localIsoWidth * 8} ${localIsoHeight * 4} L${localIsoWidth * 4} ${localIsoHeight * 8} Z`}
                      fill="none"
                      stroke="white"
                      strokeWidth="0.5"
                    />
                  </pattern>
                  <rect width="100%" height="100%" fill="url(#iso-preview)" />
                </svg>
              )}
              <div className="absolute inset-0 flex items-center justify-center text-xs text-white/50">
                Grid Preview
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleApply}>
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
