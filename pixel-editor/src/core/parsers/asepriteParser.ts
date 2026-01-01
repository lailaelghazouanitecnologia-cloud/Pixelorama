/**
 * Aseprite (.ase/.aseprite) Parser
 * Based on https://github.com/aseprite/aseprite/blob/main/docs/ase-file-specs.md
 * Ported from Pixelorama's AsepriteParser.gd
 */

import type { BlendMode } from '@/store/editor-store'
import pako from 'pako'

// Chunk types
const ChunkTypes = {
  OLD_PALETTE_1: 0x0004,
  OLD_PALETTE_2: 0x0011,
  LAYER: 0x2004,
  CEL: 0x2005,
  CEL_EXTRA: 0x2006,
  COLOR_PROFILE: 0x2007,
  EXTERNAL_FILES: 0x2008,
  MASK: 0x2016,
  PATH: 0x2017,
  TAGS: 0x2018,
  PALETTE: 0x2019,
  USER_DATA: 0x2020,
  SLICE: 0x2022,
  TILESET: 0x2023,
} as const

// Aseprite blend modes
const AsepriteBlendMode = {
  NORMAL: 0,
  MULTIPLY: 1,
  SCREEN: 2,
  OVERLAY: 3,
  DARKEN: 4,
  LIGHTEN: 5,
  COLOR_DODGE: 6,
  COLOR_BURN: 7,
  HARD_LIGHT: 8,
  SOFT_LIGHT: 9,
  DIFFERENCE: 10,
  EXCLUSION: 11,
  HUE: 12,
  SATURATION: 13,
  COLOR: 14,
  LUMINOSITY: 15,
  ADD: 16,
  SUBTRACT: 17,
  DIVIDE: 18,
} as const

// Layer types
const LayerType = {
  PIXEL: 0,
  GROUP: 1,
  TILEMAP: 2,
} as const

// Cel types
const CelType = {
  RAW: 0,
  LINKED: 1,
  COMPRESSED: 2,
  COMPRESSED_TILEMAP: 3,
} as const

const BASE_CEL_CHUNK_SIZE = 22
const IMAGE_CEL_CHUNK_SIZE = BASE_CEL_CHUNK_SIZE + 4
const TILEMAP_CEL_CHUNK_SIZE = BASE_CEL_CHUNK_SIZE + 32

// Result interfaces
export interface AsepriteLayer {
  name: string
  type: 'pixel' | 'group' | 'tilemap'
  visible: boolean
  locked: boolean
  opacity: number
  blendMode: BlendMode
  childLevel: number
  expanded?: boolean
}

export interface AsepriteCel {
  layerIndex: number
  x: number
  y: number
  opacity: number
  width: number
  height: number
  imageData: ImageData | null
  linkedFrame?: number
  zIndex: number
}

export interface AsepriteFrame {
  duration: number // milliseconds
  cels: AsepriteCel[]
}

export interface AsepriteTag {
  name: string
  fromFrame: number
  toFrame: number
  color: string
}

export interface AsepritePalette {
  name: string
  colors: string[]
}

export interface AsepriteProject {
  name: string
  width: number
  height: number
  colorDepth: number
  layers: AsepriteLayer[]
  frames: AsepriteFrame[]
  tags: AsepriteTag[]
  palettes: AsepritePalette[]
}

/**
 * Binary reader helper class
 */
class BinaryReader {
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

  getUint8(): number {
    const value = this.view.getUint8(this.offset)
    this.offset += 1
    return value
  }

  getInt8(): number {
    const value = this.view.getInt8(this.offset)
    this.offset += 1
    return value
  }

  getUint16(): number {
    const value = this.view.getUint16(this.offset, true) // Little endian
    this.offset += 2
    return value
  }

  getInt16(): number {
    const value = this.view.getInt16(this.offset, true)
    this.offset += 2
    return value
  }

  getUint32(): number {
    const value = this.view.getUint32(this.offset, true)
    this.offset += 4
    return value
  }

  getInt32(): number {
    const value = this.view.getInt32(this.offset, true)
    this.offset += 4
    return value
  }

  getFloat32(): number {
    const value = this.view.getFloat32(this.offset, true)
    this.offset += 4
    return value
  }

  getFloat64(): number {
    const value = this.view.getFloat64(this.offset, true)
    this.offset += 8
    return value
  }

