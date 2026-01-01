/**
 * Image Effects System
 * Based on Pixelorama's effects and filters
 * Provides non-destructive image manipulation
 */

export interface EffectParams {
  [key: string]: number | boolean | string
}

export interface Effect {
  id: string
  name: string
  category: 'color' | 'blur' | 'transform' | 'stylize'
  params: EffectParams
  defaultParams: EffectParams
  apply: (imageData: ImageData, params: EffectParams) => ImageData
}

// === UTILITY FUNCTIONS ===

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  r /= 255
  g /= 255
  b /= 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min

  let h = 0
  let s = max === 0 ? 0 : delta / max
  let v = max

  if (delta !== 0) {
    if (max === r) {
      h = ((g - b) / delta) % 6
    } else if (max === g) {
      h = (b - r) / delta + 2
    } else {
      h = (r - g) / delta + 4
    }
    h *= 60
    if (h < 0) h += 360
  }

  return [h, s, v]
}

function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  h = ((h % 360) + 360) % 360
  const c = v * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = v - c

  let r = 0, g = 0, b = 0

  if (h < 60) { r = c; g = x; b = 0 }
  else if (h < 120) { r = x; g = c; b = 0 }
  else if (h < 180) { r = 0; g = c; b = x }
  else if (h < 240) { r = 0; g = x; b = c }
  else if (h < 300) { r = x; g = 0; b = c }
  else { r = c; g = 0; b = x }

  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255)
  ]
}

// === COLOR EFFECTS ===

export function applyBrightnessContrast(
  imageData: ImageData,
  brightness: number, // -100 to 100
  contrast: number    // -100 to 100
): ImageData {
  const data = new Uint8ClampedArray(imageData.data)
  const factor = (259 * (contrast + 255)) / (255 * (259 - contrast))

  for (let i = 0; i < data.length; i += 4) {
    // Apply brightness first
    let r = data[i] + brightness * 2.55
    let g = data[i + 1] + brightness * 2.55
    let b = data[i + 2] + brightness * 2.55

    // Apply contrast
    r = factor * (r - 128) + 128
    g = factor * (g - 128) + 128
    b = factor * (b - 128) + 128

    data[i] = clamp(r, 0, 255)
    data[i + 1] = clamp(g, 0, 255)
    data[i + 2] = clamp(b, 0, 255)
  }

  return new ImageData(data, imageData.width, imageData.height)
}

export function applyHsvAdjustment(
  imageData: ImageData,
  hueShift: number,      // -180 to 180
  saturation: number,    // -100 to 100
  value: number          // -100 to 100
): ImageData {
  const data = new Uint8ClampedArray(imageData.data)
  const satFactor = 1 + saturation / 100
  const valFactor = 1 + value / 100

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue // Skip transparent pixels

    const [h, s, v] = rgbToHsv(data[i], data[i + 1], data[i + 2])

    const newH = (h + hueShift + 360) % 360
    const newS = clamp(s * satFactor, 0, 1)
    const newV = clamp(v * valFactor, 0, 1)

    const [r, g, b] = hsvToRgb(newH, newS, newV)
    data[i] = r
    data[i + 1] = g
    data[i + 2] = b
  }

  return new ImageData(data, imageData.width, imageData.height)
}

export function applyInvert(imageData: ImageData): ImageData {
  const data = new Uint8ClampedArray(imageData.data)

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue
    data[i] = 255 - data[i]
    data[i + 1] = 255 - data[i + 1]
    data[i + 2] = 255 - data[i + 2]
  }

  return new ImageData(data, imageData.width, imageData.height)
}

export function applyDesaturate(imageData: ImageData, amount: number = 100): ImageData {
  const data = new Uint8ClampedArray(imageData.data)
  const factor = amount / 100

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue

    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
    data[i] = data[i] + factor * (gray - data[i])
    data[i + 1] = data[i + 1] + factor * (gray - data[i + 1])
    data[i + 2] = data[i + 2] + factor * (gray - data[i + 2])
  }

  return new ImageData(data, imageData.width, imageData.height)
}

export function applyPosterize(imageData: ImageData, levels: number = 4): ImageData {
  const data = new Uint8ClampedArray(imageData.data)
  const step = 255 / (levels - 1)

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue

    data[i] = Math.round(Math.round(data[i] / step) * step)
    data[i + 1] = Math.round(Math.round(data[i + 1] / step) * step)
    data[i + 2] = Math.round(Math.round(data[i + 2] / step) * step)
  }

  return new ImageData(data, imageData.width, imageData.height)
}

export function applyColorize(
  imageData: ImageData,
  hue: number,        // 0-360
  saturation: number, // 0-100
  preserveLuminosity: boolean = true
): ImageData {
  const data = new Uint8ClampedArray(imageData.data)
  const sat = saturation / 100

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue

    const luminosity = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
    const v = preserveLuminosity ? luminosity / 255 : 0.5

    const [r, g, b] = hsvToRgb(hue, sat, v)
    data[i] = r
    data[i + 1] = g
    data[i + 2] = b
  }

  return new ImageData(data, imageData.width, imageData.height)
}

// === BLUR EFFECTS ===

export function applyGaussianBlur(imageData: ImageData, radius: number = 1): ImageData {
  const width = imageData.width
  const height = imageData.height
  const srcData = imageData.data
  const dstData = new Uint8ClampedArray(srcData.length)

  // Simple box blur approximation (faster than true Gaussian)
  const size = radius * 2 + 1
  const area = size * size

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0, a = 0, count = 0

      for (let ky = -radius; ky <= radius; ky++) {
        for (let kx = -radius; kx <= radius; kx++) {
          const px = clamp(x + kx, 0, width - 1)
          const py = clamp(y + ky, 0, height - 1)
          const idx = (py * width + px) * 4

          r += srcData[idx]
          g += srcData[idx + 1]
          b += srcData[idx + 2]
          a += srcData[idx + 3]
          count++
        }
      }

      const dstIdx = (y * width + x) * 4
      dstData[dstIdx] = r / count
      dstData[dstIdx + 1] = g / count
      dstData[dstIdx + 2] = b / count
      dstData[dstIdx + 3] = a / count
    }
  }

  return new ImageData(dstData, width, height)
}

