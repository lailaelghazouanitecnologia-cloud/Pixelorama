/**
 * Tools Store - Centralized tool state management
 * Based on Pixelorama's Tools.gd autoload pattern
 */

import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'

// Tool categories matching Pixelorama
export type ToolCategory = 'design' | 'selection' | 'utility'

// Tool names
export type ToolName =
  | 'pencil' | 'eraser' | 'bucket' | 'line' | 'rectangle' | 'ellipse' | 'shading' | 'spray'  // Design tools
  | 'rectSelect' | 'ellipseSelect' | 'lasso' | 'magicWand'                          // Selection tools
  | 'colorPicker' | 'move' | 'pan' | 'zoom'                                          // Utility tools

export type ShadingMode = 'lighten' | 'darken'

// Tool configuration interface
export interface ToolConfig {
  name: ToolName
  displayName: string
  icon: string
  category: ToolCategory
  shortcut: string
  cursor?: string
}

// Tool registry - all available tools
export const TOOL_REGISTRY: Record<ToolName, ToolConfig> = {
  // Design tools
  pencil: { name: 'pencil', displayName: 'Pencil', icon: 'pencil', category: 'design', shortcut: 'B' },
  eraser: { name: 'eraser', displayName: 'Eraser', icon: 'eraser', category: 'design', shortcut: 'E' },
  bucket: { name: 'bucket', displayName: 'Bucket Fill', icon: 'bucket', category: 'design', shortcut: 'G' },
  line: { name: 'line', displayName: 'Line', icon: 'line', category: 'design', shortcut: 'L' },
  rectangle: { name: 'rectangle', displayName: 'Rectangle', icon: 'rectangle', category: 'design', shortcut: 'R' },
  ellipse: { name: 'ellipse', displayName: 'Ellipse', icon: 'ellipse', category: 'design', shortcut: 'O' },
  shading: { name: 'shading', displayName: 'Shading', icon: 'shading', category: 'design', shortcut: 'U' },
  spray: { name: 'spray', displayName: 'Spray', icon: 'spray', category: 'design', shortcut: 'S' },

  // Selection tools
  rectSelect: { name: 'rectSelect', displayName: 'Rectangle Select', icon: 'rectSelect', category: 'selection', shortcut: 'M' },
  ellipseSelect: { name: 'ellipseSelect', displayName: 'Ellipse Select', icon: 'ellipseSelect', category: 'selection', shortcut: 'J' },
  lasso: { name: 'lasso', displayName: 'Lasso', icon: 'lasso', category: 'selection', shortcut: 'Q' },
  magicWand: { name: 'magicWand', displayName: 'Magic Wand', icon: 'magicWand', category: 'selection', shortcut: 'W' },

  // Utility tools
  colorPicker: { name: 'colorPicker', displayName: 'Color Picker', icon: 'colorPicker', category: 'utility', shortcut: 'I' },
  move: { name: 'move', displayName: 'Move', icon: 'move', category: 'utility', shortcut: 'V' },
  pan: { name: 'pan', displayName: 'Pan', icon: 'pan', category: 'utility', shortcut: 'H' },
  zoom: { name: 'zoom', displayName: 'Zoom', icon: 'zoom', category: 'utility', shortcut: 'Z' },
}

// Keyboard shortcuts mapping
export const TOOL_SHORTCUTS: Record<string, ToolName> = Object.fromEntries(
  Object.values(TOOL_REGISTRY).map(tool => [tool.shortcut.toLowerCase(), tool.name])
)

export interface ToolsState {
  // Current tool state
  currentTool: ToolName
  previousTool: ToolName | null

  // Brush settings
  brushSize: number
  brushOpacity: number
  pixelPerfect: boolean
  overwrite: boolean

  // Spacing
  spacingMode: boolean
  spacing: { x: number; y: number }

  // Shape settings
  filled: boolean

  // Bucket settings
  bucketTolerance: number

  // Shading settings
  shadingMode: ShadingMode
  shadingAmount: number

  // Mirror settings
  mirrorH: boolean
  mirrorV: boolean

  // Spray settings
  sprayDensity: number
  sprayRadius: number

  // Dynamics (pressure sensitivity)
  dynamicsEnabled: boolean
  dynamicsAlpha: boolean
  dynamicsSize: boolean
  penPressure: number
  penPressureMin: number
  penPressureMax: number

  // Stabilizer
  stabilizerEnabled: boolean
  stabilizerValue: number

  // Alpha lock
  alphaLocked: boolean

  // Actions
  setTool: (tool: ToolName) => void
  setPreviousTool: () => void
  setBrushSize: (size: number) => void
  setBrushOpacity: (opacity: number) => void
  setPixelPerfect: (enabled: boolean) => void
  setOverwrite: (enabled: boolean) => void
  setSpacingMode: (enabled: boolean) => void
  setSpacing: (x: number, y: number) => void
  setFilled: (filled: boolean) => void
  setBucketTolerance: (tolerance: number) => void
  setShadingMode: (mode: ShadingMode) => void
  setShadingAmount: (amount: number) => void
  setMirrorH: (enabled: boolean) => void
  setMirrorV: (enabled: boolean) => void
  setSprayDensity: (density: number) => void
  setSprayRadius: (radius: number) => void
  setDynamicsEnabled: (enabled: boolean) => void
  setDynamicsAlpha: (enabled: boolean) => void
  setDynamicsSize: (enabled: boolean) => void
  setPenPressure: (pressure: number) => void
  setStabilizerEnabled: (enabled: boolean) => void
  setStabilizerValue: (value: number) => void
  setAlphaLocked: (locked: boolean) => void

