/**
 * Dithering Patterns for Pixel Art
 * Various dithering patterns for brush and fill tools
 */

export type DitherPattern = 'none' | 'checker' | 'vertical' | 'horizontal' | 'diagonal-left' | 'diagonal-right' | 'bayer2' | 'bayer4' | 'bayer8' | 'cross' | 'dots-sparse' | 'dots-dense'

/**
 * Dithering pattern definitions
 * Each pattern is a 2D matrix where 1 = draw, 0 = skip
 */
export const DITHER_PATTERNS: Record<DitherPattern, number[][]> = {
  none: [[1]],

  checker: [
    [1, 0],
    [0, 1],
  ],

  vertical: [
    [1, 0],
    [1, 0],
  ],

  horizontal: [
    [1, 1],
    [0, 0],
  ],

  'diagonal-left': [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ],

  'diagonal-right': [
    [0, 0, 1],
    [0, 1, 0],
    [1, 0, 0],
  ],

  bayer2: [
    [1, 0],
    [0, 1],
  ],

  bayer4: [
    [1, 0, 1, 0],
    [0, 0, 0, 0],
    [1, 0, 1, 0],
    [0, 1, 0, 1],
  ],

  bayer8: [
    [1, 0, 1, 0, 1, 0, 1, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [1, 0, 1, 0, 1, 0, 1, 0],
    [0, 0, 0, 1, 0, 0, 0, 1],
    [1, 0, 1, 0, 1, 0, 1, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [1, 0, 1, 0, 1, 0, 1, 0],
    [0, 1, 0, 0, 0, 1, 0, 0],
  ],

  cross: [
    [0, 1, 0],
    [1, 1, 1],
    [0, 1, 0],
  ],

  'dots-sparse': [
    [1, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 1, 0],
    [0, 0, 0, 0],
  ],

  'dots-dense': [
    [1, 0],
    [0, 0],
  ],
}

/**
 * Get list of available dither patterns with labels
 */
export const DITHER_PATTERN_OPTIONS: { value: DitherPattern; label: string }[] = [
  { value: 'none', label: 'None (Solid)' },
  { value: 'checker', label: 'Checkerboard' },
  { value: 'vertical', label: 'Vertical Lines' },
  { value: 'horizontal', label: 'Horizontal Lines' },
  { value: 'diagonal-left', label: 'Diagonal (Left)' },
  { value: 'diagonal-right', label: 'Diagonal (Right)' },
  { value: 'bayer2', label: 'Bayer 2x2' },
  { value: 'bayer4', label: 'Bayer 4x4' },
  { value: 'bayer8', label: 'Bayer 8x8' },
  { value: 'cross', label: 'Cross' },
  { value: 'dots-sparse', label: 'Dots (Sparse)' },
  { value: 'dots-dense', label: 'Dots (Dense)' },
]

/**
 * Check if a pixel should be drawn based on dither pattern
 * @param x - X coordinate
 * @param y - Y coordinate
 * @param pattern - Dither pattern to use
 * @returns true if pixel should be drawn
 */
export function shouldDrawDithered(x: number, y: number, pattern: DitherPattern): boolean {
  const matrix = DITHER_PATTERNS[pattern]
  const patternX = Math.abs(x) % matrix[0].length
  const patternY = Math.abs(y) % matrix.length
  return matrix[patternY][patternX] === 1
}

/**
 * Apply dither pattern to an opacity value using ordered dithering
 * Useful for gradients and transparency
 * @param x - X coordinate
 * @param y - Y coordinate
 * @param opacity - Opacity value (0-1)
 * @returns true if pixel should be drawn
 */
export function shouldDrawOrderedDither(x: number, y: number, opacity: number): boolean {
  // 4x4 Bayer matrix for ordered dithering
  const bayerMatrix = [
    [0,  8,  2, 10],
    [12, 4, 14,  6],
    [3, 11,  1,  9],
    [15, 7, 13,  5],
  ]

  const patternX = Math.abs(x) % 4
  const patternY = Math.abs(y) % 4
  const threshold = bayerMatrix[patternY][patternX] / 16

  return opacity > threshold
}

/**
 * Get a preview image data for a dither pattern
 */
export function getDitherPatternPreview(pattern: DitherPattern, size: number = 16): ImageData {
  const imageData = new ImageData(size, size)

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const draw = shouldDrawDithered(x, y, pattern)
      const idx = (y * size + x) * 4

      if (draw) {
        imageData.data[idx] = 255     // R
        imageData.data[idx + 1] = 255 // G
        imageData.data[idx + 2] = 255 // B
        imageData.data[idx + 3] = 255 // A
      } else {
        imageData.data[idx] = 0
        imageData.data[idx + 1] = 0
        imageData.data[idx + 2] = 0
        imageData.data[idx + 3] = 255
      }
    }
  }

  return imageData
}
