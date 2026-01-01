/**
 * Audio System - Support for audio layers in animations
 * Based on Pixelorama's AudioBusLayer functionality
 *
 * Provides audio playback synced to animation frames,
 * waveform visualization, and audio editing capabilities.
 */

// ============================================================================
// Types
// ============================================================================

export interface AudioClip {
  readonly id: string
  readonly name: string
  readonly buffer: AudioBuffer
  readonly duration: number  // Duration in seconds
  readonly sampleRate: number
  readonly numberOfChannels: number
}

export interface AudioRegion {
  readonly id: string
  readonly clipId: string
  readonly startFrame: number    // Frame where region starts
  readonly startOffset: number   // Offset within clip (seconds)
  readonly duration: number      // Duration of region (seconds)
  readonly volume: number        // 0-1
  readonly fadeIn: number        // Fade in duration (seconds)
  readonly fadeOut: number       // Fade out duration (seconds)
  readonly muted: boolean
}

export interface AudioLayerData {
  readonly id: string
  readonly name: string
  readonly regions: AudioRegion[]
  readonly volume: number        // Master volume for layer
  readonly pan: number           // -1 (left) to 1 (right)
  readonly muted: boolean
  readonly solo: boolean
}

export interface AudioState {
  readonly isPlaying: boolean
  readonly currentFrame: number
  readonly fps: number
  readonly totalFrames: number
}

// ============================================================================
// Audio Context
// ============================================================================

let audioContext: AudioContext | null = null

export function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext()
  }
  return audioContext
}

export function resumeAudioContext(): Promise<void> {
  const ctx = getAudioContext()
  if (ctx.state === 'suspended') {
    return ctx.resume()
  }
  return Promise.resolve()
}

// ============================================================================
// Audio Clip Management
// ============================================================================

const clipCache = new Map<string, AudioClip>()

/**
 * Load an audio file and create an AudioClip
 */
export async function loadAudioClip(
  file: File,
  id?: string
): Promise<AudioClip> {
  const ctx = getAudioContext()
  const arrayBuffer = await file.arrayBuffer()
  const buffer = await ctx.decodeAudioData(arrayBuffer)

  const clipId = id || `clip-${Date.now()}`
  const clip: AudioClip = {
    id: clipId,
    name: file.name.replace(/\.[^.]+$/, ''),
    buffer,
    duration: buffer.duration,
    sampleRate: buffer.sampleRate,
    numberOfChannels: buffer.numberOfChannels,
  }

  clipCache.set(clipId, clip)
  return clip
}

/**
 * Get a cached audio clip by ID
 */
export function getAudioClip(id: string): AudioClip | undefined {
  return clipCache.get(id)
}

/**
 * Remove an audio clip from cache
 */
export function removeAudioClip(id: string): boolean {
  return clipCache.delete(id)
}

/**
 * Get all cached audio clips
 */
export function getAllAudioClips(): AudioClip[] {
  return Array.from(clipCache.values())
}

// ============================================================================
// Audio Region Operations
// ============================================================================

/**
 * Create a new audio region
 */
