/**
 * ToolOptions Component - Tool-specific options bar
 * Based on Pixelorama's ToolOptions
 */

import { useEditorStore } from "@/store/editor-store"
import { Undo2, Redo2, FlipHorizontal, FlipVertical, Grid3X3, Lock, Unlock, MousePointer2 } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"
import { getHistory } from "@/core/history"

export function ToolOptions() {
  const {
    brushSize,
    setBrushSize,
    brushOpacity,
    setBrushOpacity,
    pixelPerfect,
    setPixelPerfect,
    showGrid,
    toggleGrid,
    snapToGrid,
    toggleSnapToGrid,
    currentTool,
    canUndo,
    canRedo,
  } = useEditorStore()

  const history = getHistory()

  const handleUndo = () => history.undo()
  const handleRedo = () => history.redo()

  // Tool-specific options based on current tool
  const showBrushOptions = ['pencil', 'eraser', 'line'].includes(currentTool)
  const showShapeOptions = ['rectangle', 'ellipse'].includes(currentTool)
  const showSelectionOptions = ['rectSelect', 'magicWand', 'lasso'].includes(currentTool)

  return (
    <TooltipProvider delayDuration={300}>
      <div
        className="h-7 flex items-center px-2 gap-3"
        style={{
          backgroundColor: 'var(--pix-bg-secondary)',
          borderBottom: '1px solid var(--pix-border)'
        }}
      >
        {/* Brush Size */}
        {showBrushOptions && (
          <div className="flex items-center gap-2">
            <span className="text-pix-xs text-pix-text-muted">Size:</span>
            <input
              type="range"
              className="slider w-20"
              value={brushSize}
              onChange={(e) => setBrushSize(parseInt(e.target.value))}
              min={1}
              max={64}
            />
            <input
              type="number"
              className="input w-10 text-center text-pix-xs py-0"
              value={brushSize}
              onChange={(e) => setBrushSize(Math.max(1, Math.min(64, parseInt(e.target.value) || 1)))}
              min={1}
              max={64}
            />
          </div>
        )}

        {/* Brush Opacity */}
        {showBrushOptions && (
          <>
            <div className="separator-v h-4" />
            <div className="flex items-center gap-2">
              <span className="text-pix-xs text-pix-text-muted">Opacity:</span>
              <input
                type="range"
                className="slider w-20"
                value={brushOpacity}
                onChange={(e) => setBrushOpacity(parseInt(e.target.value))}
                min={1}
                max={100}
              />
              <span className="text-pix-xs w-8 text-right">{brushOpacity}%</span>
            </div>
          </>
        )}

        {/* Pixel Perfect */}
        {showBrushOptions && (
          <>
            <div className="separator-v h-4" />
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className={`icon-btn ${pixelPerfect ? 'active' : ''}`}
                  onClick={() => setPixelPerfect(!pixelPerfect)}
                >
                  <MousePointer2 className="w-3.5 h-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="tooltip">
                <p>Pixel Perfect Mode</p>
              </TooltipContent>
            </Tooltip>
          </>
        )}

        {/* Shape Options */}
        {showShapeOptions && (
          <div className="flex items-center gap-2">
            <span className="text-pix-xs text-pix-text-muted">Shape:</span>
            <label className="flex items-center gap-1.5 text-pix-xs cursor-pointer">
              <input type="checkbox" className="w-3 h-3" />
              <span>Filled</span>
            </label>
            <div className="separator-v h-4 mx-1" />
            <label className="flex items-center gap-1.5 text-pix-xs cursor-pointer">
              <input type="checkbox" className="w-3 h-3" />
              <span>Anti-alias</span>
            </label>
          </div>
        )}

        {/* Selection Options */}
        {showSelectionOptions && (
          <div className="flex items-center gap-2">
            <span className="text-pix-xs text-pix-text-muted">Mode:</span>
            <select className="input py-0 text-pix-xs">
              <option value="replace">Replace</option>
              <option value="add">Add (Shift)</option>
              <option value="subtract">Subtract (Alt)</option>
              <option value="intersect">Intersect (Ctrl+Shift)</option>
            </select>
            {currentTool === 'magicWand' && (
              <>
                <div className="separator-v h-4 mx-1" />
                <span className="text-pix-xs text-pix-text-muted">Tolerance:</span>
                <input
                  type="number"
                  className="input w-12 text-center text-pix-xs py-0"
                  defaultValue={0}
                  min={0}
                  max={255}
                />
              </>
            )}
          </div>
        )}

        <div className="flex-1" />

        {/* Quick Actions */}
        <div className="flex items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className="icon-btn"
                onClick={handleUndo}
                disabled={!canUndo}
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="tooltip">
              <p>Undo <span className="text-pix-text-muted">Ctrl+Z</span></p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className="icon-btn"
                onClick={handleRedo}
                disabled={!canRedo}
              >
                <Redo2 className="w-3.5 h-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="tooltip">
              <p>Redo <span className="text-pix-text-muted">Ctrl+Y</span></p>
            </TooltipContent>
          </Tooltip>

          <div className="separator-v h-4 mx-1" />

          <Tooltip>
            <TooltipTrigger asChild>
              <button className="icon-btn">
                <FlipHorizontal className="w-3.5 h-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="tooltip">
              <p>Flip Horizontal</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button className="icon-btn">
                <FlipVertical className="w-3.5 h-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="tooltip">
              <p>Flip Vertical</p>
            </TooltipContent>
          </Tooltip>

          <div className="separator-v h-4 mx-1" />

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className={`icon-btn ${showGrid ? 'active' : ''}`}
                onClick={toggleGrid}
              >
                <Grid3X3 className="w-3.5 h-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="tooltip">
              <p>Toggle Grid</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className={`icon-btn ${snapToGrid ? 'active' : ''}`}
                onClick={toggleSnapToGrid}
              >
                {snapToGrid ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
              </button>
            </TooltipTrigger>
            <TooltipContent className="tooltip">
              <p>Snap to Grid</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  )
}
