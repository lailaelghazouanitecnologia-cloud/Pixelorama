/**
 * Brush System - Custom brush types and brush library
 * Based on Pixelorama's Brushes.gd
 *
 * Supports:
 * - Built-in brushes (pixel, circle, filled circle)
 * - File brushes (loaded from images)
 * - Random brushes (picks randomly from a set)
 * - Custom/project brushes (user-created)
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Brush types matching Pixelorama
export enum BrushType {
  PIXEL = 'pixel',
  CIRCLE = 'circle',
  FILLED_CIRCLE = 'filled_circle',
  FILE = 'file',
  RANDOM_FILE = 'random_file',
  CUSTOM = 'custom',
}

// Brush data structure
export interface Brush {
  id: string
  name: string
  type: BrushType
  // The brush mask/image (1-bit mask for shape, or RGBA for color brushes)
  mask: ImageData | null
  // For random brushes, multiple images
  randomImages?: ImageData[]
  // Size override (if 0, uses tool's brush size)
  sizeOverride: number
  // Whether to use color from the brush image
  useColorFromImage: boolean
  // Thumbnail for display
  thumbnail?: string
}

// Built-in brush definitions
export const BUILTIN_BRUSHES: Brush[] = [
  {
    id: 'pixel',
    name: 'Pixel',
    type: BrushType.PIXEL,
    mask: null,
    sizeOverride: 0,
    useColorFromImage: false,
  },
  {
    id: 'circle',
    name: 'Circle',
    type: BrushType.CIRCLE,
    mask: null,
    sizeOverride: 0,
    useColorFromImage: false,
  },
  {
    id: 'filled_circle',
    name: 'Filled Circle',
    type: BrushType.FILLED_CIRCLE,
    mask: null,
    sizeOverride: 0,
    useColorFromImage: false,
  },
]

/**
 * Generate a pixel brush mask (single pixel or square)
 */
export function generatePixelBrush(size: number): ImageData {
  const imageData = new ImageData(size, size)
  // Fill all pixels as opaque white (mask)
  for (let i = 0; i < imageData.data.length; i += 4) {
    imageData.data[i] = 255     // R
    imageData.data[i + 1] = 255 // G
    imageData.data[i + 2] = 255 // B
    imageData.data[i + 3] = 255 // A
  }
  return imageData
}

/**
 * Generate a circle outline brush mask
 */
export function generateCircleBrush(size: number): ImageData {
  const imageData = new ImageData(size, size)
  const center = (size - 1) / 2
  const radius = center

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - center
      const dy = y - center
      const distance = Math.sqrt(dx * dx + dy * dy)

      // Create a 1-pixel thick circle outline
      const isOnCircle = Math.abs(distance - radius) < 0.8

      const i = (y * size + x) * 4
      if (isOnCircle) {
        imageData.data[i] = 255
        imageData.data[i + 1] = 255
        imageData.data[i + 2] = 255
        imageData.data[i + 3] = 255
      }
    }
  }

  return imageData
}

/**
 * Generate a filled circle brush mask
 */
export function generateFilledCircleBrush(size: number): ImageData {
  const imageData = new ImageData(size, size)
  const center = (size - 1) / 2
  const radius = size / 2

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - center
      const dy = y - center
      const distanceSquared = dx * dx + dy * dy

      const i = (y * size + x) * 4
      if (distanceSquared <= radius * radius) {
        imageData.data[i] = 255
        imageData.data[i + 1] = 255
        imageData.data[i + 2] = 255
        imageData.data[i + 3] = 255
      }
    }
  }

  return imageData
}

/**
 * Generate a soft/antialiased circle brush
 */
export function generateSoftCircleBrush(size: number, hardness: number = 0.5): ImageData {
  const imageData = new ImageData(size, size)
  const center = (size - 1) / 2
  const radius = size / 2

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - center
      const dy = y - center
      const distance = Math.sqrt(dx * dx + dy * dy)

      // Calculate falloff based on hardness
      let alpha = 0
      if (distance <= radius * hardness) {
        alpha = 255
      } else if (distance <= radius) {
        const t = (distance - radius * hardness) / (radius * (1 - hardness))
        alpha = Math.round(255 * (1 - t))
      }

      const i = (y * size + x) * 4
      imageData.data[i] = 255
      imageData.data[i + 1] = 255
      imageData.data[i + 2] = 255
      imageData.data[i + 3] = alpha
    }
  }

  return imageData
}

/**
 * Generate a diamond-shaped brush
 */
export function generateDiamondBrush(size: number): ImageData {
  const imageData = new ImageData(size, size)
  const center = (size - 1) / 2

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = Math.abs(x - center)
      const dy = Math.abs(y - center)

      // Diamond shape: |dx| + |dy| <= center
      const i = (y * size + x) * 4
      if (dx + dy <= center) {
        imageData.data[i] = 255
        imageData.data[i + 1] = 255
        imageData.data[i + 2] = 255
        imageData.data[i + 3] = 255
      }
    }
  }

  return imageData
}

