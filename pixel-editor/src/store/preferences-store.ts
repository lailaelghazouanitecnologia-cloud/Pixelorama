/**
 * Preferences Store - Persistent user preferences
 * Based on Pixelorama's Global.gd preferences with ConfigFile persistence
 * Uses localStorage for web persistence
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { subscribeWithSelector } from 'zustand/middleware'

// Theme options
export type Theme = 'dark' | 'light' | 'system'
export type ToolButtonSize = 'small' | 'medium' | 'large'
export type CursorShape = 'crosshair' | 'brush' | 'native' | 'none'

export interface PreferencesState {
  // === Appearance ===
  theme: Theme
  fontSize: number
  uiScale: number
  toolButtonSize: ToolButtonSize
  showNotifications: boolean
  dimOnPopup: boolean
  smoothAnimations: boolean

  // === Canvas ===
  defaultWidth: number
  defaultHeight: number
  defaultFillColor: string
  smoothZoom: boolean
  integerZoom: boolean
  showCheckerboard: boolean
  checkerboardSize: number
  checkerboardColor1: string
  checkerboardColor2: string

  // === Tools ===
  shareToolOptions: boolean
  leftToolColor: string
  rightToolColor: string
  cursorShape: CursorShape
  showBrushOutline: boolean

  // === Grid ===
  gridColor: string
  gridOpacity: number
  pixelGridColor: string
  pixelGridThreshold: number  // Zoom level to show pixel grid

  // === Guides ===
  guideColor: string
  guideOpacity: number
  snapToGuides: boolean
  snapDistance: number

  // === Backup & Autosave ===
  autosaveEnabled: boolean
  autosaveInterval: number  // In minutes
  backupOnClose: boolean
  maxBackups: number

  // === Performance ===
  hardwareAcceleration: boolean
  maxUndoSteps: number
  lowMemoryMode: boolean

  // === Keyboard ===
  customShortcuts: Record<string, string>

  // === Actions ===
  // Appearance
  setTheme: (theme: Theme) => void
  setFontSize: (size: number) => void
  setUIScale: (scale: number) => void
  setToolButtonSize: (size: ToolButtonSize) => void
  setShowNotifications: (show: boolean) => void
  setDimOnPopup: (dim: boolean) => void
  setSmoothAnimations: (smooth: boolean) => void

  // Canvas
  setDefaultWidth: (width: number) => void
  setDefaultHeight: (height: number) => void
  setDefaultFillColor: (color: string) => void
  setSmoothZoom: (smooth: boolean) => void
  setIntegerZoom: (integer: boolean) => void
  setShowCheckerboard: (show: boolean) => void
  setCheckerboardSize: (size: number) => void
  setCheckerboardColors: (color1: string, color2: string) => void

  // Tools
  setShareToolOptions: (share: boolean) => void
  setLeftToolColor: (color: string) => void
  setRightToolColor: (color: string) => void
  setCursorShape: (shape: CursorShape) => void
  setShowBrushOutline: (show: boolean) => void

  // Grid
  setGridColor: (color: string) => void
  setGridOpacity: (opacity: number) => void
  setPixelGridColor: (color: string) => void
  setPixelGridThreshold: (threshold: number) => void

  // Guides
  setGuideColor: (color: string) => void
  setGuideOpacity: (opacity: number) => void
  setSnapToGuides: (snap: boolean) => void
  setSnapDistance: (distance: number) => void

  // Backup
  setAutosaveEnabled: (enabled: boolean) => void
  setAutosaveInterval: (interval: number) => void
  setBackupOnClose: (backup: boolean) => void
  setMaxBackups: (max: number) => void

  // Performance
  setHardwareAcceleration: (enabled: boolean) => void
  setMaxUndoSteps: (steps: number) => void
  setLowMemoryMode: (enabled: boolean) => void

  // Keyboard
  setCustomShortcut: (action: string, shortcut: string) => void
  resetShortcut: (action: string) => void
  resetAllShortcuts: () => void

  // Utility
  resetToDefaults: () => void
  exportPreferences: () => string
  importPreferences: (json: string) => boolean
}

// Default preferences
const defaultPreferences = {
  // Appearance
  theme: 'dark' as Theme,
  fontSize: 13,
  uiScale: 1.0,
  toolButtonSize: 'small' as ToolButtonSize,
  showNotifications: true,
  dimOnPopup: true,
  smoothAnimations: true,

  // Canvas
  defaultWidth: 64,
  defaultHeight: 64,
  defaultFillColor: '#00000000',
  smoothZoom: true,
  integerZoom: false,
  showCheckerboard: true,
  checkerboardSize: 8,
  checkerboardColor1: '#404040',
  checkerboardColor2: '#303030',

  // Tools
  shareToolOptions: false,
  leftToolColor: '#0086cf',
  rightToolColor: '#fd6d14',
  cursorShape: 'crosshair' as CursorShape,
  showBrushOutline: true,

  // Grid
  gridColor: '#ffffff',
  gridOpacity: 20,
  pixelGridColor: '#808080',
  pixelGridThreshold: 16,

  // Guides
  guideColor: '#00ff00',
  guideOpacity: 80,
  snapToGuides: true,
  snapDistance: 4,

  // Backup
  autosaveEnabled: false,
  autosaveInterval: 5,
  backupOnClose: true,
  maxBackups: 5,

  // Performance
  hardwareAcceleration: true,
  maxUndoSteps: 50,
  lowMemoryMode: false,

  // Keyboard
  customShortcuts: {} as Record<string, string>,
}

export const usePreferencesStore = create<PreferencesState>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        ...defaultPreferences,

        // === Actions ===

        // Appearance
        setTheme: (theme) => {
          set({ theme })
          // Apply theme to document
          document.documentElement.setAttribute('data-theme', theme)
        },

        setFontSize: (size) => set({
          fontSize: Math.max(10, Math.min(24, size))
        }),

        setUIScale: (scale) => set({
          uiScale: Math.max(0.75, Math.min(2, scale))
        }),

        setToolButtonSize: (size) => set({ toolButtonSize: size }),
        setShowNotifications: (show) => set({ showNotifications: show }),
        setDimOnPopup: (dim) => set({ dimOnPopup: dim }),
        setSmoothAnimations: (smooth) => set({ smoothAnimations: smooth }),

        // Canvas
        setDefaultWidth: (width) => set({
          defaultWidth: Math.max(1, Math.min(4096, width))
        }),

        setDefaultHeight: (height) => set({
          defaultHeight: Math.max(1, Math.min(4096, height))
        }),

        setDefaultFillColor: (color) => set({ defaultFillColor: color }),
        setSmoothZoom: (smooth) => set({ smoothZoom: smooth }),
        setIntegerZoom: (integer) => set({ integerZoom: integer }),
        setShowCheckerboard: (show) => set({ showCheckerboard: show }),

        setCheckerboardSize: (size) => set({
          checkerboardSize: Math.max(2, Math.min(64, size))
        }),

        setCheckerboardColors: (color1, color2) => set({
          checkerboardColor1: color1,
          checkerboardColor2: color2,
        }),

        // Tools
        setShareToolOptions: (share) => set({ shareToolOptions: share }),
        setLeftToolColor: (color) => set({ leftToolColor: color }),
        setRightToolColor: (color) => set({ rightToolColor: color }),
        setCursorShape: (shape) => set({ cursorShape: shape }),
        setShowBrushOutline: (show) => set({ showBrushOutline: show }),

        // Grid
        setGridColor: (color) => set({ gridColor: color }),

        setGridOpacity: (opacity) => set({
          gridOpacity: Math.max(0, Math.min(100, opacity))
        }),

        setPixelGridColor: (color) => set({ pixelGridColor: color }),

        setPixelGridThreshold: (threshold) => set({
          pixelGridThreshold: Math.max(1, Math.min(64, threshold))
        }),

        // Guides
        setGuideColor: (color) => set({ guideColor: color }),

        setGuideOpacity: (opacity) => set({
          guideOpacity: Math.max(0, Math.min(100, opacity))
        }),

        setSnapToGuides: (snap) => set({ snapToGuides: snap }),

        setSnapDistance: (distance) => set({
          snapDistance: Math.max(1, Math.min(32, distance))
        }),

        // Backup
        setAutosaveEnabled: (enabled) => set({ autosaveEnabled: enabled }),

        setAutosaveInterval: (interval) => set({
          autosaveInterval: Math.max(1, Math.min(60, interval))
        }),

        setBackupOnClose: (backup) => set({ backupOnClose: backup }),

        setMaxBackups: (max) => set({
          maxBackups: Math.max(1, Math.min(20, max))
        }),

        // Performance
        setHardwareAcceleration: (enabled) => set({ hardwareAcceleration: enabled }),

        setMaxUndoSteps: (steps) => set({
          maxUndoSteps: Math.max(10, Math.min(200, steps))
        }),

        setLowMemoryMode: (enabled) => set({ lowMemoryMode: enabled }),

        // Keyboard
        setCustomShortcut: (action, shortcut) => set((state) => ({
          customShortcuts: { ...state.customShortcuts, [action]: shortcut }
        })),

        resetShortcut: (action) => set((state) => {
          const newShortcuts = { ...state.customShortcuts }
          delete newShortcuts[action]
          return { customShortcuts: newShortcuts }
        }),

        resetAllShortcuts: () => set({ customShortcuts: {} }),

        // Utility
        resetToDefaults: () => set(defaultPreferences),

        exportPreferences: () => {
          const state = get()
          // Get only preference values, not functions
          const prefs = Object.entries(state)
            .filter(([_, value]) => typeof value !== 'function')
            .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {})
          return JSON.stringify(prefs, null, 2)
        },

        importPreferences: (json: string) => {
          try {
            const prefs = JSON.parse(json)
            // Validate and merge with defaults
            const validPrefs = Object.keys(defaultPreferences)
              .filter((key) => key in prefs)
              .reduce((acc, key) => ({
                ...acc,
                [key]: prefs[key]
              }), {})
            set(validPrefs)
            return true
          } catch {
            return false
          }
        },
      }),
      {
        name: 'pixelorama-preferences',
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => {
          // Only persist actual preference values, not functions
          return Object.entries(state)
            .filter(([_, value]) => typeof value !== 'function')
            .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {})
        },
      }
    )
  )
)

// Apply theme on load
const applyInitialTheme = () => {
  const theme = usePreferencesStore.getState().theme
  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light')
  } else {
    document.documentElement.setAttribute('data-theme', theme)
  }
}

// Apply on module load
if (typeof window !== 'undefined') {
  applyInitialTheme()
}

// Listen for system theme changes
if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    const theme = usePreferencesStore.getState().theme
    if (theme === 'system') {
      document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light')
    }
  })
}
