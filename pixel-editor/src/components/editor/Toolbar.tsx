/**
 * Toolbar Component - Tool selection panel
 * Based on Pixelorama's ToolsPanel
 */

import {
  Pencil,
  Eraser,
  PaintBucket,
  Pipette,
  Minus,
  Square,
  Circle,
  BoxSelect,
  CircleDashed,
  Move,
  ZoomIn,
  Hand,
  Wand2,
  PenTool,
  Palette,
} from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"
import { useToolsStore, type ToolName } from "@/store/tools-store"
import { cn } from "@/lib/utils"

interface ToolButtonProps {
  tool: ToolName
  icon: React.ReactNode
  label: string
  shortcut: string
  disabled?: boolean
}

function ToolButton({ tool, icon, label, shortcut, disabled }: ToolButtonProps) {
  const { currentTool, setTool } = useToolsStore()
  const isActive = currentTool === tool

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          className={cn("tool-button", isActive && "active")}
          onClick={() => setTool(tool)}
          disabled={disabled}
        >
          {icon}
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" className="tooltip">
        <p>{label} <span className="text-pix-text-muted ml-2">{shortcut}</span></p>
      </TooltipContent>
    </Tooltip>
  )
}

function ToolSeparator() {
  return <div className="separator w-6 my-1" />
}

export function Toolbar() {
  return (
    <TooltipProvider delayDuration={300}>
      <div className="w-10 flex flex-col items-center py-2 gap-0.5"
        style={{ backgroundColor: 'var(--pix-bg-secondary)', borderRight: '1px solid var(--pix-border)' }}>

        {/* Drawing Tools */}
        <ToolButton
          tool="pencil"
          icon={<Pencil className="w-4 h-4" />}
          label="Pencil"
          shortcut="B"
        />
        <ToolButton
          tool="eraser"
          icon={<Eraser className="w-4 h-4" />}
          label="Eraser"
          shortcut="E"
        />
        <ToolButton
          tool="bucket"
          icon={<PaintBucket className="w-4 h-4" />}
          label="Bucket Fill"
          shortcut="G"
        />

        <ToolSeparator />

        {/* Shape Tools */}
        <ToolButton
          tool="line"
          icon={<Minus className="w-4 h-4" />}
          label="Line"
          shortcut="L"
        />
        <ToolButton
          tool="rectangle"
          icon={<Square className="w-4 h-4" />}
          label="Rectangle"
          shortcut="R"
        />
        <ToolButton
          tool="ellipse"
          icon={<Circle className="w-4 h-4" />}
          label="Ellipse"
          shortcut="O"
        />

        <ToolSeparator />

        {/* Selection Tools */}
        <ToolButton
          tool="rectSelect"
          icon={<BoxSelect className="w-4 h-4" />}
          label="Rectangle Select"
          shortcut="M"
        />
        <ToolButton
          tool="ellipseSelect"
          icon={<CircleDashed className="w-4 h-4" />}
          label="Ellipse Select"
          shortcut="J"
        />
        <ToolButton
          tool="magicWand"
          icon={<Wand2 className="w-4 h-4" />}
          label="Magic Wand"
          shortcut="W"
        />
        <ToolButton
          tool="colorSelect"
          icon={<Palette className="w-4 h-4" />}
          label="Select by Color"
          shortcut="U"
        />
        <ToolButton
          tool="lasso"
          icon={<PenTool className="w-4 h-4" />}
          label="Lasso"
          shortcut="Q"
        />

        <ToolSeparator />

        {/* Utility Tools */}
        <ToolButton
          tool="colorPicker"
          icon={<Pipette className="w-4 h-4" />}
          label="Color Picker"
          shortcut="I"
        />
        <ToolButton
          tool="move"
          icon={<Move className="w-4 h-4" />}
          label="Move"
          shortcut="V"
        />
        <ToolButton
          tool="pan"
          icon={<Hand className="w-4 h-4" />}
          label="Pan"
          shortcut="H"
        />
        <ToolButton
          tool="zoom"
          icon={<ZoomIn className="w-4 h-4" />}
          label="Zoom"
          shortcut="Z"
        />

        <div className="flex-1" />
      </div>
    </TooltipProvider>
  )
}
