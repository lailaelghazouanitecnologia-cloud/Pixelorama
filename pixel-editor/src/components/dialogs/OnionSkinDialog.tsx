/**
 * Onion Skin Settings Dialog
 * Configure onion skinning options for animation
 */

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { getOnionSkinManager, type OnionSkinSettings } from "@/core/onionSkin"

interface OnionSkinDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function OnionSkinDialog({ open, onOpenChange }: OnionSkinDialogProps) {
  const manager = getOnionSkinManager()
  const [settings, setSettings] = useState<OnionSkinSettings>(manager.getSettings())

  useEffect(() => {
    const unsubscribe = manager.subscribe(setSettings)
    return unsubscribe
  }, [manager])

  const handleChange = (key: keyof OnionSkinSettings, value: boolean | number | string) => {
    manager.setSettings({ [key]: value })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[350px]">
        <DialogHeader>
          <DialogTitle>Onion Skinning</DialogTitle>
          <DialogDescription>
            Configure ghost frames to aid animation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Enable Toggle */}
          <div className="form-row">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4"
                checked={settings.enabled}
                onChange={(e) => handleChange('enabled', e.target.checked)}
              />
              <span className="text-pix-sm">Enable Onion Skinning</span>
            </label>
          </div>

          {/* Past Frames */}
          <div className="form-row flex-col items-start gap-1">
            <label className="text-pix-xs text-pix-text-muted">Past Frames</label>
            <div className="flex items-center gap-2 w-full">
              <input
                type="range"
                className="slider flex-1"
                min={0}
                max={5}
                value={settings.pastFrames}
                onChange={(e) => handleChange('pastFrames', parseInt(e.target.value))}
                disabled={!settings.enabled}
              />
              <span className="text-pix-xs w-4 text-center">{settings.pastFrames}</span>
            </div>
          </div>

          {/* Future Frames */}
          <div className="form-row flex-col items-start gap-1">
            <label className="text-pix-xs text-pix-text-muted">Future Frames</label>
            <div className="flex items-center gap-2 w-full">
              <input
                type="range"
                className="slider flex-1"
                min={0}
                max={5}
                value={settings.futureFrames}
                onChange={(e) => handleChange('futureFrames', parseInt(e.target.value))}
                disabled={!settings.enabled}
              />
              <span className="text-pix-xs w-4 text-center">{settings.futureFrames}</span>
            </div>
          </div>

          {/* Past Opacity */}
          <div className="form-row flex-col items-start gap-1">
            <label className="text-pix-xs text-pix-text-muted">Past Opacity</label>
            <div className="flex items-center gap-2 w-full">
              <input
                type="range"
                className="slider flex-1"
                min={10}
                max={100}
                value={settings.pastOpacity}
                onChange={(e) => handleChange('pastOpacity', parseInt(e.target.value))}
                disabled={!settings.enabled}
              />
              <span className="text-pix-xs w-8 text-right">{settings.pastOpacity}%</span>
            </div>
          </div>

          {/* Future Opacity */}
          <div className="form-row flex-col items-start gap-1">
            <label className="text-pix-xs text-pix-text-muted">Future Opacity</label>
            <div className="flex items-center gap-2 w-full">
              <input
                type="range"
                className="slider flex-1"
                min={10}
                max={100}
                value={settings.futureOpacity}
                onChange={(e) => handleChange('futureOpacity', parseInt(e.target.value))}
                disabled={!settings.enabled}
              />
              <span className="text-pix-xs w-8 text-right">{settings.futureOpacity}%</span>
            </div>
          </div>

          {/* Color Mode */}
          <div className="form-row">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4"
                checked={settings.blueRedMode}
                onChange={(e) => handleChange('blueRedMode', e.target.checked)}
                disabled={!settings.enabled}
              />
              <span className="text-pix-xs">Blue-Red Color Mode</span>
            </label>
          </div>

          {/* Custom Colors (when not in blue-red mode) */}
          {!settings.blueRedMode && (
            <div className="grid grid-cols-2 gap-4">
              <div className="form-row flex-col items-start gap-1">
                <label className="text-pix-xs text-pix-text-muted">Past Color</label>
                <input
                  type="color"
                  className="w-full h-8 cursor-pointer"
                  value={settings.pastColor}
                  onChange={(e) => handleChange('pastColor', e.target.value)}
                  disabled={!settings.enabled}
                />
              </div>
              <div className="form-row flex-col items-start gap-1">
                <label className="text-pix-xs text-pix-text-muted">Future Color</label>
                <input
                  type="color"
                  className="w-full h-8 cursor-pointer"
                  value={settings.futureColor}
                  onChange={(e) => handleChange('futureColor', e.target.value)}
                  disabled={!settings.enabled}
                />
              </div>
            </div>
          )}

          {/* Loop Toggle */}
          <div className="form-row">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4"
                checked={settings.loop}
                onChange={(e) => handleChange('loop', e.target.checked)}
                disabled={!settings.enabled}
              />
              <span className="text-pix-xs">Loop at animation ends</span>
            </label>
          </div>

          {/* Preview */}
          <div
            className="p-3 rounded text-center"
            style={{ backgroundColor: 'var(--pix-bg)' }}
          >
            <div className="flex items-center justify-center gap-1">
              {/* Past frames preview */}
              {Array.from({ length: settings.pastFrames }).map((_, i) => (
                <div
                  key={`past-${i}`}
                  className="w-6 h-6 rounded border"
                  style={{
                    backgroundColor: settings.blueRedMode ? settings.pastColor : '#888',
                    opacity: 0.3 + (0.3 * (i / settings.pastFrames)),
                    borderColor: 'var(--pix-border)'
                  }}
                />
              )).reverse()}

              {/* Current frame */}
              <div
                className="w-8 h-8 rounded border-2"
                style={{
                  backgroundColor: 'var(--pix-text)',
                  borderColor: 'var(--pix-accent)'
                }}
              />

              {/* Future frames preview */}
              {Array.from({ length: settings.futureFrames }).map((_, i) => (
                <div
                  key={`future-${i}`}
                  className="w-6 h-6 rounded border"
                  style={{
                    backgroundColor: settings.blueRedMode ? settings.futureColor : '#888',
                    opacity: 0.3 + (0.3 * ((settings.futureFrames - i - 1) / settings.futureFrames)),
                    borderColor: 'var(--pix-border)'
                  }}
                />
              ))}
            </div>
            <div className="text-pix-xs text-pix-text-muted mt-2">
              Preview: {settings.pastFrames} past, {settings.futureFrames} future
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
