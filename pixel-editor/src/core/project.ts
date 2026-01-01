/**
 * Project Serialization - Save/Load project files
 * Custom .pxl format (JSON + base64 encoded image data)
 */

import { useEditorStore, type Layer, type Frame, type BlendMode } from '@/store/editor-store'

// Project file format version
const PROJECT_VERSION = 1

export interface ProjectFile {
  version: number
  name: string
  width: number
  height: number
  fps: number
  layers: SerializedLayer[]
  frames: SerializedFrame[]
  currentLayerIndex: number
  currentFrameIndex: number
  primaryColor: string
  secondaryColor: string
  palette: string[]
}

interface SerializedLayer {
  id: string
  name: string
  visible: boolean
  locked: boolean
  opacity: number
  blendMode: BlendMode
  data: string | null // Base64 encoded PNG
}

interface SerializedFrame {
  id: string
  duration: number
  layers: SerializedLayer[]
}

/**
 * Serialize ImageData to base64 PNG string
 */
async function imageDataToBase64(imageData: ImageData): Promise<string> {
  const canvas = document.createElement('canvas')
  canvas.width = imageData.width
  canvas.height = imageData.height
  const ctx = canvas.getContext('2d')!
  ctx.putImageData(imageData, 0, 0)
  return canvas.toDataURL('image/png')
}

/**
 * Deserialize base64 PNG string to ImageData
 */
async function base64ToImageData(base64: string, width: number, height: number): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0)
      resolve(ctx.getImageData(0, 0, width, height))
    }
    img.onerror = reject
    img.src = base64
  })
}

/**
 * Serialize a layer
 */
async function serializeLayer(layer: Layer): Promise<SerializedLayer> {
  return {
    id: layer.id,
    name: layer.name,
    visible: layer.visible,
    locked: layer.locked,
    opacity: layer.opacity,
    blendMode: layer.blendMode,
    data: layer.data ? await imageDataToBase64(layer.data) : null,
  }
}

/**
 * Deserialize a layer
 */
async function deserializeLayer(
  serialized: SerializedLayer,
  width: number,
  height: number
): Promise<Layer> {
  return {
    id: serialized.id,
    name: serialized.name,
    visible: serialized.visible,
    locked: serialized.locked,
    opacity: serialized.opacity,
    blendMode: serialized.blendMode,
    data: serialized.data ? await base64ToImageData(serialized.data, width, height) : null,
  }
}

/**
 * Save the current project to a file
 */
export async function saveProject(): Promise<Blob> {
  const store = useEditorStore.getState()

  // Serialize layers
  const serializedLayers = await Promise.all(
    store.layers.map(layer => serializeLayer(layer))
  )

  // Serialize frames
  const serializedFrames = await Promise.all(
    store.frames.map(async (frame) => ({
      id: frame.id,
      duration: frame.duration,
      layers: await Promise.all(frame.layers.map(layer => serializeLayer(layer))),
    }))
  )

  const project: ProjectFile = {
    version: PROJECT_VERSION,
    name: store.projectName,
    width: store.width,
    height: store.height,
    fps: store.fps,
    layers: serializedLayers,
    frames: serializedFrames,
    currentLayerIndex: store.currentLayerIndex,
    currentFrameIndex: store.currentFrameIndex,
    primaryColor: store.primaryColor,
    secondaryColor: store.secondaryColor,
    palette: store.palette,
  }

  const json = JSON.stringify(project, null, 2)
  return new Blob([json], { type: 'application/json' })
}

/**
 * Download the project as a file
 */
export async function downloadProject(filename?: string): Promise<void> {
  const store = useEditorStore.getState()
  const blob = await saveProject()
  const name = filename || store.projectName || 'untitled'

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${name}.pxl`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Load a project from a file
 */
export async function loadProject(file: File): Promise<void> {
  const text = await file.text()
  const project: ProjectFile = JSON.parse(text)

  // Validate version
  if (project.version > PROJECT_VERSION) {
    throw new Error(`Project file version ${project.version} is not supported. Please update the application.`)
  }

  const store = useEditorStore.getState()

  // Deserialize layers
  const layers = await Promise.all(
    project.layers.map(layer => deserializeLayer(layer, project.width, project.height))
  )

  // Deserialize frames
  const frames: Frame[] = await Promise.all(
    project.frames.map(async (frame) => ({
      id: frame.id,
      duration: frame.duration,
      layers: await Promise.all(
        frame.layers.map(layer => deserializeLayer(layer, project.width, project.height))
      ),
    }))
  )

  // Update store with loaded project
  useEditorStore.setState({
    projectName: project.name,
    width: project.width,
    height: project.height,
    fps: project.fps,
    layers,
    frames,
    currentLayerIndex: Math.min(project.currentLayerIndex, layers.length - 1),
    currentFrameIndex: Math.min(project.currentFrameIndex, frames.length - 1),
    primaryColor: project.primaryColor,
    secondaryColor: project.secondaryColor,
    palette: project.palette,
    modified: false,
  })
}

/**
 * Open file picker and load project
 */
export function openProjectDialog(): void {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.pxl,application/json'
  input.onchange = async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (file) {
      try {
        await loadProject(file)
      } catch (error) {
        console.error('Failed to load project:', error)
        alert(`Failed to load project: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }
  }
  input.click()
}
