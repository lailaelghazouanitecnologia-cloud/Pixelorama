/**
 * Dialog Manager - Lazy-loading dialog system
 * Based on Pixelorama's TopMenuContainer Dialog wrapper pattern
 * Dialogs are loaded on-demand to reduce initial bundle size
 */

import { lazy, Suspense, useCallback } from 'react'
import { useUIStore, type DialogType } from '@/store/ui-store'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'

// Lazy load dialogs - they're instantiated on first use
const dialogRegistry: Partial<Record<DialogType, React.LazyExoticComponent<React.ComponentType<DialogProps>>>> = {
  newProject: lazy(() => import('./NewProjectDialog').then(m => ({ default: m.NewProjectDialog }))),
  exportImage: lazy(() => import('./ExportDialog').then(m => ({ default: m.ExportDialog }))),
  importImage: lazy(() => import('./ImportDialog').then(m => ({ default: m.ImportDialog }))),
  resizeCanvas: lazy(() => import('./ResizeCanvasDialog').then(m => ({ default: m.ResizeCanvasDialog }))),
  scaleImage: lazy(() => import('./ScaleImageDialog').then(m => ({ default: m.ScaleImageDialog }))),
  effects: lazy(() => import('./EffectsDialog').then(m => ({ default: m.EffectsDialog }))),
  animationTags: lazy(() => import('./AnimationTagsDialog').then(m => ({ default: m.AnimationTagsDialog }))),
  spritesheet: lazy(() => import('./SpritesheetDialog').then(m => ({ default: m.SpritesheetDialog }))),
  onionSkin: lazy(() => import('./OnionSkinDialog').then(m => ({ default: m.OnionSkinDialog }))),
  isometricGrid: lazy(() => import('./IsometricGridDialog').then(m => ({ default: m.IsometricGridDialog }))),
  gridSettings: lazy(() => import('./GridSettingsDialog').then(m => ({ default: m.GridSettingsDialog }))),
  guidesSettings: lazy(() => import('./GuidesSettingsDialog').then(m => ({ default: m.GuidesSettingsDialog }))),
  selectionModify: lazy(() => import('./SelectionModifyDialog').then(m => ({ default: m.SelectionModifyDialogWrapper }))),
  strokeSelection: lazy(() => import('./StrokeSelectionDialog').then(m => ({ default: m.StrokeSelectionDialog }))),
  layerProperties: lazy(() => import('./LayerPropertiesDialog').then(m => ({ default: m.LayerPropertiesDialog }))),
  layerEffects: lazy(() => import('./LayerEffectsDialog').then(m => ({ default: m.LayerEffectsDialog }))),
  flipRotate: lazy(() => import('./FlipRotateDialog').then(m => ({ default: m.FlipRotateDialog }))),
  gradient: lazy(() => import('./GradientDialog').then(m => ({ default: m.GradientDialog }))),
  startup: lazy(() => import('./StartupDialog').then(m => ({ default: m.StartupDialog }))),
  preferences: lazy(() => import('./PreferencesDialog').then(m => ({ default: m.PreferencesDialog }))),
  keyboardShortcuts: lazy(() => import('./KeyboardShortcutsDialog').then(m => ({ default: m.KeyboardShortcutsDialog }))),
  about: lazy(() => import('./AboutDialog').then(m => ({ default: m.AboutDialog }))),
}

// Common dialog props interface
export interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// Loading fallback
function DialogLoading() {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="animate-spin w-6 h-6 border-2 border-pix-accent border-t-transparent rounded-full" />
    </div>
  )
}

// Confirm Dialog Component
function ConfirmDialog() {
  const { confirmOptions, closeDialog } = useUIStore()

  if (!confirmOptions) return null

  const handleConfirm = () => {
    confirmOptions.onConfirm?.()
    closeDialog()
  }

  const handleCancel = () => {
    confirmOptions.onCancel?.()
    closeDialog()
  }

  return (
    <Dialog open={true} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>{confirmOptions.title}</DialogTitle>
          <DialogDescription>{confirmOptions.message}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <button className="btn" onClick={handleCancel}>
            {confirmOptions.cancelText || 'Cancel'}
          </button>
          <button
            className={`btn ${confirmOptions.destructive ? 'bg-red-600 hover:bg-red-700' : 'bg-pix-accent'}`}
            onClick={handleConfirm}
          >
            {confirmOptions.confirmText || 'Confirm'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Alert Dialog Component
function AlertDialog() {
  const { alertOptions, closeDialog } = useUIStore()

  if (!alertOptions) return null

  const handleClose = () => {
    alertOptions.onClose?.()
    closeDialog()
  }

  return (
    <Dialog open={true} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>{alertOptions.title}</DialogTitle>
          <DialogDescription>{alertOptions.message}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <button className="btn bg-pix-accent" onClick={handleClose}>
            {alertOptions.buttonText || 'OK'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * DialogManager - Central dialog controller
 * Renders the active dialog from the UI store
 * Uses lazy loading for better performance
 */
export function DialogManager() {
  const { activeDialog, closeDialog } = useUIStore()

  const handleOpenChange = useCallback((open: boolean) => {
    if (!open) {
      closeDialog()
    }
  }, [closeDialog])

  // Handle special dialogs (confirm/alert)
  if (activeDialog === 'confirm') {
    return <ConfirmDialog />
  }

  if (activeDialog === 'alert') {
    return <AlertDialog />
  }

  // No active dialog
  if (!activeDialog) {
    return null
  }

  // Get lazy component from registry
  const DialogComponent = dialogRegistry[activeDialog]

  if (!DialogComponent) {
    console.warn(`Dialog "${activeDialog}" not found in registry`)
    return null
  }

  return (
    <Suspense fallback={
      <Dialog open={true} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogLoading />
        </DialogContent>
      </Dialog>
    }>
      <DialogComponent open={true} onOpenChange={handleOpenChange} />
    </Suspense>
  )
}

// Helper hooks for dialog management
export function useDialog(dialogType: DialogType) {
  const { openDialog, closeDialog, activeDialog } = useUIStore()

  return {
    isOpen: activeDialog === dialogType,
    open: (data?: Record<string, unknown>) => openDialog(dialogType, data),
    close: closeDialog,
  }
}

export function useConfirmDialog() {
  const { showConfirm } = useUIStore()

  return useCallback((options: {
    title: string
    message: string
    confirmText?: string
    cancelText?: string
    destructive?: boolean
  }): Promise<boolean> => {
    return new Promise((resolve) => {
      showConfirm({
        ...options,
        onConfirm: () => resolve(true),
        onCancel: () => resolve(false),
      })
    })
  }, [showConfirm])
}

export function useAlertDialog() {
  const { showAlert } = useUIStore()

  return useCallback((options: {
    title: string
    message: string
    buttonText?: string
  }): Promise<void> => {
    return new Promise((resolve) => {
      showAlert({
        ...options,
        onClose: () => resolve(),
      })
    })
  }, [showAlert])
}
