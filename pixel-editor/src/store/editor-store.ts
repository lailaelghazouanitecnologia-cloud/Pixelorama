/**
 * Editor Store - Central state management
 * Based on Pixelorama's Global autoload pattern
 */

import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { History, getHistory } from '../core/history'
import type { ToolCategory } from '../core/types'

// Tool type - matches our registry names
export type ToolName =
  | 'pencil' | 'eraser' | 'bucket' | 'line' | 'rectangle' | 'ellipse' | 'shading' | 'spray'  // Design tools
  | 'rectSelect' | 'ellipseSelect' | 'lasso' | 'magicWand'                          // Selection tools
  | 'colorPicker' | 'move' | 'pan' | 'zoom'                                          // Utility tools

export type ShadingMode = 'lighten' | 'darken'

export interface Layer {
  id: string
  name: string
  visible: boolean
  locked: boolean
  opacity: number
  blendMode: BlendMode
  data: ImageData | null
}

export type BlendMode = 'normal' | 'multiply' | 'screen' | 'overlay' | 'darken' | 'lighten'

export interface Frame {
  id: string
  layers: Layer[]
  duration: number
}

export interface Selection {
  active: boolean
  x: number
  y: number
  width: number
  height: number
  mask: ImageData | null
}

export interface EditorState {
  // Project info
  projectName: string
  modified: boolean

  // Canvas
  width: number
  height: number
  zoom: number
  panX: number
  panY: number

  // Tools
  currentTool: ToolName
  previousTool: ToolName | null
  brushSize: number
  brushOpacity: number
  pixelPerfect: boolean
  overwrite: boolean
  spacingMode: boolean
  spacing: { x: number; y: number }
  filled: boolean
  bucketTolerance: number
  shadingMode: ShadingMode
  shadingAmount: number
  mirrorH: boolean
  mirrorV: boolean
  sprayDensity: number
  sprayRadius: number

  // Colors
  primaryColor: string
  secondaryColor: string
  palette: string[]

  // Layers
  layers: Layer[]
  currentLayerIndex: number

  // Frames (animation)
  frames: Frame[]
  currentFrameIndex: number
  fps: number
  isPlaying: boolean

  // Selection
  selection: Selection

  // History
  history: History
  canUndo: boolean
  canRedo: boolean

  // UI
  showGrid: boolean
  showOnionSkin: boolean
  showRulers: boolean
  showGuides: boolean
  snapToGrid: boolean
  gridSize: number

  // Actions
  // Project
  newProject: (width: number, height: number, fillColor?: string) => void
  setProjectName: (name: string) => void
  setModified: (modified: boolean) => void

  // Tools
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

  // Colors
  setPrimaryColor: (color: string) => void
  setSecondaryColor: (color: string) => void
  swapColors: () => void
  addToPalette: (color: string) => void
  removeFromPalette: (index: number) => void
  setPalette: (colors: string[]) => void

  // View
  setZoom: (zoom: number) => void
  zoomIn: () => void
  zoomOut: () => void
  resetZoom: () => void
  fitToScreen: (viewportWidth: number, viewportHeight: number) => void
  setPan: (x: number, y: number) => void
  pan: (deltaX: number, deltaY: number) => void
  resetPan: () => void

  // Layers
  setCurrentLayer: (index: number) => void
  addLayer: (name?: string) => void
  duplicateLayer: (index: number) => void
  deleteLayer: (index: number) => void
  toggleLayerVisibility: (index: number) => void
  toggleLayerLock: (index: number) => void
  setLayerOpacity: (index: number, opacity: number) => void
  setLayerBlendMode: (index: number, mode: BlendMode) => void
  renameLayer: (index: number, name: string) => void
  moveLayer: (from: number, to: number) => void
  mergeLayerDown: (index: number) => void
  flattenLayers: () => void
  setLayerData: (index: number, data: ImageData) => void

