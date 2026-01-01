/**
 * Palette Import/Export Utilities
 * Supports various palette formats: GPL, PAL, JSON, HEX, ASE, ACO
 */

export interface PaletteData {
  name: string
  colors: string[]
}

// ============================================================================
// Export Functions
// ============================================================================

/**
 * Export palette to GIMP Palette format (.gpl)
 */
export function exportToGPL(colors: string[], name: string = 'Pixel Editor Palette'): string {
  const lines = [
    'GIMP Palette',
    `Name: ${name}`,
    'Columns: 8',
    '#',
  ]

  for (const color of colors) {
    const rgb = hexToRgb(color)
    if (rgb) {
      lines.push(`${rgb.r.toString().padStart(3)} ${rgb.g.toString().padStart(3)} ${rgb.b.toString().padStart(3)}\t${color}`)
    }
  }

  return lines.join('\n')
}

/**
 * Export palette to PAL format (JASC-PAL)
 */
export function exportToPAL(colors: string[]): string {
  const lines = [
    'JASC-PAL',
    '0100',
    colors.length.toString(),
  ]

  for (const color of colors) {
    const rgb = hexToRgb(color)
    if (rgb) {
      lines.push(`${rgb.r} ${rgb.g} ${rgb.b}`)
    }
  }

  return lines.join('\n')
}

/**
 * Export palette to JSON format
 */
export function exportToJSON(colors: string[], name: string = 'Pixel Editor Palette'): string {
  return JSON.stringify({
    name,
    colors,
    format: 'pixel-editor-palette',
    version: 1,
  }, null, 2)
}

/**
 * Export palette to HEX text (one color per line)
 */
export function exportToHEX(colors: string[]): string {
  return colors.map(c => c.replace('#', '').toUpperCase()).join('\n')
}

/**
 * Export palette to CSS format
 */
export function exportToCSS(colors: string[], name: string = 'palette'): string {
  const varName = name.toLowerCase().replace(/[^a-z0-9]/g, '-')
  const lines = [':root {']

  colors.forEach((color, i) => {
    lines.push(`  --${varName}-${i + 1}: ${color};`)
  })

  lines.push('}')
  return lines.join('\n')
}

// ============================================================================
// Import Functions
// ============================================================================

/**
 * Parse GIMP Palette format (.gpl)
 */
export function parseGPL(content: string): PaletteData | null {
  const lines = content.split('\n').map(l => l.trim())

  if (!lines[0] || !lines[0].includes('GIMP Palette')) {
    return null
  }

  const colors: string[] = []
  let name = 'Imported Palette'

  for (const line of lines) {
    if (line.startsWith('Name:')) {
      name = line.substring(5).trim()
    } else if (line.startsWith('#') || line.startsWith('Columns:') || line === 'GIMP Palette') {
      continue
    } else if (line) {
      const match = line.match(/^\s*(\d+)\s+(\d+)\s+(\d+)/)
      if (match) {
        const r = parseInt(match[1])
        const g = parseInt(match[2])
        const b = parseInt(match[3])
        colors.push(rgbToHex(r, g, b))
      }
    }
  }

  return colors.length > 0 ? { name, colors } : null
}

/**
 * Parse JASC-PAL format (.pal)
 */
export function parsePAL(content: string): PaletteData | null {
  const lines = content.split('\n').map(l => l.trim())

  if (!lines[0] || !lines[0].includes('JASC-PAL')) {
    return null
  }

  const colors: string[] = []

  // Skip header lines (JASC-PAL, version, count)
  for (let i = 3; i < lines.length; i++) {
    const line = lines[i]
    if (line) {
      const parts = line.split(/\s+/)
      if (parts.length >= 3) {
        const r = parseInt(parts[0])
        const g = parseInt(parts[1])
        const b = parseInt(parts[2])
        if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
          colors.push(rgbToHex(r, g, b))
        }
      }
    }
  }

  return colors.length > 0 ? { name: 'Imported Palette', colors } : null
}

/**
 * Parse JSON palette format
 */
