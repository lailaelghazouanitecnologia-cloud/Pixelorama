/**
 * Pattern Fill System - Pattern-based filling
 * Based on Pixelorama's Patterns.gd and PatternFill shader
 *
 * Supports:
 * - Custom pattern images for filling
 * - Pattern tiling with offset control
 * - Clipboard pattern (from selection)
 * - Built-in patterns (checkerboard, stripes, etc.)
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Pattern definition
export interface Pattern {
  id: string
  name: string
  // The pattern image data (tiles when applied)
  image: ImageData
  // Thumbnail for display
  thumbnail?: string
}

// Built-in patterns
export const BUILTIN_PATTERNS: Pattern[] = []

/**
 * Generate a checkerboard pattern
 */
export function generateCheckerboardPattern(
  size: number,
  color1: { r: number; g: number; b: number; a: number },
  color2: { r: number; g: number; b: number; a: number }
): ImageData {
  const imageData = new ImageData(size * 2, size * 2)

  for (let y = 0; y < size * 2; y++) {
    for (let x = 0; x < size * 2; x++) {
      const isColor1 = ((Math.floor(x / size) + Math.floor(y / size)) % 2) === 0
      const color = isColor1 ? color1 : color2
      const i = (y * size * 2 + x) * 4

      imageData.data[i] = color.r
      imageData.data[i + 1] = color.g
      imageData.data[i + 2] = color.b
      imageData.data[i + 3] = color.a
    }
  }

  return imageData
}

/**
 * Generate horizontal stripes pattern
 */
export function generateHorizontalStripesPattern(
  size: number,
  color1: { r: number; g: number; b: number; a: number },
  color2: { r: number; g: number; b: number; a: number }
): ImageData {
  const imageData = new ImageData(1, size * 2)

  for (let y = 0; y < size * 2; y++) {
    const isColor1 = Math.floor(y / size) % 2 === 0
    const color = isColor1 ? color1 : color2
    const i = y * 4

    imageData.data[i] = color.r
    imageData.data[i + 1] = color.g
    imageData.data[i + 2] = color.b
    imageData.data[i + 3] = color.a
  }

  return imageData
}

/**
 * Generate vertical stripes pattern
 */
export function generateVerticalStripesPattern(
  size: number,
  color1: { r: number; g: number; b: number; a: number },
  color2: { r: number; g: number; b: number; a: number }
): ImageData {
  const imageData = new ImageData(size * 2, 1)

  for (let x = 0; x < size * 2; x++) {
    const isColor1 = Math.floor(x / size) % 2 === 0
    const color = isColor1 ? color1 : color2
    const i = x * 4

    imageData.data[i] = color.r
    imageData.data[i + 1] = color.g
    imageData.data[i + 2] = color.b
    imageData.data[i + 3] = color.a
  }

  return imageData
}

/**
 * Generate diagonal stripes pattern
 */
export function generateDiagonalStripesPattern(
  size: number,
  color1: { r: number; g: number; b: number; a: number },
  color2: { r: number; g: number; b: number; a: number }
): ImageData {
  const patternSize = size * 2
  const imageData = new ImageData(patternSize, patternSize)

  for (let y = 0; y < patternSize; y++) {
    for (let x = 0; x < patternSize; x++) {
      const isColor1 = Math.floor((x + y) / size) % 2 === 0
      const color = isColor1 ? color1 : color2
      const i = (y * patternSize + x) * 4

      imageData.data[i] = color.r
      imageData.data[i + 1] = color.g
      imageData.data[i + 2] = color.b
      imageData.data[i + 3] = color.a
    }
  }

  return imageData
}

/**
 * Generate dots pattern
 */
