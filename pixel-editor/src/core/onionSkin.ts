/**
 * Onion Skinning System
 * Based on Pixelorama's onion skinning feature
 * Shows ghost images of previous/next frames for animation reference
 */

export interface OnionSkinSettings {
  enabled: boolean
  pastFrames: number      // Number of past frames to show
  futureFrames: number    // Number of future frames to show
  pastOpacity: number     // Opacity of past frames (0-100)
  futureOpacity: number   // Opacity of future frames (0-100)
  pastColor: string       // Tint color for past frames (e.g., '#ff0000')
  futureColor: string     // Tint color for future frames (e.g., '#00ff00')
  blueRedMode: boolean    // Use blue-red coloring (past=blue, future=red)
  loop: boolean           // Loop around for onion skinning
}

export const DEFAULT_ONION_SKIN_SETTINGS: OnionSkinSettings = {
  enabled: false,
  pastFrames: 1,
  futureFrames: 1,
  pastOpacity: 40,
  futureOpacity: 40,
  pastColor: '#0066ff',
  futureColor: '#ff6600',
  blueRedMode: true,
  loop: false,
}

/**
 * Render onion skin overlay
 * @param ctx - Canvas context to draw on
 * @param currentFrameIndex - Current frame being edited
 * @param frames - Array of frame ImageData
 * @param settings - Onion skin settings
 */
export function renderOnionSkin(
  ctx: CanvasRenderingContext2D,
  currentFrameIndex: number,
  frames: (ImageData | null)[],
  settings: OnionSkinSettings
): void {
  if (!settings.enabled || frames.length <= 1) return

  const width = ctx.canvas.width
  const height = ctx.canvas.height

  // Create temporary canvas for tinting
  const tempCanvas = document.createElement('canvas')
  tempCanvas.width = width
  tempCanvas.height = height
  const tempCtx = tempCanvas.getContext('2d')
  if (!tempCtx) return

  // Render past frames (from furthest to nearest)
  for (let i = settings.pastFrames; i >= 1; i--) {
    let frameIndex = currentFrameIndex - i

    if (frameIndex < 0) {
      if (settings.loop) {
        frameIndex = frames.length + frameIndex
      } else {
        continue
      }
    }

    const frameData = frames[frameIndex]
    if (!frameData) continue

    // Calculate opacity (decreases with distance)
    const distanceFactor = 1 - (i - 1) / settings.pastFrames
    const opacity = (settings.pastOpacity / 100) * distanceFactor

    renderTintedFrame(
      ctx,
      tempCtx,
      frameData,
      settings.blueRedMode ? settings.pastColor : '#888888',
      opacity,
      settings.blueRedMode
    )
  }

  // Render future frames (from furthest to nearest)
  for (let i = settings.futureFrames; i >= 1; i--) {
    let frameIndex = currentFrameIndex + i

    if (frameIndex >= frames.length) {
      if (settings.loop) {
        frameIndex = frameIndex - frames.length
      } else {
        continue
      }
    }

    const frameData = frames[frameIndex]
    if (!frameData) continue

    // Calculate opacity (decreases with distance)
    const distanceFactor = 1 - (i - 1) / settings.futureFrames
    const opacity = (settings.futureOpacity / 100) * distanceFactor

    renderTintedFrame(
      ctx,
      tempCtx,
      frameData,
      settings.blueRedMode ? settings.futureColor : '#888888',
      opacity,
      settings.blueRedMode
    )
  }
}

/**
 * Render a single tinted frame
 */
function renderTintedFrame(
  ctx: CanvasRenderingContext2D,
  tempCtx: CanvasRenderingContext2D,
  frameData: ImageData,
  tintColor: string,
  opacity: number,
  applyTint: boolean
): void {
  const width = ctx.canvas.width
  const height = ctx.canvas.height

  // Clear temp canvas
  tempCtx.clearRect(0, 0, width, height)

  // Put the frame data
  tempCtx.putImageData(frameData, 0, 0)

  if (applyTint) {
    // Apply tint using composite operations
    tempCtx.globalCompositeOperation = 'source-atop'
    tempCtx.fillStyle = tintColor
    tempCtx.globalAlpha = 0.5
    tempCtx.fillRect(0, 0, width, height)
    tempCtx.globalCompositeOperation = 'source-over'
    tempCtx.globalAlpha = 1
  }

  // Draw to main canvas with opacity
  ctx.globalAlpha = opacity
  ctx.drawImage(tempCtx.canvas, 0, 0)
  ctx.globalAlpha = 1
}

/**
 * Create onion skin manager for handling settings
 */
export class OnionSkinManager {
  private settings: OnionSkinSettings
  private listeners: Set<(settings: OnionSkinSettings) => void> = new Set()

  constructor(initialSettings?: Partial<OnionSkinSettings>) {
    this.settings = { ...DEFAULT_ONION_SKIN_SETTINGS, ...initialSettings }
  }

  getSettings(): OnionSkinSettings {
    return { ...this.settings }
  }

  setSettings(newSettings: Partial<OnionSkinSettings>): void {
    this.settings = { ...this.settings, ...newSettings }
    this.notifyListeners()
  }

  toggle(): void {
    this.settings.enabled = !this.settings.enabled
    this.notifyListeners()
  }

  setPastFrames(count: number): void {
    this.settings.pastFrames = Math.max(0, Math.min(10, count))
    this.notifyListeners()
  }

  setFutureFrames(count: number): void {
    this.settings.futureFrames = Math.max(0, Math.min(10, count))
    this.notifyListeners()
  }

  setPastOpacity(opacity: number): void {
    this.settings.pastOpacity = Math.max(0, Math.min(100, opacity))
    this.notifyListeners()
  }

  setFutureOpacity(opacity: number): void {
    this.settings.futureOpacity = Math.max(0, Math.min(100, opacity))
    this.notifyListeners()
  }

  setBlueRedMode(enabled: boolean): void {
    this.settings.blueRedMode = enabled
    this.notifyListeners()
  }

  setLoop(enabled: boolean): void {
    this.settings.loop = enabled
    this.notifyListeners()
  }

  subscribe(listener: (settings: OnionSkinSettings) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notifyListeners(): void {
    const settings = this.getSettings()
    this.listeners.forEach(listener => listener(settings))
  }
}

// Singleton instance
let onionSkinManager: OnionSkinManager | null = null

export function getOnionSkinManager(): OnionSkinManager {
  if (!onionSkinManager) {
    onionSkinManager = new OnionSkinManager()
  }
  return onionSkinManager
}