  getBuffer(length: number): Uint8Array {
    const buffer = new Uint8Array(this.view.buffer, this.offset, length)
    this.offset += length
    return new Uint8Array(buffer) // Return a copy
  }

  getString(): string {
    const length = this.getUint16()
    const bytes = this.getBuffer(length)
    return new TextDecoder('utf-8').decode(bytes)
  }

  skip(bytes: number): void {
    this.offset += bytes
  }
}

/**
 * Map Aseprite blend mode to our blend modes
 */
function matchBlendMode(aseBlendMode: number): BlendMode {
  const mapping: Record<number, BlendMode> = {
    [AsepriteBlendMode.NORMAL]: 'normal',
    [AsepriteBlendMode.MULTIPLY]: 'multiply',
    [AsepriteBlendMode.SCREEN]: 'screen',
    [AsepriteBlendMode.OVERLAY]: 'overlay',
    [AsepriteBlendMode.DARKEN]: 'darken',
    [AsepriteBlendMode.LIGHTEN]: 'lighten',
    [AsepriteBlendMode.COLOR_DODGE]: 'color-dodge',
    [AsepriteBlendMode.COLOR_BURN]: 'color-burn',
    [AsepriteBlendMode.HARD_LIGHT]: 'hard-light',
    [AsepriteBlendMode.SOFT_LIGHT]: 'soft-light',
    [AsepriteBlendMode.DIFFERENCE]: 'difference',
    [AsepriteBlendMode.EXCLUSION]: 'exclusion',
    [AsepriteBlendMode.HUE]: 'hue',
    [AsepriteBlendMode.SATURATION]: 'saturation',
    [AsepriteBlendMode.COLOR]: 'color',
    [AsepriteBlendMode.LUMINOSITY]: 'luminosity',
    [AsepriteBlendMode.ADD]: 'linear-dodge',
    [AsepriteBlendMode.SUBTRACT]: 'subtract',
    [AsepriteBlendMode.DIVIDE]: 'divide',
  }
  return mapping[aseBlendMode] || 'normal'
}

/**
 * Convert RGBA bytes to ImageData
 */
function createImageData(
  width: number,
  height: number,
  bytes: Uint8Array,
  colorDepth: number
): ImageData {
  const imageData = new ImageData(width, height)
  const data = imageData.data

  if (colorDepth === 32) {
    // RGBA - direct copy
    for (let i = 0; i < bytes.length && i < data.length; i++) {
      data[i] = bytes[i]
    }
  } else if (colorDepth === 16) {
    // Grayscale + Alpha
    for (let i = 0, j = 0; i < bytes.length && j < data.length; i += 2, j += 4) {
      const gray = bytes[i]
      const alpha = bytes[i + 1]
      data[j] = gray
      data[j + 1] = gray
      data[j + 2] = gray
      data[j + 3] = alpha
    }
  } else if (colorDepth === 8) {
    // Indexed - we'll convert to grayscale for now
    // (palette would need to be applied separately)
    for (let i = 0, j = 0; i < bytes.length && j < data.length; i++, j += 4) {
      const index = bytes[i]
      data[j] = index
      data[j + 1] = index
      data[j + 2] = index
      data[j + 3] = index > 0 ? 255 : 0
    }
  }

  return imageData
}

/**
 * Decompress ZLIB data
 */
function decompressZlib(data: Uint8Array, expectedSize: number): Uint8Array {
  try {
    return pako.inflate(data)
  } catch {
    console.warn('Failed to decompress with pako, returning raw data')
    return data
  }
}

/**
 * Parse an Aseprite file
 */
