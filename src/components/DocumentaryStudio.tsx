import React, { useState } from 'react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent } from '@dnd-kit/core';
import { formatDuration } from '@/lib/timeUtils';
import { getVideoDuration } from '@/lib/videoUtils';
import { LeftSidebar } from './LeftSidebar';
import { RightSidebar } from './RightSidebar';
import { MainArea } from './MainArea';

export interface AudioClip {
  id: string;
  name: string;
  duration: number;
  waveformData: number[];
  audioUrl?: string;
  videoUrl?: string; // Video file URL for video clips
  videoFile?: File; // Video file reference
  trackId?: string; // Track/layer ID for multi-track support
  trackIndex?: number; // Index of the track (0 = video audio, 1+ = additional tracks)
  isVideoAudio?: boolean; // Whether this is the audio from the video file
  isVideo?: boolean; // Whether this is a video clip
  trackVolume?: number; // Volume for this track (0-1, default 1)
}

interface GeneratedClip {
  id: string;
  name: string;
  duration: number;
  status: string;
  audioUrl?: string;
}

// Mock data for audio clips
const mockAudioClips: AudioClip[] = [
  {
    id: '1',
    name: 'Background Music Sample',
    duration: 15.5,
    waveformData: [0.2, 0.4, 0.8, 0.6, 0.3, 0.7, 0.5, 0.9, 0.4, 0.2]
  }
];

