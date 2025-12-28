// Timeline types for professional video editor

export interface TimelineClip {
  id: string;
  name: string;
  originalDuration: number; // Full original clip duration
  duration: number; // Current duration after trimming
  startTime: number; // Position on the timeline (in seconds)
  trimStart: number; // Trim from start (in seconds)
  trimEnd: number; // Trim from end (in seconds)
  volume: number; // 0-1 volume level
  waveformData: number[];
  audioUrl?: string;
  isMuted: boolean;
  color?: string; // Track color for visual distinction
}

export interface TimelineTrack {
  id: string;
  name: string;
  type: 'video-audio' | 'audio'; // Video audio track or additional audio
  clips: TimelineClip[];
  volume: number; // Master volume for track
  isMuted: boolean;
  isLocked: boolean;
  height: number; // Track height in pixels
  color: string;
}

export interface TimelineState {
  tracks: TimelineTrack[];
  currentTime: number;
  duration: number;
  zoom: number; // Pixels per second
  scrollPosition: number;
  selectedClipId: string | null;
  selectedTrackId: string | null;
  playheadPosition: number;
  isPlaying: boolean;
  snapToGrid: boolean;
  gridSize: number; // Snap grid size in seconds
}

export interface ClipAction {
  type: 'split' | 'trim-start' | 'trim-end' | 'move' | 'volume' | 'delete' | 'mute';
  clipId: string;
  trackId: string;
  value?: number;
  position?: number;
}

// Default track colors
export const TRACK_COLORS = {
  videoAudio: 'hsl(var(--primary))',
  audio1: 'hsl(210 100% 60%)',
  audio2: 'hsl(280 100% 60%)',
  audio3: 'hsl(30 100% 60%)',
  audio4: 'hsl(150 100% 40%)',
};

export const DEFAULT_TRACK_HEIGHT = 60;
export const MIN_CLIP_DURATION = 0.1; // Minimum 100ms
export const PIXELS_PER_SECOND = 50; // Default zoom level
