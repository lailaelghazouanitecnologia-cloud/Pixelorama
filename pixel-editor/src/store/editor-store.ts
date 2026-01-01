/**
 * Editor Store - Central state management
 * Based on Pixelorama's Global autoload pattern
 */

import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { History, getHistory } from '../core/history'
import type { ToolCategory } from '../core/types'
import {
  type Guide,
  type PerspectiveGuide,
  createGuide,
  generateGuideId,
  createOnePointPerspective,
  createTwoPointPerspective,
  createThreePointPerspective,
} from '../core/guides'

// Tool type - matches our registry names
export type ToolName =
  | 'pencil' | 'eraser' | 'bucket' | 'line' | 'rectangle' | 'ellipse' | 'shading' | 'spray' | 'gradient'  // Design tools
  | 'rectSelect' | 'ellipseSelect' | 'lasso' | 'magicWand' | 'colorSelect'           // Selection tools
  | 'colorPicker' | 'move' | 'pan' | 'zoom'                                          // Utility tools

export type ShadingMode = 'lighten' | 'darken'

export type LayerType = 'pixel' | 'group' | 'tilemap' | 'audio'

export interface Layer {
  id: string
  name: string
  visible: boolean
  locked: boolean
  opacity: number
  blendMode: BlendMode
  data: ImageData | null
  // Group layer support
  type: LayerType
  children?: Layer[]  // Only for group layers
  expanded?: boolean  // Group expand/collapse state
  parentId?: string   // ID of parent group (null = root level)
  // Clipping mask support
  clipped?: boolean   // If true, this layer clips to the layer below
  // Cel linking support - links to source cel in another frame
  linkedCelId?: string  // ID of the source layer this cel is linked to
  // Layer effects (non-destructive)
  effects?: import('./layerEffects').AnyLayerEffect[]
  // TileMap layer support
  tilemapData?: import('@/core/tilemap').TileMapData
  selectedTilesetId?: string
  // Audio layer support
  audioLayerId?: string  // Reference to audio layer data in audio-store
}

// All 20 blend modes matching Pixelorama's BaseLayer.gd
export type BlendMode =
  | 'normal'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'darken'
  | 'lighten'
  | 'color-dodge'
  | 'linear-dodge' // Add
  | 'color-burn'
  | 'linear-burn'
  | 'hard-light'
  | 'soft-light'
  | 'difference'
  | 'exclusion'
  | 'subtract'
  | 'divide'
  | 'hue'
  | 'saturation'
  | 'color'
  | 'luminosity'

export interface Frame {
  id: string
  layers: Layer[]
  duration: number
}

// Animation Tag - named range of frames
export interface AnimationTag {
  id: string
  name: string
  color: string
  fromFrame: number // 0-indexed
  toFrame: number   // 0-indexed, inclusive
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
  animationTags: AnimationTag[]

  // Selection
  selection: Selection

  // History
  history: History
  canUndo: boolean
  canRedo: boolean

  // UI
  showGrid: boolean
  gridType: 'rectangular' | 'isometric'
  isometricCellWidth: number
  isometricCellHeight: number
  showOnionSkin: boolean
  showRulers: boolean
  showGuides: boolean
  snapToGrid: boolean
  snapToGuides: boolean
  tileMode: boolean
  gridSize: number
  guides: Guide[]
  perspectiveGuides: PerspectiveGuide[]
  showPerspectiveGuides: boolean
  activePerspectiveGuide: string | null // ID of currently active perspective guide

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

  // Layer Groups
  addLayerGroup: (name?: string) => void
  groupLayers: (indices: number[]) => void
  ungroupLayers: (index: number) => void
  toggleGroupExpanded: (index: number) => void
  moveLayerToGroup: (layerIndex: number, groupIndex: number | null) => void

  // TileMap Layers
  addTileMapLayer: (name?: string, tileWidth?: number, tileHeight?: number) => void
  setTileMapData: (layerIndex: number, data: import('@/core/tilemap').TileMapData) => void
  setLayerTileset: (layerIndex: number, tilesetId: string) => void
  updateTileAt: (layerIndex: number, tx: number, ty: number, cell: import('@/core/tilemap').TileCell) => void
  clearTileAt: (layerIndex: number, tx: number, ty: number) => void
  isTileMapLayer: (layerIndex: number) => boolean

  // Clipping Masks
  toggleClipping: (index: number) => void
  setClipping: (index: number, clipped: boolean) => void

  // Layer Effects
  addLayerEffect: (layerIndex: number, effectType: import('./layerEffects').EffectType) => void
  removeLayerEffect: (layerIndex: number, effectId: string) => void
  updateLayerEffect: (layerIndex: number, effectId: string, updates: Partial<import('./layerEffects').AnyLayerEffect>) => void
  toggleLayerEffect: (layerIndex: number, effectId: string) => void
  reorderLayerEffects: (layerIndex: number, fromIndex: number, toIndex: number) => void

  // Frames
  addFrame: () => void
  duplicateFrame: (index: number) => void
  duplicateFrameLinked: (index: number) => void
  deleteFrame: (index: number) => void
  setCurrentFrame: (index: number) => void
  setFps: (fps: number) => void
  setFrameDuration: (index: number, duration: number) => void
  togglePlay: () => void
  nextFrame: () => void
  prevFrame: () => void

  // Cel Linking
  linkCel: (frameIndex: number, layerIndex: number, sourceFrameIndex: number) => void
  unlinkCel: (frameIndex: number, layerIndex: number) => void
  isLinkedCel: (frameIndex: number, layerIndex: number) => boolean
  getLinkedCelData: (frameIndex: number, layerIndex: number) => ImageData | null
  updateLinkedCels: (sourceLayerId: string, newData: ImageData) => void

