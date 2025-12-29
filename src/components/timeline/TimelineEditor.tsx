// import React, { useRef, useEffect, useCallback, useState } from 'react';
// import { Play, Pause, RotateCcw, ZoomIn, ZoomOut, Plus, Volume2, VolumeX, Download, Loader2 } from 'lucide-react';
// import { TimelineTrack, PIXELS_PER_SECOND } from '@/types/timeline';
// import { TimelineTrackComponent } from './TimelineTrackComponent';
// import { Button } from '@/components/ui/button';
// import { Slider } from '@/components/ui/slider';
// import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
// import { formatDuration } from '@/lib/timeUtils';
// import { cn } from '@/lib/utils';

// interface TimelineEditorProps {
//   tracks: TimelineTrack[];
//   zoom: number;
//   currentTime: number;
//   totalDuration: number;
//   isPlaying: boolean;
//   selectedClipId: string | null;
//   masterVolume: number;
//   isExporting: boolean;
//   exportProgress: number;
//   onZoomChange: (zoom: number) => void;
//   onPlayPause: () => void;
//   onReset: () => void;
//   onSeek: (time: number) => void;
//   onSelectClip: (clipId: string | null, trackId: string | null) => void;
//   onClipVolumeChange: (clipId: string, trackId: string, volume: number) => void;
//   onClipMuteToggle: (clipId: string, trackId: string) => void;
//   onClipSplit: (clipId: string, trackId: string, position: number) => void;
//   onClipTrimStart: (clipId: string, trackId: string, newTrimStart: number) => void;
//   onClipTrimEnd: (clipId: string, trackId: string, newTrimEnd: number) => void;
//   onClipRemove: (clipId: string, trackId: string) => void;
//   onClipMove: (clipId: string, trackId: string, newPosition: number) => void;
//   onTrackVolumeChange: (trackId: string, volume: number) => void;
//   onTrackMuteToggle: (trackId: string) => void;
//   onTrackLockToggle: (trackId: string) => void;
//   onTrackRemove: (trackId: string) => void;
//   onAddTrack: () => void;
//   onMasterVolumeChange: (volume: number) => void;
//   onExport: () => void;
//   onCancelExport: () => void;
//   hasPlayableClips: boolean;
// }

// export const TimelineEditor: React.FC<TimelineEditorProps> = ({
//   tracks,
//   zoom,
//   currentTime,
//   totalDuration,
//   isPlaying,
//   selectedClipId,
//   masterVolume,
//   isExporting,
//   exportProgress,
//   onZoomChange,
//   onPlayPause,
//   onReset,
//   onSeek,
//   onSelectClip,
//   onClipVolumeChange,
//   onClipMuteToggle,
//   onClipSplit,
//   onClipTrimStart,
//   onClipTrimEnd,
//   onClipRemove,
//   onClipMove,
//   onTrackVolumeChange,
//   onTrackMuteToggle,
//   onTrackLockToggle,
//   onTrackRemove,
//   onAddTrack,
//   onMasterVolumeChange,
//   onExport,
//   onCancelExport,
//   hasPlayableClips,
// }) => {
//   const timelineRef = useRef<HTMLDivElement>(null);
//   const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);

//   const timelineWidth = Math.max(totalDuration * zoom + 200, 800);

//   // Generate time markers
//   const timeMarkers = [];
//   const markerInterval = zoom < 30 ? 5 : zoom < 60 ? 2 : 1;
//   for (let t = 0; t <= totalDuration + 10; t += markerInterval) {
//     timeMarkers.push(t);
//   }

//   const handleTimelineClick = useCallback(
//     (e: React.MouseEvent) => {
//       if (!timelineRef.current) return;
//       const rect = timelineRef.current.getBoundingClientRect();
//       const scrollLeft = timelineRef.current.parentElement?.scrollLeft || 0;
//       const x = e.clientX - rect.left + scrollLeft;
//       const time = x / zoom;
//       onSeek(Math.max(0, time));
//     },
//     [zoom, onSeek]
//   );

//   const handlePlayheadDrag = useCallback(
//     (e: React.MouseEvent) => {
//       e.preventDefault();
//       setIsDraggingPlayhead(true);

//       const handleMouseMove = (e: MouseEvent) => {
//         if (!timelineRef.current) return;
//         const rect = timelineRef.current.getBoundingClientRect();
//         const scrollLeft = timelineRef.current.parentElement?.scrollLeft || 0;
//         const x = e.clientX - rect.left + scrollLeft;
//         const time = Math.max(0, x / zoom);
//         onSeek(time);
//       };

//       const handleMouseUp = () => {
//         setIsDraggingPlayhead(false);
//         document.removeEventListener('mousemove', handleMouseMove);
//         document.removeEventListener('mouseup', handleMouseUp);
//       };

//       document.addEventListener('mousemove', handleMouseMove);
//       document.addEventListener('mouseup', handleMouseUp);
//     },
//     [zoom, onSeek]
//   );

//   return (
//     <div className="flex flex-col bg-card rounded-lg border border-border overflow-hidden">
//       {/* Toolbar */}
//       <div className="flex items-center justify-between p-3 border-b border-border bg-muted/30">
//         <div className="flex items-center gap-2">
//           {/* Playback controls */}
//           <Button
//             size="sm"
//             onClick={onPlayPause}
//             disabled={!hasPlayableClips}
//             className="h-8 w-8 p-0"
//           >
//             {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
//           </Button>
//           <Button size="sm" variant="outline" onClick={onReset} className="h-8 w-8 p-0">
//             <RotateCcw className="h-4 w-4" />
//           </Button>

//           {/* Time display */}
//           <div className="px-2 py-1 bg-background rounded text-sm font-mono min-w-[100px] text-center">
//             {formatDuration(currentTime)} / {formatDuration(totalDuration || 0)}
//           </div>

