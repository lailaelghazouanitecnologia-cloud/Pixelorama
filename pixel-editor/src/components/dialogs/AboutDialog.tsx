/**
 * About Dialog
 * Shows information about the application
 */

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { DialogProps } from './DialogManager'

export function AboutDialog({ open, onOpenChange }: DialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>About Pixelorama</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-center">
          {/* Logo placeholder */}
          <div className="w-24 h-24 mx-auto bg-pix-accent rounded-lg flex items-center justify-center text-4xl">
            🎨
          </div>

          <div>
            <h2 className="text-xl font-bold">Pixelorama Web</h2>
            <p className="text-pix-text-muted">Version 1.0.0</p>
          </div>

          <p className="text-sm text-pix-text-muted">
            A free and open-source pixel art editor for the web.
            Based on the original Pixelorama by Orama Interactive.
          </p>

          <div className="border-t border-pix-border pt-4 space-y-2">
            <p className="text-sm">
              <span className="text-pix-text-muted">Original:</span>{' '}
              <a
                href="https://github.com/Orama-Interactive/Pixelorama"
                target="_blank"
                rel="noopener noreferrer"
                className="text-pix-accent hover:underline"
              >
                Orama Interactive
              </a>
            </p>
            <p className="text-sm">
              <span className="text-pix-text-muted">Web Version:</span>{' '}
              Built with React + TypeScript
            </p>
            <p className="text-sm">
              <span className="text-pix-text-muted">License:</span>{' '}
              MIT License
            </p>
          </div>

          <div className="flex justify-center gap-4 pt-2">
            <a
              href="https://github.com/Orama-Interactive/Pixelorama"
              target="_blank"
              rel="noopener noreferrer"
              className="btn"
            >
              GitHub
            </a>
            <a
              href="https://www.pixelorama.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn"
            >
              Website
            </a>
          </div>
        </div>

        <div className="flex justify-center pt-4">
          <button className="btn bg-pix-accent" onClick={() => onOpenChange(false)}>
            Close
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
