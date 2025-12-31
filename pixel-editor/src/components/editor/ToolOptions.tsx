import { Slider } from "@/components/ui/slider"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Undo2, Redo2, FlipHorizontal, FlipVertical, Grid3X3 } from "lucide-react"
import { useEditorStore } from "@/store/editor-store"

export function ToolOptions() {
  const {
    brushSize,
    setBrushSize,
    showGrid,
    toggleGrid,
    currentTool,
  } = useEditorStore()

  return (
    <div className="h-9 bg-card border-b border-border flex items-center px-3 gap-4">
      {/* Brush Size */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Size:</span>
        <Slider
          value={[brushSize]}
          onValueChange={([v]) => setBrushSize(v)}
          min={1}
          max={32}
          step={1}
          className="w-24"
        />
        <span className="text-xs text-foreground w-6 text-right font-mono">{brushSize}</span>
      </div>

      <Separator orientation="vertical" className="h-5" />

      {/* Brush Opacity */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Opacity:</span>
        <Slider
          defaultValue={[100]}
          min={0}
          max={100}
          step={1}
          className="w-24"
        />
        <span className="text-xs text-foreground w-8 text-right font-mono">100%</span>
      </div>

      <Separator orientation="vertical" className="h-5" />

      {/* Tool-specific options */}
      {currentTool === 'rect' || currentTool === 'ellipse' ? (
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
            <input type="checkbox" className="rounded border-border bg-background" />
            Filled
          </label>
        </div>
      ) : null}

      <div className="flex-1" />

      {/* Quick Actions */}
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="xs" className="tool-button">
          <Undo2 className="w-3.5 h-3.5" />
        </Button>
        <Button variant="ghost" size="xs" className="tool-button">
          <Redo2 className="w-3.5 h-3.5" />
        </Button>

        <Separator orientation="vertical" className="h-5 mx-1" />

        <Button variant="ghost" size="xs" className="tool-button">
          <FlipHorizontal className="w-3.5 h-3.5" />
        </Button>
        <Button variant="ghost" size="xs" className="tool-button">
          <FlipVertical className="w-3.5 h-3.5" />
        </Button>

        <Separator orientation="vertical" className="h-5 mx-1" />

        <Button
          variant="ghost"
          size="xs"
          className={`tool-button ${showGrid ? 'active' : ''}`}
          onClick={toggleGrid}
        >
          <Grid3X3 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  )
}
