/**
 * LayerEffectsDialog - Dialog for managing layer effects
 * Based on Pixelorama's layer effects functionality
 *
 * Provides non-destructive effects that can be applied to layers:
 * - Drop Shadow, Inner Shadow
 * - Outer Glow, Inner Glow
 * - Stroke/Outline
 * - Color Overlay, Gradient Overlay
 */

import { useState, useCallback, useMemo } from "react"
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
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useEditorStore } from "@/store/editor-store"
import {
  type EffectType,
  type AnyLayerEffect,
  type DropShadowEffect,
  type InnerShadowEffect,
  type OuterGlowEffect,
  type InnerGlowEffect,
  type StrokeEffect,
  type ColorOverlayEffect,
  type GradientOverlayEffect,
  getEffectDisplayName,
  getAvailableEffectTypes,
} from "@/core/layerEffects"
import {
  ChevronUp,
  ChevronDown,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Layers,
} from "lucide-react"

interface LayerEffectsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function LayerEffectsDialog({
  open,
  onOpenChange,
}: LayerEffectsDialogProps) {
  const {
    layers,
    currentLayerIndex,
    addLayerEffect,
    removeLayerEffect,
    updateLayerEffect,
    toggleLayerEffect,
    reorderLayerEffects,
  } = useEditorStore()

  const currentLayer = layers[currentLayerIndex]
  const effects = currentLayer?.effects || []

  const [selectedEffectId, setSelectedEffectId] = useState<string | null>(
    effects[0]?.id || null
  )

  const selectedEffect = useMemo(
    () => effects.find((e) => e.id === selectedEffectId) || null,
    [effects, selectedEffectId]
  )

  const handleAddEffect = useCallback(
    (type: EffectType) => {
      addLayerEffect(currentLayerIndex, type)
      // Select the newly added effect
      const updatedEffects = useEditorStore.getState().layers[currentLayerIndex]?.effects || []
      if (updatedEffects.length > 0) {
        setSelectedEffectId(updatedEffects[updatedEffects.length - 1].id)
      }
    },
    [addLayerEffect, currentLayerIndex]
  )

  const handleRemoveEffect = useCallback(
    (effectId: string) => {
      removeLayerEffect(currentLayerIndex, effectId)
      if (selectedEffectId === effectId) {
        const remaining = effects.filter((e) => e.id !== effectId)
        setSelectedEffectId(remaining[0]?.id || null)
      }
    },
    [removeLayerEffect, currentLayerIndex, effects, selectedEffectId]
  )

  const handleToggleEffect = useCallback(
    (effectId: string) => {
      toggleLayerEffect(currentLayerIndex, effectId)
    },
    [toggleLayerEffect, currentLayerIndex]
  )

  const handleMoveEffect = useCallback(
    (fromIndex: number, direction: "up" | "down") => {
      const toIndex = direction === "up" ? fromIndex - 1 : fromIndex + 1
      if (toIndex >= 0 && toIndex < effects.length) {
        reorderLayerEffects(currentLayerIndex, fromIndex, toIndex)
      }
    },
    [reorderLayerEffects, currentLayerIndex, effects.length]
  )

  const handleUpdateEffect = useCallback(
    (effectId: string, updates: Partial<AnyLayerEffect>) => {
      updateLayerEffect(currentLayerIndex, effectId, updates)
    },
    [updateLayerEffect, currentLayerIndex]
  )

  const handleClose = useCallback(() => {
    onOpenChange(false)
  }, [onOpenChange])

  if (!currentLayer) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="w-5 h-5" />
            Layer Effects - {currentLayer.name}
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-4 h-[400px]">
          {/* Effects List */}
          <div className="w-1/3 flex flex-col border rounded-md">
            <div className="p-2 border-b bg-muted/50">
              <Select onValueChange={(value) => handleAddEffect(value as EffectType)}>
                <SelectTrigger className="h-8">
                  <Plus className="w-4 h-4 mr-1" />
                  <SelectValue placeholder="Add Effect..." />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableEffectTypes().map((type) => (
                    <SelectItem key={type} value={type}>
                      {getEffectDisplayName(type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <ScrollArea className="flex-1">
              {effects.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No effects applied.
                  <br />
                  Add an effect to get started.
                </div>
              ) : (
                <div className="p-1">
                  {effects.map((effect, index) => (
                    <div
                      key={effect.id}
                      className={`flex items-center gap-1 p-2 rounded cursor-pointer ${
                        selectedEffectId === effect.id
                          ? "bg-accent"
                          : "hover:bg-muted"
                      }`}
                      onClick={() => setSelectedEffectId(effect.id)}
                    >
                      <button
                        className="p-1 hover:bg-muted rounded"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleToggleEffect(effect.id)
                        }}
                        title={effect.enabled ? "Disable" : "Enable"}
                      >
                        {effect.enabled ? (
                          <Eye className="w-4 h-4" />
                        ) : (
                          <EyeOff className="w-4 h-4 text-muted-foreground" />
                        )}
                      </button>
                      <span
                        className={`flex-1 text-sm truncate ${
                          !effect.enabled ? "text-muted-foreground" : ""
                        }`}
                      >
                        {getEffectDisplayName(effect.type)}
                      </span>
                      <div className="flex gap-0.5">
                        <button
                          className="p-1 hover:bg-muted rounded disabled:opacity-30"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleMoveEffect(index, "up")
                          }}
                          disabled={index === 0}
                        >
                          <ChevronUp className="w-3 h-3" />
                        </button>
                        <button
                          className="p-1 hover:bg-muted rounded disabled:opacity-30"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleMoveEffect(index, "down")
                          }}
                          disabled={index === effects.length - 1}
                        >
                          <ChevronDown className="w-3 h-3" />
                        </button>
                        <button
                          className="p-1 hover:bg-destructive hover:text-destructive-foreground rounded"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRemoveEffect(effect.id)
                          }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Effect Settings */}
          <div className="flex-1 border rounded-md p-4 overflow-auto">
            {selectedEffect ? (
              <EffectSettings
                effect={selectedEffect}
                onUpdate={(updates) => handleUpdateEffect(selectedEffect.id, updates)}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                Select an effect to edit its settings
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface EffectSettingsProps {
  effect: AnyLayerEffect
  onUpdate: (updates: Partial<AnyLayerEffect>) => void
}

function EffectSettings({ effect, onUpdate }: EffectSettingsProps) {
  const renderCommonSettings = () => (
    <div className="space-y-4 mb-4 pb-4 border-b">
      <div className="flex items-center justify-between">
        <Label>Enabled</Label>
        <Switch
          checked={effect.enabled}
          onCheckedChange={(enabled) => onUpdate({ enabled })}
        />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Opacity</Label>
          <span className="text-sm text-muted-foreground">{effect.opacity}%</span>
        </div>
        <Slider
          value={[effect.opacity]}
          min={0}
          max={100}
          step={1}
          onValueChange={([opacity]) => onUpdate({ opacity })}
        />
      </div>
    </div>
  )

  switch (effect.type) {
    case "drop-shadow":
      return (
        <div className="space-y-4">
          <h3 className="font-medium">Drop Shadow</h3>
          {renderCommonSettings()}
          <DropShadowSettings
            effect={effect as DropShadowEffect}
            onUpdate={onUpdate}
          />
        </div>
      )
    case "inner-shadow":
      return (
        <div className="space-y-4">
          <h3 className="font-medium">Inner Shadow</h3>
          {renderCommonSettings()}
          <InnerShadowSettings
            effect={effect as InnerShadowEffect}
            onUpdate={onUpdate}
          />
        </div>
      )
    case "outer-glow":
      return (
        <div className="space-y-4">
          <h3 className="font-medium">Outer Glow</h3>
          {renderCommonSettings()}
          <OuterGlowSettings
            effect={effect as OuterGlowEffect}
            onUpdate={onUpdate}
          />
        </div>
      )
    case "inner-glow":
      return (
        <div className="space-y-4">
          <h3 className="font-medium">Inner Glow</h3>
          {renderCommonSettings()}
          <InnerGlowSettings
            effect={effect as InnerGlowEffect}
            onUpdate={onUpdate}
          />
        </div>
      )
    case "stroke":
      return (
        <div className="space-y-4">
          <h3 className="font-medium">Stroke</h3>
          {renderCommonSettings()}
          <StrokeSettings
            effect={effect as StrokeEffect}
            onUpdate={onUpdate}
          />
        </div>
      )
    case "color-overlay":
      return (
        <div className="space-y-4">
          <h3 className="font-medium">Color Overlay</h3>
          {renderCommonSettings()}
          <ColorOverlaySettings
            effect={effect as ColorOverlayEffect}
            onUpdate={onUpdate}
          />
        </div>
      )
    case "gradient-overlay":
      return (
        <div className="space-y-4">
          <h3 className="font-medium">Gradient Overlay</h3>
          {renderCommonSettings()}
          <GradientOverlaySettings
            effect={effect as GradientOverlayEffect}
            onUpdate={onUpdate}
          />
        </div>
      )
    default:
      return <div>Unknown effect type</div>
  }
}

// Individual effect settings components

function DropShadowSettings({
  effect,
  onUpdate,
}: {
  effect: DropShadowEffect
  onUpdate: (updates: Partial<DropShadowEffect>) => void
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Label className="w-20">Color</Label>
        <Input
          type="color"
          value={effect.color}
          onChange={(e) => onUpdate({ color: e.target.value })}
          className="w-12 h-8 p-0 border-0"
        />
        <Input
          type="text"
          value={effect.color}
          onChange={(e) => onUpdate({ color: e.target.value })}
          className="flex-1 font-mono text-sm"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Offset X</Label>
          <Input
            type="number"
            value={effect.offsetX}
            onChange={(e) => onUpdate({ offsetX: parseInt(e.target.value) || 0 })}
          />
        </div>
        <div className="space-y-2">
          <Label>Offset Y</Label>
          <Input
            type="number"
            value={effect.offsetY}
            onChange={(e) => onUpdate({ offsetY: parseInt(e.target.value) || 0 })}
          />
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between">
          <Label>Blur</Label>
          <span className="text-sm text-muted-foreground">{effect.blur}px</span>
        </div>
        <Slider
          value={[effect.blur]}
          min={0}
          max={20}
          step={1}
          onValueChange={([blur]) => onUpdate({ blur })}
        />
      </div>
      <div className="space-y-2">
        <div className="flex justify-between">
          <Label>Spread</Label>
          <span className="text-sm text-muted-foreground">{effect.spread}px</span>
        </div>
        <Slider
          value={[effect.spread]}
          min={0}
          max={20}
          step={1}
          onValueChange={([spread]) => onUpdate({ spread })}
        />
      </div>
    </div>
  )
}

function InnerShadowSettings({
  effect,
  onUpdate,
}: {
  effect: InnerShadowEffect
  onUpdate: (updates: Partial<InnerShadowEffect>) => void
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Label className="w-20">Color</Label>
        <Input
          type="color"
          value={effect.color}
          onChange={(e) => onUpdate({ color: e.target.value })}
          className="w-12 h-8 p-0 border-0"
        />
        <Input
          type="text"
          value={effect.color}
          onChange={(e) => onUpdate({ color: e.target.value })}
          className="flex-1 font-mono text-sm"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Offset X</Label>
          <Input
            type="number"
            value={effect.offsetX}
            onChange={(e) => onUpdate({ offsetX: parseInt(e.target.value) || 0 })}
          />
        </div>
        <div className="space-y-2">
          <Label>Offset Y</Label>
          <Input
            type="number"
            value={effect.offsetY}
            onChange={(e) => onUpdate({ offsetY: parseInt(e.target.value) || 0 })}
          />
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between">
          <Label>Blur</Label>
          <span className="text-sm text-muted-foreground">{effect.blur}px</span>
        </div>
        <Slider
          value={[effect.blur]}
          min={0}
          max={20}
          step={1}
          onValueChange={([blur]) => onUpdate({ blur })}
        />
      </div>
      <div className="space-y-2">
        <div className="flex justify-between">
          <Label>Choke</Label>
          <span className="text-sm text-muted-foreground">{effect.choke}px</span>
        </div>
        <Slider
          value={[effect.choke]}
          min={0}
          max={20}
          step={1}
          onValueChange={([choke]) => onUpdate({ choke })}
        />
      </div>
    </div>
  )
}

function OuterGlowSettings({
  effect,
  onUpdate,
}: {
  effect: OuterGlowEffect
  onUpdate: (updates: Partial<OuterGlowEffect>) => void
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Label className="w-20">Color</Label>
        <Input
          type="color"
          value={effect.color}
          onChange={(e) => onUpdate({ color: e.target.value })}
          className="w-12 h-8 p-0 border-0"
        />
        <Input
          type="text"
          value={effect.color}
          onChange={(e) => onUpdate({ color: e.target.value })}
          className="flex-1 font-mono text-sm"
        />
      </div>
      <div className="space-y-2">
        <div className="flex justify-between">
          <Label>Spread</Label>
          <span className="text-sm text-muted-foreground">{effect.spread}px</span>
        </div>
        <Slider
          value={[effect.spread]}
          min={0}
          max={20}
          step={1}
          onValueChange={([spread]) => onUpdate({ spread })}
        />
      </div>
      <div className="space-y-2">
        <div className="flex justify-between">
          <Label>Size</Label>
          <span className="text-sm text-muted-foreground">{effect.size}px</span>
        </div>
        <Slider
          value={[effect.size]}
          min={1}
          max={30}
          step={1}
          onValueChange={([size]) => onUpdate({ size })}
        />
      </div>
    </div>
  )
}

function InnerGlowSettings({
  effect,
  onUpdate,
}: {
  effect: InnerGlowEffect
  onUpdate: (updates: Partial<InnerGlowEffect>) => void
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Label className="w-20">Color</Label>
        <Input
          type="color"
          value={effect.color}
          onChange={(e) => onUpdate({ color: e.target.value })}
          className="w-12 h-8 p-0 border-0"
        />
        <Input
          type="text"
          value={effect.color}
          onChange={(e) => onUpdate({ color: e.target.value })}
          className="flex-1 font-mono text-sm"
        />
      </div>
      <div className="space-y-2">
        <Label>Source</Label>
        <Select
          value={effect.source}
          onValueChange={(source: "center" | "edge") => onUpdate({ source })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="edge">Edge</SelectItem>
            <SelectItem value="center">Center</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between">
          <Label>Choke</Label>
          <span className="text-sm text-muted-foreground">{effect.choke}px</span>
        </div>
        <Slider
          value={[effect.choke]}
          min={0}
          max={20}
          step={1}
          onValueChange={([choke]) => onUpdate({ choke })}
        />
      </div>
      <div className="space-y-2">
        <div className="flex justify-between">
          <Label>Size</Label>
          <span className="text-sm text-muted-foreground">{effect.size}px</span>
        </div>
        <Slider
          value={[effect.size]}
          min={1}
          max={30}
          step={1}
          onValueChange={([size]) => onUpdate({ size })}
        />
      </div>
    </div>
  )
}

function StrokeSettings({
  effect,
  onUpdate,
}: {
  effect: StrokeEffect
  onUpdate: (updates: Partial<StrokeEffect>) => void
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Label className="w-20">Color</Label>
        <Input
          type="color"
          value={effect.color}
          onChange={(e) => onUpdate({ color: e.target.value })}
          className="w-12 h-8 p-0 border-0"
        />
        <Input
          type="text"
          value={effect.color}
          onChange={(e) => onUpdate({ color: e.target.value })}
          className="flex-1 font-mono text-sm"
        />
      </div>
      <div className="space-y-2">
        <div className="flex justify-between">
          <Label>Size</Label>
          <span className="text-sm text-muted-foreground">{effect.size}px</span>
        </div>
        <Slider
          value={[effect.size]}
          min={1}
          max={20}
          step={1}
          onValueChange={([size]) => onUpdate({ size })}
        />
      </div>
      <div className="space-y-2">
        <Label>Position</Label>
        <Select
          value={effect.position}
          onValueChange={(position: "outside" | "inside" | "center") =>
            onUpdate({ position })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="outside">Outside</SelectItem>
            <SelectItem value="inside">Inside</SelectItem>
            <SelectItem value="center">Center</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

function ColorOverlaySettings({
  effect,
  onUpdate,
}: {
  effect: ColorOverlayEffect
  onUpdate: (updates: Partial<ColorOverlayEffect>) => void
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Label className="w-20">Color</Label>
        <Input
          type="color"
          value={effect.color}
          onChange={(e) => onUpdate({ color: e.target.value })}
          className="w-12 h-8 p-0 border-0"
        />
        <Input
          type="text"
          value={effect.color}
          onChange={(e) => onUpdate({ color: e.target.value })}
          className="flex-1 font-mono text-sm"
        />
      </div>
      <div className="space-y-2">
        <Label>Blend Mode</Label>
        <Select
          value={effect.blendMode}
          onValueChange={(blendMode) => onUpdate({ blendMode })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="multiply">Multiply</SelectItem>
            <SelectItem value="screen">Screen</SelectItem>
            <SelectItem value="overlay">Overlay</SelectItem>
            <SelectItem value="darken">Darken</SelectItem>
            <SelectItem value="lighten">Lighten</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

function GradientOverlaySettings({
  effect,
  onUpdate,
}: {
  effect: GradientOverlayEffect
  onUpdate: (updates: Partial<GradientOverlayEffect>) => void
}) {
  const handleColorChange = (index: number, color: string) => {
    const newColors = [...effect.colors]
    newColors[index] = color
    onUpdate({ colors: newColors })
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Colors</Label>
        <div className="flex gap-2">
          {effect.colors.map((color, index) => (
            <div key={index} className="flex items-center gap-1">
              <Input
                type="color"
                value={color}
                onChange={(e) => handleColorChange(index, e.target.value)}
                className="w-10 h-8 p-0 border-0"
              />
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between">
          <Label>Angle</Label>
          <span className="text-sm text-muted-foreground">{effect.angle}°</span>
        </div>
        <Slider
          value={[effect.angle]}
          min={0}
          max={360}
          step={1}
          onValueChange={([angle]) => onUpdate({ angle })}
        />
      </div>
      <div className="space-y-2">
        <Label>Blend Mode</Label>
        <Select
          value={effect.blendMode}
          onValueChange={(blendMode) => onUpdate({ blendMode })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="multiply">Multiply</SelectItem>
            <SelectItem value="screen">Screen</SelectItem>
            <SelectItem value="overlay">Overlay</SelectItem>
            <SelectItem value="darken">Darken</SelectItem>
            <SelectItem value="lighten">Lighten</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