/**
 * Generate brush mask based on type and size
 */
export function generateBrushMask(brush: Brush, size: number): ImageData {
  switch (brush.type) {
    case BrushType.PIXEL:
      return generatePixelBrush(size)

    case BrushType.CIRCLE:
      return generateCircleBrush(size)

    case BrushType.FILLED_CIRCLE:
      return generateFilledCircleBrush(size)

    case BrushType.FILE:
    case BrushType.CUSTOM:
      // For custom brushes, scale the mask to the requested size
      if (brush.mask) {
        return scaleBrushMask(brush.mask, size)
      }
      return generatePixelBrush(size)

    case BrushType.RANDOM_FILE:
      // Pick a random image from the set
      if (brush.randomImages && brush.randomImages.length > 0) {
        const randomIndex = Math.floor(Math.random() * brush.randomImages.length)
        return scaleBrushMask(brush.randomImages[randomIndex], size)
      }
      return generatePixelBrush(size)

    default:
      return generatePixelBrush(size)
  }
}

/**
 * Scale a brush mask to a new size using nearest-neighbor interpolation
 */
export function scaleBrushMask(mask: ImageData, newSize: number): ImageData {
  if (mask.width === newSize && mask.height === newSize) {
    return mask
  }

  const scaled = new ImageData(newSize, newSize)
  const scaleX = mask.width / newSize
  const scaleY = mask.height / newSize

  for (let y = 0; y < newSize; y++) {
    for (let x = 0; x < newSize; x++) {
      const srcX = Math.floor(x * scaleX)
      const srcY = Math.floor(y * scaleY)

      const srcIdx = (srcY * mask.width + srcX) * 4
      const dstIdx = (y * newSize + x) * 4

      scaled.data[dstIdx] = mask.data[srcIdx]
      scaled.data[dstIdx + 1] = mask.data[srcIdx + 1]
      scaled.data[dstIdx + 2] = mask.data[srcIdx + 2]
      scaled.data[dstIdx + 3] = mask.data[srcIdx + 3]
    }
  }

  return scaled
}

/**
 * Create a brush from an ImageData
 */