export function applyPixelize(imageData: ImageData, blockSize: number = 4): ImageData {
  const width = imageData.width
  const height = imageData.height
  const srcData = imageData.data
  const dstData = new Uint8ClampedArray(srcData.length)

  for (let by = 0; by < height; by += blockSize) {
    for (let bx = 0; bx < width; bx += blockSize) {
      let r = 0, g = 0, b = 0, a = 0, count = 0

      // Calculate average color for block
      for (let y = by; y < Math.min(by + blockSize, height); y++) {
        for (let x = bx; x < Math.min(bx + blockSize, width); x++) {
          const idx = (y * width + x) * 4
          r += srcData[idx]
          g += srcData[idx + 1]
          b += srcData[idx + 2]
          a += srcData[idx + 3]
          count++
        }
      }

      r = Math.round(r / count)
      g = Math.round(g / count)
      b = Math.round(b / count)
      a = Math.round(a / count)

      // Fill block with average color
      for (let y = by; y < Math.min(by + blockSize, height); y++) {
        for (let x = bx; x < Math.min(bx + blockSize, width); x++) {
          const idx = (y * width + x) * 4
          dstData[idx] = r
          dstData[idx + 1] = g
          dstData[idx + 2] = b
          dstData[idx + 3] = a
        }
      }
    }
  }

  return new ImageData(dstData, width, height)
}

// === MORE COLOR EFFECTS ===

export function applySepia(imageData: ImageData, amount: number = 100): ImageData {
  const data = new Uint8ClampedArray(imageData.data)
  const factor = amount / 100

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue

    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]

    // Sepia formula
    const tr = 0.393 * r + 0.769 * g + 0.189 * b
    const tg = 0.349 * r + 0.686 * g + 0.168 * b
    const tb = 0.272 * r + 0.534 * g + 0.131 * b

    data[i] = clamp(r + factor * (tr - r), 0, 255)
    data[i + 1] = clamp(g + factor * (tg - g), 0, 255)
    data[i + 2] = clamp(b + factor * (tb - b), 0, 255)
  }

  return new ImageData(data, imageData.width, imageData.height)
}

export function applySharpen(imageData: ImageData, amount: number = 50): ImageData {
  const width = imageData.width
  const height = imageData.height
  const srcData = imageData.data
  const dstData = new Uint8ClampedArray(srcData.length)
  const factor = amount / 100

  // Sharpen kernel
  const kernel = [
    0, -1, 0,
    -1, 5, -1,
    0, -1, 0
  ]

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4

      if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
        // Edge pixels - just copy
        dstData[idx] = srcData[idx]
        dstData[idx + 1] = srcData[idx + 1]
        dstData[idx + 2] = srcData[idx + 2]
        dstData[idx + 3] = srcData[idx + 3]
        continue
      }

      let r = 0, g = 0, b = 0
      let ki = 0

      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const pidx = ((y + ky) * width + (x + kx)) * 4
          r += srcData[pidx] * kernel[ki]
          g += srcData[pidx + 1] * kernel[ki]
          b += srcData[pidx + 2] * kernel[ki]
          ki++
        }
      }

      // Blend with original based on amount
      dstData[idx] = clamp(srcData[idx] + factor * (r - srcData[idx]), 0, 255)
      dstData[idx + 1] = clamp(srcData[idx + 1] + factor * (g - srcData[idx + 1]), 0, 255)
      dstData[idx + 2] = clamp(srcData[idx + 2] + factor * (b - srcData[idx + 2]), 0, 255)
      dstData[idx + 3] = srcData[idx + 3]
    }
  }

  return new ImageData(dstData, width, height)
}

export function applyEdgeDetect(imageData: ImageData): ImageData {
  const width = imageData.width
  const height = imageData.height
  const srcData = imageData.data
  const dstData = new Uint8ClampedArray(srcData.length)

  // Sobel kernels
  const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1]
  const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1]

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4

      if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
        dstData[idx] = 0
        dstData[idx + 1] = 0
        dstData[idx + 2] = 0
        dstData[idx + 3] = srcData[idx + 3]
        continue
      }

      let gxR = 0, gxG = 0, gxB = 0
      let gyR = 0, gyG = 0, gyB = 0
      let ki = 0

      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const pidx = ((y + ky) * width + (x + kx)) * 4
          gxR += srcData[pidx] * sobelX[ki]
          gxG += srcData[pidx + 1] * sobelX[ki]
          gxB += srcData[pidx + 2] * sobelX[ki]
          gyR += srcData[pidx] * sobelY[ki]
          gyG += srcData[pidx + 1] * sobelY[ki]
          gyB += srcData[pidx + 2] * sobelY[ki]
          ki++
        }
      }

      const r = Math.sqrt(gxR * gxR + gyR * gyR)
      const g = Math.sqrt(gxG * gxG + gyG * gyG)
      const b = Math.sqrt(gxB * gxB + gyB * gyB)

      dstData[idx] = clamp(r, 0, 255)
      dstData[idx + 1] = clamp(g, 0, 255)
      dstData[idx + 2] = clamp(b, 0, 255)
      dstData[idx + 3] = srcData[idx + 3]
    }
  }

  return new ImageData(dstData, width, height)
}

