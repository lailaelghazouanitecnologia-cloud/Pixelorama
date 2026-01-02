/**
 * Export functionality - Save images in various formats
 * Based on Pixelorama's export system
 */

export type ExportFormat = 'png' | 'jpeg' | 'webp' | 'gif' | 'apng' | 'mp4' | 'webm'

export interface ExportOptions {
  format: ExportFormat
  quality?: number  // 0-1 for jpeg/webp
  scale?: number    // 1 = original size, 2 = 2x, etc.
  includeBackground?: boolean
  backgroundColor?: string
}

export interface SpriteSheetOptions extends ExportOptions {
  columns?: number
  rows?: number
  padding?: number
}

/**
 * Export a single canvas to a data URL
 */
export function canvasToDataURL(
  canvas: HTMLCanvasElement,
  options: ExportOptions = { format: 'png' }
): string {
  const { format, quality = 0.92, scale = 1, includeBackground, backgroundColor } = options

  // If scale is not 1, create a scaled canvas
  let exportCanvas = canvas
  if (scale !== 1) {
    exportCanvas = document.createElement('canvas')
    exportCanvas.width = canvas.width * scale
    exportCanvas.height = canvas.height * scale
    const ctx = exportCanvas.getContext('2d')!
    ctx.imageSmoothingEnabled = false // Keep pixel art crisp

    if (includeBackground && backgroundColor) {
      ctx.fillStyle = backgroundColor
      ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height)
    }

    ctx.drawImage(canvas, 0, 0, exportCanvas.width, exportCanvas.height)
  } else if (includeBackground && backgroundColor) {
    exportCanvas = document.createElement('canvas')
    exportCanvas.width = canvas.width
    exportCanvas.height = canvas.height
    const ctx = exportCanvas.getContext('2d')!
    ctx.fillStyle = backgroundColor
    ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height)
    ctx.drawImage(canvas, 0, 0)
  }

  const mimeType = getMimeType(format)
  return exportCanvas.toDataURL(mimeType, quality)
}

/**
 * Export a canvas to a Blob
 */
export function canvasToBlob(
  canvas: HTMLCanvasElement,
  options: ExportOptions = { format: 'png' }
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const { format, quality = 0.92, scale = 1, includeBackground, backgroundColor } = options

    let exportCanvas = canvas
    if (scale !== 1 || (includeBackground && backgroundColor)) {
      exportCanvas = document.createElement('canvas')
      exportCanvas.width = canvas.width * scale
      exportCanvas.height = canvas.height * scale
      const ctx = exportCanvas.getContext('2d')!
      ctx.imageSmoothingEnabled = false

      if (includeBackground && backgroundColor) {
        ctx.fillStyle = backgroundColor
        ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height)
      }

      ctx.drawImage(canvas, 0, 0, exportCanvas.width, exportCanvas.height)
    }

    const mimeType = getMimeType(format)
    exportCanvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob)
        } else {
          reject(new Error('Failed to create blob'))
        }
      },
      mimeType,
      quality
    )
  })
}

/**
 * Download a canvas as a file
 */
