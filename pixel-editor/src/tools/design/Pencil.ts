/**
 * Pencil Tool - Basic drawing tool.
 */

import { BaseDrawTool } from '../base/BaseDrawTool'
import { defineToolWithFactory, ToolRegistry } from '../registry'
import { LayerType } from '@/core/types'

export class PencilTool extends BaseDrawTool {
  constructor() {
    super()
    this.isEraser = false
  }
}

// Register the tool
export const PencilDefinition = defineToolWithFactory(
  'pencil',
  'Pencil',
  'pencil',
  'design',
  () => new PencilTool(),
  {
    layerTypes: [LayerType.PIXEL, LayerType.TILEMAP],
    hint: 'Hold Shift to draw straight lines',
    shortcut: 'b',
  }
)

ToolRegistry.register(PencilDefinition)
