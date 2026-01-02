/**
 * Krita (.kra) Parser
 * Krita files are ZIP archives containing:
 * - maindoc.xml - document structure
 * - mergedimage.png - flattened preview
 * - <layer>/xxx.png - individual layer data
 */

import type { BlendMode } from '@/store/editor-store'
import pako from 'pako'

export interface KritaLayer {
  name: string
  visible: boolean
  locked: boolean
  opacity: number
  blendMode: BlendMode
  x: number
  y: number
  imageData: ImageData | null
  type: 'paint' | 'group' | 'filter' | 'vector'
}

export interface KritaDocument {
  width: number
  height: number
  name: string
  layers: KritaLayer[]
  colorDepth: string
  colorSpace: string
}

// Krita blend mode to our blend mode mapping
const BLEND_MODE_MAP: Record<string, BlendMode> = {
  'normal': 'normal',
  'multiply': 'multiply',
  'screen': 'screen',
  'overlay': 'overlay',
  'darken': 'darken',
  'lighten': 'lighten',
  'color_dodge': 'normal',
  'color_burn': 'normal',
  'hard_light': 'overlay',
  'soft_light': 'overlay',
  'difference': 'normal',
  'exclusion': 'normal',
  'hue': 'normal',
  'saturation': 'normal',
  'color': 'normal',
  'luminosity': 'normal',
  'addition': 'normal',
  'subtract': 'normal',
  'divide': 'normal',
}

/**
 * Simple ZIP file reader using pako for deflate decompression
 */
class ZipReader {
  private data: Uint8Array
  private files: Map<string, { offset: number; compressedSize: number; uncompressedSize: number; compressionMethod: number }> = new Map()

  constructor(buffer: ArrayBuffer) {
    this.data = new Uint8Array(buffer)
    this.parseDirectory()
  }

  private parseDirectory() {
    // Find end of central directory
    let eocdOffset = -1
    for (let i = this.data.length - 22; i >= 0; i--) {
      if (this.data[i] === 0x50 && this.data[i + 1] === 0x4B &&
          this.data[i + 2] === 0x05 && this.data[i + 3] === 0x06) {
        eocdOffset = i
        break
      }
    }

    if (eocdOffset === -1) {
      throw new Error('Invalid ZIP file: EOCD not found')
    }

    const view = new DataView(this.data.buffer)
    const cdOffset = view.getUint32(eocdOffset + 16, true)
    const cdEntries = view.getUint16(eocdOffset + 10, true)

    let offset = cdOffset
    for (let i = 0; i < cdEntries; i++) {
      if (this.data[offset] !== 0x50 || this.data[offset + 1] !== 0x4B ||
          this.data[offset + 2] !== 0x01 || this.data[offset + 3] !== 0x02) {
        break
      }

      const compressionMethod = view.getUint16(offset + 10, true)
      const compressedSize = view.getUint32(offset + 20, true)
      const uncompressedSize = view.getUint32(offset + 24, true)
      const nameLength = view.getUint16(offset + 28, true)
      const extraLength = view.getUint16(offset + 30, true)
      const commentLength = view.getUint16(offset + 32, true)
      const localHeaderOffset = view.getUint32(offset + 42, true)

      const nameBytes = this.data.slice(offset + 46, offset + 46 + nameLength)
      const name = new TextDecoder().decode(nameBytes)

      this.files.set(name, {
        offset: localHeaderOffset,
        compressedSize,
        uncompressedSize,
        compressionMethod,
      })

      offset += 46 + nameLength + extraLength + commentLength
    }
  }

  hasFile(name: string): boolean {
    return this.files.has(name)
  }

  getFile(name: string): Uint8Array | null {
    const entry = this.files.get(name)
    if (!entry) return null

    const view = new DataView(this.data.buffer)

    // Parse local file header
    const localNameLength = view.getUint16(entry.offset + 26, true)
    const localExtraLength = view.getUint16(entry.offset + 28, true)
    const dataOffset = entry.offset + 30 + localNameLength + localExtraLength

    const compressedData = this.data.slice(dataOffset, dataOffset + entry.compressedSize)

    if (entry.compressionMethod === 0) {
      // Stored (no compression)
      return compressedData
    } else if (entry.compressionMethod === 8) {
      // Deflate
      try {
        return pako.inflateRaw(compressedData)
      } catch (e) {
        console.error('Failed to decompress:', e)
        return null
      }
    }

    return null
  }

  getFileAsText(name: string): string | null {
    const data = this.getFile(name)
    if (!data) return null
    return new TextDecoder().decode(data)
  }

  getFileAsBlob(name: string, type: string = 'application/octet-stream'): Blob | null {
    const data = this.getFile(name)
    if (!data) return null
    return new Blob([data], { type })
  }

  listFiles(): string[] {
    return Array.from(this.files.keys())
  }
}

/**
 * Parse a Krita (.kra) file
 */
