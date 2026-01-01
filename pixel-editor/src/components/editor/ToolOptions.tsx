/**
 * ToolOptions Component - Tool-specific options bar
 * Based on Pixelorama's ToolOptions
 */

import { useEditorStore } from "@/store/editor-store"
import { useToolsStore } from "@/store/tools-store"
import { Undo2, Redo2, FlipHorizontal, FlipVertical, Grid3X3, Lock, Unlock, MousePointer2, Replace, Space, Columns, Rows } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"
import { getHistory } from "@/core/history"

export function ToolOptions() {
  // Tool-specific settings from tools-store
  const {
    brushSize,
    setBrushSize,
    brushOpacity,
    setBrushOpacity,
    pixelPerfect,
    setPixelPerfect,
    overwrite,
    setOverwrite,
    spacingMode,
    setSpacingMode,
    spacing,
    setSpacing,
    filled,
    setFilled,
    bucketTolerance,
    setBucketTolerance,
    shadingMode,
    setShadingMode,
    shadingAmount,
    setShadingAmount,
    mirrorH,
    setMirrorH,
    mirrorV,
    setMirrorV,
    sprayDensity,
    setSprayDensity,
    sprayRadius,
    setSprayRadius,
    currentTool,
  } = useToolsStore()

  // UI settings from editor-store
  const {
    showGrid,
    toggleGrid,
    snapToGrid,
    toggleSnapToGrid,
    canUndo,
    canRedo,
  } = useEditorStore()

  const history = getHistory()

  const handleUndo = () => history.undo()
  const handleRedo = () => history.redo()

  // Tool-specific options based on current tool
  const showBrushOptions = ['pencil', 'eraser', 'line', 'shading'].includes(currentTool)
  const showPencilOptions = currentTool === 'pencil'
  const showShapeOptions = ['rectangle', 'ellipse'].includes(currentTool)
  const showBucketOptions = currentTool === 'bucket'
  const showShadingOptions = currentTool === 'shading'
  const showSprayOptions = currentTool === 'spray'
  const showSelectionOptions = ['rectSelect', 'ellipseSelect', 'magicWand', 'lasso'].includes(currentTool)
  const showMirrorOptions = ['pencil', 'eraser', 'line', 'rectangle', 'ellipse', 'spray', 'shading'].includes(currentTool)

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

        {/* Pencil-specific: Overwrite & Spacing */}
        {showPencilOptions && (
          <>
            <div className="separator-v h-4" />
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className={`icon-btn ${overwrite ? 'active' : ''}`}
                  onClick={() => setOverwrite(!overwrite)}
                >
                  <Replace className="w-3.5 h-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="tooltip">
                <p>Overwrite Mode (replace pixels instead of blend)</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className={`icon-btn ${spacingMode ? 'active' : ''}`}
                  onClick={() => setSpacingMode(!spacingMode)}
                >
                  <Space className="w-3.5 h-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="tooltip">
                <p>Spacing Mode</p>
              </TooltipContent>
            </Tooltip>

            {spacingMode && (
              <div className="flex items-center gap-1">
                <span className="text-pix-xs text-pix-text-muted">X:</span>
                <input
                  type="number"
                  className="input w-10 text-center text-pix-xs py-0"
                  value={spacing.x}
                  onChange={(e) => setSpacing(parseInt(e.target.value) || 1, spacing.y)}
                  min={1}
                  max={64}
                />
                <span className="text-pix-xs text-pix-text-muted">Y:</span>
                <input
                  type="number"
                  className="input w-10 text-center text-pix-xs py-0"
                  value={spacing.y}
                  onChange={(e) => setSpacing(spacing.x, parseInt(e.target.value) || 1)}
                  min={1}
                  max={64}
                />
              </div>
            )}
          </>
        )}

        {/* Mirror/Symmetry options for all drawing tools */}
        {showMirrorOptions && (
          <>
            <div className="separator-v h-4" />
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className={`icon-btn ${mirrorH ? 'active' : ''}`}
                  onClick={() => setMirrorH(!mirrorH)}
                >
                  <Columns className="w-3.5 h-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="tooltip">
                <p>Mirror Horizontal (draw on both sides)</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className={`icon-btn ${mirrorV ? 'active' : ''}`}
                  onClick={() => setMirrorV(!mirrorV)}
                >
                  <Rows className="w-3.5 h-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="tooltip">
                <p>Mirror Vertical (draw on top and bottom)</p>
              </TooltipContent>
            </Tooltip>
          </>
        )}

        {/* Bucket Options */}
        {showBucketOptions && (
          <div className="flex items-center gap-2">
            <span className="text-pix-xs text-pix-text-muted">Tolerance:</span>
            <input
              type="range"
              className="slider w-20"
              value={bucketTolerance}
              onChange={(e) => setBucketTolerance(parseInt(e.target.value))}
              min={0}
              max={255}
            />
            <input
              type="number"
              className="input w-12 text-center text-pix-xs py-0"
              value={bucketTolerance}
              onChange={(e) => setBucketTolerance(parseInt(e.target.value) || 0)}
              min={0}
              max={255}
            />
          </div>
        )}

        {/* Shading Options */}
        {showShadingOptions && (
          <div className="flex items-center gap-2">
            <span className="text-pix-xs text-pix-text-muted">Mode:</span>
            <select
              className="input py-0 text-pix-xs"
              value={shadingMode}
              onChange={(e) => setShadingMode(e.target.value as 'lighten' | 'darken')}
            >
              <option value="lighten">Lighten</option>
              <option value="darken">Darken</option>
            </select>
            <div className="separator-v h-4" />
            <span className="text-pix-xs text-pix-text-muted">Amount:</span>
            <input
              type="range"
              className="slider w-20"
              value={shadingAmount}
              onChange={(e) => setShadingAmount(parseInt(e.target.value))}
              min={1}
              max={100}
            />
            <span className="text-pix-xs w-8 text-right">{shadingAmount}%</span>
          </div>
        )}

        {/* Spray Options */}
        {showSprayOptions && (
          <div className="flex items-center gap-2">
            <span className="text-pix-xs text-pix-text-muted">Radius:</span>
            <input
              type="range"
              className="slider w-20"
              value={sprayRadius}
              onChange={(e) => setSprayRadius(parseInt(e.target.value))}
              min={1}
              max={64}
            />
            <input
              type="number"
              className="input w-10 text-center text-pix-xs py-0"
              value={sprayRadius}
              onChange={(e) => setSprayRadius(Math.max(1, Math.min(64, parseInt(e.target.value) || 1)))}
              min={1}
              max={64}
            />
            <div className="separator-v h-4" />
            <span className="text-pix-xs text-pix-text-muted">Density:</span>
            <input
              type="range"
              className="slider w-16"
              value={sprayDensity}
              onChange={(e) => setSprayDensity(parseInt(e.target.value))}
              min={1}
              max={20}
            />
            <input
              type="number"
              className="input w-10 text-center text-pix-xs py-0"
              value={sprayDensity}
              onChange={(e) => setSprayDensity(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
              min={1}
              max={20}
            />
          </div>
        )}

        {/* Shape Options */}
        {showShapeOptions && (
          <div className="flex items-center gap-2">
            <span className="text-pix-xs text-pix-text-muted">Shape:</span>
            <label className="flex items-center gap-1.5 text-pix-xs cursor-pointer">
              <input
                type="checkbox"
                className="w-3 h-3"
                checked={filled}
                onChange={(e) => setFilled(e.target.checked)}
              />
              <span>Filled</span>
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