  // Frames
  addFrame: () => void
  duplicateFrame: (index: number) => void
  deleteFrame: (index: number) => void
  setCurrentFrame: (index: number) => void
  setFps: (fps: number) => void
  setFrameDuration: (index: number, duration: number) => void
  togglePlay: () => void
  nextFrame: () => void
  prevFrame: () => void

  // Selection
  setSelection: (selection: Partial<Selection>) => void
  clearSelection: () => void
  selectAll: () => void
  invertSelection: () => void

  // History
  undo: () => void
  redo: () => void
  updateHistoryState: () => void

  // UI toggles
  toggleGrid: () => void
  toggleOnionSkin: () => void
  toggleRulers: () => void
  toggleGuides: () => void
  toggleSnapToGrid: () => void
  setGridSize: (size: number) => void
  setCanvasSize: (width: number, height: number) => void
}

// Pixelorama default palette (PICO-8 extended)
const defaultPalette = [
  '#000000', '#1d2b53', '#7e2553', '#008751',
  '#ab5236', '#5f574f', '#c2c3c7', '#fff1e8',
  '#ff004d', '#ffa300', '#ffec27', '#00e436',
  '#29adff', '#83769c', '#ff77a8', '#ffccaa',
  '#291814', '#111d35', '#422136', '#125359',
  '#742f29', '#49333b', '#a28879', '#f3ef7d',
  '#be1250', '#ff6c24', '#a8e72e', '#00b543',
  '#065ab5', '#754665', '#ff6e59', '#ff9c81',
]

const createDefaultLayer = (id: string, name: string): Layer => ({
  id,
  name,
  visible: true,
  locked: false,
  opacity: 100,
  blendMode: 'normal',
  data: null,
})

const createDefaultSelection = (): Selection => ({
  active: false,
  x: 0,
  y: 0,
  width: 0,
  height: 0,
  mask: null,
})

// Zoom levels matching Pixelorama
const ZOOM_LEVELS = [0.125, 0.25, 0.5, 1, 2, 4, 8, 16, 32, 64]
const DEFAULT_ZOOM = 8
const MIN_ZOOM = 0.125
const MAX_ZOOM = 64

