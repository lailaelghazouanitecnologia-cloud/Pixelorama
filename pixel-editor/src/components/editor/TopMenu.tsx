/**
 * TopMenu Component - Main menu bar
 * Based on Pixelorama's TopMenuContainer
 */

import { useCallback, useRef } from "react"
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarShortcut,
  MenubarTrigger,
  MenubarCheckboxItem,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
} from "@/components/ui/menubar"
import { useEditorStore } from "@/store/editor-store"
import { getHistory } from "@/core/history"
import { downloadCanvas } from "@/core/export"

export function TopMenu() {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const {
    projectName,
    width,
    height,
    showGrid,
    showOnionSkin,
    showRulers,
    snapToGrid,
    canUndo,
    canRedo,
    toggleGrid,
    toggleOnionSkin,
    toggleRulers,
    toggleSnapToGrid,
    zoomIn,
    zoomOut,
    resetZoom,
    addLayer,
    duplicateLayer,
    deleteLayer,
    currentLayerIndex,
    layers,
    addFrame,
    togglePlay,
    newProject,
    selectAll,
    clearSelection,
  } = useEditorStore()

  const history = getHistory()

  // File operations
  const handleNew = useCallback(() => {
    if (confirm('Create new project? Unsaved changes will be lost.')) {
      newProject(64, 64)
      history.clear()
    }
  }, [newProject, history])

  const handleOpen = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        // Would need to implement loading image to canvas
        console.log('Image loaded:', img.width, img.height)
      }
      img.src = event.target?.result as string
    }
    reader.readAsDataURL(file)
  }, [])

  const handleExportPNG = useCallback(() => {
    const canvas = document.querySelector('canvas') as HTMLCanvasElement
    if (canvas) {
      downloadCanvas(canvas, projectName || 'untitled', { format: 'png' })
    }
  }, [projectName])

  const handleExportJPEG = useCallback(() => {
    const canvas = document.querySelector('canvas') as HTMLCanvasElement
    if (canvas) {
      downloadCanvas(canvas, projectName || 'untitled', { format: 'jpeg', quality: 0.9 })
    }
  }, [projectName])

  // Edit operations
  const handleUndo = useCallback(() => {
    history.undo()
  }, [history])

  const handleRedo = useCallback(() => {
    history.redo()
  }, [history])

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      <Menubar className="menu-bar rounded-none border-0 h-6 min-h-0 px-1">
        {/* File Menu */}
        <MenubarMenu>
          <MenubarTrigger className="menu-item h-5 px-2 py-0 text-xs">File</MenubarTrigger>
          <MenubarContent className="panel">
            <MenubarItem onClick={handleNew}>
              New <MenubarShortcut>Ctrl+N</MenubarShortcut>
            </MenubarItem>
            <MenubarItem onClick={handleOpen}>
              Open <MenubarShortcut>Ctrl+O</MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator className="separator" />
            <MenubarItem>
              Save <MenubarShortcut>Ctrl+S</MenubarShortcut>
            </MenubarItem>
            <MenubarItem>
              Save As... <MenubarShortcut>Ctrl+Shift+S</MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator className="separator" />
            <MenubarSub>
              <MenubarSubTrigger>Export</MenubarSubTrigger>
              <MenubarSubContent className="panel">
                <MenubarItem onClick={handleExportPNG}>
                  PNG <MenubarShortcut>Ctrl+E</MenubarShortcut>
                </MenubarItem>
                <MenubarItem onClick={handleExportJPEG}>JPEG</MenubarItem>
                <MenubarItem>WebP</MenubarItem>
                <MenubarSeparator className="separator" />
                <MenubarItem>Spritesheet...</MenubarItem>
                <MenubarItem>GIF Animation...</MenubarItem>
              </MenubarSubContent>
            </MenubarSub>
            <MenubarSeparator className="separator" />
            <MenubarItem>Quit</MenubarItem>
          </MenubarContent>
        </MenubarMenu>

        {/* Edit Menu */}
        <MenubarMenu>
          <MenubarTrigger className="menu-item h-5 px-2 py-0 text-xs">Edit</MenubarTrigger>
          <MenubarContent className="panel">
            <MenubarItem onClick={handleUndo} disabled={!canUndo}>
              Undo <MenubarShortcut>Ctrl+Z</MenubarShortcut>
            </MenubarItem>
            <MenubarItem onClick={handleRedo} disabled={!canRedo}>
              Redo <MenubarShortcut>Ctrl+Y</MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator className="separator" />
            <MenubarItem>
              Cut <MenubarShortcut>Ctrl+X</MenubarShortcut>
            </MenubarItem>
            <MenubarItem>
              Copy <MenubarShortcut>Ctrl+C</MenubarShortcut>
            </MenubarItem>
            <MenubarItem>
              Paste <MenubarShortcut>Ctrl+V</MenubarShortcut>
            </MenubarItem>
            <MenubarItem>Delete</MenubarItem>
            <MenubarSeparator className="separator" />
            <MenubarItem>Preferences...</MenubarItem>
          </MenubarContent>
        </MenubarMenu>

        {/* Select Menu */}
        <MenubarMenu>
          <MenubarTrigger className="menu-item h-5 px-2 py-0 text-xs">Select</MenubarTrigger>
          <MenubarContent className="panel">
            <MenubarItem onClick={selectAll}>
              All <MenubarShortcut>Ctrl+A</MenubarShortcut>
            </MenubarItem>
            <MenubarItem onClick={clearSelection}>
              None <MenubarShortcut>Ctrl+D</MenubarShortcut>
            </MenubarItem>
            <MenubarItem>
              Invert <MenubarShortcut>Ctrl+Shift+I</MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator className="separator" />
            <MenubarItem>Select Color...</MenubarItem>
          </MenubarContent>
        </MenubarMenu>

        {/* View Menu */}
        <MenubarMenu>
          <MenubarTrigger className="menu-item h-5 px-2 py-0 text-xs">View</MenubarTrigger>
          <MenubarContent className="panel">
            <MenubarItem onClick={zoomIn}>
              Zoom In <MenubarShortcut>Ctrl++</MenubarShortcut>
            </MenubarItem>
            <MenubarItem onClick={zoomOut}>
              Zoom Out <MenubarShortcut>Ctrl+-</MenubarShortcut>
            </MenubarItem>
            <MenubarItem onClick={resetZoom}>
              Zoom 100% <MenubarShortcut>Ctrl+0</MenubarShortcut>
            </MenubarItem>
            <MenubarItem>Fit to Window</MenubarItem>
            <MenubarSeparator className="separator" />
            <MenubarCheckboxItem checked={showGrid} onClick={toggleGrid}>
              Show Grid <MenubarShortcut>Ctrl+G</MenubarShortcut>
            </MenubarCheckboxItem>
            <MenubarCheckboxItem checked={showRulers} onClick={toggleRulers}>
              Show Rulers
            </MenubarCheckboxItem>
            <MenubarCheckboxItem checked={snapToGrid} onClick={toggleSnapToGrid}>
              Snap to Grid
            </MenubarCheckboxItem>
            <MenubarCheckboxItem checked={showOnionSkin} onClick={toggleOnionSkin}>
              Onion Skinning
            </MenubarCheckboxItem>
            <MenubarSeparator className="separator" />
            <MenubarItem>Mirror View</MenubarItem>
          </MenubarContent>
        </MenubarMenu>

        {/* Image Menu */}
        <MenubarMenu>
          <MenubarTrigger className="menu-item h-5 px-2 py-0 text-xs">Image</MenubarTrigger>
          <MenubarContent className="panel">
            <MenubarItem>Resize Canvas...</MenubarItem>
            <MenubarItem>Scale Image...</MenubarItem>
            <MenubarItem>Crop to Selection</MenubarItem>
            <MenubarSeparator className="separator" />
            <MenubarItem>Flip Horizontal</MenubarItem>
            <MenubarItem>Flip Vertical</MenubarItem>
            <MenubarSub>
              <MenubarSubTrigger>Rotate</MenubarSubTrigger>
              <MenubarSubContent className="panel">
                <MenubarItem>90° Clockwise</MenubarItem>
                <MenubarItem>90° Counter-clockwise</MenubarItem>
                <MenubarItem>180°</MenubarItem>
                <MenubarItem>Free Rotate...</MenubarItem>
              </MenubarSubContent>
            </MenubarSub>
            <MenubarSeparator className="separator" />
            <MenubarSub>
              <MenubarSubTrigger>Effects</MenubarSubTrigger>
              <MenubarSubContent className="panel">
                <MenubarItem>Invert Colors</MenubarItem>
                <MenubarItem>Desaturate</MenubarItem>
                <MenubarItem>Outline...</MenubarItem>
                <MenubarItem>Drop Shadow...</MenubarItem>
                <MenubarItem>Gradient...</MenubarItem>
                <MenubarSeparator className="separator" />
                <MenubarItem>Brightness/Contrast...</MenubarItem>
                <MenubarItem>Hue/Saturation...</MenubarItem>
                <MenubarItem>Posterize...</MenubarItem>
              </MenubarSubContent>
            </MenubarSub>
          </MenubarContent>
        </MenubarMenu>

        {/* Layer Menu */}
        <MenubarMenu>
          <MenubarTrigger className="menu-item h-5 px-2 py-0 text-xs">Layer</MenubarTrigger>
          <MenubarContent className="panel">
            <MenubarItem onClick={() => addLayer()}>
              New Layer <MenubarShortcut>Ctrl+Shift+N</MenubarShortcut>
            </MenubarItem>
            <MenubarItem onClick={() => duplicateLayer(currentLayerIndex)}>
              Duplicate Layer
            </MenubarItem>
            <MenubarItem
              onClick={() => deleteLayer(currentLayerIndex)}
              disabled={layers.length <= 1}
            >
              Delete Layer
            </MenubarItem>
            <MenubarSeparator className="separator" />
            <MenubarItem disabled={currentLayerIndex <= 0}>
              Merge Down
            </MenubarItem>
            <MenubarItem>Flatten Image</MenubarItem>
            <MenubarSeparator className="separator" />
            <MenubarItem>Layer Properties...</MenubarItem>
          </MenubarContent>
        </MenubarMenu>

        {/* Animation Menu */}
        <MenubarMenu>
          <MenubarTrigger className="menu-item h-5 px-2 py-0 text-xs">Animation</MenubarTrigger>
          <MenubarContent className="panel">
            <MenubarItem onClick={addFrame}>New Frame</MenubarItem>
            <MenubarItem>Duplicate Frame</MenubarItem>
            <MenubarItem>Delete Frame</MenubarItem>
            <MenubarSeparator className="separator" />
            <MenubarItem onClick={togglePlay}>
              Play/Pause <MenubarShortcut>Space</MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator className="separator" />
            <MenubarItem>Animation Properties...</MenubarItem>
            <MenubarItem>Frame Tags...</MenubarItem>
          </MenubarContent>
        </MenubarMenu>

        {/* Help Menu */}
        <MenubarMenu>
          <MenubarTrigger className="menu-item h-5 px-2 py-0 text-xs">Help</MenubarTrigger>
          <MenubarContent className="panel">
            <MenubarItem>Documentation</MenubarItem>
            <MenubarItem>Keyboard Shortcuts</MenubarItem>
            <MenubarSeparator className="separator" />
            <MenubarItem>About Pixel Editor</MenubarItem>
          </MenubarContent>
        </MenubarMenu>

        {/* Project info */}
        <div className="flex-1" />
        <span className="text-pix-xs text-pix-text-muted px-2">
          {projectName} ({width}×{height})
        </span>
      </Menubar>
    </>
  )
}
