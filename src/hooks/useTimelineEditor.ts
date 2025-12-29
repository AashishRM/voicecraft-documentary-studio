// import { useState, useCallback, useRef, useEffect } from 'react';
// import {
//   TimelineTrack,
//   TimelineClip,
//   TimelineState,
//   TRACK_COLORS,
//   DEFAULT_TRACK_HEIGHT,
//   MIN_CLIP_DURATION,
//   PIXELS_PER_SECOND,
// } from '@/types/timeline';
// import { AudioClip } from '@/components/DocumentaryStudio';

// interface UseTimelineEditorProps {
//   videoFile: File | null;
//   initialClips?: AudioClip[];
// }

// interface UseTimelineEditorReturn {
//   state: TimelineState;
//   tracks: TimelineTrack[];
//   addClipToTrack: (clip: AudioClip, trackId: string, position?: number) => void;
//   removeClip: (clipId: string, trackId: string) => void;
//   splitClip: (clipId: string, trackId: string, position: number) => void;
//   trimClipStart: (clipId: string, trackId: string, newTrimStart: number) => void;
//   trimClipEnd: (clipId: string, trackId: string, newTrimEnd: number) => void;
//   setClipVolume: (clipId: string, trackId: string, volume: number) => void;
//   toggleClipMute: (clipId: string, trackId: string) => void;
//   setTrackVolume: (trackId: string, volume: number) => void;
//   toggleTrackMute: (trackId: string) => void;
//   toggleTrackLock: (trackId: string) => void;
//   addTrack: () => void;
//   removeTrack: (trackId: string) => void;
//   moveClip: (clipId: string, fromTrackId: string, toTrackId: string, newPosition: number) => void;
//   setZoom: (zoom: number) => void;
//   setPlayheadPosition: (position: number) => void;
//   selectClip: (clipId: string | null, trackId: string | null) => void;
//   setVideoAudioVolume: (volume: number) => void;
//   toggleVideoAudioMute: () => void;
//   getClipsAtTime: (time: number) => { track: TimelineTrack; clip: TimelineClip }[];
//   totalDuration: number;
// }

// export const useTimelineEditor = ({
//   videoFile,
//   initialClips = [],
// }: UseTimelineEditorProps): UseTimelineEditorReturn => {
//   // Initialize with video audio track and one audio track
//   const [tracks, setTracks] = useState<TimelineTrack[]>(() => [
//     {
//       id: 'video-audio',
//       name: 'Video Audio',
//       type: 'video-audio',
//       clips: [],
//       volume: 1,
//       isMuted: false,
//       isLocked: false,
//       height: DEFAULT_TRACK_HEIGHT,
//       color: TRACK_COLORS.videoAudio,
//     },
//     {
//       id: 'audio-1',
//       name: 'Audio 1',
//       type: 'audio',
//       clips: [],
//       volume: 1,
//       isMuted: false,
//       isLocked: false,
//       height: DEFAULT_TRACK_HEIGHT,
//       color: TRACK_COLORS.audio1,
//     },
//   ]);

//   const [state, setState] = useState<TimelineState>({
//     tracks: [],
//     currentTime: 0,
//     duration: 0,
//     zoom: PIXELS_PER_SECOND,
//     scrollPosition: 0,
//     selectedClipId: null,
//     selectedTrackId: null,
//     playheadPosition: 0,
//     isPlaying: false,
//     snapToGrid: true,
//     gridSize: 1,
//   });

//   const trackCounter = useRef(2);

//   // Calculate total duration based on all clips
//   const totalDuration = tracks.reduce((maxDuration, track) => {
//     const trackEnd = track.clips.reduce((max, clip) => {
//       return Math.max(max, clip.startTime + clip.duration);
//     }, 0);
//     return Math.max(maxDuration, trackEnd);
//   }, 0);

//   // Convert AudioClip to TimelineClip
//   const audioClipToTimelineClip = useCallback(
//     (clip: AudioClip, position: number = 0, trackColor: string): TimelineClip => {
//       return {
//         id: `timeline-${clip.id}-${Date.now()}`,
//         name: clip.name,
//         originalDuration: clip.duration,
//         duration: clip.duration,
//         startTime: position,
//         trimStart: 0,
//         trimEnd: 0,
//         volume: 1,
//         waveformData: clip.waveformData,
//         audioUrl: clip.audioUrl,
//         isMuted: false,
//         color: trackColor,
//       };
//     },
//     []
//   );

//   const addClipToTrack = useCallback(
//     (clip: AudioClip, trackId: string, position?: number) => {
//       setTracks((prev) => {
//         return prev.map((track) => {
//           if (track.id !== trackId || track.isLocked) return track;

