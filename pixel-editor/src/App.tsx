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

function App() {
  const { setPrimaryColor, setSecondaryColor, togglePlay } = useEditorStore()
  const { openDialog } = useUIStore()
  const { setTool } = useToolsStore()
  const [showStartup, setShowStartup] = useState(true)

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

        {/* Right Panels - Compact */}
        <div className="w-56 flex flex-col border-l border-border">
          {/* Colors */}
          <div className="flex-1 min-h-0">
            <ColorPanel />
          </div>

          {/* Layers */}
          <div className="h-48 border-t border-border">
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
