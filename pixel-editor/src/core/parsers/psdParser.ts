/**
 * Photoshop (.psd) Parser
 * Based on Adobe PSD file format specification
 * https://www.adobe.com/devnet-apps/photoshop/fileformatashtml/
 */

import type { BlendMode } from '@/store/editor-store'

export interface PsdLayer {
  name: string
  visible: boolean
  locked: boolean
  opacity: number
  blendMode: BlendMode
  left: number
  top: number
  right: number
  bottom: number
  imageData: ImageData | null
  type: 'normal' | 'group' | 'adjustment'
}

export interface PsdDocument {
  width: number
  height: number
  channels: number
  depth: number // bits per channel
  colorMode: string
  layers: PsdLayer[]
  mergedImage: ImageData | null
}

// PSD blend mode keys to our blend modes
const BLEND_MODE_MAP: Record<string, BlendMode> = {
  'norm': 'normal',
  'pass': 'normal', // pass through
  'mul ': 'multiply',
  'scrn': 'screen',
  'over': 'overlay',
  'dark': 'darken',
  'lite': 'lighten',
  'hLit': 'overlay', // hard light
  'sLit': 'overlay', // soft light
  'diff': 'normal', // difference
  'smud': 'normal', // exclusion
  'div ': 'normal', // divide
  'idiv': 'normal', // subtract
  'hue ': 'normal',
  'sat ': 'normal',
  'colr': 'normal',
  'lum ': 'normal',
  'diss': 'normal', // dissolve
  'lddg': 'normal', // linear dodge
  'lbrn': 'normal', // linear burn
  'vLit': 'overlay', // vivid light
  'lLit': 'overlay', // linear light
  'pLit': 'overlay', // pin light
  'hMix': 'normal', // hard mix
}

const COLOR_MODES = [
  'Bitmap',
  'Grayscale',
  'Indexed',
  'RGB',
  'CMYK',
  'Multichannel',
  'Duotone',
  'Lab',
]

/**
 * Binary reader helper
 */
class PsdReader {
  private view: DataView
  private offset: number = 0

  constructor(buffer: ArrayBuffer) {
    this.view = new DataView(buffer)
  }

  get position(): number {
    return this.offset
  }

  set position(pos: number) {
    this.offset = pos
  }

  get remaining(): number {
    return this.view.byteLength - this.offset
  }

  readUint8(): number {
    const value = this.view.getUint8(this.offset)
    this.offset += 1
    return value
  }

  readInt16(): number {
    const value = this.view.getInt16(this.offset, false)
    this.offset += 2
    return value
  }

  readUint16(): number {
    const value = this.view.getUint16(this.offset, false)
    this.offset += 2
    return value
  }

  readInt32(): number {
    const value = this.view.getInt32(this.offset, false)
    this.offset += 4
    return value
  }

  readUint32(): number {
    const value = this.view.getUint32(this.offset, false)
    this.offset += 4
    return value
  }

  readBytes(length: number): Uint8Array {
    const bytes = new Uint8Array(this.view.buffer, this.offset, length)
    this.offset += length
    return bytes
  }

  readString(length: number): string {
    const bytes = this.readBytes(length)
    return String.fromCharCode(...bytes)
  }

  readPascalString(): string {
    const length = this.readUint8()
    if (length === 0) {
      this.offset += 1 // Padding
      return ''
    }
    const str = this.readString(length)
    // Pad to even length
    if ((length + 1) % 2 !== 0) {
      this.offset += 1
    }
    return str
  }

  readUnicodeString(): string {
    const length = this.readUint32()
    if (length === 0) return ''

    let str = ''
    for (let i = 0; i < length; i++) {
      const code = this.readUint16()
      if (code !== 0) {
        str += String.fromCharCode(code)
      }
    }
    return str
  }

  skip(bytes: number): void {
    this.offset += bytes
  }

  align(boundary: number): void {
    const mod = this.offset % boundary
    if (mod !== 0) {
      this.offset += boundary - mod
    }
  }
}

/**
 * Parse a PSD file
 */
