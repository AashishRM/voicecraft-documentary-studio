// import { useState, useRef, useCallback, useEffect } from 'react';
// import { TimelineTrack, TimelineClip } from '@/types/timeline';

// interface UseTimelineAudioPlayerProps {
//   tracks: TimelineTrack[];
//   masterVolume: number;
//   totalDuration: number;
//   onComplete?: () => void;
// }

// interface UseTimelineAudioPlayerReturn {
//   isPlaying: boolean;
//   currentTime: number;
//   globalTime: number;
//   play: () => void;
//   pause: () => void;
//   reset: () => void;
//   togglePlayPause: () => void;
//   seekToTime: (time: number) => void;
// }

// interface ActiveAudioSource {
//   audio: HTMLAudioElement;
//   clip: TimelineClip;
//   track: TimelineTrack;
// }

// export const useTimelineAudioPlayer = ({
//   tracks,
//   masterVolume,
//   totalDuration,
//   onComplete,
// }: UseTimelineAudioPlayerProps): UseTimelineAudioPlayerReturn => {
//   const [isPlaying, setIsPlaying] = useState(false);
//   const [globalTime, setGlobalTime] = useState(0);
  
//   const activeSourcesRef = useRef<ActiveAudioSource[]>([]);
//   const animationFrameRef = useRef<number | null>(null);
//   const startTimeRef = useRef<number>(0);
//   const pausedTimeRef = useRef<number>(0);

//   // Get all clips with their track info, sorted by start time
//   const getAllPlayableClips = useCallback(() => {
//     const allClips: { clip: TimelineClip; track: TimelineTrack }[] = [];
    
//     tracks.forEach(track => {
//       if (track.isMuted) return;
      
//       track.clips.forEach(clip => {
//         if (!clip.isMuted && clip.audioUrl) {
//           allClips.push({ clip, track });
//         }
//       });
//     });
    
//     return allClips.sort((a, b) => a.clip.startTime - b.clip.startTime);
//   }, [tracks]);

//   const stopAllSources = useCallback(() => {
//     activeSourcesRef.current.forEach(source => {
//       source.audio.pause();
//       source.audio.src = '';
//     });
//     activeSourcesRef.current = [];
//   }, []);

//   const updateActiveClips = useCallback((time: number) => {
//     const allClips = getAllPlayableClips();
    
//     // Find clips that should be playing at this time
//     const clipsAtTime = allClips.filter(({ clip }) => {
//       const clipEnd = clip.startTime + clip.duration;
//       return time >= clip.startTime && time < clipEnd;
//     });
    
//     // Stop clips that are no longer active
//     activeSourcesRef.current = activeSourcesRef.current.filter(source => {
//       const stillActive = clipsAtTime.some(({ clip }) => clip.id === source.clip.id);
//       if (!stillActive) {
//         source.audio.pause();
//         source.audio.src = '';
//       }
//       return stillActive;
//     });
    
//     // Start new clips that need to play
//     clipsAtTime.forEach(({ clip, track }) => {
//       const isAlreadyPlaying = activeSourcesRef.current.some(s => s.clip.id === clip.id);
      
//       if (!isAlreadyPlaying && clip.audioUrl) {
//         const audio = new Audio(clip.audioUrl);
//         const effectiveVolume = clip.volume * track.volume * masterVolume;
//         audio.volume = effectiveVolume;
        
//         // Calculate the position within the clip
//         const timeInClip = time - clip.startTime + clip.trimStart;
//         audio.currentTime = Math.max(0, timeInClip);
        
//         audio.play().catch(err => {
//           console.error('Failed to play audio:', err);
//         });
        
//         activeSourcesRef.current.push({ audio, clip, track });
//       }
//     });
    
//     // Update volume for active sources
//     activeSourcesRef.current.forEach(source => {
//       const effectiveVolume = source.clip.volume * source.track.volume * masterVolume;
//       source.audio.volume = effectiveVolume;
//     });
//   }, [getAllPlayableClips, masterVolume]);

//   const tick = useCallback(() => {
//     if (!isPlaying) return;
    
//     const elapsed = (performance.now() - startTimeRef.current) / 1000;
//     const currentTime = pausedTimeRef.current + elapsed;
    
//     if (currentTime >= totalDuration) {
//       setGlobalTime(totalDuration);
//       setIsPlaying(false);
//       stopAllSources();
//       onComplete?.();
//       return;
//     }
    
//     setGlobalTime(currentTime);
//     updateActiveClips(currentTime);
    
//     animationFrameRef.current = requestAnimationFrame(tick);
//   }, [isPlaying, totalDuration, updateActiveClips, stopAllSources, onComplete]);

//   const play = useCallback(() => {
//     if (isPlaying) return;
    
//     startTimeRef.current = performance.now();
//     pausedTimeRef.current = globalTime;
//     setIsPlaying(true);
    
//     // Start clips at current position
//     updateActiveClips(globalTime);
    
//     animationFrameRef.current = requestAnimationFrame(tick);
//   }, [isPlaying, globalTime, updateActiveClips, tick]);

//   const pause = useCallback(() => {
//     if (!isPlaying) return;
    
//     setIsPlaying(false);
//     pausedTimeRef.current = globalTime;
    
//     if (animationFrameRef.current) {
//       cancelAnimationFrame(animationFrameRef.current);
//       animationFrameRef.current = null;
//     }
    
//     stopAllSources();
//   }, [isPlaying, globalTime, stopAllSources]);

//   const reset = useCallback(() => {
//     setIsPlaying(false);
//     setGlobalTime(0);
//     pausedTimeRef.current = 0;
    
//     if (animationFrameRef.current) {
//       cancelAnimationFrame(animationFrameRef.current);
//       animationFrameRef.current = null;
//     }
    
//     stopAllSources();
//   }, [stopAllSources]);

//   const seekToTime = useCallback((time: number) => {
//     const clampedTime = Math.max(0, Math.min(time, totalDuration));
    
//     stopAllSources();
//     setGlobalTime(clampedTime);
//     pausedTimeRef.current = clampedTime;
    
//     if (isPlaying) {
//       startTimeRef.current = performance.now();
//       updateActiveClips(clampedTime);
//     }
//   }, [totalDuration, isPlaying, stopAllSources, updateActiveClips]);

//   const togglePlayPause = useCallback(() => {
//     if (isPlaying) {
//       pause();
//     } else {
//       play();
//     }
//   }, [isPlaying, pause, play]);

//   // Start animation loop when playing
//   useEffect(() => {
//     if (isPlaying) {
//       animationFrameRef.current = requestAnimationFrame(tick);
//     }
//     return () => {
//       if (animationFrameRef.current) {
//         cancelAnimationFrame(animationFrameRef.current);
//       }
//     };
//   }, [isPlaying, tick]);

//   // Update volumes when masterVolume changes
//   useEffect(() => {
//     activeSourcesRef.current.forEach(source => {
//       const effectiveVolume = source.clip.volume * source.track.volume * masterVolume;
//       source.audio.volume = effectiveVolume;
//     });
//   }, [masterVolume]);

//   // Cleanup on unmount
//   useEffect(() => {
//     return () => {
//       stopAllSources();
//       if (animationFrameRef.current) {
//         cancelAnimationFrame(animationFrameRef.current);
//       }
//     };
//   }, [stopAllSources]);

//   return {
//     isPlaying,
//     currentTime: globalTime,
//     globalTime,
//     play,
//     pause,
//     reset,
//     togglePlayPause,
//     seekToTime,
//   };
// };
