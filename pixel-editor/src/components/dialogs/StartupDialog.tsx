/**
 * Startup Dialog
 * Initial dialog shown when the app loads to create a new canvas
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
import { resetLayerCanvasManager } from "@/core/layerCanvas"

interface StartupDialogProps {
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

export function StartupDialog({ open, onOpenChange }: StartupDialogProps) {
  const [width, setWidth] = useState(64)
  const [height, setHeight] = useState(64)
  const [fillColor, setFillColor] = useState("#00000000") // Transparent
  const [isTransparent, setIsTransparent] = useState(true)

  const { newProject, setProjectName } = useEditorStore()
  const history = getHistory()

  const handleCreate = () => {
    // Reset the layer canvas manager first
    resetLayerCanvasManager(width, height)

    // Create the new project with fill color
    const color = isTransparent ? "#00000000" : fillColor
    newProject(width, height, color)
    setProjectName("Untitled")
    history.clear()
    onOpenChange(false)
  }

  const handlePreset = (preset: typeof PRESETS[0]) => {
    setWidth(preset.width)
    setHeight(preset.height)
  }

  const handleColorChange = (color: string) => {
    setFillColor(color)
    setIsTransparent(false)
  }

  const handleTransparentClick = () => {
    setIsTransparent(true)
    setFillColor("#00000000")
  }

  const handleSkip = () => {
    // Create a default 64x64 canvas
    resetLayerCanvasManager(64, 64)
    newProject(64, 64, "#00000000")
    setProjectName("Untitled")
    history.clear()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <span className="text-2xl">🎨</span>
            Welcome to Pixel Editor
          </DialogTitle>
          <DialogDescription>
            Create a new canvas to start your pixel art project.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Presets */}
          <div>
            <label className="block text-sm font-medium mb-2">Canvas Presets</label>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  className={`btn text-pix-xs py-1 px-2.5 transition-colors ${
                    width === preset.width && height === preset.height
                      ? "bg-pix-accent text-white"
                      : ""
                  }`}
                  onClick={() => handlePreset(preset)}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          {/* Dimensions */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Width (px)</label>
              <input
                type="number"
                className="input w-full"
                value={width}
                onChange={(e) => setWidth(Math.max(1, Math.min(4096, parseInt(e.target.value) || 1)))}
                min={1}
                max={4096}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Height (px)</label>
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

          {/* Background Color */}
          <div>
            <label className="block text-sm font-medium mb-2">Background</label>
            <div className="flex items-center gap-3">
              <button
                className={`btn py-1.5 px-3 flex items-center gap-2 ${
                  isTransparent ? "bg-pix-accent text-white" : ""
                }`}
                onClick={handleTransparentClick}
              >
                <span className="w-4 h-4 inline-block checker-bg border border-gray-400 rounded-sm" />
                Transparent
              </button>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  className="w-8 h-8 cursor-pointer rounded border border-gray-400"
                  value={fillColor === "#00000000" ? "#ffffff" : fillColor}
                  onChange={(e) => handleColorChange(e.target.value)}
                />
                <button
                  className={`btn py-1.5 px-3 ${!isTransparent ? "bg-pix-accent text-white" : ""}`}
                  onClick={() => setIsTransparent(false)}
                  style={{
                    backgroundColor: !isTransparent ? fillColor : undefined,
                    color: !isTransparent ? getContrastColor(fillColor) : undefined,
                  }}
                >
                  Solid Color
                </button>
              </div>
            </div>
          </div>

          {/* Canvas Info */}
          <div className="text-sm text-pix-text-muted bg-pix-panel p-2 rounded">
            Canvas size: <strong>{width} x {height}</strong> ({(width * height).toLocaleString()} pixels)
          </div>
        </div>

        <DialogFooter>
          <button
            className="btn py-2 px-4"
            onClick={handleSkip}
          >
            Skip (64x64)
          </button>
          <button
            className="btn bg-pix-accent text-white py-2 px-6 text-base"
            onClick={handleCreate}
          >
            Create Canvas
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Helper to get contrasting text color
function getContrastColor(hexColor: string): string {
  if (!hexColor || hexColor === "#00000000") return "#ffffff"
  const hex = hexColor.replace("#", "")
  const r = parseInt(hex.substr(0, 2), 16)
  const g = parseInt(hex.substr(2, 2), 16)
  const b = parseInt(hex.substr(4, 2), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.5 ? "#000000" : "#ffffff"
}
