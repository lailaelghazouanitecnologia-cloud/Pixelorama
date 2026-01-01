/**
 * APNG Encoder - Animated PNG encoder
 * Creates animated PNG files with full alpha channel support
 */

// PNG signature
const PNG_SIGNATURE = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])

// CRC32 lookup table
const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1)
    }
    table[n] = c
  }
  return table
})()

function crc32(data: Uint8Array): number {
  let crc = 0xFFFFFFFF
  for (let i = 0; i < data.length; i++) {
    crc = CRC_TABLE[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8)
  }
  return (crc ^ 0xFFFFFFFF) >>> 0
}

function adler32(data: Uint8Array): number {
  let a = 1
  let b = 0
  const MOD = 65521
  for (let i = 0; i < data.length; i++) {
    a = (a + data[i]) % MOD
    b = (b + a) % MOD
  }
  return ((b << 16) | a) >>> 0
}

/**
 * Simple DEFLATE compression (store method - no compression for simplicity)
 * For production, consider using pako or similar library
 */
function deflateStore(data: Uint8Array): Uint8Array {
  const chunks: Uint8Array[] = []
  let offset = 0
  const maxBlockSize = 65535

  while (offset < data.length) {
    const remaining = data.length - offset
    const blockSize = Math.min(remaining, maxBlockSize)
    const isLast = offset + blockSize >= data.length

    // Block header
    const header = new Uint8Array(5)
    header[0] = isLast ? 0x01 : 0x00 // BFINAL + BTYPE (store)
    header[1] = blockSize & 0xFF
    header[2] = (blockSize >> 8) & 0xFF
    header[3] = (~blockSize) & 0xFF
    header[4] = ((~blockSize) >> 8) & 0xFF

    chunks.push(header)
    chunks.push(data.slice(offset, offset + blockSize))
    offset += blockSize
  }

  // Combine chunks
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
  const result = new Uint8Array(totalLength)
  let pos = 0
  for (const chunk of chunks) {
    result.set(chunk, pos)
    pos += chunk.length
  }

  return result
}

function zlibCompress(data: Uint8Array): Uint8Array {
  const deflated = deflateStore(data)
  const adler = adler32(data)

  // zlib header (CMF, FLG) + deflated data + adler32
  const result = new Uint8Array(2 + deflated.length + 4)
  result[0] = 0x78 // CMF: deflate, 32K window
  result[1] = 0x01 // FLG: no dict, check bits

  result.set(deflated, 2)

  // Adler32 checksum (big-endian)
  const adlerOffset = 2 + deflated.length
  result[adlerOffset] = (adler >> 24) & 0xFF
  result[adlerOffset + 1] = (adler >> 16) & 0xFF
  result[adlerOffset + 2] = (adler >> 8) & 0xFF
  result[adlerOffset + 3] = adler & 0xFF

  return result
}

function createChunk(type: string, data: Uint8Array): Uint8Array {
  const typeBytes = new TextEncoder().encode(type)
  const length = data.length

  // Length (4) + Type (4) + Data + CRC (4)
  const chunk = new Uint8Array(4 + 4 + length + 4)

  // Length (big-endian)
  chunk[0] = (length >> 24) & 0xFF
  chunk[1] = (length >> 16) & 0xFF
  chunk[2] = (length >> 8) & 0xFF
  chunk[3] = length & 0xFF

  // Type
  chunk.set(typeBytes, 4)

  // Data
  chunk.set(data, 8)

  // CRC (over type + data)
  const crcData = new Uint8Array(4 + length)
  crcData.set(typeBytes, 0)
  crcData.set(data, 4)
  const crcValue = crc32(crcData)

  chunk[8 + length] = (crcValue >> 24) & 0xFF
  chunk[8 + length + 1] = (crcValue >> 16) & 0xFF
  chunk[8 + length + 2] = (crcValue >> 8) & 0xFF
  chunk[8 + length + 3] = crcValue & 0xFF

  return chunk
}

interface ApngFrame {
  imageData: ImageData
  delay: number // in milliseconds
}

interface ApngOptions {
  width: number
  height: number
  loop?: number // 0 = infinite
}

/**
 * APNG Encoder class
 */
export class ApngEncoder {
  private width: number
  private height: number
  private loop: number
  private frames: ApngFrame[] = []

  constructor(options: ApngOptions) {
    this.width = options.width
    this.height = options.height
    this.loop = options.loop ?? 0
  }

  addFrame(imageData: ImageData, delay: number = 100): void {
    this.frames.push({ imageData, delay })
  }

  encode(): Uint8Array {
    if (this.frames.length === 0) {
      throw new Error('No frames to encode')
    }

    const chunks: Uint8Array[] = []

    // PNG signature
    chunks.push(PNG_SIGNATURE)

    // IHDR chunk
    chunks.push(this.createIHDR())

    // acTL chunk (animation control)
    chunks.push(this.createAcTL())

    // Frames
    let sequenceNumber = 0

    for (let i = 0; i < this.frames.length; i++) {
      const frame = this.frames[i]

      // fcTL chunk (frame control)
      chunks.push(this.createFcTL(sequenceNumber++, frame.delay))

      // Image data
      const imageDataChunk = this.encodeFrameData(frame.imageData)

      if (i === 0) {
        // First frame uses IDAT
        chunks.push(createChunk('IDAT', imageDataChunk))
      } else {
        // Subsequent frames use fdAT with sequence number
        const fdatData = new Uint8Array(4 + imageDataChunk.length)
        fdatData[0] = (sequenceNumber >> 24) & 0xFF
        fdatData[1] = (sequenceNumber >> 16) & 0xFF
        fdatData[2] = (sequenceNumber >> 8) & 0xFF
        fdatData[3] = sequenceNumber & 0xFF
        fdatData.set(imageDataChunk, 4)
        chunks.push(createChunk('fdAT', fdatData))
        sequenceNumber++
      }
    }

    // IEND chunk
    chunks.push(createChunk('IEND', new Uint8Array(0)))

    // Combine all chunks
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
    const result = new Uint8Array(totalLength)
    let offset = 0
    for (const chunk of chunks) {
      result.set(chunk, offset)
      offset += chunk.length
    }

    return result
  }

