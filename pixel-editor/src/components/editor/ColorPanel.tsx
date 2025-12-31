/**
 * ColorPanel Component - Color selection and palette
 * Based on Pixelorama's ColorPickers
 */

import { useEditorStore } from "@/store/editor-store"
import { ArrowLeftRight, Plus, Trash2, Download, Upload } from "lucide-react"
import { cn } from "@/lib/utils"
import { useState, useCallback, useMemo } from "react"

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

  const handleHexSubmit = () => {
    if (/^#[0-9A-Fa-f]{6}$/.test(hexInput)) {
      setPrimaryColor(hexInput.toLowerCase())
    } else {
      setHexInput(primaryColor)
    }
    setEditingHex(false)
  }

  return (
    <div className="panel flex flex-col h-full">
      {/* Panel Header */}
      <div className="panel-header">
        <span className="panel-title">Colors</span>
      </div>

      <div className="p-2 space-y-2">
        {/* Primary/Secondary Color Display */}
        <div className="flex items-center gap-2">
          <div className="relative">
            {/* Primary Color */}
            <div
              className="w-10 h-10 rounded border cursor-pointer checker-bg"
              style={{ borderColor: 'var(--pix-border)' }}
              title="Primary Color (Left Click)"
            >
              <div
                className="w-full h-full rounded"
                style={{ backgroundColor: primaryColor }}
              />
            </div>
            {/* Secondary Color */}
            <div
              className="absolute -bottom-1 -right-1 w-6 h-6 rounded border-2 cursor-pointer checker-bg"
              style={{ borderColor: 'var(--pix-bg-secondary)' }}
              title="Secondary Color (Right Click)"
            >
              <div
                className="w-full h-full rounded"
                style={{ backgroundColor: secondaryColor }}
              />
            </div>
          </div>

          <button
            className="icon-btn"
            onClick={swapColors}
            title="Swap Colors (X)"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
          </button>

          {/* Hex Input */}
          <div className="flex-1">
            {editingHex ? (
              <input
                type="text"
                className="input w-full text-pix-xs font-mono uppercase"
                value={hexInput}
                onChange={(e) => setHexInput(e.target.value)}
                onBlur={handleHexSubmit}
                onKeyDown={(e) => e.key === 'Enter' && handleHexSubmit()}
                autoFocus
              />
            ) : (
              <button
                className="input w-full text-pix-xs font-mono uppercase text-left"
                onClick={() => {
                  setHexInput(primaryColor)
                  setEditingHex(true)
                }}
              >
                {primaryColor.toUpperCase()}
              </button>
            )}
          </div>

          {/* Color Picker */}
          <input
            type="color"
            value={primaryColor}
            onChange={(e) => setPrimaryColor(e.target.value)}
            className="w-6 h-6 cursor-pointer border-0 p-0"
          />
        </div>

        {/* HSV Sliders */}
        <div className="space-y-1.5">
          {/* Hue */}
          <div className="flex items-center gap-2">
            <span className="text-pix-xs text-pix-text-muted w-3">H</span>
            <div className="flex-1 relative h-4">
              <div
                className="absolute inset-0 rounded-sm"
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
                className="absolute top-0 w-1 h-full bg-white border border-black rounded-sm pointer-events-none"
                style={{ left: `calc(${(hsv.h / 360) * 100}% - 2px)` }}
              />
            </div>
            <span className="text-pix-xs w-8 text-right font-mono">{hsv.h}°</span>
          </div>

          {/* Saturation */}
          <div className="flex items-center gap-2">
            <span className="text-pix-xs text-pix-text-muted w-3">S</span>
            <div className="flex-1 relative h-4">
              <div
                className="absolute inset-0 rounded-sm"
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
                className="absolute top-0 w-1 h-full bg-white border border-black rounded-sm pointer-events-none"
                style={{ left: `calc(${hsv.s}% - 2px)` }}
              />
            </div>
            <span className="text-pix-xs w-8 text-right font-mono">{hsv.s}%</span>
          </div>

          {/* Value/Brightness */}
          <div className="flex items-center gap-2">
            <span className="text-pix-xs text-pix-text-muted w-3">V</span>
            <div className="flex-1 relative h-4">
              <div
                className="absolute inset-0 rounded-sm"
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
                className="absolute top-0 w-1 h-full bg-white border border-black rounded-sm pointer-events-none"
                style={{ left: `calc(${hsv.v}% - 2px)` }}
              />
            </div>
            <span className="text-pix-xs w-8 text-right font-mono">{hsv.v}%</span>
          </div>
        </div>
      </div>

      {/* Palette Section */}
      <div className="panel-header border-t" style={{ borderColor: 'var(--pix-border)' }}>
        <span className="panel-title">Palette</span>
        <div className="flex gap-0.5">
          <button className="icon-btn p-0.5" onClick={handleAddToPalette} title="Add to Palette">
            <Plus className="w-3 h-3" />
          </button>
          <button
            className="icon-btn p-0.5"
            onClick={handleRemoveFromPalette}
            disabled={selectedPaletteIndex === null}
            title="Remove from Palette"
          >
            <Trash2 className="w-3 h-3" />
          </button>
          <button className="icon-btn p-0.5" title="Import Palette">
            <Upload className="w-3 h-3" />
          </button>
          <button className="icon-btn p-0.5" title="Export Palette">
            <Download className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Palette Grid */}
      <div className="flex-1 overflow-auto p-2">
        <div className="grid grid-cols-8 gap-0.5">
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
  )
}
