/**
 * UI Store - UI state management
 * Based on Pixelorama's Global.gd UI references and dialog management
 * Handles dialogs, panels, notifications, and view state
 */

import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'

// Dialog types
export type DialogType =
  | 'newProject'
  | 'openProject'
  | 'saveProject'
  | 'exportImage'
  | 'importImage'
  | 'preferences'
  | 'keyboardShortcuts'
  | 'resizeCanvas'
  | 'scaleImage'
  | 'cropToSelection'
  | 'flipRotate'
  | 'colorAdjustments'
  | 'effects'
  | 'gradient'
  | 'onionSkin'
  | 'gridSettings'
  | 'guidesSettings'
  | 'about'
  | 'startup'
  | 'confirm'
  | 'alert'

// Panel positions
export type PanelPosition = 'left' | 'right' | 'bottom' | 'floating'

// Notification types
export type NotificationType = 'info' | 'success' | 'warning' | 'error'

export interface Notification {
  id: string
  type: NotificationType
  message: string
  duration?: number  // Auto-dismiss after ms, 0 = manual dismiss
  timestamp: number
}

export interface ConfirmDialogOptions {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  destructive?: boolean
  onConfirm?: () => void
  onCancel?: () => void
}

export interface AlertDialogOptions {
  title: string
  message: string
  buttonText?: string
  onClose?: () => void
}

export interface Panel {
  id: string
  name: string
  position: PanelPosition
  visible: boolean
  width?: number
  height?: number
  order: number
}

export interface UIState {
  // === Dialogs ===
  activeDialog: DialogType | null
  dialogStack: DialogType[]
  dialogData: Record<string, unknown>  // Data passed to dialogs
  confirmOptions: ConfirmDialogOptions | null
  alertOptions: AlertDialogOptions | null

  // === Panels ===
  panels: Panel[]
  leftPanelVisible: boolean
  rightPanelVisible: boolean
  bottomPanelVisible: boolean
  leftPanelWidth: number
  rightPanelWidth: number
  bottomPanelHeight: number

  // === View Options ===
  showGrid: boolean
  showPixelGrid: boolean
  showGuides: boolean
  showRulers: boolean
  showMouseGuides: boolean
  showSymmetryGuides: boolean
  showOnionSkin: boolean
  greyscaleView: boolean
  mirrorView: boolean

  // === Canvas Interaction ===
  isDimmed: boolean  // When dialog is open
  canInteract: boolean  // Can draw on canvas
  isDrawing: boolean
  isPanning: boolean
  isZooming: boolean

  // === Cursor ===
  cursorPosition: { x: number; y: number } | null
  cursorInCanvas: boolean

  // === Notifications ===
  notifications: Notification[]

  // === Status Bar ===
  statusText: string
  zoomText: string
  sizeText: string

  // === Actions ===

  // Dialogs
  openDialog: (dialog: DialogType, data?: Record<string, unknown>) => void
  closeDialog: () => void
  closeAllDialogs: () => void
  showConfirm: (options: ConfirmDialogOptions) => void
  showAlert: (options: AlertDialogOptions) => void

  // Panels
  togglePanel: (panelId: string) => void
  setPanelVisible: (panelId: string, visible: boolean) => void
  setPanelWidth: (position: 'left' | 'right', width: number) => void
  setPanelHeight: (height: number) => void
  toggleLeftPanel: () => void
  toggleRightPanel: () => void
  toggleBottomPanel: () => void

  // View Options
  toggleGrid: () => void
  togglePixelGrid: () => void
  toggleGuides: () => void
  toggleRulers: () => void
  toggleMouseGuides: () => void
  toggleSymmetryGuides: () => void
  toggleOnionSkin: () => void
  toggleGreyscaleView: () => void
  toggleMirrorView: () => void
  setShowGrid: (show: boolean) => void
  setShowGuides: (show: boolean) => void
  setShowRulers: (show: boolean) => void
  setShowOnionSkin: (show: boolean) => void

