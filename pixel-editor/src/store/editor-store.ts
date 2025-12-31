import { create } from 'zustand'

export type Tool =
  | 'pencil' | 'eraser' | 'bucket' | 'picker'
  | 'line' | 'rect' | 'ellipse' | 'select' | 'move' | 'zoom'

export interface Layer {
  id: string
  name: string
  visible: boolean
  locked: boolean
  opacity: number
  data: ImageData | null
}

export interface Frame {
  id: string
  layers: Layer[]
  duration: number
}

export interface EditorState {
  // Canvas
  width: number
  height: number
  zoom: number
  panX: number
  panY: number

  // Tools
  currentTool: Tool
  brushSize: number
  brushOpacity: number

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

  // History
  canUndo: boolean
  canRedo: boolean

  // UI
  showGrid: boolean
  showOnionSkin: boolean

  // Actions
  setTool: (tool: Tool) => void
  setBrushSize: (size: number) => void
  setPrimaryColor: (color: string) => void
  setSecondaryColor: (color: string) => void
  swapColors: () => void
  setZoom: (zoom: number) => void
  setCurrentLayer: (index: number) => void
  addLayer: () => void
  deleteLayer: (index: number) => void
  toggleLayerVisibility: (index: number) => void
  toggleLayerLock: (index: number) => void
  setLayerOpacity: (index: number, opacity: number) => void
  renameLayer: (index: number, name: string) => void
  moveLayer: (from: number, to: number) => void
  addFrame: () => void
  deleteFrame: (index: number) => void
  setCurrentFrame: (index: number) => void
  setFps: (fps: number) => void
  togglePlay: () => void
  toggleGrid: () => void
  toggleOnionSkin: () => void
  setCanvasSize: (width: number, height: number) => void
}

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
  data: null,
})

export const useEditorStore = create<EditorState>((set, get) => ({
  // Canvas
  width: 64,
  height: 64,
  zoom: 8,
  panX: 0,
  panY: 0,

  // Tools
  currentTool: 'pencil',
  brushSize: 1,
  brushOpacity: 100,

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

  // History
  canUndo: false,
  canRedo: false,

  // UI
  showGrid: true,
  showOnionSkin: false,

  // Actions
  setTool: (tool) => set({ currentTool: tool }),
  setBrushSize: (size) => set({ brushSize: size }),
  setPrimaryColor: (color) => set({ primaryColor: color }),
  setSecondaryColor: (color) => set({ secondaryColor: color }),
  swapColors: () => set((state) => ({
    primaryColor: state.secondaryColor,
    secondaryColor: state.primaryColor,
  })),
  setZoom: (zoom) => set({ zoom: Math.max(1, Math.min(32, zoom)) }),

  setCurrentLayer: (index) => set({ currentLayerIndex: index }),
  addLayer: () => set((state) => {
    const id = `layer-${Date.now()}`
    const name = `Layer ${state.layers.length + 1}`
    return {
      layers: [...state.layers, createDefaultLayer(id, name)],
      currentLayerIndex: state.layers.length,
    }
  }),
  deleteLayer: (index) => set((state) => {
    if (state.layers.length <= 1) return state
    const newLayers = state.layers.filter((_, i) => i !== index)
    return {
      layers: newLayers,
      currentLayerIndex: Math.min(state.currentLayerIndex, newLayers.length - 1),
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
      i === index ? { ...l, opacity } : l
    ),
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
    return { layers: newLayers }
  }),

  addFrame: () => set((state) => ({
    frames: [...state.frames, {
      id: `frame-${Date.now()}`,
      layers: state.layers.map(l => ({ ...l })),
      duration: 1000 / state.fps,
    }],
  })),
  deleteFrame: (index) => set((state) => ({
    frames: state.frames.filter((_, i) => i !== index),
    currentFrameIndex: Math.min(state.currentFrameIndex, state.frames.length - 2),
  })),
  setCurrentFrame: (index) => set({ currentFrameIndex: index }),
  setFps: (fps) => set({ fps }),
  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),

  toggleGrid: () => set((state) => ({ showGrid: !state.showGrid })),
  toggleOnionSkin: () => set((state) => ({ showOnionSkin: !state.showOnionSkin })),
  setCanvasSize: (width, height) => set({ width, height }),
}))
