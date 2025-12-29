// import React from 'react';
// import { Volume2, VolumeX, Lock, Unlock, Trash2, Plus } from 'lucide-react';
// import { useDroppable } from '@dnd-kit/core';
// import { TimelineTrack } from '@/types/timeline';
// import { TimelineClipComponent } from './TimelineClipComponent';
// import { Button } from '@/components/ui/button';
// import { Slider } from '@/components/ui/slider';
// import { cn } from '@/lib/utils';

// interface TimelineTrackComponentProps {
//   track: TimelineTrack;
//   zoom: number;
//   selectedClipId: string | null;
//   currentTime: number;
//   isPlaying: boolean;
//   onSelectClip: (clipId: string) => void;
//   onClipVolumeChange: (clipId: string, volume: number) => void;
//   onClipMuteToggle: (clipId: string) => void;
//   onClipSplit: (clipId: string, position: number) => void;
//   onClipTrimStart: (clipId: string, newTrimStart: number) => void;
//   onClipTrimEnd: (clipId: string, newTrimEnd: number) => void;
//   onClipRemove: (clipId: string) => void;
//   onClipMove: (clipId: string, newPosition: number) => void;
//   onTrackVolumeChange: (volume: number) => void;
//   onTrackMuteToggle: () => void;
//   onTrackLockToggle: () => void;
//   onTrackRemove?: () => void;
//   totalDuration: number;
// }

// export const TimelineTrackComponent: React.FC<TimelineTrackComponentProps> = ({
//   track,
//   zoom,
//   selectedClipId,
//   currentTime,
//   isPlaying,
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
//   totalDuration,
// }) => {
//   const { setNodeRef, isOver } = useDroppable({
//     id: `track-${track.id}`,
//     data: { trackId: track.id },
//   });

//   const trackWidth = Math.max(totalDuration * zoom + 200, 800);

//   return (
//     <div className="flex border-b border-border">
//       {/* Track header */}
//       <div
//         className={cn(
//           'w-48 flex-shrink-0 p-2 border-r border-border flex flex-col gap-2',
//           track.isLocked && 'opacity-60'
//         )}
//         style={{ backgroundColor: `${track.color}15` }}
//       >
//         <div className="flex items-center justify-between">
//           <span className="text-sm font-medium truncate">{track.name}</span>
//           <div className="flex items-center gap-0.5">
//             <Button
//               size="sm"
//               variant="ghost"
//               className="h-6 w-6 p-0"
//               onClick={onTrackMuteToggle}
//             >
//               {track.isMuted ? (
//                 <VolumeX className="h-3.5 w-3.5 text-muted-foreground" />
//               ) : (
//                 <Volume2 className="h-3.5 w-3.5" />
//               )}
//             </Button>
//             <Button
//               size="sm"
//               variant="ghost"
//               className="h-6 w-6 p-0"
//               onClick={onTrackLockToggle}
//             >
//               {track.isLocked ? (
//                 <Lock className="h-3.5 w-3.5 text-muted-foreground" />
//               ) : (
//                 <Unlock className="h-3.5 w-3.5" />
//               )}
//             </Button>
//             {track.type !== 'video-audio' && onTrackRemove && (
//               <Button
//                 size="sm"
//                 variant="ghost"
//                 className="h-6 w-6 p-0 hover:text-destructive"
//                 onClick={onTrackRemove}
//               >
//                 <Trash2 className="h-3.5 w-3.5" />
//               </Button>
//             )}
//           </div>
//         </div>

//         {/* Track volume */}
//         <div className="flex items-center gap-2">
//           <span className="text-[10px] text-muted-foreground w-6">
//             {Math.round(track.volume * 100)}%
//           </span>
//           <Slider
//             value={[track.volume * 100]}
//             onValueChange={(v) => onTrackVolumeChange(v[0] / 100)}
//             max={100}
//             step={1}
//             className="flex-1"
//             disabled={track.isLocked}
//           />
//         </div>
//       </div>

//       {/* Track content */}
//       <div
//         ref={setNodeRef}
//         className={cn(
//           'flex-1 relative overflow-hidden',
//           isOver && 'bg-primary/10',
//           track.isLocked && 'pointer-events-none'
//         )}
//         style={{
//           height: `${track.height}px`,
//           minWidth: `${trackWidth}px`,
//         }}
//       >
//         {/* Background grid */}
//         <div className="absolute inset-0 pointer-events-none">
//           {Array.from({ length: Math.ceil(trackWidth / zoom) }).map((_, i) => (
//             <div
//               key={i}
//               className="absolute top-0 bottom-0 border-l border-border/30"
//               style={{ left: `${i * zoom}px` }}
//             />
//           ))}
//         </div>

//         {/* Clips */}
//         {track.clips.map((clip) => (
//           <TimelineClipComponent
//             key={clip.id}
//             clip={clip}
//             track={track}
//             zoom={zoom}
//             isSelected={selectedClipId === clip.id}
//             isPlaying={isPlaying}
//             currentTime={currentTime}
//             onSelect={() => onSelectClip(clip.id)}
//             onVolumeChange={(v) => onClipVolumeChange(clip.id, v)}
//             onMuteToggle={() => onClipMuteToggle(clip.id)}
//             onSplit={(pos) => onClipSplit(clip.id, pos)}
//             onTrimStart={(v) => onClipTrimStart(clip.id, v)}
//             onTrimEnd={(v) => onClipTrimEnd(clip.id, v)}
//             onRemove={() => onClipRemove(clip.id)}
//             onMove={(pos) => onClipMove(clip.id, pos)}
//           />
//         ))}

//         {/* Empty state */}
//         {track.clips.length === 0 && (
//           <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/50">
//             <span className="text-xs">Drop audio clips here</span>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };
