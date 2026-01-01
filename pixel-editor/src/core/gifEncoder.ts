/**
 * GIF Encoder - Pure JavaScript GIF animation encoder
 * Based on LZW compression algorithm for GIF format
 */

// GIF constants
const GIF_HEADER = 'GIF89a'
const NETSCAPE_EXT = [0x21, 0xFF, 0x0B, 0x4E, 0x45, 0x54, 0x53, 0x43, 0x41, 0x50, 0x45, 0x32, 0x2E, 0x30]

interface GifFrame {
  imageData: ImageData
  delay: number // in 1/100ths of a second
}

interface GifOptions {
  width: number
  height: number
  loop?: number // 0 = infinite loop
  quality?: number // 1-30, lower = better quality but slower
  background?: number // background color index
  transparent?: number // transparent color index, -1 for none
}

/**
 * Simple color quantization using median cut algorithm
 */
class ColorQuantizer {
  private colors: number[][] = []
  private colorMap: Map<string, number> = new Map()

  constructor(private maxColors: number = 256) {}

  addColor(r: number, g: number, b: number): void {
    const key = `${r},${g},${b}`
    if (!this.colorMap.has(key)) {
      if (this.colors.length < this.maxColors) {
        this.colorMap.set(key, this.colors.length)
        this.colors.push([r, g, b])
      }
    }
  }

  buildPalette(imageData: ImageData): number[][] {
    const data = imageData.data
    const colorCounts: Map<string, { count: number; r: number; g: number; b: number }> = new Map()

    // Count colors
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 128) continue // Skip transparent pixels

      // Reduce color precision for better quantization
      const r = data[i] & 0xF8
      const g = data[i + 1] & 0xF8
      const b = data[i + 2] & 0xF8
      const key = `${r},${g},${b}`

      const existing = colorCounts.get(key)
      if (existing) {
        existing.count++
      } else {
        colorCounts.set(key, { count: 1, r, g, b })
      }
    }

    // Sort by frequency and take top colors
    const sorted = Array.from(colorCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, this.maxColors - 1)

    // Build palette (index 0 reserved for transparent)
    this.colors = [[0, 0, 0]] // Index 0 = transparent placeholder
    this.colorMap.clear()
    this.colorMap.set('transparent', 0)

    for (const color of sorted) {
      const key = `${color.r},${color.g},${color.b}`
      this.colorMap.set(key, this.colors.length)
      this.colors.push([color.r, color.g, color.b])
    }

    // Pad to power of 2
    while (this.colors.length < this.maxColors && !this.isPowerOf2(this.colors.length)) {
      this.colors.push([0, 0, 0])
    }

    return this.colors
  }

  private isPowerOf2(n: number): boolean {
    return n > 0 && (n & (n - 1)) === 0
  }

  getColorIndex(r: number, g: number, b: number, a: number): number {
    if (a < 128) return 0 // Transparent

    // Reduce precision to match palette
    const rq = r & 0xF8
    const gq = g & 0xF8
    const bq = b & 0xF8
    const key = `${rq},${gq},${bq}`

    const index = this.colorMap.get(key)
    if (index !== undefined) return index

    // Find nearest color
    return this.findNearestColor(r, g, b)
  }

  private findNearestColor(r: number, g: number, b: number): number {
    let minDist = Infinity
    let nearestIndex = 1

    for (let i = 1; i < this.colors.length; i++) {
      const [cr, cg, cb] = this.colors[i]
      const dist = (r - cr) ** 2 + (g - cg) ** 2 + (b - cb) ** 2
      if (dist < minDist) {
        minDist = dist
        nearestIndex = i
      }
    }

    return nearestIndex
  }

  getPalette(): number[][] {
    return this.colors
  }
}

/**
 * LZW Encoder for GIF
 */
class LZWEncoder {
  private minCodeSize: number
  private clearCode: number
  private eofCode: number
  private codeSize: number
  private maxCode: number
  private nextCode: number
  private codeTable: Map<string, number> = new Map()
  private buffer: number[] = []
  private bitBuffer: number = 0
  private bitCount: number = 0

  constructor(colorDepth: number) {
    this.minCodeSize = Math.max(2, colorDepth)
    this.clearCode = 1 << this.minCodeSize
    this.eofCode = this.clearCode + 1
    this.codeSize = this.minCodeSize + 1
    this.maxCode = (1 << this.codeSize) - 1
    this.nextCode = this.eofCode + 1
    this.initCodeTable()
  }

