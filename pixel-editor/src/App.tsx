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
import { useToolsStore, TOOL_SHORTCUTS } from "@/store/tools-store"
import { useEffect, useState } from "react"

function App() {
  const { setPrimaryColor, setSecondaryColor } = useEditorStore()
  const { setTool } = useToolsStore()
  const [showStartup, setShowStartup] = useState(true)

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      // Tool shortcuts from tools-store registry
      const toolName = TOOL_SHORTCUTS[e.key.toLowerCase()]
      if (toolName) {
        e.preventDefault()
        setTool(toolName)
        return
      }

      // Zoom shortcuts
      if (e.key === "=" || e.key === "+") {
        e.preventDefault()
        useEditorStore.getState().setZoom(useEditorStore.getState().zoom + 1)
      }
      if (e.key === "-") {
        e.preventDefault()
        useEditorStore.getState().setZoom(useEditorStore.getState().zoom - 1)
      }

      // Swap colors
      if (e.key.toLowerCase() === "x") {
        e.preventDefault()
        useEditorStore.getState().swapColors()
      }

      // Reset colors to default
      if (e.key.toLowerCase() === "d") {
        e.preventDefault()
        setPrimaryColor("#ffffff")
        setSecondaryColor("#000000")
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [setTool, setPrimaryColor, setSecondaryColor])

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Dialog Manager - handles all lazy-loaded dialogs */}
      <DialogManager />

      {/* Startup Dialog */}
      <StartupDialog open={showStartup} onOpenChange={setShowStartup} />

      {/* Top Menu Bar */}
      <TopMenu />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Toolbar */}
        <Toolbar />

        {/* Center Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Tool Options */}
          <ToolOptions />

          {/* Canvas Area */}
          <Canvas />

          {/* Timeline */}
          <Timeline />
        </div>

        {/* Right Panels */}
        <div className="w-56 flex flex-col border-l border-border">
          {/* Colors */}
          <div className="flex-1 min-h-0">
            <ColorPanel />
          </div>

          {/* Layers */}
          <div className="h-64 border-t border-border">
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