export async function parseAseprite(buffer: ArrayBuffer): Promise<AsepriteProject> {
  const reader = new BinaryReader(buffer)

  // Header
  const fileSize = reader.getUint32()
  const magicNumber = reader.getUint16()

  if (magicNumber !== 0xA5E0) {
    throw new Error('Invalid Aseprite file: wrong magic number')
  }

  const numFrames = reader.getUint16()
  const width = reader.getUint16()
  const height = reader.getUint16()
  const colorDepth = reader.getUint16() // 32=RGBA, 16=Grayscale, 8=Indexed
  const flags = reader.getUint32()
  const hasOpacityFlag = (flags & 1) === 1

  reader.getUint16() // Deprecated speed
  reader.getUint32() // Should be 0
  reader.getUint32() // Should be 0

  const transparentIndex = reader.getUint8()
  reader.skip(3) // Ignored

  const numColors = reader.getUint16()
  const pixelWidth = reader.getUint8()
  const pixelHeight = reader.getUint8()

  reader.skip(2) // Grid X
  reader.skip(2) // Grid Y
  reader.skip(2) // Grid Width
  reader.skip(2) // Grid Height
  reader.skip(84) // Future use

  const pixelBytes = colorDepth === 32 ? 4 : colorDepth === 16 ? 2 : 1

  const project: AsepriteProject = {
    name: 'Imported Aseprite',
    width,
    height,
    colorDepth,
    layers: [],
    frames: [],
    tags: [],
    palettes: [],
  }

  let currentPalette: string[] = []

  // Parse frames
  for (let frameIndex = 0; frameIndex < numFrames; frameIndex++) {
    const frameBytes = reader.getUint32()
    const frameMagic = reader.getUint16()

    if (frameMagic !== 0xF1FA) {
      console.error(`Invalid frame magic at frame ${frameIndex}`)
      continue
    }

    const frame: AsepriteFrame = {
      duration: 100,
      cels: [],
    }

    let numChunks = reader.getUint16()
    const frameDuration = reader.getUint16()
    frame.duration = frameDuration

    reader.skip(2) // Future use

    const newNumChunks = reader.getUint32()
    if (newNumChunks !== 0) {
      numChunks = newNumChunks
    }

    let previousChunkType = 0

    // Parse chunks
    for (let chunkIndex = 0; chunkIndex < numChunks; chunkIndex++) {
      const chunkSize = reader.getUint32()
      const chunkType = reader.getUint16()
      const chunkDataSize = chunkSize - 6 // Subtract header size
      const chunkStart = reader.position

      if (chunkType !== ChunkTypes.USER_DATA) {
        previousChunkType = chunkType
      }

      switch (chunkType) {
        case ChunkTypes.LAYER: {
          const layerFlags = reader.getUint16()
          const layerType = reader.getUint16()
          const childLevel = reader.getUint16()
          reader.skip(2) // Width (ignored)
          reader.skip(2) // Height (ignored)
          const blendMode = reader.getUint16()

          let opacity = 1.0
          if (hasOpacityFlag) {
            opacity = reader.getUint8() / 255.0
          }
          reader.skip(3) // Future use

          const layerName = reader.getString()

          const layer: AsepriteLayer = {
            name: layerName,
            type: layerType === LayerType.GROUP ? 'group' : layerType === LayerType.TILEMAP ? 'tilemap' : 'pixel',
            visible: (layerFlags & 1) === 1,
            locked: (layerFlags & 2) !== 2,
            opacity: opacity * 100,
            blendMode: matchBlendMode(blendMode),
            childLevel,
            expanded: (layerFlags & 32) !== 32,
          }

          project.layers.push(layer)

          // Skip tileset index for tilemap layers
          if (layerType === LayerType.TILEMAP) {
            reader.getUint32()
          }
          break
        }

        case ChunkTypes.CEL: {
          const layerIndex = reader.getUint16()
          const xPos = reader.getInt16()
          const yPos = reader.getInt16()
          const celOpacity = reader.getUint8() / 255.0
          const celType = reader.getUint16()
          const zIndex = reader.getInt16()
          reader.skip(5) // Future use

          const cel: AsepriteCel = {
            layerIndex,
            x: xPos,
            y: yPos,
            opacity: celOpacity * 100,
            width: 0,
            height: 0,
            imageData: null,
            zIndex,
          }

          if (celType === CelType.RAW || celType === CelType.COMPRESSED) {
            const celWidth = reader.getUint16()
            const celHeight = reader.getUint16()
            cel.width = celWidth
            cel.height = celHeight

            const imageDataSize = chunkSize - IMAGE_CEL_CHUNK_SIZE
            let colorBytes = reader.getBuffer(imageDataSize)

            if (celType === CelType.COMPRESSED) {
              const expectedSize = celWidth * celHeight * pixelBytes
              colorBytes = decompressZlib(colorBytes, expectedSize)
            }

            cel.imageData = createImageData(celWidth, celHeight, colorBytes, colorDepth)
          } else if (celType === CelType.LINKED) {
            const linkedFrame = reader.getUint16()
            cel.linkedFrame = linkedFrame
          } else if (celType === CelType.COMPRESSED_TILEMAP) {
            // Tilemap cel - skip for now
            const remainingBytes = chunkSize - (reader.position - chunkStart) - 6
            reader.skip(remainingBytes > 0 ? remainingBytes : 0)
          }

          frame.cels.push(cel)
          break
        }

        case ChunkTypes.TAGS: {
          const numTags = reader.getUint16()
          reader.skip(8) // Future use

          for (let i = 0; i < numTags; i++) {
            const fromFrame = reader.getUint16()
            const toFrame = reader.getUint16()
            reader.skip(1) // Animation direction
            reader.skip(2) // Repeat
            reader.skip(6) // Future use
            reader.skip(3) // Deprecated RGB
            reader.skip(1) // Extra byte

            const tagName = reader.getString()

            project.tags.push({
              name: tagName,
              fromFrame,
              toFrame,
              color: '#ffffff',
            })
          }
          break
        }

        case ChunkTypes.PALETTE: {
          const paletteSize = reader.getUint32()
          const firstIndex = reader.getUint32()
          const lastIndex = reader.getUint32()
          reader.skip(8) // Future use

          const colors: string[] = []
          for (let i = firstIndex; i <= lastIndex; i++) {
            const entryFlags = reader.getUint16()
            const r = reader.getUint8()
            const g = reader.getUint8()
            const b = reader.getUint8()
            const a = reader.getUint8()

            const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
            colors.push(hex)

            if ((entryFlags & 1) === 1) {
              reader.getString() // Color name
            }
          }

          currentPalette = colors
          project.palettes.push({
            name: `Palette ${project.palettes.length + 1}`,
            colors,
          })
          break
        }

        case ChunkTypes.USER_DATA: {
          const userFlags = reader.getUint32()
          if ((userFlags & 1) === 1) {
            reader.getString() // Text
          }
          if ((userFlags & 2) === 2) {
            reader.skip(4) // RGBA color
          }
          if ((userFlags & 4) === 4) {
            // Properties map - skip
            const mapSize = reader.getUint32()
            const numMaps = reader.getUint32()
            for (let i = 0; i < numMaps; i++) {
              reader.getUint32() // Key
              const numProps = reader.getUint32()
              for (let j = 0; j < numProps; j++) {
                reader.getString() // Name
                const propType = reader.getUint16()
                skipPropertyValue(reader, propType)
              }
            }
          }
          break
        }

        case ChunkTypes.COLOR_PROFILE: {
          reader.skip(chunkDataSize)
          break
        }

        case ChunkTypes.EXTERNAL_FILES: {
          reader.skip(chunkDataSize)
          break
        }

        case ChunkTypes.SLICE: {
          reader.skip(chunkDataSize)
          break
        }

        case ChunkTypes.TILESET: {
          reader.skip(chunkDataSize)
          break
        }

        case ChunkTypes.CEL_EXTRA: {
          reader.skip(chunkDataSize)
          break
        }

        case ChunkTypes.MASK: {
          reader.skip(chunkDataSize)
          break
        }

        default:
          // Unknown chunk, skip
          reader.skip(chunkDataSize)
      }

      // Ensure we're at the right position after chunk
      const expectedPos = chunkStart + chunkDataSize
      if (reader.position < expectedPos) {
        reader.skip(expectedPos - reader.position)
      }
    }

    project.frames.push(frame)
  }

  return project
}