export function generateDotsPattern(
  spacing: number,
  dotSize: number,
  color1: { r: number; g: number; b: number; a: number },
  color2: { r: number; g: number; b: number; a: number }
): ImageData {
  const patternSize = spacing
  const imageData = new ImageData(patternSize, patternSize)
  const center = Math.floor(patternSize / 2)
  const radius = Math.floor(dotSize / 2)

  for (let y = 0; y < patternSize; y++) {
    for (let x = 0; x < patternSize; x++) {
      const dx = x - center
      const dy = y - center
      const isInDot = (dx * dx + dy * dy) <= radius * radius
      const color = isInDot ? color1 : color2
      const i = (y * patternSize + x) * 4

      imageData.data[i] = color.r
      imageData.data[i + 1] = color.g
      imageData.data[i + 2] = color.b
      imageData.data[i + 3] = color.a
    }
  }

  return imageData
}

/**
 * Generate brick pattern
 */
export function generateBrickPattern(
  brickWidth: number,
  brickHeight: number,
  mortarSize: number,
  brickColor: { r: number; g: number; b: number; a: number },
  mortarColor: { r: number; g: number; b: number; a: number }
): ImageData {
  const patternWidth = (brickWidth + mortarSize) * 2
  const patternHeight = (brickHeight + mortarSize) * 2
  const imageData = new ImageData(patternWidth, patternHeight)

  for (let y = 0; y < patternHeight; y++) {
    for (let x = 0; x < patternHeight; x++) {
      const row = Math.floor(y / (brickHeight + mortarSize))
      const xOffset = (row % 2) * Math.floor((brickWidth + mortarSize) / 2)
      const localX = (x + xOffset) % (brickWidth + mortarSize)
      const localY = y % (brickHeight + mortarSize)

      const isMortar = localX >= brickWidth || localY >= brickHeight
      const color = isMortar ? mortarColor : brickColor
      const i = (y * patternWidth + x) * 4

      imageData.data[i] = color.r
      imageData.data[i + 1] = color.g
      imageData.data[i + 2] = color.b
      imageData.data[i + 3] = color.a
    }
  }

  return imageData
}

/**
 * Create built-in patterns
 */
export function createBuiltinPatterns(): Pattern[] {
  const white = { r: 255, g: 255, b: 255, a: 255 }
  const black = { r: 0, g: 0, b: 0, a: 255 }
  const gray = { r: 128, g: 128, b: 128, a: 255 }
  const transparent = { r: 0, g: 0, b: 0, a: 0 }

  const patterns: Pattern[] = [
    {
      id: 'checkerboard_1',
      name: 'Checkerboard 1px',
      image: generateCheckerboardPattern(1, white, black),
    },
    {
      id: 'checkerboard_2',
      name: 'Checkerboard 2px',
      image: generateCheckerboardPattern(2, white, black),
    },
    {
      id: 'checkerboard_4',
      name: 'Checkerboard 4px',
      image: generateCheckerboardPattern(4, white, black),
    },
    {
      id: 'h_stripes_1',
      name: 'Horizontal Stripes 1px',
      image: generateHorizontalStripesPattern(1, white, black),
    },
    {
      id: 'h_stripes_2',
      name: 'Horizontal Stripes 2px',
      image: generateHorizontalStripesPattern(2, white, black),
    },
    {
      id: 'v_stripes_1',
      name: 'Vertical Stripes 1px',
      image: generateVerticalStripesPattern(1, white, black),
    },
    {
      id: 'v_stripes_2',
      name: 'Vertical Stripes 2px',
      image: generateVerticalStripesPattern(2, white, black),
    },
    {
      id: 'd_stripes_1',
      name: 'Diagonal Stripes 1px',
      image: generateDiagonalStripesPattern(1, white, black),
    },
    {
      id: 'd_stripes_2',
      name: 'Diagonal Stripes 2px',
      image: generateDiagonalStripesPattern(2, white, black),
    },
    {
      id: 'dots_4',
      name: 'Dots 4px',
      image: generateDotsPattern(4, 2, white, black),
    },
    {
      id: 'dots_8',
      name: 'Dots 8px',
      image: generateDotsPattern(8, 4, white, black),
    },
    {
      id: 'bricks_small',
      name: 'Bricks Small',
      image: generateBrickPattern(8, 4, 1, gray, black),
    },
  ]

  // Generate thumbnails
  for (const pattern of patterns) {
    pattern.thumbnail = imageDataToDataURL(pattern.image)
  }

  return patterns
}

