import { useState, useRef, useCallback, useEffect } from 'react';
import { AudioClip } from '@/components/DocumentaryStudio';

interface UseAudioPlayerProps {
  clips: AudioClip[];
  onClipChange?: (clipIndex: number) => void;
  onComplete?: () => void;
}

interface UseAudioPlayerReturn {
  isPlaying: boolean;
  currentClipIndex: number;
  currentTime: number;
  totalDuration: number;
  volume: number;
  play: () => void;
  pause: () => void;
  reset: () => void;
  togglePlayPause: () => void;
  seekToClip: (index: number) => void;
  setVolume: (volume: number) => void;
}

export const useAudioPlayer = ({ 
  clips, 
  onClipChange, 
  onComplete 
}: UseAudioPlayerProps): UseAudioPlayerReturn => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentClipIndex, setCurrentClipIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolumeState] = useState(1);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const intervalRef = useRef<number | null>(null);

  const setVolume = useCallback((newVolume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    setVolumeState(clampedVolume);
    if (audioRef.current) {
      audioRef.current.volume = clampedVolume;
    }
  }, []);

  const totalDuration = clips.reduce((acc, clip) => acc + clip.duration, 0);

  // Get clips that have audio URLs
  const playableClips = clips.filter(clip => clip.audioUrl);

  const clearTimeInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startTimeTracking = useCallback(() => {
    clearTimeInterval();
    intervalRef.current = window.setInterval(() => {
      if (audioRef.current) {
        setCurrentTime(audioRef.current.currentTime);
      }
    }, 100);
  }, [clearTimeInterval]);

  const playCurrentClip = useCallback(() => {
    if (playableClips.length === 0) {
      console.log('No playable clips available');
      return;
    }

    const currentClip = playableClips[currentClipIndex];
    if (!currentClip?.audioUrl) {
      console.log('Current clip has no audio URL');
      return;
    }

    // Clean up previous audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeEventListener('ended', () => {});
    }

    const audio = new Audio(currentClip.audioUrl);
    audio.volume = volume;
    audioRef.current = audio;

    audio.addEventListener('ended', () => {
      // Move to next clip
      if (currentClipIndex < playableClips.length - 1) {
        setCurrentClipIndex(prev => prev + 1);
        onClipChange?.(currentClipIndex + 1);
      } else {
        // All clips finished
        setIsPlaying(false);
        setCurrentClipIndex(0);
        setCurrentTime(0);
        clearTimeInterval();
        onComplete?.();
      }
    });

    audio.addEventListener('error', (e) => {
      console.error('Audio playback error:', e);
      setIsPlaying(false);
    });

    audio.play()
      .then(() => {
        setIsPlaying(true);
        startTimeTracking();
      })
      .catch(err => {
        console.error('Failed to play audio:', err);
        setIsPlaying(false);
      });
  }, [playableClips, currentClipIndex, volume, onClipChange, onComplete, startTimeTracking, clearTimeInterval]);

  const play = useCallback(() => {
    if (audioRef.current && !isPlaying) {
      audioRef.current.play()
        .then(() => {
          setIsPlaying(true);
          startTimeTracking();
        })
        .catch(() => {
          // If resume fails, try playing from the current clip
          playCurrentClip();
        });
    } else if (!audioRef.current) {
      playCurrentClip();
    }
  }, [isPlaying, playCurrentClip, startTimeTracking]);

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      clearTimeInterval();
    }
  }, [clearTimeInterval]);

  const reset = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsPlaying(false);
    setCurrentClipIndex(0);
    setCurrentTime(0);
    clearTimeInterval();
  }, [clearTimeInterval]);

  const togglePlayPause = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, pause, play]);

  const seekToClip = useCallback((index: number) => {
    if (index >= 0 && index < playableClips.length) {
      const wasPlaying = isPlaying;
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setCurrentClipIndex(index);
      setCurrentTime(0);
      onClipChange?.(index);
      
      if (wasPlaying) {
        // Small delay to ensure state is updated
        setTimeout(() => {
          playCurrentClip();
        }, 50);
      }
    }
  }, [playableClips.length, isPlaying, onClipChange, playCurrentClip]);

  // When currentClipIndex changes and we're playing, play the next clip
  useEffect(() => {
    if (isPlaying && audioRef.current === null) {
      playCurrentClip();
    }
  }, [currentClipIndex, isPlaying, playCurrentClip]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      clearTimeInterval();
    };
  }, [clearTimeInterval]);

  // Reset when clips change
  useEffect(() => {
    reset();
  }, [clips.length]); // Only reset when number of clips changes

  return {
    isPlaying,
    currentClipIndex,
    currentTime,
    totalDuration,
    volume,
    play,
    pause,
    reset,
    togglePlayPause,
    seekToClip,
    setVolume,
  };
};
