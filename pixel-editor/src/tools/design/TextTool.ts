/**
 * Text Tool - Place text that gets rasterized to pixels.
 * Based on Pixelorama's text rendering approach
 *
 * Usage:
 * 1. Click to place text cursor
 * 2. Type text
 * 3. Press Enter to commit, Escape to cancel
 */

import { BaseTool } from '../base/BaseTool'
import { defineToolWithFactory, ToolRegistry } from '../registry'
import type { Point, CanvasMouseEvent, DrawingContext } from '@/core/types'
import { LayerType } from '@/core/types'

// Built-in pixel fonts (3x5 and 5x7)
const PIXEL_FONT_3X5: Record<string, number[][]> = {
  'A': [[0,1,0], [1,0,1], [1,1,1], [1,0,1], [1,0,1]],
  'B': [[1,1,0], [1,0,1], [1,1,0], [1,0,1], [1,1,0]],
  'C': [[0,1,1], [1,0,0], [1,0,0], [1,0,0], [0,1,1]],
  'D': [[1,1,0], [1,0,1], [1,0,1], [1,0,1], [1,1,0]],
  'E': [[1,1,1], [1,0,0], [1,1,0], [1,0,0], [1,1,1]],
  'F': [[1,1,1], [1,0,0], [1,1,0], [1,0,0], [1,0,0]],
  'G': [[0,1,1], [1,0,0], [1,0,1], [1,0,1], [0,1,1]],
  'H': [[1,0,1], [1,0,1], [1,1,1], [1,0,1], [1,0,1]],
  'I': [[1,1,1], [0,1,0], [0,1,0], [0,1,0], [1,1,1]],
  'J': [[0,0,1], [0,0,1], [0,0,1], [1,0,1], [0,1,0]],
  'K': [[1,0,1], [1,0,1], [1,1,0], [1,0,1], [1,0,1]],
  'L': [[1,0,0], [1,0,0], [1,0,0], [1,0,0], [1,1,1]],
  'M': [[1,0,1], [1,1,1], [1,0,1], [1,0,1], [1,0,1]],
  'N': [[1,0,1], [1,1,1], [1,1,1], [1,0,1], [1,0,1]],
  'O': [[0,1,0], [1,0,1], [1,0,1], [1,0,1], [0,1,0]],
  'P': [[1,1,0], [1,0,1], [1,1,0], [1,0,0], [1,0,0]],
  'Q': [[0,1,0], [1,0,1], [1,0,1], [1,1,1], [0,1,1]],
  'R': [[1,1,0], [1,0,1], [1,1,0], [1,0,1], [1,0,1]],
  'S': [[0,1,1], [1,0,0], [0,1,0], [0,0,1], [1,1,0]],
  'T': [[1,1,1], [0,1,0], [0,1,0], [0,1,0], [0,1,0]],
  'U': [[1,0,1], [1,0,1], [1,0,1], [1,0,1], [0,1,0]],
  'V': [[1,0,1], [1,0,1], [1,0,1], [0,1,0], [0,1,0]],
  'W': [[1,0,1], [1,0,1], [1,0,1], [1,1,1], [1,0,1]],
  'X': [[1,0,1], [1,0,1], [0,1,0], [1,0,1], [1,0,1]],
  'Y': [[1,0,1], [1,0,1], [0,1,0], [0,1,0], [0,1,0]],
  'Z': [[1,1,1], [0,0,1], [0,1,0], [1,0,0], [1,1,1]],
  '0': [[0,1,0], [1,0,1], [1,0,1], [1,0,1], [0,1,0]],
  '1': [[0,1,0], [1,1,0], [0,1,0], [0,1,0], [1,1,1]],
  '2': [[0,1,0], [1,0,1], [0,0,1], [0,1,0], [1,1,1]],
  '3': [[1,1,0], [0,0,1], [0,1,0], [0,0,1], [1,1,0]],
  '4': [[1,0,1], [1,0,1], [1,1,1], [0,0,1], [0,0,1]],
  '5': [[1,1,1], [1,0,0], [1,1,0], [0,0,1], [1,1,0]],
  '6': [[0,1,1], [1,0,0], [1,1,0], [1,0,1], [0,1,0]],
  '7': [[1,1,1], [0,0,1], [0,1,0], [0,1,0], [0,1,0]],
  '8': [[0,1,0], [1,0,1], [0,1,0], [1,0,1], [0,1,0]],
  '9': [[0,1,0], [1,0,1], [0,1,1], [0,0,1], [1,1,0]],
  ' ': [[0,0,0], [0,0,0], [0,0,0], [0,0,0], [0,0,0]],
  '.': [[0,0,0], [0,0,0], [0,0,0], [0,0,0], [0,1,0]],
  ',': [[0,0,0], [0,0,0], [0,0,0], [0,1,0], [1,0,0]],
  '!': [[0,1,0], [0,1,0], [0,1,0], [0,0,0], [0,1,0]],
  '?': [[0,1,0], [1,0,1], [0,0,1], [0,0,0], [0,1,0]],
  '-': [[0,0,0], [0,0,0], [1,1,1], [0,0,0], [0,0,0]],
  '+': [[0,0,0], [0,1,0], [1,1,1], [0,1,0], [0,0,0]],
  ':': [[0,0,0], [0,1,0], [0,0,0], [0,1,0], [0,0,0]],
  ';': [[0,0,0], [0,1,0], [0,0,0], [0,1,0], [1,0,0]],
  '(': [[0,0,1], [0,1,0], [0,1,0], [0,1,0], [0,0,1]],
  ')': [[1,0,0], [0,1,0], [0,1,0], [0,1,0], [1,0,0]],
  '/': [[0,0,1], [0,0,1], [0,1,0], [1,0,0], [1,0,0]],
  '\\': [[1,0,0], [1,0,0], [0,1,0], [0,0,1], [0,0,1]],
  '_': [[0,0,0], [0,0,0], [0,0,0], [0,0,0], [1,1,1]],
  '=': [[0,0,0], [1,1,1], [0,0,0], [1,1,1], [0,0,0]],
  '*': [[0,0,0], [1,0,1], [0,1,0], [1,0,1], [0,0,0]],
  '#': [[1,0,1], [1,1,1], [1,0,1], [1,1,1], [1,0,1]],
  '@': [[0,1,1], [1,0,1], [1,1,1], [1,0,0], [0,1,1]],
  '\'': [[0,1,0], [0,1,0], [0,0,0], [0,0,0], [0,0,0]],
  '"': [[1,0,1], [1,0,1], [0,0,0], [0,0,0], [0,0,0]],
  '<': [[0,0,1], [0,1,0], [1,0,0], [0,1,0], [0,0,1]],
  '>': [[1,0,0], [0,1,0], [0,0,1], [0,1,0], [1,0,0]],
  '[': [[1,1,0], [1,0,0], [1,0,0], [1,0,0], [1,1,0]],
  ']': [[0,1,1], [0,0,1], [0,0,1], [0,0,1], [0,1,1]],
  '{': [[0,1,1], [0,1,0], [1,1,0], [0,1,0], [0,1,1]],
  '}': [[1,1,0], [0,1,0], [0,1,1], [0,1,0], [1,1,0]],
  '&': [[0,1,0], [1,0,1], [0,1,0], [1,0,1], [0,1,1]],
  '%': [[1,0,1], [0,0,1], [0,1,0], [1,0,0], [1,0,1]],
  '$': [[0,1,1], [1,1,0], [0,1,0], [0,1,1], [1,1,0]],
  '^': [[0,1,0], [1,0,1], [0,0,0], [0,0,0], [0,0,0]],
  '~': [[0,0,0], [0,1,0], [1,0,1], [0,0,0], [0,0,0]],
  '`': [[1,0,0], [0,1,0], [0,0,0], [0,0,0], [0,0,0]],
}

