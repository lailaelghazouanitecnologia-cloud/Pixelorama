/**
 * Isometric Grid Settings Dialog
 * Configure the cell dimensions for the isometric grid overlay
 */

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { useEditorStore } from '@/store/editor-store'
import type { DialogProps } from './DialogManager'

export function IsometricGridDialog({ open, onOpenChange }: DialogProps) {
  const { isometricCellWidth, isometricCellHeight, setIsometricCellSize, setGridType } = useEditorStore()

  const [cellWidth, setCellWidth] = useState(isometricCellWidth)
  const [cellHeight, setCellHeight] = useState(isometricCellHeight)

  const handleApply = () => {
    setIsometricCellSize(cellWidth, cellHeight)
    setGridType('isometric')
    onOpenChange(false)
  }

  const handlePreset = (width: number, height: number) => {
    setCellWidth(width)
    setCellHeight(height)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Isometric Grid Settings</DialogTitle>
          <DialogDescription>
            Configure the cell dimensions for the isometric grid. The ratio determines the angle of the grid lines.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Presets */}
          <div>
            <label className="text-pix-xs text-pix-text-muted block mb-2">Presets</label>
            <div className="flex gap-2 flex-wrap">
              <button
                className={`btn text-xs ${cellWidth === 2 && cellHeight === 1 ? 'bg-pix-accent' : ''}`}
                onClick={() => handlePreset(2, 1)}
              >
                2:1 (Standard)
              </button>
              <button
                className={`btn text-xs ${cellWidth === 4 && cellHeight === 2 ? 'bg-pix-accent' : ''}`}
                onClick={() => handlePreset(4, 2)}
              >
                4:2 (Large)
              </button>
              <button
                className={`btn text-xs ${cellWidth === 1 && cellHeight === 1 ? 'bg-pix-accent' : ''}`}
                onClick={() => handlePreset(1, 1)}
              >
                1:1 (45deg)
              </button>
              <button
                className={`btn text-xs ${cellWidth === 3 && cellHeight === 1 ? 'bg-pix-accent' : ''}`}
                onClick={() => handlePreset(3, 1)}
              >
                3:1 (Shallow)
              </button>
            </div>
          </div>

          {/* Cell Width */}
          <div>
            <label className="text-pix-xs text-pix-text-muted block mb-1">
              Cell Width (pixels)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                className="slider flex-1"
                value={cellWidth}
                onChange={(e) => setCellWidth(parseInt(e.target.value))}
                min={1}
                max={16}
              />
              <input
                type="number"
                className="input w-16 text-center"
                value={cellWidth}
                onChange={(e) => setCellWidth(Math.max(1, Math.min(16, parseInt(e.target.value) || 1)))}
                min={1}
                max={16}
              />
            </div>
          </div>

          {/* Cell Height */}
          <div>
            <label className="text-pix-xs text-pix-text-muted block mb-1">
              Cell Height (pixels)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                className="slider flex-1"
                value={cellHeight}
                onChange={(e) => setCellHeight(parseInt(e.target.value))}
                min={1}
                max={16}
              />
              <input
                type="number"
                className="input w-16 text-center"
                value={cellHeight}
                onChange={(e) => setCellHeight(Math.max(1, Math.min(16, parseInt(e.target.value) || 1)))}
                min={1}
                max={16}
              />
            </div>
          </div>

          {/* Preview */}
          <div>
            <label className="text-pix-xs text-pix-text-muted block mb-2">Preview</label>
            <div
              className="border rounded p-4 flex items-center justify-center"
              style={{ backgroundColor: 'var(--pix-bg-tertiary)', borderColor: 'var(--pix-border)' }}
            >
              <svg width="200" height="100" className="overflow-visible">
                {/* Generate preview isometric grid */}
                {(() => {
                  const lines: React.ReactNode[] = []
                  const cellW = cellWidth * 8
                  const cellH = cellHeight * 8

                  // Background
                  lines.push(
                    <rect
                      key="bg"
                      x="0"
                      y="0"
                      width="200"
                      height="100"
                      fill="var(--pix-bg-primary)"
                      rx="4"
                    />
                  )

                  // Diagonal lines going down-right
                  for (let i = -10; i <= 20; i++) {
                    const startX = i * cellW
                    const startY = 0
                    const endX = startX + 100 * (cellW / cellH)
                    const endY = 100

                    lines.push(
                      <line
                        key={`dr-${i}`}
                        x1={startX}
                        y1={startY}
                        x2={endX}
                        y2={endY}
                        stroke="rgba(255,255,255,0.3)"
                        strokeWidth="1"
                      />
                    )
                  }

                  // Diagonal lines going down-left
                  for (let i = -10; i <= 30; i++) {
                    const startX = i * cellW
                    const startY = 0
                    const endX = startX - 100 * (cellW / cellH)
                    const endY = 100

                    lines.push(
                      <line
                        key={`dl-${i}`}
                        x1={startX}
                        y1={startY}
                        x2={endX}
                        y2={endY}
                        stroke="rgba(255,255,255,0.3)"
                        strokeWidth="1"
                      />
                    )
                  }

                  return lines
                })()}
              </svg>
            </div>
            <p className="text-pix-xs text-pix-text-muted mt-1 text-center">
              Ratio: {cellWidth}:{cellHeight} ({Math.round(Math.atan2(cellHeight, cellWidth) * 180 / Math.PI)}deg)
            </p>
          </div>
        </div>

        <DialogFooter>
          <button className="btn" onClick={() => onOpenChange(false)}>
            Cancel
          </button>
          <button className="btn bg-pix-accent" onClick={handleApply}>
            Apply
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
