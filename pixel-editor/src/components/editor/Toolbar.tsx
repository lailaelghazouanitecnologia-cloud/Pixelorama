import {
  Pencil,
  Eraser,
  PaintBucket,
  Pipette,
  Minus,
  Square,
  Circle,
  BoxSelect,
  Move,
  ZoomIn,
  Wand2,
  PenTool,
  Brush,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"
import { useEditorStore, type Tool } from "@/store/editor-store"
import { cn } from "@/lib/utils"

interface ToolButtonProps {
  tool: Tool
  icon: React.ReactNode
  label: string
  shortcut: string
}

function ToolButton({ tool, icon, label, shortcut }: ToolButtonProps) {
  const { currentTool, setTool } = useEditorStore()
  const isActive = currentTool === tool

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="xs"
          className={cn(
            "tool-button",
            isActive && "active"
          )}
          onClick={() => setTool(tool)}
        >
          {icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="right">
        <p>{label} <span className="text-muted-foreground ml-2">{shortcut}</span></p>
      </TooltipContent>
    </Tooltip>
  )
}

export function Toolbar() {
  return (
    <TooltipProvider delayDuration={300}>
      <div className="w-10 bg-card border-r border-border flex flex-col items-center py-2 gap-0.5">
        {/* Drawing Tools */}
        <ToolButton tool="pencil" icon={<Pencil className="w-4 h-4" />} label="Pencil" shortcut="B" />
        <ToolButton tool="eraser" icon={<Eraser className="w-4 h-4" />} label="Eraser" shortcut="E" />
        <ToolButton tool="bucket" icon={<PaintBucket className="w-4 h-4" />} label="Fill" shortcut="G" />
        <ToolButton tool="picker" icon={<Pipette className="w-4 h-4" />} label="Color Picker" shortcut="I" />

        <Separator className="my-2 w-6" />

        {/* Shape Tools */}
        <ToolButton tool="line" icon={<Minus className="w-4 h-4" />} label="Line" shortcut="L" />
        <ToolButton tool="rect" icon={<Square className="w-4 h-4" />} label="Rectangle" shortcut="R" />
        <ToolButton tool="ellipse" icon={<Circle className="w-4 h-4" />} label="Ellipse" shortcut="O" />

        <Separator className="my-2 w-6" />

        {/* Selection Tools */}
        <ToolButton tool="select" icon={<BoxSelect className="w-4 h-4" />} label="Rectangle Select" shortcut="M" />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="xs" className="tool-button">
              <Wand2 className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Magic Wand <span className="text-muted-foreground ml-2">W</span></p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="xs" className="tool-button">
              <PenTool className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Lasso <span className="text-muted-foreground ml-2">Q</span></p>
          </TooltipContent>
        </Tooltip>

        <Separator className="my-2 w-6" />

        {/* Utility Tools */}
        <ToolButton tool="move" icon={<Move className="w-4 h-4" />} label="Move" shortcut="V" />
        <ToolButton tool="zoom" icon={<ZoomIn className="w-4 h-4" />} label="Zoom" shortcut="Z" />

        <div className="flex-1" />

        {/* Extra */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="xs" className="tool-button">
              <Brush className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Brush Settings</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="xs" className="tool-button">
              <Sparkles className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Effects</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  )
}