export function applyGradientMap(
  imageData: ImageData,
  colorStart: string,
  colorEnd: string
): ImageData {
  const data = new Uint8ClampedArray(imageData.data)

  // Parse colors
  const startR = parseInt(colorStart.slice(1, 3), 16)
  const startG = parseInt(colorStart.slice(3, 5), 16)
  const startB = parseInt(colorStart.slice(5, 7), 16)
  const endR = parseInt(colorEnd.slice(1, 3), 16)
  const endG = parseInt(colorEnd.slice(3, 5), 16)
  const endB = parseInt(colorEnd.slice(5, 7), 16)

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue

    // Convert to grayscale luminosity
    const lum = (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255

    // Interpolate between colors based on luminosity
    data[i] = startR + lum * (endR - startR)
    data[i + 1] = startG + lum * (endG - startG)
    data[i + 2] = startB + lum * (endB - startB)
  }

  return new ImageData(data, imageData.width, imageData.height)
}

export function applyThreshold(imageData: ImageData, threshold: number = 128): ImageData {
  const data = new Uint8ClampedArray(imageData.data)

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue

    const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
    const value = lum >= threshold ? 255 : 0

    data[i] = value
    data[i + 1] = value
    data[i + 2] = value
  }

  return new ImageData(data, imageData.width, imageData.height)
}

// === STYLIZE EFFECTS ===

export function applyOutline(
  imageData: ImageData,
  color: string = '#000000',
  thickness: number = 1,
  inside: boolean = false
): ImageData {
  const width = imageData.width
  const height = imageData.height
  const srcData = imageData.data
  const dstData = new Uint8ClampedArray(srcData)

  // Parse color
  const r = parseInt(color.slice(1, 3), 16)
  const g = parseInt(color.slice(3, 5), 16)
  const b = parseInt(color.slice(5, 7), 16)

  // Find edge pixels
  const isOpaque = (x: number, y: number): boolean => {
    if (x < 0 || x >= width || y < 0 || y >= height) return false
    return srcData[(y * width + x) * 4 + 3] > 0
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4
      const currentOpaque = srcData[idx + 3] > 0

      // Check if this is an edge pixel
      let isEdge = false
      for (let t = 1; t <= thickness; t++) {
        if (inside) {
          // Inside outline: opaque pixel next to transparent
          if (currentOpaque && (
            !isOpaque(x - t, y) || !isOpaque(x + t, y) ||
            !isOpaque(x, y - t) || !isOpaque(x, y + t)
          )) {
            isEdge = true
            break
          }
        } else {
          // Outside outline: transparent pixel next to opaque
          if (!currentOpaque && (
            isOpaque(x - t, y) || isOpaque(x + t, y) ||
            isOpaque(x, y - t) || isOpaque(x, y + t)
          )) {
            isEdge = true
            break
          }
        }
      }

      if (isEdge) {
        dstData[idx] = r
        dstData[idx + 1] = g
        dstData[idx + 2] = b
        dstData[idx + 3] = 255
      }
    }
  }

  return new ImageData(dstData, width, height)
}

export function applyDropShadow(
  imageData: ImageData,
  color: string = '#000000',
  offsetX: number = 2,
  offsetY: number = 2,
  opacity: number = 50
): ImageData {
  const width = imageData.width
  const height = imageData.height
  const srcData = imageData.data
  const dstData = new Uint8ClampedArray(srcData.length)

  // Parse color
  const sr = parseInt(color.slice(1, 3), 16)
  const sg = parseInt(color.slice(3, 5), 16)
  const sb = parseInt(color.slice(5, 7), 16)
  const shadowAlpha = opacity / 100

  // Draw shadow first
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcX = x - offsetX
      const srcY = y - offsetY

      if (srcX >= 0 && srcX < width && srcY >= 0 && srcY < height) {
        const srcIdx = (srcY * width + srcX) * 4
        const dstIdx = (y * width + x) * 4

        if (srcData[srcIdx + 3] > 0) {
          const alpha = (srcData[srcIdx + 3] / 255) * shadowAlpha
          dstData[dstIdx] = sr
          dstData[dstIdx + 1] = sg
          dstData[dstIdx + 2] = sb
          dstData[dstIdx + 3] = Math.round(alpha * 255)
        }
      }
    }
  }

  // Draw original image on top
  for (let i = 0; i < srcData.length; i += 4) {
    if (srcData[i + 3] > 0) {
      const srcAlpha = srcData[i + 3] / 255
      const dstAlpha = dstData[i + 3] / 255
      const outAlpha = srcAlpha + dstAlpha * (1 - srcAlpha)

      if (outAlpha > 0) {
        dstData[i] = (srcData[i] * srcAlpha + dstData[i] * dstAlpha * (1 - srcAlpha)) / outAlpha
        dstData[i + 1] = (srcData[i + 1] * srcAlpha + dstData[i + 1] * dstAlpha * (1 - srcAlpha)) / outAlpha
        dstData[i + 2] = (srcData[i + 2] * srcAlpha + dstData[i + 2] * dstAlpha * (1 - srcAlpha)) / outAlpha
        dstData[i + 3] = Math.round(outAlpha * 255)
      }
    }
  }

  return new ImageData(dstData, width, height)
}

// === TRANSFORM EFFECTS ===

export function applyFlipHorizontal(imageData: ImageData): ImageData {
  const width = imageData.width
  const height = imageData.height
  const srcData = imageData.data
  const dstData = new Uint8ClampedArray(srcData.length)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcIdx = (y * width + x) * 4
      const dstIdx = (y * width + (width - 1 - x)) * 4

      dstData[dstIdx] = srcData[srcIdx]
      dstData[dstIdx + 1] = srcData[srcIdx + 1]
      dstData[dstIdx + 2] = srcData[srcIdx + 2]
      dstData[dstIdx + 3] = srcData[srcIdx + 3]
    }
  }

  return new ImageData(dstData, width, height)
}

