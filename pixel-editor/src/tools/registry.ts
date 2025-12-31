/**
 * Tool Registry - Central registration system for all tools.
 * Mirrors Pixelorama's Tools.gd architecture.
 */

import type { ToolCategory, LayerType, ToolConfig } from '@/core/types'
import type { BaseTool } from './base/BaseTool'
import { TOOL_SHORTCUTS } from '@/core/constants'

// ============================================================================
// Tool Definition
// ============================================================================

export interface ToolDefinition {
  readonly name: string
  readonly displayName: string
  readonly icon: string
  readonly shortcut: string
  readonly category: ToolCategory
  readonly layerTypes: LayerType[]
  readonly hint: string
  readonly factory: () => BaseTool
}

// ============================================================================
// Tool Slot - Represents left or right tool assignment
// ============================================================================

export interface ToolSlot {
  readonly button: 'left' | 'right'
  color: string
  toolName: string
  tool: BaseTool | null
  config: ToolConfig
}

// ============================================================================
// Tool Registry Class
// ============================================================================

class ToolRegistryClass {
  private readonly tools: Map<string, ToolDefinition> = new Map()
  private readonly toolInstances: Map<string, BaseTool> = new Map()
  private readonly categoryOrder: ToolCategory[] = ['selection', 'design', 'utility']

  /**
   * Register a new tool.
   * This is called during initialization for each tool type.
   */
  register(definition: ToolDefinition): void {
    if (this.tools.has(definition.name)) {
      console.warn(`Tool "${definition.name}" is already registered. Skipping.`)
      return
    }

    // Validate required fields
    if (!definition.name || definition.name.length === 0) {
      throw new Error('Tool name is required')
    }
    if (!definition.factory) {
      throw new Error(`Tool "${definition.name}" must have a factory function`)
    }

    this.tools.set(definition.name, definition)
  }

  /**
   * Unregister a tool (for extensions).
   */
  unregister(name: string): boolean {
    if (!this.tools.has(name)) {
      return false
    }

    this.tools.delete(name)
    this.toolInstances.delete(name)
    return true
  }

  /**
   * Get a tool definition by name.
   */
  getDefinition(name: string): ToolDefinition | undefined {
    return this.tools.get(name)
  }

  /**
   * Get or create a tool instance.
   * Tools are instantiated lazily and cached.
   */
  getInstance(name: string): BaseTool | null {
    const definition = this.tools.get(name)
    if (!definition) {
      console.error(`Tool "${name}" not found in registry`)
      return null
    }

    let instance = this.toolInstances.get(name)
    if (!instance) {
      instance = definition.factory()
      instance.initialize(definition)
      this.toolInstances.set(name, instance)
    }

    return instance
  }

  /**
   * Get all registered tool definitions.
   */
  getAllDefinitions(): ToolDefinition[] {
    return Array.from(this.tools.values())
  }

  /**
   * Get tools by category, ordered.
   */
  getToolsByCategory(category: ToolCategory): ToolDefinition[] {
    return this.getAllDefinitions()
      .filter(tool => tool.category === category)
  }

  /**
   * Get tools grouped by category in display order.
   */
  getToolsGroupedByCategory(): Map<ToolCategory, ToolDefinition[]> {
    const grouped = new Map<ToolCategory, ToolDefinition[]>()

    for (const category of this.categoryOrder) {
      grouped.set(category, this.getToolsByCategory(category))
    }

    return grouped
  }

  /**
   * Find tool by shortcut key.
   */
  findByShortcut(key: string): ToolDefinition | undefined {
    const lowerKey = key.toLowerCase()
    return this.getAllDefinitions().find(
      tool => tool.shortcut.toLowerCase() === lowerKey
    )
  }

  /**
   * Check if a tool can be used on a given layer type.
   */
  canUseOnLayer(toolName: string, layerType: LayerType): boolean {
    const definition = this.tools.get(toolName)
    if (!definition) {
      return false
    }

    // Empty layerTypes means tool works on all layer types
    if (definition.layerTypes.length === 0) {
      return true
    }

    return definition.layerTypes.includes(layerType)
  }

  /**
   * Get the default shortcut for a tool.
   */
  getShortcut(toolName: string): string {
    return TOOL_SHORTCUTS[toolName] ?? ''
  }

  /**
   * Clear all tool instances (for cleanup).
   */
  clearInstances(): void {
    for (const instance of this.toolInstances.values()) {
      instance.cleanup()
    }
    this.toolInstances.clear()
  }

  /**
   * Get tool count.
   */
  get count(): number {
    return this.tools.size
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const ToolRegistry = new ToolRegistryClass()

// ============================================================================
// Registration Helper
// ============================================================================

/**
 * Helper function to create a tool definition.
 * Ensures consistent structure across all tools.
 */
export function defineToolWithFactory<T extends BaseTool>(
  name: string,
  displayName: string,
  icon: string,
  category: ToolCategory,
  factory: () => T,
  options: {
    layerTypes?: LayerType[]
    hint?: string
    shortcut?: string
  } = {}
): ToolDefinition {
  return {
    name,
    displayName,
    icon,
    shortcut: options.shortcut ?? TOOL_SHORTCUTS[name] ?? '',
    category,
    layerTypes: options.layerTypes ?? [],
    hint: options.hint ?? '',
    factory,
  }
}
