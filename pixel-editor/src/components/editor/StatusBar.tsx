import { useEditorStore } from "@/store/editor-store"
import { useUIStore } from "@/store/ui-store"
import { useToolsStore, TOOL_REGISTRY } from "@/store/tools-store"
import { Separator } from "@/components/ui/separator"
import { ZoomIn, ZoomOut } from "lucide-react"

export function StatusBar() {
  const {
    width,
    height,
    zoom,
    primaryColor,
    zoomIn,
    zoomOut,
    resetZoom,
  } = useEditorStore()

  const { cursorPosition, cursorInCanvas } = useUIStore()
  const { currentTool, brushSize } = useToolsStore()

  // Get display name from tool registry
  const toolDisplayName = TOOL_REGISTRY[currentTool]?.displayName || currentTool

  // Format zoom percentage
  const zoomPercent = Math.round(zoom * 100)

  return (
    <div
      className="h-5 flex items-center px-2 text-pix-xs gap-3"
      style={{
        backgroundColor: 'var(--pix-bg-secondary)',
        borderTop: '1px solid var(--pix-border)',
        color: 'var(--pix-text-muted)'
      }}
    >
      {/* Tool info */}
      <div className="flex items-center gap-1.5">
        <span style={{ color: 'var(--pix-text-secondary)' }}>{toolDisplayName}</span>
        <span className="font-mono">{brushSize}px</span>
      </div>

      <Separator orientation="vertical" className="h-3 bg-pix-border" />

      {/* Color */}
      <div className="flex items-center gap-1.5">
        <div
          className="w-3 h-3 rounded-sm"
          style={{ backgroundColor: primaryColor, border: '1px solid var(--pix-border)' }}
        />
        <span className="font-mono uppercase">{primaryColor}</span>
      </div>

      <Separator orientation="vertical" className="h-3 bg-pix-border" />

      {/* Cursor position */}
      <div className="flex items-center gap-1 font-mono" style={{ minWidth: '70px' }}>
        {cursorInCanvas && cursorPosition ? (
          <span style={{ color: 'var(--pix-text-secondary)' }}>
            {cursorPosition.x}, {cursorPosition.y}
          </span>
        ) : (
          <span>--, --</span>
        )}
      </div>

      <div className="flex-1" />

      {/* Canvas size */}
      <div className="flex items-center gap-1">
        <span className="font-mono" style={{ color: 'var(--pix-text-secondary)' }}>
          {width}×{height}
        </span>
      </div>

      <Separator orientation="vertical" className="h-3 bg-pix-border" />

      {/* Zoom controls */}
      <div className="flex items-center gap-0.5">
        <button
          className="p-0.5 rounded hover:bg-pix-bg-hover transition-colors"
          onClick={zoomOut}
          title="Zoom Out (-)"
        >
          <ZoomOut className="w-3 h-3" />
        </button>
        <button
          className="px-1 py-0.5 rounded hover:bg-pix-bg-hover transition-colors font-mono min-w-[40px] text-center"
          onClick={resetZoom}
          title="Reset Zoom (click to reset)"
          style={{ color: 'var(--pix-text-secondary)' }}
        >
          {zoomPercent}%
        </button>
        <button
          className="p-0.5 rounded hover:bg-pix-bg-hover transition-colors"
          onClick={zoomIn}
          title="Zoom In (+)"
        >
          <ZoomIn className="w-3 h-3" />
        </button>
      </div>
    </div>
  )
}