export function applyFlipVertical(imageData: ImageData): ImageData {
  const width = imageData.width
  const height = imageData.height
  const srcData = imageData.data
  const dstData = new Uint8ClampedArray(srcData.length)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcIdx = (y * width + x) * 4
      const dstIdx = ((height - 1 - y) * width + x) * 4

      dstData[dstIdx] = srcData[srcIdx]
      dstData[dstIdx + 1] = srcData[srcIdx + 1]
      dstData[dstIdx + 2] = srcData[srcIdx + 2]
      dstData[dstIdx + 3] = srcData[srcIdx + 3]
    }
  }

  return new ImageData(dstData, width, height)
}

export function applyRotate90CW(imageData: ImageData): ImageData {
  const width = imageData.width
  const height = imageData.height
  const srcData = imageData.data
  const dstData = new Uint8ClampedArray(srcData.length)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcIdx = (y * width + x) * 4
      const dstX = height - 1 - y
      const dstY = x
      const dstIdx = (dstY * height + dstX) * 4

      dstData[dstIdx] = srcData[srcIdx]
      dstData[dstIdx + 1] = srcData[srcIdx + 1]
      dstData[dstIdx + 2] = srcData[srcIdx + 2]
      dstData[dstIdx + 3] = srcData[srcIdx + 3]
    }
  }

  return new ImageData(dstData, height, width)
}

export function applyRotate90CCW(imageData: ImageData): ImageData {
  const width = imageData.width
  const height = imageData.height
  const srcData = imageData.data
  const dstData = new Uint8ClampedArray(srcData.length)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcIdx = (y * width + x) * 4
      const dstX = y
      const dstY = width - 1 - x
      const dstIdx = (dstY * height + dstX) * 4

      dstData[dstIdx] = srcData[srcIdx]
      dstData[dstIdx + 1] = srcData[srcIdx + 1]
      dstData[dstIdx + 2] = srcData[srcIdx + 2]
      dstData[dstIdx + 3] = srcData[srcIdx + 3]
    }
  }

  return new ImageData(dstData, height, width)
}

export function applyRotate180(imageData: ImageData): ImageData {
  const width = imageData.width
  const height = imageData.height
  const srcData = imageData.data
  const dstData = new Uint8ClampedArray(srcData.length)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcIdx = (y * width + x) * 4
      const dstIdx = ((height - 1 - y) * width + (width - 1 - x)) * 4

      dstData[dstIdx] = srcData[srcIdx]
      dstData[dstIdx + 1] = srcData[srcIdx + 1]
      dstData[dstIdx + 2] = srcData[srcIdx + 2]
      dstData[dstIdx + 3] = srcData[srcIdx + 3]
    }
  }

  return new ImageData(dstData, width, height)
}

// === COLOR CURVES ===

export interface CurvePoint {
  input: number  // 0-255
  output: number // 0-255
}

/**
 * Apply color curves adjustment
 * Curves allow fine-tuned control over brightness across the tonal range
 */
export function applyColorCurves(
  imageData: ImageData,
  rgbCurve: CurvePoint[],   // Master RGB curve
  redCurve?: CurvePoint[],
  greenCurve?: CurvePoint[],
  blueCurve?: CurvePoint[]
): ImageData {
  const data = new Uint8ClampedArray(imageData.data)

  // Build lookup tables for each channel
  const rgbLUT = buildCurveLUT(rgbCurve)
  const redLUT = redCurve ? buildCurveLUT(redCurve) : null
  const greenLUT = greenCurve ? buildCurveLUT(greenCurve) : null
  const blueLUT = blueCurve ? buildCurveLUT(blueCurve) : null

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue

    // Apply master RGB curve first
    let r = rgbLUT[data[i]]
    let g = rgbLUT[data[i + 1]]
    let b = rgbLUT[data[i + 2]]

    // Apply individual channel curves
    if (redLUT) r = redLUT[r]
    if (greenLUT) g = greenLUT[g]
    if (blueLUT) b = blueLUT[b]

    data[i] = r
    data[i + 1] = g
    data[i + 2] = b
  }

  return new ImageData(data, imageData.width, imageData.height)
}

/**
 * Build a lookup table from curve points using linear interpolation
 */
function buildCurveLUT(points: CurvePoint[]): Uint8Array {
  const lut = new Uint8Array(256)

  if (points.length === 0) {
    // Identity curve
    for (let i = 0; i < 256; i++) {
      lut[i] = i
    }
    return lut
  }

  // Sort points by input
  const sortedPoints = [...points].sort((a, b) => a.input - b.input)

  // Ensure we have endpoints
  if (sortedPoints[0].input > 0) {
    sortedPoints.unshift({ input: 0, output: 0 })
  }
  if (sortedPoints[sortedPoints.length - 1].input < 255) {
    sortedPoints.push({ input: 255, output: 255 })
  }

  // Build LUT using linear interpolation
  let pointIndex = 0
  for (let i = 0; i < 256; i++) {
    // Find the segment we're in
    while (pointIndex < sortedPoints.length - 1 && sortedPoints[pointIndex + 1].input < i) {
      pointIndex++
    }

    const p1 = sortedPoints[pointIndex]
    const p2 = sortedPoints[Math.min(pointIndex + 1, sortedPoints.length - 1)]

    if (p1.input === p2.input) {
      lut[i] = p1.output
    } else {
      const t = (i - p1.input) / (p2.input - p1.input)
      lut[i] = clamp(Math.round(p1.output + t * (p2.output - p1.output)), 0, 255)
    }
  }

  return lut
}