  private initCodeTable(): void {
    this.codeTable.clear()
    for (let i = 0; i < this.clearCode; i++) {
      this.codeTable.set(String(i), i)
    }
    this.nextCode = this.eofCode + 1
    this.codeSize = this.minCodeSize + 1
    this.maxCode = (1 << this.codeSize) - 1
  }

  encode(indices: number[]): Uint8Array {
    this.buffer = []
    this.bitBuffer = 0
    this.bitCount = 0
    this.initCodeTable()

    // Write clear code
    this.writeCode(this.clearCode)

    if (indices.length === 0) {
      this.writeCode(this.eofCode)
      this.flushBits()
      return this.toSubBlocks()
    }

    let current = String(indices[0])

    for (let i = 1; i < indices.length; i++) {
      const next = String(indices[i])
      const combined = `${current},${next}`

      if (this.codeTable.has(combined)) {
        current = combined
      } else {
        this.writeCode(this.codeTable.get(current)!)

        if (this.nextCode <= 4095) {
          this.codeTable.set(combined, this.nextCode++)

          if (this.nextCode > this.maxCode && this.codeSize < 12) {
            this.codeSize++
            this.maxCode = (1 << this.codeSize) - 1
          }
        } else {
          // Reset code table
          this.writeCode(this.clearCode)
          this.initCodeTable()
        }

        current = next
      }
    }

    this.writeCode(this.codeTable.get(current)!)
    this.writeCode(this.eofCode)
    this.flushBits()

    return this.toSubBlocks()
  }

  private writeCode(code: number): void {
    this.bitBuffer |= code << this.bitCount
    this.bitCount += this.codeSize

    while (this.bitCount >= 8) {
      this.buffer.push(this.bitBuffer & 0xFF)
      this.bitBuffer >>= 8
      this.bitCount -= 8
    }
  }

  private flushBits(): void {
    if (this.bitCount > 0) {
      this.buffer.push(this.bitBuffer & 0xFF)
    }
  }

  private toSubBlocks(): Uint8Array {
    const result: number[] = []
    let offset = 0

    while (offset < this.buffer.length) {
      const blockSize = Math.min(255, this.buffer.length - offset)
      result.push(blockSize)
      for (let i = 0; i < blockSize; i++) {
        result.push(this.buffer[offset + i])
      }
      offset += blockSize
    }

    result.push(0) // Block terminator
    return new Uint8Array(result)
  }

  getMinCodeSize(): number {
    return this.minCodeSize
  }
}

/**
 * GIF Encoder main class
 */
export class GifEncoder {
  private width: number
  private height: number
  private loop: number
  private transparent: number
  private frames: GifFrame[] = []
  private globalPalette: number[][] = []

  constructor(options: GifOptions) {
    this.width = options.width
    this.height = options.height
    this.loop = options.loop ?? 0
    this.transparent = options.transparent ?? 0
  }

  addFrame(imageData: ImageData, delay: number = 100): void {
    this.frames.push({ imageData, delay })
  }

  encode(): Uint8Array {
    if (this.frames.length === 0) {
      throw new Error('No frames to encode')
    }

    const parts: Uint8Array[] = []

    // Build global palette from first frame
    const quantizer = new ColorQuantizer(256)
    this.globalPalette = quantizer.buildPalette(this.frames[0].imageData)

    // Header
    parts.push(this.encodeHeader())

    // Logical Screen Descriptor
    parts.push(this.encodeLogicalScreenDescriptor())

    // Global Color Table
    parts.push(this.encodeColorTable(this.globalPalette))

    // Netscape Extension (for looping)
    if (this.frames.length > 1) {
      parts.push(this.encodeNetscapeExtension())
    }

    // Frames
    for (const frame of this.frames) {
      // Re-quantize each frame for better quality
      const frameQuantizer = new ColorQuantizer(256)
      const palette = frameQuantizer.buildPalette(frame.imageData)

      parts.push(this.encodeGraphicControlExtension(frame.delay, this.transparent >= 0))
      parts.push(this.encodeImageDescriptor(true))
      parts.push(this.encodeColorTable(palette))
      parts.push(this.encodeImageData(frame.imageData, frameQuantizer))
    }

    // Trailer
    parts.push(new Uint8Array([0x3B]))

    // Combine all parts
    const totalLength = parts.reduce((sum, part) => sum + part.length, 0)
    const result = new Uint8Array(totalLength)
    let offset = 0
    for (const part of parts) {
      result.set(part, offset)
      offset += part.length
    }

    return result
  }