//           // Calculate position at end of track if not specified
//           const lastClipEnd = track.clips.reduce((max, c) => {
//             return Math.max(max, c.startTime + c.duration);
//           }, 0);
//           const clipPosition = position ?? lastClipEnd;

//           const newClip = audioClipToTimelineClip(clip, clipPosition, track.color);

//           return {
//             ...track,
//             clips: [...track.clips, newClip].sort((a, b) => a.startTime - b.startTime),
//           };
//         });
//       });
//     },
//     [audioClipToTimelineClip]
//   );

//   const removeClip = useCallback((clipId: string, trackId: string) => {
//     setTracks((prev) =>
//       prev.map((track) => {
//         if (track.id !== trackId || track.isLocked) return track;
//         return {
//           ...track,
//           clips: track.clips.filter((c) => c.id !== clipId),
//         };
//       })
//     );
//   }, []);

//   const splitClip = useCallback((clipId: string, trackId: string, position: number) => {
//     setTracks((prev) =>
//       prev.map((track) => {
//         if (track.id !== trackId || track.isLocked) return track;

//         const clipIndex = track.clips.findIndex((c) => c.id === clipId);
//         if (clipIndex === -1) return track;

//         const clip = track.clips[clipIndex];
//         const splitPoint = position - clip.startTime;

//         // Validate split point
//         if (splitPoint <= MIN_CLIP_DURATION || splitPoint >= clip.duration - MIN_CLIP_DURATION) {
//           return track;
//         }

//         // Create two clips from the split
//         const firstClip: TimelineClip = {
//           ...clip,
//           id: `${clip.id}-a`,
//           duration: splitPoint,
//           trimEnd: clip.originalDuration - (clip.trimStart + splitPoint),
//         };

//         const secondClip: TimelineClip = {
//           ...clip,
//           id: `${clip.id}-b`,
//           startTime: position,
//           duration: clip.duration - splitPoint,
//           trimStart: clip.trimStart + splitPoint,
//         };

//         const newClips = [...track.clips];
//         newClips.splice(clipIndex, 1, firstClip, secondClip);

//         return {
//           ...track,
//           clips: newClips.sort((a, b) => a.startTime - b.startTime),
//         };
//       })
//     );
//   }, []);

//   const trimClipStart = useCallback((clipId: string, trackId: string, newTrimStart: number) => {
//     setTracks((prev) =>
//       prev.map((track) => {
//         if (track.id !== trackId || track.isLocked) return track;

//         return {
//           ...track,
//           clips: track.clips.map((clip) => {
//             if (clip.id !== clipId) return clip;

//             const maxTrim = clip.originalDuration - clip.trimEnd - MIN_CLIP_DURATION;
//             const clampedTrim = Math.max(0, Math.min(newTrimStart, maxTrim));
//             const trimDelta = clampedTrim - clip.trimStart;

//             return {
//               ...clip,
//               trimStart: clampedTrim,
//               startTime: clip.startTime + trimDelta,
//               duration: clip.originalDuration - clampedTrim - clip.trimEnd,
//             };
//           }),
//         };
//       })
//     );
//   }, []);

//   const trimClipEnd = useCallback((clipId: string, trackId: string, newTrimEnd: number) => {
//     setTracks((prev) =>
//       prev.map((track) => {
//         if (track.id !== trackId || track.isLocked) return track;

//         return {
//           ...track,
//           clips: track.clips.map((clip) => {
//             if (clip.id !== clipId) return clip;

//             const maxTrim = clip.originalDuration - clip.trimStart - MIN_CLIP_DURATION;
//             const clampedTrim = Math.max(0, Math.min(newTrimEnd, maxTrim));

//             return {
//               ...clip,
//               trimEnd: clampedTrim,
//               duration: clip.originalDuration - clip.trimStart - clampedTrim,
//             };
//           }),
//         };
//       })
//     );
//   }, []);

//   const setClipVolume = useCallback((clipId: string, trackId: string, volume: number) => {
//     setTracks((prev) =>
//       prev.map((track) => {
//         if (track.id !== trackId) return track;
//         return {
//           ...track,
//           clips: track.clips.map((clip) =>
//             clip.id === clipId ? { ...clip, volume: Math.max(0, Math.min(1, volume)) } : clip
//           ),
//         };
//       })
//     );
//   }, []);

//   const toggleClipMute = useCallback((clipId: string, trackId: string) => {
//     setTracks((prev) =>
//       prev.map((track) => {
//         if (track.id !== trackId) return track;
//         return {
//           ...track,
//           clips: track.clips.map((clip) =>
//             clip.id === clipId ? { ...clip, isMuted: !clip.isMuted } : clip
//           ),
//         };
//       })
//     );
//   }, []);