//           {/* Master volume */}
//           <div className="flex items-center gap-2 ml-4">
//             <Button
//               size="sm"
//               variant="ghost"
//               onClick={() => onMasterVolumeChange(masterVolume > 0 ? 0 : 1)}
//               className="h-8 w-8 p-0"
//             >
//               {masterVolume === 0 ? (
//                 <VolumeX className="h-4 w-4" />
//               ) : (
//                 <Volume2 className="h-4 w-4" />
//               )}
//             </Button>
//             <Slider
//               value={[masterVolume * 100]}
//               onValueChange={(v) => onMasterVolumeChange(v[0] / 100)}
//               max={100}
//               step={1}
//               className="w-20"
//             />
//           </div>
//         </div>

//         <div className="flex items-center gap-2">
//           {/* Export button */}
//           <Button
//             size="sm"
//             variant={isExporting ? 'outline' : 'default'}
//             onClick={isExporting ? onCancelExport : onExport}
//             disabled={!hasPlayableClips}
//           >
//             {isExporting ? (
//               <>
//                 <Loader2 className="h-4 w-4 mr-2 animate-spin" />
//                 {exportProgress}%
//               </>
//             ) : (
//               <>
//                 <Download className="h-4 w-4 mr-2" />
//                 Export
//               </>
//             )}
//           </Button>

//           {/* Zoom controls */}
//           <div className="flex items-center gap-1 border-l border-border pl-2 ml-2">
//             <Button
//               size="sm"
//               variant="outline"
//               onClick={() => onZoomChange(Math.max(10, zoom - 10))}
//               className="h-8 w-8 p-0"
//             >
//               <ZoomOut className="h-4 w-4" />
//             </Button>
//             <span className="text-xs font-medium w-10 text-center">
//               {Math.round(zoom / PIXELS_PER_SECOND * 100)}%
//             </span>
//             <Button
//               size="sm"
//               variant="outline"
//               onClick={() => onZoomChange(Math.min(200, zoom + 10))}
//               className="h-8 w-8 p-0"
//             >
//               <ZoomIn className="h-4 w-4" />
//             </Button>
//           </div>

//           {/* Add track */}
//           <Button size="sm" variant="outline" onClick={onAddTrack} className="gap-1">
//             <Plus className="h-4 w-4" />
//             Track
//           </Button>
//         </div>
//       </div>

//       {/* Timeline content */}
//       <ScrollArea className="flex-1">
//         <div className="min-h-[200px]">
//           {/* Time ruler */}
//           <div
//             className="h-6 border-b border-border bg-muted/20 flex items-end relative"
//             style={{ marginLeft: '192px' }}
//           >
//             <div
//               className="relative"
//               style={{ width: `${timelineWidth}px` }}
//               onClick={handleTimelineClick}
//             >
//               {timeMarkers.map((t) => (
//                 <div
//                   key={t}
//                   className="absolute bottom-0 flex flex-col items-center"
//                   style={{ left: `${t * zoom}px` }}
//                 >
//                   <span className="text-[10px] text-muted-foreground mb-0.5">
//                     {formatDuration(t)}
//                   </span>
//                   <div className="w-px h-2 bg-border" />
//                 </div>
//               ))}

//               {/* Playhead on ruler */}
//               <div
//                 className="absolute bottom-0 w-3 h-3 -ml-1.5 cursor-ew-resize z-20"
//                 style={{ left: `${currentTime * zoom}px` }}
//                 onMouseDown={handlePlayheadDrag}
//               >
//                 <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-primary" />
//               </div>
//             </div>
//           </div>

//           {/* Tracks container */}
//           <div ref={timelineRef} className="relative" onClick={() => onSelectClip(null, null)}>
//             {/* Playhead line */}
//             <div
//               className={cn(
//                 'absolute top-0 bottom-0 w-0.5 bg-primary z-10 pointer-events-none',
//                 isDraggingPlayhead && 'w-1'
//               )}
//               style={{ left: `calc(192px + ${currentTime * zoom}px)` }}
//             />

//             {/* Tracks */}
//             {tracks.map((track) => (
//               <TimelineTrackComponent
//                 key={track.id}
//                 track={track}
//                 zoom={zoom}
//                 selectedClipId={selectedClipId}
//                 currentTime={currentTime}
//                 isPlaying={isPlaying}
//                 onSelectClip={(clipId) => onSelectClip(clipId, track.id)}
//                 onClipVolumeChange={(clipId, v) => onClipVolumeChange(clipId, track.id, v)}
//                 onClipMuteToggle={(clipId) => onClipMuteToggle(clipId, track.id)}
//                 onClipSplit={(clipId, pos) => onClipSplit(clipId, track.id, pos)}
//                 onClipTrimStart={(clipId, v) => onClipTrimStart(clipId, track.id, v)}
//                 onClipTrimEnd={(clipId, v) => onClipTrimEnd(clipId, track.id, v)}
//                 onClipRemove={(clipId) => onClipRemove(clipId, track.id)}
//                 onClipMove={(clipId, pos) => onClipMove(clipId, track.id, pos)}
//                 onTrackVolumeChange={(v) => onTrackVolumeChange(track.id, v)}
//                 onTrackMuteToggle={() => onTrackMuteToggle(track.id)}
//                 onTrackLockToggle={() => onTrackLockToggle(track.id)}
//                 onTrackRemove={track.type !== 'video-audio' ? () => onTrackRemove(track.id) : undefined}
//                 totalDuration={totalDuration}
//               />
//             ))}
//           </div>
//         </div>
//         <ScrollBar orientation="horizontal" />
//       </ScrollArea>
//     </div>
//   );
// };