export const DocumentaryStudio: React.FC = () => {
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);
  const [timelineClips, setTimelineClips] = useState<AudioClip[]>([]);
  const [draggedClip, setDraggedClip] = useState<AudioClip | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null);
  const [uploadedAudioClips, setUploadedAudioClips] = useState<AudioClip[]>([]);
  const [generatedClips, setGeneratedClips] = useState<GeneratedClip[]>([]);
  const [videoAudioClip, setVideoAudioClip] = useState<AudioClip | null>(null);
  const [selectedVideoFile, setSelectedVideoFile] = useState<File | null>(null);

  const allAudioClips = [...mockAudioClips, ...uploadedAudioClips];

  const handleAddGeneratedClip = (clip: GeneratedClip) => {
    setGeneratedClips(prev => [...prev, clip]);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const clipId = event.active.id as string;

    // Check if it's a video file
    if (clipId.startsWith('video-') && !clipId.startsWith('video-audio-')) {
      // The ID format is: video-${videoFile.name}-${videoFile.size}
      // Extract the size from the end
      const parts = clipId.split('-');
      const sizeStr = parts[parts.length - 1];
      const videoSize = parseInt(sizeStr, 10);
      
      // Find matching video file by size (more reliable than name)
      if (selectedVideo && selectedVideo.size === videoSize) {
        // Create a video clip representation
        const videoClip: AudioClip = {
          id: `video-clip-${Date.now()}`,
          name: selectedVideo.name,
          duration: 0, // Will be set on drop
          waveformData: Array(10).fill(0).map(() => Math.random()),
          videoUrl: URL.createObjectURL(selectedVideo),
          videoFile: selectedVideo,
          isVideo: true,
          trackIndex: 0,
          trackVolume: 1.0
        };
        setDraggedClip(videoClip);
      }
    }
    // Check if it's video audio
    else if (clipId.startsWith('video-audio-')) {
      const actualId = clipId.replace('video-audio-', '');
      if (videoAudioClip && videoAudioClip.id === actualId) {
        setDraggedClip(videoAudioClip);
      }
    }
    // Check if it's a generated clip
    else if (clipId.startsWith('generated-')) {
      const actualId = clipId.replace('generated-', '');
      const generatedClip = generatedClips.find(c => c.id === actualId);
      if (generatedClip) {
        // Convert generated clip to audio clip format
        const audioClip: AudioClip = {
          id: generatedClip.id,
          name: generatedClip.name,
          duration: generatedClip.duration,
          waveformData: Array(10).fill(0).map(() => Math.random()),
          audioUrl: generatedClip.audioUrl
        };
        setDraggedClip(audioClip);
      }
    } else {
      // Regular audio clip
      const clip = allAudioClips.find(c => c.id === clipId);
      if (clip) {
        setDraggedClip(clip);
      }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setDraggedClip(null);

    if (event.over) {
      const clipId = event.active.id as string;
      let clipToAdd: AudioClip | null = null;
      let trackIndex = 0;

      // Determine track index from drop zone
      if (typeof event.over.id === 'string' && event.over.id.startsWith('timeline-track-')) {
        const trackMatch = event.over.id.match(/timeline-track-(\d+)/);
        if (trackMatch) {
          trackIndex = parseInt(trackMatch[1], 10);
        }
      }

      // Check if it's a video file
      if (clipId.startsWith('video-') && !clipId.startsWith('video-audio-')) {
        // The ID format is: video-${videoFile.name}-${videoFile.size}
        // Extract the size from the end
        const parts = clipId.split('-');
        const sizeStr = parts[parts.length - 1];
        const videoSize = parseInt(sizeStr, 10);
        
        // Find matching video file by size (more reliable than name)
        if (selectedVideo && selectedVideo.size === videoSize) {
          // Get video duration
          getVideoDuration(selectedVideo).then((duration) => {
            const videoClip: AudioClip = {
              id: `video-clip-${Date.now()}`,
              name: selectedVideo.name,
              duration: duration,
              waveformData: Array(10).fill(0).map(() => Math.random()),
              videoUrl: URL.createObjectURL(selectedVideo),
              videoFile: selectedVideo,
              isVideo: true,
              trackIndex: trackIndex,
              trackVolume: 1.0
            };
            // Check if this video is already on this track
            const existingOnTrack = timelineClips.find(
              c => c.isVideo && c.videoFile?.size === selectedVideo.size && c.trackIndex === trackIndex
            );
            if (!existingOnTrack) {
              setTimelineClips(prev => [...prev, videoClip]);
            }
          }).catch(() => {
            // Fallback if duration can't be determined
            const videoClip: AudioClip = {
              id: `video-clip-${Date.now()}`,
              name: selectedVideo.name,
              duration: 0,
              waveformData: Array(10).fill(0).map(() => Math.random()),
              videoUrl: URL.createObjectURL(selectedVideo),
              videoFile: selectedVideo,
              isVideo: true,
              trackIndex: trackIndex,
              trackVolume: 1.0
            };
            setTimelineClips(prev => [...prev, videoClip]);
          });
        }
        return;
      }

      // Check if it's video audio
      if (clipId.startsWith('video-audio-')) {
        // Extract the actual clip ID
        const actualId = clipId.replace('video-audio-', '');
        if (videoAudioClip && videoAudioClip.id === actualId) {
          // Create a new clip with track index
          const clipToAdd: AudioClip = {
            ...videoAudioClip,
            id: `${videoAudioClip.id}-${Date.now()}`, // Unique ID for timeline instance
            trackIndex: trackIndex
          };
          // Check if this exact clip (by original ID) is already on this track
          const existingOnTrack = timelineClips.find(
            c => c.id.startsWith(videoAudioClip.id) && c.trackIndex === trackIndex
          );
          if (!existingOnTrack) {
            setTimelineClips(prev => [...prev, clipToAdd]);
          }
        }
        return;
      }
      // Check if it's a generated clip
      else if (clipId.startsWith('generated-')) {
        const actualId = clipId.replace('generated-', '');
        const generatedClip = generatedClips.find(c => c.id === actualId);
        if (generatedClip) {
          clipToAdd = {
            id: generatedClip.id,
            name: generatedClip.name,
            duration: generatedClip.duration,
            waveformData: Array(10).fill(0).map(() => Math.random()),
            audioUrl: generatedClip.audioUrl,
            trackIndex: trackIndex
          };
        }
      } else {
        // Regular audio clip
        const foundClip = allAudioClips.find(c => c.id === clipId);
        if (foundClip) {
          clipToAdd = {
            ...foundClip,
            trackIndex: trackIndex
          };
        }
      }

      if (clipToAdd && !timelineClips.find(c => c.id === clipToAdd!.id)) {
        setTimelineClips(prev => [...prev, clipToAdd!]);
      }
    }
  };

  const handleAudioUpload = async (files: FileList) => {
    const newClips: AudioClip[] = [];

    for (const file of Array.from(files)) {
      if (file.type.startsWith('audio/')) {
        // Get real audio duration
        const duration = await getAudioDuration(file);

        const newClip: AudioClip = {
          id: `uploaded-${Date.now()}-${Math.random()}`,
          name: file.name.replace(/\.[^/.]+$/, ''),
          duration: duration,
          waveformData: Array(10).fill(0).map(() => Math.random()),
          audioUrl: URL.createObjectURL(file)
        };
        newClips.push(newClip);
      }
    }

    setUploadedAudioClips(prev => [...prev, ...newClips]);
  };

  const getAudioDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const audio = new Audio();
      audio.addEventListener('loadedmetadata', () => {
        resolve(audio.duration);
      });
      audio.addEventListener('error', () => {
        resolve(0); // Fallback if audio can't be loaded
      });
      audio.src = URL.createObjectURL(file);
    });
  };

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex h-screen bg-background">
        {/* Left Sidebar */}
        <div className={`transition-all duration-300 ${leftSidebarOpen ? 'w-80' : 'w-0'} overflow-hidden`}>
          <LeftSidebar
            isOpen={leftSidebarOpen}
            onToggle={() => setLeftSidebarOpen(!leftSidebarOpen)}
            selectedVideo={selectedVideo}
            generatedClips={generatedClips}
            onDeleteGeneratedClip={(clipId) => setGeneratedClips(prev => prev.filter(c => c.id !== clipId))}
            onAddGeneratedClip={handleAddGeneratedClip}
          />
        </div>

        {/* Main Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <MainArea
            leftSidebarOpen={leftSidebarOpen}
            rightSidebarOpen={rightSidebarOpen}
            onToggleLeftSidebar={() => setLeftSidebarOpen(!leftSidebarOpen)}
            onToggleRightSidebar={() => setRightSidebarOpen(!rightSidebarOpen)}
            timelineClips={timelineClips}
            onRemoveClip={(clipId) => setTimelineClips(prev => prev.filter(c => c.id !== clipId))}
            onAddClipToTimeline={(clip) => {
              // Use the trackIndex from the clip if provided, otherwise determine it
              let trackIndex = clip.trackIndex;
              if (trackIndex === undefined) {
                // Determine track index - if video audio, use track 0, otherwise find next available
                const videoAudioClips = timelineClips.filter(c => c.isVideoAudio);
                trackIndex = clip.isVideoAudio ? 0 : (timelineClips.length > 0 ? Math.max(...timelineClips.map(c => c.trackIndex ?? 0)) + 1 : 1);
              }
              
              // Check if this exact clip is already on the timeline
              const existingClip = timelineClips.find(c => c.id === clip.id && c.trackIndex === trackIndex);
              if (!existingClip) {
                setTimelineClips(prev => [...prev, { ...clip, trackIndex, trackVolume: clip.trackVolume ?? 1.0 }]);
              }
            }}
            onVideoAudioExtracted={(clip) => {
              setVideoAudioClip(clip);
            }}
            onAddTrack={() => {
              // Add a new empty track - the UI will show it automatically
              // since we show tracks up to maxTrackIndex + 1
              // This is a no-op since tracks are created on-demand when clips are dropped
            }}
            selectedVideo={selectedVideo}
            onVideoSelect={setSelectedVideo}
          />
        </div>

        {/* Right Sidebar */}
        <div className={`transition-all duration-300 ${rightSidebarOpen ? 'w-80' : 'w-0'} overflow-hidden`}>
          <RightSidebar
            isOpen={rightSidebarOpen}
            onToggle={() => setRightSidebarOpen(!rightSidebarOpen)}
            audioClips={allAudioClips}
            uploadedAudioClips={uploadedAudioClips}
            onAudioUpload={handleAudioUpload}
            onDeleteUploadedClip={(clipId) => setUploadedAudioClips(prev => prev.filter(c => c.id !== clipId))}
          />
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {draggedClip && (
            <div className="bg-card border border-border rounded-lg p-3 shadow-lg opacity-90">
              <div className="text-sm font-medium">{draggedClip.name}</div>
              <div className="text-xs text-muted-foreground">{formatDuration(draggedClip.duration)}</div>
            </div>
          )}
        </DragOverlay>
      </div>
    </DndContext>
  );
};