  // Animation Tags
  addTag: (name: string, fromFrame: number, toFrame: number, color?: string) => void
  updateTag: (id: string, updates: Partial<AnimationTag>) => void
  removeTag: (id: string) => void
  clearTags: () => void
  getTagForFrame: (frameIndex: number) => AnimationTag | null
  playTag: (tagId: string) => void

  // Selection
  setSelection: (selection: Partial<Selection>) => void
  clearSelection: () => void
  selectAll: () => void
  invertSelection: () => void

  // Clipboard
  clipboard: ImageData | null
  clipboardOffset: { x: number; y: number }
  cut: () => void
  copy: () => void
  paste: () => void
  deleteSelection: () => void

  // History
  undo: () => void
  redo: () => void
  updateHistoryState: () => void

  // UI toggles
  toggleGrid: () => void
  setGridType: (type: 'rectangular' | 'isometric') => void
  setIsometricCellSize: (width: number, height: number) => void
  toggleOnionSkin: () => void
  toggleRulers: () => void
  toggleGuides: () => void
  toggleSnapToGrid: () => void
  toggleSnapToGuides: () => void
  toggleTileMode: () => void
  setGridSize: (size: number) => void
  setCanvasSize: (width: number, height: number) => void
  resizeCanvasWithAnchor: (width: number, height: number, anchor: 'top-left' | 'top' | 'top-right' | 'left' | 'center' | 'right' | 'bottom-left' | 'bottom' | 'bottom-right') => void
  cropCanvas: (x: number, y: number, newWidth: number, newHeight: number) => void
  cropToSelection: () => void

  // Image transformations
  flipHorizontal: () => void
  flipVertical: () => void
  rotate90CW: () => void
  rotate90CCW: () => void
  rotate180: () => void
  scaleImage: (newWidth: number, newHeight: number, interpolation?: 'nearest' | 'bilinear') => void

  // View
  mirrorView: boolean
  toggleMirrorView: () => void

  // Guides
  addGuide: (type: 'horizontal' | 'vertical', position: number, color?: string) => void
  removeGuide: (id: string) => void
  updateGuide: (id: string, updates: Partial<Guide>) => void
  clearGuides: () => void
  addCenterGuides: () => void
  addThirdsGuides: () => void

  // Perspective Guides
  addPerspectiveGuide: (type: 'one-point' | 'two-point' | 'three-point') => void
  removePerspectiveGuide: (id: string) => void
  togglePerspectiveGuideVisibility: (id: string) => void
  setActivePerspectiveGuide: (id: string | null) => void
  togglePerspectiveGuides: () => void
  clearPerspectiveGuides: () => void

  // Layer data update
  updateLayers: (layers: Layer[]) => void
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
  type: 'pixel',
})

const createLayerGroup = (id: string, name: string): Layer => ({
  id,
  name,
  visible: true,
  locked: false,
  opacity: 100,
  blendMode: 'normal',
  data: null,
  type: 'group',
  children: [],
  expanded: true,
})

const createTileMapLayer = (
  id: string,
  name: string,
  widthInTiles: number,
  heightInTiles: number,
  tileWidth: number,
  tileHeight: number
): Layer => {
  // Import dynamically to avoid circular dependencies
  const { createTileMapData } = require('@/core/tilemap')
  return {
    id,
    name,
    visible: true,
    locked: false,
    opacity: 100,
    blendMode: 'normal',
    data: null,
    type: 'tilemap',
    tilemapData: createTileMapData(widthInTiles, heightInTiles, tileWidth, tileHeight),
  }
}

const createDefaultSelection = (): Selection => ({
  active: false,
  x: 0,
  y: 0,
  width: 0,
  height: 0,
  mask: null,
})