/**
 * Create preset curve points for common adjustments
 */
export function createContrastCurve(amount: number): CurvePoint[] {
  // amount: -100 to 100
  const center = 128
  const scale = 1 + amount / 100

  return [
    { input: 0, output: clamp(center - (center * scale), 0, 255) },
    { input: 128, output: 128 },
    { input: 255, output: clamp(center + ((255 - center) * scale), 0, 255) },
  ]
}

export function createBrightnessCurve(amount: number): CurvePoint[] {
  // amount: -100 to 100
  const shift = amount * 2.55

  return [
    { input: 0, output: clamp(shift, 0, 255) },
    { input: 255, output: clamp(255 + shift, 0, 255) },
  ]
}

export function createSCurve(strength: number = 0.5): CurvePoint[] {
  // Creates an S-curve for contrast enhancement
  const points: CurvePoint[] = []

  for (let i = 0; i <= 255; i += 32) {
    const normalized = i / 255
    // S-curve formula
    const curved = 1 / (1 + Math.exp(-((normalized - 0.5) * 10 * strength)))
    points.push({ input: i, output: Math.round(curved * 255) })
  }

  return points
}

// === OFFSET AND SCALE ===

/**
 * Apply offset (move) and scale to layer content
 */
export function applyOffsetScale(
  imageData: ImageData,
  offsetX: number,
  offsetY: number,
  scaleX: number = 1,
  scaleY: number = 1,
  wrapAround: boolean = false,
  interpolation: 'nearest' | 'bilinear' = 'nearest'
): ImageData {
  const width = imageData.width
  const height = imageData.height
  const srcData = imageData.data
  const dstData = new Uint8ClampedArray(srcData.length)

  // Calculate new dimensions if scaling
  const centerX = width / 2
  const centerY = height / 2

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Calculate source position (inverse transform)
      let srcX = (x - centerX) / scaleX + centerX - offsetX
      let srcY = (y - centerY) / scaleY + centerY - offsetY

      // Handle wrap-around or clamp
      if (wrapAround) {
        srcX = ((srcX % width) + width) % width
        srcY = ((srcY % height) + height) % height
      }

      const dstIdx = (y * width + x) * 4

      if (srcX < 0 || srcX >= width || srcY < 0 || srcY >= height) {
        // Out of bounds - transparent
        dstData[dstIdx] = 0
        dstData[dstIdx + 1] = 0
        dstData[dstIdx + 2] = 0
        dstData[dstIdx + 3] = 0
        continue
      }

      if (interpolation === 'nearest') {
        // Nearest neighbor interpolation
        const srcIdx = (Math.floor(srcY) * width + Math.floor(srcX)) * 4
        dstData[dstIdx] = srcData[srcIdx]
        dstData[dstIdx + 1] = srcData[srcIdx + 1]
        dstData[dstIdx + 2] = srcData[srcIdx + 2]
        dstData[dstIdx + 3] = srcData[srcIdx + 3]
      } else {
        // Bilinear interpolation
        const x0 = Math.floor(srcX)
        const y0 = Math.floor(srcY)
        const x1 = Math.min(x0 + 1, width - 1)
        const y1 = Math.min(y0 + 1, height - 1)

        const fx = srcX - x0
        const fy = srcY - y0

        const idx00 = (y0 * width + x0) * 4
        const idx10 = (y0 * width + x1) * 4
        const idx01 = (y1 * width + x0) * 4
        const idx11 = (y1 * width + x1) * 4

        for (let c = 0; c < 4; c++) {
          const v00 = srcData[idx00 + c]
          const v10 = srcData[idx10 + c]
          const v01 = srcData[idx01 + c]
          const v11 = srcData[idx11 + c]

          const top = v00 + fx * (v10 - v00)
          const bottom = v01 + fx * (v11 - v01)
          dstData[dstIdx + c] = Math.round(top + fy * (bottom - top))
        }
      }
    }
  }

  return new ImageData(dstData, width, height)
}

/**
 * Apply just offset (simpler version)
 */
export function applyOffset(
  imageData: ImageData,
  offsetX: number,
  offsetY: number,
  wrapAround: boolean = true
): ImageData {
  return applyOffsetScale(imageData, offsetX, offsetY, 1, 1, wrapAround, 'nearest')
}

/**
 * Apply just scale centered
 */
export function applyScale(
  imageData: ImageData,
  scaleX: number,
  scaleY: number,
  interpolation: 'nearest' | 'bilinear' = 'nearest'
): ImageData {
  return applyOffsetScale(imageData, 0, 0, scaleX, scaleY, false, interpolation)
}

// === ADDITIONAL EFFECTS ===

/**
 * Apply levels adjustment (like Photoshop levels)
 */
export function applyLevels(
  imageData: ImageData,
  inputBlack: number = 0,    // 0-255
  inputWhite: number = 255,  // 0-255
  gamma: number = 1.0,       // 0.1-10
  outputBlack: number = 0,   // 0-255
  outputWhite: number = 255  // 0-255
): ImageData {
  const data = new Uint8ClampedArray(imageData.data)

  // Build lookup table
  const lut = new Uint8Array(256)
  const inputRange = inputWhite - inputBlack
  const outputRange = outputWhite - outputBlack

  for (let i = 0; i < 256; i++) {
    // Normalize to input range
    let value = (i - inputBlack) / inputRange
    value = clamp(value, 0, 1)

    // Apply gamma
    value = Math.pow(value, 1 / gamma)

    // Map to output range
    value = outputBlack + value * outputRange

    lut[i] = clamp(Math.round(value), 0, 255)
  }

  // Apply to image
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue

    data[i] = lut[data[i]]
    data[i + 1] = lut[data[i + 1]]
    data[i + 2] = lut[data[i + 2]]
  }

  return new ImageData(data, imageData.width, imageData.height)
}