export function createBrushFromImage(
  image: ImageData,
  name: string,
  useColor: boolean = false
): Brush {
  const id = `custom_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

  return {
    id,
    name,
    type: BrushType.CUSTOM,
    mask: image,
    sizeOverride: 0,
    useColorFromImage: useColor,
    thumbnail: imageDataToDataURL(image),
  }
}

/**
 * Convert ImageData to data URL for thumbnails
 */
export function imageDataToDataURL(imageData: ImageData): string {
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
 * Load a brush from an image file
 */
export async function loadBrushFromFile(file: File): Promise<Brush | null> {
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
          const brush = createBrushFromImage(imageData, file.name.replace(/\.[^/.]+$/, ''))
          brush.type = BrushType.FILE
          resolve(brush)
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
// Brush Store
// ============================================================================

export interface BrushStore {
  // Current brush selection
  currentBrush: Brush
  // All available brushes (built-in + custom)
  brushes: Brush[]
  // File brushes (loaded from disk)
  fileBrushes: Brush[]
  // Project-specific brushes
  projectBrushes: Brush[]

  // Actions
  setCurrentBrush: (brush: Brush) => void
  addBrush: (brush: Brush) => void
  addFileBrush: (brush: Brush) => void
  addProjectBrush: (brush: Brush) => void
  removeBrush: (brushId: string) => void
  clearProjectBrushes: () => void
  getBrushById: (id: string) => Brush | undefined

  // Helpers
  getAllBrushes: () => Brush[]
}

export const useBrushStore = create<BrushStore>()(
  persist(
    (set, get) => ({
      currentBrush: BUILTIN_BRUSHES[0], // Default to pixel brush
      brushes: [...BUILTIN_BRUSHES],
      fileBrushes: [],
      projectBrushes: [],

      setCurrentBrush: (brush) => set({ currentBrush: brush }),

      addBrush: (brush) => set((state) => ({
        brushes: [...state.brushes, brush],
      })),

      addFileBrush: (brush) => set((state) => ({
        fileBrushes: [...state.fileBrushes, brush],
      })),

      addProjectBrush: (brush) => set((state) => ({
        projectBrushes: [...state.projectBrushes, brush],
      })),

      removeBrush: (brushId) => set((state) => {
        // Don't remove built-in brushes
        if (BUILTIN_BRUSHES.some(b => b.id === brushId)) {
          return state
        }

        return {
          brushes: state.brushes.filter(b => b.id !== brushId),
          fileBrushes: state.fileBrushes.filter(b => b.id !== brushId),
          projectBrushes: state.projectBrushes.filter(b => b.id !== brushId),
          // Reset current brush if it was removed
          currentBrush: state.currentBrush.id === brushId
            ? BUILTIN_BRUSHES[0]
            : state.currentBrush,
        }
      }),

      clearProjectBrushes: () => set((state) => ({
        projectBrushes: [],
        currentBrush: state.projectBrushes.some(b => b.id === state.currentBrush.id)
          ? BUILTIN_BRUSHES[0]
          : state.currentBrush,
      })),

      getBrushById: (id) => {
        const state = get()
        return state.getAllBrushes().find(b => b.id === id)
      },

      getAllBrushes: () => {
        const state = get()
        return [
          ...state.brushes,
          ...state.fileBrushes,
          ...state.projectBrushes,
        ]
      },
    }),
    {
      name: 'pixelorama-brushes',
      // Only persist non-built-in brushes
      partialize: (state) => ({
        fileBrushes: state.fileBrushes.map(b => ({
          ...b,
          mask: null, // Don't persist ImageData
          randomImages: undefined,
        })),
        currentBrush: { id: state.currentBrush.id },
      }),
    }
  )
)

// ============================================================================
// Brush Drawing Utilities
// ============================================================================

/**
 * Apply brush at position with color
 * Returns array of affected pixel positions
 */
export function applyBrush(
  brush: Brush,
  size: number,
  x: number,
  y: number,
  color: { r: number; g: number; b: number; a: number },
  target: ImageData,
  options: {
    overwrite?: boolean
    alphaLocked?: boolean
  } = {}
): void {
  const mask = generateBrushMask(brush, size)
  const halfSize = Math.floor(size / 2)

  for (let by = 0; by < size; by++) {
    for (let bx = 0; bx < size; bx++) {
      const maskIdx = (by * size + bx) * 4
      const maskAlpha = mask.data[maskIdx + 3]

      if (maskAlpha === 0) continue

      const tx = x - halfSize + bx
      const ty = y - halfSize + by

      // Check bounds
      if (tx < 0 || tx >= target.width || ty < 0 || ty >= target.height) continue

      const targetIdx = (ty * target.width + tx) * 4

      // Calculate effective alpha
      let alpha = (color.a * maskAlpha) / 255

      // Alpha locked - only paint where pixels already exist
      if (options.alphaLocked && target.data[targetIdx + 3] === 0) {
        continue
      }

      if (options.overwrite) {
        // Overwrite mode - replace pixels
        target.data[targetIdx] = color.r
        target.data[targetIdx + 1] = color.g
        target.data[targetIdx + 2] = color.b
        target.data[targetIdx + 3] = Math.round(alpha)
      } else {
        // Blend mode - alpha composite
        const srcAlpha = alpha / 255
        const dstAlpha = target.data[targetIdx + 3] / 255
        const outAlpha = srcAlpha + dstAlpha * (1 - srcAlpha)

        if (outAlpha > 0) {
          target.data[targetIdx] = Math.round(
            (color.r * srcAlpha + target.data[targetIdx] * dstAlpha * (1 - srcAlpha)) / outAlpha
          )
          target.data[targetIdx + 1] = Math.round(
            (color.g * srcAlpha + target.data[targetIdx + 1] * dstAlpha * (1 - srcAlpha)) / outAlpha
          )
          target.data[targetIdx + 2] = Math.round(
            (color.b * srcAlpha + target.data[targetIdx + 2] * dstAlpha * (1 - srcAlpha)) / outAlpha
          )
          target.data[targetIdx + 3] = Math.round(outAlpha * 255)
        }
      }
    }
  }
}

/**
 * Get brush indicator points for rendering
 */
export function getBrushIndicatorPoints(
  brush: Brush,
  size: number
): { x: number; y: number }[] {
  const mask = generateBrushMask(brush, size)
  const points: { x: number; y: number }[] = []
  const halfSize = Math.floor(size / 2)

  // For efficiency, only include edge points
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4
      if (mask.data[idx + 3] > 0) {
        // Check if this is an edge point
        const isEdge = (
          x === 0 || x === size - 1 || y === 0 || y === size - 1 ||
          mask.data[((y - 1) * size + x) * 4 + 3] === 0 ||
          mask.data[((y + 1) * size + x) * 4 + 3] === 0 ||
          mask.data[(y * size + x - 1) * 4 + 3] === 0 ||
          mask.data[(y * size + x + 1) * 4 + 3] === 0
        )

        if (isEdge) {
          points.push({ x: x - halfSize, y: y - halfSize })
        }
      }
    }
  }

  return points
}
