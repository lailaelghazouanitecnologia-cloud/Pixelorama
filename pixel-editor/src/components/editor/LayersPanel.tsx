/**
 * LayersPanel Component - Layer management UI
 * Affinity-inspired design with tabs
 */

import { useState } from "react"
import { useEditorStore, type BlendMode } from "@/store/editor-store"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  ChevronUp,
  ChevronDown,
  Copy,
  Layers,
  Merge,
  Sparkles,
} from "lucide-react"
import { cn } from "@/lib/utils"

// All 20 blend modes with groupings (matching Pixelorama's BaseLayer.gd)
const BLEND_MODES: { value: BlendMode; label: string; group: string }[] = [
  // Normal
  { value: 'normal', label: 'Normal', group: 'Normal' },
  // Darken group
  { value: 'darken', label: 'Darken', group: 'Darken' },
  { value: 'multiply', label: 'Multiply', group: 'Darken' },
  { value: 'color-burn', label: 'Color Burn', group: 'Darken' },
  { value: 'linear-burn', label: 'Linear Burn', group: 'Darken' },
  // Lighten group
  { value: 'lighten', label: 'Lighten', group: 'Lighten' },
  { value: 'screen', label: 'Screen', group: 'Lighten' },
  { value: 'color-dodge', label: 'Color Dodge', group: 'Lighten' },
  { value: 'linear-dodge', label: 'Add (Linear Dodge)', group: 'Lighten' },
  // Contrast group
  { value: 'overlay', label: 'Overlay', group: 'Contrast' },
  { value: 'soft-light', label: 'Soft Light', group: 'Contrast' },
  { value: 'hard-light', label: 'Hard Light', group: 'Contrast' },
  // Inversion group
  { value: 'difference', label: 'Difference', group: 'Inversion' },
  { value: 'exclusion', label: 'Exclusion', group: 'Inversion' },
  { value: 'subtract', label: 'Subtract', group: 'Inversion' },
  { value: 'divide', label: 'Divide', group: 'Inversion' },
  // Component group (HSL modes)
  { value: 'hue', label: 'Hue', group: 'Component' },
  { value: 'saturation', label: 'Saturation', group: 'Component' },
  { value: 'color', label: 'Color', group: 'Component' },
  { value: 'luminosity', label: 'Luminosity', group: 'Component' },
]

// Group blend modes for optgroup rendering
const BLEND_MODE_GROUPS = ['Normal', 'Darken', 'Lighten', 'Contrast', 'Inversion', 'Component'] as const