//   const setTrackVolume = useCallback((trackId: string, volume: number) => {
//     setTracks((prev) =>
//       prev.map((track) =>
//         track.id === trackId
//           ? { ...track, volume: Math.max(0, Math.min(1, volume)) }
//           : track
//       )
//     );
//   }, []);

//   const toggleTrackMute = useCallback((trackId: string) => {
//     setTracks((prev) =>
//       prev.map((track) =>
//         track.id === trackId ? { ...track, isMuted: !track.isMuted } : track
//       )
//     );
//   }, []);

//   const toggleTrackLock = useCallback((trackId: string) => {
//     setTracks((prev) =>
//       prev.map((track) =>
//         track.id === trackId ? { ...track, isLocked: !track.isLocked } : track
//       )
//     );
//   }, []);

//   const addTrack = useCallback(() => {
//     trackCounter.current += 1;
//     const colors = [TRACK_COLORS.audio2, TRACK_COLORS.audio3, TRACK_COLORS.audio4];
//     const colorIndex = (trackCounter.current - 2) % colors.length;

//     setTracks((prev) => [
//       ...prev,
//       {
//         id: `audio-${trackCounter.current}`,
//         name: `Audio ${trackCounter.current}`,
//         type: 'audio',
//         clips: [],
//         volume: 1,
//         isMuted: false,
//         isLocked: false,
//         height: DEFAULT_TRACK_HEIGHT,
//         color: colors[colorIndex],
//       },
//     ]);
//   }, []);

//   const removeTrack = useCallback((trackId: string) => {
//     setTracks((prev) => prev.filter((track) => track.id !== trackId && track.type !== 'video-audio'));
//   }, []);

//   const moveClip = useCallback(
//     (clipId: string, fromTrackId: string, toTrackId: string, newPosition: number) => {
//       setTracks((prev) => {
//         let clipToMove: TimelineClip | null = null;

//         // Find and remove clip from source track
//         const tracksWithoutClip = prev.map((track) => {
//           if (track.id === fromTrackId) {
//             const clip = track.clips.find((c) => c.id === clipId);
//             if (clip) {
//               clipToMove = { ...clip, startTime: Math.max(0, newPosition) };
//             }
//             return {
//               ...track,
//               clips: track.clips.filter((c) => c.id !== clipId),
//             };
//           }
//           return track;
//         });

//         if (!clipToMove) return prev;

//         // Add clip to destination track
//         return tracksWithoutClip.map((track) => {
//           if (track.id === toTrackId && !track.isLocked) {
//             return {
//               ...track,
//               clips: [...track.clips, clipToMove!].sort((a, b) => a.startTime - b.startTime),
//             };
//           }
//           return track;
//         });
//       });
//     },
//     []
//   );

//   const setZoom = useCallback((zoom: number) => {
//     setState((prev) => ({
//       ...prev,
//       zoom: Math.max(10, Math.min(200, zoom)),
//     }));
//   }, []);

//   const setPlayheadPosition = useCallback((position: number) => {
//     setState((prev) => ({
//       ...prev,
//       playheadPosition: Math.max(0, position),
//     }));
//   }, []);

//   const selectClip = useCallback((clipId: string | null, trackId: string | null) => {
//     setState((prev) => ({
//       ...prev,
//       selectedClipId: clipId,
//       selectedTrackId: trackId,
//     }));
//   }, []);

//   const setVideoAudioVolume = useCallback((volume: number) => {
//     setTrackVolume('video-audio', volume);
//   }, [setTrackVolume]);

//   const toggleVideoAudioMute = useCallback(() => {
//     toggleTrackMute('video-audio');
//   }, [toggleTrackMute]);

//   const getClipsAtTime = useCallback(
//     (time: number) => {
//       const result: { track: TimelineTrack; clip: TimelineClip }[] = [];

//       tracks.forEach((track) => {
//         if (track.isMuted) return;

//         track.clips.forEach((clip) => {
//           if (
//             !clip.isMuted &&
//             time >= clip.startTime &&
//             time < clip.startTime + clip.duration
//           ) {
//             result.push({ track, clip });
//           }
//         });
//       });

//       return result;
//     },
//     [tracks]
//   );

//   return {
//     state,
//     tracks,
//     addClipToTrack,
//     removeClip,
//     splitClip,
//     trimClipStart,
//     trimClipEnd,
//     setClipVolume,
//     toggleClipMute,
//     setTrackVolume,
//     toggleTrackMute,
//     toggleTrackLock,
//     addTrack,
//     removeTrack,
//     moveClip,
//     setZoom,
//     setPlayheadPosition,
//     selectClip,
//     setVideoAudioVolume,
//     toggleVideoAudioMute,
//     getClipsAtTime,
//     totalDuration,
//   };
// };
