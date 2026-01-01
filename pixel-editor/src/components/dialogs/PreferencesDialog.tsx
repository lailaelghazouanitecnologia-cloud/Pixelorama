/**
 * Preferences Dialog
 * Based on Pixelorama's PreferencesDialog
 * Allows users to customize editor settings
 */

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { usePreferencesStore, type Theme, type ToolButtonSize, type CursorShape } from '@/store/preferences-store'
import type { DialogProps } from './DialogManager'

type TabId = 'appearance' | 'canvas' | 'tools' | 'grid' | 'backup' | 'shortcuts'

interface TabConfig {
  id: TabId
  label: string
  icon: string
}

const TABS: TabConfig[] = [
  { id: 'appearance', label: 'Appearance', icon: '🎨' },
  { id: 'canvas', label: 'Canvas', icon: '🖼️' },
  { id: 'tools', label: 'Tools', icon: '🔧' },
  { id: 'grid', label: 'Grid & Guides', icon: '📐' },
  { id: 'backup', label: 'Backup', icon: '💾' },
  { id: 'shortcuts', label: 'Shortcuts', icon: '⌨️' },
]

export function PreferencesDialog({ open, onOpenChange }: DialogProps) {
  const [activeTab, setActiveTab] = useState<TabId>('appearance')
  const preferences = usePreferencesStore()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] h-[500px] flex flex-col p-0">
        <DialogHeader className="px-4 py-3 border-b border-pix-border">
          <DialogTitle>Preferences</DialogTitle>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-40 border-r border-pix-border bg-pix-bg-secondary p-2 flex flex-col gap-1">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                className={`flex items-center gap-2 px-3 py-2 rounded text-left text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'bg-pix-accent text-white'
                    : 'hover:bg-pix-hover text-pix-text'
                }`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {activeTab === 'appearance' && (
              <AppearanceTab preferences={preferences} />
            )}
            {activeTab === 'canvas' && (
              <CanvasTab preferences={preferences} />
            )}
            {activeTab === 'tools' && (
              <ToolsTab preferences={preferences} />
            )}
            {activeTab === 'grid' && (
              <GridTab preferences={preferences} />
            )}
            {activeTab === 'backup' && (
              <BackupTab preferences={preferences} />
            )}
            {activeTab === 'shortcuts' && (
              <ShortcutsTab />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center px-4 py-3 border-t border-pix-border">
          <button
            className="btn text-red-400 hover:text-red-300"
            onClick={() => {
              if (confirm('Reset all preferences to defaults?')) {
                preferences.resetToDefaults()
              }
            }}
          >
            Reset to Defaults
          </button>
          <button className="btn bg-pix-accent" onClick={() => onOpenChange(false)}>
            Done
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// === Tab Components ===

function AppearanceTab({ preferences }: { preferences: ReturnType<typeof usePreferencesStore.getState> }) {
  return (
    <div className="space-y-6">
      <Section title="Theme">
        <div className="flex gap-2">
          {(['dark', 'light', 'system'] as Theme[]).map((theme) => (
            <button
              key={theme}
              className={`px-4 py-2 rounded capitalize ${
                preferences.theme === theme ? 'bg-pix-accent' : 'bg-pix-bg-secondary hover:bg-pix-hover'
              }`}
              onClick={() => preferences.setTheme(theme)}
            >
              {theme}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Font Size">
        <div className="flex items-center gap-4">
          <input
            type="range"
            min="10"
            max="24"
            value={preferences.fontSize}
            onChange={(e) => preferences.setFontSize(parseInt(e.target.value))}
            className="flex-1"
          />
          <span className="w-12 text-right">{preferences.fontSize}px</span>
        </div>
      </Section>

      <Section title="UI Scale">
        <div className="flex items-center gap-4">
          <input
            type="range"
            min="0.75"
            max="2"
            step="0.05"
            value={preferences.uiScale}
            onChange={(e) => preferences.setUIScale(parseFloat(e.target.value))}
            className="flex-1"
          />
          <span className="w-12 text-right">{Math.round(preferences.uiScale * 100)}%</span>
        </div>
      </Section>

      <Section title="Tool Button Size">
        <div className="flex gap-2">
          {(['small', 'medium', 'large'] as ToolButtonSize[]).map((size) => (
            <button
              key={size}
              className={`px-4 py-2 rounded capitalize ${
                preferences.toolButtonSize === size ? 'bg-pix-accent' : 'bg-pix-bg-secondary hover:bg-pix-hover'
              }`}
              onClick={() => preferences.setToolButtonSize(size)}
            >
              {size}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Options">
        <Checkbox
          label="Show notifications"
          checked={preferences.showNotifications}
          onChange={preferences.setShowNotifications}
        />
        <Checkbox
          label="Dim background when dialog opens"
          checked={preferences.dimOnPopup}
          onChange={preferences.setDimOnPopup}
        />
        <Checkbox
          label="Smooth animations"
          checked={preferences.smoothAnimations}
          onChange={preferences.setSmoothAnimations}
        />
      </Section>
    </div>
  )
}

function CanvasTab({ preferences }: { preferences: ReturnType<typeof usePreferencesStore.getState> }) {
  return (
    <div className="space-y-6">
      <Section title="Default Canvas Size">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-pix-text-muted mb-1 block">Width</label>
            <input
              type="number"
              className="input w-full"
              value={preferences.defaultWidth}
              onChange={(e) => preferences.setDefaultWidth(parseInt(e.target.value) || 64)}
              min={1}
              max={4096}
            />
          </div>
          <div>
            <label className="text-sm text-pix-text-muted mb-1 block">Height</label>
            <input
              type="number"
              className="input w-full"
              value={preferences.defaultHeight}
              onChange={(e) => preferences.setDefaultHeight(parseInt(e.target.value) || 64)}
              min={1}
              max={4096}
            />
          </div>
        </div>
      </Section>

      <Section title="Default Fill Color">
        <div className="flex items-center gap-2">
          <input
            type="color"
            className="w-10 h-10 cursor-pointer rounded"
            value={preferences.defaultFillColor === '#00000000' ? '#ffffff' : preferences.defaultFillColor}
            onChange={(e) => preferences.setDefaultFillColor(e.target.value)}
          />
          <button
            className={`btn ${preferences.defaultFillColor === '#00000000' ? 'bg-pix-accent' : ''}`}
            onClick={() => preferences.setDefaultFillColor('#00000000')}
          >
            Transparent
          </button>
        </div>
      </Section>

      <Section title="Zoom Options">
        <Checkbox
          label="Smooth zoom"
          checked={preferences.smoothZoom}
          onChange={preferences.setSmoothZoom}
        />
        <Checkbox
          label="Integer zoom only (1x, 2x, 4x...)"
          checked={preferences.integerZoom}
          onChange={preferences.setIntegerZoom}
        />
      </Section>

      <Section title="Checkerboard Background">
        <Checkbox
          label="Show checkerboard for transparency"
          checked={preferences.showCheckerboard}
          onChange={preferences.setShowCheckerboard}
        />
        <div className="flex items-center gap-4 mt-2">
          <label className="text-sm">Size:</label>
          <input
            type="number"
            className="input w-20"
            value={preferences.checkerboardSize}
            onChange={(e) => preferences.setCheckerboardSize(parseInt(e.target.value) || 8)}
            min={2}
            max={64}
          />
        </div>
        <div className="flex items-center gap-4 mt-2">
          <label className="text-sm">Colors:</label>
          <input
            type="color"
            className="w-8 h-8 cursor-pointer rounded"
            value={preferences.checkerboardColor1}
            onChange={(e) => preferences.setCheckerboardColors(e.target.value, preferences.checkerboardColor2)}
          />
          <input
            type="color"
            className="w-8 h-8 cursor-pointer rounded"
            value={preferences.checkerboardColor2}
            onChange={(e) => preferences.setCheckerboardColors(preferences.checkerboardColor1, e.target.value)}
          />
        </div>
      </Section>
    </div>
  )
}

function ToolsTab({ preferences }: { preferences: ReturnType<typeof usePreferencesStore.getState> }) {
  return (
    <div className="space-y-6">
      <Section title="Tool Colors">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm">Left click:</label>
            <input
              type="color"
              className="w-8 h-8 cursor-pointer rounded"
              value={preferences.leftToolColor}
              onChange={(e) => preferences.setLeftToolColor(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm">Right click:</label>
            <input
              type="color"
              className="w-8 h-8 cursor-pointer rounded"
              value={preferences.rightToolColor}
              onChange={(e) => preferences.setRightToolColor(e.target.value)}
            />
          </div>
        </div>
      </Section>

      <Section title="Cursor Shape">
        <div className="flex gap-2">
          {(['crosshair', 'brush', 'native', 'none'] as CursorShape[]).map((shape) => (
            <button
              key={shape}
              className={`px-4 py-2 rounded capitalize ${
                preferences.cursorShape === shape ? 'bg-pix-accent' : 'bg-pix-bg-secondary hover:bg-pix-hover'
              }`}
              onClick={() => preferences.setCursorShape(shape)}
            >
              {shape}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Options">
        <Checkbox
          label="Share tool options between tools"
          checked={preferences.shareToolOptions}
          onChange={preferences.setShareToolOptions}
        />
        <Checkbox
          label="Show brush outline"
          checked={preferences.showBrushOutline}
          onChange={preferences.setShowBrushOutline}
        />
      </Section>
    </div>
  )
}

function GridTab({ preferences }: { preferences: ReturnType<typeof usePreferencesStore.getState> }) {
  return (
    <div className="space-y-6">
      <Section title="Grid">
        <div className="flex items-center gap-4">
          <label className="text-sm">Color:</label>
          <input
            type="color"
            className="w-8 h-8 cursor-pointer rounded"
            value={preferences.gridColor}
            onChange={(e) => preferences.setGridColor(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-4 mt-2">
          <label className="text-sm">Opacity:</label>
          <input
            type="range"
            min="0"
            max="100"
            value={preferences.gridOpacity}
            onChange={(e) => preferences.setGridOpacity(parseInt(e.target.value))}
            className="flex-1"
          />
          <span className="w-12 text-right">{preferences.gridOpacity}%</span>
        </div>
      </Section>

      <Section title="Pixel Grid">
        <div className="flex items-center gap-4">
          <label className="text-sm">Color:</label>
          <input
            type="color"
            className="w-8 h-8 cursor-pointer rounded"
            value={preferences.pixelGridColor}
            onChange={(e) => preferences.setPixelGridColor(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-4 mt-2">
          <label className="text-sm">Show at zoom:</label>
          <input
            type="number"
            className="input w-20"
            value={preferences.pixelGridThreshold}
            onChange={(e) => preferences.setPixelGridThreshold(parseInt(e.target.value) || 16)}
            min={1}
            max={64}
          />
          <span className="text-sm text-pix-text-muted">x and above</span>
        </div>
      </Section>

      <Section title="Guides">
        <div className="flex items-center gap-4">
          <label className="text-sm">Color:</label>
          <input
            type="color"
            className="w-8 h-8 cursor-pointer rounded"
            value={preferences.guideColor}
            onChange={(e) => preferences.setGuideColor(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-4 mt-2">
          <label className="text-sm">Opacity:</label>
          <input
            type="range"
            min="0"
            max="100"
            value={preferences.guideOpacity}
            onChange={(e) => preferences.setGuideOpacity(parseInt(e.target.value))}
            className="flex-1"
          />
          <span className="w-12 text-right">{preferences.guideOpacity}%</span>
        </div>
        <Checkbox
          label="Snap to guides"
          checked={preferences.snapToGuides}
          onChange={preferences.setSnapToGuides}
        />
        <div className="flex items-center gap-4 mt-2">
          <label className="text-sm">Snap distance:</label>
          <input
            type="number"
            className="input w-20"
            value={preferences.snapDistance}
            onChange={(e) => preferences.setSnapDistance(parseInt(e.target.value) || 4)}
            min={1}
            max={32}
          />
          <span className="text-sm text-pix-text-muted">px</span>
        </div>
      </Section>
    </div>
  )
}

function BackupTab({ preferences }: { preferences: ReturnType<typeof usePreferencesStore.getState> }) {
  return (
    <div className="space-y-6">
      <Section title="Autosave">
        <Checkbox
          label="Enable autosave"
          checked={preferences.autosaveEnabled}
          onChange={preferences.setAutosaveEnabled}
        />
        <div className="flex items-center gap-4 mt-2">
          <label className="text-sm">Interval:</label>
          <input
            type="number"
            className="input w-20"
            value={preferences.autosaveInterval}
            onChange={(e) => preferences.setAutosaveInterval(parseInt(e.target.value) || 5)}
            min={1}
            max={60}
            disabled={!preferences.autosaveEnabled}
          />
          <span className="text-sm text-pix-text-muted">minutes</span>
        </div>
      </Section>

      <Section title="Backup">
        <Checkbox
          label="Create backup on close"
          checked={preferences.backupOnClose}
          onChange={preferences.setBackupOnClose}
        />
        <div className="flex items-center gap-4 mt-2">
          <label className="text-sm">Max backups:</label>
          <input
            type="number"
            className="input w-20"
            value={preferences.maxBackups}
            onChange={(e) => preferences.setMaxBackups(parseInt(e.target.value) || 5)}
            min={1}
            max={20}
          />
        </div>
      </Section>

      <Section title="Performance">
        <Checkbox
          label="Hardware acceleration"
          checked={preferences.hardwareAcceleration}
          onChange={preferences.setHardwareAcceleration}
        />
        <Checkbox
          label="Low memory mode"
          checked={preferences.lowMemoryMode}
          onChange={preferences.setLowMemoryMode}
        />
        <div className="flex items-center gap-4 mt-2">
          <label className="text-sm">Max undo steps:</label>
          <input
            type="number"
            className="input w-20"
            value={preferences.maxUndoSteps}
            onChange={(e) => preferences.setMaxUndoSteps(parseInt(e.target.value) || 50)}
            min={10}
            max={200}
          />
        </div>
      </Section>

      <Section title="Export/Import">
        <div className="flex gap-2">
          <button
            className="btn"
            onClick={() => {
              const json = preferences.exportPreferences()
              const blob = new Blob([json], { type: 'application/json' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = 'pixelorama-preferences.json'
              a.click()
              URL.revokeObjectURL(url)
            }}
          >
            Export Preferences
          </button>
          <button
            className="btn"
            onClick={() => {
              const input = document.createElement('input')
              input.type = 'file'
              input.accept = '.json'
              input.onchange = async (e) => {
                const file = (e.target as HTMLInputElement).files?.[0]
                if (file) {
                  const text = await file.text()
                  if (preferences.importPreferences(text)) {
                    alert('Preferences imported successfully!')
                  } else {
                    alert('Failed to import preferences. Invalid file format.')
                  }
                }
              }
              input.click()
            }}
          >
            Import Preferences
          </button>
        </div>
      </Section>
    </div>
  )
}

function ShortcutsTab() {
  return (
    <div className="space-y-4">
      <p className="text-pix-text-muted">
        Keyboard shortcuts can be customized. Click on a shortcut to change it.
      </p>
      <p className="text-pix-text-muted text-sm">
        For detailed shortcut configuration, use Edit &gt; Keyboard Shortcuts.
      </p>
      <button
        className="btn bg-pix-accent"
        onClick={() => {
          // Open keyboard shortcuts dialog
          usePreferencesStore.getState()
        }}
      >
        Open Keyboard Shortcuts
      </button>
    </div>
  )
}

// === Helper Components ===

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-pix-text-muted mb-3 uppercase tracking-wide">
        {title}
      </h3>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function Checkbox({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 rounded border-pix-border bg-pix-bg-secondary"
      />
      <span className="text-sm">{label}</span>
    </label>
  )
}