// Add lowercase (same as uppercase for pixel font)
for (const [key, value] of Object.entries(PIXEL_FONT_3X5)) {
  if (key >= 'A' && key <= 'Z') {
    PIXEL_FONT_3X5[key.toLowerCase()] = value
  }
}

export type FontSize = 'small' | 'medium' | 'large'
export type TextAlign = 'left' | 'center' | 'right'

export interface TextToolConfig {
  fontSize: FontSize
  textAlign: TextAlign
  antialiased: boolean
}

export class TextTool extends BaseTool {
  private text: string = ''
  private textPosition: Point | null = null
  private isEditing: boolean = false
  private cursorVisible: boolean = true
  private cursorBlinkInterval: number | null = null
  private fontSize: FontSize = 'small'
  private textAlign: TextAlign = 'left'
  private antialiased: boolean = false
  private previewCanvas: HTMLCanvasElement | null = null
  private color: string = '#000000'

  // Font size multipliers
  private readonly fontSizeMultipliers: Record<FontSize, number> = {
    small: 1,
    medium: 2,
    large: 3,
  }

  /**
   * Set font size
   */
  setFontSize(size: FontSize): void {
    this.fontSize = size
    this.updatePreview()
  }

  getFontSize(): FontSize {
    return this.fontSize
  }