export async function downloadCanvas(
  canvas: HTMLCanvasElement,
  filename: string,
  options: ExportOptions = { format: 'png' }
): Promise<void> {
  const blob = await canvasToBlob(canvas, options)
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}.${options.format}`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  URL.revokeObjectURL(url)
}

/**
 * Export multiple frames as a spritesheet
 */
export function createSpriteSheet(
  frames: HTMLCanvasElement[],
  options: SpriteSheetOptions = { format: 'png' }
): HTMLCanvasElement {
  const { columns = frames.length, padding = 0 } = options
  const rows = Math.ceil(frames.length / columns)

  if (frames.length === 0) {
    const emptyCanvas = document.createElement('canvas')
    emptyCanvas.width = 1
    emptyCanvas.height = 1
    return emptyCanvas
  }

  const frameWidth = frames[0].width
  const frameHeight = frames[0].height

  const sheetCanvas = document.createElement('canvas')
  sheetCanvas.width = columns * frameWidth + (columns - 1) * padding
  sheetCanvas.height = rows * frameHeight + (rows - 1) * padding

  const ctx = sheetCanvas.getContext('2d')!
  ctx.imageSmoothingEnabled = false

  frames.forEach((frame, index) => {
    const col = index % columns
    const row = Math.floor(index / columns)
    const x = col * (frameWidth + padding)
    const y = row * (frameHeight + padding)
    ctx.drawImage(frame, x, y)
  })

  return sheetCanvas
}

/**
 * Export multiple frames as individual files (returns array of blobs)
 */
export async function exportFrames(
  frames: HTMLCanvasElement[],
  options: ExportOptions = { format: 'png' }
): Promise<Blob[]> {
  return Promise.all(frames.map(frame => canvasToBlob(frame, options)))
}

/**
 * Merge multiple layers into a single canvas
 */
export function mergeLayers(
  layers: { canvas: HTMLCanvasElement; opacity: number; visible: boolean; blendMode?: string }[],
  width: number,
  height: number
): HTMLCanvasElement {
  const mergedCanvas = document.createElement('canvas')
  mergedCanvas.width = width
  mergedCanvas.height = height
  const ctx = mergedCanvas.getContext('2d')!

  // Draw layers from bottom to top
  layers.forEach(layer => {
    if (!layer.visible) return

    ctx.globalAlpha = layer.opacity / 100
    ctx.globalCompositeOperation = (layer.blendMode || 'source-over') as GlobalCompositeOperation
    ctx.drawImage(layer.canvas, 0, 0)
  })

  ctx.globalAlpha = 1
  ctx.globalCompositeOperation = 'source-over'

  return mergedCanvas
}

/**
 * Copy canvas to clipboard (if supported)
 */
export async function copyToClipboard(canvas: HTMLCanvasElement): Promise<boolean> {
  try {
    const blob = await canvasToBlob(canvas, { format: 'png' })
    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': blob })
    ])
    return true
  } catch (error) {
    console.error('Failed to copy to clipboard:', error)
    return false
  }
}

/**
 * Get image dimensions from a file
 */
export function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      resolve({ width: img.width, height: img.height })
      URL.revokeObjectURL(img.src)
    }
    img.onerror = () => {
      reject(new Error('Failed to load image'))
      URL.revokeObjectURL(img.src)
    }
    img.src = URL.createObjectURL(file)
  })
}

/**
 * Load an image file to a canvas
 */
export function loadImageToCanvas(file: File): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0)
      resolve(canvas)
      URL.revokeObjectURL(img.src)
    }
    img.onerror = () => {
      reject(new Error('Failed to load image'))
      URL.revokeObjectURL(img.src)
    }
    img.src = URL.createObjectURL(file)
  })
}

/**
 * Resize a canvas (nearest neighbor for pixel art)
 */
export function resizeCanvas(
  canvas: HTMLCanvasElement,
  newWidth: number,
  newHeight: number,
  smooth = false
): HTMLCanvasElement {
  const resized = document.createElement('canvas')
  resized.width = newWidth
  resized.height = newHeight
  const ctx = resized.getContext('2d')!
  ctx.imageSmoothingEnabled = smooth
  ctx.drawImage(canvas, 0, 0, newWidth, newHeight)
  return resized
}

// Helper functions
function getMimeType(format: ExportFormat): string {
  switch (format) {
    case 'png': return 'image/png'
    case 'jpeg': return 'image/jpeg'
    case 'webp': return 'image/webp'
    case 'gif': return 'image/gif'
    case 'apng': return 'image/apng'
    default: return 'image/png'
  }
}

/**
 * Export frames as animated GIF
 */
export { createAnimatedGif, downloadAnimatedGif, GifEncoder } from './gifEncoder'

import { createAnimatedGif } from './gifEncoder'

/**
 * Create animated GIF from frames and return as data URL
 */
export async function framesToGifDataUrl(
  frames: HTMLCanvasElement[],
  fps: number
): Promise<string> {
  const blob = await createAnimatedGif(frames, fps)
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Failed to read GIF blob'))
    reader.readAsDataURL(blob)
  })
}

/**
 * Export animation as GIF file download
 */
export async function exportAnimationAsGif(
  frames: HTMLCanvasElement[],
  filename: string,
  fps: number = 12,
  scale: number = 1
): Promise<void> {
  // Scale frames if needed
  let exportFrames = frames
  if (scale !== 1 && frames.length > 0) {
    exportFrames = frames.map(frame => {
      const scaled = document.createElement('canvas')
      scaled.width = frame.width * scale
      scaled.height = frame.height * scale
      const ctx = scaled.getContext('2d')!
      ctx.imageSmoothingEnabled = false
      ctx.drawImage(frame, 0, 0, scaled.width, scaled.height)
      return scaled
    })
  }

  const blob = await createAnimatedGif(exportFrames, fps)
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}.gif`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  URL.revokeObjectURL(url)
}