export function parseJSON(content: string): PaletteData | null {
  try {
    const data = JSON.parse(content)

    if (Array.isArray(data)) {
      // Simple array of colors
      const colors = data.filter(c => typeof c === 'string' && /^#[0-9A-Fa-f]{6}$/.test(c))
      return colors.length > 0 ? { name: 'Imported Palette', colors } : null
    }

    if (data.colors && Array.isArray(data.colors)) {
      const colors = data.colors.filter((c: unknown) => typeof c === 'string' && /^#[0-9A-Fa-f]{6}$/i.test(c as string))
        .map((c: string) => c.toLowerCase())
      return colors.length > 0 ? { name: data.name || 'Imported Palette', colors } : null
    }

    return null
  } catch {
    return null
  }
}

/**
 * Parse HEX text format (one color per line)
 */
export function parseHEX(content: string): PaletteData | null {
  const lines = content.split('\n').map(l => l.trim())
  const colors: string[] = []

  for (const line of lines) {
    const cleanLine = line.replace('#', '').toUpperCase()
    if (/^[0-9A-F]{6}$/.test(cleanLine)) {
      colors.push(`#${cleanLine.toLowerCase()}`)
    } else if (/^[0-9A-F]{3}$/.test(cleanLine)) {
      // Short hex format
      const expanded = cleanLine.split('').map(c => c + c).join('')
      colors.push(`#${expanded.toLowerCase()}`)
    }
  }

  return colors.length > 0 ? { name: 'Imported Palette', colors } : null
}

/**
 * Auto-detect and parse palette from content
 */
export function parsePalette(content: string, filename?: string): PaletteData | null {
  const ext = filename?.toLowerCase().split('.').pop()

  // Try by extension first
  if (ext === 'gpl') {
    const result = parseGPL(content)
    if (result) return result
  }

  if (ext === 'pal') {
    const result = parsePAL(content)
    if (result) return result
  }

  if (ext === 'json') {
    const result = parseJSON(content)
    if (result) return result
  }

  if (ext === 'hex' || ext === 'txt') {
    const result = parseHEX(content)
    if (result) return result
  }

  // Auto-detect by content
  if (content.includes('GIMP Palette')) {
    return parseGPL(content)
  }

  if (content.includes('JASC-PAL')) {
    return parsePAL(content)
  }

  if (content.trim().startsWith('{') || content.trim().startsWith('[')) {
    return parseJSON(content)
  }

  // Try HEX format as fallback
  return parseHEX(content)
}

// ============================================================================
// File Operations
// ============================================================================

/**
 * Export palette to file
 */
export function downloadPalette(colors: string[], format: 'gpl' | 'pal' | 'json' | 'hex' | 'css', name: string = 'palette'): void {
  let content: string
  let extension: string
  let mimeType: string

  switch (format) {
    case 'gpl':
      content = exportToGPL(colors, name)
      extension = 'gpl'
      mimeType = 'text/plain'
      break
    case 'pal':
      content = exportToPAL(colors)
      extension = 'pal'
      mimeType = 'text/plain'
      break
    case 'json':
      content = exportToJSON(colors, name)
      extension = 'json'
      mimeType = 'application/json'
      break
    case 'hex':
      content = exportToHEX(colors)
      extension = 'hex'
      mimeType = 'text/plain'
      break
    case 'css':
      content = exportToCSS(colors, name)
      extension = 'css'
      mimeType = 'text/css'
      break
  }

  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = `${name}.${extension}`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Open file dialog and import palette
 */
export function openPaletteDialog(): Promise<PaletteData | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.gpl,.pal,.json,.hex,.txt'

    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) {
        resolve(null)
        return
      }

      try {
        const content = await file.text()
        const result = parsePalette(content, file.name)
        resolve(result)
      } catch {
        resolve(null)
      }
    }

    input.oncancel = () => resolve(null)
    input.click()
  })
}

// ============================================================================
// Utility Functions
// ============================================================================

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  } : null
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
}

// ============================================================================
// Preset Palettes
// ============================================================================

export const PRESET_PALETTES: Record<string, string[]> = {
  'PICO-8': [
    '#000000', '#1d2b53', '#7e2553', '#008751',
    '#ab5236', '#5f574f', '#c2c3c7', '#fff1e8',
    '#ff004d', '#ffa300', '#ffec27', '#00e436',
    '#29adff', '#83769c', '#ff77a8', '#ffccaa',
  ],
  'Gameboy': [
    '#0f380f', '#306230', '#8bac0f', '#9bbc0f',
  ],
  'CGA': [
    '#000000', '#555555', '#aaaaaa', '#ffffff',
    '#0000aa', '#5555ff', '#00aa00', '#55ff55',
    '#00aaaa', '#55ffff', '#aa0000', '#ff5555',
    '#aa00aa', '#ff55ff', '#aa5500', '#ffff55',
  ],
  'NES': [
    '#000000', '#fcfcfc', '#f8f8f8', '#bcbcbc',
    '#7c7c7c', '#a4e4fc', '#3cbcfc', '#0078f8',
    '#0000fc', '#b8b8f8', '#6888fc', '#0058f8',
    '#0000bc', '#d8b8f8', '#9878f8', '#6844fc',
    '#4428bc', '#f8b8f8', '#f878f8', '#d800cc',
    '#940084', '#f8a4c0', '#f85898', '#e40058',
    '#a80020', '#f0d0b0', '#f87858', '#f83800',
    '#a81000', '#fce0a8', '#fca044', '#e45c10',
    '#881400', '#f8d878', '#f8b800', '#ac7c00',
    '#503000', '#d8f878', '#b8f818', '#00b800',
    '#007800', '#b8f8b8', '#58d854', '#00a800',
    '#006800', '#b8f8d8', '#58f898', '#00a844',
    '#005800', '#00fcfc', '#00e8d8', '#008888',
    '#004058', '#f8d8f8', '#787878', '#000000',
  ],
  'Endesga 32': [
    '#be4a2f', '#d77643', '#ead4aa', '#e4a672',
    '#b86f50', '#733e39', '#3e2731', '#a22633',
    '#e43b44', '#f77622', '#feae34', '#fee761',
    '#63c74d', '#3e8948', '#265c42', '#193c3e',
    '#124e89', '#0099db', '#2ce8f5', '#ffffff',
    '#c0cbdc', '#8b9bb4', '#5a6988', '#3a4466',
    '#262b44', '#181425', '#ff0044', '#68386c',
    '#b55088', '#f6757a', '#e8b796', '#c28569',
  ],
}