export async function parsePsdFile(file: File): Promise<PsdDocument> {
  const buffer = await file.arrayBuffer()
  const reader = new PsdReader(buffer)

  // ===== File Header Section =====
  const signature = reader.readString(4)
  if (signature !== '8BPS') {
    throw new Error('Invalid PSD file: wrong signature')
  }

  const version = reader.readUint16()
  if (version !== 1 && version !== 2) {
    throw new Error(`Unsupported PSD version: ${version}`)
  }

  reader.skip(6) // Reserved

  const channels = reader.readUint16()
  const height = reader.readUint32()
  const width = reader.readUint32()
  const depth = reader.readUint16()
  const colorModeValue = reader.readUint16()
  const colorMode = COLOR_MODES[colorModeValue] || 'Unknown'

  // ===== Color Mode Data Section =====
  const colorModeDataLength = reader.readUint32()
  reader.skip(colorModeDataLength)

  // ===== Image Resources Section =====
  const imageResourcesLength = reader.readUint32()
  reader.skip(imageResourcesLength)

  // ===== Layer and Mask Information Section =====
  const layerMaskLength = reader.readUint32()
  const layerMaskEnd = reader.position + layerMaskLength

  const layers: PsdLayer[] = []

  if (layerMaskLength > 0) {
    // Layer info
    const layerInfoLength = reader.readUint32()
    if (layerInfoLength > 0) {
      const layerInfoEnd = reader.position + layerInfoLength

      let layerCount = reader.readInt16()
      const hasAlphaChannel = layerCount < 0
      layerCount = Math.abs(layerCount)

      // Read layer records
      const layerRecords: any[] = []
      for (let i = 0; i < layerCount; i++) {
        const record = readLayerRecord(reader)
        layerRecords.push(record)
      }

      // Read layer channel image data
      for (let i = 0; i < layerCount; i++) {
        const record = layerRecords[i]
        const imageData = readLayerImageData(
          reader,
          record,
          width,
          height
        )

        layers.push({
          name: record.name,
          visible: record.visible,
          locked: record.locked,
          opacity: record.opacity,
          blendMode: record.blendMode,
          left: record.left,
          top: record.top,
          right: record.right,
          bottom: record.bottom,
          imageData,
          type: 'normal',
        })
      }

      reader.position = layerInfoEnd
    }

    // Skip to end of layer and mask section
    reader.position = layerMaskEnd
  }

  // ===== Image Data Section (merged/flattened image) =====
  let mergedImage: ImageData | null = null

  if (reader.remaining > 2) {
    try {
      mergedImage = readMergedImageData(reader, width, height, channels, depth)
    } catch (e) {
      console.warn('Failed to read merged image:', e)
    }
  }

  // Reverse layers (PSD stores top-to-bottom)
  layers.reverse()

  return {
    width,
    height,
    channels,
    depth,
    colorMode,
    layers,
    mergedImage,
  }
}

/**
 * Read a layer record
 */
function readLayerRecord(reader: PsdReader): any {
  const top = reader.readInt32()
  const left = reader.readInt32()
  const bottom = reader.readInt32()
  const right = reader.readInt32()

  const channelCount = reader.readUint16()
  const channelInfo: any[] = []

  for (let i = 0; i < channelCount; i++) {
    const channelId = reader.readInt16()
    const channelLength = reader.readUint32()
    channelInfo.push({ id: channelId, length: channelLength })
  }

  const blendSig = reader.readString(4)
  if (blendSig !== '8BIM') {
    throw new Error('Invalid blend mode signature')
  }

  const blendKey = reader.readString(4)
  const opacity = reader.readUint8()
  const clipping = reader.readUint8()
  const flags = reader.readUint8()
  reader.skip(1) // Filler

  const visible = (flags & 0x02) === 0
  const locked = (flags & 0x01) !== 0

  // Extra data
  const extraLength = reader.readUint32()
  const extraEnd = reader.position + extraLength

  // Layer mask data
  const maskDataLength = reader.readUint32()
  reader.skip(maskDataLength)

  // Layer blending ranges
  const blendingRangesLength = reader.readUint32()
  reader.skip(blendingRangesLength)

  // Layer name (Pascal string, padded to 4 bytes)
  const name = reader.readPascalString()

  // Skip to end of extra data
  reader.position = extraEnd

  return {
    top,
    left,
    bottom,
    right,
    channelCount,
    channelInfo,
    blendMode: BLEND_MODE_MAP[blendKey] || 'normal',
    opacity: Math.round(opacity / 255 * 100),
    visible,
    locked,
    name: name || `Layer ${reader.position}`,
  }
}

/**
 * Read layer image data
 */
function readLayerImageData(
  reader: PsdReader,
  record: any,
  docWidth: number,
  docHeight: number
): ImageData | null {
  const layerWidth = record.right - record.left
  const layerHeight = record.bottom - record.top

  if (layerWidth <= 0 || layerHeight <= 0) {
    return null
  }

  // Create canvas at document size
  const canvas = document.createElement('canvas')
  canvas.width = docWidth
  canvas.height = docHeight
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingEnabled = false

  const imageData = ctx.createImageData(layerWidth, layerHeight)
  const channels: Uint8Array[] = []

  // Read each channel
  for (const channel of record.channelInfo) {
    const compression = reader.readUint16()
    const channelData = readChannelData(
      reader,
      compression,
      layerWidth,
      layerHeight,
      channel.length - 2 // Subtract compression bytes
    )
    channels.push(channelData)
  }

  // Combine channels into RGBA
  const data = imageData.data
  for (let y = 0; y < layerHeight; y++) {
    for (let x = 0; x < layerWidth; x++) {
      const i = (y * layerWidth + x) * 4
      const srcIdx = y * layerWidth + x

      // Find channel by ID: -1=alpha, 0=red, 1=green, 2=blue
      const alphaIdx = record.channelInfo.findIndex((c: any) => c.id === -1)
      const redIdx = record.channelInfo.findIndex((c: any) => c.id === 0)
      const greenIdx = record.channelInfo.findIndex((c: any) => c.id === 1)
      const blueIdx = record.channelInfo.findIndex((c: any) => c.id === 2)

      data[i] = redIdx >= 0 && channels[redIdx] ? channels[redIdx][srcIdx] : 0
      data[i + 1] = greenIdx >= 0 && channels[greenIdx] ? channels[greenIdx][srcIdx] : 0
      data[i + 2] = blueIdx >= 0 && channels[blueIdx] ? channels[blueIdx][srcIdx] : 0
      data[i + 3] = alphaIdx >= 0 && channels[alphaIdx] ? channels[alphaIdx][srcIdx] : 255
    }
  }

  // Put the layer data at its position in the document
  const fullCanvas = document.createElement('canvas')
  fullCanvas.width = docWidth
  fullCanvas.height = docHeight
  const fullCtx = fullCanvas.getContext('2d')!
  fullCtx.putImageData(imageData, record.left, record.top)

  return fullCtx.getImageData(0, 0, docWidth, docHeight)
}

