/**
 * TopMenu Component - Main menu bar
 * Based on Pixelorama's TopMenuContainer
 */

import { useCallback } from "react"
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
import { useUIStore } from "@/store/ui-store"
import { getHistory } from "@/core/history"
import { downloadCanvas } from "@/core/export"
import { downloadProject, openProjectDialog } from "@/core/project"

export function TopMenu() {
  const { openDialog } = useUIStore()

  const {
    projectName,
    width,
    height,
    showGrid,
    showOnionSkin,
    showRulers,
    showGuides,
    snapToGrid,
    snapToGuides,
    canUndo,
    canRedo,
    toggleGrid,
    toggleOnionSkin,
    toggleRulers,
    toggleGuides,
    toggleSnapToGrid,
    toggleSnapToGuides,
    addCenterGuides,
    addThirdsGuides,
    clearGuides,
    zoomIn,
    zoomOut,
    resetZoom,
    addLayer,
    duplicateLayer,
    deleteLayer,
    mergeLayerDown,
    flattenLayers,
    currentLayerIndex,
    layers,
    addFrame,
    togglePlay,
    newProject,
    selectAll,
    clearSelection,
    selection,
    cropToSelection,
  } = useEditorStore()

  const history = getHistory()

  // File operations
  const handleNew = useCallback(() => {
    openDialog('newProject')
  }, [openDialog])

  const handleOpen = useCallback(() => {
    openProjectDialog()
  }, [])

  const handleSave = useCallback(() => {
    downloadProject()
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
            <MenubarItem onClick={() => openDialog('importImage')}>
              Import... <MenubarShortcut>Ctrl+I</MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator className="separator" />
            <MenubarItem onClick={handleSave}>
              Save <MenubarShortcut>Ctrl+S</MenubarShortcut>
            </MenubarItem>
            <MenubarItem onClick={handleSave}>
              Save As... <MenubarShortcut>Ctrl+Shift+S</MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator className="separator" />
            <MenubarItem onClick={() => openDialog('exportImage')}>
              Export... <MenubarShortcut>Ctrl+E</MenubarShortcut>
            </MenubarItem>
            <MenubarSub>
              <MenubarSubTrigger>Quick Export</MenubarSubTrigger>
              <MenubarSubContent className="panel">
                <MenubarItem onClick={handleExportPNG}>PNG</MenubarItem>
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
            <MenubarItem onClick={() => openDialog('preferences')}>
              Preferences...
            </MenubarItem>
            <MenubarItem onClick={() => openDialog('keyboardShortcuts')}>
              Keyboard Shortcuts...
            </MenubarItem>
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
            <MenubarCheckboxItem checked={showGuides} onClick={toggleGuides}>
              Show Guides
            </MenubarCheckboxItem>
            <MenubarSeparator className="separator" />
            <MenubarCheckboxItem checked={snapToGrid} onClick={toggleSnapToGrid}>
              Snap to Grid
            </MenubarCheckboxItem>
            <MenubarCheckboxItem checked={snapToGuides} onClick={toggleSnapToGuides}>
              Snap to Guides
            </MenubarCheckboxItem>
            <MenubarCheckboxItem checked={showOnionSkin} onClick={toggleOnionSkin}>
              Onion Skinning
            </MenubarCheckboxItem>
            <MenubarSeparator className="separator" />
            <MenubarSub>
              <MenubarSubTrigger>Guides</MenubarSubTrigger>
              <MenubarSubContent className="panel">
                <MenubarItem onClick={addCenterGuides}>Add Center Guides</MenubarItem>
                <MenubarItem onClick={addThirdsGuides}>Add Thirds Guides</MenubarItem>
                <MenubarSeparator className="separator" />
                <MenubarItem onClick={clearGuides}>Clear All Guides</MenubarItem>
              </MenubarSubContent>
            </MenubarSub>
            <MenubarItem>Mirror View</MenubarItem>
          </MenubarContent>
        </MenubarMenu>

        {/* Image Menu */}
        <MenubarMenu>
          <MenubarTrigger className="menu-item h-5 px-2 py-0 text-xs">Image</MenubarTrigger>
          <MenubarContent className="panel">
            <MenubarItem onClick={() => openDialog('resizeCanvas')}>Resize Canvas...</MenubarItem>
            <MenubarItem>Scale Image...</MenubarItem>
            <MenubarItem
              onClick={cropToSelection}
              disabled={!selection.active}
            >
              Crop to Selection
            </MenubarItem>
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
            <MenubarItem onClick={() => openDialog('effects')}>
              Effects... <MenubarShortcut>Ctrl+U</MenubarShortcut>
            </MenubarItem>
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
            <MenubarItem
              onClick={() => mergeLayerDown(currentLayerIndex)}
              disabled={currentLayerIndex <= 0}
            >
              Merge Down
            </MenubarItem>
            <MenubarItem
              onClick={() => flattenLayers()}
              disabled={layers.length <= 1}
            >
              Flatten Image
            </MenubarItem>
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
            <MenubarItem onClick={() => openDialog('animationTags')}>
              Frame Tags...
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>

        {/* Help Menu */}
        <MenubarMenu>
          <MenubarTrigger className="menu-item h-5 px-2 py-0 text-xs">Help</MenubarTrigger>
          <MenubarContent className="panel">
            <MenubarItem>Documentation</MenubarItem>
            <MenubarItem onClick={() => openDialog('keyboardShortcuts')}>
              Keyboard Shortcuts
            </MenubarItem>
            <MenubarSeparator className="separator" />
            <MenubarItem onClick={() => openDialog('about')}>
              About Pixel Editor
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>

        {/* Project info */}
        <div className="flex-1" />
        <span className="text-pix-xs text-pix-text-muted px-2">
          {projectName} ({width}×{height})
        </span>
      </Menubar>
  )
}
