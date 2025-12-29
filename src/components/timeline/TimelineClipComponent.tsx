// import React, { useState, useRef, useCallback } from 'react';
// import { Volume2, VolumeX, Scissors, GripVertical } from 'lucide-react';
// import { TimelineClip, TimelineTrack } from '@/types/timeline';
// import { Slider } from '@/components/ui/slider';
// import { Button } from '@/components/ui/button';
// import {
//   Popover,
//   PopoverContent,
//   PopoverTrigger,
// } from '@/components/ui/popover';
// import { formatDuration } from '@/lib/timeUtils';
// import { cn } from '@/lib/utils';

// interface TimelineClipComponentProps {
//   clip: TimelineClip;
//   track: TimelineTrack;
//   zoom: number;
//   isSelected: boolean;
//   isPlaying: boolean;
//   currentTime: number;
//   onSelect: () => void;
//   onVolumeChange: (volume: number) => void;
//   onMuteToggle: () => void;
//   onSplit: (position: number) => void;
//   onTrimStart: (newTrimStart: number) => void;
//   onTrimEnd: (newTrimEnd: number) => void;
//   onRemove: () => void;
//   onMove: (newPosition: number) => void;
// }

// export const TimelineClipComponent: React.FC<TimelineClipComponentProps> = ({
//   clip,
//   track,
//   zoom,
//   isSelected,
//   isPlaying,
//   currentTime,
//   onSelect,
//   onVolumeChange,
//   onMuteToggle,
//   onSplit,
//   onTrimStart,
//   onTrimEnd,
//   onRemove,
//   onMove,
// }) => {
//   const [isDragging, setIsDragging] = useState(false);
//   const [dragType, setDragType] = useState<'move' | 'trim-start' | 'trim-end' | null>(null);
//   const [showVolumePopover, setShowVolumePopover] = useState(false);
//   const clipRef = useRef<HTMLDivElement>(null);
//   const dragStartX = useRef(0);
//   const dragStartValue = useRef(0);

//   const width = clip.duration * zoom;
//   const left = clip.startTime * zoom;

//   // Calculate progress within clip
//   const clipProgress = isPlaying && currentTime >= clip.startTime && currentTime < clip.startTime + clip.duration
//     ? ((currentTime - clip.startTime) / clip.duration) * 100
//     : 0;

//   const handleMouseDown = useCallback(
//     (e: React.MouseEvent, type: 'move' | 'trim-start' | 'trim-end') => {
//       e.stopPropagation();
//       setIsDragging(true);
//       setDragType(type);
//       dragStartX.current = e.clientX;
      
//       if (type === 'move') {
//         dragStartValue.current = clip.startTime;
//       } else if (type === 'trim-start') {
//         dragStartValue.current = clip.trimStart;
//       } else {
//         dragStartValue.current = clip.trimEnd;
//       }

//       const handleMouseMove = (e: MouseEvent) => {
//         const deltaX = e.clientX - dragStartX.current;
//         const deltaTime = deltaX / zoom;

//         if (type === 'move') {
//           onMove(Math.max(0, dragStartValue.current + deltaTime));
//         } else if (type === 'trim-start') {
//           onTrimStart(Math.max(0, dragStartValue.current + deltaTime));
//         } else {
//           onTrimEnd(Math.max(0, dragStartValue.current - deltaTime));
//         }
//       };

//       const handleMouseUp = () => {
//         setIsDragging(false);
//         setDragType(null);
//         document.removeEventListener('mousemove', handleMouseMove);
//         document.removeEventListener('mouseup', handleMouseUp);
//       };

//       document.addEventListener('mousemove', handleMouseMove);
//       document.addEventListener('mouseup', handleMouseUp);
//     },
//     [clip.startTime, clip.trimStart, clip.trimEnd, zoom, onMove, onTrimStart, onTrimEnd]
//   );

//   const handleSplitAtPlayhead = useCallback(() => {
//     if (currentTime > clip.startTime && currentTime < clip.startTime + clip.duration) {
//       onSplit(currentTime);
//     }
//   }, [clip.startTime, clip.duration, currentTime, onSplit]);

//   const handleDoubleClick = useCallback((e: React.MouseEvent) => {
//     e.stopPropagation();
//     const rect = clipRef.current?.getBoundingClientRect();
//     if (!rect) return;
    
//     const clickX = e.clientX - rect.left;
//     const clickTime = clip.startTime + (clickX / zoom);
//     onSplit(clickTime);
//   }, [clip.startTime, zoom, onSplit]);