/**
 * Apply vibrance (smart saturation that preserves skin tones)
 */
export function applyVibrance(imageData: ImageData, amount: number = 50): ImageData {
  const data = new Uint8ClampedArray(imageData.data)
  const factor = amount / 100

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue

    const r = data[i] / 255
    const g = data[i + 1] / 255
    const b = data[i + 2] / 255

    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    const saturation = max === 0 ? 0 : (max - min) / max

    // Apply more saturation to less saturated pixels
    const adjustedFactor = factor * (1 - saturation)
    const gray = 0.299 * r + 0.587 * g + 0.114 * b

    data[i] = clamp(Math.round((r + (r - gray) * adjustedFactor) * 255), 0, 255)
    data[i + 1] = clamp(Math.round((g + (g - gray) * adjustedFactor) * 255), 0, 255)
    data[i + 2] = clamp(Math.round((b + (b - gray) * adjustedFactor) * 255), 0, 255)
  }

  return new ImageData(data, imageData.width, imageData.height)
}

/**
 * Apply color balance (adjust shadows, midtones, highlights independently)
 */
export function applyColorBalance(
  imageData: ImageData,
  shadows: { cyan: number; magenta: number; yellow: number },    // -100 to 100
  midtones: { cyan: number; magenta: number; yellow: number },   // -100 to 100
  highlights: { cyan: number; magenta: number; yellow: number }  // -100 to 100
): ImageData {
  const data = new Uint8ClampedArray(imageData.data)

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue

    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]

    // Calculate luminance to determine tonal range
    const lum = 0.299 * r + 0.587 * g + 0.114 * b

    // Weight factors for shadows, midtones, highlights
    const shadowWeight = 1 - Math.min(lum / 85, 1)
    const highlightWeight = Math.max((lum - 170) / 85, 0)
    const midtoneWeight = 1 - shadowWeight - highlightWeight

    // Calculate adjustments
    const cyanRedAdj = (
      shadows.cyan * shadowWeight +
      midtones.cyan * midtoneWeight +
      highlights.cyan * highlightWeight
    ) * 2.55

    const magentaGreenAdj = (
      shadows.magenta * shadowWeight +
      midtones.magenta * midtoneWeight +
      highlights.magenta * highlightWeight
    ) * 2.55

    const yellowBlueAdj = (
      shadows.yellow * shadowWeight +
      midtones.yellow * midtoneWeight +
      highlights.yellow * highlightWeight
    ) * 2.55

    // Apply (cyan/red is opposite, etc.)
    data[i] = clamp(r - cyanRedAdj, 0, 255)
    data[i + 1] = clamp(g - magentaGreenAdj, 0, 255)
    data[i + 2] = clamp(b - yellowBlueAdj, 0, 255)
  }

  return new ImageData(data, imageData.width, imageData.height)
}

// === EFFECT REGISTRY ===

export type EffectType =
  | 'brightnessContrast'
  | 'hsv'
  | 'invert'
  | 'desaturate'
  | 'posterize'
  | 'colorize'
  | 'sepia'
  | 'threshold'
  | 'gradientMap'
  | 'levels'
  | 'vibrance'
  | 'colorBalance'
  | 'colorCurves'
  | 'gaussianBlur'
  | 'sharpen'
  | 'pixelize'
  | 'edgeDetect'
  | 'outline'
  | 'dropShadow'
  | 'offset'
  | 'scale'
  | 'flipHorizontal'
  | 'flipVertical'
  | 'rotate90CW'
  | 'rotate90CCW'
  | 'rotate180'

export interface EffectDefinition {
  id: EffectType
  name: string
  category: 'color' | 'blur' | 'stylize' | 'transform'
  params: {
    name: string
    key: string
    type: 'number' | 'boolean' | 'color'
    min?: number
    max?: number
    step?: number
    default: number | boolean | string
  }[]
}

