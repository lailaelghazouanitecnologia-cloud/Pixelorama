/**
 * Color Harmony Utilities
 * Generate harmonious color palettes based on color theory
 */

export type HarmonyType =
  | 'complementary'
  | 'analogous'
  | 'triadic'
  | 'split-complementary'
  | 'tetradic'
  | 'square'
  | 'monochromatic'

export interface ColorHarmony {
  type: HarmonyType
  label: string
  description: string
  colors: string[]
}

// ============================================================================
// Color Conversion
// ============================================================================

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return { h: 0, s: 0, l: 50 }

  let r = parseInt(result[1], 16) / 255
  let g = parseInt(result[2], 16) / 255
  let b = parseInt(result[3], 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6
        break
      case g:
        h = ((b - r) / d + 2) / 6
        break
      case b:
        h = ((r - g) / d + 4) / 6
        break
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  }
}

function hslToHex(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360 // Normalize hue
  s = Math.max(0, Math.min(100, s)) / 100
  l = Math.max(0, Math.min(100, l)) / 100

  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2

  let r = 0, g = 0, b = 0

  if (h >= 0 && h < 60) {
    r = c; g = x; b = 0
  } else if (h >= 60 && h < 120) {
    r = x; g = c; b = 0
  } else if (h >= 120 && h < 180) {
    r = 0; g = c; b = x
  } else if (h >= 180 && h < 240) {
    r = 0; g = x; b = c
  } else if (h >= 240 && h < 300) {
    r = x; g = 0; b = c
  } else {
    r = c; g = 0; b = x
  }

  const toHex = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

// ============================================================================
// Harmony Generation
// ============================================================================

/**
 * Generate complementary colors (opposite on color wheel)
 */
function getComplementary(hex: string): string[] {
  const { h, s, l } = hexToHsl(hex)
  return [
    hex,
    hslToHex((h + 180) % 360, s, l),
  ]
}

/**
 * Generate analogous colors (adjacent on color wheel)
 */
function getAnalogous(hex: string): string[] {
  const { h, s, l } = hexToHsl(hex)
  return [
    hslToHex((h - 30 + 360) % 360, s, l),
    hex,
    hslToHex((h + 30) % 360, s, l),
  ]
}

/**
 * Generate triadic colors (evenly spaced, 120° apart)
 */
function getTriadic(hex: string): string[] {
  const { h, s, l } = hexToHsl(hex)
  return [
    hex,
    hslToHex((h + 120) % 360, s, l),
    hslToHex((h + 240) % 360, s, l),
  ]
}

/**
 * Generate split-complementary colors
 */
function getSplitComplementary(hex: string): string[] {
  const { h, s, l } = hexToHsl(hex)
  return [
    hex,
    hslToHex((h + 150) % 360, s, l),
    hslToHex((h + 210) % 360, s, l),
  ]
}

/**
 * Generate tetradic/rectangular colors (two complementary pairs)
 */
function getTetradic(hex: string): string[] {
  const { h, s, l } = hexToHsl(hex)
  return [
    hex,
    hslToHex((h + 60) % 360, s, l),
    hslToHex((h + 180) % 360, s, l),
    hslToHex((h + 240) % 360, s, l),
  ]
}

/**
 * Generate square colors (evenly spaced, 90° apart)
 */
function getSquare(hex: string): string[] {
  const { h, s, l } = hexToHsl(hex)
  return [
    hex,
    hslToHex((h + 90) % 360, s, l),
    hslToHex((h + 180) % 360, s, l),
    hslToHex((h + 270) % 360, s, l),
  ]
}

/**
 * Generate monochromatic colors (same hue, different lightness)
 */
function getMonochromatic(hex: string): string[] {
  const { h, s, l } = hexToHsl(hex)
  return [
    hslToHex(h, s, Math.max(10, l - 30)),
    hslToHex(h, s, Math.max(20, l - 15)),
    hex,
    hslToHex(h, s, Math.min(80, l + 15)),
    hslToHex(h, s, Math.min(90, l + 30)),
  ]
}

// ============================================================================
// Public API
// ============================================================================

export const HARMONY_TYPES: { type: HarmonyType; label: string; description: string }[] = [
  { type: 'complementary', label: 'Complementary', description: 'Opposite colors on the wheel' },
  { type: 'analogous', label: 'Analogous', description: 'Adjacent colors on the wheel' },
  { type: 'triadic', label: 'Triadic', description: 'Three evenly spaced colors' },
  { type: 'split-complementary', label: 'Split-Complementary', description: 'Color + two adjacent to complement' },
  { type: 'tetradic', label: 'Tetradic', description: 'Two complementary pairs' },
  { type: 'square', label: 'Square', description: 'Four evenly spaced colors' },
  { type: 'monochromatic', label: 'Monochromatic', description: 'Same hue, different lightness' },
]

/**
 * Generate color harmony based on type
 */
export function generateHarmony(baseColor: string, type: HarmonyType): ColorHarmony {
  const info = HARMONY_TYPES.find(h => h.type === type)!

  let colors: string[]
  switch (type) {
    case 'complementary':
      colors = getComplementary(baseColor)
      break
    case 'analogous':
      colors = getAnalogous(baseColor)
      break
    case 'triadic':
      colors = getTriadic(baseColor)
      break
    case 'split-complementary':
      colors = getSplitComplementary(baseColor)
      break
    case 'tetradic':
      colors = getTetradic(baseColor)
      break
    case 'square':
      colors = getSquare(baseColor)
      break
    case 'monochromatic':
      colors = getMonochromatic(baseColor)
      break
    default:
      colors = [baseColor]
  }

  return {
    type,
    label: info.label,
    description: info.description,
    colors,
  }
}

/**
 * Generate all harmonies for a color
 */
export function getAllHarmonies(baseColor: string): ColorHarmony[] {
  return HARMONY_TYPES.map(h => generateHarmony(baseColor, h.type))
}

/**
 * Get shades of a color (darker versions)
 */
export function getShades(hex: string, count: number = 5): string[] {
  const { h, s, l } = hexToHsl(hex)
  const shades: string[] = []
  const step = l / (count + 1)

  for (let i = count; i >= 1; i--) {
    shades.push(hslToHex(h, s, step * i))
  }

  return shades
}

/**
 * Get tints of a color (lighter versions)
 */
export function getTints(hex: string, count: number = 5): string[] {
  const { h, s, l } = hexToHsl(hex)
  const tints: string[] = []
  const maxL = 100 - l
  const step = maxL / (count + 1)

  for (let i = 1; i <= count; i++) {
    tints.push(hslToHex(h, s, l + step * i))
  }

  return tints
}

/**
 * Get full color ramp (shades + base + tints)
 */
export function getColorRamp(hex: string, count: number = 5): string[] {
  const shades = getShades(hex, Math.floor(count / 2))
  const tints = getTints(hex, Math.floor(count / 2))
  return [...shades, hex, ...tints]
}