/**
 * Read channel data with decompression
 */
function readChannelData(
  reader: PsdReader,
  compression: number,
  width: number,
  height: number,
  dataLength: number
): Uint8Array {
  const pixelCount = width * height
  const output = new Uint8Array(pixelCount)

  if (compression === 0) {
    // Raw data
    const rawData = reader.readBytes(Math.min(dataLength, pixelCount))
    output.set(rawData)
  } else if (compression === 1) {
    // RLE compression
    // First, read the byte counts for each scanline
    const byteCounts: number[] = []
    for (let y = 0; y < height; y++) {
      byteCounts.push(reader.readUint16())
    }

    // Now decompress each scanline
    let outOffset = 0
    for (let y = 0; y < height; y++) {
      const rowEnd = outOffset + width
      while (outOffset < rowEnd) {
        const n = reader.readUint8()
        if (n >= 128) {
          // Run of same byte
          const count = 257 - n
          const value = reader.readUint8()
          for (let i = 0; i < count && outOffset < rowEnd; i++) {
            output[outOffset++] = value
          }
        } else {
          // Literal bytes
          const count = n + 1
          for (let i = 0; i < count && outOffset < rowEnd; i++) {
            output[outOffset++] = reader.readUint8()
          }
        }
      }
    }
  } else {
    // ZIP compression - not commonly used, skip
    reader.skip(dataLength)
  }

  return output
}

/**
 * Read the merged/flattened image data
 */
function readMergedImageData(
  reader: PsdReader,
  width: number,
  height: number,
  channels: number,
  depth: number
): ImageData {
  const compression = reader.readUint16()
  const pixelCount = width * height

  const channelData: Uint8Array[] = []

  if (compression === 0) {
    // Raw data
    for (let c = 0; c < channels; c++) {
      channelData.push(reader.readBytes(pixelCount))
    }
  } else if (compression === 1) {
    // RLE
    // Read byte counts for all scanlines of all channels
    const byteCounts: number[] = []
    for (let c = 0; c < channels; c++) {
      for (let y = 0; y < height; y++) {
        byteCounts.push(reader.readUint16())
      }
    }

    // Decompress each channel
    for (let c = 0; c < channels; c++) {
      const output = new Uint8Array(pixelCount)
      let outOffset = 0

      for (let y = 0; y < height; y++) {
        const rowEnd = outOffset + width
        while (outOffset < rowEnd) {
          const n = reader.readUint8()
          if (n >= 128) {
            const count = 257 - n
            const value = reader.readUint8()
            for (let i = 0; i < count && outOffset < rowEnd; i++) {
              output[outOffset++] = value
            }
          } else {
            const count = n + 1
            for (let i = 0; i < count && outOffset < rowEnd; i++) {
              output[outOffset++] = reader.readUint8()
            }
          }
        }
      }

      channelData.push(output)
    }
  }

  // Create ImageData
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  const imageData = ctx.createImageData(width, height)
  const data = imageData.data

  for (let i = 0; i < pixelCount; i++) {
    const idx = i * 4
    data[idx] = channelData[0]?.[i] || 0     // R
    data[idx + 1] = channelData[1]?.[i] || 0 // G
    data[idx + 2] = channelData[2]?.[i] || 0 // B
    data[idx + 3] = channelData[3]?.[i] || 255 // A
  }

  return imageData
}

/**
 * Check if a file is a valid PSD file
 */
export function isPsdFile(file: File): boolean {
  return file.name.toLowerCase().endsWith('.psd') ||
         file.name.toLowerCase().endsWith('.psb')
}

/**
 * Get quick info from PSD without full parse
 */
export async function getPsdInfo(file: File): Promise<{
  width: number
  height: number
  channels: number
  colorMode: string
}> {
  const buffer = await file.slice(0, 30).arrayBuffer()
  const reader = new PsdReader(buffer)

  const signature = reader.readString(4)
  if (signature !== '8BPS') {
    throw new Error('Invalid PSD file')
  }

  reader.skip(2) // version
  reader.skip(6) // reserved

  const channels = reader.readUint16()
  const height = reader.readUint32()
  const width = reader.readUint32()
  reader.skip(2) // depth
  const colorModeValue = reader.readUint16()

  return {
    width,
    height,
    channels,
    colorMode: COLOR_MODES[colorModeValue] || 'Unknown',
  }
}