export const EFFECTS: EffectDefinition[] = [
  {
    id: 'brightnessContrast',
    name: 'Brightness/Contrast',
    category: 'color',
    params: [
      { name: 'Brightness', key: 'brightness', type: 'number', min: -100, max: 100, step: 1, default: 0 },
      { name: 'Contrast', key: 'contrast', type: 'number', min: -100, max: 100, step: 1, default: 0 },
    ]
  },
  {
    id: 'hsv',
    name: 'Hue/Saturation/Value',
    category: 'color',
    params: [
      { name: 'Hue', key: 'hue', type: 'number', min: -180, max: 180, step: 1, default: 0 },
      { name: 'Saturation', key: 'saturation', type: 'number', min: -100, max: 100, step: 1, default: 0 },
      { name: 'Value', key: 'value', type: 'number', min: -100, max: 100, step: 1, default: 0 },
    ]
  },
  {
    id: 'invert',
    name: 'Invert Colors',
    category: 'color',
    params: []
  },
  {
    id: 'desaturate',
    name: 'Desaturate',
    category: 'color',
    params: [
      { name: 'Amount', key: 'amount', type: 'number', min: 0, max: 100, step: 1, default: 100 },
    ]
  },
  {
    id: 'posterize',
    name: 'Posterize',
    category: 'color',
    params: [
      { name: 'Levels', key: 'levels', type: 'number', min: 2, max: 32, step: 1, default: 4 },
    ]
  },
  {
    id: 'colorize',
    name: 'Colorize',
    category: 'color',
    params: [
      { name: 'Hue', key: 'hue', type: 'number', min: 0, max: 360, step: 1, default: 0 },
      { name: 'Saturation', key: 'saturation', type: 'number', min: 0, max: 100, step: 1, default: 50 },
      { name: 'Preserve Luminosity', key: 'preserveLuminosity', type: 'boolean', default: true },
    ]
  },
  {
    id: 'sepia',
    name: 'Sepia',
    category: 'color',
    params: [
      { name: 'Amount', key: 'amount', type: 'number', min: 0, max: 100, step: 1, default: 100 },
    ]
  },
  {
    id: 'threshold',
    name: 'Threshold',
    category: 'color',
    params: [
      { name: 'Threshold', key: 'threshold', type: 'number', min: 0, max: 255, step: 1, default: 128 },
    ]
  },
  {
    id: 'gradientMap',
    name: 'Gradient Map',
    category: 'color',
    params: [
      { name: 'Dark Color', key: 'colorStart', type: 'color', default: '#000000' },
      { name: 'Light Color', key: 'colorEnd', type: 'color', default: '#ffffff' },
    ]
  },
  {
    id: 'levels',
    name: 'Levels',
    category: 'color',
    params: [
      { name: 'Input Black', key: 'inputBlack', type: 'number', min: 0, max: 255, step: 1, default: 0 },
      { name: 'Input White', key: 'inputWhite', type: 'number', min: 0, max: 255, step: 1, default: 255 },
      { name: 'Gamma', key: 'gamma', type: 'number', min: 0.1, max: 10, step: 0.1, default: 1.0 },
      { name: 'Output Black', key: 'outputBlack', type: 'number', min: 0, max: 255, step: 1, default: 0 },
      { name: 'Output White', key: 'outputWhite', type: 'number', min: 0, max: 255, step: 1, default: 255 },
    ]
  },
  {
    id: 'vibrance',
    name: 'Vibrance',
    category: 'color',
    params: [
      { name: 'Amount', key: 'amount', type: 'number', min: -100, max: 100, step: 1, default: 50 },
    ]
  },
  {
    id: 'colorBalance',
    name: 'Color Balance',
    category: 'color',
    params: [
      { name: 'Shadows Cyan/Red', key: 'shadowsCyan', type: 'number', min: -100, max: 100, step: 1, default: 0 },
      { name: 'Shadows Magenta/Green', key: 'shadowsMagenta', type: 'number', min: -100, max: 100, step: 1, default: 0 },
      { name: 'Shadows Yellow/Blue', key: 'shadowsYellow', type: 'number', min: -100, max: 100, step: 1, default: 0 },
      { name: 'Midtones Cyan/Red', key: 'midtonesCyan', type: 'number', min: -100, max: 100, step: 1, default: 0 },
      { name: 'Midtones Magenta/Green', key: 'midtonesMagenta', type: 'number', min: -100, max: 100, step: 1, default: 0 },
      { name: 'Midtones Yellow/Blue', key: 'midtonesYellow', type: 'number', min: -100, max: 100, step: 1, default: 0 },
      { name: 'Highlights Cyan/Red', key: 'highlightsCyan', type: 'number', min: -100, max: 100, step: 1, default: 0 },
      { name: 'Highlights Magenta/Green', key: 'highlightsMagenta', type: 'number', min: -100, max: 100, step: 1, default: 0 },
      { name: 'Highlights Yellow/Blue', key: 'highlightsYellow', type: 'number', min: -100, max: 100, step: 1, default: 0 },
    ]
  },
  {
    id: 'colorCurves',
    name: 'Color Curves',
    category: 'color',
    params: [
      // Curves are handled differently - stored as arrays of points
      // UI will need to handle curve editing
    ]
  },
  {
    id: 'gaussianBlur',
    name: 'Blur',
    category: 'blur',
    params: [
      { name: 'Radius', key: 'radius', type: 'number', min: 1, max: 10, step: 1, default: 1 },
    ]
  },
  {
    id: 'sharpen',
    name: 'Sharpen',
    category: 'blur',
    params: [
      { name: 'Amount', key: 'amount', type: 'number', min: 0, max: 100, step: 1, default: 50 },
    ]
  },
  {
    id: 'pixelize',
    name: 'Pixelize',
    category: 'blur',
    params: [
      { name: 'Block Size', key: 'blockSize', type: 'number', min: 2, max: 32, step: 1, default: 4 },
    ]
  },
  {
    id: 'edgeDetect',
    name: 'Edge Detect (Sobel)',
    category: 'stylize',
    params: []
  },
  {
    id: 'outline',
    name: 'Outline',
    category: 'stylize',
    params: [
      { name: 'Color', key: 'color', type: 'color', default: '#000000' },
      { name: 'Thickness', key: 'thickness', type: 'number', min: 1, max: 10, step: 1, default: 1 },
      { name: 'Inside', key: 'inside', type: 'boolean', default: false },
    ]
  },
  {
    id: 'dropShadow',
    name: 'Drop Shadow',
    category: 'stylize',
    params: [
      { name: 'Color', key: 'color', type: 'color', default: '#000000' },
      { name: 'Offset X', key: 'offsetX', type: 'number', min: -20, max: 20, step: 1, default: 2 },
      { name: 'Offset Y', key: 'offsetY', type: 'number', min: -20, max: 20, step: 1, default: 2 },
      { name: 'Opacity', key: 'opacity', type: 'number', min: 0, max: 100, step: 1, default: 50 },
    ]
  },
  {
    id: 'offset',
    name: 'Offset',
    category: 'transform',
    params: [
      { name: 'Offset X', key: 'offsetX', type: 'number', min: -1000, max: 1000, step: 1, default: 0 },
      { name: 'Offset Y', key: 'offsetY', type: 'number', min: -1000, max: 1000, step: 1, default: 0 },
      { name: 'Wrap Around', key: 'wrapAround', type: 'boolean', default: true },
    ]
  },
  {
    id: 'scale',
    name: 'Scale',
    category: 'transform',
    params: [
      { name: 'Scale X', key: 'scaleX', type: 'number', min: 0.1, max: 10, step: 0.1, default: 1 },
      { name: 'Scale Y', key: 'scaleY', type: 'number', min: 0.1, max: 10, step: 0.1, default: 1 },
      { name: 'Interpolation', key: 'interpolation', type: 'string', default: 'nearest' },
    ]
  },
  {
    id: 'flipHorizontal',
    name: 'Flip Horizontal',
    category: 'transform',
    params: []
  },
  {
    id: 'flipVertical',
    name: 'Flip Vertical',
    category: 'transform',
    params: []
  },
  {
    id: 'rotate90CW',
    name: 'Rotate 90° CW',
    category: 'transform',
    params: []
  },
  {
    id: 'rotate90CCW',
    name: 'Rotate 90° CCW',
    category: 'transform',
    params: []
  },
  {
    id: 'rotate180',
    name: 'Rotate 180°',
    category: 'transform',
    params: []
  },
]

