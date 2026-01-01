/**
 * Audio Store - State management for audio layers
 * Manages audio clips, layers, and playback state
 */

import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type {
  AudioClip,
  AudioRegion,
  AudioLayerData,
  WaveformData,
} from '@/core/audio'
import {
  loadAudioClip,
  getAudioClip,
  getAllAudioClips,
  removeAudioClip,
  createAudioLayerData,
  createAudioRegion,
  addRegionToLayer,
  removeRegionFromLayer,
  updateRegionInLayer,
  moveRegion,
  trimRegion,
  splitRegion,
  generateWaveform,
  playAudioAtFrame,
  stopAllAudio,
  setMasterVolume,
  resumeAudioContext,
} from '@/core/audio'

// ============================================================================
// Types
// ============================================================================

export interface AudioState {
  // Audio clips
  clips: Map<string, AudioClip>
  waveforms: Map<string, WaveformData>

  // Audio layers
  audioLayers: AudioLayerData[]
  currentAudioLayerIndex: number

  // Playback
  masterVolume: number
  isPlaying: boolean

  // Selection
  selectedRegionId: string | null

  // Actions
  loadClip: (file: File) => Promise<AudioClip>
  removeClip: (id: string) => void
  getClip: (id: string) => AudioClip | undefined

  addAudioLayer: (name?: string) => void
  removeAudioLayer: (index: number) => void
  setCurrentAudioLayer: (index: number) => void
  updateAudioLayer: (index: number, updates: Partial<AudioLayerData>) => void

  addRegion: (layerIndex: number, clipId: string, startFrame: number) => void
  removeRegion: (layerIndex: number, regionId: string) => void
  updateRegion: (layerIndex: number, regionId: string, updates: Partial<AudioRegion>) => void
  moveRegionTo: (layerIndex: number, regionId: string, newStartFrame: number) => void
  trimRegionBy: (layerIndex: number, regionId: string, trimStart: number, trimEnd: number) => void
  splitRegionAt: (layerIndex: number, regionId: string, splitFrame: number, fps: number) => void

  selectRegion: (regionId: string | null) => void

  setMasterVolume: (volume: number) => void
  toggleLayerMute: (index: number) => void
  toggleLayerSolo: (index: number) => void

  playAtFrame: (frame: number, fps: number) => void
  stopPlayback: () => void

  getWaveform: (clipId: string, width: number) => WaveformData | null
}

// ============================================================================
// Store
// ============================================================================

