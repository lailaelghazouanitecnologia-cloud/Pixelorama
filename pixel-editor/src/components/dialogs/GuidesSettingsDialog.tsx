/**
 * Guides Settings Dialog
 * Configure and manage guides
 */

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useEditorStore } from "@/store/editor-store"
import { Trash2, Plus, Eye, EyeOff } from "lucide-react"

interface GuidesSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function GuidesSettingsDialog({ open, onOpenChange }: GuidesSettingsDialogProps) {
  const {
    guides,
    showGuides,
    snapToGuides,
    width,
    height,
    addGuide,
    removeGuide,
    updateGuide,
    clearGuides,
    addCenterGuides,
    addThirdsGuides,
    toggleGuides,
    toggleSnapToGuides,
  } = useEditorStore()

  const [newGuideType, setNewGuideType] = useState<'horizontal' | 'vertical'>('horizontal')
  const [newGuidePosition, setNewGuidePosition] = useState(0)
  const [newGuideColor, setNewGuideColor] = useState('#00ffff')

  const handleAddGuide = () => {
    const maxPos = newGuideType === 'horizontal' ? height : width
    const pos = Math.max(0, Math.min(maxPos, newGuidePosition))
    addGuide(newGuideType, pos, newGuideColor)
    setNewGuidePosition(0)
  }

  const horizontalGuides = guides.filter(g => g.type === 'horizontal')
  const verticalGuides = guides.filter(g => g.type === 'vertical')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Guides Settings</DialogTitle>
          <DialogDescription>
            Manage canvas guides for alignment and positioning.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-4 py-4">
          {/* Toggle Options */}
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="show-guides"
                checked={showGuides}
                onChange={() => toggleGuides()}
                className="w-4 h-4 rounded"
              />
              <Label htmlFor="show-guides">Show Guides</Label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="snap-guides"
                checked={snapToGuides}
                onChange={() => toggleSnapToGuides()}
                className="w-4 h-4 rounded"
              />
              <Label htmlFor="snap-guides">Snap to Guides</Label>
            </div>
          </div>

          {/* Quick Add */}
          <div className="space-y-2">
            <Label>Quick Add</Label>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={addCenterGuides}
                className="flex-1"
              >
                Center Guides
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={addThirdsGuides}
                className="flex-1"
              >
                Rule of Thirds
              </Button>
            </div>
          </div>

          {/* Add New Guide */}
          <div className="space-y-2 p-3 border rounded bg-muted/30">
            <Label>Add New Guide</Label>
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground">Type</Label>
                <select
                  className="input w-full py-1.5"
                  value={newGuideType}
                  onChange={(e) => setNewGuideType(e.target.value as 'horizontal' | 'vertical')}
                >
                  <option value="horizontal">Horizontal</option>
                  <option value="vertical">Vertical</option>
                </select>
              </div>
              <div className="w-20">
                <Label className="text-xs text-muted-foreground">Position</Label>
                <Input
                  type="number"
                  min={0}
                  max={newGuideType === 'horizontal' ? height : width}
                  value={newGuidePosition}
                  onChange={(e) => setNewGuidePosition(parseInt(e.target.value) || 0)}
                  className="py-1.5"
                />
              </div>
              <div className="w-14">
                <Label className="text-xs text-muted-foreground">Color</Label>
                <input
                  type="color"
                  value={newGuideColor}
                  onChange={(e) => setNewGuideColor(e.target.value)}
                  className="w-full h-8 rounded cursor-pointer"
                />
              </div>
              <Button size="sm" onClick={handleAddGuide}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Existing Guides */}
          <div className="space-y-3">
            {/* Horizontal Guides */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">
                  Horizontal Guides ({horizontalGuides.length})
                </Label>
              </div>
              {horizontalGuides.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">No horizontal guides</p>
              ) : (
                <div className="space-y-1 max-h-32 overflow-auto">
                  {horizontalGuides.map((guide) => (
                    <div
                      key={guide.id}
                      className="flex items-center gap-2 p-2 bg-muted/30 rounded text-sm"
                    >
                      <div
                        className="w-3 h-3 rounded-full border"
                        style={{ backgroundColor: guide.color }}
                      />
                      <span className="flex-1">Y: {guide.position}px</span>
                      <Input
                        type="number"
                        min={0}
                        max={height}
                        value={guide.position}
                        onChange={(e) => updateGuide(guide.id, { position: parseInt(e.target.value) || 0 })}
                        className="w-16 h-7 text-xs"
                      />
                      <input
                        type="color"
                        value={guide.color}
                        onChange={(e) => updateGuide(guide.id, { color: e.target.value })}
                        className="w-7 h-7 rounded cursor-pointer"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeGuide(guide.id)}
                        className="h-7 w-7 p-0"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Vertical Guides */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">
                  Vertical Guides ({verticalGuides.length})
                </Label>
              </div>
              {verticalGuides.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">No vertical guides</p>
              ) : (
                <div className="space-y-1 max-h-32 overflow-auto">
                  {verticalGuides.map((guide) => (
                    <div
                      key={guide.id}
                      className="flex items-center gap-2 p-2 bg-muted/30 rounded text-sm"
                    >
                      <div
                        className="w-3 h-3 rounded-full border"
                        style={{ backgroundColor: guide.color }}
                      />
                      <span className="flex-1">X: {guide.position}px</span>
                      <Input
                        type="number"
                        min={0}
                        max={width}
                        value={guide.position}
                        onChange={(e) => updateGuide(guide.id, { position: parseInt(e.target.value) || 0 })}
                        className="w-16 h-7 text-xs"
                      />
                      <input
                        type="color"
                        value={guide.color}
                        onChange={(e) => updateGuide(guide.id, { color: e.target.value })}
                        className="w-7 h-7 rounded cursor-pointer"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeGuide(guide.id)}
                        className="h-7 w-7 p-0"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="flex-shrink-0">
          <Button
            variant="outline"
            onClick={clearGuides}
            disabled={guides.length === 0}
          >
            Clear All
          </Button>
          <Button onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
