import { useEditorStore } from "@/store/editor-store"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Slider } from "@/components/ui/slider"
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
  FolderPlus,
} from "lucide-react"
import { cn } from "@/lib/utils"

export function LayersPanel() {
  const {
    layers,
    currentLayerIndex,
    setCurrentLayer,
    addLayer,
    deleteLayer,
    toggleLayerVisibility,
    toggleLayerLock,
    setLayerOpacity,
    moveLayer,
  } = useEditorStore()

  const currentLayer = layers[currentLayerIndex]

  const handleMoveUp = () => {
    if (currentLayerIndex < layers.length - 1) {
      moveLayer(currentLayerIndex, currentLayerIndex + 1)
      setCurrentLayer(currentLayerIndex + 1)
    }
  }

  const handleMoveDown = () => {
    if (currentLayerIndex > 0) {
      moveLayer(currentLayerIndex, currentLayerIndex - 1)
      setCurrentLayer(currentLayerIndex - 1)
    }
  }

  return (
    <div className="panel flex flex-col h-full">
      <div className="panel-header">
        <span className="panel-title">Layers</span>
        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="xs" className="h-5 w-5 p-0" title="Add Group">
            <FolderPlus className="w-3 h-3" />
          </Button>
          <Button variant="ghost" size="xs" className="h-5 w-5 p-0" onClick={addLayer} title="Add Layer">
            <Plus className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Layer List */}
      <ScrollArea className="flex-1">
        <div className="p-1.5 flex flex-col gap-0.5">
          {[...layers].reverse().map((layer, reversedIndex) => {
            const actualIndex = layers.length - 1 - reversedIndex
            const isActive = actualIndex === currentLayerIndex

            return (
              <div
                key={layer.id}
                className={cn("layer-item group", isActive && "active")}
                onClick={() => setCurrentLayer(actualIndex)}
              >
                {/* Visibility */}
                <Button
                  variant="ghost"
                  size="xs"
                  className="h-5 w-5 p-0 opacity-60 hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleLayerVisibility(actualIndex)
                  }}
                >
                  {layer.visible ? (
                    <Eye className="w-3 h-3" />
                  ) : (
                    <EyeOff className="w-3 h-3 text-muted-foreground" />
                  )}
                </Button>

                {/* Lock */}
                <Button
                  variant="ghost"
                  size="xs"
                  className="h-5 w-5 p-0 opacity-60 hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleLayerLock(actualIndex)
                  }}
                >
                  {layer.locked ? (
                    <Lock className="w-3 h-3 text-yellow-500" />
                  ) : (
                    <Unlock className="w-3 h-3 text-muted-foreground" />
                  )}
                </Button>

                {/* Preview */}
                <div className="w-8 h-8 bg-secondary rounded border border-border flex-shrink-0 checker-bg" />

                {/* Name */}
                <span className="text-xs flex-1 truncate">{layer.name}</span>

                {/* Opacity indicator */}
                <span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100">
                  {layer.opacity}%
                </span>
              </div>
            )
          })}
        </div>
      </ScrollArea>

      {/* Layer Controls */}
      <div className="border-t border-border p-2 space-y-2">
        {/* Opacity */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground w-12">Opacity</span>
          <Slider
            value={[currentLayer?.opacity ?? 100]}
            onValueChange={([v]) => setLayerOpacity(currentLayerIndex, v)}
            max={100}
            step={1}
            className="flex-1"
          />
          <span className="text-[10px] text-foreground w-8 text-right font-mono">
            {currentLayer?.opacity ?? 100}%
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-0.5">
            <Button variant="ghost" size="xs" className="h-6 w-6 p-0" onClick={handleMoveUp} title="Move Up">
              <ChevronUp className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="xs" className="h-6 w-6 p-0" onClick={handleMoveDown} title="Move Down">
              <ChevronDown className="w-3.5 h-3.5" />
            </Button>
          </div>

          <div className="flex items-center gap-0.5">
            <Button variant="ghost" size="xs" className="h-6 w-6 p-0" title="Duplicate Layer">
              <Copy className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="xs"
              className="h-6 w-6 p-0 hover:text-destructive"
              onClick={() => deleteLayer(currentLayerIndex)}
              disabled={layers.length <= 1}
              title="Delete Layer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