/**
 * Convert ImageData to data URL
 */
function imageDataToDataURL(imageData: ImageData): string {
  const canvas = document.createElement('canvas')
  canvas.width = imageData.width
  canvas.height = imageData.height
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.putImageData(imageData, 0, 0)
    return canvas.toDataURL('image/png')
  }
  return ''
}

/**
 * Create a pattern from an ImageData
 */
export function createPatternFromImage(image: ImageData, name: string): Pattern {
  const id = `pattern_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

  return {
    id,
    name,
    image,
    thumbnail: imageDataToDataURL(image),
  }
}

/**
 * Load a pattern from an image file
 */
export async function loadPatternFromFile(file: File): Promise<Pattern | null> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(img, 0, 0)
          const imageData = ctx.getImageData(0, 0, img.width, img.height)
          const pattern = createPatternFromImage(imageData, file.name.replace(/\.[^/.]+$/, ''))
          resolve(pattern)
        } else {
          resolve(null)
        }
      }
      img.onerror = () => resolve(null)
      img.src = e.target?.result as string
    }
    reader.onerror = () => resolve(null)
    reader.readAsDataURL(file)
  })
}

// ============================================================================
// Pattern Store
// ============================================================================

export interface PatternStore {
  // Current pattern selection
  currentPattern: Pattern | null
  // Pattern offset for tiling
  patternOffset: { x: number; y: number }
  // Use pattern for fill operations
  usePatternFill: boolean
  // All available patterns
  patterns: Pattern[]
  // Clipboard pattern (from selection)
  clipboardPattern: Pattern | null
  // Custom/project patterns
  customPatterns: Pattern[]

  // Actions
  setCurrentPattern: (pattern: Pattern | null) => void
  setPatternOffset: (x: number, y: number) => void
  setUsePatternFill: (use: boolean) => void
  addPattern: (pattern: Pattern) => void
  removePattern: (patternId: string) => void
  setClipboardPattern: (pattern: Pattern | null) => void
  clearCustomPatterns: () => void
  getPatternById: (id: string) => Pattern | undefined

  // Helpers
  getAllPatterns: () => Pattern[]
}

// Initialize with built-in patterns (lazy initialization)
let builtinPatternsInitialized = false
let builtinPatterns: Pattern[] = []

function getBuiltinPatterns(): Pattern[] {
  if (!builtinPatternsInitialized) {
    builtinPatterns = createBuiltinPatterns()
    builtinPatternsInitialized = true
  }
  return builtinPatterns
}

export const usePatternStore = create<PatternStore>()(
  persist(
    (set, get) => ({
      currentPattern: null,
      patternOffset: { x: 0, y: 0 },
      usePatternFill: false,
      patterns: [], // Will be populated on first access
      clipboardPattern: null,
      customPatterns: [],

      setCurrentPattern: (pattern) => set({ currentPattern: pattern }),

      setPatternOffset: (x, y) => set({ patternOffset: { x, y } }),

      setUsePatternFill: (use) => set({ usePatternFill: use }),

      addPattern: (pattern) => set((state) => ({
        customPatterns: [...state.customPatterns, pattern],
      })),

      removePattern: (patternId) => set((state) => ({
        customPatterns: state.customPatterns.filter(p => p.id !== patternId),
        currentPattern: state.currentPattern?.id === patternId
          ? null
          : state.currentPattern,
      })),

      setClipboardPattern: (pattern) => set({ clipboardPattern: pattern }),

      clearCustomPatterns: () => set((state) => ({
        customPatterns: [],
        currentPattern: state.customPatterns.some(p => p.id === state.currentPattern?.id)
          ? null
          : state.currentPattern,
      })),

      getPatternById: (id) => {
        const state = get()
        return state.getAllPatterns().find(p => p.id === id)
      },

      getAllPatterns: () => {
        const state = get()
        return [
          ...getBuiltinPatterns(),
          ...(state.clipboardPattern ? [state.clipboardPattern] : []),
          ...state.customPatterns,
        ]
      },
    }),
    {
      name: 'pixelorama-patterns',
      partialize: (state) => ({
        patternOffset: state.patternOffset,
        usePatternFill: state.usePatternFill,
        currentPattern: state.currentPattern ? { id: state.currentPattern.id } : null,
      }),
    }
  )
)

// ============================================================================
// Pattern Fill Operations
// ============================================================================

/**
 * Fill an area with a pattern
 */
export function fillWithPattern(
  target: ImageData,
  pattern: Pattern,
  offset: { x: number; y: number } = { x: 0, y: 0 },
  mask?: ImageData,
  blendMode: 'replace' | 'behind' | 'multiply' = 'replace'
): void {
  const patternWidth = pattern.image.width
  const patternHeight = pattern.image.height

  for (let y = 0; y < target.height; y++) {
    for (let x = 0; x < target.width; x++) {
      const targetIdx = (y * target.width + x) * 4

      // Check mask if provided
      if (mask) {
        const maskIdx = (y * mask.width + x) * 4
        if (mask.data[maskIdx + 3] === 0) continue
      }

      // Get pattern pixel (with tiling)
      const patternX = ((x + offset.x) % patternWidth + patternWidth) % patternWidth
      const patternY = ((y + offset.y) % patternHeight + patternHeight) % patternHeight
      const patternIdx = (patternY * patternWidth + patternX) * 4

      const patternR = pattern.image.data[patternIdx]
      const patternG = pattern.image.data[patternIdx + 1]
      const patternB = pattern.image.data[patternIdx + 2]
      const patternA = pattern.image.data[patternIdx + 3]

      if (patternA === 0) continue

      switch (blendMode) {
        case 'replace':
          target.data[targetIdx] = patternR
          target.data[targetIdx + 1] = patternG
          target.data[targetIdx + 2] = patternB
          target.data[targetIdx + 3] = patternA
          break

        case 'behind':
          // Only fill where target is transparent
          if (target.data[targetIdx + 3] === 0) {
            target.data[targetIdx] = patternR
            target.data[targetIdx + 1] = patternG
            target.data[targetIdx + 2] = patternB
            target.data[targetIdx + 3] = patternA
          }
          break

        case 'multiply':
          // Multiply blend
          target.data[targetIdx] = Math.round((target.data[targetIdx] * patternR) / 255)
          target.data[targetIdx + 1] = Math.round((target.data[targetIdx + 1] * patternG) / 255)
          target.data[targetIdx + 2] = Math.round((target.data[targetIdx + 2] * patternB) / 255)
          break
      }
    }
  }
}

/**
 * Get pattern color at a specific position (for brush operations)
 */
export function getPatternColorAt(
  pattern: Pattern,
  x: number,
  y: number,
  offset: { x: number; y: number } = { x: 0, y: 0 }
): { r: number; g: number; b: number; a: number } {
  const patternWidth = pattern.image.width
  const patternHeight = pattern.image.height

  const patternX = ((x + offset.x) % patternWidth + patternWidth) % patternWidth
  const patternY = ((y + offset.y) % patternHeight + patternHeight) % patternHeight
  const patternIdx = (patternY * patternWidth + patternX) * 4

  return {
    r: pattern.image.data[patternIdx],
    g: pattern.image.data[patternIdx + 1],
    b: pattern.image.data[patternIdx + 2],
    a: pattern.image.data[patternIdx + 3],
  }
}