  /**
   * Set text alignment
   */
  setTextAlign(align: TextAlign): void {
    this.textAlign = align
    this.updatePreview()
  }

  getTextAlign(): TextAlign {
    return this.textAlign
  }

  /**
   * Set antialiasing
   */
  setAntialiased(value: boolean): void {
    this.antialiased = value
    this.updatePreview()
  }

  getAntialiased(): boolean {
    return this.antialiased
  }

  /**
   * Get current text
   */
  getText(): string {
    return this.text
  }

  /**
   * Check if currently editing text
   */
  getIsEditing(): boolean {
    return this.isEditing
  }

  protected override onActivate(): void {
    // Start cursor blink
    this.cursorBlinkInterval = window.setInterval(() => {
      this.cursorVisible = !this.cursorVisible
    }, 500)

    // Listen for keyboard events
    window.addEventListener('keydown', this.handleKeyDown)
  }

  protected override onDeactivate(): void {
    // Stop cursor blink
    if (this.cursorBlinkInterval !== null) {
      clearInterval(this.cursorBlinkInterval)
      this.cursorBlinkInterval = null
    }

    // Remove keyboard listener
    window.removeEventListener('keydown', this.handleKeyDown)

    // Reset state
    this.resetTextInput()
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (!this.isEditing) return

    if (e.key === 'Escape') {
      e.preventDefault()
      this.resetTextInput()
    } else if (e.key === 'Enter') {
      e.preventDefault()
      // Commit will be handled by external code
    } else if (e.key === 'Backspace') {
      e.preventDefault()
      this.text = this.text.slice(0, -1)
      this.updatePreview()
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
      e.preventDefault()
      this.text += e.key
      this.updatePreview()
    }
  }

  protected override onDrawStart(
    pos: Point,
    _event: CanvasMouseEvent,
    ctx: DrawingContext
  ): void {
    if (this.isEditing && this.text.length > 0) {
      // Commit current text and start new
      this.commitText(ctx)
    }

    // Start new text input
    this.textPosition = pos
    this.text = ''
    this.isEditing = true
    this.color = ctx.color
    this.updatePreview()
  }

  protected override onDrawMove(
    _pos: Point,
    _event: CanvasMouseEvent,
    _ctx: DrawingContext
  ): void {
    // Text tool doesn't use drag
  }

  protected override onDrawEnd(
    _pos: Point,
    _event: CanvasMouseEvent,
    _ctx: DrawingContext
  ): void {
    // Keep editing state
  }

  /**
   * Commit the current text to the canvas
   */
  commitText(ctx: DrawingContext): void {
    if (!this.textPosition || this.text.length === 0) {
      this.resetTextInput()
      return
    }

    const { ctx: context, canvas } = ctx
    const multiplier = this.fontSizeMultipliers[this.fontSize]
    const charWidth = 3 * multiplier
    const charHeight = 5 * multiplier
    const spacing = 1 * multiplier
    const textWidth = this.text.length * (charWidth + spacing) - spacing

    // Calculate starting X based on alignment
    let startX = this.textPosition.x
    if (this.textAlign === 'center') {
      startX -= Math.floor(textWidth / 2)
    } else if (this.textAlign === 'right') {
      startX -= textWidth
    }

    // Draw each character
    for (let i = 0; i < this.text.length; i++) {
      const char = this.text[i]
      const charData = PIXEL_FONT_3X5[char]

      if (!charData) continue

      const charX = startX + i * (charWidth + spacing)
      const charY = this.textPosition.y

      // Draw character pixels
      for (let row = 0; row < 5; row++) {
        for (let col = 0; col < 3; col++) {
          if (charData[row][col] === 1) {
            // Draw scaled pixel
            for (let dy = 0; dy < multiplier; dy++) {
              for (let dx = 0; dx < multiplier; dx++) {
                const px = charX + col * multiplier + dx
                const py = charY + row * multiplier + dy

                if (px >= 0 && px < canvas.width && py >= 0 && py < canvas.height) {
                  context.fillStyle = this.color
                  context.fillRect(px, py, 1, 1)
                }
              }
            }
          }
        }
      }
    }

    this.resetTextInput()
  }

