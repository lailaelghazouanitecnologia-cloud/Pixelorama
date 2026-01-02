/**
 * Import Dialog
 * Import images as new layers or new projects
 * Supports: PNG, JPEG, GIF, WebP, Aseprite (.ase), Krita (.kra), Photoshop (.psd)
 */

import { useState, useRef, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { useEditorStore } from "@/store/editor-store"
import { Upload, Image, Layers, FileImage, AlertCircle } from "lucide-react"
import { loadAsepriteFile } from "@/core/parsers/asepriteParser"
import { parseKritaFile, isKritaFile, getKritaPreview } from "@/core/parsers/kritaParser"
import { parsePsdFile, isPsdFile, getPsdInfo } from "@/core/parsers/psdParser"

interface ImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type ImportMode = 'newLayer' | 'newProject' | 'replaceCanvas'
type FileType = 'image' | 'aseprite' | 'krita' | 'psd' | 'unknown'

// Accepted file extensions
const ACCEPTED_EXTENSIONS = '.png,.jpg,.jpeg,.gif,.webp,.ase,.aseprite,.kra,.krita,.psd,.psb'

function getFileType(file: File): FileType {
  const name = file.name.toLowerCase()
  if (name.endsWith('.ase') || name.endsWith('.aseprite')) return 'aseprite'
  if (name.endsWith('.kra') || name.endsWith('.krita')) return 'krita'
  if (name.endsWith('.psd') || name.endsWith('.psb')) return 'psd'
  if (file.type.startsWith('image/')) return 'image'
  return 'unknown'
}

export function ImportDialog({ open, onOpenChange }: ImportDialogProps) {
  const {
    width,
    height,
    addLayer,
    setLayerData,
    setCanvasSize,
    currentLayerIndex,
    setLayers,
    setFrames,
  } = useEditorStore()

  const [importMode, setImportMode] = useState<ImportMode>('newLayer')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [fileType, setFileType] = useState<FileType>('unknown')
  const [error, setError] = useState<string | null>(null)
  const [layerCount, setLayerCount] = useState<number>(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)
    setLayerCount(0)
    const type = getFileType(file)
    setFileType(type)

    if (type === 'unknown') {
      setError('Unsupported file format')
      return
    }

    setSelectedFile(file)

    try {
      if (type === 'image') {
        // Standard image file
        const reader = new FileReader()
        reader.onload = (event) => {
          const dataUrl = event.target?.result as string
          setPreview(dataUrl)

          const img = new window.Image()
          img.onload = () => {
            setImageSize({ width: img.width, height: img.height })
          }
          img.src = dataUrl
        }
        reader.readAsDataURL(file)
      } else if (type === 'krita') {
        // Krita file - get preview
        const previewUrl = await getKritaPreview(file)
        if (previewUrl) {
          setPreview(previewUrl)
          const img = new window.Image()
          img.onload = () => {
            setImageSize({ width: img.width, height: img.height })
          }
          img.src = previewUrl
        }
        // Parse to get layer count
        const doc = await parseKritaFile(file)
        setImageSize({ width: doc.width, height: doc.height })
        setLayerCount(doc.layers.length)
      } else if (type === 'psd') {
        // PSD file - get info
        const info = await getPsdInfo(file)
        setImageSize({ width: info.width, height: info.height })
        // Full parse for layer count
        const doc = await parsePsdFile(file)
        setLayerCount(doc.layers.length)
        // Use merged image for preview if available
        if (doc.mergedImage) {
          const canvas = document.createElement('canvas')
          canvas.width = doc.width
          canvas.height = doc.height
          const ctx = canvas.getContext('2d')!
          ctx.putImageData(doc.mergedImage, 0, 0)
          setPreview(canvas.toDataURL())
        }
      } else if (type === 'aseprite') {
        // Aseprite file
        const doc = await loadAsepriteFile(file)
        setImageSize({ width: doc.width, height: doc.height })
        setLayerCount(doc.layers.length)
        // Create preview from first frame
        if (doc.frames.length > 0 && doc.frames[0].cels.length > 0) {
          const cel = doc.frames[0].cels.find(c => c.imageData)
          if (cel?.imageData) {
            const canvas = document.createElement('canvas')
            canvas.width = doc.width
            canvas.height = doc.height
            const ctx = canvas.getContext('2d')!
            ctx.putImageData(cel.imageData, cel.x, cel.y)
            setPreview(canvas.toDataURL())
          }
        }
      }
    } catch (err) {
      console.error('Failed to parse file:', err)
      setError(`Failed to parse file: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) {
      const input = fileInputRef.current
      if (input) {
        const dataTransfer = new DataTransfer()
        dataTransfer.items.add(file)
        input.files = dataTransfer.files
        handleFileSelect({ target: input } as React.ChangeEvent<HTMLInputElement>)
      }
    }
  }, [handleFileSelect])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  const handleImport = useCallback(async () => {
    if (!selectedFile || !imageSize) return

    setIsLoading(true)
    setError(null)

    try {
      if (fileType === 'image') {
        // Standard image import
        const img = new window.Image()
        img.src = preview!

        await new Promise((resolve, reject) => {
          img.onload = resolve
          img.onerror = reject
        })

        if (importMode === 'newProject') {
          setCanvasSize(imageSize.width, imageSize.height)
          await new Promise(resolve => setTimeout(resolve, 100))

          const canvas = document.createElement('canvas')
          canvas.width = imageSize.width
          canvas.height = imageSize.height
          const ctx = canvas.getContext('2d')!
          ctx.drawImage(img, 0, 0)
          setLayerData(currentLayerIndex, ctx.getImageData(0, 0, imageSize.width, imageSize.height))
        } else if (importMode === 'newLayer') {
          addLayer(`Imported: ${selectedFile.name}`)
          await new Promise(resolve => setTimeout(resolve, 50))

          const canvas = document.createElement('canvas')
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')!
          const offsetX = Math.floor((width - imageSize.width) / 2)
          const offsetY = Math.floor((height - imageSize.height) / 2)
          ctx.drawImage(img, offsetX, offsetY)

          const store = useEditorStore.getState()
          setLayerData(store.layers.length - 1, ctx.getImageData(0, 0, width, height))
        } else {
          const canvas = document.createElement('canvas')
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')!
          const offsetX = Math.floor((width - imageSize.width) / 2)
          const offsetY = Math.floor((height - imageSize.height) / 2)
          ctx.drawImage(img, offsetX, offsetY)
          setLayerData(currentLayerIndex, ctx.getImageData(0, 0, width, height))
        }
      } else if (fileType === 'krita') {
        // Krita import - always as new project with layers
        const doc = await parseKritaFile(selectedFile)
        setCanvasSize(doc.width, doc.height)
        await new Promise(resolve => setTimeout(resolve, 100))

        // Import all layers
        const newLayers = doc.layers
          .filter(l => l.imageData && l.type === 'paint')
          .map((l, i) => ({
            id: `layer-${Date.now()}-${i}`,
            name: l.name,
            visible: l.visible,
            locked: l.locked,
            opacity: l.opacity,
            blendMode: l.blendMode,
            data: l.imageData,
          }))

        if (newLayers.length > 0) {
          setLayers(newLayers as any)
        }
      } else if (fileType === 'psd') {
        // PSD import - always as new project with layers
        const doc = await parsePsdFile(selectedFile)
        setCanvasSize(doc.width, doc.height)
        await new Promise(resolve => setTimeout(resolve, 100))

        // Import all layers
        const newLayers = doc.layers
          .filter(l => l.imageData && l.type === 'normal')
          .map((l, i) => ({
            id: `layer-${Date.now()}-${i}`,
            name: l.name,
            visible: l.visible,
            locked: l.locked,
            opacity: l.opacity,
            blendMode: l.blendMode,
            data: l.imageData,
          }))

        if (newLayers.length > 0) {
          setLayers(newLayers as any)
        } else if (doc.mergedImage) {
          // Fallback to merged image
          setLayerData(0, doc.mergedImage)
        }
      } else if (fileType === 'aseprite') {
        // Aseprite import - new project with layers and frames
        const doc = await loadAsepriteFile(selectedFile)
        setCanvasSize(doc.width, doc.height)
        await new Promise(resolve => setTimeout(resolve, 100))

        // Create layers
        const newLayers = doc.layers.map((l, i) => ({
          id: `layer-${Date.now()}-${i}`,
          name: l.name,
          visible: l.visible,
          locked: l.locked,
          opacity: l.opacity,
          blendMode: l.blendMode,
          data: null as ImageData | null,
        }))

        // Import first frame's cels as layer data
        if (doc.frames.length > 0) {
          const frame = doc.frames[0]
          for (const cel of frame.cels) {
            if (cel.imageData && cel.layerIndex < newLayers.length) {
              // Create full canvas with cel at position
              const canvas = document.createElement('canvas')
              canvas.width = doc.width
              canvas.height = doc.height
              const ctx = canvas.getContext('2d')!
              ctx.putImageData(cel.imageData, cel.x, cel.y)
              newLayers[cel.layerIndex].data = ctx.getImageData(0, 0, doc.width, doc.height)
            }
          }
        }

        const validLayers = newLayers.filter(l => l.data)
        if (validLayers.length > 0) {
          setLayers(validLayers as any)
        }

        // TODO: Import animation frames
      }

      onOpenChange(false)
      resetState()
    } catch (err) {
      console.error('Failed to import:', err)
      setError(`Import failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setIsLoading(false)
    }
  }, [selectedFile, fileType, preview, imageSize, importMode, width, height, addLayer, setLayerData, setCanvasSize, currentLayerIndex, setLayers, onOpenChange])

  const resetState = () => {
    setSelectedFile(null)
    setPreview(null)
    setImageSize(null)
    setImportMode('newLayer')
    setFileType('unknown')
    setError(null)
    setLayerCount(0)
  }

  const handleClose = (open: boolean) => {
    if (!open) {
      resetState()
    }
    onOpenChange(open)
  }

  // For project files, always import as new project
  const isProjectFile = fileType === 'krita' || fileType === 'psd' || fileType === 'aseprite'

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Import Image</DialogTitle>
          <DialogDescription>
            Import an image or project file.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Error Display */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded bg-red-500/10 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          {/* Drop Zone */}
          <div
            className="border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer hover:border-pix-accent"
            style={{ borderColor: selectedFile ? 'var(--pix-accent)' : 'var(--pix-border)' }}
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_EXTENSIONS}
              className="hidden"
              onChange={handleFileSelect}
            />

            {selectedFile ? (
              <div className="space-y-2">
                {preview && (
                  <img
                    src={preview}
                    alt="Preview"
                    className="max-h-32 mx-auto rounded checker-bg"
                    style={{ imageRendering: 'pixelated' }}
                  />
                )}
                <p className="text-pix-xs text-pix-text-secondary">{selectedFile.name}</p>
                {imageSize && (
                  <p className="text-pix-xs text-pix-text-muted">
                    {imageSize.width} x {imageSize.height} pixels
                    {layerCount > 0 && ` • ${layerCount} layers`}
                  </p>
                )}
                {fileType !== 'image' && (
                  <span className="inline-block px-2 py-0.5 text-pix-xs rounded bg-pix-accent/20 text-pix-accent">
                    {fileType.toUpperCase()}
                  </span>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="w-10 h-10 mx-auto text-pix-text-muted" />
                <p className="text-sm text-pix-text-secondary">
                  Click or drag a file here
                </p>
                <p className="text-pix-xs text-pix-text-muted">
                  PNG, JPEG, GIF, WebP, Aseprite, Krita, Photoshop
                </p>
              </div>
            )}
          </div>

          {/* Import Mode - only for standard images */}
          {!isProjectFile && (
            <div className="space-y-2">
              <label className="text-pix-xs text-pix-text-muted">Import as:</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  className={`btn flex flex-col items-center gap-1 py-3 ${importMode === 'newLayer' ? 'bg-pix-accent' : ''}`}
                  onClick={() => setImportMode('newLayer')}
                >
                  <Layers className="w-4 h-4" />
                  <span className="text-pix-xs">New Layer</span>
                </button>
                <button
                  className={`btn flex flex-col items-center gap-1 py-3 ${importMode === 'replaceCanvas' ? 'bg-pix-accent' : ''}`}
                  onClick={() => setImportMode('replaceCanvas')}
                >
                  <Image className="w-4 h-4" />
                  <span className="text-pix-xs">Replace</span>
                </button>
                <button
                  className={`btn flex flex-col items-center gap-1 py-3 ${importMode === 'newProject' ? 'bg-pix-accent' : ''}`}
                  onClick={() => setImportMode('newProject')}
                >
                  <FileImage className="w-4 h-4" />
                  <span className="text-pix-xs">New Project</span>
                </button>
              </div>
            </div>
          )}

          {/* Import Mode Description */}
          <div className="text-pix-xs text-pix-text-muted p-2 rounded" style={{ background: 'var(--pix-bg-tertiary)' }}>
            {isProjectFile ? (
              <p>Project files are imported as new projects with all layers preserved.</p>
            ) : importMode === 'newLayer' ? (
              <p>Creates a new layer with the imported image, centered on the canvas ({width}x{height})</p>
            ) : importMode === 'replaceCanvas' ? (
              <p>Replaces the current layer content with the image, centered on canvas ({width}x{height})</p>
            ) : imageSize ? (
              <p>Resizes canvas to match image size ({imageSize.width}x{imageSize.height}) and imports</p>
            ) : (
              <p>Resizes canvas to match the imported image size</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <button className="btn" onClick={() => handleClose(false)}>
            Cancel
          </button>
          <button
            className="btn bg-pix-accent"
            onClick={handleImport}
            disabled={!selectedFile || isLoading || !!error}
          >
            {isLoading ? 'Importing...' : 'Import'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
