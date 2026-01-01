/**
 * Import Dialog
 * Import images as new layers or new projects
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
import { Upload, Image, Layers, FileImage } from "lucide-react"

interface ImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type ImportMode = 'newLayer' | 'newProject' | 'replaceCanvas'

export function ImportDialog({ open, onOpenChange }: ImportDialogProps) {
  const { width, height, addLayer, setLayerData, setCanvasSize, currentLayerIndex } = useEditorStore()

  const [importMode, setImportMode] = useState<ImportMode>('newLayer')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    setSelectedFile(file)

    // Create preview
    const reader = new FileReader()
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string
      setPreview(dataUrl)

      // Get image dimensions
      const img = new window.Image()
      img.onload = () => {
        setImageSize({ width: img.width, height: img.height })
      }
      img.src = dataUrl
    }
    reader.readAsDataURL(file)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) {
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
    if (!selectedFile || !preview || !imageSize) return

    setIsLoading(true)

    try {
      const img = new window.Image()
      img.src = preview

      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
      })

      if (importMode === 'newProject') {
        // Resize canvas to image size
        setCanvasSize(imageSize.width, imageSize.height)

        // Wait for canvas resize to apply
        await new Promise(resolve => setTimeout(resolve, 100))

        // Draw on current layer
        const canvas = document.createElement('canvas')
        canvas.width = imageSize.width
        canvas.height = imageSize.height
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(img, 0, 0)
          const imageData = ctx.getImageData(0, 0, imageSize.width, imageSize.height)
          setLayerData(currentLayerIndex, imageData)
        }
      } else if (importMode === 'newLayer') {
        // Add new layer with the image
        addLayer(`Imported: ${selectedFile.name}`)

        // Wait for layer to be added
        await new Promise(resolve => setTimeout(resolve, 50))

        // Draw centered on canvas
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (ctx) {
          // Center the image if smaller, crop if larger
          const offsetX = Math.floor((width - imageSize.width) / 2)
          const offsetY = Math.floor((height - imageSize.height) / 2)
          ctx.drawImage(img, offsetX, offsetY)
          const imageData = ctx.getImageData(0, 0, width, height)

          // Get the new layer index (last layer)
          const store = useEditorStore.getState()
          setLayerData(store.layers.length - 1, imageData)
        }
      } else if (importMode === 'replaceCanvas') {
        // Draw on current layer without resizing
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (ctx) {
          // Center the image
          const offsetX = Math.floor((width - imageSize.width) / 2)
          const offsetY = Math.floor((height - imageSize.height) / 2)
          ctx.drawImage(img, offsetX, offsetY)
          const imageData = ctx.getImageData(0, 0, width, height)
          setLayerData(currentLayerIndex, imageData)
        }
      }

      onOpenChange(false)
      resetState()
    } catch (error) {
      console.error('Failed to import image:', error)
      alert('Failed to import image')
    } finally {
      setIsLoading(false)
    }
  }, [selectedFile, preview, imageSize, importMode, width, height, addLayer, setLayerData, setCanvasSize, currentLayerIndex, onOpenChange])

  const resetState = () => {
    setSelectedFile(null)
    setPreview(null)
    setImageSize(null)
    setImportMode('newLayer')
  }

  const handleClose = (open: boolean) => {
    if (!open) {
      resetState()
    }
    onOpenChange(open)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Import Image</DialogTitle>
          <DialogDescription>
            Import an image file as a layer or new project.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
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
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
            />

            {preview ? (
              <div className="space-y-2">
                <img
                  src={preview}
                  alt="Preview"
                  className="max-h-32 mx-auto rounded checker-bg"
                  style={{ imageRendering: 'pixelated' }}
                />
                <p className="text-pix-xs text-pix-text-secondary">{selectedFile?.name}</p>
                {imageSize && (
                  <p className="text-pix-xs text-pix-text-muted">
                    {imageSize.width} x {imageSize.height} pixels
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="w-10 h-10 mx-auto text-pix-text-muted" />
                <p className="text-sm text-pix-text-secondary">
                  Click or drag an image here
                </p>
                <p className="text-pix-xs text-pix-text-muted">
                  Supports PNG, JPEG, GIF, WebP
                </p>
              </div>
            )}
          </div>

          {/* Import Mode */}
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

          {/* Import Mode Description */}
          <div className="text-pix-xs text-pix-text-muted p-2 rounded" style={{ background: 'var(--pix-bg-tertiary)' }}>
            {importMode === 'newLayer' && (
              <p>Creates a new layer with the imported image, centered on the canvas ({width}x{height})</p>
            )}
            {importMode === 'replaceCanvas' && (
              <p>Replaces the current layer content with the image, centered on canvas ({width}x{height})</p>
            )}
            {importMode === 'newProject' && imageSize && (
              <p>Resizes canvas to match image size ({imageSize.width}x{imageSize.height}) and imports</p>
            )}
            {importMode === 'newProject' && !imageSize && (
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
            disabled={!selectedFile || isLoading}
          >
            {isLoading ? 'Importing...' : 'Import'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
