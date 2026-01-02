/**
 * BrushLibrary Component - Brush selection and management panel
 * Based on Pixelorama's brush selector
 */

import { useState, useRef, useCallback, useEffect } from "react"
import { useToolsStore } from "@/store/tools-store"
import {
  BUILTIN_BRUSHES,
  BrushType,
  type Brush,
  generatePixelBrush,
  generateCircleBrush,
  generateFilledCircleBrush,
  generateDiamondBrush,
  generateSoftCircleBrush,
} from "@/core/brushes"
import { cn } from "@/lib/utils"
import { Upload, Trash2, Square, Circle, CircleDot, Diamond, Paintbrush } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"

// Extended built-in brushes for the library
const LIBRARY_BRUSHES: Brush[] = [
  ...BUILTIN_BRUSHES,
  {
    id: 'diamond',
    name: 'Diamond',
    type: BrushType.CUSTOM,
    mask: null,
    sizeOverride: 0,
    useColorFromImage: false,
  },
  {
    id: 'soft_circle',
    name: 'Soft Circle',
    type: BrushType.CUSTOM,
    mask: null,
    sizeOverride: 0,
    useColorFromImage: false,
  },
]

interface BrushThumbnailProps {
  brush: Brush
  size?: number
  selected?: boolean
  onClick?: () => void
}

function BrushThumbnail({ brush, size = 24, selected, onClick }: BrushThumbnailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, size, size)
    ctx.fillStyle = '#ffffff'

    // Generate preview based on brush type
    let mask: ImageData | null = null

    switch (brush.id) {
      case 'pixel':
        mask = generatePixelBrush(Math.max(1, Math.floor(size * 0.6)))
        break
      case 'circle':
        mask = generateCircleBrush(Math.floor(size * 0.8))
        break
      case 'filled_circle':
        mask = generateFilledCircleBrush(Math.floor(size * 0.8))
        break
      case 'diamond':
        mask = generateDiamondBrush(Math.floor(size * 0.8))
        break
      case 'soft_circle':
        mask = generateSoftCircleBrush(Math.floor(size * 0.8), 0.5)
        break
      default:
        if (brush.mask) {
          mask = brush.mask
        } else {
          mask = generatePixelBrush(Math.floor(size * 0.6))
        }
    }

    if (mask) {
      // Center the brush preview
      const offsetX = Math.floor((size - mask.width) / 2)
      const offsetY = Math.floor((size - mask.height) / 2)

      // Draw mask as white on transparent
      const tempCanvas = new OffscreenCanvas(mask.width, mask.height)
      const tempCtx = tempCanvas.getContext('2d')!
      tempCtx.putImageData(mask, 0, 0)

      ctx.drawImage(tempCanvas, offsetX, offsetY)
    }
  }, [brush, size])

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          className={cn(
            "w-8 h-8 rounded border flex items-center justify-center transition-colors",
            selected
              ? "border-blue-500 bg-blue-500/20"
              : "border-pix-border hover:border-pix-text-muted bg-pix-bg"
          )}
          onClick={onClick}
        >
          <canvas
            ref={canvasRef}
            width={size}
            height={size}
            className="pixel-canvas"
          />
        </button>
      </TooltipTrigger>
      <TooltipContent className="tooltip">
        <p>{brush.name}</p>
      </TooltipContent>
    </Tooltip>
  )
}

function getBrushIcon(brushId: string) {
  switch (brushId) {
    case 'pixel':
      return <Square className="w-4 h-4" />
    case 'circle':
      return <Circle className="w-4 h-4" />
    case 'filled_circle':
      return <CircleDot className="w-4 h-4" />
    case 'diamond':
      return <Diamond className="w-4 h-4" />
    default:
      return <Paintbrush className="w-4 h-4" />
  }
}

interface BrushLibraryProps {
  collapsed?: boolean
}

