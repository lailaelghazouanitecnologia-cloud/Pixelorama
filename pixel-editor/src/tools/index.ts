/**
 * Tools Index - Central export for all tools
 * Import this file to register all tools with the registry
 */

// Design Tools
export * from './design/Pencil'
export * from './design/Eraser'
export * from './design/Bucket'
export * from './design/LineTool'
export * from './design/CurveTool'
export * from './design/RectangleTool'
export * from './design/EllipseTool'
export * from './design/TextTool'

// Utility Tools
export * from './utility/Pan'
export * from './utility/Zoom'
export * from './utility/ColorPicker'
export * from './utility/Move'
export * from './utility/CropTool'

// Selection Tools
export * from './selection/RectSelect'
export * from './selection/EllipseSelect'
export * from './selection/Lasso'
export * from './selection/PolygonSelect'
export * from './selection/MagicWand'
export * from './selection/ColorSelect'

// Re-export registry
export { ToolRegistry, defineToolWithFactory } from './registry'
export type { ToolDefinition, ToolCategory } from './registry'

// Re-export base classes
export { BaseTool } from './base/BaseTool'
export { BaseDrawTool } from './base/BaseDrawTool'
export { BaseSelectionTool, SelectionMode } from './base/BaseSelectionTool'