export async function parseKritaFile(file: File): Promise<KritaDocument> {
  const buffer = await file.arrayBuffer()
  const zip = new ZipReader(buffer)

  // Find and parse maindoc.xml
  const maindocXml = zip.getFileAsText('maindoc.xml')
  if (!maindocXml) {
    throw new Error('Invalid Krita file: maindoc.xml not found')
  }

  const parser = new DOMParser()
  const doc = parser.parseFromString(maindocXml, 'text/xml')

  // Get document info
  const imageElement = doc.querySelector('IMAGE')
  if (!imageElement) {
    throw new Error('Invalid Krita file: IMAGE element not found')
  }

  const width = parseInt(imageElement.getAttribute('width') || '64', 10)
  const height = parseInt(imageElement.getAttribute('height') || '64', 10)
  const name = imageElement.getAttribute('name') || 'Untitled'
  const colorDepth = imageElement.getAttribute('colorspacename') || 'RGBA'
  const colorSpace = imageElement.getAttribute('profile') || 'sRGB'

  // Parse layers
  const layers: KritaLayer[] = []
  const layerElements = doc.querySelectorAll('layer')

  for (const layerEl of layerElements) {
    const layerName = layerEl.getAttribute('name') || 'Layer'
    const nodeType = layerEl.getAttribute('nodetype') || 'paintlayer'
    const visible = layerEl.getAttribute('visible') !== '0'
    const locked = layerEl.getAttribute('locked') === '1'
    const opacity = parseInt(layerEl.getAttribute('opacity') || '255', 10) / 255 * 100
    const compositeOp = layerEl.getAttribute('compositeop') || 'normal'
    const x = parseInt(layerEl.getAttribute('x') || '0', 10)
    const y = parseInt(layerEl.getAttribute('y') || '0', 10)
    const filename = layerEl.getAttribute('filename')

    let type: KritaLayer['type'] = 'paint'
    if (nodeType === 'grouplayer') type = 'group'
    else if (nodeType === 'filterlayer') type = 'filter'
    else if (nodeType === 'vectorlayer') type = 'vector'

    let imageData: ImageData | null = null

    // Try to load layer image data
    if (filename && type === 'paint') {
      const layerPath = `${name}/${filename}`
      const layerBlob = zip.getFileAsBlob(layerPath, 'image/png')

      if (layerBlob) {
        try {
          imageData = await loadImageFromBlob(layerBlob, width, height, x, y)
        } catch (e) {
          console.warn(`Failed to load layer ${layerName}:`, e)
        }
      }
    }

    layers.push({
      name: layerName,
      visible,
      locked,
      opacity,
      blendMode: BLEND_MODE_MAP[compositeOp] || 'normal',
      x,
      y,
      imageData,
      type,
    })
  }

  // If no layers found, try to get merged image
  if (layers.length === 0 || layers.every(l => l.imageData === null)) {
    const mergedBlob = zip.getFileAsBlob('mergedimage.png', 'image/png')
    if (mergedBlob) {
      const imageData = await loadImageFromBlob(mergedBlob, width, height, 0, 0)
      layers.push({
        name: 'Merged Image',
        visible: true,
        locked: false,
        opacity: 100,
        blendMode: 'normal',
        x: 0,
        y: 0,
        imageData,
        type: 'paint',
      })
    }
  }

  // Reverse layers (Krita stores top-to-bottom, we want bottom-to-top)
  layers.reverse()

  return {
    width,
    height,
    name,
    layers,
    colorDepth,
    colorSpace,
  }
}

/**
 * Load image data from a blob, positioning it on the canvas
 */
async function loadImageFromBlob(
  blob: Blob,
  canvasWidth: number,
  canvasHeight: number,
  offsetX: number,
  offsetY: number
): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(blob)

    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = canvasWidth
      canvas.height = canvasHeight
      const ctx = canvas.getContext('2d')!
      ctx.imageSmoothingEnabled = false

      // Draw image at its offset position
      ctx.drawImage(img, offsetX, offsetY)

      const imageData = ctx.getImageData(0, 0, canvasWidth, canvasHeight)
      URL.revokeObjectURL(url)
      resolve(imageData)
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image from blob'))
    }

    img.src = url
  })
}

/**
 * Check if a file is a valid Krita file
 */
export function isKritaFile(file: File): boolean {
  return file.name.toLowerCase().endsWith('.kra') ||
         file.name.toLowerCase().endsWith('.krita')
}

/**
 * Get preview image from Krita file
 */
export async function getKritaPreview(file: File): Promise<string | null> {
  try {
    const buffer = await file.arrayBuffer()
    const zip = new ZipReader(buffer)

    // Try preview.png first, then mergedimage.png
    let previewBlob = zip.getFileAsBlob('preview.png', 'image/png')
    if (!previewBlob) {
      previewBlob = zip.getFileAsBlob('mergedimage.png', 'image/png')
    }

    if (previewBlob) {
      return URL.createObjectURL(previewBlob)
    }

    return null
  } catch {
    return null
  }
}
