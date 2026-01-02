/**
 * Tools Store - Centralized tool state management
 * Based on Pixelorama's Tools.gd autoload pattern
 */

import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type { DitherPattern } from '@/core/dithering'
import type { Brush } from '@/core/brushes'
import { BrushType } from '@/core/brushes'

// Tool categories matching Pixelorama
export type ToolCategory = 'design' | 'selection' | 'utility'

// Tool names
export type ToolName =
  | 'pencil' | 'eraser' | 'bucket' | 'line' | 'curve' | 'rectangle' | 'ellipse' | 'shading' | 'spray' | 'gradient' | 'isometricBox'  // Design tools
  | 'smudge' | 'cloneStamp' | 'dodgeBurn' | 'text'  // Advanced design tools
  | 'rectSelect' | 'ellipseSelect' | 'lasso' | 'polygonSelect' | 'magicWand' | 'colorSelect' | 'paintSelect'  // Selection tools
  | 'colorPicker' | 'move' | 'pan' | 'zoom' | 'crop' | 'transform' | 'tileMap'  // Utility tools

export type ShadingMode = 'lighten' | 'darken'
export type ShadingType = 'simple' | 'hue_shifting' | 'color_replace'
export type SelectionMode = 'replace' | 'add' | 'subtract' | 'intersect'

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
  curve: { name: 'curve', displayName: 'Curve', icon: 'spline', category: 'design', shortcut: 'C' },
  rectangle: { name: 'rectangle', displayName: 'Rectangle', icon: 'rectangle', category: 'design', shortcut: 'R' },
  ellipse: { name: 'ellipse', displayName: 'Ellipse', icon: 'ellipse', category: 'design', shortcut: 'O' },
  shading: { name: 'shading', displayName: 'Shading', icon: 'shading', category: 'design', shortcut: 'U' },
  spray: { name: 'spray', displayName: 'Spray', icon: 'spray', category: 'design', shortcut: 'S' },
  gradient: { name: 'gradient', displayName: 'Gradient', icon: 'gradient', category: 'design', shortcut: 'F' },
  isometricBox: { name: 'isometricBox', displayName: 'Isometric Box', icon: 'box', category: 'design', shortcut: 'X' },
  smudge: { name: 'smudge', displayName: 'Smudge', icon: 'smudge', category: 'design', shortcut: 'Y' },
  cloneStamp: { name: 'cloneStamp', displayName: 'Clone Stamp', icon: 'stamp', category: 'design', shortcut: 'N' },
  dodgeBurn: { name: 'dodgeBurn', displayName: 'Dodge/Burn', icon: 'sun', category: 'design', shortcut: ',' },
  text: { name: 'text', displayName: 'Text', icon: 'type', category: 'design', shortcut: 'T' },

  // Selection tools
  rectSelect: { name: 'rectSelect', displayName: 'Rectangle Select', icon: 'rectSelect', category: 'selection', shortcut: 'M' },
  ellipseSelect: { name: 'ellipseSelect', displayName: 'Ellipse Select', icon: 'ellipseSelect', category: 'selection', shortcut: 'J' },
  lasso: { name: 'lasso', displayName: 'Lasso', icon: 'lasso', category: 'selection', shortcut: 'Q' },
  polygonSelect: { name: 'polygonSelect', displayName: 'Polygon Select', icon: 'polygonSelect', category: 'selection', shortcut: 'P' },
  magicWand: { name: 'magicWand', displayName: 'Magic Wand', icon: 'magicWand', category: 'selection', shortcut: 'W' },
  colorSelect: { name: 'colorSelect', displayName: 'Select by Color', icon: 'colorSelect', category: 'selection', shortcut: ';' },
  paintSelect: { name: 'paintSelect', displayName: 'Paint Select', icon: 'paintbrush', category: 'selection', shortcut: 'A' },

  // Utility tools
  colorPicker: { name: 'colorPicker', displayName: 'Color Picker', icon: 'colorPicker', category: 'utility', shortcut: 'I' },
  move: { name: 'move', displayName: 'Move', icon: 'move', category: 'utility', shortcut: 'V' },
  pan: { name: 'pan', displayName: 'Pan', icon: 'pan', category: 'utility', shortcut: 'H' },
  zoom: { name: 'zoom', displayName: 'Zoom', icon: 'zoom', category: 'utility', shortcut: 'Z' },
  crop: { name: 'crop', displayName: 'Crop', icon: 'crop', category: 'utility', shortcut: 'K' },
  transform: { name: 'transform', displayName: 'Transform', icon: 'move', category: 'utility', shortcut: 'Ctrl+T' },
  tileMap: { name: 'tileMap', displayName: 'TileMap', icon: 'grid', category: 'utility', shortcut: 'Shift+T' },
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
  currentBrushType: BrushType
  currentBrushId: string | null

  // Spacing
  spacingMode: boolean
  spacing: { x: number; y: number }

  // Fill Inside (for pencil tool - fills closed path)
  fillInside: boolean

  // Shape settings
  filled: boolean

  // Bucket settings
  bucketTolerance: number
  bucketFillArea: 'area' | 'colors' | 'selection'

  // Shading settings
  shadingType: ShadingType
  shadingMode: ShadingMode
  shadingAmount: number
  shadingHueAmount: number
  shadingSatAmount: number
  shadingValueAmount: number
  shadingColorArray: string[]

  // Mirror settings
  mirrorH: boolean
  mirrorV: boolean
  mirrorDiagonalXY: boolean  // Diagonal mirror (top-left to bottom-right)
  mirrorDiagonalXnY: boolean // Anti-diagonal mirror (top-right to bottom-left)

  // Spray settings
  sprayDensity: number
  sprayRadius: number

  // Dithering
  ditherPattern: DitherPattern

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

  // Selection settings
  selectionMode: SelectionMode
  selectionTolerance: number

  // Actions
  setTool: (tool: ToolName) => void
  setPreviousTool: () => void
  setBrushSize: (size: number) => void
  setBrushOpacity: (opacity: number) => void
  setPixelPerfect: (enabled: boolean) => void
  setOverwrite: (enabled: boolean) => void
  setSpacingMode: (enabled: boolean) => void
  setSpacing: (x: number, y: number) => void
  setFillInside: (enabled: boolean) => void
  setFilled: (filled: boolean) => void
  setBucketTolerance: (tolerance: number) => void
  setBucketFillArea: (area: 'area' | 'colors' | 'selection') => void
  setShadingType: (type: ShadingType) => void
  setShadingMode: (mode: ShadingMode) => void
  setShadingAmount: (amount: number) => void
  setShadingHueAmount: (amount: number) => void
  setShadingSatAmount: (amount: number) => void
  setShadingValueAmount: (amount: number) => void
  setShadingColorArray: (colors: string[]) => void
  setMirrorH: (enabled: boolean) => void
  setMirrorV: (enabled: boolean) => void
  setMirrorDiagonalXY: (enabled: boolean) => void
  setMirrorDiagonalXnY: (enabled: boolean) => void
  setSprayDensity: (density: number) => void
  setSprayRadius: (radius: number) => void
  setDitherPattern: (pattern: DitherPattern) => void
  setDynamicsEnabled: (enabled: boolean) => void
  setDynamicsAlpha: (enabled: boolean) => void
  setDynamicsSize: (enabled: boolean) => void
  setPenPressure: (pressure: number) => void
  setStabilizerEnabled: (enabled: boolean) => void
  setStabilizerValue: (value: number) => void
  setAlphaLocked: (locked: boolean) => void
  setSelectionMode: (mode: SelectionMode) => void
  setSelectionTolerance: (tolerance: number) => void
  setCurrentBrushType: (type: BrushType) => void
  setCurrentBrushId: (id: string | null) => void

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
    currentBrushType: BrushType.PIXEL,
    currentBrushId: 'pixel',

    // Spacing
    spacingMode: false,
    spacing: { x: 1, y: 1 },

    // Fill Inside
    fillInside: false,

    // Shape settings
    filled: false,

    // Bucket settings
    bucketTolerance: 0,
    bucketFillArea: 'area' as const,

    // Shading settings
    shadingType: 'simple' as ShadingType,
    shadingMode: 'lighten',
    shadingAmount: 10,
    shadingHueAmount: 10,
    shadingSatAmount: 10,
    shadingValueAmount: 10,
    shadingColorArray: [],

    // Mirror settings
    mirrorH: false,
    mirrorV: false,
    mirrorDiagonalXY: false,
    mirrorDiagonalXnY: false,

    // Spray settings
    sprayDensity: 5,
    sprayRadius: 8,

    // Dithering
    ditherPattern: 'none' as DitherPattern,

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

    // Selection settings
    selectionMode: 'replace' as SelectionMode,
    selectionTolerance: 0,

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

    setFillInside: (enabled) => set({ fillInside: enabled }),

    setFilled: (filled) => set({ filled }),

    setBucketTolerance: (tolerance) => set({
      bucketTolerance: Math.max(0, Math.min(255, tolerance))
    }),

    setBucketFillArea: (area) => set({ bucketFillArea: area }),

    setShadingType: (type) => set({ shadingType: type }),

    setShadingMode: (mode) => set({ shadingMode: mode }),

    setShadingAmount: (amount) => set({
      shadingAmount: Math.max(0, Math.min(100, amount))
    }),

    setShadingHueAmount: (amount) => set({
      shadingHueAmount: Math.max(0, Math.min(100, amount))
    }),

    setShadingSatAmount: (amount) => set({
      shadingSatAmount: Math.max(0, Math.min(100, amount))
    }),

    setShadingValueAmount: (amount) => set({
      shadingValueAmount: Math.max(0, Math.min(100, amount))
    }),

    setShadingColorArray: (colors) => set({ shadingColorArray: colors }),

    setMirrorH: (enabled) => set({ mirrorH: enabled }),
    setMirrorV: (enabled) => set({ mirrorV: enabled }),
    setMirrorDiagonalXY: (enabled) => set({ mirrorDiagonalXY: enabled }),
    setMirrorDiagonalXnY: (enabled) => set({ mirrorDiagonalXnY: enabled }),

    setSprayDensity: (density) => set({
      sprayDensity: Math.max(1, Math.min(20, density))
    }),

    setSprayRadius: (radius) => set({
      sprayRadius: Math.max(1, Math.min(64, radius))
    }),

    setDitherPattern: (pattern) => set({ ditherPattern: pattern }),

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

    setSelectionMode: (mode) => set({ selectionMode: mode }),

    setSelectionTolerance: (tolerance) => set({
      selectionTolerance: Math.max(0, Math.min(255, tolerance))
    }),

    setCurrentBrushType: (type) => set({ currentBrushType: type }),

    setCurrentBrushId: (id) => set({ currentBrushId: id }),

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
      return ['pencil', 'eraser', 'bucket', 'line', 'curve', 'rectangle', 'ellipse', 'shading', 'spray', 'text', 'isometricBox', 'smudge', 'cloneStamp', 'dodgeBurn', 'gradient'].includes(toolName)
    },

    isSelectionTool: (tool) => {
      const toolName = tool || get().currentTool
      return ['rectSelect', 'ellipseSelect', 'lasso', 'polygonSelect', 'magicWand', 'colorSelect', 'paintSelect'].includes(toolName)
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
