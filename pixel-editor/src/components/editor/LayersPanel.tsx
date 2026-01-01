/**
 * LayersPanel Component - Layer management UI
 * Affinity-inspired design with tabs
 */

import { useState } from "react"
import { useEditorStore, type BlendMode, type Layer } from "@/store/editor-store"
import { useUIStore } from "@/store/ui-store"
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
  ChevronRight,
  Copy,
  Layers,
  Merge,
  Sparkles,
  Folder,
  FolderOpen,
  Image,
  Link,
  Unlink,
  Sun,
  Contrast,
  Palette,
  Droplets,
  Brush,
  FlipHorizontal,
  RotateCcw,
  Zap,
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
    addLayerGroup,
    toggleGroupExpanded,
    ungroupLayers,
    mergeLayerDown,
    toggleClipping,
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

  const handleMergeDown = () => {
    mergeLayerDown(currentLayerIndex)
  }

  const startRename = (layer: Layer) => {
    setEditingLayerId(layer.id)
    setEditName(layer.name)
  }

  const finishRename = (index: number) => {
    if (editName.trim()) {
      renameLayer(index, editName.trim())
    }
    setEditingLayerId(null)
  }

  // Render a single layer item (recursive for groups)
  const renderLayerItem = (layer: Layer, actualIndex: number, depth: number = 0) => {
    const isActive = actualIndex === currentLayerIndex
    const isEditing = editingLayerId === layer.id
    const isGroup = layer.type === 'group'
    const isExpanded = layer.expanded !== false // default to expanded
    const isClipped = layer.clipped === true
    const canClip = actualIndex > 0 && !isGroup // Can't clip bottom layer or groups

    return (
      <div key={layer.id}>
        {/* Clipping indicator line */}
        {isClipped && (
          <div className="flex items-center ml-6 -mb-1">
            <div className="w-3 h-3 border-l-2 border-b-2 border-pix-accent/60 rounded-bl" />
          </div>
        )}
        <div
          className={cn(
            "flex items-center gap-1.5 px-2 py-1.5 rounded-md cursor-pointer transition-all",
            isActive
              ? "bg-pix-accent/20 border border-pix-accent/40"
              : "hover:bg-white/5 border border-transparent",
            isClipped && "ml-3" // Indent clipped layers
          )}
          style={{ paddingLeft: `${8 + depth * 16}px` }}
          onClick={() => setCurrentLayer(actualIndex)}
          onDoubleClick={() => startRename(layer)}
        >
          {/* Group expand/collapse toggle */}
          {isGroup && (
            <button
              className="p-0.5 rounded transition-colors text-pix-text-muted hover:text-pix-text"
              onClick={(e) => {
                e.stopPropagation()
                toggleGroupExpanded(actualIndex)
              }}
              title={isExpanded ? "Collapse Group" : "Expand Group"}
            >
              <ChevronRight
                className={cn("w-3 h-3 transition-transform", isExpanded && "rotate-90")}
              />
            </button>
          )}

          {/* Clipping mask toggle */}
          {canClip && (
            <button
              className={cn(
                "p-0.5 rounded transition-colors",
                isClipped ? "text-pix-accent" : "text-pix-text-muted/50 hover:text-pix-text-muted"
              )}
              onClick={(e) => {
                e.stopPropagation()
                toggleClipping(actualIndex)
              }}
              title={isClipped ? "Unclip Layer" : "Clip to Layer Below"}
            >
              {isClipped ? <Link className="w-3 h-3" /> : <Unlink className="w-3 h-3" />}
            </button>
          )}

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

          {/* Layer type icon / thumbnail */}
          {isGroup ? (
            <div className="w-6 h-6 flex items-center justify-center text-pix-accent">
              {isExpanded ? <FolderOpen className="w-4 h-4" /> : <Folder className="w-4 h-4" />}
            </div>
          ) : (
            <div
              className="w-6 h-6 rounded border flex-shrink-0 checker-bg flex items-center justify-center"
              style={{ borderColor: isActive ? 'var(--pix-accent)' : 'var(--pix-border)' }}
            >
              {!layer.data && <Image className="w-3 h-3 text-pix-text-muted" />}
            </div>
          )}

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
              isActive ? "text-pix-text" : "text-pix-text-secondary",
              isGroup && "font-medium"
            )}>
              {layer.name}
            </span>
          )}

          {/* Child count for groups */}
          {isGroup && layer.children && layer.children.length > 0 && (
            <span className="text-pix-xs text-pix-text-muted">
              ({layer.children.length})
            </span>
          )}

          {/* Opacity badge */}
          {layer.opacity < 100 && (
            <span className="text-pix-xs text-pix-text-muted font-mono">
              {layer.opacity}%
            </span>
          )}
        </div>

        {/* Render children if group is expanded */}
        {isGroup && isExpanded && layer.children && layer.children.length > 0 && (
          <div className="border-l border-pix-border/30 ml-4">
            {[...layer.children].reverse().map((child, childIdx) => {
              // Note: children don't have their own index in the flat layers array
              // This is a simplified view - for full functionality, we'd need a flattened index system
              return (
                <div
                  key={child.id}
                  className={cn(
                    "flex items-center gap-1.5 px-2 py-1 cursor-pointer transition-all",
                    "hover:bg-white/5"
                  )}
                  style={{ paddingLeft: `${8 + (depth + 1) * 16}px` }}
                >
                  <Eye className="w-3 h-3 text-pix-text-muted" />
                  <div className="w-5 h-5 rounded border checker-bg flex-shrink-0"
                    style={{ borderColor: 'var(--pix-border)' }} />
                  <span className="text-pix-xs text-pix-text-secondary truncate">
                    {child.name}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
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
                return renderLayerItem(layer, actualIndex, 0)
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
                onClick={() => addLayerGroup()}
                title="Add Group"
              >
                <Folder className="w-4 h-4" />
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
                onClick={handleMergeDown}
                title="Merge Down"
                disabled={currentLayerIndex <= 0 || currentLayer?.type === 'group'}
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
                onClick={() => currentLayer?.type === 'group' ? ungroupLayers(currentLayerIndex) : deleteLayer(currentLayerIndex)}
                disabled={layers.length <= 1 && currentLayer?.type !== 'group'}
                title={currentLayer?.type === 'group' ? "Ungroup" : "Delete Layer"}
                style={{ color: layers.length > 1 || currentLayer?.type === 'group' ? 'var(--pix-error)' : undefined }}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      ) : (
        /* Effects Tab - Quick Effects Panel */
        <EffectsPanel />
      )}
    </div>
  )
}

/**
 * Quick Effects Panel - provides quick access to common effects
 */
function EffectsPanel() {
  const { openDialog } = useUIStore()
  const { layers, currentLayerIndex } = useEditorStore()
  const currentLayer = layers[currentLayerIndex]

  const QUICK_EFFECTS = [
    { id: 'color', label: 'Color Adjustments', icon: Sun, description: 'Brightness, Contrast, HSV' },
    { id: 'filters', label: 'Filters', icon: Sparkles, description: 'Blur, Sharpen, Noise' },
    { id: 'stylize', label: 'Stylize', icon: Brush, description: 'Outline, Shadow, Pixelate' },
    { id: 'transform', label: 'Transform', icon: RotateCcw, description: 'Flip, Rotate, Skew' },
  ]

  const handleOpenEffects = () => {
    openDialog('effects')
  }

  const handleQuickEffect = (effectId: string) => {
    // Open the effects dialog with a specific category
    openDialog('effects', { category: effectId })
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Current Layer Info */}
      <div className="px-3 py-2 border-b border-pix-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded border border-pix-border checker-bg flex items-center justify-center">
            {currentLayer?.type === 'group' ? (
              <Folder className="w-4 h-4 text-pix-accent" />
            ) : (
              <Image className="w-4 h-4 text-pix-text-muted" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-pix-xs font-medium truncate">{currentLayer?.name || 'No layer'}</p>
            <p className="text-pix-xs text-pix-text-muted">Apply effects to this layer</p>
          </div>
        </div>
      </div>

      {/* Quick Effects Grid */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          <p className="text-pix-xs text-pix-text-muted font-medium mb-2">Quick Effects</p>

          <div className="grid grid-cols-2 gap-2">
            {QUICK_EFFECTS.map((effect) => (
              <button
                key={effect.id}
                className="flex flex-col items-center gap-1 p-3 rounded-lg border border-pix-border hover:border-pix-accent hover:bg-pix-accent/10 transition-colors group"
                onClick={() => handleQuickEffect(effect.id)}
                disabled={!currentLayer || currentLayer.type === 'group'}
              >
                <effect.icon className="w-5 h-5 text-pix-text-muted group-hover:text-pix-accent transition-colors" />
                <span className="text-pix-xs font-medium text-pix-text">{effect.label}</span>
                <span className="text-pix-xs text-pix-text-muted text-center leading-tight">{effect.description}</span>
              </button>
            ))}
          </div>

          {/* Common Quick Actions */}
          <div className="pt-3 border-t border-pix-border mt-3">
            <p className="text-pix-xs text-pix-text-muted font-medium mb-2">Quick Actions</p>
            <div className="grid grid-cols-3 gap-1.5">
              <QuickActionButton
                icon={FlipHorizontal}
                label="Flip H"
                onClick={() => openDialog('effects', { effect: 'flipHorizontal' })}
                disabled={!currentLayer || currentLayer.type === 'group'}
              />
              <QuickActionButton
                icon={RotateCcw}
                label="Rotate"
                onClick={() => openDialog('effects', { effect: 'rotate90CW' })}
                disabled={!currentLayer || currentLayer.type === 'group'}
              />
              <QuickActionButton
                icon={Contrast}
                label="Invert"
                onClick={() => openDialog('effects', { effect: 'invert' })}
                disabled={!currentLayer || currentLayer.type === 'group'}
              />
              <QuickActionButton
                icon={Droplets}
                label="Blur"
                onClick={() => openDialog('effects', { effect: 'gaussianBlur' })}
                disabled={!currentLayer || currentLayer.type === 'group'}
              />
              <QuickActionButton
                icon={Palette}
                label="Grayscale"
                onClick={() => openDialog('effects', { effect: 'desaturate' })}
                disabled={!currentLayer || currentLayer.type === 'group'}
              />
              <QuickActionButton
                icon={Zap}
                label="Sharpen"
                onClick={() => openDialog('effects', { effect: 'sharpen' })}
                disabled={!currentLayer || currentLayer.type === 'group'}
              />
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Open Full Effects Dialog Button */}
      <div className="px-3 py-2 border-t border-pix-border">
        <button
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-pix-accent hover:bg-pix-accent-hover text-white text-pix-xs font-medium transition-colors"
          onClick={handleOpenEffects}
          disabled={!currentLayer || currentLayer.type === 'group'}
        >
          <Sparkles className="w-4 h-4" />
          Open Effects Panel
        </button>
      </div>
    </div>
  )
}

interface QuickActionButtonProps {
  icon: React.ComponentType<{ className?: string }>
  label: string
  onClick: () => void
  disabled?: boolean
}

function QuickActionButton({ icon: Icon, label, onClick, disabled }: QuickActionButtonProps) {
  return (
    <button
      className={cn(
        "flex flex-col items-center gap-1 p-2 rounded border border-pix-border transition-colors",
        disabled
          ? "opacity-50 cursor-not-allowed"
          : "hover:border-pix-accent hover:bg-pix-accent/10"
      )}
      onClick={onClick}
      disabled={disabled}
    >
      <Icon className="w-4 h-4 text-pix-text-muted" />
      <span className="text-pix-xs text-pix-text">{label}</span>
    </button>
  )
}