export const useAudioStore = create<AudioState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    clips: new Map(),
    waveforms: new Map(),
    audioLayers: [],
    currentAudioLayerIndex: -1,
    masterVolume: 1,
    isPlaying: false,
    selectedRegionId: null,

    // === Clip Actions ===

    loadClip: async (file) => {
      await resumeAudioContext()
      const clip = await loadAudioClip(file)

      set((state) => {
        const newClips = new Map(state.clips)
        newClips.set(clip.id, clip)
        return { clips: newClips }
      })

      return clip
    },

    removeClip: (id) => {
      removeAudioClip(id)

      set((state) => {
        const newClips = new Map(state.clips)
        newClips.delete(id)

        const newWaveforms = new Map(state.waveforms)
        // Remove all waveforms for this clip
        for (const [key] of newWaveforms) {
          if (key.startsWith(`${id}:`)) {
            newWaveforms.delete(key)
          }
        }

        return {
          clips: newClips,
          waveforms: newWaveforms,
        }
      })
    },

    getClip: (id) => {
      return get().clips.get(id) || getAudioClip(id)
    },

    // === Audio Layer Actions ===

    addAudioLayer: (name) => {
      const id = `audio-layer-${Date.now()}`
      const layerName = name || `Audio ${get().audioLayers.length + 1}`
      const layer = createAudioLayerData(id, layerName)

      set((state) => ({
        audioLayers: [...state.audioLayers, layer],
        currentAudioLayerIndex: state.audioLayers.length,
      }))
    },

    removeAudioLayer: (index) => {
      set((state) => {
        const newLayers = state.audioLayers.filter((_, i) => i !== index)
        let newIndex = state.currentAudioLayerIndex

        if (newIndex >= newLayers.length) {
          newIndex = newLayers.length - 1
        }

        return {
          audioLayers: newLayers,
          currentAudioLayerIndex: newIndex,
        }
      })
    },

    setCurrentAudioLayer: (index) => {
      set({ currentAudioLayerIndex: index })
    },

    updateAudioLayer: (index, updates) => {
      set((state) => ({
        audioLayers: state.audioLayers.map((layer, i) =>
          i === index ? { ...layer, ...updates } : layer
        ),
      }))
    },

    // === Region Actions ===

    addRegion: (layerIndex, clipId, startFrame) => {
      const region = createAudioRegion(clipId, startFrame)

      set((state) => ({
        audioLayers: state.audioLayers.map((layer, i) =>
          i === layerIndex ? addRegionToLayer(layer, region) : layer
        ),
        selectedRegionId: region.id,
      }))
    },

    removeRegion: (layerIndex, regionId) => {
      set((state) => ({
        audioLayers: state.audioLayers.map((layer, i) =>
          i === layerIndex ? removeRegionFromLayer(layer, regionId) : layer
        ),
        selectedRegionId: state.selectedRegionId === regionId ? null : state.selectedRegionId,
      }))
    },

    updateRegion: (layerIndex, regionId, updates) => {
      set((state) => ({
        audioLayers: state.audioLayers.map((layer, i) =>
          i === layerIndex ? updateRegionInLayer(layer, regionId, updates) : layer
        ),
      }))
    },

    moveRegionTo: (layerIndex, regionId, newStartFrame) => {
      set((state) => ({
        audioLayers: state.audioLayers.map((layer, i) =>
          i === layerIndex ? moveRegion(layer, regionId, newStartFrame) : layer
        ),
      }))
    },

    trimRegionBy: (layerIndex, regionId, trimStart, trimEnd) => {
      set((state) => ({
        audioLayers: state.audioLayers.map((layer, i) =>
          i === layerIndex ? trimRegion(layer, regionId, trimStart, trimEnd) : layer
        ),
      }))
    },

    splitRegionAt: (layerIndex, regionId, splitFrame, fps) => {
      set((state) => ({
        audioLayers: state.audioLayers.map((layer, i) =>
          i === layerIndex ? splitRegion(layer, regionId, splitFrame, fps) : layer
        ),
      }))
    },

    selectRegion: (regionId) => {
      set({ selectedRegionId: regionId })
    },

    // === Volume/Mute Actions ===

    setMasterVolume: (volume) => {
      const clampedVolume = Math.max(0, Math.min(1, volume))
      setMasterVolume(clampedVolume)
      set({ masterVolume: clampedVolume })
    },

    toggleLayerMute: (index) => {
      set((state) => ({
        audioLayers: state.audioLayers.map((layer, i) =>
          i === index ? { ...layer, muted: !layer.muted } : layer
        ),
      }))
    },

    toggleLayerSolo: (index) => {
      set((state) => ({
        audioLayers: state.audioLayers.map((layer, i) =>
          i === index ? { ...layer, solo: !layer.solo } : layer
        ),
      }))
    },

    // === Playback Actions ===

    playAtFrame: (frame, fps) => {
      const state = get()

      // If any layer is soloed, only play soloed layers
      const hasSolo = state.audioLayers.some(l => l.solo)
      const layersToPlay = hasSolo
        ? state.audioLayers.filter(l => l.solo)
        : state.audioLayers

      playAudioAtFrame(layersToPlay, frame, fps)
      set({ isPlaying: true })
    },

    stopPlayback: () => {
      stopAllAudio()
      set({ isPlaying: false })
    },

    // === Waveform ===

    getWaveform: (clipId, width) => {
      const state = get()
      const cacheKey = `${clipId}:${width}`

      // Check cache
      const cached = state.waveforms.get(cacheKey)
      if (cached) return cached

      // Generate waveform
      const clip = state.getClip(clipId)
      if (!clip) return null

      const waveform = generateWaveform(clip, width)

      // Cache it
      set((s) => {
        const newWaveforms = new Map(s.waveforms)
        newWaveforms.set(cacheKey, waveform)
        return { waveforms: newWaveforms }
      })

      return waveform
    },
  }))
)

// ============================================================================
// Events
// ============================================================================

export const audioEvents = {
  listeners: new Set<(event: string, data: unknown) => void>(),

  subscribe(callback: (event: string, data: unknown) => void) {
    this.listeners.add(callback)
    return () => this.listeners.delete(callback)
  },

  emit(event: string, data: unknown) {
    this.listeners.forEach(cb => cb(event, data))
  },
}

// Subscribe to playback state changes
useAudioStore.subscribe(
  (state) => state.isPlaying,
  (isPlaying) => {
    audioEvents.emit('playbackStateChanged', isPlaying)
  }
)
