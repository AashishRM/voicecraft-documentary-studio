// import React, { useState } from 'react';
// import { DndContext, DragEndEvent, DragOverlay, DragStartEvent } from '@dnd-kit/core';
// import { formatDuration } from '@/lib/timeUtils';
// import { LeftSidebar } from './LeftSidebar';
// import { RightSidebar } from './RightSidebar';
// import { MainArea } from './MainArea';

// export interface AudioClip {
//   id: string;
//   name: string;
//   duration: number;
//   waveformData: number[];
//   audioUrl?: string;
// }

// // Mock data for audio clips
// const mockAudioClips: AudioClip[] = [
//   {
//     id: '1',
//     name: 'Background Music Sample',
//     duration: 15.5,
//     waveformData: [0.2, 0.4, 0.8, 0.6, 0.3, 0.7, 0.5, 0.9, 0.4, 0.2]
//   },

// ];

// const mockGeneratedClips = [
//   { id: '1', name: 'Introduction', duration: 15.5, status: 'Ready' },
//   { id: '2', name: 'Chapter 1', duration: 32.1, status: 'Processing' },
//   { id: '3', name: 'Conclusion', duration: 12.3, status: 'Ready' }
// ];

// export const DocumentaryStudio: React.FC = () => {
//   const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
//   const [rightSidebarOpen, setRightSidebarOpen] = useState(true);
//   const [timelineClips, setTimelineClips] = useState<AudioClip[]>([]);
//   const [draggedClip, setDraggedClip] = useState<AudioClip | null>(null);
//   const [selectedVideo, setSelectedVideo] = useState<File | null>(null);
//   const [uploadedAudioClips, setUploadedAudioClips] = useState<AudioClip[]>([]);
//   const [generatedClips, setGeneratedClips] = useState(mockGeneratedClips);

//   const allAudioClips = [...mockAudioClips, ...uploadedAudioClips];

//   const handleDragStart = (event: DragStartEvent) => {
//     const clipId = event.active.id as string;

//     // Check if it's a generated clip
//     if (clipId.startsWith('generated-')) {
//       const actualId = clipId.replace('generated-', '');
//       const generatedClip = generatedClips.find(c => c.id === actualId);
//       if (generatedClip) {
//         // Convert generated clip to audio clip format
//         const audioClip: AudioClip = {
//           id: generatedClip.id,
//           name: generatedClip.name,
//           duration: generatedClip.duration,
//           waveformData: Array(10).fill(0).map(() => Math.random())
//         };
//         setDraggedClip(audioClip);
//       }
//     } else {
//       // Regular audio clip
//       const clip = allAudioClips.find(c => c.id === clipId);
//       if (clip) {
//         setDraggedClip(clip);
//       }
//     }
//   };

//   const handleDragEnd = (event: DragEndEvent) => {
//     setDraggedClip(null);

//     if (event.over && event.over.id === 'timeline') {
//       const clipId = event.active.id as string;
//       let clipToAdd: AudioClip | null = null;

//       // Check if it's a generated clip
//       if (clipId.startsWith('generated-')) {
//         const actualId = clipId.replace('generated-', '');
//         const generatedClip = generatedClips.find(c => c.id === actualId);
//         if (generatedClip) {
//           clipToAdd = {
//             id: generatedClip.id,
//             name: generatedClip.name,
//             duration: generatedClip.duration,
//             waveformData: Array(10).fill(0).map(() => Math.random())
//           };
//         }
//       } else {
//         // Regular audio clip
//         clipToAdd = allAudioClips.find(c => c.id === clipId) || null;
//       }

//       if (clipToAdd && !timelineClips.find(c => c.id === clipToAdd!.id)) {
//         setTimelineClips(prev => [...prev, clipToAdd!]);
//       }
//     }
//   };

//   const handleAudioUpload = async (files: FileList) => {
//     const newClips: AudioClip[] = [];

//     for (const file of Array.from(files)) {
//       if (file.type.startsWith('audio/')) {
//         // Get real audio duration
//         const duration = await getAudioDuration(file);

//         const newClip: AudioClip = {
//           id: `uploaded-${Date.now()}-${Math.random()}`,
//           name: file.name.replace(/\.[^/.]+$/, ''),
//           duration: duration,
//           waveformData: Array(10).fill(0).map(() => Math.random()),
//           audioUrl: URL.createObjectURL(file)
//         };
//         newClips.push(newClip);
//       }
//     }

//     setUploadedAudioClips(prev => [...prev, ...newClips]);
//   };

//   const getAudioDuration = (file: File): Promise<number> => {
//     return new Promise((resolve) => {
//       const audio = new Audio();
//       audio.addEventListener('loadedmetadata', () => {
//         resolve(audio.duration);
//       });
//       audio.addEventListener('error', () => {
//         resolve(0); // Fallback if audio can't be loaded
//       });
//       audio.src = URL.createObjectURL(file);
//     });
//   };

//   return (
//     <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
//       <div className="flex h-screen bg-background">
//         {/* Left Sidebar */}
//         <div className={`transition-all duration-300 ${leftSidebarOpen ? 'w-80' : 'w-0'} overflow-hidden`}>
//           <LeftSidebar
//             isOpen={leftSidebarOpen}
//             onToggle={() => setLeftSidebarOpen(!leftSidebarOpen)}
//             selectedVideo={selectedVideo}
//             generatedClips={generatedClips}
//             onDeleteGeneratedClip={(clipId) => setGeneratedClips(prev => prev.filter(c => c.id !== clipId))}
//           />
//         </div>

//         {/* Main Area */}
//         <div className="flex-1 flex flex-col min-w-0">
//           <MainArea
//             leftSidebarOpen={leftSidebarOpen}
//             rightSidebarOpen={rightSidebarOpen}
//             onToggleLeftSidebar={() => setLeftSidebarOpen(!leftSidebarOpen)}
//             onToggleRightSidebar={() => setRightSidebarOpen(!rightSidebarOpen)}
//             timelineClips={timelineClips}
//             onRemoveClip={(clipId) => setTimelineClips(prev => prev.filter(c => c.id !== clipId))}
//             selectedVideo={selectedVideo}
//             onVideoSelect={setSelectedVideo}
//           />
//         </div>

//         {/* Right Sidebar */}
//         <div className={`transition-all duration-300 ${rightSidebarOpen ? 'w-80' : 'w-0'} overflow-hidden`}>
//           <RightSidebar
//             isOpen={rightSidebarOpen}
//             onToggle={() => setRightSidebarOpen(!rightSidebarOpen)}
//             audioClips={allAudioClips}
//             uploadedAudioClips={uploadedAudioClips}
//             onAudioUpload={handleAudioUpload}
//             onDeleteUploadedClip={(clipId) => setUploadedAudioClips(prev => prev.filter(c => c.id !== clipId))}
//           />
//         </div>

//         {/* Drag Overlay */}
//         <DragOverlay>
//           {draggedClip && (
//             <div className="bg-card border border-border rounded-lg p-3 shadow-lg opacity-90">
//               <div className="text-sm font-medium">{draggedClip.name}</div>
//               <div className="text-xs text-muted-foreground">{formatDuration(draggedClip.duration)}</div>
//             </div>
//           )}
//         </DragOverlay>
//       </div>
//     </DndContext>
//   );
// };
