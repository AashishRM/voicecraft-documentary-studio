import { useState, useRef, useCallback, useEffect } from 'react';
import { AudioClip } from '@/components/DocumentaryStudio';

interface UseMultiTrackAudioPlayerProps {
  clips: AudioClip[];
  onComplete?: () => void;
}

interface UseMultiTrackAudioPlayerReturn {
  isPlaying: boolean;
  currentTime: number;
  totalDuration: number;
  globalTime: number;
  play: () => void;
  pause: () => void;
  reset: () => void;
  togglePlayPause: () => void;
  seekToTime: (time: number) => void;
  setTrackVolume: (trackIndex: number, volume: number) => void;
  getTrackVolume: (trackIndex: number) => number;
}

export const useMultiTrackAudioPlayer = ({ 
  clips, 
  onComplete 
}: UseMultiTrackAudioPlayerProps): UseMultiTrackAudioPlayerReturn => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [globalTime, setGlobalTime] = useState(0);
  const [trackVolumes, setTrackVolumes] = useState<Map<number, number>>(new Map());
  
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());
  const intervalRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const clipsRef = useRef<AudioClip[]>(clips);
  const trackVolumesRef = useRef<Map<number, number>>(new Map());

  // Update clips ref when clips change
  useEffect(() => {
    clipsRef.current = clips;
  }, [clips]);

  // Group clips by track (including video clips) - memoized
  const clipsByTrack = useRef<Map<number, AudioClip[]>>(new Map());
  
  useEffect(() => {
    const newClipsByTrack = new Map<number, AudioClip[]>();
    clips.forEach(clip => {
      // Include clips with audioUrl OR videoUrl (video clips can play audio)
      if (clip.audioUrl || clip.videoUrl) {
        const trackIndex = clip.trackIndex ?? 0;
        if (!newClipsByTrack.has(trackIndex)) {
          newClipsByTrack.set(trackIndex, []);
        }
        newClipsByTrack.get(trackIndex)!.push(clip);
      }
    });
    clipsByTrack.current = newClipsByTrack;
  }, [clips]);

  // Initialize track volumes
  useEffect(() => {
    clips.forEach(clip => {
      if (clip.trackIndex !== undefined) {
        const currentVolume = trackVolumes.get(clip.trackIndex) ?? clip.trackVolume ?? 1.0;
        setTrackVolumes(prev => {
          const newMap = new Map(prev);
          newMap.set(clip.trackIndex!, currentVolume);
          trackVolumesRef.current = newMap;
          return newMap;
        });
      }
    });
  }, [clips, trackVolumes]);

  // Calculate total duration (max end time of all clips)
  const totalDuration = Math.max(
    ...clips.map(clip => {
      const startTime = clip.startTime ?? 0;
      return startTime + clip.duration;
    }),
    0
  );

  const clearTimeInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const isPlayingRef = useRef(false);
  
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  const startTimeTracking = useCallback(() => {
    clearTimeInterval();
    intervalRef.current = window.setInterval(() => {
      if (!isPlayingRef.current) return;
      
      const elapsed = (performance.now() - startTimeRef.current) / 1000;
      const currentTotalDuration = Math.max(
        ...clipsRef.current.map(clip => {
          const startTime = clip.startTime ?? 0;
          return startTime + clip.duration;
        }),
        0
      );
      const time = Math.min(elapsed, currentTotalDuration);
      setCurrentTime(time);
      setGlobalTime(time);
      
      // Stop playback if we've reached the end
      if (time >= currentTotalDuration && currentTotalDuration > 0) {
        audioRefs.current.forEach(audio => {
          audio.pause();
          audio.src = '';
        });
        audioRefs.current.clear();
        setIsPlaying(false);
        setCurrentTime(currentTotalDuration);
        setGlobalTime(currentTotalDuration);
        clearTimeInterval();
        onComplete?.();
        return;
      }
      
      // Manage clip playback based on current time
      clipsByTrack.current.forEach((trackClips, trackIndex) => {
        trackClips.forEach((clip) => {
          const clipStartTime = clip.startTime ?? 0;
          const clipEndTime = clipStartTime + clip.duration;
          const clipKey = `${trackIndex}-${clip.id}`;
          const audio = audioRefs.current.get(clipKey);
          
          // Check if clip should be playing
          const shouldBePlaying = time >= clipStartTime && time < clipEndTime;
          
          if (shouldBePlaying && !audio) {
            // Start clip if it should be playing but isn't
            const audioSource = clip.audioUrl || clip.videoUrl;
            if (!audioSource) return;
            
            const newAudio = new Audio(audioSource);
            // Get volume from ref
            const volume = trackVolumesRef.current.get(trackIndex) ?? clip.trackVolume ?? 1.0;
            newAudio.volume = volume;
            
            const clipOffset = time - clipStartTime;
            newAudio.currentTime = Math.min(clipOffset, clip.duration);
            
            audioRefs.current.set(clipKey, newAudio);
            
            newAudio.addEventListener('ended', () => {
              audioRefs.current.delete(clipKey);
            });
            
            newAudio.addEventListener('error', (e) => {
              console.error(`Audio playback error for clip ${clip.id}:`, e);
              audioRefs.current.delete(clipKey);
            });
            
            newAudio.play().catch(err => {
              console.error(`Failed to play clip ${clip.id}:`, err);
              audioRefs.current.delete(clipKey);
            });
          } else if (!shouldBePlaying && audio) {
            // Stop clip if it shouldn't be playing
            audio.pause();
            audio.src = '';
            audioRefs.current.delete(clipKey);
          } else if (shouldBePlaying && audio && !audio.paused) {
            // Update audio position if it's playing (sync check)
            const clipOffset = time - clipStartTime;
            const expectedTime = Math.min(clipOffset, clip.duration);
            // Only update if significantly off (more than 0.2 seconds) to avoid constant seeking
            if (Math.abs(audio.currentTime - expectedTime) > 0.2) {
              audio.currentTime = expectedTime;
            }
          }
        });
      });
    }, 100);
  }, [clearTimeInterval, onComplete]);

  const playAllTracks = useCallback(() => {
    if (clipsByTrack.current.size === 0) {
      console.log('No tracks to play');
      return;
    }

    // Clean up previous audio
    audioRefs.current.forEach(audio => {
      audio.pause();
      audio.src = '';
    });
    audioRefs.current.clear();

    // Start time tracking - it will manage clip playback dynamically
    setIsPlaying(true);
    startTimeRef.current = performance.now() - (globalTime * 1000);
    startTimeTracking();
  }, [globalTime, startTimeTracking]);

  const play = useCallback(() => {
    setIsPlaying(true);
    startTimeRef.current = performance.now() - (globalTime * 1000);
    
    // Resume any paused audio elements
    audioRefs.current.forEach(audio => {
      if (audio.paused) {
        audio.play().catch(err => {
          console.error('Failed to resume audio:', err);
        });
      }
    });
    
    startTimeTracking();
  }, [globalTime, startTimeTracking]);

  const pause = useCallback(() => {
    audioRefs.current.forEach(audio => {
      audio.pause();
    });
    setIsPlaying(false);
    clearTimeInterval();
  }, [clearTimeInterval]);

  const reset = useCallback(() => {
    audioRefs.current.forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });
    audioRefs.current.clear();
    setIsPlaying(false);
    setCurrentTime(0);
    setGlobalTime(0);
    clearTimeInterval();
  }, [clearTimeInterval]);

  const seekToTime = useCallback((time: number) => {
    const wasPlaying = isPlaying;
    
    // Pause all
    pause();
    
    // Clear existing audio refs
    audioRefs.current.forEach(audio => {
      audio.pause();
      audio.src = '';
    });
    audioRefs.current.clear();
    
    setGlobalTime(time);
    setCurrentTime(time);
    startTimeRef.current = performance.now() - (time * 1000);

    if (wasPlaying) {
      play();
    }
  }, [isPlaying, pause, play]);

  const togglePlayPause = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, pause, play]);

  const setTrackVolume = useCallback((trackIndex: number, volume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    setTrackVolumes(prev => {
      const newMap = new Map(prev);
      newMap.set(trackIndex, clampedVolume);
      trackVolumesRef.current = newMap;
      
      // Update audio volume for all clips on this track
      audioRefs.current.forEach((audio, clipKey) => {
        if (clipKey.startsWith(`${trackIndex}-`)) {
          audio.volume = clampedVolume;
        }
      });
      
      return newMap;
    });
    
    // Update all clips on this track
    clipsRef.current.forEach(clip => {
      if (clip.trackIndex === trackIndex) {
        clip.trackVolume = clampedVolume;
      }
    });
  }, []);

  const getTrackVolume = useCallback((trackIndex: number) => {
    return trackVolumes.get(trackIndex) ?? 1.0;
  }, [trackVolumes]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      audioRefs.current.forEach(audio => {
        audio.pause();
        audio.src = '';
      });
      audioRefs.current.clear();
      clearTimeInterval();
    };
  }, [clearTimeInterval]);

  return {
    isPlaying,
    currentTime,
    totalDuration,
    globalTime,
    play,
    pause,
    reset,
    togglePlayPause,
    seekToTime,
    setTrackVolume,
    getTrackVolume,
  };
};