  private createIHDR(): Uint8Array {
    const data = new Uint8Array(13)

    // Width (big-endian)
    data[0] = (this.width >> 24) & 0xFF
    data[1] = (this.width >> 16) & 0xFF
    data[2] = (this.width >> 8) & 0xFF
    data[3] = this.width & 0xFF

    // Height (big-endian)
    data[4] = (this.height >> 24) & 0xFF
    data[5] = (this.height >> 16) & 0xFF
    data[6] = (this.height >> 8) & 0xFF
    data[7] = this.height & 0xFF

    // Bit depth
    data[8] = 8

    // Color type (6 = RGBA)
    data[9] = 6

    // Compression method
    data[10] = 0

    // Filter method
    data[11] = 0

    // Interlace method
    data[12] = 0

    return createChunk('IHDR', data)
  }

  private createAcTL(): Uint8Array {
    const data = new Uint8Array(8)

    // Number of frames
    const numFrames = this.frames.length
    data[0] = (numFrames >> 24) & 0xFF
    data[1] = (numFrames >> 16) & 0xFF
    data[2] = (numFrames >> 8) & 0xFF
    data[3] = numFrames & 0xFF

    // Number of plays (0 = infinite)
    data[4] = (this.loop >> 24) & 0xFF
    data[5] = (this.loop >> 16) & 0xFF
    data[6] = (this.loop >> 8) & 0xFF
    data[7] = this.loop & 0xFF

    return createChunk('acTL', data)
  }

  private createFcTL(sequenceNumber: number, delayMs: number): Uint8Array {
    const data = new Uint8Array(26)

    // Sequence number
    data[0] = (sequenceNumber >> 24) & 0xFF
    data[1] = (sequenceNumber >> 16) & 0xFF
    data[2] = (sequenceNumber >> 8) & 0xFF
    data[3] = sequenceNumber & 0xFF

    // Width
    data[4] = (this.width >> 24) & 0xFF
    data[5] = (this.width >> 16) & 0xFF
    data[6] = (this.width >> 8) & 0xFF
    data[7] = this.width & 0xFF

    // Height
    data[8] = (this.height >> 24) & 0xFF
    data[9] = (this.height >> 16) & 0xFF
    data[10] = (this.height >> 8) & 0xFF
    data[11] = this.height & 0xFF

    // X offset
    data[12] = 0
    data[13] = 0
    data[14] = 0
    data[15] = 0

    // Y offset
    data[16] = 0
    data[17] = 0
    data[18] = 0
    data[19] = 0

    // Delay numerator (milliseconds as fraction: delay/1000)
    const delayNum = delayMs
    data[20] = (delayNum >> 8) & 0xFF
    data[21] = delayNum & 0xFF

    // Delay denominator (1000 for milliseconds)
    const delayDen = 1000
    data[22] = (delayDen >> 8) & 0xFF
    data[23] = delayDen & 0xFF

    // Dispose op (0 = none)
    data[24] = 0

    // Blend op (0 = source)
    data[25] = 0

    return createChunk('fcTL', data)
  }

  private encodeFrameData(imageData: ImageData): Uint8Array {
    const width = imageData.width
    const height = imageData.height
    const data = imageData.data

    // Raw image data with filter byte per row
    const rawData = new Uint8Array(height * (1 + width * 4))

    for (let y = 0; y < height; y++) {
      const rowOffset = y * (1 + width * 4)
      rawData[rowOffset] = 0 // Filter type: None

      for (let x = 0; x < width; x++) {
        const srcIdx = (y * width + x) * 4
        const dstIdx = rowOffset + 1 + x * 4

        rawData[dstIdx] = data[srcIdx]     // R
        rawData[dstIdx + 1] = data[srcIdx + 1] // G
        rawData[dstIdx + 2] = data[srcIdx + 2] // B
        rawData[dstIdx + 3] = data[srcIdx + 3] // A
      }
    }

    return zlibCompress(rawData)
  }

  toBlob(): Blob {
    return new Blob([this.encode()], { type: 'image/apng' })
  }

  toDataURL(): string {
    const bytes = this.encode()
    let binary = ''
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return 'data:image/png;base64,' + btoa(binary)
  }
}

/**
 * Helper function to create APNG from canvas frames
 */
export async function createAnimatedPng(
  frames: HTMLCanvasElement[],
  fps: number = 12,
  options: Partial<ApngOptions> = {}
): Promise<Blob> {
  if (frames.length === 0) {
    throw new Error('No frames provided')
  }

  const width = frames[0].width
  const height = frames[0].height
  const delay = Math.round(1000 / fps) // Convert FPS to milliseconds

  const encoder = new ApngEncoder({
    width,
    height,
    loop: options.loop ?? 0,
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
 * Helper function to download APNG
 */
export async function downloadAnimatedPng(
  frames: HTMLCanvasElement[],
  filename: string,
  fps: number = 12
): Promise<void> {
  const blob = await createAnimatedPng(frames, fps)
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}.png`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  URL.revokeObjectURL(url)
}
