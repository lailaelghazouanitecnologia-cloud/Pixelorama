import { useEditorStore } from "@/store/editor-store"
import { Button } from "@/components/ui/button"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
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
} from "lucide-react"
import { cn } from "@/lib/utils"

export function Timeline() {
  const {
    frames,
    currentFrameIndex,
    fps,
    isPlaying,
    setCurrentFrame,
    addFrame,
    deleteFrame,
    setFps,
    togglePlay,
    layers,
  } = useEditorStore()

  // For demo, show at least current state as frame 1
  const displayFrames = frames.length > 0 ? frames : [{ id: 'frame-1', layers, duration: 1000 / fps }]

  return (
    <div className="h-32 bg-card border-t border-border flex flex-col">
      {/* Timeline Header */}
      <div className="h-8 border-b border-border flex items-center px-2 gap-2">
        {/* Playback Controls */}
        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="xs" className="h-6 w-6 p-0">
            <ChevronFirst className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="xs" className="h-6 w-6 p-0">
            <SkipBack className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="xs"
            className={cn("h-6 w-6 p-0", isPlaying && "text-primary")}
            onClick={togglePlay}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </Button>
          <Button variant="ghost" size="xs" className="h-6 w-6 p-0">
            <SkipForward className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="xs" className="h-6 w-6 p-0">
            <ChevronLast className="w-3.5 h-3.5" />
          </Button>
        </div>

        <div className="h-4 w-px bg-border" />

        {/* Frame Actions */}
        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="xs" className="h-6 w-6 p-0" onClick={addFrame} title="Add Frame">
            <Plus className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="xs" className="h-6 w-6 p-0" title="Duplicate Frame">
            <Copy className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="xs"
            className="h-6 w-6 p-0 hover:text-destructive"
            onClick={() => deleteFrame(currentFrameIndex)}
            disabled={displayFrames.length <= 1}
            title="Delete Frame"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>

        <div className="flex-1" />

        {/* FPS */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground">FPS:</span>
          <input
            type="number"
            value={fps}
            onChange={(e) => setFps(Math.max(1, Math.min(60, parseInt(e.target.value) || 12)))}
            className="w-10 px-1.5 py-0.5 bg-secondary rounded text-xs font-mono text-center"
          />
        </div>

        <div className="h-4 w-px bg-border" />

        {/* Frame Info */}
        <span className="text-[10px] text-muted-foreground">
          Frame {currentFrameIndex + 1}/{displayFrames.length}
        </span>

        <Button variant="ghost" size="xs" className="h-6 w-6 p-0">
          <Settings className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Timeline Content */}
      <div className="flex-1 flex">
        {/* Layer Names */}
        <div className="w-32 border-r border-border flex flex-col">
          <div className="h-6 border-b border-border px-2 flex items-center">
            <span className="text-[10px] text-muted-foreground">Layers</span>
          </div>
          <ScrollArea className="flex-1">
            <div className="flex flex-col">
              {[...layers].reverse().map((layer, i) => (
                <div
                  key={layer.id}
                  className="h-8 px-2 flex items-center border-b border-border/50"
                >
                  <span className="text-[10px] truncate">{layer.name}</span>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Frames Grid */}
        <ScrollArea className="flex-1">
          <div className="min-w-max">
            {/* Frame Numbers */}
            <div className="h-6 border-b border-border flex">
              {displayFrames.map((frame, i) => (
                <div
                  key={frame.id}
                  className={cn(
                    "w-12 flex items-center justify-center border-r border-border/50 text-[10px] cursor-pointer transition-colors",
                    i === currentFrameIndex ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-accent"
                  )}
                  onClick={() => setCurrentFrame(i)}
                >
                  {i + 1}
                </div>
              ))}
              {/* Add frame button */}
              <button
                className="w-12 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                onClick={addFrame}
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>

            {/* Cells */}
            {[...layers].reverse().map((layer) => (
              <div key={layer.id} className="h-8 flex border-b border-border/50">
                {displayFrames.map((frame, i) => (
                  <div
                    key={frame.id}
                    className={cn(
                      "w-12 border-r border-border/50 flex items-center justify-center cursor-pointer transition-colors",
                      i === currentFrameIndex ? "bg-primary/10" : "hover:bg-accent/50"
                    )}
                    onClick={() => setCurrentFrame(i)}
                  >
                    {/* Cell thumbnail would go here */}
                    <div className="w-6 h-6 rounded-sm bg-secondary/50 checker-bg" />
                  </div>
                ))}
              </div>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
    </div>
  )
}
