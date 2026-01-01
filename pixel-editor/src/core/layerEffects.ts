/**
 * Layer Effects System
 * Based on Pixelorama's layer effects functionality
 *
 * Provides non-destructive effects that can be applied to layers:
 * - Drop Shadow
 * - Inner Shadow
 * - Outer Glow
 * - Inner Glow
 * - Stroke/Outline
 * - Color Overlay
 * - Gradient Overlay
 * - Pattern Overlay
 */

// Effect types
export type EffectType =
  | 'drop-shadow'
  | 'inner-shadow'
  | 'outer-glow'
  | 'inner-glow'
  | 'stroke'
  | 'color-overlay'
  | 'gradient-overlay'

// Base effect interface
export interface LayerEffect {
  id: string
  type: EffectType
  enabled: boolean
  opacity: number // 0-100
}

// Drop Shadow effect
export interface DropShadowEffect extends LayerEffect {
  type: 'drop-shadow'
  color: string
  offsetX: number
  offsetY: number
  blur: number
  spread: number
}

// Inner Shadow effect
export interface InnerShadowEffect extends LayerEffect {
  type: 'inner-shadow'
  color: string
  offsetX: number
  offsetY: number
  blur: number
  choke: number
}

// Outer Glow effect
export interface OuterGlowEffect extends LayerEffect {
  type: 'outer-glow'
  color: string
  spread: number
  size: number
}

// Inner Glow effect
export interface InnerGlowEffect extends LayerEffect {
  type: 'inner-glow'
  color: string
  choke: number
  size: number
  source: 'center' | 'edge'
}

// Stroke effect
export interface StrokeEffect extends LayerEffect {
  type: 'stroke'
  color: string
  size: number
  position: 'outside' | 'inside' | 'center'
}

// Color Overlay effect
export interface ColorOverlayEffect extends LayerEffect {
  type: 'color-overlay'
  color: string
  blendMode: string
}

// Gradient Overlay effect
export interface GradientOverlayEffect extends LayerEffect {
  type: 'gradient-overlay'
  colors: string[]
  angle: number
  blendMode: string
}

// Union type for all effects
export type AnyLayerEffect =
  | DropShadowEffect
  | InnerShadowEffect
  | OuterGlowEffect
  | InnerGlowEffect
  | StrokeEffect
  | ColorOverlayEffect
  | GradientOverlayEffect

