import { useEditorStore } from "@/store/editor-store"
import { useToolsStore, TOOL_REGISTRY } from "@/store/tools-store"
import { Separator } from "@/components/ui/separator"

export function StatusBar() {
  const {
    width,
    height,
    zoom,
    primaryColor,
  } = useEditorStore()

  const { currentTool, brushSize } = useToolsStore()

  // Get display name from tool registry
  const toolDisplayName = TOOL_REGISTRY[currentTool]?.displayName || currentTool

  return (
    <div className="h-6 bg-card border-t border-border flex items-center px-3 text-[10px] text-muted-foreground gap-4">
      <div className="flex items-center gap-2">
        <span>Tool:</span>
        <span className="text-foreground">{toolDisplayName}</span>
      </div>

      <Separator orientation="vertical" className="h-3" />

      <div className="flex items-center gap-2">
        <span>Size:</span>
        <span className="text-foreground font-mono">{brushSize}px</span>
      </div>

      <Separator orientation="vertical" className="h-3" />

      <div className="flex items-center gap-2">
        <span>Color:</span>
        <div
          className="w-3 h-3 rounded-sm border border-border"
          style={{ backgroundColor: primaryColor }}
        />
        <span className="text-foreground font-mono uppercase">{primaryColor}</span>
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-2">
        <span>Canvas:</span>
        <span className="text-foreground font-mono">{width} × {height}</span>
      </div>

      <Separator orientation="vertical" className="h-3" />

      <div className="flex items-center gap-2">
        <span>Zoom:</span>
        <span className="text-foreground font-mono">{zoom * 100}%</span>
      </div>

      <Separator orientation="vertical" className="h-3" />

      <span className="text-muted-foreground/60">React + Radix + shadcn/ui</span>
    </div>
  )
}