//   return (
//     <div
//       ref={clipRef}
//       className={cn(
//         'absolute top-1 bottom-1 rounded-md cursor-pointer transition-all group',
//         'border-2 overflow-hidden',
//         isSelected
//           ? 'ring-2 ring-primary ring-offset-1 ring-offset-background border-primary'
//           : 'border-transparent hover:border-primary/50',
//         clip.isMuted && 'opacity-50',
//         isDragging && 'opacity-75 cursor-grabbing'
//       )}
//       style={{
//         left: `${left}px`,
//         width: `${Math.max(width, 20)}px`,
//         backgroundColor: clip.color || track.color,
//       }}
//       onClick={(e) => {
//         e.stopPropagation();
//         onSelect();
//       }}
//       onDoubleClick={handleDoubleClick}
//     >
//       {/* Progress overlay */}
//       {clipProgress > 0 && (
//         <div
//           className="absolute inset-y-0 left-0 bg-foreground/20 pointer-events-none"
//           style={{ width: `${clipProgress}%` }}
//         />
//       )}

//       {/* Trim handles */}
//       <div
//         className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize bg-foreground/20 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-foreground/40"
//         onMouseDown={(e) => handleMouseDown(e, 'trim-start')}
//       />
//       <div
//         className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize bg-foreground/20 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-foreground/40"
//         onMouseDown={(e) => handleMouseDown(e, 'trim-end')}
//       />

//       {/* Clip content */}
//       <div
//         className="absolute inset-0 px-2 py-1 flex flex-col justify-between cursor-grab"
//         onMouseDown={(e) => handleMouseDown(e, 'move')}
//       >
//         {/* Header */}
//         <div className="flex items-center justify-between min-w-0">
//           <div className="flex items-center gap-1 min-w-0 flex-1">
//             <GripVertical className="h-3 w-3 flex-shrink-0 opacity-50" />
//             <span className="text-xs font-medium truncate text-foreground">
//               {clip.name}
//             </span>
//           </div>

//           {/* Controls */}
//           <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
//             {/* Volume control */}
//             <Popover open={showVolumePopover} onOpenChange={setShowVolumePopover}>
//               <PopoverTrigger asChild>
//                 <Button
//                   size="sm"
//                   variant="ghost"
//                   className="h-5 w-5 p-0"
//                   onClick={(e) => e.stopPropagation()}
//                 >
//                   {clip.isMuted || clip.volume === 0 ? (
//                     <VolumeX className="h-3 w-3" />
//                   ) : (
//                     <Volume2 className="h-3 w-3" />
//                   )}
//                 </Button>
//               </PopoverTrigger>
//               <PopoverContent className="w-48 p-3" onClick={(e) => e.stopPropagation()}>
//                 <div className="space-y-3">
//                   <div className="flex items-center justify-between">
//                     <span className="text-xs font-medium">Volume</span>
//                     <span className="text-xs text-muted-foreground">
//                       {Math.round(clip.volume * 100)}%
//                     </span>
//                   </div>
//                   <Slider
//                     value={[clip.volume * 100]}
//                     onValueChange={(v) => onVolumeChange(v[0] / 100)}
//                     max={100}
//                     step={1}
//                   />
//                   <Button
//                     size="sm"
//                     variant="outline"
//                     className="w-full h-7 text-xs"
//                     onClick={onMuteToggle}
//                   >
//                     {clip.isMuted ? 'Unmute' : 'Mute'}
//                   </Button>
//                 </div>
//               </PopoverContent>
//             </Popover>

//             {/* Split button */}
//             <Button
//               size="sm"
//               variant="ghost"
//               className="h-5 w-5 p-0"
//               onClick={(e) => {
//                 e.stopPropagation();
//                 handleSplitAtPlayhead();
//               }}
//               title="Split at playhead"
//             >
//               <Scissors className="h-3 w-3" />
//             </Button>
//           </div>
//         </div>

//         {/* Waveform */}
//         <div className="flex items-end gap-px h-6 pointer-events-none">
//           {clip.waveformData.map((height, i) => (
//             <div
//               key={i}
//               className="flex-1 rounded-sm bg-foreground/60"
//               style={{
//                 height: `${height * 100 * clip.volume}%`,
//                 opacity: clip.isMuted ? 0.3 : 1,
//               }}
//             />
//           ))}
//         </div>

//         {/* Duration label */}
//         <div className="text-[10px] text-foreground/80 truncate">
//           {formatDuration(clip.duration)}
//         </div>
//       </div>
//     </div>
//   );
// };