  private encodeHeader(): Uint8Array {
    return new TextEncoder().encode(GIF_HEADER)
  }

  private encodeLogicalScreenDescriptor(): Uint8Array {
    const colorDepth = 7 // 256 colors = 2^8, so depth is 8-1 = 7
    const packedByte = 0x80 | // Global Color Table Flag
                       (colorDepth << 4) | // Color Resolution
                       0x00 | // Sort Flag
                       colorDepth // Size of Global Color Table

    return new Uint8Array([
      this.width & 0xFF,
      (this.width >> 8) & 0xFF,
      this.height & 0xFF,
      (this.height >> 8) & 0xFF,
      packedByte,
      0, // Background Color Index
      0  // Pixel Aspect Ratio
    ])
  }

  private encodeColorTable(palette: number[][]): Uint8Array {
    const size = 256 * 3
    const table = new Uint8Array(size)

    for (let i = 0; i < 256; i++) {
      const color = palette[i] || [0, 0, 0]
      table[i * 3] = color[0]
      table[i * 3 + 1] = color[1]
      table[i * 3 + 2] = color[2]
    }

    return table
  }

  private encodeNetscapeExtension(): Uint8Array {
    return new Uint8Array([
      ...NETSCAPE_EXT,
      0x03, // Sub-block size
      0x01, // Loop indicator
      this.loop & 0xFF,
      (this.loop >> 8) & 0xFF,
      0x00  // Block terminator
    ])
  }

  private encodeGraphicControlExtension(delay: number, hasTransparent: boolean): Uint8Array {
    const disposalMethod = 2 // Restore to background
    const packedByte = (disposalMethod << 2) | (hasTransparent ? 0x01 : 0x00)

    return new Uint8Array([
      0x21, // Extension Introducer
      0xF9, // Graphic Control Label
      0x04, // Block Size
      packedByte,
      delay & 0xFF,
      (delay >> 8) & 0xFF,
      hasTransparent ? this.transparent : 0, // Transparent Color Index
      0x00  // Block Terminator
    ])
  }

  private encodeImageDescriptor(hasLocalColorTable: boolean): Uint8Array {
    const colorDepth = 7
    const packedByte = hasLocalColorTable ? (0x80 | colorDepth) : 0x00

    return new Uint8Array([
      0x2C, // Image Separator
      0, 0, // Left Position
      0, 0, // Top Position
      this.width & 0xFF,
      (this.width >> 8) & 0xFF,
      this.height & 0xFF,
      (this.height >> 8) & 0xFF,
      packedByte
    ])
  }

  private encodeImageData(imageData: ImageData, quantizer: ColorQuantizer): Uint8Array {
    const data = imageData.data
    const indices: number[] = []

    for (let i = 0; i < data.length; i += 4) {
      indices.push(quantizer.getColorIndex(
        data[i],
        data[i + 1],
        data[i + 2],
        data[i + 3]
      ))
    }

    const encoder = new LZWEncoder(8)
    const encoded = encoder.encode(indices)

    const result = new Uint8Array(1 + encoded.length)
    result[0] = encoder.getMinCodeSize()
    result.set(encoded, 1)

    return result
  }

  toBlob(): Blob {
    return new Blob([this.encode()], { type: 'image/gif' })
  }

  toDataURL(): string {
    const bytes = this.encode()
    let binary = ''
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return 'data:image/gif;base64,' + btoa(binary)
  }
}

/**
 * Helper function to create GIF from canvas frames
 */
export async function createAnimatedGif(
  frames: HTMLCanvasElement[],
  fps: number = 12,
  options: Partial<GifOptions> = {}
): Promise<Blob> {
  if (frames.length === 0) {
    throw new Error('No frames provided')
  }

  const width = frames[0].width
  const height = frames[0].height
  const delay = Math.round(100 / fps) // Convert FPS to centiseconds

  const encoder = new GifEncoder({
    width,
    height,
    loop: options.loop ?? 0,
    transparent: options.transparent ?? 0,
    ...options
  })

  for (const frame of frames) {
    const ctx = frame.getContext('2d')
    if (!ctx) continue

    const imageData = ctx.getImageData(0, 0, width, height)
    encoder.addFrame(imageData, delay)
  }

  return encoder.toBlob()
}

/**
 * Helper function to download GIF
 */
export async function downloadAnimatedGif(
  frames: HTMLCanvasElement[],
  filename: string,
  fps: number = 12
): Promise<void> {
  const blob = await createAnimatedGif(frames, fps)
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}.gif`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  URL.revokeObjectURL(url)
}
