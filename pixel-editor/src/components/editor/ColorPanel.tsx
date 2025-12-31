import { useEditorStore } from "@/store/editor-store"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Slider } from "@/components/ui/slider"
import { ArrowLeftRight, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { useState } from "react"

export function ColorPanel() {
  const {
    primaryColor,
    secondaryColor,
    palette,
    setPrimaryColor,
    setSecondaryColor,
    swapColors,
  } = useEditorStore()

  const [selectedPaletteIndex, setSelectedPaletteIndex] = useState(0)

  const handleColorClick = (color: string, index: number) => {
    setPrimaryColor(color)
    setSelectedPaletteIndex(index)
  }

  const handleColorRightClick = (e: React.MouseEvent, color: string) => {
    e.preventDefault()
    setSecondaryColor(color)
  }

  return (
    <div className="panel flex flex-col">
      <div className="panel-header">
        <span className="panel-title">Colors</span>
      </div>

      <div className="p-3 space-y-3">
        {/* Primary/Secondary Color */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <div
              className="w-10 h-10 rounded-md border border-border cursor-pointer shadow-sm"
              style={{ backgroundColor: primaryColor }}
              title="Primary Color"
            />
            <div
              className="absolute -bottom-1 -right-1 w-6 h-6 rounded border-2 border-card cursor-pointer shadow-sm"
              style={{ backgroundColor: secondaryColor }}
              title="Secondary Color"
            />
          </div>

          <Button
            variant="ghost"
            size="xs"
            onClick={swapColors}
            className="tool-button"
            title="Swap Colors (X)"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
          </Button>

          <div className="flex-1 flex flex-col gap-1">
            <input
              type="text"
              value={primaryColor.toUpperCase()}
              onChange={(e) => {
                if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
                  setPrimaryColor(e.target.value)
                }
              }}
              className="w-full px-2 py-1 bg-secondary rounded text-xs font-mono uppercase"
            />
          </div>
        </div>

        {/* HSV Sliders */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground w-4">H</span>
            <div className="flex-1 h-3 rounded-sm" style={{
              background: 'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)'
            }} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground w-4">S</span>
            <Slider defaultValue={[100]} max={100} className="flex-1" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground w-4">V</span>
            <Slider defaultValue={[100]} max={100} className="flex-1" />
          </div>
        </div>
      </div>

      {/* Palette */}
      <div className="panel-header border-t border-border">
        <span className="panel-title">Palette</span>
        <Button variant="ghost" size="xs" className="h-5 w-5 p-0">
          <Plus className="w-3 h-3" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2">
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
      </ScrollArea>
    </div>
  )
}