  // Helpers
  getToolConfig: (tool?: ToolName) => ToolConfig
  getToolsByCategory: (category: ToolCategory) => ToolConfig[]
  isDrawingTool: (tool?: ToolName) => boolean
  isSelectionTool: (tool?: ToolName) => boolean
}

export const useToolsStore = create<ToolsState>()(
  subscribeWithSelector((set, get) => ({
    // Current tool
    currentTool: 'pencil',
    previousTool: null,

    // Brush settings
    brushSize: 1,
    brushOpacity: 100,
    pixelPerfect: false,
    overwrite: false,

    // Spacing
    spacingMode: false,
    spacing: { x: 1, y: 1 },

    // Shape settings
    filled: false,

    // Bucket settings
    bucketTolerance: 0,

    // Shading settings
    shadingMode: 'lighten',
    shadingAmount: 10,

    // Mirror settings
    mirrorH: false,
    mirrorV: false,

    // Spray settings
    sprayDensity: 5,
    sprayRadius: 8,

    // Dynamics
    dynamicsEnabled: false,
    dynamicsAlpha: false,
    dynamicsSize: false,
    penPressure: 1.0,
    penPressureMin: 0.2,
    penPressureMax: 0.8,

    // Stabilizer
    stabilizerEnabled: false,
    stabilizerValue: 16,

    // Alpha lock
    alphaLocked: false,

    // === Actions ===

    setTool: (tool) => set((state) => ({
      currentTool: tool,
      previousTool: state.currentTool,
    })),

    setPreviousTool: () => set((state) => ({
      currentTool: state.previousTool || 'pencil',
      previousTool: state.currentTool,
    })),

    setBrushSize: (size) => set({
      brushSize: Math.max(1, Math.min(100, size))
    }),

    setBrushOpacity: (opacity) => set({
      brushOpacity: Math.max(1, Math.min(100, opacity))
    }),

    setPixelPerfect: (enabled) => set({ pixelPerfect: enabled }),
    setOverwrite: (enabled) => set({ overwrite: enabled }),
    setSpacingMode: (enabled) => set({ spacingMode: enabled }),

    setSpacing: (x, y) => set({
      spacing: { x: Math.max(1, x), y: Math.max(1, y) }
    }),

    setFilled: (filled) => set({ filled }),

    setBucketTolerance: (tolerance) => set({
      bucketTolerance: Math.max(0, Math.min(255, tolerance))
    }),

    setShadingMode: (mode) => set({ shadingMode: mode }),

    setShadingAmount: (amount) => set({
      shadingAmount: Math.max(0, Math.min(100, amount))
    }),

    setMirrorH: (enabled) => set({ mirrorH: enabled }),
    setMirrorV: (enabled) => set({ mirrorV: enabled }),

    setSprayDensity: (density) => set({
      sprayDensity: Math.max(1, Math.min(20, density))
    }),

    setSprayRadius: (radius) => set({
      sprayRadius: Math.max(1, Math.min(64, radius))
    }),

    setDynamicsEnabled: (enabled) => set({ dynamicsEnabled: enabled }),
    setDynamicsAlpha: (enabled) => set({ dynamicsAlpha: enabled }),
    setDynamicsSize: (enabled) => set({ dynamicsSize: enabled }),

    setPenPressure: (pressure) => set({
      penPressure: Math.max(0, Math.min(1, pressure))
    }),

    setStabilizerEnabled: (enabled) => set({ stabilizerEnabled: enabled }),

    setStabilizerValue: (value) => set({
      stabilizerValue: Math.max(1, Math.min(100, value))
    }),

    setAlphaLocked: (locked) => set({ alphaLocked: locked }),

    // === Helpers ===

    getToolConfig: (tool) => {
      const toolName = tool || get().currentTool
      return TOOL_REGISTRY[toolName]
    },

    getToolsByCategory: (category) => {
      return Object.values(TOOL_REGISTRY).filter(t => t.category === category)
    },

    isDrawingTool: (tool) => {
      const toolName = tool || get().currentTool
      return ['pencil', 'eraser', 'bucket', 'line', 'rectangle', 'ellipse', 'shading', 'spray'].includes(toolName)
    },

    isSelectionTool: (tool) => {
      const toolName = tool || get().currentTool
      return ['rectSelect', 'ellipseSelect', 'lasso', 'magicWand'].includes(toolName)
    },
  }))
)

// Tool change event emitter (like Pixelorama's signals)
export const toolEvents = {
  listeners: new Set<(tool: ToolName, prev: ToolName | null) => void>(),

  subscribe(callback: (tool: ToolName, prev: ToolName | null) => void) {
    this.listeners.add(callback)
    return () => this.listeners.delete(callback)
  },

  emit(tool: ToolName, prev: ToolName | null) {
    this.listeners.forEach(cb => cb(tool, prev))
  }
}

// Subscribe to tool changes and emit events
useToolsStore.subscribe(
  (state) => state.currentTool,
  (tool, prevTool) => {
    toolEvents.emit(tool, prevTool as ToolName | null)
  }
)
