/**
 * Constants for the Pixel Editor.
 */

// ============================================================================
// Canvas Defaults
// ============================================================================

export const DEFAULT_CANVAS_WIDTH = 64
export const DEFAULT_CANVAS_HEIGHT = 64
export const DEFAULT_ZOOM = 8
export const MIN_ZOOM = 1
export const MAX_ZOOM = 64

// ============================================================================
// Brush Defaults
// ============================================================================

export const DEFAULT_BRUSH_SIZE = 1
export const MIN_BRUSH_SIZE = 1
export const MAX_BRUSH_SIZE = 128
export const DEFAULT_BRUSH_OPACITY = 100
export const DEFAULT_BRUSH_HARDNESS = 100

// ============================================================================
// History
// ============================================================================

export const MAX_HISTORY_SIZE = 100

// ============================================================================
// Animation
// ============================================================================

export const DEFAULT_FPS = 12
export const MIN_FPS = 1
export const MAX_FPS = 60

// ============================================================================
// Colors
// ============================================================================

export const DEFAULT_PRIMARY_COLOR = '#ffffff'
export const DEFAULT_SECONDARY_COLOR = '#000000'

export const DEFAULT_PALETTE: readonly string[] = [
  // PICO-8 palette
  '#000000', '#1d2b53', '#7e2553', '#008751',
  '#ab5236', '#5f574f', '#c2c3c7', '#fff1e8',
  '#ff004d', '#ffa300', '#ffec27', '#00e436',
  '#29adff', '#83769c', '#ff77a8', '#ffccaa',
  // Extended palette
  '#291814', '#111d35', '#422136', '#125359',
  '#742f29', '#49333b', '#a28879', '#f3ef7d',
  '#be1250', '#ff6c24', '#a8e72e', '#00b543',
  '#065ab5', '#754665', '#ff6e59', '#ff9c81',
] as const

// ============================================================================
// UI Colors (matching Pixelorama style)
// ============================================================================

export const UI_COLORS = {
  LEFT_TOOL: '#3b82f6',   // Blue
  RIGHT_TOOL: '#ef4444',  // Red
  GRID: 'rgba(255, 255, 255, 0.1)',
  SELECTION: 'rgba(59, 130, 246, 0.3)',
} as const

// ============================================================================
// Keyboard Shortcuts
// ============================================================================

export const TOOL_SHORTCUTS: Record<string, string> = {
  Pencil: 'b',
  Eraser: 'e',
  Bucket: 'g',
  ColorPicker: 'i',
  LineTool: 'l',
  RectangleTool: 'r',
  EllipseTool: 'o',
  RectSelect: 'm',
  Move: 'v',
  Zoom: 'z',
  Pan: 'h',
} as const
