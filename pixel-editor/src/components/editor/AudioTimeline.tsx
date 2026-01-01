/**
 * AudioTimeline Component - Visual timeline for audio layers
 * Displays audio regions, waveforms, and allows editing
 */

import { useRef, useEffect, useCallback, useState } from "react"
import { useAudioStore } from "@/store/audio-store"
import { useEditorStore } from "@/store/editor-store"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { ScrollArea } from "@/components/ui/scroll-area"
import { drawWaveform, formatTime, framesToTime } from "@/core/audio"

interface AudioTimelineProps {
  className?: string
  height?: number
}

export function AudioTimeline({ className = "", height = 120 }: AudioTimelineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStartX, setDragStartX] = useState(0)
  const [dragRegionId, setDragRegionId] = useState<string | null>(null)
  const [dragStartFrame, setDragStartFrame] = useState(0)

  const audioLayers = useAudioStore((s) => s.audioLayers)
  const currentAudioLayerIndex = useAudioStore((s) => s.currentAudioLayerIndex)
  const selectedRegionId = useAudioStore((s) => s.selectedRegionId)
  const masterVolume = useAudioStore((s) => s.masterVolume)
  const addAudioLayer = useAudioStore((s) => s.addAudioLayer)
  const removeAudioLayer = useAudioStore((s) => s.removeAudioLayer)
  const setCurrentAudioLayer = useAudioStore((s) => s.setCurrentAudioLayer)
  const toggleLayerMute = useAudioStore((s) => s.toggleLayerMute)
  const toggleLayerSolo = useAudioStore((s) => s.toggleLayerSolo)
  const selectRegion = useAudioStore((s) => s.selectRegion)
  const moveRegionTo = useAudioStore((s) => s.moveRegionTo)
  const removeRegion = useAudioStore((s) => s.removeRegion)
  const setMasterVolumeAction = useAudioStore((s) => s.setMasterVolume)
  const getWaveform = useAudioStore((s) => s.getWaveform)
  const getClip = useAudioStore((s) => s.getClip)
  const loadClip = useAudioStore((s) => s.loadClip)
  const addRegion = useAudioStore((s) => s.addRegion)

  const fps = useEditorStore((s) => s.fps)
  const currentFrameIndex = useEditorStore((s) => s.currentFrameIndex)
  const frames = useEditorStore((s) => s.frames)
  const totalFrames = frames.length || 1

  const pixelsPerFrame = 10
  const layerHeight = 40
  const headerWidth = 100

  // Draw the timeline
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = Math.max(totalFrames * pixelsPerFrame + headerWidth, 500)
    canvas.width = width
    canvas.height = Math.max(audioLayers.length * layerHeight, height)

    ctx.clearRect(0, 0, width, canvas.height)

    // Draw background
    ctx.fillStyle = '#1a1a2e'
    ctx.fillRect(0, 0, width, canvas.height)

    // Draw frame grid
    ctx.strokeStyle = '#2a2a4a'
    ctx.lineWidth = 1

    for (let frame = 0; frame <= totalFrames; frame++) {
      const x = headerWidth + frame * pixelsPerFrame
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, canvas.height)
      ctx.stroke()
    }

    // Draw layer headers and regions
    audioLayers.forEach((layer, index) => {
      const y = index * layerHeight

      // Layer background
      ctx.fillStyle = index === currentAudioLayerIndex ? '#2a3a5a' : '#1e1e3a'
      ctx.fillRect(0, y, headerWidth, layerHeight)

      // Layer name
      ctx.fillStyle = layer.muted ? '#666' : '#fff'
      ctx.font = '11px sans-serif'
      ctx.fillText(layer.name, 8, y + 15)

      // Mute/Solo indicators
      if (layer.muted) {
        ctx.fillStyle = '#ff6666'
        ctx.fillText('M', 8, y + 30)
      }
      if (layer.solo) {
        ctx.fillStyle = '#66ff66'
        ctx.fillText('S', 20, y + 30)
      }

      // Draw regions
      ctx.fillStyle = '#1e2e4a'
      ctx.fillRect(headerWidth, y, width - headerWidth, layerHeight)

      layer.regions.forEach((region) => {
        const clip = getClip(region.clipId)
        if (!clip) return

        const regionX = headerWidth + region.startFrame * pixelsPerFrame
        const regionWidth = Math.ceil(region.duration * fps) * pixelsPerFrame

        // Region background
        const isSelected = region.id === selectedRegionId
        ctx.fillStyle = isSelected ? '#4a6a9a' : '#3a5a8a'
        ctx.fillRect(regionX, y + 2, regionWidth, layerHeight - 4)

        // Region border
        ctx.strokeStyle = isSelected ? '#8ac' : '#5a7aaa'
        ctx.lineWidth = isSelected ? 2 : 1
        ctx.strokeRect(regionX, y + 2, regionWidth, layerHeight - 4)

        // Draw waveform
        const waveform = getWaveform(region.clipId, Math.max(1, regionWidth))
        if (waveform) {
          ctx.save()
          ctx.beginPath()
          ctx.rect(regionX, y + 2, regionWidth, layerHeight - 4)
          ctx.clip()

          drawWaveform(
            ctx,
            waveform,
            regionX,
            y + 4,
            regionWidth,
            layerHeight - 8,
            region.muted ? '#445' : '#6af'
          )
          ctx.restore()
        }

        // Region name
        ctx.fillStyle = region.muted ? '#888' : '#fff'
        ctx.font = '10px sans-serif'
        ctx.fillText(clip.name, regionX + 4, y + 14)
      })
    })

    // Draw playhead
    const playheadX = headerWidth + currentFrameIndex * pixelsPerFrame
    ctx.strokeStyle = '#ff4444'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(playheadX, 0)
    ctx.lineTo(playheadX, canvas.height)
    ctx.stroke()

    // Draw playhead triangle
    ctx.fillStyle = '#ff4444'
    ctx.beginPath()
    ctx.moveTo(playheadX - 6, 0)
    ctx.lineTo(playheadX + 6, 0)
    ctx.lineTo(playheadX, 8)
    ctx.closePath()
    ctx.fill()

  }, [audioLayers, currentAudioLayerIndex, selectedRegionId, currentFrameIndex, totalFrames, fps, pixelsPerFrame, getWaveform, getClip, height])

  // Handle mouse events
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // Check if clicked on a layer header
    if (x < headerWidth) {
      const layerIndex = Math.floor(y / layerHeight)
      if (layerIndex >= 0 && layerIndex < audioLayers.length) {
        setCurrentAudioLayer(layerIndex)
      }
      return
    }

    // Check if clicked on a region
    const frame = Math.floor((x - headerWidth) / pixelsPerFrame)
    const layerIndex = Math.floor(y / layerHeight)

    if (layerIndex >= 0 && layerIndex < audioLayers.length) {
      const layer = audioLayers[layerIndex]

      for (const region of layer.regions) {
        const clip = getClip(region.clipId)
        if (!clip) continue

        const regionStart = region.startFrame
        const regionEnd = regionStart + Math.ceil(region.duration * fps)

        if (frame >= regionStart && frame < regionEnd) {
          selectRegion(region.id)
          setIsDragging(true)
          setDragStartX(x)
          setDragRegionId(region.id)
          setDragStartFrame(region.startFrame)
          return
        }
      }

      // Clicked on empty space
      selectRegion(null)
    }
  }, [audioLayers, fps, pixelsPerFrame, setCurrentAudioLayer, selectRegion, getClip])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !dragRegionId) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left

    const deltaFrames = Math.round((x - dragStartX) / pixelsPerFrame)
    const newStartFrame = Math.max(0, dragStartFrame + deltaFrames)

    // Find the layer containing the region
    for (let i = 0; i < audioLayers.length; i++) {
      const region = audioLayers[i].regions.find(r => r.id === dragRegionId)
      if (region) {
        moveRegionTo(i, dragRegionId, newStartFrame)
        break
      }
    }
  }, [isDragging, dragRegionId, dragStartX, dragStartFrame, pixelsPerFrame, audioLayers, moveRegionTo])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
    setDragRegionId(null)
  }, [])

  const handleDoubleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    if (x < headerWidth) return

    const frame = Math.floor((x - headerWidth) / pixelsPerFrame)
    const layerIndex = Math.floor(y / layerHeight)

    if (layerIndex >= 0 && layerIndex < audioLayers.length) {
      // Open region properties or add new region
      // For now, we'll just log
      console.log('Double click at frame', frame, 'layer', layerIndex)
    }
  }, [audioLayers, pixelsPerFrame])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Delete' && selectedRegionId) {
      // Find and remove the selected region
      for (let i = 0; i < audioLayers.length; i++) {
        const region = audioLayers[i].regions.find(r => r.id === selectedRegionId)
        if (region) {
          removeRegion(i, selectedRegionId)
          break
        }
      }
    }
  }, [selectedRegionId, audioLayers, removeRegion])

  const handleImportAudio = useCallback(async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'audio/*'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        const clip = await loadClip(file)
        if (currentAudioLayerIndex >= 0) {
          addRegion(currentAudioLayerIndex, clip.id, currentFrameIndex)
        }
      }
    }
    input.click()
  }, [loadClip, addRegion, currentAudioLayerIndex, currentFrameIndex])

  if (audioLayers.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center p-4 bg-muted/30 ${className}`}>
        <p className="text-sm text-muted-foreground mb-2">No audio layers</p>
        <Button size="sm" onClick={() => addAudioLayer()}>
          Add Audio Layer
        </Button>
      </div>
    )
  }

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Toolbar */}
      <div className="flex gap-1 items-center p-1 border-b">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="icon" variant="ghost" onClick={() => addAudioLayer()}>
              <span className="text-xs">+</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Add Audio Layer</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => removeAudioLayer(currentAudioLayerIndex)}
              disabled={currentAudioLayerIndex < 0}
            >
              <span className="text-xs">-</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Remove Audio Layer</TooltipContent>
        </Tooltip>

        <div className="w-px h-4 bg-border mx-1" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="sm" variant="ghost" onClick={handleImportAudio}>
              Import
            </Button>
          </TooltipTrigger>
          <TooltipContent>Import Audio File</TooltipContent>
        </Tooltip>

        <div className="flex-1" />

        {/* Master volume */}
        <span className="text-xs text-muted-foreground mr-1">Vol:</span>
        <Slider
          value={[masterVolume * 100]}
          min={0}
          max={100}
          step={1}
          onValueChange={([v]) => setMasterVolumeAction(v / 100)}
          className="w-20"
        />
        <span className="text-xs w-8">{Math.round(masterVolume * 100)}%</span>
      </div>

      {/* Timeline */}
      <ScrollArea className="flex-1">
        <div
          ref={containerRef}
          className="relative"
          onKeyDown={handleKeyDown}
          tabIndex={0}
        >
          <canvas
            ref={canvasRef}
            className="cursor-default"
            style={{ minHeight: height }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onDoubleClick={handleDoubleClick}
          />
        </div>
      </ScrollArea>

      {/* Status bar */}
      <div className="flex gap-2 items-center px-2 py-1 border-t text-xs text-muted-foreground">
        <span>Frame: {currentFrameIndex + 1}/{totalFrames}</span>
        <span>Time: {formatTime(framesToTime(currentFrameIndex, fps))}</span>
        {selectedRegionId && <span>Region selected</span>}
      </div>
    </div>
  )
}
