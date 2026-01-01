/**
 * Keyboard Shortcuts Dialog
 * Displays and allows customization of keyboard shortcuts
 */

import { useState, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { TOOL_REGISTRY, type ToolName } from '@/store/tools-store'
import { usePreferencesStore } from '@/store/preferences-store'
import type { DialogProps } from './DialogManager'

interface ShortcutCategory {
  name: string
  shortcuts: ShortcutItem[]
}

interface ShortcutItem {
  action: string
  label: string
  defaultKey: string
  category: string
}

// Define all shortcuts
const SHORTCUTS: ShortcutItem[] = [
  // File
  { action: 'file.new', label: 'New Project', defaultKey: 'Ctrl+N', category: 'File' },
  { action: 'file.open', label: 'Open', defaultKey: 'Ctrl+O', category: 'File' },
  { action: 'file.save', label: 'Save', defaultKey: 'Ctrl+S', category: 'File' },
  { action: 'file.saveAs', label: 'Save As', defaultKey: 'Ctrl+Shift+S', category: 'File' },
  { action: 'file.export', label: 'Export', defaultKey: 'Ctrl+E', category: 'File' },

  // Edit
  { action: 'edit.undo', label: 'Undo', defaultKey: 'Ctrl+Z', category: 'Edit' },
  { action: 'edit.redo', label: 'Redo', defaultKey: 'Ctrl+Y', category: 'Edit' },
  { action: 'edit.cut', label: 'Cut', defaultKey: 'Ctrl+X', category: 'Edit' },
  { action: 'edit.copy', label: 'Copy', defaultKey: 'Ctrl+C', category: 'Edit' },
  { action: 'edit.paste', label: 'Paste', defaultKey: 'Ctrl+V', category: 'Edit' },
  { action: 'edit.delete', label: 'Delete', defaultKey: 'Delete', category: 'Edit' },
  { action: 'edit.selectAll', label: 'Select All', defaultKey: 'Ctrl+A', category: 'Edit' },
  { action: 'edit.deselect', label: 'Deselect', defaultKey: 'Ctrl+D', category: 'Edit' },

  // View
  { action: 'view.zoomIn', label: 'Zoom In', defaultKey: 'Ctrl+=', category: 'View' },
  { action: 'view.zoomOut', label: 'Zoom Out', defaultKey: 'Ctrl+-', category: 'View' },
  { action: 'view.zoomFit', label: 'Fit to Screen', defaultKey: 'Ctrl+0', category: 'View' },
  { action: 'view.zoom100', label: 'Zoom 100%', defaultKey: 'Ctrl+1', category: 'View' },
  { action: 'view.toggleGrid', label: 'Toggle Grid', defaultKey: 'Ctrl+G', category: 'View' },
  { action: 'view.toggleRulers', label: 'Toggle Rulers', defaultKey: 'Ctrl+R', category: 'View' },
  { action: 'view.toggleGuides', label: 'Toggle Guides', defaultKey: 'Ctrl+;', category: 'View' },

  // Tools (generated from registry)
  ...Object.values(TOOL_REGISTRY).map((tool) => ({
    action: `tool.${tool.name}`,
    label: tool.displayName,
    defaultKey: tool.shortcut,
    category: 'Tools',
  })),

  // Canvas
  { action: 'canvas.flipH', label: 'Flip Horizontal', defaultKey: 'H', category: 'Canvas' },
  { action: 'canvas.flipV', label: 'Flip Vertical', defaultKey: 'V', category: 'Canvas' },
  { action: 'canvas.rotate90CW', label: 'Rotate 90° CW', defaultKey: 'Ctrl+Shift+R', category: 'Canvas' },
  { action: 'canvas.rotate90CCW', label: 'Rotate 90° CCW', defaultKey: 'Ctrl+Alt+R', category: 'Canvas' },

  // Layers
  { action: 'layer.new', label: 'New Layer', defaultKey: 'Ctrl+Shift+N', category: 'Layers' },
  { action: 'layer.duplicate', label: 'Duplicate Layer', defaultKey: 'Ctrl+J', category: 'Layers' },
  { action: 'layer.delete', label: 'Delete Layer', defaultKey: 'Ctrl+Shift+Delete', category: 'Layers' },
  { action: 'layer.mergeDown', label: 'Merge Down', defaultKey: 'Ctrl+Shift+E', category: 'Layers' },
  { action: 'layer.moveUp', label: 'Move Layer Up', defaultKey: 'Ctrl+]', category: 'Layers' },
  { action: 'layer.moveDown', label: 'Move Layer Down', defaultKey: 'Ctrl+[', category: 'Layers' },

  // Animation
  { action: 'anim.play', label: 'Play/Pause', defaultKey: 'Space', category: 'Animation' },
  { action: 'anim.nextFrame', label: 'Next Frame', defaultKey: '.', category: 'Animation' },
  { action: 'anim.prevFrame', label: 'Previous Frame', defaultKey: ',', category: 'Animation' },
  { action: 'anim.firstFrame', label: 'First Frame', defaultKey: 'Home', category: 'Animation' },
  { action: 'anim.lastFrame', label: 'Last Frame', defaultKey: 'End', category: 'Animation' },

  // Tool Options
  { action: 'option.swapColors', label: 'Swap Colors', defaultKey: 'X', category: 'Tool Options' },
  { action: 'option.resetColors', label: 'Reset Colors', defaultKey: 'D', category: 'Tool Options' },
  { action: 'option.brushSizeUp', label: 'Increase Brush Size', defaultKey: ']', category: 'Tool Options' },
  { action: 'option.brushSizeDown', label: 'Decrease Brush Size', defaultKey: '[', category: 'Tool Options' },
  { action: 'option.toggleMirrorH', label: 'Toggle Mirror H', defaultKey: 'Shift+H', category: 'Tool Options' },
  { action: 'option.toggleMirrorV', label: 'Toggle Mirror V', defaultKey: 'Shift+V', category: 'Tool Options' },
]

// Group shortcuts by category
const CATEGORIES: ShortcutCategory[] = [
  { name: 'File', shortcuts: SHORTCUTS.filter((s) => s.category === 'File') },
  { name: 'Edit', shortcuts: SHORTCUTS.filter((s) => s.category === 'Edit') },
  { name: 'View', shortcuts: SHORTCUTS.filter((s) => s.category === 'View') },
  { name: 'Tools', shortcuts: SHORTCUTS.filter((s) => s.category === 'Tools') },
  { name: 'Canvas', shortcuts: SHORTCUTS.filter((s) => s.category === 'Canvas') },
  { name: 'Layers', shortcuts: SHORTCUTS.filter((s) => s.category === 'Layers') },
  { name: 'Animation', shortcuts: SHORTCUTS.filter((s) => s.category === 'Animation') },
  { name: 'Tool Options', shortcuts: SHORTCUTS.filter((s) => s.category === 'Tool Options') },
]

export function KeyboardShortcutsDialog({ open, onOpenChange }: DialogProps) {
  const [activeCategory, setActiveCategory] = useState('File')
  const [editingAction, setEditingAction] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const { customShortcuts, setCustomShortcut, resetShortcut, resetAllShortcuts } = usePreferencesStore()

  const getShortcut = useCallback((action: string, defaultKey: string) => {
    return customShortcuts[action] || defaultKey
  }, [customShortcuts])

  const handleKeyCapture = useCallback((e: React.KeyboardEvent, action: string) => {
    e.preventDefault()
    e.stopPropagation()

    const parts: string[] = []
    if (e.ctrlKey || e.metaKey) parts.push('Ctrl')
    if (e.altKey) parts.push('Alt')
    if (e.shiftKey) parts.push('Shift')

    const key = e.key.length === 1 ? e.key.toUpperCase() : e.key
    if (!['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) {
      parts.push(key)
    }

    if (parts.length > 0 && !['Control', 'Alt', 'Shift', 'Meta'].includes(parts[parts.length - 1])) {
      const shortcut = parts.join('+')
      setCustomShortcut(action, shortcut)
      setEditingAction(null)
    }
  }, [setCustomShortcut])

  // Filter shortcuts by search
  const filteredCategories = searchQuery
    ? CATEGORIES.map((cat) => ({
        ...cat,
        shortcuts: cat.shortcuts.filter(
          (s) =>
            s.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.defaultKey.toLowerCase().includes(searchQuery.toLowerCase())
        ),
      })).filter((cat) => cat.shortcuts.length > 0)
    : CATEGORIES

  const activeShortcuts = searchQuery
    ? filteredCategories.flatMap((c) => c.shortcuts)
    : CATEGORIES.find((c) => c.name === activeCategory)?.shortcuts || []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] h-[600px] flex flex-col p-0">
        <DialogHeader className="px-4 py-3 border-b border-pix-border">
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
        </DialogHeader>

        {/* Search */}
        <div className="px-4 py-2 border-b border-pix-border">
          <input
            type="text"
            placeholder="Search shortcuts..."
            className="input w-full"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Categories Sidebar */}
          {!searchQuery && (
            <div className="w-40 border-r border-pix-border bg-pix-bg-secondary p-2 flex flex-col gap-1 overflow-y-auto">
              {CATEGORIES.map((category) => (
                <button
                  key={category.name}
                  className={`px-3 py-2 rounded text-left text-sm transition-colors ${
                    activeCategory === category.name
                      ? 'bg-pix-accent text-white'
                      : 'hover:bg-pix-hover text-pix-text'
                  }`}
                  onClick={() => setActiveCategory(category.name)}
                >
                  {category.name}
                  <span className="ml-2 text-xs opacity-60">
                    ({category.shortcuts.length})
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Shortcuts List */}
          <div className="flex-1 overflow-y-auto p-4">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-pix-text-muted">
                  <th className="pb-2">Action</th>
                  <th className="pb-2 w-40">Shortcut</th>
                  <th className="pb-2 w-20"></th>
                </tr>
              </thead>
              <tbody>
                {activeShortcuts.map((shortcut) => (
                  <tr key={shortcut.action} className="border-t border-pix-border">
                    <td className="py-2">{shortcut.label}</td>
                    <td className="py-2">
                      {editingAction === shortcut.action ? (
                        <input
                          autoFocus
                          className="input w-full text-center"
                          placeholder="Press keys..."
                          onKeyDown={(e) => handleKeyCapture(e, shortcut.action)}
                          onBlur={() => setEditingAction(null)}
                        />
                      ) : (
                        <button
                          className="px-3 py-1 bg-pix-bg-secondary rounded hover:bg-pix-hover font-mono text-sm"
                          onClick={() => setEditingAction(shortcut.action)}
                        >
                          {getShortcut(shortcut.action, shortcut.defaultKey)}
                        </button>
                      )}
                    </td>
                    <td className="py-2">
                      {customShortcuts[shortcut.action] && (
                        <button
                          className="text-pix-text-muted hover:text-pix-text text-sm"
                          onClick={() => resetShortcut(shortcut.action)}
                          title="Reset to default"
                        >
                          Reset
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {activeShortcuts.length === 0 && (
              <div className="text-center text-pix-text-muted py-8">
                No shortcuts found
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center px-4 py-3 border-t border-pix-border">
          <button
            className="btn text-red-400 hover:text-red-300"
            onClick={() => {
              if (confirm('Reset all shortcuts to defaults?')) {
                resetAllShortcuts()
              }
            }}
          >
            Reset All
          </button>
          <button className="btn bg-pix-accent" onClick={() => onOpenChange(false)}>
            Done
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