  /**
   * Update preview canvas
   */
  private updatePreview(): void {
    if (!this.textPosition) return

    const multiplier = this.fontSizeMultipliers[this.fontSize]
    const charWidth = 3 * multiplier
    const charHeight = 5 * multiplier
    const spacing = 1 * multiplier
    const textWidth = Math.max(this.text.length * (charWidth + spacing), charWidth)

    // Create or resize preview canvas
    if (!this.previewCanvas) {
      this.previewCanvas = document.createElement('canvas')
    }
    this.previewCanvas.width = textWidth + spacing
    this.previewCanvas.height = charHeight

    const ctx = this.previewCanvas.getContext('2d')!
    ctx.clearRect(0, 0, this.previewCanvas.width, this.previewCanvas.height)

    // Draw text preview
    for (let i = 0; i < this.text.length; i++) {
      const char = this.text[i]
      const charData = PIXEL_FONT_3X5[char]

      if (!charData) continue

      const charX = i * (charWidth + spacing)

      for (let row = 0; row < 5; row++) {
        for (let col = 0; col < 3; col++) {
          if (charData[row][col] === 1) {
            ctx.fillStyle = this.color
            for (let dy = 0; dy < multiplier; dy++) {
              for (let dx = 0; dx < multiplier; dx++) {
                ctx.fillRect(charX + col * multiplier + dx, row * multiplier + dy, 1, 1)
              }
            }
          }
        }
      }
    }
  }

  /**
   * Reset text input state
   */
  private resetTextInput(): void {
    this.text = ''
    this.textPosition = null
    this.isEditing = false
  }

  override drawPreview(ctx: CanvasRenderingContext2D): void {
    if (!this.isEditing || !this.textPosition) return

    const multiplier = this.fontSizeMultipliers[this.fontSize]
    const charWidth = 3 * multiplier
    const charHeight = 5 * multiplier
    const spacing = 1 * multiplier
    const textWidth = this.text.length * (charWidth + spacing)

    // Calculate starting X based on alignment
    let startX = this.textPosition.x
    if (this.textAlign === 'center') {
      startX -= Math.floor(textWidth / 2)
    } else if (this.textAlign === 'right') {
      startX -= textWidth
    }

    // Draw text preview
    ctx.fillStyle = this.color

    for (let i = 0; i < this.text.length; i++) {
      const char = this.text[i]
      const charData = PIXEL_FONT_3X5[char]

      if (!charData) continue

      const charX = startX + i * (charWidth + spacing)

      for (let row = 0; row < 5; row++) {
        for (let col = 0; col < 3; col++) {
          if (charData[row][col] === 1) {
            for (let dy = 0; dy < multiplier; dy++) {
              for (let dx = 0; dx < multiplier; dx++) {
                ctx.fillRect(
                  charX + col * multiplier + dx,
                  this.textPosition.y + row * multiplier + dy,
                  1, 1
                )
              }
            }
          }
        }
      }
    }

    // Draw cursor
    if (this.cursorVisible) {
      const cursorX = startX + this.text.length * (charWidth + spacing)
      ctx.fillStyle = this.color
      ctx.fillRect(cursorX, this.textPosition.y, 1, charHeight)
    }

    // Draw text box outline
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.5)'
    ctx.lineWidth = 1
    ctx.setLineDash([2, 2])
    ctx.strokeRect(
      startX - 1,
      this.textPosition.y - 1,
      Math.max(textWidth, charWidth) + 2,
      charHeight + 2
    )
    ctx.setLineDash([])
  }

  override drawIndicator(
    ctx: CanvasRenderingContext2D,
    pos: Point,
    color: string
  ): void {
    if (this.isEditing) return

    const multiplier = this.fontSizeMultipliers[this.fontSize]
    const charHeight = 5 * multiplier

    // Draw text cursor indicator
    ctx.strokeStyle = color
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
    ctx.lineTo(pos.x, pos.y + charHeight)
    ctx.stroke()

    // Draw T indicator
    ctx.beginPath()
    ctx.moveTo(pos.x - 2, pos.y)
    ctx.lineTo(pos.x + 2, pos.y)
    ctx.stroke()
  }

  /**
   * Get hint text for UI
   */
  getHintText(): string {
    if (this.isEditing) {
      return 'Type text, Enter to commit, Escape to cancel'
    }
    return 'Click to place text cursor'
  }
}

// Register the tool
export const TextToolDefinition = defineToolWithFactory(
  'text',
  'Text',
  'type',
  'design',
  () => new TextTool(),
  {
    layerTypes: [LayerType.PIXEL],
    hint: 'Click to place text, type to add characters',
    shortcut: 't',
  }
)

ToolRegistry.register(TextToolDefinition)
