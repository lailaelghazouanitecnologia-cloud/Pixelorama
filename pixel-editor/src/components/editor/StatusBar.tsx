import { useEditorStore } from "@/store/editor-store"
import { Separator } from "@/components/ui/separator"

export function StatusBar() {
  const {
    width,
    height,
    zoom,
    currentTool,
    brushSize,
    primaryColor,
  } = useEditorStore()

  const toolNames: Record<string, string> = {
    pencil: "Pencil",
    eraser: "Eraser",
    bucket: "Fill",
    picker: "Color Picker",
    line: "Line",
    rect: "Rectangle",
    ellipse: "Ellipse",
    select: "Select",
    move: "Move",
    zoom: "Zoom",
  }

  return (
    <div className="h-6 bg-card border-t border-border flex items-center px-3 text-[10px] text-muted-foreground gap-4">
      <div className="flex items-center gap-2">
        <span>Tool:</span>
        <span className="text-foreground">{toolNames[currentTool] || currentTool}</span>
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
