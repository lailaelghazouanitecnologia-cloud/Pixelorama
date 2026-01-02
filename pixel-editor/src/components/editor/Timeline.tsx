/**
 * Timeline Component - Animation timeline
 * Based on Pixelorama's AnimationTimeline
 */

import { useState } from "react"
import { useEditorStore } from "@/store/editor-store"
import { useUIStore } from "@/store/ui-store"
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Plus,
  Trash2,
  Copy,
  ChevronFirst,
  ChevronLast,
  Settings,
  Eye,
  EyeOff,
  GripVertical,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"
import { OnionSkinDialog } from "@/components/dialogs"

export function Timeline() {
  const [onionSkinOpen, setOnionSkinOpen] = useState(false)
  const { openDialog } = useUIStore()

  const {
    frames,
    currentFrameIndex,
    fps,
    isPlaying,
    setCurrentFrame,
    addFrame,
    duplicateFrame,
    deleteFrame,
    setFps,
    togglePlay,
    nextFrame,
    prevFrame,
    layers,
    currentLayerIndex,
    setCurrentLayer,
    toggleLayerVisibility,
    showOnionSkin,
    toggleOnionSkin,
  } = useEditorStore()

  // For demo, show at least current state as frame 1
  const displayFrames = frames.length > 0 ? frames : [{ id: 'frame-1', layers, duration: 1000 / fps }]

  return (
    <TooltipProvider delayDuration={300}>
      <div
        className="flex flex-col"
        style={{
          height: '100px',
          backgroundColor: 'var(--pix-bg)',
          borderTop: '1px solid var(--pix-border)'
        }}
      >
        {/* Timeline Header */}
        <div
          className="h-7 flex items-center px-2 gap-1"
          style={{
            backgroundColor: 'var(--pix-bg-secondary)',
            borderBottom: '1px solid var(--pix-border)'
          }}
        >
          {/* Playback Controls */}
          <div className="flex items-center gap-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="icon-btn" onClick={() => setCurrentFrame(0)}>
                  <ChevronFirst className="w-3.5 h-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="tooltip">First Frame</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button className="icon-btn" onClick={prevFrame}>
                  <SkipBack className="w-3.5 h-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="tooltip">Previous Frame</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className={cn("icon-btn", isPlaying && "active")}
                  onClick={togglePlay}
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                </button>
              </TooltipTrigger>
              <TooltipContent className="tooltip">
                {isPlaying ? 'Pause' : 'Play'} <span className="text-pix-text-muted">Space</span>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button className="icon-btn" onClick={nextFrame}>
                  <SkipForward className="w-3.5 h-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="tooltip">Next Frame</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button className="icon-btn" onClick={() => setCurrentFrame(displayFrames.length - 1)}>
                  <ChevronLast className="w-3.5 h-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="tooltip">Last Frame</TooltipContent>
            </Tooltip>
          </div>

          <div className="separator-v h-4 mx-1" />

          {/* Frame Actions */}
          <div className="flex items-center gap-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="icon-btn" onClick={addFrame}>
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="tooltip">Add Frame</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button className="icon-btn" onClick={() => duplicateFrame(currentFrameIndex)}>
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="tooltip">Duplicate Frame</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className="icon-btn hover:text-red-400"
                  onClick={() => deleteFrame(currentFrameIndex)}
                  disabled={displayFrames.length <= 1}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="tooltip">Delete Frame</TooltipContent>
            </Tooltip>
          </div>

          <div className="separator-v h-4 mx-1" />

          {/* Onion Skin Toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className={cn("icon-btn", showOnionSkin && "active")}
                onClick={toggleOnionSkin}
                onContextMenu={(e) => {
                  e.preventDefault()
                  setOnionSkinOpen(true)
                }}
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="8" opacity="0.3" />
                  <circle cx="10" cy="12" r="8" opacity="0.5" />
                  <circle cx="8" cy="12" r="8" opacity="0.7" />
                </svg>
              </button>
            </TooltipTrigger>
            <TooltipContent className="tooltip">
              Onion Skinning (Right-click for settings)
            </TooltipContent>
          </Tooltip>

          <div className="flex-1" />

          {/* FPS Control */}
          <div className="flex items-center gap-1.5">
            <span className="text-pix-xs text-pix-text-muted">FPS:</span>
            <input
              type="number"
              className="input w-10 text-center text-pix-xs py-0"
              value={fps}
              onChange={(e) => setFps(Math.max(1, Math.min(60, parseInt(e.target.value) || 12)))}
              min={1}
              max={60}
            />
          </div>

          <div className="separator-v h-4 mx-1" />

          {/* Frame Info */}
          <span className="text-pix-xs text-pix-text-muted">
            {currentFrameIndex + 1}/{displayFrames.length}
          </span>

          <Tooltip>
            <TooltipTrigger asChild>
              <button className="icon-btn" onClick={() => openDialog('animationTags')}>
                <Settings className="w-3.5 h-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="tooltip">Animation Settings</TooltipContent>
          </Tooltip>
        </div>

        {/* Timeline Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Layer Names Column */}
          <div
            className="w-24 flex flex-col shrink-0"
            style={{ borderRight: '1px solid var(--pix-border)' }}
          >
            {/* Header */}
            <div
              className="h-5 flex items-center px-2 shrink-0"
              style={{
                backgroundColor: 'var(--pix-bg-secondary)',
                borderBottom: '1px solid var(--pix-border)'
              }}
            >
              <span className="text-pix-xs text-pix-text-muted">Layers</span>
            </div>

            {/* Layer List */}
            <div className="flex-1 overflow-y-auto">
              {[...layers].reverse().map((layer, reverseIndex) => {
                const index = layers.length - 1 - reverseIndex
                return (
                  <div
                    key={layer.id}
                    className={cn(
                      "h-6 flex items-center gap-1 px-1 cursor-pointer",
                      index === currentLayerIndex && "bg-pix-accent/30"
                    )}
                    style={{ borderBottom: '1px solid var(--pix-border-light)' }}
                    onClick={() => setCurrentLayer(index)}
                  >
                    <GripVertical className="w-3 h-3 text-pix-text-muted cursor-grab" />
                    <button
                      className="icon-btn p-0.5"
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleLayerVisibility(index)
                      }}
                    >
                      {layer.visible ? (
                        <Eye className="w-3 h-3" />
                      ) : (
                        <EyeOff className="w-3 h-3 text-pix-text-muted" />
                      )}
                    </button>
                    <span className="text-pix-xs truncate flex-1">{layer.name}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Frames Grid */}
          <div className="flex-1 overflow-x-auto">
            <div className="min-w-max">
              {/* Frame Numbers Header */}
              <div
                className="h-5 flex"
                style={{
                  backgroundColor: 'var(--pix-bg-secondary)',
                  borderBottom: '1px solid var(--pix-border)'
                }}
              >
                {displayFrames.map((frame, i) => (
                  <div
                    key={frame.id}
                    className={cn(
                      "w-10 flex items-center justify-center text-pix-xs cursor-pointer transition-colors",
                      i === currentFrameIndex
                        ? "bg-pix-accent text-white"
                        : "text-pix-text-muted hover:bg-pix-bg-tertiary"
                    )}
                    style={{ borderRight: '1px solid var(--pix-border-light)' }}
                    onClick={() => setCurrentFrame(i)}
                  >
                    {i + 1}
                  </div>
                ))}
                {/* Add frame button */}
                <button
                  className="w-10 flex items-center justify-center text-pix-text-muted hover:text-pix-text transition-colors"
                  onClick={addFrame}
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>

              {/* Frame Cells */}
              {[...layers].reverse().map((layer, reverseIndex) => {
                const index = layers.length - 1 - reverseIndex
                return (
                  <div
                    key={layer.id}
                    className="h-6 flex"
                    style={{ borderBottom: '1px solid var(--pix-border-light)' }}
                  >
                    {displayFrames.map((frame, frameIndex) => (
                      <div
                        key={frame.id}
                        className={cn(
                          "w-10 flex items-center justify-center cursor-pointer transition-colors",
                          frameIndex === currentFrameIndex && "bg-pix-accent/10",
                          index === currentLayerIndex && frameIndex === currentFrameIndex && "bg-pix-accent/20"
                        )}
                        style={{ borderRight: '1px solid var(--pix-border-light)' }}
                        onClick={() => {
                          setCurrentFrame(frameIndex)
                          setCurrentLayer(index)
                        }}
                      >
                        {/* Cell indicator - shows if frame has content */}
                        <div
                          className={cn(
                            "w-4 h-4 rounded-sm",
                            layer.data ? "bg-pix-text/30" : "bg-pix-bg-tertiary"
                          )}
                          style={{
                            backgroundImage: layer.data ? undefined : 'linear-gradient(45deg, transparent 50%, var(--pix-border-light) 50%)',
                            backgroundSize: '4px 4px'
                          }}
                        />
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Onion Skin Settings Dialog */}
      <OnionSkinDialog open={onionSkinOpen} onOpenChange={setOnionSkinOpen} />
    </TooltipProvider>
  )
}
