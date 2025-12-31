/**
 * LayersPanel Component - Layer management UI
 * Based on Pixelorama's layer panel
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
} from "lucide-react"
import { cn } from "@/lib/utils"

const BLEND_MODES: { value: BlendMode; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'multiply', label: 'Multiply' },
  { value: 'screen', label: 'Screen' },
  { value: 'overlay', label: 'Overlay' },
  { value: 'darken', label: 'Darken' },
  { value: 'lighten', label: 'Lighten' },
]

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
    <div className="panel flex flex-col h-full">
      {/* Header */}
      <div className="panel-header">
        <div className="flex items-center gap-1">
          <Layers className="w-3 h-3" />
          <span className="panel-title">Layers</span>
        </div>
        <button
          className="icon-btn"
          onClick={() => addLayer()}
          title="Add Layer"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Layer List */}
      <ScrollArea className="flex-1">
        <div className="p-1 flex flex-col gap-px">
          {/* Render from top to bottom (reversed array) */}
          {[...layers].reverse().map((layer, reversedIndex) => {
            const actualIndex = layers.length - 1 - reversedIndex
            const isActive = actualIndex === currentLayerIndex
            const isEditing = editingLayerId === layer.id

            return (
              <div
                key={layer.id}
                className={cn("layer-item", isActive && "active")}
                onClick={() => setCurrentLayer(actualIndex)}
                onDoubleClick={() => startRename(layer)}
              >
                {/* Visibility toggle */}
                <button
                  className={cn("layer-visibility", !layer.visible && "hidden")}
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
                  className={cn("layer-visibility", layer.locked && "text-pix-warning")}
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
                <div className="layer-thumb checker-bg">
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
                  <span className="layer-name">{layer.name}</span>
                )}

                {/* Opacity badge */}
                {layer.opacity < 100 && (
                  <span className="text-pix-xs text-pix-text-muted">
                    {layer.opacity}%
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </ScrollArea>

      {/* Layer Properties */}
      <div style={{ borderTop: '1px solid var(--pix-border)', padding: '6px' }}>
        {/* Blend Mode */}
        <div className="form-row">
          <label>Blend</label>
          <select
            className="select flex-1"
            value={currentLayer?.blendMode || 'normal'}
            onChange={(e) => setLayerBlendMode(currentLayerIndex, e.target.value as BlendMode)}
          >
            {BLEND_MODES.map((mode) => (
              <option key={mode.value} value={mode.value}>
                {mode.label}
              </option>
            ))}
          </select>
        </div>

        {/* Opacity */}
        <div className="form-row">
          <label>Opacity</label>
          <input
            type="range"
            className="slider flex-1"
            value={currentLayer?.opacity ?? 100}
            onChange={(e) => setLayerOpacity(currentLayerIndex, parseInt(e.target.value))}
            min={0}
            max={100}
            step={1}
          />
          <span className="text-pix-xs w-8 text-right" style={{ fontFamily: 'monospace' }}>
            {currentLayer?.opacity ?? 100}%
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-1">
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
          </div>

          <div className="flex items-center gap-1">
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
      </div>
    </div>
  )
}
