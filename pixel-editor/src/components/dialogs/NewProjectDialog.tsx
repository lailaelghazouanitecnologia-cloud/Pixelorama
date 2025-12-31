/**
 * New Project Dialog
 * Create a new project with custom dimensions
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
import { getHistory } from "@/core/history"

interface NewProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// Common canvas presets
const PRESETS = [
  { name: "16x16", width: 16, height: 16 },
  { name: "32x32", width: 32, height: 32 },
  { name: "64x64", width: 64, height: 64 },
  { name: "128x128", width: 128, height: 128 },
  { name: "256x256", width: 256, height: 256 },
  { name: "Game Boy", width: 160, height: 144 },
  { name: "NES", width: 256, height: 240 },
  { name: "SNES", width: 256, height: 224 },
]

export function NewProjectDialog({ open, onOpenChange }: NewProjectDialogProps) {
  const [width, setWidth] = useState(64)
  const [height, setHeight] = useState(64)
  const [fillColor, setFillColor] = useState("#00000000") // Transparent

  const { newProject, setProjectName } = useEditorStore()
  const history = getHistory()

  const handleCreate = () => {
    newProject(width, height)
    setProjectName("Untitled")
    history.clear()
    onOpenChange(false)
  }

  const handlePreset = (preset: typeof PRESETS[0]) => {
    setWidth(preset.width)
    setHeight(preset.height)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>New Project</DialogTitle>
          <DialogDescription>
            Create a new pixel art project with the specified dimensions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Presets */}
          <div className="form-row flex-wrap">
            <label className="w-full mb-1">Presets</label>
            <div className="flex flex-wrap gap-1">
              {PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  className="btn text-pix-xs py-0.5 px-2"
                  onClick={() => handlePreset(preset)}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          {/* Dimensions */}
          <div className="grid grid-cols-2 gap-4">
            <div className="form-row flex-col items-start">
              <label>Width</label>
              <input
                type="number"
                className="input w-full"
                value={width}
                onChange={(e) => setWidth(Math.max(1, Math.min(4096, parseInt(e.target.value) || 1)))}
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
                onChange={(e) => setHeight(Math.max(1, Math.min(4096, parseInt(e.target.value) || 1)))}
                min={1}
                max={4096}
              />
            </div>
          </div>

          {/* Fill Color */}
          <div className="form-row">
            <label>Fill Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                className="w-8 h-8 cursor-pointer"
                value={fillColor === "#00000000" ? "#ffffff" : fillColor}
                onChange={(e) => setFillColor(e.target.value)}
              />
              <button
                className={`btn text-pix-xs py-0.5 px-2 ${fillColor === "#00000000" ? "bg-pix-accent" : ""}`}
                onClick={() => setFillColor("#00000000")}
              >
                Transparent
              </button>
            </div>
          </div>

          {/* Info */}
          <div className="text-pix-xs text-pix-text-muted">
            Canvas size: {width} x {height} ({(width * height).toLocaleString()} pixels)
          </div>
        </div>

        <DialogFooter>
          <button className="btn" onClick={() => onOpenChange(false)}>
            Cancel
          </button>
          <button className="btn bg-pix-accent" onClick={handleCreate}>
            Create
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