export function createAudioRegion(
  clipId: string,
  startFrame: number,
  options: Partial<Omit<AudioRegion, 'id' | 'clipId' | 'startFrame'>> = {}
): AudioRegion {
  const clip = getAudioClip(clipId)
  const duration = options.duration ?? (clip?.duration ?? 1)

  return {
    id: `region-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    clipId,
    startFrame,
    startOffset: options.startOffset ?? 0,
    duration,
    volume: options.volume ?? 1,
    fadeIn: options.fadeIn ?? 0,
    fadeOut: options.fadeOut ?? 0,
    muted: options.muted ?? false,
  }
}

/**
 * Calculate the end frame of a region
 */
export function getRegionEndFrame(region: AudioRegion, fps: number): number {
  return region.startFrame + Math.ceil(region.duration * fps)
}

/**
 * Check if a region overlaps with a frame
 */
export function isFrameInRegion(
  region: AudioRegion,
  frame: number,
  fps: number
): boolean {
  const endFrame = getRegionEndFrame(region, fps)
  return frame >= region.startFrame && frame < endFrame
}

/**
 * Get the time position within a region for a given frame
 */
export function getTimeInRegion(
  region: AudioRegion,
  frame: number,
  fps: number
): number {
  const frameOffset = frame - region.startFrame
  const time = frameOffset / fps
  return region.startOffset + Math.max(0, Math.min(region.duration, time))
}

// ============================================================================
// Audio Playback
// ============================================================================

interface ActiveSource {
  source: AudioBufferSourceNode
  gainNode: GainNode
  region: AudioRegion
  startTime: number
}

const activeSources = new Map<string, ActiveSource>()
let masterGainNode: GainNode | null = null

function getMasterGain(): GainNode {
  if (!masterGainNode) {
    const ctx = getAudioContext()
    masterGainNode = ctx.createGain()
    masterGainNode.connect(ctx.destination)
  }
  return masterGainNode
}

/**
 * Start playing audio for a specific frame
 */
export function playAudioAtFrame(
  layers: AudioLayerData[],
  frame: number,
  fps: number
): void {
  const ctx = getAudioContext()
  const masterGain = getMasterGain()

  // Stop any currently playing sources
  stopAllAudio()

  // Find all regions that should be playing at this frame
  for (const layer of layers) {
    if (layer.muted) continue

    for (const region of layer.regions) {
      if (region.muted) continue
      if (!isFrameInRegion(region, frame, fps)) continue

      const clip = getAudioClip(region.clipId)
      if (!clip) continue

      // Create audio nodes
      const source = ctx.createBufferSource()
      source.buffer = clip.buffer

      const gainNode = ctx.createGain()
      const timeInRegion = getTimeInRegion(region, frame, fps)
      const remainingDuration = region.duration - (timeInRegion - region.startOffset)

      // Apply volume with layer volume
      const effectiveVolume = region.volume * layer.volume
      gainNode.gain.value = effectiveVolume

      // Apply fade in/out
      if (region.fadeIn > 0 && timeInRegion < region.fadeIn) {
        const fadeProgress = timeInRegion / region.fadeIn
        gainNode.gain.value = effectiveVolume * fadeProgress
      }

      if (region.fadeOut > 0) {
        const fadeOutStart = region.duration - region.fadeOut
        if (timeInRegion > fadeOutStart) {
          const fadeProgress = (region.duration - timeInRegion) / region.fadeOut
          gainNode.gain.value = effectiveVolume * fadeProgress
        }
      }

      // Connect nodes
      source.connect(gainNode)
      gainNode.connect(masterGain)

      // Start playback
      source.start(0, timeInRegion, remainingDuration)

      // Store reference
      activeSources.set(region.id, {
        source,
        gainNode,
        region,
        startTime: ctx.currentTime,
      })

      // Clean up when done
      source.onended = () => {
        activeSources.delete(region.id)
      }
    }
  }
}

/**
 * Stop all currently playing audio
 */
export function stopAllAudio(): void {
  for (const [id, active] of activeSources) {
    try {
      active.source.stop()
      active.source.disconnect()
      active.gainNode.disconnect()
    } catch {
      // Source may already be stopped
    }
    activeSources.delete(id)
  }
}

/**
 * Set master volume
 */
export function setMasterVolume(volume: number): void {
  const gain = getMasterGain()
  gain.gain.value = Math.max(0, Math.min(1, volume))
}

// ============================================================================
// Waveform Generation
// ============================================================================

export interface WaveformData {
  readonly peaks: Float32Array
  readonly duration: number
  readonly samplesPerPeak: number
}

/**
 * Generate waveform data for visualization
 */
export function generateWaveform(
  clip: AudioClip,
  width: number
): WaveformData {
  const channelData = clip.buffer.getChannelData(0) // Use first channel
  const samplesPerPeak = Math.floor(channelData.length / width)
  const peaks = new Float32Array(width)

  for (let i = 0; i < width; i++) {
    const start = i * samplesPerPeak
    const end = start + samplesPerPeak

    let max = 0
    for (let j = start; j < end && j < channelData.length; j++) {
      const abs = Math.abs(channelData[j])
      if (abs > max) max = abs
    }

    peaks[i] = max
  }

  return {
    peaks,
    duration: clip.duration,
    samplesPerPeak,
  }
}

/**
 * Draw waveform to canvas
 */
export function drawWaveform(
  ctx: CanvasRenderingContext2D,
  waveform: WaveformData,
  x: number,
  y: number,
  width: number,
  height: number,
  color = '#4a9eff'
): void {
  const centerY = y + height / 2

  ctx.fillStyle = color
  ctx.beginPath()

  // Draw top half
  ctx.moveTo(x, centerY)
  for (let i = 0; i < waveform.peaks.length; i++) {
    const px = x + (i / waveform.peaks.length) * width
    const peakHeight = waveform.peaks[i] * (height / 2)
    ctx.lineTo(px, centerY - peakHeight)
  }

  // Draw bottom half (mirror)
  for (let i = waveform.peaks.length - 1; i >= 0; i--) {
    const px = x + (i / waveform.peaks.length) * width
    const peakHeight = waveform.peaks[i] * (height / 2)
    ctx.lineTo(px, centerY + peakHeight)
  }

  ctx.closePath()
  ctx.fill()
}

// ============================================================================
// Audio Layer Helpers
// ============================================================================

/**
 * Create a new audio layer data object
 */
export function createAudioLayerData(
  id: string,
  name: string
): AudioLayerData {
  return {
    id,
    name,
    regions: [],
    volume: 1,
    pan: 0,
    muted: false,
    solo: false,
  }
}

/**
 * Add a region to an audio layer
 */
export function addRegionToLayer(
  layer: AudioLayerData,
  region: AudioRegion
): AudioLayerData {
  return {
    ...layer,
    regions: [...layer.regions, region],
  }
}

/**
 * Remove a region from an audio layer
 */
export function removeRegionFromLayer(
  layer: AudioLayerData,
  regionId: string
): AudioLayerData {
  return {
    ...layer,
    regions: layer.regions.filter(r => r.id !== regionId),
  }
}

/**
 * Update a region in an audio layer
 */
export function updateRegionInLayer(
  layer: AudioLayerData,
  regionId: string,
  updates: Partial<AudioRegion>
): AudioLayerData {
  return {
    ...layer,
    regions: layer.regions.map(r =>
      r.id === regionId ? { ...r, ...updates } : r
    ),
  }
}

/**
 * Move a region to a new start frame
 */
export function moveRegion(
  layer: AudioLayerData,
  regionId: string,
  newStartFrame: number
): AudioLayerData {
  return updateRegionInLayer(layer, regionId, { startFrame: newStartFrame })
}

/**
 * Trim a region's start or end
 */
export function trimRegion(
  layer: AudioLayerData,
  regionId: string,
  trimStart: number,  // Amount to trim from start (seconds)
  trimEnd: number     // Amount to trim from end (seconds)
): AudioLayerData {
  const region = layer.regions.find(r => r.id === regionId)
  if (!region) return layer

  return updateRegionInLayer(layer, regionId, {
    startOffset: region.startOffset + trimStart,
    duration: region.duration - trimStart - trimEnd,
  })
}

/**
 * Split a region at a specific frame
 */
export function splitRegion(
  layer: AudioLayerData,
  regionId: string,
  splitFrame: number,
  fps: number
): AudioLayerData {
  const region = layer.regions.find(r => r.id === regionId)
  if (!region) return layer

  const splitTime = getTimeInRegion(region, splitFrame, fps)
  const firstDuration = splitTime - region.startOffset
  const secondDuration = region.duration - firstDuration

  if (firstDuration <= 0 || secondDuration <= 0) return layer

  // Update original region (first part)
  const updatedLayer = updateRegionInLayer(layer, regionId, {
    duration: firstDuration,
    fadeOut: 0, // Remove fade out from first part
  })

  // Create second part
  const secondRegion = createAudioRegion(region.clipId, splitFrame, {
    startOffset: region.startOffset + firstDuration,
    duration: secondDuration,
    volume: region.volume,
    fadeIn: 0, // Remove fade in from second part
    fadeOut: region.fadeOut,
  })

  return addRegionToLayer(updatedLayer, secondRegion)
}

// ============================================================================
// Frame/Time Conversion
// ============================================================================

/**
 * Convert frames to time (seconds)
 */
export function framesToTime(frames: number, fps: number): number {
  return frames / fps
}

/**
 * Convert time (seconds) to frames
 */
export function timeToFrames(time: number, fps: number): number {
  return Math.round(time * fps)
}

/**
 * Format time as MM:SS.mmm
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toFixed(3).padStart(6, '0')}`
}