  // Canvas Interaction
  setDimmed: (dimmed: boolean) => void
  setCanInteract: (can: boolean) => void
  setIsDrawing: (drawing: boolean) => void
  setIsPanning: (panning: boolean) => void
  setIsZooming: (zooming: boolean) => void

  // Cursor
  setCursorPosition: (pos: { x: number; y: number } | null) => void
  setCursorInCanvas: (inCanvas: boolean) => void

  // Notifications
  addNotification: (type: NotificationType, message: string, duration?: number) => void
  removeNotification: (id: string) => void
  clearNotifications: () => void

  // Status Bar
  setStatusText: (text: string) => void
  setZoomText: (text: string) => void
  setSizeText: (text: string) => void
}

// Default panels
const defaultPanels: Panel[] = [
  { id: 'tools', name: 'Tools', position: 'left', visible: true, order: 0 },
  { id: 'colors', name: 'Colors', position: 'left', visible: true, order: 1 },
  { id: 'layers', name: 'Layers', position: 'right', visible: true, order: 0 },
  { id: 'navigator', name: 'Navigator', position: 'right', visible: true, order: 1 },
  { id: 'timeline', name: 'Timeline', position: 'bottom', visible: true, order: 0 },
]

// Generate unique notification ID
const generateNotificationId = () => `notif-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

export const useUIStore = create<UIState>()(
  subscribeWithSelector((set, get) => ({
    // === Initial State ===

    // Dialogs
    activeDialog: null,
    dialogStack: [],
    dialogData: {},
    confirmOptions: null,
    alertOptions: null,

    // Panels
    panels: defaultPanels,
    leftPanelVisible: true,
    rightPanelVisible: true,
    bottomPanelVisible: true,
    leftPanelWidth: 240,
    rightPanelWidth: 280,
    bottomPanelHeight: 200,

    // View Options
    showGrid: true,
    showPixelGrid: false,
    showGuides: true,
    showRulers: true,
    showMouseGuides: false,
    showSymmetryGuides: false,
    showOnionSkin: false,
    greyscaleView: false,
    mirrorView: false,

    // Canvas Interaction
    isDimmed: false,
    canInteract: true,
    isDrawing: false,
    isPanning: false,
    isZooming: false,

    // Cursor
    cursorPosition: null,
    cursorInCanvas: false,

    // Notifications
    notifications: [],

    // Status Bar
    statusText: 'Ready',
    zoomText: '100%',
    sizeText: '64 x 64',

    // === Actions ===

    // Dialogs
    openDialog: (dialog, data = {}) => set((state) => ({
      activeDialog: dialog,
      dialogStack: state.activeDialog
        ? [...state.dialogStack, state.activeDialog]
        : state.dialogStack,
      dialogData: { ...state.dialogData, [dialog]: data },
      isDimmed: true,
      canInteract: false,
    })),

    closeDialog: () => set((state) => {
      const prevDialog = state.dialogStack[state.dialogStack.length - 1] || null
      return {
        activeDialog: prevDialog,
        dialogStack: state.dialogStack.slice(0, -1),
        confirmOptions: null,
        alertOptions: null,
        isDimmed: prevDialog !== null,
        canInteract: prevDialog === null,
      }
    }),

    closeAllDialogs: () => set({
      activeDialog: null,
      dialogStack: [],
      confirmOptions: null,
      alertOptions: null,
      isDimmed: false,
      canInteract: true,
    }),

    showConfirm: (options) => set({
      activeDialog: 'confirm',
      confirmOptions: options,
      isDimmed: true,
      canInteract: false,
    }),

    showAlert: (options) => set({
      activeDialog: 'alert',
      alertOptions: options,
      isDimmed: true,
      canInteract: false,
    }),

    // Panels
    togglePanel: (panelId) => set((state) => ({
      panels: state.panels.map((p) =>
        p.id === panelId ? { ...p, visible: !p.visible } : p
      ),
    })),

    setPanelVisible: (panelId, visible) => set((state) => ({
      panels: state.panels.map((p) =>
        p.id === panelId ? { ...p, visible } : p
      ),
    })),

    setPanelWidth: (position, width) => {
      if (position === 'left') {
        set({ leftPanelWidth: Math.max(180, Math.min(400, width)) })
      } else {
        set({ rightPanelWidth: Math.max(200, Math.min(400, width)) })
      }
    },

    setPanelHeight: (height) => set({
      bottomPanelHeight: Math.max(100, Math.min(400, height))
    }),

    toggleLeftPanel: () => set((state) => ({
      leftPanelVisible: !state.leftPanelVisible
    })),

    toggleRightPanel: () => set((state) => ({
      rightPanelVisible: !state.rightPanelVisible
    })),

    toggleBottomPanel: () => set((state) => ({
      bottomPanelVisible: !state.bottomPanelVisible
    })),

    // View Options
    toggleGrid: () => set((state) => ({ showGrid: !state.showGrid })),
    togglePixelGrid: () => set((state) => ({ showPixelGrid: !state.showPixelGrid })),
    toggleGuides: () => set((state) => ({ showGuides: !state.showGuides })),
    toggleRulers: () => set((state) => ({ showRulers: !state.showRulers })),
    toggleMouseGuides: () => set((state) => ({ showMouseGuides: !state.showMouseGuides })),
    toggleSymmetryGuides: () => set((state) => ({ showSymmetryGuides: !state.showSymmetryGuides })),
    toggleOnionSkin: () => set((state) => ({ showOnionSkin: !state.showOnionSkin })),
    toggleGreyscaleView: () => set((state) => ({ greyscaleView: !state.greyscaleView })),
    toggleMirrorView: () => set((state) => ({ mirrorView: !state.mirrorView })),

    setShowGrid: (show) => set({ showGrid: show }),
    setShowGuides: (show) => set({ showGuides: show }),
    setShowRulers: (show) => set({ showRulers: show }),
    setShowOnionSkin: (show) => set({ showOnionSkin: show }),

    // Canvas Interaction
    setDimmed: (dimmed) => set({ isDimmed: dimmed }),
    setCanInteract: (can) => set({ canInteract: can }),
    setIsDrawing: (drawing) => set({ isDrawing: drawing }),
    setIsPanning: (panning) => set({ isPanning: panning }),
    setIsZooming: (zooming) => set({ isZooming: zooming }),

    // Cursor
    setCursorPosition: (pos) => set({ cursorPosition: pos }),
    setCursorInCanvas: (inCanvas) => set({ cursorInCanvas: inCanvas }),

    // Notifications
    addNotification: (type, message, duration = 3000) => {
      const notification: Notification = {
        id: generateNotificationId(),
        type,
        message,
        duration,
        timestamp: Date.now(),
      }

      set((state) => ({
        notifications: [...state.notifications, notification],
      }))

      // Auto-dismiss if duration > 0
      if (duration > 0) {
        setTimeout(() => {
          get().removeNotification(notification.id)
        }, duration)
      }
    },

    removeNotification: (id) => set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),

    clearNotifications: () => set({ notifications: [] }),

    // Status Bar
    setStatusText: (text) => set({ statusText: text }),
    setZoomText: (text) => set({ zoomText: text }),
    setSizeText: (text) => set({ sizeText: text }),
  }))
)

// Helper hooks
export const useActiveDialog = () => useUIStore((state) => state.activeDialog)
export const useDialogData = <T>(dialog: DialogType): T | undefined => {
  return useUIStore((state) => state.dialogData[dialog] as T | undefined)
}
export const useNotifications = () => useUIStore((state) => state.notifications)
export const usePanelVisible = (panelId: string) => {
  return useUIStore((state) => state.panels.find((p) => p.id === panelId)?.visible ?? false)
}

// Subscribe to dialog changes for dimming effect
useUIStore.subscribe(
  (state) => state.isDimmed,
  (isDimmed) => {
    if (typeof document !== 'undefined') {
      document.body.classList.toggle('ui-dimmed', isDimmed)
    }
  }
)
