/**
 * TileMap Store - State management for tilemap editing
 * Manages tilesets, current tile selection, and tilemap editing modes
 */

import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type {
  Tileset,
  TileMapData,
  TileCell,
  AutoTileConfig,
} from '@/core/tilemap'
import {
  createTileset,
  createTileMapData,
  createEmptyTileCell,
  setTileAt,
  clearTileAt,
  fillTileRect,
  floodFillTiles,
  extractTile,
  getTileCount,
} from '@/core/tilemap'

// ============================================================================
// Types
// ============================================================================

export type TileEditMode = 'place' | 'erase' | 'fill' | 'rect' | 'picker'

export interface TileSelection {
  tilesetId: string
  startIndex: number
  endIndex: number  // For multi-tile selection
  width: number     // Selection width in tiles
  height: number    // Selection height in tiles
}

export interface TileMapState {
  // Tilesets
  tilesets: Map<string, Tileset>
  currentTilesetId: string | null

  // Tile selection
  selectedTiles: TileSelection | null
  currentTileCell: TileCell

  // Edit mode
  editMode: TileEditMode
  showGrid: boolean
  snapToGrid: boolean

  // Auto-tiling
  autoTileEnabled: boolean
  autoTileConfigs: Map<string, AutoTileConfig>

  // Flip/rotate for placement
  flipH: boolean
  flipV: boolean
  rotate90: boolean

  // Actions
  addTileset: (id: string, name: string, image: ImageData, tileWidth: number, tileHeight: number, spacing?: number, margin?: number) => void
  removeTileset: (id: string) => void
  selectTileset: (id: string | null) => void
  getTileset: (id: string) => Tileset | undefined

  selectTile: (tilesetId: string, index: number) => void
  selectTileRange: (tilesetId: string, startIndex: number, endIndex: number) => void
  clearTileSelection: () => void

  setEditMode: (mode: TileEditMode) => void
  setShowGrid: (show: boolean) => void
  setSnapToGrid: (snap: boolean) => void

  setFlipH: (flip: boolean) => void
  setFlipV: (flip: boolean) => void
  setRotate90: (rotate: boolean) => void
  toggleFlipH: () => void
  toggleFlipV: () => void
  toggleRotate90: () => void

  setAutoTileEnabled: (enabled: boolean) => void
  setAutoTileConfig: (tilesetId: string, config: AutoTileConfig) => void

  // Helpers
  getCurrentTileCell: () => TileCell
  getTilePreview: (tilesetId: string, index: number) => ImageData | null
}

// ============================================================================
// Store
// ============================================================================

