/**
 * History System - Undo/Redo functionality
 * Based on Pixelorama's UndoRedo system
 */

export interface HistoryAction {
  name: string
  timestamp: number
  undo: () => void
  redo: () => void
}

export interface HistoryState {
  canUndo: boolean
  canRedo: boolean
  undoName: string | null
  redoName: string | null
  historyLength: number
  currentIndex: number
}

type HistoryListener = (state: HistoryState) => void

export class History {
  private actions: HistoryAction[] = []
  private currentIndex = -1
  private maxHistory: number
  private listeners: Set<HistoryListener> = new Set()

  constructor(maxHistory = 100) {
    this.maxHistory = maxHistory
  }

  /**
   * Add a new action to history
   */
  addAction(name: string, undo: () => void, redo: () => void): void {
    // Remove any redo actions beyond current index
    if (this.currentIndex < this.actions.length - 1) {
      this.actions = this.actions.slice(0, this.currentIndex + 1)
    }

    // Add new action
    const action: HistoryAction = {
      name,
      timestamp: Date.now(),
      undo,
      redo
    }
    this.actions.push(action)
    this.currentIndex++

    // Trim history if exceeds max
    if (this.actions.length > this.maxHistory) {
      const excess = this.actions.length - this.maxHistory
      this.actions = this.actions.slice(excess)
      this.currentIndex -= excess
    }

    this.notifyListeners()
  }

  /**
   * Create an action from image data (common case for drawing tools)
   */
  addImageAction(
    name: string,
    canvas: HTMLCanvasElement,
    beforeImageData: ImageData,
    afterImageData: ImageData
  ): void {
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    this.addAction(
      name,
      () => {
        ctx.putImageData(beforeImageData, 0, 0)
      },
      () => {
        ctx.putImageData(afterImageData, 0, 0)
      }
    )
  }

  /**
   * Undo the last action
   */
  undo(): boolean {
    if (!this.canUndo()) return false

    const action = this.actions[this.currentIndex]
    action.undo()
    this.currentIndex--

    this.notifyListeners()
    return true
  }

  /**
   * Redo the next action
   */
  redo(): boolean {
    if (!this.canRedo()) return false

    this.currentIndex++
    const action = this.actions[this.currentIndex]
    action.redo()

    this.notifyListeners()
    return true
  }

  /**
   * Check if undo is available
   */
  canUndo(): boolean {
    return this.currentIndex >= 0
  }

  /**
   * Check if redo is available
   */
  canRedo(): boolean {
    return this.currentIndex < this.actions.length - 1
  }

  /**
   * Get the name of the action that would be undone
   */
  getUndoName(): string | null {
    if (!this.canUndo()) return null
    return this.actions[this.currentIndex].name
  }

  /**
   * Get the name of the action that would be redone
   */
  getRedoName(): string | null {
    if (!this.canRedo()) return null
    return this.actions[this.currentIndex + 1].name
  }

  /**
   * Clear all history
   */
  clear(): void {
    this.actions = []
    this.currentIndex = -1
    this.notifyListeners()
  }

  /**
   * Get current state
   */
  getState(): HistoryState {
    return {
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
      undoName: this.getUndoName(),
      redoName: this.getRedoName(),
      historyLength: this.actions.length,
      currentIndex: this.currentIndex
    }
  }

  /**
   * Subscribe to history changes
   */
  subscribe(listener: HistoryListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notifyListeners(): void {
    const state = this.getState()
    this.listeners.forEach(listener => listener(state))
  }

  /**
   * Get all action names for history panel
   */
  getActionNames(): string[] {
    return this.actions.map(a => a.name)
  }

  /**
   * Go to a specific point in history
   */
  goToIndex(targetIndex: number): void {
    if (targetIndex < -1 || targetIndex >= this.actions.length) return

    while (this.currentIndex > targetIndex) {
      this.undo()
    }
    while (this.currentIndex < targetIndex) {
      this.redo()
    }
  }
}

// Singleton instance for global history
let globalHistory: History | null = null

export function getHistory(): History {
  if (!globalHistory) {
    globalHistory = new History(100)
  }
  return globalHistory
}

export function createHistory(maxHistory = 100): History {
  return new History(maxHistory)
}

/**
 * Helper to create undo/redo actions for canvas operations
 */
export function createCanvasAction(
  ctx: CanvasRenderingContext2D,
  beforeData: ImageData,
  afterData: ImageData
): { undo: () => void; redo: () => void } {
  return {
    undo: () => ctx.putImageData(beforeData, 0, 0),
    redo: () => ctx.putImageData(afterData, 0, 0)
  }
}

/**
 * Helper hook-like function to capture image state before an operation
 */
export function captureCanvasState(canvas: HTMLCanvasElement): ImageData | null {
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  return ctx.getImageData(0, 0, canvas.width, canvas.height)
}