// Generate unique effect ID
export function generateEffectId(): string {
  return `effect-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

// Default effect values
export function createDropShadow(overrides: Partial<DropShadowEffect> = {}): DropShadowEffect {
  return {
    id: generateEffectId(),
    type: 'drop-shadow',
    enabled: true,
    opacity: 75,
    color: '#000000',
    offsetX: 2,
    offsetY: 2,
    blur: 2,
    spread: 0,
    ...overrides,
  }
}

export function createInnerShadow(overrides: Partial<InnerShadowEffect> = {}): InnerShadowEffect {
  return {
    id: generateEffectId(),
    type: 'inner-shadow',
    enabled: true,
    opacity: 75,
    color: '#000000',
    offsetX: 1,
    offsetY: 1,
    blur: 2,
    choke: 0,
    ...overrides,
  }
}

export function createOuterGlow(overrides: Partial<OuterGlowEffect> = {}): OuterGlowEffect {
  return {
    id: generateEffectId(),
    type: 'outer-glow',
    enabled: true,
    opacity: 75,
    color: '#ffff00',
    spread: 0,
    size: 3,
    ...overrides,
  }
}

export function createInnerGlow(overrides: Partial<InnerGlowEffect> = {}): InnerGlowEffect {
  return {
    id: generateEffectId(),
    type: 'inner-glow',
    enabled: true,
    opacity: 75,
    color: '#ffffff',
    choke: 0,
    size: 3,
    source: 'edge',
    ...overrides,
  }
}

export function createStroke(overrides: Partial<StrokeEffect> = {}): StrokeEffect {
  return {
    id: generateEffectId(),
    type: 'stroke',
    enabled: true,
    opacity: 100,
    color: '#000000',
    size: 1,
    position: 'outside',
    ...overrides,
  }
}

export function createColorOverlay(overrides: Partial<ColorOverlayEffect> = {}): ColorOverlayEffect {
  return {
    id: generateEffectId(),
    type: 'color-overlay',
    enabled: true,
    opacity: 100,
    color: '#ff0000',
    blendMode: 'normal',
    ...overrides,
  }
}

export function createGradientOverlay(overrides: Partial<GradientOverlayEffect> = {}): GradientOverlayEffect {
  return {
    id: generateEffectId(),
    type: 'gradient-overlay',
    enabled: true,
    opacity: 100,
    colors: ['#000000', '#ffffff'],
    angle: 90,
    blendMode: 'normal',
    ...overrides,
  }
}

// ============================================================================
// Effect Application Functions
// ============================================================================

/**
 * Apply all enabled effects to a layer's image data
 * Returns a new ImageData with effects applied
 */
export function applyLayerEffects(
  imageData: ImageData,
  effects: AnyLayerEffect[]
): ImageData {
  let result = new ImageData(
    new Uint8ClampedArray(imageData.data),
    imageData.width,
    imageData.height
  )

  // Apply effects in order (bottom to top)
  for (const effect of effects) {
    if (!effect.enabled) continue

    switch (effect.type) {
      case 'drop-shadow':
        result = applyDropShadow(result, effect)
        break
      case 'inner-shadow':
        result = applyInnerShadow(result, effect)
        break
      case 'outer-glow':
        result = applyOuterGlow(result, effect)
        break
      case 'inner-glow':
        result = applyInnerGlow(result, effect)
        break
      case 'stroke':
        result = applyStroke(result, effect)
        break
      case 'color-overlay':
        result = applyColorOverlay(result, effect)
        break
      case 'gradient-overlay':
        result = applyGradientOverlay(result, effect)
        break
    }
  }

  return result
}

/**
 * Apply drop shadow effect
 */
function applyDropShadow(imageData: ImageData, effect: DropShadowEffect): ImageData {
  const { width, height } = imageData
  const result = new ImageData(width, height)
  const srcData = imageData.data
  const dstData = result.data

  const color = hexToRgb(effect.color)
  const opacity = effect.opacity / 100

  // First pass: create shadow
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcX = x - effect.offsetX
      const srcY = y - effect.offsetY

      if (srcX >= 0 && srcX < width && srcY >= 0 && srcY < height) {
        const srcIdx = (srcY * width + srcX) * 4
        const dstIdx = (y * width + x) * 4

        if (srcData[srcIdx + 3] > 0) {
          const alpha = (srcData[srcIdx + 3] / 255) * opacity
          dstData[dstIdx] = color.r
          dstData[dstIdx + 1] = color.g
          dstData[dstIdx + 2] = color.b
          dstData[dstIdx + 3] = Math.round(alpha * 255)
        }
      }
    }
  }

  // Apply blur if needed
  if (effect.blur > 0) {
    blurImageData(result, effect.blur)
  }

  // Composite original on top
  for (let i = 0; i < srcData.length; i += 4) {
    if (srcData[i + 3] > 0) {
      const srcAlpha = srcData[i + 3] / 255
      const dstAlpha = dstData[i + 3] / 255

      if (srcAlpha >= dstAlpha) {
        dstData[i] = srcData[i]
        dstData[i + 1] = srcData[i + 1]
        dstData[i + 2] = srcData[i + 2]
        dstData[i + 3] = srcData[i + 3]
      } else {
        // Blend
        const outAlpha = srcAlpha + dstAlpha * (1 - srcAlpha)
        dstData[i] = Math.round((srcData[i] * srcAlpha + dstData[i] * dstAlpha * (1 - srcAlpha)) / outAlpha)
        dstData[i + 1] = Math.round((srcData[i + 1] * srcAlpha + dstData[i + 1] * dstAlpha * (1 - srcAlpha)) / outAlpha)
        dstData[i + 2] = Math.round((srcData[i + 2] * srcAlpha + dstData[i + 2] * dstAlpha * (1 - srcAlpha)) / outAlpha)
        dstData[i + 3] = Math.round(outAlpha * 255)
      }
    }
  }

  return result
}

/**
 * Apply inner shadow effect
 */
function applyInnerShadow(imageData: ImageData, effect: InnerShadowEffect): ImageData {
  const { width, height } = imageData
  const result = new ImageData(
    new Uint8ClampedArray(imageData.data),
    width,
    height
  )
  const data = result.data

  const color = hexToRgb(effect.color)
  const opacity = effect.opacity / 100

  // Create inverted alpha for inner shadow
  const shadow = new ImageData(width, height)
  const shadowData = shadow.data

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4
      const srcX = x - effect.offsetX
      const srcY = y - effect.offsetY

      if (srcX >= 0 && srcX < width && srcY >= 0 && srcY < height) {
        const srcIdx = (srcY * width + srcX) * 4
        // Inner shadow: show where original is opaque but shifted position is transparent
        if (data[idx + 3] > 0 && imageData.data[srcIdx + 3] === 0) {
          shadowData[idx] = color.r
          shadowData[idx + 1] = color.g
          shadowData[idx + 2] = color.b
          shadowData[idx + 3] = Math.round(data[idx + 3] * opacity)
        }
      }
    }
  }

  // Apply blur
  if (effect.blur > 0) {
    blurImageData(shadow, effect.blur)
  }

  // Composite shadow onto original (only where original is opaque)
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] > 0 && shadowData[i + 3] > 0) {
      const shadowAlpha = shadowData[i + 3] / 255
      data[i] = Math.round(data[i] * (1 - shadowAlpha) + shadowData[i] * shadowAlpha)
      data[i + 1] = Math.round(data[i + 1] * (1 - shadowAlpha) + shadowData[i + 1] * shadowAlpha)
      data[i + 2] = Math.round(data[i + 2] * (1 - shadowAlpha) + shadowData[i + 2] * shadowAlpha)
    }
  }

  return result
}

/**
 * Apply outer glow effect
 */
function applyOuterGlow(imageData: ImageData, effect: OuterGlowEffect): ImageData {
  const { width, height } = imageData
  const result = new ImageData(width, height)
  const srcData = imageData.data
  const dstData = result.data

  const color = hexToRgb(effect.color)
  const opacity = effect.opacity / 100

  // Expand the shape for glow
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4

      // Check if any nearby pixel is opaque
      let maxAlpha = 0
      const size = effect.size

      for (let dy = -size; dy <= size; dy++) {
        for (let dx = -size; dx <= size; dx++) {
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist > size) continue

          const nx = x + dx
          const ny = y + dy

          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const nIdx = (ny * width + nx) * 4
            if (srcData[nIdx + 3] > 0) {
              // Falloff based on distance
              const falloff = 1 - (dist / size)
              maxAlpha = Math.max(maxAlpha, srcData[nIdx + 3] * falloff)
            }
          }
        }
      }

      if (maxAlpha > 0) {
        dstData[idx] = color.r
        dstData[idx + 1] = color.g
        dstData[idx + 2] = color.b
        dstData[idx + 3] = Math.round(maxAlpha * opacity)
      }
    }
  }

  // Composite original on top
  for (let i = 0; i < srcData.length; i += 4) {
    if (srcData[i + 3] > 0) {
      dstData[i] = srcData[i]
      dstData[i + 1] = srcData[i + 1]
      dstData[i + 2] = srcData[i + 2]
      dstData[i + 3] = srcData[i + 3]
    }
  }

  return result
}

/**
 * Apply inner glow effect
 */
function applyInnerGlow(imageData: ImageData, effect: InnerGlowEffect): ImageData {
  const { width, height } = imageData
  const result = new ImageData(
    new Uint8ClampedArray(imageData.data),
    width,
    height
  )
  const data = result.data

  const color = hexToRgb(effect.color)
  const opacity = effect.opacity / 100

  // Find edge pixels and apply glow inward
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4

      if (imageData.data[idx + 3] === 0) continue

      // Check distance to edge
      let minDist = effect.size + 1

      for (let dy = -effect.size; dy <= effect.size; dy++) {
        for (let dx = -effect.size; dx <= effect.size; dx++) {
          const nx = x + dx
          const ny = y + dy

          if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
            const dist = Math.sqrt(dx * dx + dy * dy)
            minDist = Math.min(minDist, dist)
          } else {
            const nIdx = (ny * width + nx) * 4
            if (imageData.data[nIdx + 3] === 0) {
              const dist = Math.sqrt(dx * dx + dy * dy)
              minDist = Math.min(minDist, dist)
            }
          }
        }
      }

      if (minDist <= effect.size) {
        const glowIntensity = effect.source === 'edge'
          ? (1 - minDist / effect.size)
          : (minDist / effect.size)

        const alpha = glowIntensity * opacity

        data[idx] = Math.round(data[idx] * (1 - alpha) + color.r * alpha)
        data[idx + 1] = Math.round(data[idx + 1] * (1 - alpha) + color.g * alpha)
        data[idx + 2] = Math.round(data[idx + 2] * (1 - alpha) + color.b * alpha)
      }
    }
  }

  return result
}

/**
 * Apply stroke/outline effect
 */
function applyStroke(imageData: ImageData, effect: StrokeEffect): ImageData {
  const { width, height } = imageData
  const result = new ImageData(width, height)
  const srcData = imageData.data
  const dstData = result.data

  const color = hexToRgb(effect.color)
  const opacity = effect.opacity / 100
  const size = effect.size

  // Create outline mask
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4
      const isOpaque = srcData[idx + 3] > 0

      if (effect.position === 'outside' && !isOpaque) {
        // Check if near an opaque pixel
        let nearOpaque = false
        for (let dy = -size; dy <= size && !nearOpaque; dy++) {
          for (let dx = -size; dx <= size && !nearOpaque; dx++) {
            if (dx * dx + dy * dy > size * size) continue
            const nx = x + dx
            const ny = y + dy
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              const nIdx = (ny * width + nx) * 4
              if (srcData[nIdx + 3] > 0) nearOpaque = true
            }
          }
        }
        if (nearOpaque) {
          dstData[idx] = color.r
          dstData[idx + 1] = color.g
          dstData[idx + 2] = color.b
          dstData[idx + 3] = Math.round(255 * opacity)
        }
      } else if (effect.position === 'inside' && isOpaque) {
        // Check if near edge
        let nearEdge = false
        for (let dy = -size; dy <= size && !nearEdge; dy++) {
          for (let dx = -size; dx <= size && !nearEdge; dx++) {
            if (dx * dx + dy * dy > size * size) continue
            const nx = x + dx
            const ny = y + dy
            if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
              nearEdge = true
            } else {
              const nIdx = (ny * width + nx) * 4
              if (srcData[nIdx + 3] === 0) nearEdge = true
            }
          }
        }
        if (nearEdge) {
          dstData[idx] = color.r
          dstData[idx + 1] = color.g
          dstData[idx + 2] = color.b
          dstData[idx + 3] = Math.round(srcData[idx + 3] * opacity)
        } else {
          dstData[idx] = srcData[idx]
          dstData[idx + 1] = srcData[idx + 1]
          dstData[idx + 2] = srcData[idx + 2]
          dstData[idx + 3] = srcData[idx + 3]
        }
      } else if (effect.position === 'center') {
        // Both inside and outside
        let nearEdge = false
        if (isOpaque) {
          for (let dy = -size; dy <= size && !nearEdge; dy++) {
            for (let dx = -size; dx <= size && !nearEdge; dx++) {
              if (dx * dx + dy * dy > size * size) continue
              const nx = x + dx
              const ny = y + dy
              if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
                nearEdge = true
              } else {
                const nIdx = (ny * width + nx) * 4
                if (srcData[nIdx + 3] === 0) nearEdge = true
              }
            }
          }
        } else {
          for (let dy = -size; dy <= size && !nearEdge; dy++) {
            for (let dx = -size; dx <= size && !nearEdge; dx++) {
              if (dx * dx + dy * dy > size * size) continue
              const nx = x + dx
              const ny = y + dy
              if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                const nIdx = (ny * width + nx) * 4
                if (srcData[nIdx + 3] > 0) nearEdge = true
              }
            }
          }
        }
        if (nearEdge) {
          dstData[idx] = color.r
          dstData[idx + 1] = color.g
          dstData[idx + 2] = color.b
          dstData[idx + 3] = Math.round(255 * opacity)
        }
      }
    }
  }

  // Composite original on top (for outside stroke)
  if (effect.position === 'outside' || effect.position === 'center') {
    for (let i = 0; i < srcData.length; i += 4) {
      if (srcData[i + 3] > 0) {
        dstData[i] = srcData[i]
        dstData[i + 1] = srcData[i + 1]
        dstData[i + 2] = srcData[i + 2]
        dstData[i + 3] = srcData[i + 3]
      }
    }
  }

  return result
}

/**
 * Apply color overlay effect
 */
function applyColorOverlay(imageData: ImageData, effect: ColorOverlayEffect): ImageData {
  const result = new ImageData(
    new Uint8ClampedArray(imageData.data),
    imageData.width,
    imageData.height
  )
  const data = result.data

  const color = hexToRgb(effect.color)
  const opacity = effect.opacity / 100

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] > 0) {
      data[i] = Math.round(data[i] * (1 - opacity) + color.r * opacity)
      data[i + 1] = Math.round(data[i + 1] * (1 - opacity) + color.g * opacity)
      data[i + 2] = Math.round(data[i + 2] * (1 - opacity) + color.b * opacity)
    }
  }

  return result
}

/**
 * Apply gradient overlay effect
 */
function applyGradientOverlay(imageData: ImageData, effect: GradientOverlayEffect): ImageData {
  const { width, height } = imageData
  const result = new ImageData(
    new Uint8ClampedArray(imageData.data),
    width,
    height
  )
  const data = result.data

  const colors = effect.colors.map(hexToRgb)
  const opacity = effect.opacity / 100
  const angleRad = (effect.angle * Math.PI) / 180

  // Calculate gradient direction
  const cos = Math.cos(angleRad)
  const sin = Math.sin(angleRad)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4

      if (data[idx + 3] === 0) continue

      // Calculate position along gradient
      const nx = (x / width - 0.5)
      const ny = (y / height - 0.5)
      let t = (nx * cos + ny * sin) + 0.5
      t = Math.max(0, Math.min(1, t))

      // Interpolate between colors
      const colorT = t * (colors.length - 1)
      const colorIdx = Math.floor(colorT)
      const colorFrac = colorT - colorIdx

      const c1 = colors[Math.min(colorIdx, colors.length - 1)]
      const c2 = colors[Math.min(colorIdx + 1, colors.length - 1)]

      const r = Math.round(c1.r * (1 - colorFrac) + c2.r * colorFrac)
      const g = Math.round(c1.g * (1 - colorFrac) + c2.g * colorFrac)
      const b = Math.round(c1.b * (1 - colorFrac) + c2.b * colorFrac)

      data[idx] = Math.round(data[idx] * (1 - opacity) + r * opacity)
      data[idx + 1] = Math.round(data[idx + 1] * (1 - opacity) + g * opacity)
      data[idx + 2] = Math.round(data[idx + 2] * (1 - opacity) + b * opacity)
    }
  }

  return result
}

// ============================================================================
// Helper Functions
// ============================================================================

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  } : { r: 0, g: 0, b: 0 }
}

/**
 * Simple box blur for shadow/glow effects
 */
function blurImageData(imageData: ImageData, radius: number): void {
  const { width, height } = imageData
  const data = imageData.data
  const temp = new Uint8ClampedArray(data.length)

  // Horizontal pass
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0, a = 0
      let count = 0

      for (let dx = -radius; dx <= radius; dx++) {
        const nx = x + dx
        if (nx >= 0 && nx < width) {
          const idx = (y * width + nx) * 4
          r += data[idx]
          g += data[idx + 1]
          b += data[idx + 2]
          a += data[idx + 3]
          count++
        }
      }

      const idx = (y * width + x) * 4
      temp[idx] = r / count
      temp[idx + 1] = g / count
      temp[idx + 2] = b / count
      temp[idx + 3] = a / count
    }
  }

  // Vertical pass
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0, a = 0
      let count = 0

      for (let dy = -radius; dy <= radius; dy++) {
        const ny = y + dy
        if (ny >= 0 && ny < height) {
          const idx = (ny * width + x) * 4
          r += temp[idx]
          g += temp[idx + 1]
          b += temp[idx + 2]
          a += temp[idx + 3]
          count++
        }
      }

      const idx = (y * width + x) * 4
      data[idx] = r / count
      data[idx + 1] = g / count
      data[idx + 2] = b / count
      data[idx + 3] = a / count
    }
  }
}

/**
 * Get effect display name
 */
export function getEffectDisplayName(type: EffectType): string {
  const names: Record<EffectType, string> = {
    'drop-shadow': 'Drop Shadow',
    'inner-shadow': 'Inner Shadow',
    'outer-glow': 'Outer Glow',
    'inner-glow': 'Inner Glow',
    'stroke': 'Stroke',
    'color-overlay': 'Color Overlay',
    'gradient-overlay': 'Gradient Overlay',
  }
  return names[type]
}

/**
 * Get all available effect types
 */
export function getAvailableEffectTypes(): EffectType[] {
  return [
    'drop-shadow',
    'inner-shadow',
    'outer-glow',
    'inner-glow',
    'stroke',
    'color-overlay',
    'gradient-overlay',
  ]
}
