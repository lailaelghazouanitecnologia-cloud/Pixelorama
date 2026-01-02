import { TopMenu } from "@/components/editor/TopMenu"
import { Toolbar } from "@/components/editor/Toolbar"
import { ToolOptions } from "@/components/editor/ToolOptions"
import { Canvas } from "@/components/editor/Canvas"
import { ColorPanel } from "@/components/editor/ColorPanel"
import { LayersPanel } from "@/components/editor/LayersPanel"
import { Timeline } from "@/components/editor/Timeline"
import { StatusBar } from "@/components/editor/StatusBar"
import { StartupDialog } from "@/components/dialogs/StartupDialog"
import { DialogManager } from "@/components/dialogs/DialogManager"
import { useEditorStore } from "@/store/editor-store"
import { useUIStore } from "@/store/ui-store"
import { useToolsStore, TOOL_SHORTCUTS } from "@/store/tools-store"
import { downloadProject, openProjectDialog } from "@/core/project"
import { useEffect, useState } from "react"
import { ChevronUp, ChevronDown } from "lucide-react"

function App() {
  const { setPrimaryColor, setSecondaryColor, togglePlay } = useEditorStore()
  const { openDialog } = useUIStore()
  const { setTool } = useToolsStore()
  const [showStartup, setShowStartup] = useState(true)
  const [showTimeline, setShowTimeline] = useState(true)

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      const isCtrl = e.ctrlKey || e.metaKey

      // File shortcuts (Ctrl+key)
      if (isCtrl) {
        switch (e.key.toLowerCase()) {
          case 'n':
            e.preventDefault()
            openDialog('newProject')
            return
          case 'o':
            e.preventDefault()
            openProjectDialog()
            return
          case 's':
            e.preventDefault()
            downloadProject()
            return
          case 'e':
            e.preventDefault()
            openDialog('exportImage')
            return
          case 'i':
            e.preventDefault()
            openDialog('importImage')
            return
        }
      }

      // Tool shortcuts from tools-store registry
      const toolName = TOOL_SHORTCUTS[e.key.toLowerCase()]
      if (toolName && !isCtrl) {
        e.preventDefault()
        setTool(toolName)
        return
      }

      // Zoom shortcuts
      if (e.key === "=" || e.key === "+") {
        e.preventDefault()
        useEditorStore.getState().zoomIn()
      }
      if (e.key === "-") {
        e.preventDefault()
        useEditorStore.getState().zoomOut()
      }

      // Swap colors
      if (e.key.toLowerCase() === "x" && !isCtrl) {
        e.preventDefault()
        useEditorStore.getState().swapColors()
      }

      // Reset colors to default
      if (e.key.toLowerCase() === "d" && !isCtrl) {
        e.preventDefault()
        setPrimaryColor("#ffffff")
        setSecondaryColor("#000000")
      }

      // Play/pause animation
      if (e.key === " ") {
        e.preventDefault()
        togglePlay()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [setTool, setPrimaryColor, setSecondaryColor, openDialog, togglePlay])

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Dialog Manager - handles all lazy-loaded dialogs */}
      <DialogManager />

      {/* Startup Dialog */}
      <StartupDialog open={showStartup} onOpenChange={setShowStartup} />

      {/* Top Menu Bar - reduced height */}
      <TopMenu />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Toolbar - unchanged */}
        <Toolbar />

        {/* Center Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Tool Options - reduced height */}
          <ToolOptions />

          {/* Canvas Area */}
          <Canvas />

          {/* Timeline Toggle Button */}
          <button
            onClick={() => setShowTimeline(!showTimeline)}
            className="w-full h-5 flex items-center justify-center gap-1 hover:bg-pix-bg-secondary transition-colors"
            style={{
              backgroundColor: 'var(--pix-bg)',
              borderTop: '1px solid var(--pix-border)',
              borderBottom: showTimeline ? 'none' : '1px solid var(--pix-border)',
            }}
          >
            {showTimeline ? (
              <ChevronDown className="w-3 h-3 text-pix-text-muted" />
            ) : (
              <ChevronUp className="w-3 h-3 text-pix-text-muted" />
            )}
            <span className="text-pix-xs text-pix-text-muted">
              {showTimeline ? 'Hide Timeline' : 'Show Timeline'}
            </span>
            {showTimeline ? (
              <ChevronDown className="w-3 h-3 text-pix-text-muted" />
            ) : (
              <ChevronUp className="w-3 h-3 text-pix-text-muted" />
            )}
          </button>

          {/* Timeline - taller and collapsible */}
          {showTimeline && <Timeline />}
        </div>

        {/* Right Panels - reduced width 12% (w-56 -> w-48) but taller layers */}
        <div className="w-48 flex flex-col border-l border-border">
          {/* Colors - smaller */}
          <div className="flex-1 min-h-0" style={{ maxHeight: '45%' }}>
            <ColorPanel />
          </div>

          {/* Layers - taller */}
          <div className="flex-1 border-t border-border" style={{ minHeight: '55%' }}>
            <LayersPanel />
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <StatusBar />
    </div>
  )
}

export default App