export function LayersPanel() {
  const {
    layers,
    currentLayerIndex,
    setCurrentLayer,
    addLayer,
    duplicateLayer,
    deleteLayer,
    toggleLayerVisibility,
    toggleLayerLock,
    setLayerOpacity,
    setLayerBlendMode,
    moveLayer,
    renameLayer,
  } = useEditorStore()

  const [editingLayerId, setEditingLayerId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [activeTab, setActiveTab] = useState<'layers' | 'effects'>('layers')

  const currentLayer = layers[currentLayerIndex]

  const handleMoveUp = () => {
    if (currentLayerIndex < layers.length - 1) {
      moveLayer(currentLayerIndex, currentLayerIndex + 1)
    }
  }

  const handleMoveDown = () => {
    if (currentLayerIndex > 0) {
      moveLayer(currentLayerIndex, currentLayerIndex - 1)
    }
  }

  const handleDuplicate = () => {
    duplicateLayer(currentLayerIndex)
  }

  const startRename = (layer: typeof layers[0]) => {
    setEditingLayerId(layer.id)
    setEditName(layer.name)
  }

  const finishRename = (index: number) => {
    if (editName.trim()) {
      renameLayer(index, editName.trim())
    }
    setEditingLayerId(null)
  }

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--pix-bg-secondary)' }}>
      {/* Panel Tabs - Affinity style */}
      <div className="panel-tabs">
        <button
          className={cn("panel-tab", activeTab === 'layers' && "active")}
          onClick={() => setActiveTab('layers')}
        >
          Layers
        </button>
        <button
          className={cn("panel-tab", activeTab === 'effects' && "active")}
          onClick={() => setActiveTab('effects')}
        >
          Effects
        </button>
      </div>

      {activeTab === 'layers' ? (
        <>
          {/* Layer Properties Bar */}
          <div className="px-3 py-2 space-y-2" style={{ borderBottom: '1px solid var(--pix-border)' }}>
            {/* Blend Mode */}
            <div className="flex items-center gap-2">
              <span className="text-pix-xs text-pix-text-muted w-10">Blend</span>
              <select
                className="select flex-1 text-pix-xs"
                value={currentLayer?.blendMode || 'normal'}
                onChange={(e) => setLayerBlendMode(currentLayerIndex, e.target.value as BlendMode)}
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

            {/* Opacity */}
            <div className="flex items-center gap-2">
              <span className="text-pix-xs text-pix-text-muted w-10">Opacity</span>
              <div className="flex-1 relative h-3 rounded-full overflow-hidden" style={{ background: 'var(--pix-bg-tertiary)' }}>
                <div
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{
                    width: `${currentLayer?.opacity ?? 100}%`,
                    background: 'linear-gradient(90deg, var(--pix-accent), var(--pix-accent-hover))'
                  }}
                />
                <input
                  type="range"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  value={currentLayer?.opacity ?? 100}
                  onChange={(e) => setLayerOpacity(currentLayerIndex, parseInt(e.target.value))}
                  min={0}
                  max={100}
                  step={1}
                />
                <div
                  className="absolute top-0 w-2 h-full bg-white border border-gray-600 rounded-full pointer-events-none shadow-sm"
                  style={{ left: `calc(${currentLayer?.opacity ?? 100}% - 4px)` }}
                />
              </div>
              <span className="text-pix-xs w-10 text-right font-mono">
                {currentLayer?.opacity ?? 100}%
              </span>
            </div>
          </div>

          {/* Layer List */}
          <ScrollArea className="flex-1">
            <div className="p-1.5 flex flex-col gap-0.5">
              {/* Render from top to bottom (reversed array) */}
              {[...layers].reverse().map((layer, reversedIndex) => {
                const actualIndex = layers.length - 1 - reversedIndex
                const isActive = actualIndex === currentLayerIndex
                const isEditing = editingLayerId === layer.id

                return (
                  <div
                    key={layer.id}
                    className={cn(
                      "flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-all",
                      isActive
                        ? "bg-pix-accent/20 border border-pix-accent/40"
                        : "hover:bg-white/5 border border-transparent"
                    )}
                    onClick={() => setCurrentLayer(actualIndex)}
                    onDoubleClick={() => startRename(layer)}
                  >
                    {/* Visibility toggle */}
                    <button
                      className={cn(
                        "p-0.5 rounded transition-colors",
                        layer.visible ? "text-pix-text hover:text-pix-accent" : "text-pix-text-muted hover:text-pix-text"
                      )}
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleLayerVisibility(actualIndex)
                      }}
                      title={layer.visible ? "Hide Layer" : "Show Layer"}
                    >
                      {layer.visible ? (
                        <Eye className="w-3.5 h-3.5" />
                      ) : (
                        <EyeOff className="w-3.5 h-3.5" />
                      )}
                    </button>

                    {/* Lock toggle */}
                    <button
                      className={cn(
                        "p-0.5 rounded transition-colors",
                        layer.locked ? "text-pix-warning" : "text-pix-text-muted hover:text-pix-text"
                      )}
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleLayerLock(actualIndex)
                      }}
                      title={layer.locked ? "Unlock Layer" : "Lock Layer"}
                    >
                      {layer.locked ? (
                        <Lock className="w-3.5 h-3.5" />
                      ) : (
                        <Unlock className="w-3.5 h-3.5" />
                      )}
                    </button>

                    {/* Layer thumbnail */}
                    <div
                      className="w-8 h-8 rounded border flex-shrink-0 checker-bg"
                      style={{ borderColor: isActive ? 'var(--pix-accent)' : 'var(--pix-border)' }}
                    >
                      {/* Thumbnail would be rendered here */}
                    </div>

                    {/* Layer name */}
                    {isEditing ? (
                      <input
                        type="text"
                        className="input flex-1 h-5 text-xs px-1"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onBlur={() => finishRename(actualIndex)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') finishRename(actualIndex)
                          if (e.key === 'Escape') setEditingLayerId(null)
                        }}
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <span className={cn(
                        "flex-1 text-pix-xs truncate",
                        isActive ? "text-pix-text" : "text-pix-text-secondary"
                      )}>
                        {layer.name}
                      </span>
                    )}

                    {/* Opacity badge */}
                    {layer.opacity < 100 && (
                      <span className="text-pix-xs text-pix-text-muted font-mono">
                        {layer.opacity}%
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </ScrollArea>

          {/* Action buttons */}
          <div className="flex items-center justify-between px-2 py-1.5" style={{ borderTop: '1px solid var(--pix-border)' }}>
            <div className="flex items-center gap-0.5">
              <button
                className="icon-btn"
                onClick={() => addLayer()}
                title="Add Layer"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                className="icon-btn"
                onClick={handleDuplicate}
                title="Duplicate Layer"
              >
                <Copy className="w-4 h-4" />
              </button>
              <button
                className="icon-btn"
                title="Merge Down"
                disabled={currentLayerIndex <= 0}
              >
                <Merge className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-0.5">
              <button
                className="icon-btn"
                onClick={handleMoveUp}
                disabled={currentLayerIndex >= layers.length - 1}
                title="Move Up"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
              <button
                className="icon-btn"
                onClick={handleMoveDown}
                disabled={currentLayerIndex <= 0}
                title="Move Down"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
              <button
                className="icon-btn"
                onClick={() => deleteLayer(currentLayerIndex)}
                disabled={layers.length <= 1}
                title="Delete Layer"
                style={{ color: layers.length > 1 ? 'var(--pix-error)' : undefined }}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      ) : (
        /* Effects Tab - Placeholder */
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center text-pix-text-muted">
            <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-pix-xs">No effects applied</p>
            <p className="text-pix-xs opacity-60">Effects coming soon</p>
          </div>
        </div>
      )}
    </div>
  )
}
