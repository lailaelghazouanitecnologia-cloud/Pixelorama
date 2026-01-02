/**
 * Gradient Dialog - Apply gradient fills to the canvas
 * Based on Pixelorama's GradientDialog.gd
 */

import { useState, useEffect, useRef, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { useEditorStore } from "@/store/editor-store"

interface GradientDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type GradientShape = 'linear' | 'radial'
type GradientRepeat = 'none' | 'repeat' | 'mirror'

interface GradientSettings {
  shape: GradientShape
  repeat: GradientRepeat
  position: number       // 0-100, offset along gradient axis
  size: number           // 0-200, scale of gradient
  angle: number          // 0-360 degrees
  centerX: number        // 0-100, center position for radial
  centerY: number        // 0-100
  radiusX: number        // 0-200, ellipse radius
  radiusY: number        // 0-200
  dithering: boolean
  ditheringStrength: number // 0-100
  startColor: string
  endColor: string
}

const DEFAULT_SETTINGS: GradientSettings = {
  shape: 'linear',
  repeat: 'none',
  position: 50,
  size: 100,
  angle: 0,
  centerX: 50,
  centerY: 50,
  radiusX: 100,
  radiusY: 100,
  dithering: true,
  ditheringStrength: 50,
  startColor: '#000000',
  endColor: '#ffffff',
}

// Bayer 4x4 dithering matrix
const BAYER_4X4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
]

