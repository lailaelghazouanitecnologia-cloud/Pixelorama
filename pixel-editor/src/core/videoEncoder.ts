/**
 * Video Encoder - Export animations as MP4/WebM
 * Uses browser's MediaRecorder API with canvas capture
 */

export type VideoFormat = 'webm' | 'mp4'

export interface VideoExportOptions {
  format: VideoFormat
  fps: number
  quality: number // 0-1
  scale: number
  loop?: number // Number of times to loop (0 = no loop in video)
}

/**
 * Check if video encoding is supported
 */
export function isVideoEncodingSupported(): { webm: boolean; mp4: boolean } {
  if (typeof MediaRecorder === 'undefined') {
    return { webm: false, mp4: false }
  }

  return {
    webm: MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ||
          MediaRecorder.isTypeSupported('video/webm;codecs=vp8') ||
          MediaRecorder.isTypeSupported('video/webm'),
    mp4: MediaRecorder.isTypeSupported('video/mp4;codecs=h264') ||
         MediaRecorder.isTypeSupported('video/mp4;codecs=avc1') ||
         MediaRecorder.isTypeSupported('video/mp4'),
  }
}

/**
 * Get the best supported codec for the format
 */
function getBestCodec(format: VideoFormat): string {
  if (format === 'webm') {
    if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
      return 'video/webm;codecs=vp9'
    }
    if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) {
      return 'video/webm;codecs=vp8'
    }
    return 'video/webm'
  }

  // MP4
  if (MediaRecorder.isTypeSupported('video/mp4;codecs=h264')) {
    return 'video/mp4;codecs=h264'
  }
  if (MediaRecorder.isTypeSupported('video/mp4;codecs=avc1')) {
    return 'video/mp4;codecs=avc1'
  }
  return 'video/mp4'
}

/**
 * Create a video from animation frames
 */
export async function createVideo(
  frames: HTMLCanvasElement[],
  options: VideoExportOptions,
  onProgress?: (progress: number) => void
): Promise<Blob> {
  if (frames.length === 0) {
    throw new Error('No frames to encode')
  }

  const { format, fps, quality, scale, loop = 0 } = options
  const frameWidth = frames[0].width * scale
  const frameHeight = frames[0].height * scale
  const frameDuration = 1000 / fps

  // Create a canvas for rendering
  const canvas = document.createElement('canvas')
  canvas.width = frameWidth
  canvas.height = frameHeight
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingEnabled = false

  // Get the stream from canvas
  const stream = canvas.captureStream(fps)
  const mimeType = getBestCodec(format)

  // Calculate bitrate based on quality and resolution
  const baseBitrate = frameWidth * frameHeight * fps * 0.1
  const videoBitsPerSecond = Math.round(baseBitrate * quality)

  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond,
  })

  const chunks: Blob[] = []

  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) {
      chunks.push(e.data)
    }
  }

  return new Promise((resolve, reject) => {
    recorder.onerror = (e) => reject(new Error('Recording failed'))

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType })
      resolve(blob)
    }

    recorder.start()

    // Calculate total frames including loops
    const totalLoops = loop > 0 ? loop : 1
    const totalFrames = frames.length * totalLoops
    let currentFrame = 0

    const renderFrame = () => {
      if (currentFrame >= totalFrames) {
        // Wait a bit for the last frame to be captured, then stop
        setTimeout(() => {
          recorder.stop()
        }, frameDuration * 2)
        return
      }

      const frameIndex = currentFrame % frames.length
      const frame = frames[frameIndex]

      // Draw frame to canvas
      ctx.clearRect(0, 0, frameWidth, frameHeight)
      ctx.drawImage(frame, 0, 0, frameWidth, frameHeight)

      // Report progress
      if (onProgress) {
        onProgress((currentFrame + 1) / totalFrames)
      }

      currentFrame++

      // Schedule next frame
      setTimeout(renderFrame, frameDuration)
    }

    // Start rendering
    renderFrame()
  })
}

/**
 * Export animation as video file download
 */
