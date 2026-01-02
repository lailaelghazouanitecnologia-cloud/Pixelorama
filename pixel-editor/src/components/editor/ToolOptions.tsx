/**
 * ToolOptions Component - Tool-specific options bar
 * Based on Pixelorama's ToolOptions
 */

import { useState } from "react"
import { useEditorStore } from "@/store/editor-store"
import { useToolsStore } from "@/store/tools-store"
import { Undo2, Redo2, FlipHorizontal, FlipVertical, Grid3X3, Lock, Unlock, MousePointer2, Replace, Space, Columns, Rows, Sun, Moon, Anchor } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"
import { getHistory } from "@/core/history"
import { DITHER_PATTERN_OPTIONS, type DitherPattern } from "@/core/dithering"
import { BrushSelector } from "./BrushLibrary"

export function ToolOptions() {
  // Local state for new tools
  const [smudgeStrength, setSmudgeStrength] = useState(50)
  const [cloneOpacity, setCloneOpacity] = useState(100)
  const [dodgeBurnMode, setDodgeBurnMode] = useState<'dodge' | 'burn'>('dodge')
  const [dodgeBurnExposure, setDodgeBurnExposure] = useState(50)
  const [dodgeBurnRange, setDodgeBurnRange] = useState<'shadows' | 'midtones' | 'highlights'>('midtones')
  const [textSize, setTextSize] = useState(16)
  const [curvePoints, setCurvePoints] = useState(2)

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
    shadingType,
    setShadingType,
    shadingMode,
    setShadingMode,
    shadingAmount,
    setShadingAmount,
    shadingHueAmount,
    setShadingHueAmount,
    shadingSatAmount,
    setShadingSatAmount,
    shadingValueAmount,
    setShadingValueAmount,
    mirrorH,
    setMirrorH,
    mirrorV,
    setMirrorV,
    sprayDensity,
    setSprayDensity,
    sprayRadius,
    setSprayRadius,
    ditherPattern,
    setDitherPattern,
    stabilizerEnabled,
    setStabilizerEnabled,
    stabilizerValue,
    setStabilizerValue,
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
    flipHorizontal,
    flipVertical,
  } = useEditorStore()

  // Selection settings from tools-store
  const {
    selectionMode,
    setSelectionMode,
    selectionTolerance,
    setSelectionTolerance,
  } = useToolsStore()

  const history = getHistory()

  const handleUndo = () => history.undo()
  const handleRedo = () => history.redo()

  // Tool-specific options based on current tool
  const showBrushOptions = ['pencil', 'eraser', 'line', 'shading', 'smudge', 'cloneStamp', 'dodgeBurn'].includes(currentTool)
  const showPencilOptions = currentTool === 'pencil'
  const showShapeOptions = ['rectangle', 'ellipse'].includes(currentTool)
  const showBucketOptions = currentTool === 'bucket'
  const showShadingOptions = currentTool === 'shading'
  const showSprayOptions = currentTool === 'spray'
  const showSelectionOptions = ['rectSelect', 'ellipseSelect', 'magicWand', 'lasso', 'polygonSelect', 'paintSelect', 'colorSelect'].includes(currentTool)
  const showMirrorOptions = ['pencil', 'eraser', 'line', 'rectangle', 'ellipse', 'spray', 'shading', 'smudge', 'cloneStamp'].includes(currentTool)
  const showSmudgeOptions = currentTool === 'smudge'
  const showCloneStampOptions = currentTool === 'cloneStamp'
  const showDodgeBurnOptions = currentTool === 'dodgeBurn'
  const showTextOptions = currentTool === 'text'
  const showCurveOptions = currentTool === 'curve'
  const showIsometricOptions = currentTool === 'isometricBox'
  const showTransformOptions = currentTool === 'transform'
  const showTileMapOptions = currentTool === 'tileMap'

  return (
    <TooltipProvider delayDuration={300}>
      <div
        className="h-7 flex items-center px-2 gap-3"
        style={{
          backgroundColor: 'var(--pix-bg-secondary)',
          borderBottom: '1px solid var(--pix-border)'
        }}
      >
        {/* Brush Type Selector */}
        {showPencilOptions && (
          <>
            <BrushSelector />
            <div className="separator-v h-4" />
          </>
        )}

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

        {/* Brush Opacity - for pencil, eraser, line */}
        {showBrushOptions && !showSmudgeOptions && !showCloneStampOptions && !showDodgeBurnOptions && (
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

        {/* Smudge Options */}
        {showSmudgeOptions && (
          <>
            <div className="separator-v h-4" />
            <div className="flex items-center gap-2">
              <span className="text-pix-xs text-pix-text-muted">Strength:</span>
              <input
                type="range"
                className="slider w-20"
                value={smudgeStrength}
                onChange={(e) => setSmudgeStrength(parseInt(e.target.value))}
                min={1}
                max={100}
              />
              <span className="text-pix-xs w-8 text-right">{smudgeStrength}%</span>
            </div>
          </>
        )}

        {/* Clone Stamp Options */}
        {showCloneStampOptions && (
          <>
            <div className="separator-v h-4" />
            <div className="flex items-center gap-2">
              <span className="text-pix-xs text-pix-text-muted">Opacity:</span>
              <input
                type="range"
                className="slider w-20"
                value={cloneOpacity}
                onChange={(e) => setCloneOpacity(parseInt(e.target.value))}
                min={1}
                max={100}
              />
              <span className="text-pix-xs w-8 text-right">{cloneOpacity}%</span>
            </div>
            <span className="text-pix-xs text-pix-text-muted ml-2">Alt+Click to set source</span>
          </>
        )}

        {/* Dodge/Burn Options */}
        {showDodgeBurnOptions && (
          <>
            <div className="separator-v h-4" />
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className={`icon-btn ${dodgeBurnMode === 'dodge' ? 'active' : ''}`}
                    onClick={() => setDodgeBurnMode('dodge')}
                  >
                    <Sun className="w-3.5 h-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="tooltip">
                  <p>Dodge (Lighten)</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className={`icon-btn ${dodgeBurnMode === 'burn' ? 'active' : ''}`}
                    onClick={() => setDodgeBurnMode('burn')}
                  >
                    <Moon className="w-3.5 h-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="tooltip">
                  <p>Burn (Darken)</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="separator-v h-4" />
            <div className="flex items-center gap-2">
              <span className="text-pix-xs text-pix-text-muted">Exposure:</span>
              <input
                type="range"
                className="slider w-16"
                value={dodgeBurnExposure}
                onChange={(e) => setDodgeBurnExposure(parseInt(e.target.value))}
                min={1}
                max={100}
              />
              <span className="text-pix-xs w-8 text-right">{dodgeBurnExposure}%</span>
            </div>
            <div className="separator-v h-4" />
            <div className="flex items-center gap-2">
              <span className="text-pix-xs text-pix-text-muted">Range:</span>
              <select
                className="input py-0 text-pix-xs"
                value={dodgeBurnRange}
                onChange={(e) => setDodgeBurnRange(e.target.value as 'shadows' | 'midtones' | 'highlights')}
              >
                <option value="shadows">Shadows</option>
                <option value="midtones">Midtones</option>
                <option value="highlights">Highlights</option>
              </select>
            </div>
          </>
        )}

        {/* Text Options */}
        {showTextOptions && (
          <div className="flex items-center gap-2">
            <span className="text-pix-xs text-pix-text-muted">Font Size:</span>
            <input
              type="number"
              className="input w-12 text-center text-pix-xs py-0"
              value={textSize}
              onChange={(e) => setTextSize(Math.max(4, Math.min(128, parseInt(e.target.value) || 16)))}
              min={4}
              max={128}
            />
            <span className="text-pix-xs text-pix-text-muted ml-2">Click to place text</span>
          </div>
        )}

        {/* Curve Options */}
        {showCurveOptions && (
          <div className="flex items-center gap-2">
            <span className="text-pix-xs text-pix-text-muted">Control Points:</span>
            <select
              className="input py-0 text-pix-xs"
              value={curvePoints}
              onChange={(e) => setCurvePoints(parseInt(e.target.value))}
            >
              <option value={2}>2 (Quadratic)</option>
              <option value={3}>3 (Cubic)</option>
            </select>
            <span className="text-pix-xs text-pix-text-muted ml-2">Click to place points, Enter to confirm</span>
          </div>
        )}

        {/* Isometric Box Options */}
        {showIsometricOptions && (
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-pix-xs cursor-pointer">
              <input
                type="checkbox"
                className="w-3 h-3"
                checked={filled}
                onChange={(e) => setFilled(e.target.checked)}
              />
              <span>Filled</span>
            </label>
            <span className="text-pix-xs text-pix-text-muted ml-2">Drag to create isometric box</span>
          </div>
        )}

        {/* Transform Options */}
        {showTransformOptions && (
          <div className="flex items-center gap-2">
            <span className="text-pix-xs text-pix-text-muted">
              Drag handles to scale, drag inside to move, drag rotation handle to rotate
            </span>
          </div>
        )}

        {/* TileMap Options */}
        {showTileMapOptions && (
          <div className="flex items-center gap-2">
            <span className="text-pix-xs text-pix-text-muted">
              Select tile from palette, click to place
            </span>
          </div>
        )}

        {/* Pixel Perfect & Stabilizer */}
        {showBrushOptions && !showSmudgeOptions && !showCloneStampOptions && !showDodgeBurnOptions && (
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

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className={`icon-btn ${stabilizerEnabled ? 'active' : ''}`}
                  onClick={() => setStabilizerEnabled(!stabilizerEnabled)}
                >
                  <Anchor className="w-3.5 h-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="tooltip">
                <p>Stabilizer (smooth strokes)</p>
              </TooltipContent>
            </Tooltip>

            {stabilizerEnabled && (
              <div className="flex items-center gap-1">
                <input
                  type="range"
                  className="slider w-16"
                  value={stabilizerValue}
                  onChange={(e) => setStabilizerValue(parseInt(e.target.value))}
                  min={4}
                  max={64}
                />
                <span className="text-pix-xs w-5 text-right">{stabilizerValue}</span>
              </div>
            )}
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

            <div className="separator-v h-4" />
            <span className="text-pix-xs text-pix-text-muted">Dither:</span>
            <select
              className="input py-0 text-pix-xs"
              value={ditherPattern}
              onChange={(e) => setDitherPattern(e.target.value as DitherPattern)}
            >
              {DITHER_PATTERN_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
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
            <span className="text-pix-xs text-pix-text-muted">Type:</span>
            <select
              className="input py-0 text-pix-xs"
              value={shadingType}
              onChange={(e) => setShadingType(e.target.value as 'simple' | 'hue_shifting' | 'color_replace')}
            >
              <option value="simple">Simple</option>
              <option value="hue_shifting">Hue Shifting</option>
              <option value="color_replace">Color Replace</option>
            </select>
            <div className="separator-v h-4" />
            <span className="text-pix-xs text-pix-text-muted">Mode:</span>
            <select
              className="input py-0 text-pix-xs"
              value={shadingMode}
              onChange={(e) => setShadingMode(e.target.value as 'lighten' | 'darken')}
            >
              <option value="lighten">Lighten</option>
              <option value="darken">Darken</option>
            </select>
            {shadingType === 'simple' && (
              <>
                <div className="separator-v h-4" />
                <span className="text-pix-xs text-pix-text-muted">Amount:</span>
                <input
                  type="range"
                  className="slider w-16"
                  value={shadingAmount}
                  onChange={(e) => setShadingAmount(parseInt(e.target.value))}
                  min={1}
                  max={100}
                />
                <span className="text-pix-xs w-6 text-right">{shadingAmount}%</span>
              </>
            )}
            {shadingType === 'hue_shifting' && (
              <>
                <div className="separator-v h-4" />
                <span className="text-pix-xs text-pix-text-muted">H:</span>
                <input
                  type="range"
                  className="slider w-12"
                  value={shadingHueAmount}
                  onChange={(e) => setShadingHueAmount(parseInt(e.target.value))}
                  min={0}
                  max={100}
                />
                <span className="text-pix-xs text-pix-text-muted">S:</span>
                <input
                  type="range"
                  className="slider w-12"
                  value={shadingSatAmount}
                  onChange={(e) => setShadingSatAmount(parseInt(e.target.value))}
                  min={0}
                  max={100}
                />
                <span className="text-pix-xs text-pix-text-muted">V:</span>
                <input
                  type="range"
                  className="slider w-12"
                  value={shadingValueAmount}
                  onChange={(e) => setShadingValueAmount(parseInt(e.target.value))}
                  min={0}
                  max={100}
                />
              </>
            )}
            {shadingType === 'color_replace' && (
              <span className="text-pix-xs text-pix-text-muted ml-2">
                Select colors from palette to define replacement sequence
              </span>
            )}
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
            <select
              className="input py-0 text-pix-xs"
              value={selectionMode}
              onChange={(e) => setSelectionMode(e.target.value as 'replace' | 'add' | 'subtract' | 'intersect')}
            >
              <option value="replace">Replace</option>
              <option value="add">Add (Shift)</option>
              <option value="subtract">Subtract (Alt)</option>
              <option value="intersect">Intersect (Ctrl+Shift)</option>
            </select>
            {(currentTool === 'magicWand' || currentTool === 'colorSelect') && (
              <>
                <div className="separator-v h-4 mx-1" />
                <span className="text-pix-xs text-pix-text-muted">Tolerance:</span>
                <input
                  type="number"
                  className="input w-12 text-center text-pix-xs py-0"
                  value={selectionTolerance}
                  onChange={(e) => setSelectionTolerance(parseInt(e.target.value) || 0)}
                  min={0}
                  max={255}
                />
              </>
            )}
            {currentTool === 'paintSelect' && (
              <span className="text-pix-xs text-pix-text-muted ml-2">Paint to add/remove from selection</span>
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
              <button className="icon-btn" onClick={flipHorizontal}>
                <FlipHorizontal className="w-3.5 h-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="tooltip">
              <p>Flip Horizontal</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button className="icon-btn" onClick={flipVertical}>
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