// Zoom levels matching Pixelorama
const ZOOM_LEVELS = [0.125, 0.25, 0.5, 1, 2, 4, 8, 12, 16, 24, 32, 64]
const DEFAULT_ZOOM = 12
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
    animationTags: [],

    // Selection
    selection: createDefaultSelection(),

    // Clipboard
    clipboard: null,
    clipboardOffset: { x: 0, y: 0 },

    // History
    history: getHistory(),
    canUndo: false,
    canRedo: false,

    // UI
    showGrid: true,
    gridType: 'rectangular' as const,
    isometricCellWidth: 2,
    isometricCellHeight: 1,
    showOnionSkin: false,
    showRulers: true,
    showGuides: true,
    snapToGrid: false,
    snapToGuides: true,
    tileMode: false,
    gridSize: 8,
    guides: [],
    perspectiveGuides: [],
    showPerspectiveGuides: true,
    activePerspectiveGuide: null,
    mirrorView: false,

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

    // Layer Groups
    addLayerGroup: (name) => set((state) => {
      const id = `group-${Date.now()}`
      const groupName = name || `Group ${state.layers.filter(l => l.type === 'group').length + 1}`
      const newGroup = createLayerGroup(id, groupName)
      return {
        layers: [...state.layers, newGroup],
        currentLayerIndex: state.layers.length,
        modified: true,
      }
    }),

    groupLayers: (indices) => set((state) => {
      if (indices.length < 2) return state

      // Sort indices in ascending order
      const sortedIndices = [...indices].sort((a, b) => a - b)

      // Get layers to group
      const layersToGroup = sortedIndices.map(i => state.layers[i]).filter(Boolean)
      if (layersToGroup.length < 2) return state

      // Create new group
      const groupId = `group-${Date.now()}`
      const group = createLayerGroup(groupId, 'Group')
      group.children = layersToGroup.map(l => ({ ...l, parentId: groupId }))

      // Remove grouped layers and add group at the lowest position
      const newLayers = state.layers.filter((_, i) => !sortedIndices.includes(i))
      newLayers.splice(sortedIndices[0], 0, group)

      return {
        layers: newLayers,
        currentLayerIndex: sortedIndices[0],
        modified: true,
      }
    }),

    ungroupLayers: (index) => set((state) => {
      const group = state.layers[index]
      if (!group || group.type !== 'group' || !group.children?.length) return state

      // Extract children and remove parentId
      const children = group.children.map(l => ({ ...l, parentId: undefined }))

      // Replace group with its children
      const newLayers = [...state.layers]
      newLayers.splice(index, 1, ...children)

      return {
        layers: newLayers,
        currentLayerIndex: index,
        modified: true,
      }
    }),

    toggleGroupExpanded: (index) => set((state) => ({
      layers: state.layers.map((l, i) =>
        i === index && l.type === 'group'
          ? { ...l, expanded: !l.expanded }
          : l
      ),
    })),

    moveLayerToGroup: (layerIndex, groupIndex) => set((state) => {
      const layer = state.layers[layerIndex]
      if (!layer) return state

      const newLayers = [...state.layers]

      if (groupIndex === null) {
        // Move out of group to root level
        if (layer.parentId) {
          // Find parent group and remove layer from it
          const parentIdx = newLayers.findIndex(l => l.id === layer.parentId)
          if (parentIdx !== -1 && newLayers[parentIdx].children) {
            const parent = newLayers[parentIdx]
            parent.children = parent.children!.filter(l => l.id !== layer.id)
            // Add layer to root level after the group
            newLayers.splice(parentIdx + 1, 0, { ...layer, parentId: undefined })
          }
        }
      } else {
        // Move into group
        const group = newLayers[groupIndex]
        if (!group || group.type !== 'group') return state

        // Remove layer from current position
        newLayers.splice(layerIndex, 1)

        // Add to group's children
        if (!group.children) group.children = []
        group.children.push({ ...layer, parentId: group.id })
      }

      return {
        layers: newLayers,
        currentLayerIndex: groupIndex ?? layerIndex,
        modified: true,
      }
    }),

    // TileMap Layers
    addTileMapLayer: (name, tileWidth = 16, tileHeight = 16) => set((state) => {
      const id = `tilemap-${Date.now()}`
      const layerName = name || `TileMap ${state.layers.filter(l => l.type === 'tilemap').length + 1}`
      // Calculate grid dimensions based on canvas size
      const widthInTiles = Math.ceil(state.width / tileWidth)
      const heightInTiles = Math.ceil(state.height / tileHeight)
      const newLayer = createTileMapLayer(id, layerName, widthInTiles, heightInTiles, tileWidth, tileHeight)
      return {
        layers: [...state.layers, newLayer],
        currentLayerIndex: state.layers.length,
        modified: true,
      }
    }),

    setTileMapData: (layerIndex, data) => set((state) => {
      const layer = state.layers[layerIndex]
      if (!layer || layer.type !== 'tilemap') return state

      return {
        layers: state.layers.map((l, i) =>
          i === layerIndex ? { ...l, tilemapData: data } : l
        ),
        modified: true,
      }
    }),

    setLayerTileset: (layerIndex, tilesetId) => set((state) => {
      const layer = state.layers[layerIndex]
      if (!layer || layer.type !== 'tilemap') return state

      return {
        layers: state.layers.map((l, i) =>
          i === layerIndex ? { ...l, selectedTilesetId: tilesetId } : l
        ),
        modified: true,
      }
    }),

    updateTileAt: (layerIndex, tx, ty, cell) => set((state) => {
      const layer = state.layers[layerIndex]
      if (!layer || layer.type !== 'tilemap' || !layer.tilemapData) return state

      const { setTileAt } = require('@/core/tilemap')
      const newTilemapData = setTileAt(layer.tilemapData, tx, ty, cell)

      return {
        layers: state.layers.map((l, i) =>
          i === layerIndex ? { ...l, tilemapData: newTilemapData } : l
        ),
        modified: true,
      }
    }),

    clearTileAt: (layerIndex, tx, ty) => set((state) => {
      const layer = state.layers[layerIndex]
      if (!layer || layer.type !== 'tilemap' || !layer.tilemapData) return state

      const { clearTileAt: clearTile } = require('@/core/tilemap')
      const newTilemapData = clearTile(layer.tilemapData, tx, ty)

      return {
        layers: state.layers.map((l, i) =>
          i === layerIndex ? { ...l, tilemapData: newTilemapData } : l
        ),
        modified: true,
      }
    }),

    isTileMapLayer: (layerIndex) => {
      const layer = get().layers[layerIndex]
      return layer?.type === 'tilemap'
    },

    // Clipping Masks
    toggleClipping: (index) => set((state) => {
      // Can't clip the bottom layer (index 0)
      if (index <= 0) return state

      return {
        layers: state.layers.map((l, i) =>
          i === index ? { ...l, clipped: !l.clipped } : l
        ),
        modified: true,
      }
    }),

    setClipping: (index, clipped) => set((state) => {
      // Can't clip the bottom layer (index 0)
      if (index <= 0 && clipped) return state

      return {
        layers: state.layers.map((l, i) =>
          i === index ? { ...l, clipped } : l
        ),
        modified: true,
      }
    }),

    // Layer Effects
    addLayerEffect: (layerIndex, effectType) => {
      const {
        createDropShadow,
        createInnerShadow,
        createOuterGlow,
        createInnerGlow,
        createStroke,
        createColorOverlay,
        createGradientOverlay,
      } = require('./layerEffects')

      let newEffect
      switch (effectType) {
        case 'drop-shadow': newEffect = createDropShadow(); break
        case 'inner-shadow': newEffect = createInnerShadow(); break
        case 'outer-glow': newEffect = createOuterGlow(); break
        case 'inner-glow': newEffect = createInnerGlow(); break
        case 'stroke': newEffect = createStroke(); break
        case 'color-overlay': newEffect = createColorOverlay(); break
        case 'gradient-overlay': newEffect = createGradientOverlay(); break
        default: return
      }

      set((state) => ({
        layers: state.layers.map((l, i) => {
          if (i !== layerIndex) return l
          return {
            ...l,
            effects: [...(l.effects || []), newEffect],
          }
        }),
        modified: true,
      }))
    },

    removeLayerEffect: (layerIndex, effectId) => set((state) => ({
      layers: state.layers.map((l, i) => {
        if (i !== layerIndex) return l
        return {
          ...l,
          effects: (l.effects || []).filter(e => e.id !== effectId),
        }
      }),
      modified: true,
    })),

    updateLayerEffect: (layerIndex, effectId, updates) => set((state) => ({
      layers: state.layers.map((l, i) => {
        if (i !== layerIndex) return l
        return {
          ...l,
          effects: (l.effects || []).map(e =>
            e.id === effectId ? { ...e, ...updates } : e
          ),
        }
      }),
      modified: true,
    })),

    toggleLayerEffect: (layerIndex, effectId) => set((state) => ({
      layers: state.layers.map((l, i) => {
        if (i !== layerIndex) return l
        return {
          ...l,
          effects: (l.effects || []).map(e =>
            e.id === effectId ? { ...e, enabled: !e.enabled } : e
          ),
        }
      }),
      modified: true,
    })),

    reorderLayerEffects: (layerIndex, fromIndex, toIndex) => set((state) => ({
      layers: state.layers.map((l, i) => {
        if (i !== layerIndex || !l.effects) return l
        const effects = [...l.effects]
        const [removed] = effects.splice(fromIndex, 1)
        effects.splice(toIndex, 0, removed)
        return { ...l, effects }
      }),
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

    // Duplicate frame with linked cels (all layers link back to source frame)
    duplicateFrameLinked: (index) => set((state) => {
      const original = state.frames[index]
      if (!original) return state

      const newFrame: Frame = {
        id: `frame-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        duration: original.duration,
        layers: original.layers.map((l) => ({
          ...l,
          id: `layer-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          // Link to original layer - data is null since it references source
          linkedCelId: l.id,
          data: null, // Linked cels don't store their own data
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

    // Cel Linking
    linkCel: (frameIndex, layerIndex, sourceFrameIndex) => set((state) => {
      const frame = state.frames[frameIndex]
      const sourceFrame = state.frames[sourceFrameIndex]
      if (!frame || !sourceFrame) return state

      const sourceLayer = sourceFrame.layers[layerIndex]
      if (!sourceLayer) return state

      return {
        frames: state.frames.map((f, fi) => {
          if (fi !== frameIndex) return f
          return {
            ...f,
            layers: f.layers.map((l, li) => {
              if (li !== layerIndex) return l
              return {
                ...l,
                linkedCelId: sourceLayer.id,
                data: null, // Clear own data, will use linked data
              }
            }),
          }
        }),
        modified: true,
      }
    }),

    unlinkCel: (frameIndex, layerIndex) => set((state) => {
      const frame = state.frames[frameIndex]
      if (!frame) return state

      const layer = frame.layers[layerIndex]
      if (!layer || !layer.linkedCelId) return state

      // Find and copy the source data
      let sourceData: ImageData | null = null
      for (const f of state.frames) {
        for (const l of f.layers) {
          if (l.id === layer.linkedCelId && l.data) {
            // Deep copy the source data
            sourceData = new ImageData(
              new Uint8ClampedArray(l.data.data),
              l.data.width,
              l.data.height
            )
            break
          }
        }
        if (sourceData) break
      }

      return {
        frames: state.frames.map((f, fi) => {
          if (fi !== frameIndex) return f
          return {
            ...f,
            layers: f.layers.map((l, li) => {
              if (li !== layerIndex) return l
              return {
                ...l,
                linkedCelId: undefined,
                data: sourceData,
              }
            }),
          }
        }),
        modified: true,
      }
    }),

    isLinkedCel: (frameIndex, layerIndex) => {
      const state = get()
      const frame = state.frames[frameIndex]
      if (!frame) return false
      const layer = frame.layers[layerIndex]
      return layer?.linkedCelId !== undefined
    },

    getLinkedCelData: (frameIndex, layerIndex) => {
      const state = get()
      const frame = state.frames[frameIndex]
      if (!frame) return null

      const layer = frame.layers[layerIndex]
      if (!layer) return null

      // If not linked, return own data
      if (!layer.linkedCelId) return layer.data

      // Find the source layer's data
      for (const f of state.frames) {
        for (const l of f.layers) {
          if (l.id === layer.linkedCelId) {
            return l.data
          }
        }
      }
      return null
    },

    updateLinkedCels: (sourceLayerId, newData) => set((state) => {
      // Update all cels that link to this source
      return {
        frames: state.frames.map((f) => ({
          ...f,
          layers: f.layers.map((l) => {
            // Update the source layer itself
            if (l.id === sourceLayerId) {
              return { ...l, data: newData }
            }
            return l
          }),
        })),
        modified: true,
      }
    }),

    // Animation Tags
    addTag: (name, fromFrame, toFrame, color = '#3b82f6') => set((state) => ({
      animationTags: [
        ...state.animationTags,
        {
          id: `tag-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          name,
          color,
          fromFrame: Math.max(0, fromFrame),
          toFrame: Math.min(state.frames.length - 1, toFrame),
        },
      ],
    })),

    updateTag: (id, updates) => set((state) => ({
      animationTags: state.animationTags.map((tag) =>
        tag.id === id ? { ...tag, ...updates } : tag
      ),
    })),

    removeTag: (id) => set((state) => ({
      animationTags: state.animationTags.filter((tag) => tag.id !== id),
    })),

    clearTags: () => set({ animationTags: [] }),

    getTagForFrame: (frameIndex) => {
      const state = get()
      return state.animationTags.find(
        (tag) => frameIndex >= tag.fromFrame && frameIndex <= tag.toFrame
      ) || null
    },

    playTag: (tagId) => set((state) => {
      const tag = state.animationTags.find((t) => t.id === tagId)
      if (tag) {
        return {
          currentFrameIndex: tag.fromFrame,
          isPlaying: true,
        }
      }
      return {}
    }),

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
      const { selection, width, height } = state

      // If no selection, select all
      if (!selection.active) {
        return {
          selection: {
            active: true,
            x: 0,
            y: 0,
            width,
            height,
            mask: null,
          },
        }
      }

      // If selection covers the whole canvas, clear selection
      if (selection.x === 0 && selection.y === 0 &&
          selection.width === width && selection.height === height && !selection.mask) {
        return {
          selection: {
            active: false,
            x: 0,
            y: 0,
            width: 0,
            height: 0,
            mask: null,
          },
        }
      }

      // Create inverted mask
      const maskData = new ImageData(width, height)
      const mask = maskData.data

      if (selection.mask) {
        // Invert existing mask
        const srcMask = selection.mask.data
        for (let i = 0; i < mask.length; i += 4) {
          const srcAlpha = srcMask[i + 3]
          mask[i] = 255
          mask[i + 1] = 255
          mask[i + 2] = 255
          mask[i + 3] = srcAlpha > 0 ? 0 : 255
        }
      } else {
        // Invert rectangular selection
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4
            const inSelection = x >= selection.x && x < selection.x + selection.width &&
                                y >= selection.y && y < selection.y + selection.height
            mask[idx] = 255
            mask[idx + 1] = 255
            mask[idx + 2] = 255
            mask[idx + 3] = inSelection ? 0 : 255
          }
        }
      }

      return {
        selection: {
          active: true,
          x: 0,
          y: 0,
          width,
          height,
          mask: maskData,
        },
      }
    }),

    // Clipboard operations
    copy: () => {
      const state = get()
      const { selection, layers, currentLayerIndex, width, height } = state

      if (!selection.active) return

      const layer = layers[currentLayerIndex]
      if (!layer?.data) return

      // Extract selected region
      const { x, y, width: selW, height: selH } = selection
      const clipboardData = new ImageData(selW, selH)

      for (let sy = 0; sy < selH; sy++) {
        for (let sx = 0; sx < selW; sx++) {
          const srcX = x + sx
          const srcY = y + sy
          if (srcX >= 0 && srcX < width && srcY >= 0 && srcY < height) {
            const srcIdx = (srcY * width + srcX) * 4
            const dstIdx = (sy * selW + sx) * 4
            clipboardData.data[dstIdx] = layer.data.data[srcIdx]
            clipboardData.data[dstIdx + 1] = layer.data.data[srcIdx + 1]
            clipboardData.data[dstIdx + 2] = layer.data.data[srcIdx + 2]
            clipboardData.data[dstIdx + 3] = layer.data.data[srcIdx + 3]
          }
        }
      }

      set({
        clipboard: clipboardData,
        clipboardOffset: { x, y },
      })
    },

    cut: () => {
      const state = get()
      // First copy
      get().copy()
      // Then delete the selection
      get().deleteSelection()
    },

    paste: () => {
      const state = get()
      const { clipboard, clipboardOffset, layers, currentLayerIndex, width, height, frames, currentFrameIndex } = state

      if (!clipboard) return

      const layer = layers[currentLayerIndex]
      if (!layer?.data) return

      // Create new image data with pasted content
      const newData = new ImageData(
        new Uint8ClampedArray(layer.data.data),
        width,
        height
      )

      // Paste at clipboard offset (or center if it would be off-canvas)
      let pasteX = clipboardOffset.x
      let pasteY = clipboardOffset.y

      // Offset slightly for subsequent pastes
      pasteX = Math.min(pasteX, width - clipboard.width)
      pasteY = Math.min(pasteY, height - clipboard.height)
      pasteX = Math.max(0, pasteX)
      pasteY = Math.max(0, pasteY)

      for (let y = 0; y < clipboard.height; y++) {
        for (let x = 0; x < clipboard.width; x++) {
          const dstX = pasteX + x
          const dstY = pasteY + y
          if (dstX >= 0 && dstX < width && dstY >= 0 && dstY < height) {
            const srcIdx = (y * clipboard.width + x) * 4
            const dstIdx = (dstY * width + dstX) * 4

            // Alpha blending
            const srcAlpha = clipboard.data[srcIdx + 3] / 255
            if (srcAlpha > 0) {
              newData.data[dstIdx] = clipboard.data[srcIdx]
              newData.data[dstIdx + 1] = clipboard.data[srcIdx + 1]
              newData.data[dstIdx + 2] = clipboard.data[srcIdx + 2]
              newData.data[dstIdx + 3] = clipboard.data[srcIdx + 3]
            }
          }
        }
      }

      // Update layer
      const newLayers = [...layers]
      newLayers[currentLayerIndex] = { ...layer, data: newData }

      const newFrames = [...frames]
      newFrames[currentFrameIndex] = {
        ...newFrames[currentFrameIndex],
        layers: newLayers,
      }

      // Create selection for pasted content
      set({
        frames: newFrames,
        selection: {
          active: true,
          x: pasteX,
          y: pasteY,
          width: clipboard.width,
          height: clipboard.height,
          mask: null,
        },
        modified: true,
      })
    },

    deleteSelection: () => {
      const state = get()
      const { selection, layers, currentLayerIndex, width, height, frames, currentFrameIndex } = state

      if (!selection.active) return

      const layer = layers[currentLayerIndex]
      if (!layer?.data) return

      // Clear selected region
      const newData = new ImageData(
        new Uint8ClampedArray(layer.data.data),
        width,
        height
      )

      const { x, y, width: selW, height: selH } = selection

      for (let sy = 0; sy < selH; sy++) {
        for (let sx = 0; sx < selW; sx++) {
          const dstX = x + sx
          const dstY = y + sy
          if (dstX >= 0 && dstX < width && dstY >= 0 && dstY < height) {
            const idx = (dstY * width + dstX) * 4
            newData.data[idx] = 0
            newData.data[idx + 1] = 0
            newData.data[idx + 2] = 0
            newData.data[idx + 3] = 0
          }
        }
      }

      // Update layer
      const newLayers = [...layers]
      newLayers[currentLayerIndex] = { ...layer, data: newData }

      const newFrames = [...frames]
      newFrames[currentFrameIndex] = {
        ...newFrames[currentFrameIndex],
        layers: newLayers,
      }

      set({
        frames: newFrames,
        selection: createDefaultSelection(),
        modified: true,
      })
    },

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
    setGridType: (type) => set({ gridType: type }),
    setIsometricCellSize: (width, height) => set({
      isometricCellWidth: Math.max(1, Math.min(32, width)),
      isometricCellHeight: Math.max(1, Math.min(32, height)),
    }),
    toggleOnionSkin: () => set((state) => ({ showOnionSkin: !state.showOnionSkin })),
    toggleRulers: () => set((state) => ({ showRulers: !state.showRulers })),
    toggleGuides: () => set((state) => ({ showGuides: !state.showGuides })),
    toggleSnapToGrid: () => set((state) => ({ snapToGrid: !state.snapToGrid })),
    toggleSnapToGuides: () => set((state) => ({ snapToGuides: !state.snapToGuides })),
    toggleTileMode: () => set((state) => ({ tileMode: !state.tileMode })),
    setGridSize: (size) => set({ gridSize: Math.max(1, Math.min(64, size)) }),
    setCanvasSize: (width, height) => set({ width, height, modified: true }),

    // Resize canvas with anchor positioning
    resizeCanvasWithAnchor: (newWidth, newHeight, anchor) => {
      const state = get()
      const { width: oldWidth, height: oldHeight, frames } = state

      if (newWidth <= 0 || newHeight <= 0) return
      if (newWidth === oldWidth && newHeight === oldHeight) return

      // Calculate offset based on anchor
      let offsetX = 0
      let offsetY = 0

      switch (anchor) {
        case 'top-left':
          offsetX = 0
          offsetY = 0
          break
        case 'top':
          offsetX = Math.floor((newWidth - oldWidth) / 2)
          offsetY = 0
          break
        case 'top-right':
          offsetX = newWidth - oldWidth
          offsetY = 0
          break
        case 'left':
          offsetX = 0
          offsetY = Math.floor((newHeight - oldHeight) / 2)
          break
        case 'center':
          offsetX = Math.floor((newWidth - oldWidth) / 2)
          offsetY = Math.floor((newHeight - oldHeight) / 2)
          break
        case 'right':
          offsetX = newWidth - oldWidth
          offsetY = Math.floor((newHeight - oldHeight) / 2)
          break
        case 'bottom-left':
          offsetX = 0
          offsetY = newHeight - oldHeight
          break
        case 'bottom':
          offsetX = Math.floor((newWidth - oldWidth) / 2)
          offsetY = newHeight - oldHeight
          break
        case 'bottom-right':
          offsetX = newWidth - oldWidth
          offsetY = newHeight - oldHeight
          break
      }

      // Process each frame's layers
      const newFrames = frames.map(frame => ({
        ...frame,
        layers: frame.layers.map(layer => {
          if (!layer.imageData || layer.type === 'group') return layer

          // Create new canvas with the new dimensions
          const newCanvas = document.createElement('canvas')
          newCanvas.width = newWidth
          newCanvas.height = newHeight
          const ctx = newCanvas.getContext('2d')!

          // Load the existing layer image and draw it at the offset position
          const img = new Image()
          img.src = layer.imageData

          // We need to handle this synchronously, so we use a temporary approach
          // Create a temporary canvas to hold the old data
          const tempCanvas = document.createElement('canvas')
          tempCanvas.width = oldWidth
          tempCanvas.height = oldHeight
          const tempCtx = tempCanvas.getContext('2d')!

          // Since we can't load the image synchronously, we'll use base64 decode
          // For now, preserve the imageData and let the render system handle it
          // This is a simplified approach - full implementation would be async

          return {
            ...layer,
            // Mark for re-render with offset
            _resizeOffset: { x: offsetX, y: offsetY },
          }
        }),
      }))

      set({
        width: newWidth,
        height: newHeight,
        frames: newFrames,
        modified: true,
      })
    },

    // Crop canvas to a specific region
    cropCanvas: (x, y, newWidth, newHeight) => {
      const state = get()
      if (newWidth <= 0 || newHeight <= 0) return

      // Clamp crop region
      const cropX = Math.max(0, Math.min(state.width - 1, x))
      const cropY = Math.max(0, Math.min(state.height - 1, y))
      const cropW = Math.min(newWidth, state.width - cropX)
      const cropH = Math.min(newHeight, state.height - cropY)

      // Crop each layer in each frame
      const newFrames = state.frames.map(frame => ({
        ...frame,
        layers: frame.layers.map(layer => {
          if (!layer.imageData) return layer

          // Create a canvas to extract the cropped region
          const img = new Image()
          const canvas = document.createElement('canvas')
          canvas.width = cropW
          canvas.height = cropH
          const ctx = canvas.getContext('2d')

          if (ctx) {
            const tempImg = new Image()
            tempImg.src = layer.imageData
            // Note: This is async, but we need a synchronous approach
            // For now, we'll update the dimensions and let the canvas system handle it
          }

          return layer
        }),
      }))

      set({
        width: cropW,
        height: cropH,
        frames: newFrames,
        modified: true,
      })
    },

    // Crop to current selection
    cropToSelection: () => {
      const state = get()
      if (!state.selection.active) return

      const { x, y, width: selWidth, height: selHeight } = state.selection

      // Use cropCanvas with selection bounds
      get().cropCanvas(x, y, selWidth, selHeight)

      // Clear selection after cropping
      set({
        selection: {
          active: false,
          x: 0,
          y: 0,
          width: 0,
          height: 0,
          mask: null,
        },
      })
    },

    // Image transformations
    flipHorizontal: () => {
      const state = get()
      const { width, height, layers, frames, currentFrameIndex } = state

      const newLayers = layers.map(layer => {
        if (!layer.data) return layer

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')!

        // Put original data
        ctx.putImageData(layer.data, 0, 0)

        // Flip horizontally
        const flippedCanvas = document.createElement('canvas')
        flippedCanvas.width = width
        flippedCanvas.height = height
        const flippedCtx = flippedCanvas.getContext('2d')!
        flippedCtx.translate(width, 0)
        flippedCtx.scale(-1, 1)
        flippedCtx.drawImage(canvas, 0, 0)

        return {
          ...layer,
          data: flippedCtx.getImageData(0, 0, width, height),
        }
      })

      const newFrames = [...frames]
      newFrames[currentFrameIndex] = {
        ...newFrames[currentFrameIndex],
        layers: newLayers,
      }

      set({ frames: newFrames, modified: true })
    },

    flipVertical: () => {
      const state = get()
      const { width, height, layers, frames, currentFrameIndex } = state

      const newLayers = layers.map(layer => {
        if (!layer.data) return layer

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')!
        ctx.putImageData(layer.data, 0, 0)

        const flippedCanvas = document.createElement('canvas')
        flippedCanvas.width = width
        flippedCanvas.height = height
        const flippedCtx = flippedCanvas.getContext('2d')!
        flippedCtx.translate(0, height)
        flippedCtx.scale(1, -1)
        flippedCtx.drawImage(canvas, 0, 0)

        return {
          ...layer,
          data: flippedCtx.getImageData(0, 0, width, height),
        }
      })

      const newFrames = [...frames]
      newFrames[currentFrameIndex] = {
        ...newFrames[currentFrameIndex],
        layers: newLayers,
      }

      set({ frames: newFrames, modified: true })
    },

    rotate90CW: () => {
      const state = get()
      const { width, height, layers, frames, currentFrameIndex } = state

      const newLayers = layers.map(layer => {
        if (!layer.data) return layer

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')!
        ctx.putImageData(layer.data, 0, 0)

        // Rotated canvas has swapped dimensions
        const rotatedCanvas = document.createElement('canvas')
        rotatedCanvas.width = height
        rotatedCanvas.height = width
        const rotatedCtx = rotatedCanvas.getContext('2d')!
        rotatedCtx.translate(height, 0)
        rotatedCtx.rotate(Math.PI / 2)
        rotatedCtx.drawImage(canvas, 0, 0)

        return {
          ...layer,
          data: rotatedCtx.getImageData(0, 0, height, width),
        }
      })

      const newFrames = [...frames]
      newFrames[currentFrameIndex] = {
        ...newFrames[currentFrameIndex],
        layers: newLayers,
      }

      // Swap dimensions
      set({ width: height, height: width, frames: newFrames, modified: true })
    },

    rotate90CCW: () => {
      const state = get()
      const { width, height, layers, frames, currentFrameIndex } = state

      const newLayers = layers.map(layer => {
        if (!layer.data) return layer

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')!
        ctx.putImageData(layer.data, 0, 0)

        const rotatedCanvas = document.createElement('canvas')
        rotatedCanvas.width = height
        rotatedCanvas.height = width
        const rotatedCtx = rotatedCanvas.getContext('2d')!
        rotatedCtx.translate(0, width)
        rotatedCtx.rotate(-Math.PI / 2)
        rotatedCtx.drawImage(canvas, 0, 0)

        return {
          ...layer,
          data: rotatedCtx.getImageData(0, 0, height, width),
        }
      })

      const newFrames = [...frames]
      newFrames[currentFrameIndex] = {
        ...newFrames[currentFrameIndex],
        layers: newLayers,
      }

      set({ width: height, height: width, frames: newFrames, modified: true })
    },

    rotate180: () => {
      const state = get()
      const { width, height, layers, frames, currentFrameIndex } = state

      const newLayers = layers.map(layer => {
        if (!layer.data) return layer

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')!
        ctx.putImageData(layer.data, 0, 0)

        const rotatedCanvas = document.createElement('canvas')
        rotatedCanvas.width = width
        rotatedCanvas.height = height
        const rotatedCtx = rotatedCanvas.getContext('2d')!
        rotatedCtx.translate(width, height)
        rotatedCtx.rotate(Math.PI)
        rotatedCtx.drawImage(canvas, 0, 0)

        return {
          ...layer,
          data: rotatedCtx.getImageData(0, 0, width, height),
        }
      })

      const newFrames = [...frames]
      newFrames[currentFrameIndex] = {
        ...newFrames[currentFrameIndex],
        layers: newLayers,
      }

      set({ frames: newFrames, modified: true })
    },

    scaleImage: (newWidth, newHeight, interpolation = 'nearest') => {
      const state = get()
      const { width, height, layers, frames, currentFrameIndex } = state

      if (newWidth <= 0 || newHeight <= 0) return

      const newLayers = layers.map(layer => {
        if (!layer.data) return layer

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')!
        ctx.putImageData(layer.data, 0, 0)

        const scaledCanvas = document.createElement('canvas')
        scaledCanvas.width = newWidth
        scaledCanvas.height = newHeight
        const scaledCtx = scaledCanvas.getContext('2d')!
        scaledCtx.imageSmoothingEnabled = interpolation === 'bilinear'
        scaledCtx.drawImage(canvas, 0, 0, newWidth, newHeight)

        return {
          ...layer,
          data: scaledCtx.getImageData(0, 0, newWidth, newHeight),
        }
      })

      const newFrames = [...frames]
      newFrames[currentFrameIndex] = {
        ...newFrames[currentFrameIndex],
        layers: newLayers,
      }

      set({ width: newWidth, height: newHeight, frames: newFrames, modified: true })
    },

    // Mirror view toggle
    toggleMirrorView: () => set((state) => ({ mirrorView: !state.mirrorView })),

    // Guides
    addGuide: (type, position, color = '#00ffff') => set((state) => ({
      guides: [...state.guides, createGuide(type, position, color)],
    })),

    removeGuide: (id) => set((state) => ({
      guides: state.guides.filter(g => g.id !== id),
    })),

    updateGuide: (id, updates) => set((state) => ({
      guides: state.guides.map(g => g.id === id ? { ...g, ...updates } : g),
    })),

    clearGuides: () => set({ guides: [] }),

    addCenterGuides: () => set((state) => ({
      guides: [
        ...state.guides,
        createGuide('horizontal', Math.floor(state.height / 2), '#00ffff'),
        createGuide('vertical', Math.floor(state.width / 2), '#00ffff'),
      ],
    })),

    addThirdsGuides: () => set((state) => ({
      guides: [
        ...state.guides,
        createGuide('horizontal', Math.floor(state.height / 3), '#00ff00'),
        createGuide('horizontal', Math.floor((state.height * 2) / 3), '#00ff00'),
        createGuide('vertical', Math.floor(state.width / 3), '#00ff00'),
        createGuide('vertical', Math.floor((state.width * 2) / 3), '#00ff00'),
      ],
    })),

    // Perspective Guides
    addPerspectiveGuide: (type) => set((state) => {
      let newGuide: PerspectiveGuide
      switch (type) {
        case 'one-point':
          newGuide = createOnePointPerspective(state.width, state.height)
          break
        case 'two-point':
          newGuide = createTwoPointPerspective(state.width, state.height)
          break
        case 'three-point':
          newGuide = createThreePointPerspective(state.width, state.height)
          break
      }
      return {
        perspectiveGuides: [...state.perspectiveGuides, newGuide],
        activePerspectiveGuide: newGuide.id,
      }
    }),

    removePerspectiveGuide: (id) => set((state) => ({
      perspectiveGuides: state.perspectiveGuides.filter(g => g.id !== id),
      activePerspectiveGuide: state.activePerspectiveGuide === id ? null : state.activePerspectiveGuide,
    })),

    togglePerspectiveGuideVisibility: (id) => set((state) => ({
      perspectiveGuides: state.perspectiveGuides.map(g =>
        g.id === id ? { ...g, visible: !g.visible } : g
      ),
    })),

    setActivePerspectiveGuide: (id) => set(() => ({
      activePerspectiveGuide: id,
    })),

    togglePerspectiveGuides: () => set((state) => ({
      showPerspectiveGuides: !state.showPerspectiveGuides,
    })),

    clearPerspectiveGuides: () => set(() => ({
      perspectiveGuides: [],
      activePerspectiveGuide: null,
    })),

    // Layer data update (for effects dialog)
    updateLayers: (layers) => set((state) => {
      const newFrames = [...state.frames]
      newFrames[state.currentFrameIndex] = {
        ...newFrames[state.currentFrameIndex],
        layers,
      }
      return { frames: newFrames, modified: true }
    }),
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