// Apply effect by ID
export function applyEffect(
  imageData: ImageData,
  effectId: EffectType,
  params: Record<string, number | boolean | string> = {}
): ImageData {
  switch (effectId) {
    case 'brightnessContrast':
      return applyBrightnessContrast(
        imageData,
        (params.brightness as number) ?? 0,
        (params.contrast as number) ?? 0
      )
    case 'hsv':
      return applyHsvAdjustment(
        imageData,
        (params.hue as number) ?? 0,
        (params.saturation as number) ?? 0,
        (params.value as number) ?? 0
      )
    case 'invert':
      return applyInvert(imageData)
    case 'desaturate':
      return applyDesaturate(imageData, (params.amount as number) ?? 100)
    case 'posterize':
      return applyPosterize(imageData, (params.levels as number) ?? 4)
    case 'colorize':
      return applyColorize(
        imageData,
        (params.hue as number) ?? 0,
        (params.saturation as number) ?? 50,
        (params.preserveLuminosity as boolean) ?? true
      )
    case 'sepia':
      return applySepia(imageData, (params.amount as number) ?? 100)
    case 'threshold':
      return applyThreshold(imageData, (params.threshold as number) ?? 128)
    case 'gradientMap':
      return applyGradientMap(
        imageData,
        (params.colorStart as string) ?? '#000000',
        (params.colorEnd as string) ?? '#ffffff'
      )
    case 'gaussianBlur':
      return applyGaussianBlur(imageData, (params.radius as number) ?? 1)
    case 'sharpen':
      return applySharpen(imageData, (params.amount as number) ?? 50)
    case 'pixelize':
      return applyPixelize(imageData, (params.blockSize as number) ?? 4)
    case 'edgeDetect':
      return applyEdgeDetect(imageData)
    case 'outline':
      return applyOutline(
        imageData,
        (params.color as string) ?? '#000000',
        (params.thickness as number) ?? 1,
        (params.inside as boolean) ?? false
      )
    case 'dropShadow':
      return applyDropShadow(
        imageData,
        (params.color as string) ?? '#000000',
        (params.offsetX as number) ?? 2,
        (params.offsetY as number) ?? 2,
        (params.opacity as number) ?? 50
      )
    case 'levels':
      return applyLevels(
        imageData,
        (params.inputBlack as number) ?? 0,
        (params.inputWhite as number) ?? 255,
        (params.gamma as number) ?? 1.0,
        (params.outputBlack as number) ?? 0,
        (params.outputWhite as number) ?? 255
      )
    case 'vibrance':
      return applyVibrance(imageData, (params.amount as number) ?? 50)
    case 'colorBalance':
      return applyColorBalance(
        imageData,
        {
          cyan: (params.shadowsCyan as number) ?? 0,
          magenta: (params.shadowsMagenta as number) ?? 0,
          yellow: (params.shadowsYellow as number) ?? 0,
        },
        {
          cyan: (params.midtonesCyan as number) ?? 0,
          magenta: (params.midtonesMagenta as number) ?? 0,
          yellow: (params.midtonesYellow as number) ?? 0,
        },
        {
          cyan: (params.highlightsCyan as number) ?? 0,
          magenta: (params.highlightsMagenta as number) ?? 0,
          yellow: (params.highlightsYellow as number) ?? 0,
        }
      )
    case 'colorCurves':
      // Color curves need special handling - params should contain curve arrays
      return applyColorCurves(
        imageData,
        (params.rgbCurve as CurvePoint[]) ?? [],
        (params.redCurve as CurvePoint[]) ?? undefined,
        (params.greenCurve as CurvePoint[]) ?? undefined,
        (params.blueCurve as CurvePoint[]) ?? undefined
      )
    case 'offset':
      return applyOffset(
        imageData,
        (params.offsetX as number) ?? 0,
        (params.offsetY as number) ?? 0,
        (params.wrapAround as boolean) ?? true
      )
    case 'scale':
      return applyScale(
        imageData,
        (params.scaleX as number) ?? 1,
        (params.scaleY as number) ?? 1,
        ((params.interpolation as string) ?? 'nearest') as 'nearest' | 'bilinear'
      )
    case 'flipHorizontal':
      return applyFlipHorizontal(imageData)
    case 'flipVertical':
      return applyFlipVertical(imageData)
    case 'rotate90CW':
      return applyRotate90CW(imageData)
    case 'rotate90CCW':
      return applyRotate90CCW(imageData)
    case 'rotate180':
      return applyRotate180(imageData)
    default:
      return imageData
  }
}
