/**
 * Animation Tags Dialog
 * Manage named animation sequences (tags)
 */

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { useEditorStore, type AnimationTag } from "@/store/editor-store"

interface AnimationTagsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const TAG_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#14b8a6', // teal
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#6b7280', // gray
]

export function AnimationTagsDialog({ open, onOpenChange }: AnimationTagsDialogProps) {
  const { frames, animationTags, addTag, updateTag, removeTag, clearTags, playTag } = useEditorStore()

  const [newTagName, setNewTagName] = useState('')
  const [newTagFrom, setNewTagFrom] = useState(0)
  const [newTagTo, setNewTagTo] = useState(0)
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0])
  const [editingTag, setEditingTag] = useState<string | null>(null)

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setNewTagName('')
      setNewTagFrom(0)
      setNewTagTo(Math.max(0, frames.length - 1))
      setNewTagColor(TAG_COLORS[0])
      setEditingTag(null)
    }
  }, [open, frames.length])

  const handleAddTag = () => {
    if (!newTagName.trim()) return
    if (newTagFrom > newTagTo) return

    addTag(newTagName.trim(), newTagFrom, newTagTo, newTagColor)
    setNewTagName('')
    setNewTagFrom(0)
    setNewTagTo(Math.max(0, frames.length - 1))
  }

  const handleEditTag = (tag: AnimationTag) => {
    setEditingTag(tag.id)
    setNewTagName(tag.name)
    setNewTagFrom(tag.fromFrame)
    setNewTagTo(tag.toFrame)
    setNewTagColor(tag.color)
  }

  const handleSaveEdit = () => {
    if (!editingTag || !newTagName.trim()) return

    updateTag(editingTag, {
      name: newTagName.trim(),
      fromFrame: newTagFrom,
      toFrame: newTagTo,
      color: newTagColor,
    })

    setEditingTag(null)
    setNewTagName('')
    setNewTagFrom(0)
    setNewTagTo(Math.max(0, frames.length - 1))
  }

  const handleCancelEdit = () => {
    setEditingTag(null)
    setNewTagName('')
    setNewTagFrom(0)
    setNewTagTo(Math.max(0, frames.length - 1))
  }

  const handlePlayTag = (tagId: string) => {
    playTag(tagId)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Animation Tags</DialogTitle>
          <DialogDescription>
            Create named ranges for organizing your animation frames
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add/Edit Tag Form */}
          <div className="space-y-2 p-3 bg-pix-bg rounded border border-pix-border">
            <div className="text-xs font-medium text-pix-text-muted mb-2">
              {editingTag ? 'Edit Tag' : 'Add New Tag'}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Tag name (e.g., Walk, Idle, Attack)"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                className="input flex-1 text-sm"
              />
            </div>

            <div className="flex gap-2 items-center">
              <label className="text-xs w-16">From:</label>
              <input
                type="number"
                value={newTagFrom}
                onChange={(e) => setNewTagFrom(Math.max(0, Math.min(frames.length - 1, parseInt(e.target.value) || 0)))}
                className="input w-16 text-sm"
                min={0}
                max={frames.length - 1}
              />
              <label className="text-xs w-8">To:</label>
              <input
                type="number"
                value={newTagTo}
                onChange={(e) => setNewTagTo(Math.max(0, Math.min(frames.length - 1, parseInt(e.target.value) || 0)))}
                className="input w-16 text-sm"
                min={0}
                max={frames.length - 1}
              />
              <span className="text-xs text-pix-text-muted">
                ({newTagTo - newTagFrom + 1} frames)
              </span>
            </div>

            {/* Color picker */}
            <div className="flex gap-1 items-center">
              <label className="text-xs w-16">Color:</label>
              {TAG_COLORS.map((color) => (
                <button
                  key={color}
                  className={`w-5 h-5 rounded border-2 ${newTagColor === color ? 'border-white' : 'border-transparent'}`}
                  style={{ backgroundColor: color }}
                  onClick={() => setNewTagColor(color)}
                />
              ))}
            </div>

            <div className="flex gap-2 pt-2">
              {editingTag ? (
                <>
                  <button className="btn text-xs" onClick={handleCancelEdit}>
                    Cancel
                  </button>
                  <button
                    className="btn bg-pix-accent text-xs"
                    onClick={handleSaveEdit}
                    disabled={!newTagName.trim()}
                  >
                    Save Changes
                  </button>
                </>
              ) : (
                <button
                  className="btn bg-pix-accent text-xs"
                  onClick={handleAddTag}
                  disabled={!newTagName.trim() || frames.length === 0}
                >
                  Add Tag
                </button>
              )}
            </div>
          </div>

          {/* Tags List */}
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {animationTags.length === 0 ? (
              <div className="text-center text-pix-text-muted text-xs py-4">
                No animation tags yet. Add one above!
              </div>
            ) : (
              animationTags.map((tag) => (
                <div
                  key={tag.id}
                  className="flex items-center gap-2 p-2 bg-pix-bg-secondary rounded hover:bg-pix-bg"
                >
                  {/* Color indicator */}
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: tag.color }}
                  />

                  {/* Tag info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{tag.name}</div>
                    <div className="text-xs text-pix-text-muted">
                      Frames {tag.fromFrame} - {tag.toFrame} ({tag.toFrame - tag.fromFrame + 1} frames)
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      className="btn text-xs px-2 py-1"
                      onClick={() => handlePlayTag(tag.id)}
                      title="Play this tag"
                    >
                      ▶
                    </button>
                    <button
                      className="btn text-xs px-2 py-1"
                      onClick={() => handleEditTag(tag)}
                      title="Edit tag"
                    >
                      ✎
                    </button>
                    <button
                      className="btn text-xs px-2 py-1 hover:bg-red-600"
                      onClick={() => removeTag(tag.id)}
                      title="Delete tag"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Clear all button */}
          {animationTags.length > 0 && (
            <div className="flex justify-end">
              <button
                className="btn text-xs text-red-400 hover:bg-red-600 hover:text-white"
                onClick={clearTags}
              >
                Clear All Tags
              </button>
            </div>
          )}
        </div>

        <DialogFooter>
          <div className="text-xs text-pix-text-muted">
            {frames.length} frames total • {animationTags.length} tags
          </div>
          <button className="btn" onClick={() => onOpenChange(false)}>
            Close
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
