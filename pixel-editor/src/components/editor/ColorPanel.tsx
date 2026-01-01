/**
 * ColorPanel Component - Color selection and palette
 * Affinity-inspired design with tabs
 */

import { useEditorStore } from "@/store/editor-store"
import { ArrowLeftRight, Plus, Trash2, Download, Upload, Pipette, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { useState, useCallback, useMemo, useRef } from "react"
import { downloadPalette, openPaletteDialog, PRESET_PALETTES } from "@/core/palette"
import { generateHarmony, HARMONY_TYPES, type HarmonyType } from "@/core/colorHarmony"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// Color conversion utilities
function hexToHsv(hex: string): { h: number; s: number; v: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return { h: 0, s: 0, v: 100 }

  let r = parseInt(result[1], 16) / 255
  let g = parseInt(result[2], 16) / 255
  let b = parseInt(result[3], 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min

  let h = 0
  const s = max === 0 ? 0 : d / max
  const v = max

  if (d !== 0) {
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }

  return { h: Math.round(h * 360), s: Math.round(s * 100), v: Math.round(v * 100) }
}

function hsvToHex(h: number, s: number, v: number): string {
  h = h / 360
  s = s / 100
  v = v / 100

  let r = 0, g = 0, b = 0
  const i = Math.floor(h * 6)
  const f = h * 6 - i
  const p = v * (1 - s)
  const q = v * (1 - f * s)
  const t = v * (1 - (1 - f) * s)

  switch (i % 6) {
    case 0: r = v; g = t; b = p; break
    case 1: r = q; g = v; b = p; break
    case 2: r = p; g = v; b = t; break
    case 3: r = p; g = q; b = v; break
    case 4: r = t; g = p; b = v; break
    case 5: r = v; g = p; b = q; break
  }

  const toHex = (n: number) => Math.round(n * 255).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

export function ColorPanel() {
  const {
    primaryColor,
    secondaryColor,
    palette,
    setPrimaryColor,
    setSecondaryColor,
    swapColors,
    addToPalette,
    removeFromPalette,
    setPalette,
  } = useEditorStore()

  const [selectedPaletteIndex, setSelectedPaletteIndex] = useState<number | null>(null)
  const [editingHex, setEditingHex] = useState(false)
  const [hexInput, setHexInput] = useState(primaryColor)

  // HSV state derived from primary color
  const hsv = useMemo(() => hexToHsv(primaryColor), [primaryColor])

  const handleHsvChange = useCallback((component: 'h' | 's' | 'v', value: number) => {
    const newHsv = { ...hsv, [component]: value }
    setPrimaryColor(hsvToHex(newHsv.h, newHsv.s, newHsv.v))
  }, [hsv, setPrimaryColor])

  const handleColorClick = (color: string, index: number) => {
    setPrimaryColor(color)
    setSelectedPaletteIndex(index)
  }

  const handleColorRightClick = (e: React.MouseEvent, color: string) => {
    e.preventDefault()
    setSecondaryColor(color)
  }

  const handleAddToPalette = () => {
    addToPalette(primaryColor)
  }

  const handleRemoveFromPalette = () => {
    if (selectedPaletteIndex !== null) {
      removeFromPalette(selectedPaletteIndex)
      setSelectedPaletteIndex(null)
    }
  }

  const handleImportPalette = async () => {
    const result = await openPaletteDialog()
    if (result) {
      setPalette(result.colors)
    }
  }

  const handleExportPalette = (format: 'gpl' | 'pal' | 'json' | 'hex' | 'css') => {
    downloadPalette(palette, format, 'palette')
  }

  const handleLoadPreset = (presetName: string) => {
    const colors = PRESET_PALETTES[presetName]
    if (colors) {
      setPalette(colors)
    }
  }

  const handleHexSubmit = () => {
    if (/^#[0-9A-Fa-f]{6}$/.test(hexInput)) {
      setPrimaryColor(hexInput.toLowerCase())
    } else {
      setHexInput(primaryColor)
    }
    setEditingHex(false)
  }

  const [activeTab, setActiveTab] = useState<'colour' | 'swatches' | 'harmony'>('colour')
  const [harmonyType, setHarmonyType] = useState<HarmonyType>('complementary')

  // Generate harmony colors based on primary color
  const harmonyColors = useMemo(() => {
    return generateHarmony(primaryColor, harmonyType)
  }, [primaryColor, harmonyType])

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--pix-bg-secondary)' }}>
      {/* Panel Tabs - Affinity style */}
      <div className="panel-tabs">
        <button
          className={cn("panel-tab", activeTab === 'colour' && "active")}
          onClick={() => setActiveTab('colour')}
        >
          Colour
        </button>
        <button
          className={cn("panel-tab", activeTab === 'swatches' && "active")}
          onClick={() => setActiveTab('swatches')}
        >
          Swatches
        </button>
        <button
          className={cn("panel-tab", activeTab === 'harmony' && "active")}
          onClick={() => setActiveTab('harmony')}
        >
          Harmony
        </button>
      </div>

      {activeTab === 'colour' ? (
        <div className="flex-1 overflow-auto p-3 space-y-3">
          {/* Color Display Row */}
          <div className="flex items-start gap-3">
            {/* Primary/Secondary Colors - Larger like Affinity */}
            <div className="color-display">
              <div
                className="color-primary checker-bg"
                title="Primary Color (Left Click)"
                onClick={() => {}}
              >
                <div
                  className="w-full h-full rounded-md"
                  style={{ backgroundColor: primaryColor }}
                />
              </div>
              <div
                className="color-secondary checker-bg"
                title="Secondary Color (Right Click)"
                onClick={() => {}}
              >
                <div
                  className="w-full h-full rounded-md"
                  style={{ backgroundColor: secondaryColor }}
                />
              </div>
            </div>

            {/* Color Info */}
            <div className="flex-1 space-y-2">
              {/* Hex Display */}
              <div className="flex items-center gap-2">
                <span className="text-pix-xs text-pix-text-muted w-6">#:</span>
                {editingHex ? (
                  <input
                    type="text"
                    className="input flex-1 text-pix-xs font-mono uppercase py-1"
                    value={hexInput}
                    onChange={(e) => setHexInput(e.target.value)}
                    onBlur={handleHexSubmit}
                    onKeyDown={(e) => e.key === 'Enter' && handleHexSubmit()}
                    autoFocus
                  />
                ) : (
                  <button
                    className="input flex-1 text-pix-xs font-mono uppercase text-left py-1"
                    onClick={() => {
                      setHexInput(primaryColor)
                      setEditingHex(true)
                    }}
                  >
                    {primaryColor.replace('#', '').toUpperCase()}
                  </button>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1">
                <button
                  className="icon-btn"
                  onClick={swapColors}
                  title="Swap Colors (X)"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5" />
                </button>
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-6 h-6 cursor-pointer border-0 p-0 rounded"
                  style={{ background: 'transparent' }}
                />
              </div>
            </div>
          </div>

          {/* HSV Sliders with Affinity styling */}
          <div className="space-y-2.5">
            {/* Hue */}
            <div className="flex items-center gap-2">
              <span className="text-pix-xs text-pix-text-muted w-5">H:</span>
              <div className="flex-1 relative h-3 rounded-full overflow-hidden">
                <div
                  className="absolute inset-0"
                  style={{
                    background: 'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)'
                  }}
                />
                <input
                  type="range"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  min={0}
                  max={360}
                  value={hsv.h}
                  onChange={(e) => handleHsvChange('h', parseInt(e.target.value))}
                />
                <div
                  className="absolute top-0 w-2 h-full bg-white border border-gray-800 rounded-full pointer-events-none shadow-sm"
                  style={{ left: `calc(${(hsv.h / 360) * 100}% - 4px)` }}
                />
              </div>
              <span className="text-pix-xs w-10 text-right font-mono">{hsv.h}</span>
            </div>

            {/* Saturation */}
            <div className="flex items-center gap-2">
              <span className="text-pix-xs text-pix-text-muted w-5">S:</span>
              <div className="flex-1 relative h-3 rounded-full overflow-hidden">
                <div
                  className="absolute inset-0"
                  style={{
                    background: `linear-gradient(to right, ${hsvToHex(hsv.h, 0, hsv.v)}, ${hsvToHex(hsv.h, 100, hsv.v)})`
                  }}
                />
                <input
                  type="range"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  min={0}
                  max={100}
                  value={hsv.s}
                  onChange={(e) => handleHsvChange('s', parseInt(e.target.value))}
                />
                <div
                  className="absolute top-0 w-2 h-full bg-white border border-gray-800 rounded-full pointer-events-none shadow-sm"
                  style={{ left: `calc(${hsv.s}% - 4px)` }}
                />
              </div>
              <span className="text-pix-xs w-10 text-right font-mono">{hsv.s}</span>
            </div>

            {/* Value/Lightness */}
            <div className="flex items-center gap-2">
              <span className="text-pix-xs text-pix-text-muted w-5">L:</span>
              <div className="flex-1 relative h-3 rounded-full overflow-hidden">
                <div
                  className="absolute inset-0"
                  style={{
                    background: `linear-gradient(to right, #000000, ${hsvToHex(hsv.h, hsv.s, 100)})`
                  }}
                />
                <input
                  type="range"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  min={0}
                  max={100}
                  value={hsv.v}
                  onChange={(e) => handleHsvChange('v', parseInt(e.target.value))}
                />
                <div
                  className="absolute top-0 w-2 h-full bg-white border border-gray-800 rounded-full pointer-events-none shadow-sm"
                  style={{ left: `calc(${hsv.v}% - 4px)` }}
                />
              </div>
              <span className="text-pix-xs w-10 text-right font-mono">{hsv.v}</span>
            </div>
          </div>

          {/* Opacity Slider */}
          <div className="flex items-center gap-2">
            <span className="text-pix-xs text-pix-text-muted">Opacity</span>
            <div className="flex-1 relative h-3 rounded-full overflow-hidden checker-bg">
              <div
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(to right, transparent, ${primaryColor})`
                }}
              />
              <input
                type="range"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                min={0}
                max={100}
                value={100}
                onChange={() => {}}
              />
              <div
                className="absolute top-0 w-2 h-full bg-white border border-gray-800 rounded-full pointer-events-none shadow-sm"
                style={{ left: 'calc(100% - 8px)' }}
              />
            </div>
            <span className="text-pix-xs w-12 text-right font-mono">100 %</span>
          </div>
        </div>
      ) : activeTab === 'swatches' ? (
        /* Swatches Tab */
        <div className="flex-1 flex flex-col">
          {/* Swatches Toolbar */}
          <div className="flex items-center justify-between px-2 py-1.5 border-b" style={{ borderColor: 'var(--pix-border)' }}>
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-1 text-pix-xs text-pix-text-muted hover:text-pix-text">
                Palette <ChevronDown className="w-3 h-3" />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="panel">
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>Load Preset</DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="panel">
                    {Object.keys(PRESET_PALETTES).map((name) => (
                      <DropdownMenuItem key={name} onClick={() => handleLoadPreset(name)}>
                        {name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSeparator className="separator" />
                <DropdownMenuItem onClick={handleImportPalette}>
                  <Upload className="w-3.5 h-3.5 mr-2" /> Import...
                </DropdownMenuItem>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <Download className="w-3.5 h-3.5 mr-2" /> Export As
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="panel">
                    <DropdownMenuItem onClick={() => handleExportPalette('gpl')}>
                      GIMP Palette (.gpl)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExportPalette('pal')}>
                      JASC Palette (.pal)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExportPalette('json')}>
                      JSON (.json)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExportPalette('hex')}>
                      HEX Text (.hex)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExportPalette('css')}>
                      CSS Variables (.css)
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="flex gap-0.5">
              <button className="icon-btn" onClick={handleAddToPalette} title="Add to Palette">
                <Plus className="w-3 h-3" />
              </button>
              <button
                className="icon-btn"
                onClick={handleRemoveFromPalette}
                disabled={selectedPaletteIndex === null}
                title="Remove from Palette"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Palette Grid */}
          <div className="flex-1 overflow-auto p-2">
            <div className="grid grid-cols-8 gap-1">
              {palette.map((color, i) => (
                <button
                  key={i}
                  className={cn(
                    "color-swatch",
                    selectedPaletteIndex === i && "active"
                  )}
                  style={{ backgroundColor: color }}
                  onClick={() => handleColorClick(color, i)}
                  onContextMenu={(e) => handleColorRightClick(e, color)}
                  title={color}
                />
              ))}
            </div>
          </div>
        </div>
      ) : activeTab === 'harmony' ? (
        /* Harmony Tab */
        <div className="flex-1 flex flex-col">
          {/* Harmony Type Selector */}
          <div className="px-3 py-2 border-b" style={{ borderColor: 'var(--pix-border)' }}>
            <select
              className="input w-full py-1 text-pix-xs"
              value={harmonyType}
              onChange={(e) => setHarmonyType(e.target.value as HarmonyType)}
            >
              {HARMONY_TYPES.map((h) => (
                <option key={h.type} value={h.type}>{h.label}</option>
              ))}
            </select>
            <p className="text-pix-xs text-pix-text-muted mt-1">
              {harmonyColors.description}
            </p>
          </div>

          {/* Harmony Colors */}
          <div className="flex-1 overflow-auto p-3">
            {/* Base Color */}
            <div className="mb-3">
              <span className="text-pix-xs text-pix-text-muted mb-1 block">Base Color</span>
              <div
                className="w-full h-8 rounded cursor-pointer"
                style={{ backgroundColor: primaryColor }}
                title={primaryColor}
              />
            </div>

            {/* Generated Harmony */}
            <div className="mb-3">
              <span className="text-pix-xs text-pix-text-muted mb-1 block">Harmony Colors</span>
              <div className="flex gap-1">
                {harmonyColors.colors.map((color, i) => (
                  <button
                    key={i}
                    className="flex-1 h-8 rounded hover:ring-2 ring-white/50 transition-all"
                    style={{ backgroundColor: color }}
                    onClick={() => setPrimaryColor(color)}
                    onContextMenu={(e) => {
                      e.preventDefault()
                      setSecondaryColor(color)
                    }}
                    title={`${color}\nLeft: Set Primary\nRight: Set Secondary`}
                  />
                ))}
              </div>
            </div>

            {/* Add to Palette */}
            <button
              className="btn w-full text-pix-xs py-1"
              onClick={() => {
                harmonyColors.colors.forEach(c => addToPalette(c))
              }}
            >
              <Plus className="w-3 h-3 mr-1" />
              Add Harmony to Palette
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