export function BrushLibrary({ collapsed = false }: BrushLibraryProps) {
  const { currentBrushId, setCurrentBrushId, setCurrentBrushType } = useToolsStore()
  const [customBrushes, setCustomBrushes] = useState<Brush[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleBrushSelect = useCallback((brush: Brush) => {
    setCurrentBrushId(brush.id)
    setCurrentBrushType(brush.type)
  }, [setCurrentBrushId, setCurrentBrushType])

  const handleImportBrush = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const img = new Image()
      const url = URL.createObjectURL(file)

      img.onload = () => {
        // Create brush from image
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0)

        const imageData = ctx.getImageData(0, 0, img.width, img.height)

        const newBrush: Brush = {
          id: `custom_${Date.now()}`,
          name: file.name.replace(/\.[^/.]+$/, ''),
          type: BrushType.FILE,
          mask: imageData,
          sizeOverride: 0,
          useColorFromImage: false,
          thumbnail: url,
        }

        setCustomBrushes(prev => [...prev, newBrush])
        handleBrushSelect(newBrush)
      }

      img.src = url
    } catch (error) {
      console.error('Failed to import brush:', error)
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [handleBrushSelect])

  const handleDeleteBrush = useCallback((brushId: string) => {
    setCustomBrushes(prev => prev.filter(b => b.id !== brushId))
    if (currentBrushId === brushId) {
      setCurrentBrushId('pixel')
      setCurrentBrushType(BrushType.PIXEL)
    }
  }, [currentBrushId, setCurrentBrushId, setCurrentBrushType])

  if (collapsed) {
    // Compact mode - just show current brush
    const currentBrush = [...LIBRARY_BRUSHES, ...customBrushes].find(b => b.id === currentBrushId)
    return (
      <div className="flex items-center gap-1 px-2">
        <span className="text-pix-xs text-pix-text-muted">Brush:</span>
        {currentBrush && (
          <BrushThumbnail brush={currentBrush} size={20} selected />
        )}
      </div>
    )
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="p-2 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-pix-xs font-medium text-pix-text">Brushes</span>
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className="icon-btn w-5 h-5"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-3 h-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="tooltip">
                <p>Import brush from image</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Built-in Brushes */}
        <div className="space-y-1">
          <span className="text-pix-xs text-pix-text-muted">Built-in</span>
          <div className="flex flex-wrap gap-1">
            {LIBRARY_BRUSHES.map(brush => (
              <BrushThumbnail
                key={brush.id}
                brush={brush}
                selected={currentBrushId === brush.id}
                onClick={() => handleBrushSelect(brush)}
              />
            ))}
          </div>
        </div>

        {/* Custom Brushes */}
        {customBrushes.length > 0 && (
          <div className="space-y-1">
            <span className="text-pix-xs text-pix-text-muted">Custom</span>
            <div className="flex flex-wrap gap-1">
              {customBrushes.map(brush => (
                <div key={brush.id} className="relative group">
                  <BrushThumbnail
                    brush={brush}
                    selected={currentBrushId === brush.id}
                    onClick={() => handleBrushSelect(brush)}
                  />
                  <button
                    className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteBrush(brush.id)
                    }}
                  >
                    <Trash2 className="w-2.5 h-2.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Import hint */}
        {customBrushes.length === 0 && (
          <div className="text-pix-xs text-pix-text-muted text-center py-2">
            Click <Upload className="w-3 h-3 inline mx-0.5" /> to import custom brushes
          </div>
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImportBrush}
        />
      </div>
    </TooltipProvider>
  )
}

/**
 * Compact brush selector for the tool options bar
 */
export function BrushSelector() {
  const { currentBrushId, setCurrentBrushId, setCurrentBrushType } = useToolsStore()
  const [isOpen, setIsOpen] = useState(false)

  const currentBrush = LIBRARY_BRUSHES.find(b => b.id === currentBrushId) || LIBRARY_BRUSHES[0]

  return (
    <TooltipProvider delayDuration={300}>
      <div className="relative">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className="flex items-center gap-1 px-2 py-0.5 rounded border border-pix-border hover:border-pix-text-muted bg-pix-bg"
              onClick={() => setIsOpen(!isOpen)}
            >
              {getBrushIcon(currentBrush.id)}
              <span className="text-pix-xs">{currentBrush.name}</span>
            </button>
          </TooltipTrigger>
          <TooltipContent className="tooltip">
            <p>Select brush type</p>
          </TooltipContent>
        </Tooltip>

        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Dropdown */}
            <div className="absolute top-full left-0 mt-1 z-50 bg-pix-bg-secondary border border-pix-border rounded shadow-lg p-2 min-w-[120px]">
              {LIBRARY_BRUSHES.map(brush => (
                <button
                  key={brush.id}
                  className={cn(
                    "w-full flex items-center gap-2 px-2 py-1 rounded text-left text-pix-xs",
                    currentBrushId === brush.id
                      ? "bg-blue-500/20 text-blue-400"
                      : "hover:bg-pix-bg text-pix-text"
                  )}
                  onClick={() => {
                    setCurrentBrushId(brush.id)
                    setCurrentBrushType(brush.type)
                    setIsOpen(false)
                  }}
                >
                  {getBrushIcon(brush.id)}
                  <span>{brush.name}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </TooltipProvider>
  )
}
