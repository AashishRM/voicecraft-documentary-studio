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
  
  const audioRefs = useRef<Map<number, HTMLAudioElement>>(new Map());
  const intervalRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  // Group clips by track (including video clips)
  const clipsByTrack = new Map<number, AudioClip[]>();
  clips.forEach(clip => {
    // Include clips with audioUrl OR videoUrl (video clips can play audio)
    if (clip.audioUrl || clip.videoUrl) {
      const trackIndex = clip.trackIndex ?? 0;
      if (!clipsByTrack.has(trackIndex)) {
        clipsByTrack.set(trackIndex, []);
      }
      clipsByTrack.get(trackIndex)!.push(clip);
    }
  });

  // Initialize track volumes
  useEffect(() => {
    clips.forEach(clip => {
      if (clip.trackIndex !== undefined) {
        const currentVolume = trackVolumes.get(clip.trackIndex) ?? clip.trackVolume ?? 1.0;
        setTrackVolumes(prev => {
          const newMap = new Map(prev);
          newMap.set(clip.trackIndex!, currentVolume);
          return newMap;
        });
      }
    });
  }, [clips]);

  // Calculate total duration (max of all tracks)
  const totalDuration = Math.max(
    ...Array.from(clipsByTrack.values()).map(trackClips => 
      trackClips.reduce((sum, clip) => sum + clip.duration, 0)
    ),
    0
  );

  const clearTimeInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startTimeTracking = useCallback(() => {
    clearTimeInterval();
    intervalRef.current = window.setInterval(() => {
      // Get the current time from the first playing audio
      const firstAudio = Array.from(audioRefs.current.values())[0];
      if (firstAudio && !firstAudio.paused) {
        const elapsed = (performance.now() - startTimeRef.current) / 1000;
        const time = Math.min(elapsed, totalDuration);
        setCurrentTime(time);
        setGlobalTime(time);
      }
    }, 100);
  }, [clearTimeInterval, totalDuration]);

  const playAllTracks = useCallback(() => {
    if (clipsByTrack.size === 0) {
      console.log('No tracks to play');
      return;
    }

    // Clean up previous audio
    audioRefs.current.forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });
    audioRefs.current.clear();

    // Play all tracks simultaneously
    const playPromises: Promise<void>[] = [];
    
    clipsByTrack.forEach((trackClips, trackIndex) => {
      if (trackClips.length === 0) return;

      // For each track, play the first clip (we can extend this to handle multiple clips per track later)
      const firstClip = trackClips[0];
      // Use audioUrl if available, otherwise use videoUrl (video files contain audio)
      const audioSource = firstClip.audioUrl || firstClip.videoUrl;
      if (!audioSource) return;

      const audio = new Audio(audioSource);
      const volume = trackVolumes.get(trackIndex) ?? firstClip.trackVolume ?? 1.0;
      audio.volume = volume;
      
      audioRefs.current.set(trackIndex, audio);

      // Set up event handlers
      audio.addEventListener('ended', () => {
        // Track finished, but other tracks may still be playing
        audioRefs.current.delete(trackIndex);
        
        // Check if all tracks are done
        if (audioRefs.current.size === 0) {
          setIsPlaying(false);
          setCurrentTime(0);
          setGlobalTime(0);
          clearTimeInterval();
          onComplete?.();
        }
      });

      audio.addEventListener('error', (e) => {
        console.error(`Audio playback error for track ${trackIndex}:`, e);
        audioRefs.current.delete(trackIndex);
      });

      playPromises.push(audio.play().catch(err => {
        console.error(`Failed to play track ${trackIndex}:`, err);
        audioRefs.current.delete(trackIndex);
      }));
    });

    Promise.all(playPromises).then(() => {
      setIsPlaying(true);
      startTimeRef.current = performance.now() - (globalTime * 1000);
      startTimeTracking();
    });
  }, [clipsByTrack, trackVolumes, globalTime, clearTimeInterval, startTimeTracking, onComplete]);

  const play = useCallback(() => {
    if (audioRefs.current.size > 0) {
      // Resume all playing tracks
      audioRefs.current.forEach(audio => {
        audio.play().catch(() => {});
      });
      setIsPlaying(true);
      startTimeRef.current = performance.now() - (globalTime * 1000);
      startTimeTracking();
    } else {
      playAllTracks();
    }
  }, [playAllTracks, globalTime, startTimeTracking]);

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
    
    // Seek all tracks to the same time
    clipsByTrack.forEach((trackClips, trackIndex) => {
      if (trackClips.length === 0) return;
      
      const firstClip = trackClips[0];
      // Use audioUrl if available, otherwise use videoUrl (video files contain audio)
      const audioSource = firstClip.audioUrl || firstClip.videoUrl;
      if (!audioSource) return;

      const audio = new Audio(audioSource);
      const volume = trackVolumes.get(trackIndex) ?? firstClip.trackVolume ?? 1.0;
      audio.volume = volume;
      audio.currentTime = Math.min(time, firstClip.duration);
      
      audioRefs.current.set(trackIndex, audio);
      
      audio.addEventListener('ended', () => {
        audioRefs.current.delete(trackIndex);
        if (audioRefs.current.size === 0) {
          setIsPlaying(false);
          setCurrentTime(0);
          setGlobalTime(0);
          clearTimeInterval();
          onComplete?.();
        }
      });
    });

    setGlobalTime(time);
    setCurrentTime(time);
    startTimeRef.current = performance.now() - (time * 1000);

    if (wasPlaying) {
      play();
    }
  }, [clipsByTrack, trackVolumes, isPlaying, pause, clearTimeInterval, onComplete, play]);

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
      return newMap;
    });
    
    // Update audio volume if track is currently playing
    const audio = audioRefs.current.get(trackIndex);
    if (audio) {
      audio.volume = clampedVolume;
    }
    
    // Update all clips on this track
    clips.forEach(clip => {
      if (clip.trackIndex === trackIndex) {
        clip.trackVolume = clampedVolume;
      }
    });
  }, [clips]);

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