export function GradientDialog({ open, onOpenChange }: GradientDialogProps) {
  const { width, height, frames, currentFrameIndex, currentLayerIndex, primaryColor, secondaryColor, history } = useEditorStore()
  const [settings, setSettings] = useState<GradientSettings>({
    ...DEFAULT_SETTINGS,
    startColor: primaryColor,
    endColor: secondaryColor,
  })
  const [originalData, setOriginalData] = useState<ImageData | null>(null)
  const previewCanvasRef = useRef<HTMLCanvasElement>(null)

  // Load original data when dialog opens
  useEffect(() => {
    if (open) {
      setSettings(s => ({ ...s, startColor: primaryColor, endColor: secondaryColor }))
      loadOriginalData()
    } else {
      setOriginalData(null)
    }
  }, [open, primaryColor, secondaryColor])

  const loadOriginalData = useCallback(() => {
    const frame = frames[currentFrameIndex]
    if (!frame) return

    const layer = frame.layers[currentLayerIndex]
    if (!layer || !layer.imageData) return

    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(img, 0, 0)
        const data = ctx.getImageData(0, 0, width, height)
        setOriginalData(data)
      }
    }
    img.src = layer.imageData
  }, [frames, currentFrameIndex, currentLayerIndex, width, height])

  // Update preview when settings change
  useEffect(() => {
    if (!originalData) return
    drawPreview()
  }, [settings, originalData])

  const parseColor = (hex: string): { r: number; g: number; b: number } => {
    return {
      r: parseInt(hex.slice(1, 3), 16),
      g: parseInt(hex.slice(3, 5), 16),
      b: parseInt(hex.slice(5, 7), 16),
    }
  }

  const drawPreview = () => {
    const canvas = previewCanvasRef.current
    if (!canvas || !originalData) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const gradientData = generateGradient(width, height)
    ctx.putImageData(gradientData, 0, 0)
  }

  const generateGradient = (w: number, h: number): ImageData => {
    const data = new Uint8ClampedArray(w * h * 4)
    const startColor = parseColor(settings.startColor)
    const endColor = parseColor(settings.endColor)

    const centerX = (settings.centerX / 100) * w
    const centerY = (settings.centerY / 100) * h
    const angleRad = (settings.angle * Math.PI) / 180
    const scale = settings.size / 100
    const offset = (settings.position - 50) / 100

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let t: number

        if (settings.shape === 'linear') {
          // Linear gradient
          const dx = x - w / 2
          const dy = y - h / 2

          // Rotate coordinates
          const rotX = dx * Math.cos(angleRad) + dy * Math.sin(angleRad)

          // Calculate gradient position
          const gradientLen = (Math.max(w, h) / 2) * scale
          t = (rotX / gradientLen + 1) / 2 + offset
        } else {
          // Radial gradient
          const dx = (x - centerX) / (settings.radiusX / 100)
          const dy = (y - centerY) / (settings.radiusY / 100)
          const dist = Math.sqrt(dx * dx + dy * dy)
          const radius = (Math.min(w, h) / 2) * scale
          t = dist / radius + offset
        }

        // Apply repeat mode
        if (settings.repeat === 'repeat') {
          t = ((t % 1) + 1) % 1
        } else if (settings.repeat === 'mirror') {
          t = Math.abs(((t + 1) % 2) - 1)
        } else {
          t = Math.max(0, Math.min(1, t))
        }

        // Apply dithering
        if (settings.dithering) {
          const threshold = BAYER_4X4[y % 4][x % 4] / 16
          const strength = settings.ditheringStrength / 100 * 0.1
          t = t + (threshold - 0.5) * strength
          t = Math.max(0, Math.min(1, t))
        }

        // Interpolate color
        const r = Math.round(startColor.r + (endColor.r - startColor.r) * t)
        const g = Math.round(startColor.g + (endColor.g - startColor.g) * t)
        const b = Math.round(startColor.b + (endColor.b - startColor.b) * t)

        const idx = (y * w + x) * 4
        data[idx] = r
        data[idx + 1] = g
        data[idx + 2] = b
        data[idx + 3] = 255
      }
    }

    return new ImageData(data, w, h)
  }

  const handleApply = () => {
    if (!originalData) return

    const frame = frames[currentFrameIndex]
    if (!frame) return

    // Generate final gradient
    const gradientData = generateGradient(width, height)

    // Convert to base64
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.putImageData(gradientData, 0, 0)
    const newImageData = canvas.toDataURL('image/png')

    // Update layer
    const updateLayers = useEditorStore.getState().updateLayers
    const newLayers = [...frame.layers]
    newLayers[currentLayerIndex] = {
      ...newLayers[currentLayerIndex],
      imageData: newImageData,
    }

    // Add to history
    const originalBase64 = (() => {
      const c = document.createElement('canvas')
      c.width = width
      c.height = height
      const x = c.getContext('2d')
      if (x && originalData) {
        x.putImageData(originalData, 0, 0)
        return c.toDataURL('image/png')
      }
      return ''
    })()

    history.addAction({
      name: 'Gradient Fill',
      undo: () => {
        const currentFrame = useEditorStore.getState().frames[currentFrameIndex]
        if (currentFrame) {
          const restoredLayers = [...currentFrame.layers]
          restoredLayers[currentLayerIndex] = {
            ...restoredLayers[currentLayerIndex],
            imageData: originalBase64,
          }
          updateLayers(restoredLayers)
        }
      },
      redo: () => {
        const currentFrame = useEditorStore.getState().frames[currentFrameIndex]
        if (currentFrame) {
          const reapplyLayers = [...currentFrame.layers]
          reapplyLayers[currentLayerIndex] = {
            ...reapplyLayers[currentLayerIndex],
            imageData: newImageData,
          }
          updateLayers(reapplyLayers)
        }
      },
    })

    updateLayers(newLayers)
    onOpenChange(false)
  }

  const updateSetting = <K extends keyof GradientSettings>(key: K, value: GradientSettings[K]) => {
    setSettings(s => ({ ...s, [key]: value }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Gradient</DialogTitle>
          <DialogDescription>
            Apply a gradient fill to the current layer
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-4">
          {/* Preview */}
          <div className="flex-1 flex items-center justify-center bg-pix-bg rounded border border-pix-border overflow-hidden">
            <canvas
              ref={previewCanvasRef}
              width={width}
              height={height}
              className="max-w-full max-h-48 object-contain checker-bg"
              style={{ imageRendering: 'pixelated' }}
            />
          </div>

          {/* Controls */}
          <div className="w-64 space-y-3 max-h-80 overflow-y-auto">
            {/* Shape */}
            <div>
              <label className="text-xs text-pix-text-muted">Shape</label>
              <select
                className="input-field w-full mt-1"
                value={settings.shape}
                onChange={(e) => updateSetting('shape', e.target.value as GradientShape)}
              >
                <option value="linear">Linear</option>
                <option value="radial">Radial</option>
              </select>
            </div>

            {/* Colors */}
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs text-pix-text-muted">Start</label>
                <input
                  type="color"
                  className="w-full h-8 mt-1 cursor-pointer"
                  value={settings.startColor}
                  onChange={(e) => updateSetting('startColor', e.target.value)}
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-pix-text-muted">End</label>
                <input
                  type="color"
                  className="w-full h-8 mt-1 cursor-pointer"
                  value={settings.endColor}
                  onChange={(e) => updateSetting('endColor', e.target.value)}
                />
              </div>
            </div>

            {/* Repeat */}
            <div>
              <label className="text-xs text-pix-text-muted">Repeat</label>
              <select
                className="input-field w-full mt-1"
                value={settings.repeat}
                onChange={(e) => updateSetting('repeat', e.target.value as GradientRepeat)}
              >
                <option value="none">None</option>
                <option value="repeat">Repeat</option>
                <option value="mirror">Mirror</option>
              </select>
            </div>

            {/* Position & Size */}
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs text-pix-text-muted">Position</label>
                <input
                  type="range"
                  className="w-full mt-1"
                  min={0}
                  max={100}
                  value={settings.position}
                  onChange={(e) => updateSetting('position', parseInt(e.target.value))}
                />
              </div>
              <span className="w-8 text-xs text-right self-end">{settings.position}%</span>
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs text-pix-text-muted">Size</label>
                <input
                  type="range"
                  className="w-full mt-1"
                  min={10}
                  max={200}
                  value={settings.size}
                  onChange={(e) => updateSetting('size', parseInt(e.target.value))}
                />
              </div>
              <span className="w-8 text-xs text-right self-end">{settings.size}%</span>
            </div>

            {/* Angle (linear only) */}
            {settings.shape === 'linear' && (
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-xs text-pix-text-muted">Angle</label>
                  <input
                    type="range"
                    className="w-full mt-1"
                    min={0}
                    max={360}
                    value={settings.angle}
                    onChange={(e) => updateSetting('angle', parseInt(e.target.value))}
                  />
                </div>
                <span className="w-8 text-xs text-right self-end">{settings.angle}°</span>
              </div>
            )}

            {/* Center (radial only) */}
            {settings.shape === 'radial' && (
              <>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-xs text-pix-text-muted">Center X</label>
                    <input
                      type="range"
                      className="w-full mt-1"
                      min={0}
                      max={100}
                      value={settings.centerX}
                      onChange={(e) => updateSetting('centerX', parseInt(e.target.value))}
                    />
                  </div>
                  <span className="w-8 text-xs text-right self-end">{settings.centerX}%</span>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-xs text-pix-text-muted">Center Y</label>
                    <input
                      type="range"
                      className="w-full mt-1"
                      min={0}
                      max={100}
                      value={settings.centerY}
                      onChange={(e) => updateSetting('centerY', parseInt(e.target.value))}
                    />
                  </div>
                  <span className="w-8 text-xs text-right self-end">{settings.centerY}%</span>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-xs text-pix-text-muted">Radius X</label>
                    <input
                      type="range"
                      className="w-full mt-1"
                      min={10}
                      max={200}
                      value={settings.radiusX}
                      onChange={(e) => updateSetting('radiusX', parseInt(e.target.value))}
                    />
                  </div>
                  <span className="w-8 text-xs text-right self-end">{settings.radiusX}%</span>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-xs text-pix-text-muted">Radius Y</label>
                    <input
                      type="range"
                      className="w-full mt-1"
                      min={10}
                      max={200}
                      value={settings.radiusY}
                      onChange={(e) => updateSetting('radiusY', parseInt(e.target.value))}
                    />
                  </div>
                  <span className="w-8 text-xs text-right self-end">{settings.radiusY}%</span>
                </div>
              </>
            )}

            {/* Dithering */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="dithering"
                checked={settings.dithering}
                onChange={(e) => updateSetting('dithering', e.target.checked)}
              />
              <label htmlFor="dithering" className="text-xs">Dithering</label>
            </div>

            {settings.dithering && (
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-xs text-pix-text-muted">Strength</label>
                  <input
                    type="range"
                    className="w-full mt-1"
                    min={0}
                    max={100}
                    value={settings.ditheringStrength}
                    onChange={(e) => updateSetting('ditheringStrength', parseInt(e.target.value))}
                  />
                </div>
                <span className="w-8 text-xs text-right self-end">{settings.ditheringStrength}%</span>
              </div>
            )}
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
