/**
 * Core types and interfaces for the Pixel Editor.
 * Following the architecture patterns from Pixelorama.
 */

// ============================================================================
// Basic Types
// ============================================================================

export interface Point {
  readonly x: number
  readonly y: number
}

export interface Size {
  readonly width: number
  readonly height: number
}

export interface Rect {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

export interface Color {
  readonly r: number
  readonly g: number
  readonly b: number
  readonly a: number
}

// ============================================================================
// Layer Types
// ============================================================================

export enum LayerType {
  PIXEL = 'pixel',
  GROUP = 'group',
  TILEMAP = 'tilemap',
  REFERENCE = 'reference',
}

export interface Layer {
  readonly id: string
  readonly name: string
  readonly type: LayerType
  readonly visible: boolean
  readonly locked: boolean
  readonly opacity: number
  readonly parentId: string | null
  data: ImageData | null
}

// ============================================================================
// Frame and Animation
// ============================================================================

export interface Frame {
  readonly id: string
  readonly duration: number
  readonly cels: Map<string, Cel>
}

export interface Cel {
  readonly layerId: string
  readonly frameId: string
  data: ImageData | null
}

// ============================================================================
// Project
// ============================================================================

export interface ProjectMetadata {
  readonly name: string
  readonly width: number
  readonly height: number
  readonly createdAt: Date
  readonly modifiedAt: Date
}

export interface Project {
  readonly id: string
  readonly metadata: ProjectMetadata
  readonly layers: Layer[]
  readonly frames: Frame[]
  readonly palette: string[]
  currentLayerIndex: number
  currentFrameIndex: number
}

// ============================================================================
// Tool Types
// ============================================================================

export enum ToolCategory {
  SELECTION = 'selection',
  DESIGN = 'design',
  UTILITY = 'utility',
}

export interface ToolConfig {
  [key: string]: unknown
}

export interface ToolSlot {
  readonly button: 'left' | 'right'
  readonly color: string
  readonly toolName: string
}

// ============================================================================
// Drawing Types
// ============================================================================

export interface BrushConfig {
  readonly size: number
  readonly opacity: number
  readonly hardness: number
  readonly spacing: number
}

export interface StrokePoint extends Point {
  readonly pressure: number
  readonly timestamp: number
}

export interface DrawingContext {
  readonly canvas: HTMLCanvasElement
  readonly ctx: CanvasRenderingContext2D
  readonly project: Project
  readonly layer: Layer
  readonly color: string
  readonly brush: BrushConfig
}

// ============================================================================
// Selection Types
// ============================================================================

export interface Selection {
  readonly bounds: Rect
  readonly mask: ImageData | null
  readonly isActive: boolean
}

// ============================================================================
// History Types
// ============================================================================

export interface HistoryEntry {
  readonly id: string
  readonly name: string
  readonly timestamp: Date
  readonly undo: () => void
  readonly redo: () => void
}

// ============================================================================
// Event Types
// ============================================================================

export interface CanvasMouseEvent {
  readonly canvasX: number
  readonly canvasY: number
  readonly clientX: number
  readonly clientY: number
  readonly button: number
  readonly pressure: number
  readonly shiftKey: boolean
  readonly ctrlKey: boolean
  readonly altKey: boolean
}
