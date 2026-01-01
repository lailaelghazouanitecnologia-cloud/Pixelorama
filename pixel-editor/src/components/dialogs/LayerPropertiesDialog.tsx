/**
 * Layer Properties Dialog
 * Edit layer name, opacity, blend mode and other properties
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
import { useEditorStore, type BlendMode } from "@/store/editor-store"
import { Eye, EyeOff, Lock, Unlock, Link, Unlink } from "lucide-react"

interface LayerPropertiesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// All blend modes with groupings
const BLEND_MODES: { value: BlendMode; label: string; group: string }[] = [
  { value: 'normal', label: 'Normal', group: 'Normal' },
  { value: 'darken', label: 'Darken', group: 'Darken' },
  { value: 'multiply', label: 'Multiply', group: 'Darken' },
  { value: 'color-burn', label: 'Color Burn', group: 'Darken' },
  { value: 'linear-burn', label: 'Linear Burn', group: 'Darken' },
  { value: 'lighten', label: 'Lighten', group: 'Lighten' },
  { value: 'screen', label: 'Screen', group: 'Lighten' },
  { value: 'color-dodge', label: 'Color Dodge', group: 'Lighten' },
  { value: 'linear-dodge', label: 'Add (Linear Dodge)', group: 'Lighten' },
  { value: 'overlay', label: 'Overlay', group: 'Contrast' },
  { value: 'soft-light', label: 'Soft Light', group: 'Contrast' },
  { value: 'hard-light', label: 'Hard Light', group: 'Contrast' },
  { value: 'difference', label: 'Difference', group: 'Inversion' },
  { value: 'exclusion', label: 'Exclusion', group: 'Inversion' },
  { value: 'subtract', label: 'Subtract', group: 'Inversion' },
  { value: 'divide', label: 'Divide', group: 'Inversion' },
  { value: 'hue', label: 'Hue', group: 'Component' },
  { value: 'saturation', label: 'Saturation', group: 'Component' },
  { value: 'color', label: 'Color', group: 'Component' },
  { value: 'luminosity', label: 'Luminosity', group: 'Component' },
]

const BLEND_MODE_GROUPS = ['Normal', 'Darken', 'Lighten', 'Contrast', 'Inversion', 'Component']

export function LayerPropertiesDialog({ open, onOpenChange }: LayerPropertiesDialogProps) {
  const {
    layers,
    currentLayerIndex,
    renameLayer,
    setLayerOpacity,
    setLayerBlendMode,
    toggleLayerVisibility,
    toggleLayerLock,
    toggleClipping,
  } = useEditorStore()

  const currentLayer = layers[currentLayerIndex]

  const [name, setName] = useState("")
  const [opacity, setOpacity] = useState(100)
  const [blendMode, setBlendMode] = useState<BlendMode>('normal')
  const [visible, setVisible] = useState(true)
  const [locked, setLocked] = useState(false)
  const [clipping, setClipping] = useState(false)

  // Sync local state when dialog opens or layer changes
  useEffect(() => {
    if (open && currentLayer) {
      setName(currentLayer.name)
      setOpacity(currentLayer.opacity)
      setBlendMode(currentLayer.blendMode)
      setVisible(currentLayer.visible)
      setLocked(currentLayer.locked)
      setClipping(currentLayer.clippingMask || false)
    }
  }, [open, currentLayer])

  const handleApply = () => {
    if (!currentLayer) return

    if (name !== currentLayer.name) {
      renameLayer(currentLayerIndex, name)
    }
    if (opacity !== currentLayer.opacity) {
      setLayerOpacity(currentLayerIndex, opacity)
    }
    if (blendMode !== currentLayer.blendMode) {
      setLayerBlendMode(currentLayerIndex, blendMode)
    }
    if (visible !== currentLayer.visible) {
      toggleLayerVisibility(currentLayerIndex)
    }
    if (locked !== currentLayer.locked) {
      toggleLayerLock(currentLayerIndex)
    }
    if (clipping !== (currentLayer.clippingMask || false)) {
      toggleClipping(currentLayerIndex)
    }

    onOpenChange(false)
  }

  if (!currentLayer) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Layer Properties</DialogTitle>
          <DialogDescription>
            Edit properties for "{currentLayer.name}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Layer Name */}
          <div className="space-y-2">
            <Label htmlFor="layer-name">Name</Label>
            <Input
              id="layer-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Layer name"
            />
          </div>

          {/* Opacity */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Opacity</Label>
              <span className="text-sm text-muted-foreground">{opacity}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={opacity}
              onChange={(e) => setOpacity(parseInt(e.target.value))}
              className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Blend Mode */}
          <div className="space-y-2">
            <Label>Blend Mode</Label>
            <select
              className="w-full px-3 py-2 border rounded-md bg-background"
              value={blendMode}
              onChange={(e) => setBlendMode(e.target.value as BlendMode)}
            >
              {BLEND_MODE_GROUPS.map((group) => (
                <optgroup key={group} label={group}>
                  {BLEND_MODES.filter((mode) => mode.group === group).map((mode) => (
                    <option key={mode.value} value={mode.value}>
                      {mode.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {/* Toggle Options */}
          <div className="flex gap-2">
            <Button
              variant={visible ? "default" : "outline"}
              size="sm"
              onClick={() => setVisible(!visible)}
              className="flex-1"
            >
              {visible ? <Eye className="w-4 h-4 mr-2" /> : <EyeOff className="w-4 h-4 mr-2" />}
              {visible ? "Visible" : "Hidden"}
            </Button>

            <Button
              variant={locked ? "default" : "outline"}
              size="sm"
              onClick={() => setLocked(!locked)}
              className="flex-1"
            >
              {locked ? <Lock className="w-4 h-4 mr-2" /> : <Unlock className="w-4 h-4 mr-2" />}
              {locked ? "Locked" : "Unlocked"}
            </Button>
          </div>

          {/* Clipping Mask */}
          <div className="flex items-center gap-2">
            <Button
              variant={clipping ? "default" : "outline"}
              size="sm"
              onClick={() => setClipping(!clipping)}
            >
              {clipping ? <Link className="w-4 h-4 mr-2" /> : <Unlink className="w-4 h-4 mr-2" />}
              {clipping ? "Clipping Mask" : "No Clipping"}
            </Button>
            <span className="text-xs text-muted-foreground">
              Clips to layer below
            </span>
          </div>

          {/* Layer Info */}
          <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded">
            <div>Type: {currentLayer.type || 'raster'}</div>
            <div>Index: {currentLayerIndex + 1} of {layers.length}</div>
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