/**
 * Skip a property value based on type
 */
function skipPropertyValue(reader: BinaryReader, propType: number): void {
  switch (propType) {
    case 0x0001:
    case 0x0002:
    case 0x0003:
      reader.skip(1)
      break
    case 0x0004:
    case 0x0005:
      reader.skip(2)
      break
    case 0x0006:
    case 0x0007:
      reader.skip(4)
      break
    case 0x0008:
    case 0x0009:
      reader.skip(8)
      break
    case 0x000A:
    case 0x000B:
      reader.skip(4)
      break
    case 0x000C:
      reader.skip(8)
      break
    case 0x000D:
      reader.getString()
      break
    case 0x000E:
    case 0x000F:
      reader.skip(8)
      break
    case 0x0010:
      reader.skip(16)
      break
    case 0x0013:
      reader.skip(16)
      break
    default:
      break
  }
}

/**
 * Load an Aseprite file from a File object
 */
export async function loadAsepriteFile(file: File): Promise<AsepriteProject> {
  const buffer = await file.arrayBuffer()
  return parseAseprite(buffer)
}

/**
 * Convert Aseprite project to our format
 */
export function asepriteToProject(
  ase: AsepriteProject
): {
  width: number
  height: number
  layers: Array<{
    id: string
    name: string
    visible: boolean
    locked: boolean
    opacity: number
    blendMode: BlendMode
    type: 'pixel' | 'group'
    data: ImageData | null
  }>
  frames: Array<{
    id: string
    duration: number
    layers: Array<{
      id: string
      name: string
      visible: boolean
      locked: boolean
      opacity: number
      blendMode: BlendMode
      type: 'pixel' | 'group'
      data: ImageData | null
    }>
  }>
  tags: Array<{
    id: string
    name: string
    color: string
    fromFrame: number
    toFrame: number
  }>
  palette: string[]
} {
  const layers = ase.layers.map((layer, index) => ({
    id: `layer-${index}`,
    name: layer.name,
    visible: layer.visible,
    locked: layer.locked,
    opacity: layer.opacity,
    blendMode: layer.blendMode,
    type: layer.type === 'group' ? 'group' as const : 'pixel' as const,
    data: null as ImageData | null,
  }))

  // Process frames and composite cels onto layers
  const frames = ase.frames.map((frame, frameIndex) => {
    const frameLayers = layers.map((layer, layerIndex) => {
      // Find cel for this layer in this frame
      const cel = frame.cels.find(c => c.layerIndex === layerIndex)

      let imageData: ImageData | null = null
      if (cel?.imageData) {
        // Create full-size image and blit cel at position
        imageData = new ImageData(ase.width, ase.height)
        const celData = cel.imageData

        for (let y = 0; y < cel.height; y++) {
          for (let x = 0; x < cel.width; x++) {
            const srcIdx = (y * cel.width + x) * 4
            const dstX = cel.x + x
            const dstY = cel.y + y

            if (dstX >= 0 && dstX < ase.width && dstY >= 0 && dstY < ase.height) {
              const dstIdx = (dstY * ase.width + dstX) * 4
              imageData.data[dstIdx] = celData.data[srcIdx]
              imageData.data[dstIdx + 1] = celData.data[srcIdx + 1]
              imageData.data[dstIdx + 2] = celData.data[srcIdx + 2]
              imageData.data[dstIdx + 3] = celData.data[srcIdx + 3]
            }
          }
        }
      } else if (cel?.linkedFrame !== undefined) {
        // Handle linked cels
        const linkedFrame = ase.frames[cel.linkedFrame]
        const linkedCel = linkedFrame?.cels.find(c => c.layerIndex === layerIndex)
        if (linkedCel?.imageData) {
          imageData = new ImageData(ase.width, ase.height)
          const celData = linkedCel.imageData

          for (let y = 0; y < linkedCel.height; y++) {
            for (let x = 0; x < linkedCel.width; x++) {
              const srcIdx = (y * linkedCel.width + x) * 4
              const dstX = linkedCel.x + x
              const dstY = linkedCel.y + y

              if (dstX >= 0 && dstX < ase.width && dstY >= 0 && dstY < ase.height) {
                const dstIdx = (dstY * ase.width + dstX) * 4
                imageData.data[dstIdx] = celData.data[srcIdx]
                imageData.data[dstIdx + 1] = celData.data[srcIdx + 1]
                imageData.data[dstIdx + 2] = celData.data[srcIdx + 2]
                imageData.data[dstIdx + 3] = celData.data[srcIdx + 3]
              }
            }
          }
        }
      }

      return {
        ...layer,
        id: `layer-${layerIndex}-frame-${frameIndex}`,
        data: imageData,
      }
    })

    return {
      id: `frame-${frameIndex}`,
      duration: frame.duration,
      layers: frameLayers,
    }
  })

  const tags = ase.tags.map((tag, index) => ({
    id: `tag-${index}`,
    name: tag.name,
    color: tag.color,
    fromFrame: tag.fromFrame,
    toFrame: tag.toFrame,
  }))

  const palette = ase.palettes.length > 0 ? ase.palettes[0].colors : []

  return {
    width: ase.width,
    height: ase.height,
    layers: frames[0]?.layers || layers,
    frames,
    tags,
    palette,
  }
}
