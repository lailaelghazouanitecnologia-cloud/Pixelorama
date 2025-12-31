/**
 * Eraser Tool - Erases pixels.
 */

import { BaseDrawTool } from '../base/BaseDrawTool'
import { defineToolWithFactory, ToolRegistry } from '../registry'
import { LayerType } from '@/core/types'

export class EraserTool extends BaseDrawTool {
  constructor() {
    super()
    this.isEraser = true
  }
}

// Register the tool
export const EraserDefinition = defineToolWithFactory(
  'Eraser',
  'Eraser',
  'eraser',
  'design',
  () => new EraserTool(),
  {
    layerTypes: [LayerType.PIXEL, LayerType.TILEMAP],
    hint: 'Hold Shift to erase in straight lines',
    shortcut: 'e',
  }
)

ToolRegistry.register(EraserDefinition)