/**
 * Export frames as animated PNG (APNG)
 */
export { createAnimatedPng, downloadAnimatedPng, ApngEncoder } from './apngEncoder'

import { createAnimatedPng } from './apngEncoder'

/**
 * Create animated PNG from frames and return as data URL
 */
export async function framesToApngDataUrl(
  frames: HTMLCanvasElement[],
  fps: number
): Promise<string> {
  const blob = await createAnimatedPng(frames, fps)
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Failed to read APNG blob'))
    reader.readAsDataURL(blob)
  })
}

/**
 * Export animation as APNG file download
 */
export async function exportAnimationAsApng(
  frames: HTMLCanvasElement[],
  filename: string,
  fps: number = 12,
  scale: number = 1
): Promise<void> {
  // Scale frames if needed
  let exportFrames = frames
  if (scale !== 1 && frames.length > 0) {
    exportFrames = frames.map(frame => {
      const scaled = document.createElement('canvas')
      scaled.width = frame.width * scale
      scaled.height = frame.height * scale
      const ctx = scaled.getContext('2d')!
      ctx.imageSmoothingEnabled = false
      ctx.drawImage(frame, 0, 0, scaled.width, scaled.height)
      return scaled
    })
  }

  const blob = await createAnimatedPng(exportFrames, fps)
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}.png`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  URL.revokeObjectURL(url)
}

/**
 * Export frames as video (MP4/WebM)
 */
export {
  createVideo,
  exportAnimationAsVideo,
  isVideoEncodingSupported,
  quickVideoExport,
  type VideoFormat,
  type VideoExportOptions,
} from './videoEncoder'

import { exportAnimationAsVideo, isVideoEncodingSupported } from './videoEncoder'

/**
 * Export animation as MP4 file download
 */
export async function exportAnimationAsMp4(
  frames: HTMLCanvasElement[],
  filename: string,
  fps: number = 12,
  scale: number = 1,
  onProgress?: (progress: number) => void
): Promise<void> {
  const support = isVideoEncodingSupported()
  if (!support.mp4 && !support.webm) {
    throw new Error('Video encoding not supported in this browser')
  }

  // Scale frames if needed
  let exportFrames = frames
  if (scale !== 1 && frames.length > 0) {
    exportFrames = frames.map(frame => {
      const scaled = document.createElement('canvas')
      scaled.width = frame.width * scale
      scaled.height = frame.height * scale
      const ctx = scaled.getContext('2d')!
      ctx.imageSmoothingEnabled = false
      ctx.drawImage(frame, 0, 0, scaled.width, scaled.height)
      return scaled
    })
  }

  await exportAnimationAsVideo(exportFrames, filename, {
    format: support.mp4 ? 'mp4' : 'webm',
    fps,
    quality: 0.9,
    scale: 1,
    loop: 0,
  }, onProgress)
}

/**
 * Export animation as WebM file download
 */
export async function exportAnimationAsWebm(
  frames: HTMLCanvasElement[],
  filename: string,
  fps: number = 12,
  scale: number = 1,
  onProgress?: (progress: number) => void
): Promise<void> {
  const support = isVideoEncodingSupported()
  if (!support.webm) {
    throw new Error('WebM encoding not supported in this browser')
  }

  // Scale frames if needed
  let exportFrames = frames
  if (scale !== 1 && frames.length > 0) {
    exportFrames = frames.map(frame => {
      const scaled = document.createElement('canvas')
      scaled.width = frame.width * scale
      scaled.height = frame.height * scale
      const ctx = scaled.getContext('2d')!
      ctx.imageSmoothingEnabled = false
      ctx.drawImage(frame, 0, 0, scaled.width, scaled.height)
      return scaled
    })
  }

  await exportAnimationAsVideo(exportFrames, filename, {
    format: 'webm',
    fps,
    quality: 0.9,
    scale: 1,
    loop: 0,
  }, onProgress)
}
