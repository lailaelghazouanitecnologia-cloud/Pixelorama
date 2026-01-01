/**
 * SelectionModifyDialog - Dialog for modifying selections
 * Provides UI for expand, shrink, border, feather, grow, and smooth operations
 */

import { useState, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"

export type SelectionModifyOperation =
  | 'expand'
  | 'shrink'
  | 'border'
  | 'feather'
  | 'grow'
  | 'smooth'

interface SelectionModifyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  operation: SelectionModifyOperation
  onApply: (operation: SelectionModifyOperation, value: number) => void
}

const OPERATION_CONFIG: Record<SelectionModifyOperation, {
  title: string
  description: string
  label: string
  min: number
  max: number
  defaultValue: number
  unit: string
}> = {
  expand: {
    title: 'Expand Selection',
    description: 'Grow the selection outward by the specified number of pixels.',
    label: 'Expand by',
    min: 1,
    max: 100,
    defaultValue: 1,
    unit: 'px',
  },
  shrink: {
    title: 'Shrink Selection',
    description: 'Contract the selection inward by the specified number of pixels.',
    label: 'Shrink by',
    min: 1,
    max: 100,
    defaultValue: 1,
    unit: 'px',
  },
  border: {
    title: 'Border Selection',
    description: 'Create a border selection from the edge of the current selection.',
    label: 'Border width',
    min: 1,
    max: 50,
    defaultValue: 1,
    unit: 'px',
  },
  feather: {
    title: 'Feather Selection',
    description: 'Soften the selection edges with a gradual fade.',
    label: 'Feather radius',
    min: 1,
    max: 50,
    defaultValue: 5,
    unit: 'px',
  },
  grow: {
    title: 'Grow Selection',
    description: 'Expand selection to include adjacent pixels of similar color.',
    label: 'Color tolerance',
    min: 0,
    max: 255,
    defaultValue: 32,
    unit: '',
  },
  smooth: {
    title: 'Smooth Selection',
    description: 'Smooth the selection edges by averaging neighboring pixels.',
    label: 'Iterations',
    min: 1,
    max: 10,
    defaultValue: 1,
    unit: '',
  },
}

export function SelectionModifyDialog({
  open,
  onOpenChange,
  operation,
  onApply,
}: SelectionModifyDialogProps) {
  const config = OPERATION_CONFIG[operation]
  const [value, setValue] = useState(config.defaultValue)

  const handleApply = useCallback(() => {
    onApply(operation, value)
    onOpenChange(false)
  }, [operation, value, onApply, onOpenChange])

  const handleClose = useCallback(() => {
    setValue(config.defaultValue)
    onOpenChange(false)
  }, [config.defaultValue, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{config.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            {config.description}
          </p>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="modify-value">{config.label}</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="modify-value"
                  type="number"
                  min={config.min}
                  max={config.max}
                  value={value}
                  onChange={(e) => setValue(Math.max(config.min, Math.min(config.max, parseInt(e.target.value) || config.min)))}
                  className="w-20 text-right"
                />
                {config.unit && (
                  <span className="text-sm text-muted-foreground w-6">
                    {config.unit}
                  </span>
                )}
              </div>
            </div>

            <Slider
              value={[value]}
              min={config.min}
              max={config.max}
              step={1}
              onValueChange={([v]) => setValue(v)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleApply}>
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Quick access buttons for common selection operations
interface SelectionToolbarProps {
  hasSelection: boolean
  onModify: (operation: SelectionModifyOperation) => void
  onInvert: () => void
  onSelectAll: () => void
  onDeselect: () => void
}

export function SelectionToolbar({
  hasSelection,
  onModify,
  onInvert,
  onSelectAll,
  onDeselect,
}: SelectionToolbarProps) {
  return (
    <div className="flex flex-wrap gap-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={onSelectAll}
      >
        Select All
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={onDeselect}
        disabled={!hasSelection}
      >
        Deselect
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={onInvert}
      >
        Invert
      </Button>

      <div className="w-px h-6 bg-border mx-1" />

      <Button
        variant="ghost"
        size="sm"
        onClick={() => onModify('expand')}
        disabled={!hasSelection}
      >
        Expand
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => onModify('shrink')}
        disabled={!hasSelection}
      >
        Shrink
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => onModify('border')}
        disabled={!hasSelection}
      >
        Border
      </Button>

      <div className="w-px h-6 bg-border mx-1" />

      <Button
        variant="ghost"
        size="sm"
        onClick={() => onModify('feather')}
        disabled={!hasSelection}
      >
        Feather
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => onModify('smooth')}
        disabled={!hasSelection}
      >
        Smooth
      </Button>
    </div>
  )
}

/**
 * Wrapper component for DialogManager integration
 * Reads operation from dialogData and wires up to editor store
 */
import { useDialogData } from "@/store/ui-store"
import { useEditorStore } from "@/store/editor-store"

interface SelectionModifyDialogData {
  operation: SelectionModifyOperation
}

export function SelectionModifyDialogWrapper({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const dialogData = useDialogData<SelectionModifyDialogData>('selectionModify')
  const { modifySelection } = useEditorStore()

  const operation = dialogData?.operation || 'expand'

  const handleApply = useCallback((op: SelectionModifyOperation, value: number) => {
    modifySelection(op, value)
  }, [modifySelection])

  return (
    <SelectionModifyDialog
      open={open}
      onOpenChange={onOpenChange}
      operation={operation}
      onApply={handleApply}
    />
  )
}