export const useEditorStore = create<EditorState>()(
  subscribeWithSelector((set, get) => ({
    // Project
    projectName: 'Untitled',
    modified: false,

    // Canvas
    width: 64,
    height: 64,
    zoom: DEFAULT_ZOOM,
    panX: 0,
    panY: 0,

    // Tools
    currentTool: 'pencil',
    previousTool: null,
    brushSize: 1,
    brushOpacity: 100,
    pixelPerfect: false,
    overwrite: false,
    spacingMode: false,
    spacing: { x: 1, y: 1 },
    filled: false,
    bucketTolerance: 0,
    shadingMode: 'lighten' as ShadingMode,
    shadingAmount: 10,
    mirrorH: false,
    mirrorV: false,
    sprayDensity: 5,
    sprayRadius: 8,

    // Colors
    primaryColor: '#ffffff',
    secondaryColor: '#000000',
    palette: defaultPalette,

    // Layers
    layers: [createDefaultLayer('layer-1', 'Layer 1')],
    currentLayerIndex: 0,

    // Frames
    frames: [],
    currentFrameIndex: 0,
    fps: 12,
    isPlaying: false,

    // Selection
    selection: createDefaultSelection(),

    // History
    history: getHistory(),
    canUndo: false,
    canRedo: false,

    // UI
    showGrid: true,
    showOnionSkin: false,
    showRulers: true,
    showGuides: true,
    snapToGrid: false,
    gridSize: 8,

    // === Actions ===

    // Project
    newProject: (width, height, fillColor) => {
      // Create initial layer with fill color if provided
      const layer = createDefaultLayer('layer-1', 'Layer 1')

      // Create ImageData with fill color if not transparent
      if (fillColor && fillColor !== '#00000000' && fillColor !== 'transparent') {
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.fillStyle = fillColor
          ctx.fillRect(0, 0, width, height)
          layer.data = ctx.getImageData(0, 0, width, height)
        }
      }

      return set({
        width,
        height,
        layers: [layer],
        currentLayerIndex: 0,
        frames: [],
        currentFrameIndex: 0,
        selection: createDefaultSelection(),
        projectName: 'Untitled',
        modified: false,
        panX: 0,
        panY: 0,
      })
    },

    setProjectName: (name) => set({ projectName: name }),
    setModified: (modified) => set({ modified }),

    // Tools
    setTool: (tool) => set((state) => ({
      currentTool: tool,
      previousTool: state.currentTool,
    })),

    setPreviousTool: () => set((state) => ({
      currentTool: state.previousTool || 'pencil',
      previousTool: state.currentTool,
    })),

    setBrushSize: (size) => set({ brushSize: Math.max(1, Math.min(100, size)) }),
    setBrushOpacity: (opacity) => set({ brushOpacity: Math.max(1, Math.min(100, opacity)) }),
    setPixelPerfect: (enabled) => set({ pixelPerfect: enabled }),
    setOverwrite: (enabled) => set({ overwrite: enabled }),
    setSpacingMode: (enabled) => set({ spacingMode: enabled }),
    setSpacing: (x, y) => set({ spacing: { x: Math.max(1, x), y: Math.max(1, y) } }),
    setFilled: (filled) => set({ filled }),
    setBucketTolerance: (tolerance) => set({ bucketTolerance: Math.max(0, Math.min(255, tolerance)) }),
    setShadingMode: (mode) => set({ shadingMode: mode }),
    setShadingAmount: (amount) => set({ shadingAmount: Math.max(0, Math.min(100, amount)) }),
    setMirrorH: (enabled) => set({ mirrorH: enabled }),
    setMirrorV: (enabled) => set({ mirrorV: enabled }),
    setSprayDensity: (density) => set({ sprayDensity: Math.max(1, Math.min(20, density)) }),
    setSprayRadius: (radius) => set({ sprayRadius: Math.max(1, Math.min(64, radius)) }),

    // Colors
    setPrimaryColor: (color) => set({ primaryColor: color }),
    setSecondaryColor: (color) => set({ secondaryColor: color }),
    swapColors: () => set((state) => ({
      primaryColor: state.secondaryColor,
      secondaryColor: state.primaryColor,
    })),
    addToPalette: (color) => set((state) => {
      if (state.palette.includes(color)) return state
      return { palette: [...state.palette, color] }
    }),
    removeFromPalette: (index) => set((state) => ({
      palette: state.palette.filter((_, i) => i !== index),
    })),
    setPalette: (colors) => set({ palette: colors }),

    // View
    setZoom: (zoom) => set({
      zoom: Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom))
    }),

    zoomIn: () => set((state) => {
      const currentIndex = ZOOM_LEVELS.findIndex(z => z >= state.zoom)
      const nextIndex = Math.min(currentIndex + 1, ZOOM_LEVELS.length - 1)
      return { zoom: ZOOM_LEVELS[nextIndex] }
    }),

    zoomOut: () => set((state) => {
      const currentIndex = ZOOM_LEVELS.findIndex(z => z >= state.zoom)
      const prevIndex = Math.max(currentIndex - 1, 0)
      return { zoom: ZOOM_LEVELS[prevIndex] }
    }),

    resetZoom: () => set({ zoom: DEFAULT_ZOOM }),

    fitToScreen: (viewportWidth, viewportHeight) => set((state) => {
      const scaleX = (viewportWidth - 40) / state.width
      const scaleY = (viewportHeight - 40) / state.height
      const zoom = Math.min(scaleX, scaleY)
      // Find closest zoom level
      const closestZoom = ZOOM_LEVELS.reduce((prev, curr) =>
        Math.abs(curr - zoom) < Math.abs(prev - zoom) ? curr : prev
      )
      return { zoom: closestZoom, panX: 0, panY: 0 }
    }),

    setPan: (x, y) => set({ panX: x, panY: y }),
    pan: (deltaX, deltaY) => set((state) => ({
      panX: state.panX + deltaX,
      panY: state.panY + deltaY,
    })),
    resetPan: () => set({ panX: 0, panY: 0 }),

    // Layers
    setCurrentLayer: (index) => set({ currentLayerIndex: index }),

    addLayer: (name) => set((state) => {
      const id = `layer-${Date.now()}`
      const layerName = name || `Layer ${state.layers.length + 1}`
      const newLayer = createDefaultLayer(id, layerName)
      return {
        layers: [...state.layers, newLayer],
        currentLayerIndex: state.layers.length,
        modified: true,
      }
    }),

    duplicateLayer: (index) => set((state) => {
      const original = state.layers[index]
      if (!original) return state
      const id = `layer-${Date.now()}`
      const newLayer: Layer = {
        ...original,
        id,
        name: `${original.name} copy`,
        data: original.data ? new ImageData(
          new Uint8ClampedArray(original.data.data),
          original.data.width,
          original.data.height
        ) : null,
      }
      const newLayers = [...state.layers]
      newLayers.splice(index + 1, 0, newLayer)
      return {
        layers: newLayers,
        currentLayerIndex: index + 1,
        modified: true,
      }
    }),

    deleteLayer: (index) => set((state) => {
      if (state.layers.length <= 1) return state
      const newLayers = state.layers.filter((_, i) => i !== index)
      return {
        layers: newLayers,
        currentLayerIndex: Math.min(state.currentLayerIndex, newLayers.length - 1),
        modified: true,
      }
    }),

    toggleLayerVisibility: (index) => set((state) => ({
      layers: state.layers.map((l, i) =>
        i === index ? { ...l, visible: !l.visible } : l
      ),
    })),

    toggleLayerLock: (index) => set((state) => ({
      layers: state.layers.map((l, i) =>
        i === index ? { ...l, locked: !l.locked } : l
      ),
    })),

    setLayerOpacity: (index, opacity) => set((state) => ({
      layers: state.layers.map((l, i) =>
        i === index ? { ...l, opacity: Math.max(0, Math.min(100, opacity)) } : l
      ),
      modified: true,
    })),

    setLayerBlendMode: (index, mode) => set((state) => ({
      layers: state.layers.map((l, i) =>
        i === index ? { ...l, blendMode: mode } : l
      ),
      modified: true,
    })),

    renameLayer: (index, name) => set((state) => ({
      layers: state.layers.map((l, i) =>
        i === index ? { ...l, name } : l
      ),
    })),

    moveLayer: (from, to) => set((state) => {
      const newLayers = [...state.layers]
      const [removed] = newLayers.splice(from, 1)
      newLayers.splice(to, 0, removed)
      return {
        layers: newLayers,
        currentLayerIndex: to,
        modified: true,
      }
    }),

    mergeLayerDown: (index) => set((state) => {
      if (index <= 0 || index >= state.layers.length) return state

      const upperLayer = state.layers[index]
      const lowerLayer = state.layers[index - 1]

      // Create canvas for merging
      const canvas = document.createElement('canvas')
      canvas.width = state.width
      canvas.height = state.height
      const ctx = canvas.getContext('2d')
      if (!ctx) return state

      ctx.imageSmoothingEnabled = false

      // Blend mode mapping
      const blendModeMap: Record<string, GlobalCompositeOperation> = {
        'normal': 'source-over',
        'multiply': 'multiply',
        'screen': 'screen',
        'overlay': 'overlay',
        'darken': 'darken',
        'lighten': 'lighten',
      }

      // Draw lower layer first
      if (lowerLayer.data && lowerLayer.visible) {
        const tempCanvas = document.createElement('canvas')
        tempCanvas.width = state.width
        tempCanvas.height = state.height
        const tempCtx = tempCanvas.getContext('2d')
        if (tempCtx) {
          tempCtx.putImageData(lowerLayer.data, 0, 0)
          ctx.globalAlpha = lowerLayer.opacity / 100
          ctx.drawImage(tempCanvas, 0, 0)
        }
      }

      // Draw upper layer with blend mode
      if (upperLayer.data && upperLayer.visible) {
        const tempCanvas = document.createElement('canvas')
        tempCanvas.width = state.width
        tempCanvas.height = state.height
        const tempCtx = tempCanvas.getContext('2d')
        if (tempCtx) {
          tempCtx.putImageData(upperLayer.data, 0, 0)
          ctx.globalAlpha = upperLayer.opacity / 100
          ctx.globalCompositeOperation = blendModeMap[upperLayer.blendMode] || 'source-over'
          ctx.drawImage(tempCanvas, 0, 0)
        }
      }

      // Get merged result
      ctx.globalAlpha = 1
      ctx.globalCompositeOperation = 'source-over'
      const mergedData = ctx.getImageData(0, 0, state.width, state.height)

      // Update layers - remove upper layer, update lower layer with merged data
      const newLayers = state.layers.filter((_, i) => i !== index)
      newLayers[index - 1] = {
        ...newLayers[index - 1],
        data: mergedData,
        opacity: 100,
        blendMode: 'normal',
        name: `${lowerLayer.name} (merged)`,
      }

      return {
        layers: newLayers,
        currentLayerIndex: Math.min(state.currentLayerIndex, newLayers.length - 1),
        modified: true,
      }
    }),

    flattenLayers: () => set((state) => {
      if (state.layers.length <= 1) return state

      // Create canvas for flattening
      const canvas = document.createElement('canvas')
      canvas.width = state.width
      canvas.height = state.height
      const ctx = canvas.getContext('2d')
      if (!ctx) return state

      ctx.imageSmoothingEnabled = false

      // Blend mode mapping
      const blendModeMap: Record<string, GlobalCompositeOperation> = {
        'normal': 'source-over',
        'multiply': 'multiply',
        'screen': 'screen',
        'overlay': 'overlay',
        'darken': 'darken',
        'lighten': 'lighten',
      }

      // Composite all layers from bottom to top
      for (const layer of state.layers) {
        if (!layer.visible || !layer.data) continue

        const tempCanvas = document.createElement('canvas')
        tempCanvas.width = state.width
        tempCanvas.height = state.height
        const tempCtx = tempCanvas.getContext('2d')
        if (tempCtx) {
          tempCtx.putImageData(layer.data, 0, 0)
          ctx.globalAlpha = layer.opacity / 100
          ctx.globalCompositeOperation = blendModeMap[layer.blendMode] || 'source-over'
          ctx.drawImage(tempCanvas, 0, 0)
        }
      }

      // Get flattened result
      ctx.globalAlpha = 1
      ctx.globalCompositeOperation = 'source-over'
      const flattenedData = ctx.getImageData(0, 0, state.width, state.height)

      // Create single flattened layer
      const flattenedLayer: Layer = {
        id: `layer-${Date.now()}`,
        name: 'Flattened',
        visible: true,
        locked: false,
        opacity: 100,
        blendMode: 'normal',
        data: flattenedData,
      }

      return {
        layers: [flattenedLayer],
        currentLayerIndex: 0,
        modified: true,
      }
    }),

    setLayerData: (index, data) => set((state) => ({
      layers: state.layers.map((l, i) =>
        i === index ? { ...l, data } : l
      ),
      modified: true,
    })),

    // Frames
    addFrame: () => set((state) => ({
      frames: [...state.frames, {
        id: `frame-${Date.now()}`,
        layers: state.layers.map(l => ({
          ...l,
          data: l.data ? new ImageData(
            new Uint8ClampedArray(l.data.data),
            l.data.width,
            l.data.height
          ) : null,
        })),
        duration: 1000 / state.fps,
      }],
      currentFrameIndex: state.frames.length,
      modified: true,
    })),

    duplicateFrame: (index) => set((state) => {
      const original = state.frames[index]
      if (!original) return state
      const newFrame = {
        ...original,
        id: `frame-${Date.now()}`,
        layers: original.layers.map(l => ({
          ...l,
          data: l.data ? new ImageData(
            new Uint8ClampedArray(l.data.data),
            l.data.width,
            l.data.height
          ) : null,
        })),
      }
      const newFrames = [...state.frames]
      newFrames.splice(index + 1, 0, newFrame)
      return {
        frames: newFrames,
        currentFrameIndex: index + 1,
        modified: true,
      }
    }),

    deleteFrame: (index) => set((state) => {
      if (state.frames.length <= 1) return state
      return {
        frames: state.frames.filter((_, i) => i !== index),
        currentFrameIndex: Math.min(state.currentFrameIndex, state.frames.length - 2),
        modified: true,
      }
    }),

    setCurrentFrame: (index) => set({ currentFrameIndex: index }),
    setFps: (fps) => set({ fps: Math.max(1, Math.min(60, fps)) }),
    setFrameDuration: (index, duration) => set((state) => ({
      frames: state.frames.map((f, i) =>
        i === index ? { ...f, duration } : f
      ),
    })),
    togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),

    nextFrame: () => set((state) => ({
      currentFrameIndex: (state.currentFrameIndex + 1) % Math.max(1, state.frames.length),
    })),

    prevFrame: () => set((state) => ({
      currentFrameIndex: state.currentFrameIndex > 0
        ? state.currentFrameIndex - 1
        : Math.max(0, state.frames.length - 1),
    })),

    // Selection
    setSelection: (selection) => set((state) => ({
      selection: { ...state.selection, ...selection },
    })),

    clearSelection: () => set({ selection: createDefaultSelection() }),

    selectAll: () => set((state) => ({
      selection: {
        active: true,
        x: 0,
        y: 0,
        width: state.width,
        height: state.height,
        mask: null,
      },
    })),

    invertSelection: () => set((state) => {
      // Invert selection logic would go here
      return state
    }),

    // History
    undo: () => {
      const { history } = get()
      history.undo()
      get().updateHistoryState()
    },

    redo: () => {
      const { history } = get()
      history.redo()
      get().updateHistoryState()
    },

    updateHistoryState: () => {
      const { history } = get()
      set({
        canUndo: history.canUndo(),
        canRedo: history.canRedo(),
      })
    },

    // UI
    toggleGrid: () => set((state) => ({ showGrid: !state.showGrid })),
    toggleOnionSkin: () => set((state) => ({ showOnionSkin: !state.showOnionSkin })),
    toggleRulers: () => set((state) => ({ showRulers: !state.showRulers })),
    toggleGuides: () => set((state) => ({ showGuides: !state.showGuides })),
    toggleSnapToGrid: () => set((state) => ({ snapToGrid: !state.snapToGrid })),
    setGridSize: (size) => set({ gridSize: Math.max(1, Math.min(64, size)) }),
    setCanvasSize: (width, height) => set({ width, height, modified: true }),
  }))
)

// Subscribe to history changes
getHistory().subscribe((state) => {
  useEditorStore.setState({
    canUndo: state.canUndo,
    canRedo: state.canRedo,
  })
})

// Keyboard shortcuts helper
export const SHORTCUTS: Record<string, ToolName | (() => void)> = {
  'b': 'pencil',
  'e': 'eraser',
  'g': 'bucket',
  'l': 'line',
  'r': 'rectangle',
  'o': 'ellipse',
  'u': 'shading',
  's': 'spray',
  'm': 'rectSelect',
  'j': 'ellipseSelect',
  'i': 'colorPicker',
  'v': 'move',
  'h': 'pan',
  'z': 'zoom',
}
