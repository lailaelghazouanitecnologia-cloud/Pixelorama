/**
 * Effects Dialog
 * Apply image effects and filters to layers
 */

import { useState, useEffect, useCallback, useRef } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { useEditorStore } from "@/store/editor-store"
import { EFFECTS, applyEffect, type EffectType, type EffectDefinition } from "@/core/effects"

interface EffectsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type Category = 'color' | 'blur' | 'stylize' | 'transform'

const CATEGORIES: { id: Category; label: string }[] = [
  { id: 'color', label: 'Color' },
  { id: 'blur', label: 'Blur' },
  { id: 'stylize', label: 'Stylize' },
  { id: 'transform', label: 'Transform' },
]

export function EffectsDialog({ open, onOpenChange }: EffectsDialogProps) {
  const { width, height, layers, currentLayerIndex, frames, currentFrameIndex, history } = useEditorStore()

  const [selectedCategory, setSelectedCategory] = useState<Category>('color')
  const [selectedEffect, setSelectedEffect] = useState<EffectDefinition | null>(null)
  const [params, setParams] = useState<Record<string, number | boolean | string>>({})
  const [previewData, setPreviewData] = useState<ImageData | null>(null)
  const [originalData, setOriginalData] = useState<ImageData | null>(null)

  const previewCanvasRef = useRef<HTMLCanvasElement>(null)

  // Get current layer data
  const getCurrentLayerData = useCallback((): ImageData | null => {
    const frame = frames[currentFrameIndex]
    if (!frame) return null

    const layer = frame.layers[currentLayerIndex]
    if (!layer || !layer.imageData) return null

    // Convert base64 to ImageData
    return new Promise<ImageData | null>((resolve) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(img, 0, 0)
          resolve(ctx.getImageData(0, 0, width, height))
        } else {
          resolve(null)
        }
      }
      img.onerror = () => resolve(null)
      img.src = layer.imageData
    }) as unknown as ImageData | null
  }, [frames, currentFrameIndex, currentLayerIndex, width, height])

  // Load original data when dialog opens
  useEffect(() => {
    if (open) {
      const loadData = async () => {
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
            setPreviewData(data)
          }
        }
        img.src = layer.imageData
      }
      loadData()
    } else {
      setOriginalData(null)
      setPreviewData(null)
      setSelectedEffect(null)
      setParams({})
    }
  }, [open, frames, currentFrameIndex, currentLayerIndex, width, height])

  // Update preview when effect or params change
  useEffect(() => {
    if (!selectedEffect || !originalData) return

    const newPreview = applyEffect(originalData, selectedEffect.id, params)
    setPreviewData(newPreview)
  }, [selectedEffect, params, originalData])

  // Draw preview
  useEffect(() => {
    const canvas = previewCanvasRef.current
    if (!canvas || !previewData) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.putImageData(previewData, 0, 0)
  }, [previewData])

  // Select effect
  const handleSelectEffect = (effect: EffectDefinition) => {
    setSelectedEffect(effect)
    // Initialize params with defaults
    const defaultParams: Record<string, number | boolean | string> = {}
    effect.params.forEach(p => {
      defaultParams[p.key] = p.default
    })
    setParams(defaultParams)
  }

  // Update param value
  const handleParamChange = (key: string, value: number | boolean | string) => {
    setParams(prev => ({ ...prev, [key]: value }))
  }

  // Apply effect to layer
  const handleApply = () => {
    if (!selectedEffect || !previewData) return

    const frame = frames[currentFrameIndex]
    if (!frame) return

    // Convert ImageData to base64
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.putImageData(previewData, 0, 0)
    const newImageData = canvas.toDataURL('image/png')

    // Update layer in store
    const updateLayers = useEditorStore.getState().updateLayers
    const newLayers = [...frame.layers]
    newLayers[currentLayerIndex] = {
      ...newLayers[currentLayerIndex],
      imageData: newImageData,
    }

    // Add to history
    history.addAction({
      name: `Effect: ${selectedEffect.name}`,
      undo: () => {
        // Restore original
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

  // Get effects for current category
  const categoryEffects = EFFECTS.filter(e => e.category === selectedCategory)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Image Effects</DialogTitle>
          <DialogDescription>
            Apply effects and filters to the current layer
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-4 h-[400px]">
          {/* Left: Effect selection */}
          <div className="w-48 flex flex-col gap-2">
            {/* Category tabs */}
            <div className="flex flex-wrap gap-1">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  className={`btn text-xs px-2 py-1 ${selectedCategory === cat.id ? 'bg-pix-accent' : ''}`}
                  onClick={() => setSelectedCategory(cat.id)}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Effects list */}
            <div className="flex-1 overflow-y-auto border border-pix-border rounded p-1 space-y-1">
              {categoryEffects.map(effect => (
                <button
                  key={effect.id}
                  className={`w-full text-left px-2 py-1 text-xs rounded ${
                    selectedEffect?.id === effect.id ? 'bg-pix-accent' : 'hover:bg-pix-bg-secondary'
                  }`}
                  onClick={() => handleSelectEffect(effect)}
                >
                  {effect.name}
                </button>
              ))}
            </div>
          </div>

          {/* Right: Preview and params */}
          <div className="flex-1 flex flex-col gap-4">
            {/* Preview */}
            <div className="flex-1 flex items-center justify-center bg-pix-bg rounded border border-pix-border overflow-hidden">
              <canvas
                ref={previewCanvasRef}
                width={width}
                height={height}
                className="max-w-full max-h-full object-contain checker-bg"
                style={{ imageRendering: 'pixelated' }}
              />
            </div>

            {/* Parameters */}
            {selectedEffect && selectedEffect.params.length > 0 && (
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {selectedEffect.params.map(param => (
                  <div key={param.key} className="flex items-center gap-2">
                    <label className="text-xs w-24 flex-shrink-0">{param.name}</label>

                    {param.type === 'number' && (
                      <div className="flex-1 flex items-center gap-2">
                        <input
                          type="range"
                          className="flex-1"
                          min={param.min}
                          max={param.max}
                          step={param.step}
                          value={params[param.key] as number}
                          onChange={(e) => handleParamChange(param.key, parseFloat(e.target.value))}
                        />
                        <span className="text-xs w-10 text-right">
                          {params[param.key]}
                        </span>
                      </div>
                    )}

                    {param.type === 'boolean' && (
                      <input
                        type="checkbox"
                        checked={params[param.key] as boolean}
                        onChange={(e) => handleParamChange(param.key, e.target.checked)}
                      />
                    )}

                    {param.type === 'color' && (
                      <input
                        type="color"
                        value={params[param.key] as string}
                        onChange={(e) => handleParamChange(param.key, e.target.value)}
                        className="w-8 h-6"
                      />
                    )}
                  </div>
                ))}
              </div>
            )}

            {!selectedEffect && (
              <div className="text-center text-pix-text-muted text-xs">
                Select an effect from the list
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <button className="btn" onClick={() => onOpenChange(false)}>
            Cancel
          </button>
          <button
            className="btn bg-pix-accent"
            onClick={handleApply}
            disabled={!selectedEffect}
          >
            Apply Effect
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