export const useTileMapStore = create<TileMapState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    tilesets: new Map(),
    currentTilesetId: null,

    selectedTiles: null,
    currentTileCell: createEmptyTileCell(),

    editMode: 'place',
    showGrid: true,
    snapToGrid: true,

    autoTileEnabled: false,
    autoTileConfigs: new Map(),

    flipH: false,
    flipV: false,
    rotate90: false,

    // === Tileset Actions ===

    addTileset: (id, name, image, tileWidth, tileHeight, spacing = 0, margin = 0) => {
      const tileset = createTileset(id, name, image, tileWidth, tileHeight, spacing, margin)

      set((state) => {
        const newTilesets = new Map(state.tilesets)
        newTilesets.set(id, tileset)

        return {
          tilesets: newTilesets,
          currentTilesetId: state.currentTilesetId || id,
        }
      })
    },

    removeTileset: (id) => {
      set((state) => {
        const newTilesets = new Map(state.tilesets)
        newTilesets.delete(id)

        let newCurrentId = state.currentTilesetId
        if (newCurrentId === id) {
          const keys = Array.from(newTilesets.keys())
          newCurrentId = keys.length > 0 ? keys[0] : null
        }

        return {
          tilesets: newTilesets,
          currentTilesetId: newCurrentId,
          selectedTiles: state.selectedTiles?.tilesetId === id ? null : state.selectedTiles,
        }
      })
    },

    selectTileset: (id) => {
      set({ currentTilesetId: id })
    },

    getTileset: (id) => {
      return get().tilesets.get(id)
    },

    // === Tile Selection Actions ===

    selectTile: (tilesetId, index) => {
      const tileset = get().tilesets.get(tilesetId)
      if (!tileset || index < 0 || index >= getTileCount(tileset)) return

      set({
        selectedTiles: {
          tilesetId,
          startIndex: index,
          endIndex: index,
          width: 1,
          height: 1,
        },
        currentTileCell: {
          tilesetId,
          tileIndex: index,
          flipH: get().flipH,
          flipV: get().flipV,
          rotate90: get().rotate90,
        },
        currentTilesetId: tilesetId,
      })
    },

    selectTileRange: (tilesetId, startIndex, endIndex) => {
      const tileset = get().tilesets.get(tilesetId)
      if (!tileset) return

      const maxIndex = getTileCount(tileset) - 1
      const safeStart = Math.max(0, Math.min(startIndex, maxIndex))
      const safeEnd = Math.max(0, Math.min(endIndex, maxIndex))

      const startX = safeStart % tileset.columns
      const startY = Math.floor(safeStart / tileset.columns)
      const endX = safeEnd % tileset.columns
      const endY = Math.floor(safeEnd / tileset.columns)

      const width = Math.abs(endX - startX) + 1
      const height = Math.abs(endY - startY) + 1

      set({
        selectedTiles: {
          tilesetId,
          startIndex: safeStart,
          endIndex: safeEnd,
          width,
          height,
        },
        currentTilesetId: tilesetId,
      })
    },

    clearTileSelection: () => {
      set({
        selectedTiles: null,
        currentTileCell: createEmptyTileCell(),
      })
    },

    // === Edit Mode Actions ===

    setEditMode: (mode) => set({ editMode: mode }),
    setShowGrid: (show) => set({ showGrid: show }),
    setSnapToGrid: (snap) => set({ snapToGrid: snap }),

    // === Transform Actions ===

    setFlipH: (flip) => {
      set((state) => ({
        flipH: flip,
        currentTileCell: {
          ...state.currentTileCell,
          flipH: flip,
        },
      }))
    },

    setFlipV: (flip) => {
      set((state) => ({
        flipV: flip,
        currentTileCell: {
          ...state.currentTileCell,
          flipV: flip,
        },
      }))
    },

    setRotate90: (rotate) => {
      set((state) => ({
        rotate90: rotate,
        currentTileCell: {
          ...state.currentTileCell,
          rotate90: rotate,
        },
      }))
    },

    toggleFlipH: () => {
      const current = get().flipH
      get().setFlipH(!current)
    },

    toggleFlipV: () => {
      const current = get().flipV
      get().setFlipV(!current)
    },

    toggleRotate90: () => {
      const current = get().rotate90
      get().setRotate90(!current)
    },

    // === Auto-Tile Actions ===

    setAutoTileEnabled: (enabled) => set({ autoTileEnabled: enabled }),

    setAutoTileConfig: (tilesetId, config) => {
      set((state) => {
        const newConfigs = new Map(state.autoTileConfigs)
        newConfigs.set(tilesetId, config)
        return { autoTileConfigs: newConfigs }
      })
    },

    // === Helpers ===

    getCurrentTileCell: () => {
      return get().currentTileCell
    },

    getTilePreview: (tilesetId, index) => {
      const tileset = get().tilesets.get(tilesetId)
      if (!tileset || index < 0 || index >= getTileCount(tileset)) {
        return null
      }
      return extractTile(tileset, index)
    },
  }))
)

// ============================================================================
// TileMap Editing Actions (work with editor-store)
// ============================================================================

export interface TileMapEditActions {
  placeTile: (mapData: TileMapData, tx: number, ty: number, cell: TileCell) => TileMapData
  eraseTile: (mapData: TileMapData, tx: number, ty: number) => TileMapData
  fillTiles: (mapData: TileMapData, startX: number, startY: number, cell: TileCell) => TileMapData
  rectFill: (mapData: TileMapData, x1: number, y1: number, x2: number, y2: number, cell: TileCell) => TileMapData
}

export const tileMapEditActions: TileMapEditActions = {
  placeTile: setTileAt,
  eraseTile: clearTileAt,
  fillTiles: floodFillTiles,
  rectFill: fillTileRect,
}

// ============================================================================
// Keyboard Shortcuts for TileMap editing
// ============================================================================

export const TILEMAP_SHORTCUTS: Record<string, () => void> = {
  'x': () => useTileMapStore.getState().toggleFlipH(),
  'y': () => useTileMapStore.getState().toggleFlipV(),
  'r': () => useTileMapStore.getState().toggleRotate90(),
  'g': () => {
    const state = useTileMapStore.getState()
    state.setShowGrid(!state.showGrid)
  },
  'p': () => useTileMapStore.getState().setEditMode('place'),
  'e': () => useTileMapStore.getState().setEditMode('erase'),
  'f': () => useTileMapStore.getState().setEditMode('fill'),
  'u': () => useTileMapStore.getState().setEditMode('rect'),
}

// ============================================================================
// Events
// ============================================================================

export const tileMapEvents = {
  listeners: new Set<(event: string, data: unknown) => void>(),

  subscribe(callback: (event: string, data: unknown) => void) {
    this.listeners.add(callback)
    return () => this.listeners.delete(callback)
  },

  emit(event: string, data: unknown) {
    this.listeners.forEach(cb => cb(event, data))
  },
}

// Subscribe to store changes
useTileMapStore.subscribe(
  (state) => state.selectedTiles,
  (selected) => {
    tileMapEvents.emit('tileSelected', selected)
  }
)

useTileMapStore.subscribe(
  (state) => state.editMode,
  (mode) => {
    tileMapEvents.emit('editModeChanged', mode)
  }
)