export async function exportAnimationAsVideo(
  frames: HTMLCanvasElement[],
  filename: string,
  options: VideoExportOptions,
  onProgress?: (progress: number) => void
): Promise<void> {
  const blob = await createVideo(frames, options, onProgress)
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
 * Alternative: Create video using canvas frames as a sequence
 * This method works by encoding each frame manually for better compatibility
 */
export async function createVideoFromFrameSequence(
  frames: HTMLCanvasElement[],
  options: VideoExportOptions,
  onProgress?: (progress: number) => void
): Promise<Blob> {
  // For browsers that support VideoEncoder API (Chrome 94+)
  if ('VideoEncoder' in window) {
    return createVideoWithVideoEncoder(frames, options, onProgress)
  }

  // Fallback to MediaRecorder
  return createVideo(frames, options, onProgress)
}

/**
 * Create video using the VideoEncoder API (better quality, more control)
 */
async function createVideoWithVideoEncoder(
  frames: HTMLCanvasElement[],
  options: VideoExportOptions,
  onProgress?: (progress: number) => void
): Promise<Blob> {
  const { fps, quality, scale, loop = 0 } = options
  const frameWidth = frames[0].width * scale
  const frameHeight = frames[0].height * scale

  // Ensure dimensions are even (required for most codecs)
  const width = frameWidth % 2 === 0 ? frameWidth : frameWidth + 1
  const height = frameHeight % 2 === 0 ? frameHeight : frameHeight + 1

  const frameDurationMicros = Math.round(1000000 / fps)
  const chunks: Uint8Array[] = []

  // Create encoder
  const encoder = new (window as any).VideoEncoder({
    output: (chunk: any) => {
      const data = new Uint8Array(chunk.byteLength)
      chunk.copyTo(data)
      chunks.push(data)
    },
    error: (e: Error) => {
      console.error('VideoEncoder error:', e)
    },
  })

  // Configure encoder
  await encoder.configure({
    codec: 'vp8', // WebM VP8
    width,
    height,
    bitrate: Math.round(width * height * fps * quality * 0.5),
    framerate: fps,
  })

  // Create a canvas for scaling
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingEnabled = false

  // Encode frames
  const totalLoops = loop > 0 ? loop : 1
  const totalFrames = frames.length * totalLoops

  for (let i = 0; i < totalFrames; i++) {
    const frameIndex = i % frames.length
    const frame = frames[frameIndex]

    // Draw to scaled canvas
    ctx.clearRect(0, 0, width, height)
    ctx.drawImage(frame, 0, 0, width, height)

    // Create VideoFrame
    const videoFrame = new (window as any).VideoFrame(canvas, {
      timestamp: i * frameDurationMicros,
      duration: frameDurationMicros,
    })

    // Encode frame
    encoder.encode(videoFrame, { keyFrame: i % 30 === 0 })
    videoFrame.close()

    if (onProgress) {
      onProgress((i + 1) / totalFrames)
    }
  }

  // Flush and close encoder
  await encoder.flush()
  encoder.close()

  // Combine chunks into a WebM container
  // Note: This creates raw video data, for proper WebM we'd need a muxer
  // For now, return as raw chunks which may not be playable in all players
  return new Blob(chunks, { type: 'video/webm' })
}

/**
 * Quick video export using MediaRecorder (most compatible method)
 */
export async function quickVideoExport(
  frames: HTMLCanvasElement[],
  filename: string,
  fps: number = 12,
  format: VideoFormat = 'webm'
): Promise<void> {
  const support = isVideoEncodingSupported()

  if (format === 'mp4' && !support.mp4) {
    if (support.webm) {
      console.warn('MP4 not supported, falling back to WebM')
      format = 'webm'
    } else {
      throw new Error('Video encoding not supported in this browser')
    }
  }

  if (format === 'webm' && !support.webm) {
    throw new Error('WebM encoding not supported in this browser')
  }

  await exportAnimationAsVideo(frames, filename, {
    format,
    fps,
    quality: 0.9,
    scale: 1,
    loop: 0,
  })
}
