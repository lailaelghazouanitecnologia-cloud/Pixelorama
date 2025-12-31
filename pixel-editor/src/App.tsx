import { TopMenu } from "@/components/editor/TopMenu"
import { Toolbar } from "@/components/editor/Toolbar"
import { ToolOptions } from "@/components/editor/ToolOptions"
import { Canvas } from "@/components/editor/Canvas"
import { ColorPanel } from "@/components/editor/ColorPanel"
import { LayersPanel } from "@/components/editor/LayersPanel"
import { Timeline } from "@/components/editor/Timeline"
import { StatusBar } from "@/components/editor/StatusBar"
import { useEditorStore } from "@/store/editor-store"
import { useEffect } from "react"

function App() {
  const { setTool, setZoom, setPrimaryColor, setSecondaryColor } = useEditorStore()

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      // Tool shortcuts (must match ToolName type)
      const toolShortcuts: Record<string, Parameters<typeof setTool>[0]> = {
        b: "pencil",
        e: "eraser",
        g: "bucket",
        i: "colorPicker",
        l: "line",
        r: "rectangle",
        o: "ellipse",
        m: "rectSelect",
        w: "magicWand",
        v: "move",
        h: "pan",
        z: "zoom",
      }

      if (toolShortcuts[e.key.toLowerCase()]) {
        e.preventDefault()
        setTool(toolShortcuts[e.key.toLowerCase()])
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
  }, [setTool, setZoom, setPrimaryColor, setSecondaryColor])

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
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
