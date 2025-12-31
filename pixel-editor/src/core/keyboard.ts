/**
 * Keyboard Shortcuts System
 * Based on Pixelorama's input handling
 */

import { useEditorStore, type ToolName } from '../store/editor-store'
import { getHistory } from './history'

export interface ShortcutAction {
  key: string
  ctrl?: boolean
  shift?: boolean
  alt?: boolean
  action: () => void
  description: string
}

// Tool shortcuts mapping
export const TOOL_SHORTCUTS: Record<string, ToolName> = {
  'b': 'pencil',
  'e': 'eraser',
  'g': 'bucket',
  'l': 'line',
  'r': 'rectangle',
  'o': 'ellipse',
  'm': 'rectSelect',
  'w': 'magicWand',
  'i': 'colorPicker',
  'v': 'move',
  'h': 'pan',
  'z': 'zoom',
}

// Get all shortcuts
export function getShortcuts(): ShortcutAction[] {
  const store = useEditorStore.getState()
  const history = getHistory()

  return [
    // File operations
    {
      key: 'n',
      ctrl: true,
      action: () => {
        // New project - would open dialog
        window.dispatchEvent(new CustomEvent('editor:newProject'))
      },
      description: 'New Project'
    },
    {
      key: 'o',
      ctrl: true,
      action: () => {
        window.dispatchEvent(new CustomEvent('editor:openProject'))
      },
      description: 'Open Project'
    },
    {
      key: 's',
      ctrl: true,
      action: () => {
        window.dispatchEvent(new CustomEvent('editor:saveProject'))
      },
      description: 'Save Project'
    },
    {
      key: 's',
      ctrl: true,
      shift: true,
      action: () => {
        window.dispatchEvent(new CustomEvent('editor:saveProjectAs'))
      },
      description: 'Save Project As'
    },
    {
      key: 'e',
      ctrl: true,
      action: () => {
        window.dispatchEvent(new CustomEvent('editor:export'))
      },
      description: 'Export Image'
    },

    // Edit operations
    {
      key: 'z',
      ctrl: true,
      action: () => history.undo(),
      description: 'Undo'
    },
    {
      key: 'z',
      ctrl: true,
      shift: true,
      action: () => history.redo(),
      description: 'Redo'
    },
    {
      key: 'y',
      ctrl: true,
      action: () => history.redo(),
      description: 'Redo'
    },
    {
      key: 'a',
      ctrl: true,
      action: () => store.selectAll(),
      description: 'Select All'
    },
    {
      key: 'd',
      ctrl: true,
      action: () => store.clearSelection(),
      description: 'Deselect'
    },
    {
      key: 'i',
      ctrl: true,
      shift: true,
      action: () => store.invertSelection(),
      description: 'Invert Selection'
    },

    // View operations
    {
      key: '=',
      ctrl: true,
      action: () => store.zoomIn(),
      description: 'Zoom In'
    },
    {
      key: '-',
      ctrl: true,
      action: () => store.zoomOut(),
      description: 'Zoom Out'
    },
    {
      key: '0',
      ctrl: true,
      action: () => store.resetZoom(),
      description: 'Reset Zoom'
    },
    {
      key: 'g',
      ctrl: true,
      action: () => store.toggleGrid(),
      description: 'Toggle Grid'
    },

    // Color operations
    {
      key: 'x',
      action: () => store.swapColors(),
      description: 'Swap Colors'
    },

    // Layer operations
    {
      key: 'n',
      ctrl: true,
      shift: true,
      action: () => store.addLayer(),
      description: 'New Layer'
    },

    // Animation
    {
      key: ' ',
      action: () => store.togglePlay(),
      description: 'Play/Pause Animation'
    },
    {
      key: ',',
      action: () => store.prevFrame(),
      description: 'Previous Frame'
    },
    {
      key: '.',
      action: () => store.nextFrame(),
      description: 'Next Frame'
    },
  ]
}

/**
 * Initialize keyboard shortcuts handler
 */
export function initKeyboardShortcuts(): () => void {
  const handleKeyDown = (e: KeyboardEvent) => {
    // Ignore if typing in an input
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement ||
      (e.target as HTMLElement)?.isContentEditable
    ) {
      return
    }

    const store = useEditorStore.getState()
    const key = e.key.toLowerCase()

    // Check for tool shortcuts (single key, no modifiers)
    if (!e.ctrlKey && !e.metaKey && !e.altKey) {
      const tool = TOOL_SHORTCUTS[key]
      if (tool) {
        e.preventDefault()
        store.setTool(tool)
        return
      }
    }

    // Check for action shortcuts
    const shortcuts = getShortcuts()
    for (const shortcut of shortcuts) {
      const ctrlMatch = (shortcut.ctrl ?? false) === (e.ctrlKey || e.metaKey)
      const shiftMatch = (shortcut.shift ?? false) === e.shiftKey
      const altMatch = (shortcut.alt ?? false) === e.altKey
      const keyMatch = shortcut.key.toLowerCase() === key

      if (ctrlMatch && shiftMatch && altMatch && keyMatch) {
        e.preventDefault()
        shortcut.action()
        return
      }
    }
  }

  window.addEventListener('keydown', handleKeyDown)

  // Return cleanup function
  return () => {
    window.removeEventListener('keydown', handleKeyDown)
  }
}

/**
 * Get shortcut display string
 */
export function getShortcutDisplay(shortcut: ShortcutAction): string {
  const parts: string[] = []

  if (shortcut.ctrl) {
    parts.push(navigator.platform.includes('Mac') ? '⌘' : 'Ctrl')
  }
  if (shortcut.shift) {
    parts.push('Shift')
  }
  if (shortcut.alt) {
    parts.push('Alt')
  }

  // Format key display
  let keyDisplay = shortcut.key.toUpperCase()
  if (shortcut.key === ' ') keyDisplay = 'Space'
  if (shortcut.key === '=') keyDisplay = '+'

  parts.push(keyDisplay)

  return parts.join('+')
}

/**
 * React hook for keyboard shortcuts
 */
export function useKeyboardShortcuts(): void {
  // This would be called in a useEffect in the main App component
  // The actual implementation uses initKeyboardShortcuts
}
