import React, { useRef, useEffect, useState } from 'react';
import { Video } from 'lucide-react';
import { PanelLeftOpen, PanelRightOpen, Upload, Play, Pause, RotateCcw, ZoomIn, ZoomOut, X, Volume2, VolumeX, Download, Loader2, Music } from 'lucide-react';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { AudioClip } from './DocumentaryStudio';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { useMultiTrackAudioPlayer } from '@/hooks/useMultiTrackAudioPlayer';
import { useVideoExport } from '@/hooks/useVideoExport';
import { formatDuration } from '@/lib/timeUtils';
import { extractAudioFromVideo, getVideoDuration } from '@/lib/videoUtils';
import { Slider } from './ui/slider';
import { Progress } from './ui/progress';
import { useToast } from '@/hooks/use-toast';

interface MainAreaProps {
  leftSidebarOpen: boolean;
  rightSidebarOpen: boolean;
  onToggleLeftSidebar: () => void;
  onToggleRightSidebar: () => void;
  timelineClips: AudioClip[];
  onRemoveClip: (clipId: string) => void;
  onAddClipToTimeline: (clip: AudioClip) => void;
  onVideoAudioExtracted?: (clip: AudioClip) => void;
  onAddTrack?: () => void;
  selectedVideo: File | null;
  onVideoSelect: (file: File | null) => void;
  onClipPositionUpdate?: (clipId: string, startTime: number) => void;
}

const TimelineDropZone: React.FC<{ children: React.ReactNode; trackId?: string; contentWidth?: number }> = ({ children, trackId = 'timeline', contentWidth }) => {
  const { isOver, setNodeRef } = useDroppable({
    id: trackId,
  });

  // No padding to keep tracks connected
  const padding = 0;

  return (
    <div
      ref={setNodeRef}
      className={`transition-colors ${isOver ? 'bg-primary/10' : 'bg-transparent'} min-h-[60px]`}
      style={contentWidth ? { width: `${contentWidth + padding}px`, minWidth: '100%' } : undefined}
    >
      {children}
    </div>
  );
};

// Component for draggable video audio track
const DraggableVideoAudio: React.FC<{ videoAudioClip: AudioClip }> = ({ videoAudioClip }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `video-audio-${videoAudioClip.id}`,
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`p-3 rounded-lg border border-primary/30 bg-primary/10 hover:bg-primary/20 cursor-grab active:cursor-grabbing transition-all ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      <div className="flex items-center gap-3">
        <Music className="h-5 w-5 text-primary" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{videoAudioClip.name}</p>
          <p className="text-xs text-muted-foreground">{formatDuration(videoAudioClip.duration)}</p>
        </div>
      </div>
    </div>
  );
};

// Component for draggable video clip
const DraggableVideoClip: React.FC<{ videoFile: File }> = ({ videoFile }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `video-${videoFile.name}-${videoFile.size}`,
  });
  const videoUrl = URL.createObjectURL(videoFile);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      setDuration(video.duration);
      URL.revokeObjectURL(video.src);
    };
    video.src = videoUrl;
    return () => {
      URL.revokeObjectURL(videoUrl);
    };
  }, [videoFile, videoUrl]);

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`w-full h-full relative group cursor-grab active:cursor-grabbing ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      <video
        className="w-full h-full object-contain rounded-lg pointer-events-none"
        src={videoUrl}
        muted
      >
        Your browser does not support the video tag.
      </video>
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
        <Button
          size="sm"
          variant="destructive"
          onClick={(e) => {
            e.stopPropagation();
            // This will be handled by parent
          }}
          className="h-8 w-8 p-0 pointer-events-auto"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="bg-background/80 backdrop-blur-sm px-2 py-1 rounded text-xs">
          Drag to timeline
        </div>
      </div>
      {/* Video indicator */}
      <div className="absolute top-2 left-2">
        <Button
          size="sm"
          variant="default"
          className="h-7 text-xs pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          Video
        </Button>
      </div>
    </div>
  );
};

export const MainArea: React.FC<MainAreaProps> = ({
  leftSidebarOpen,
  rightSidebarOpen,
  onToggleLeftSidebar,
  onToggleRightSidebar,
  timelineClips,
  onRemoveClip,
  onAddClipToTimeline,
  onVideoAudioExtracted,
  onAddTrack,
  selectedVideo,
  onVideoSelect,
  onClipPositionUpdate
}) => {
  const [zoom, setZoom] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentPlayingClipIndex, setCurrentPlayingClipIndex] = useState(-1);
  const [videoSyncEnabled, setVideoSyncEnabled] = useState(true);
  const [videoAudioClip, setVideoAudioClip] = useState<AudioClip | null>(null);
  const [extractingAudio, setExtractingAudio] = useState(false);
  const { toast } = useToast();
  const [draggingClipId, setDraggingClipId] = useState<string | null>(null);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartTime, setDragStartTime] = useState(0);
  const [hasDragged, setHasDragged] = useState(false);
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);
  const timelineContainerRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const timelineWrapperRef = useRef<HTMLDivElement>(null);
  
  const handleVideoSyncToggle = () => {
    setVideoSyncEnabled(!videoSyncEnabled);
  };

  // Handle clip drag start
  const handleClipDragStart = (e: React.MouseEvent, clip: AudioClip, currentStartTime: number) => {
    e.stopPropagation();
    setDraggingClipId(clip.id);
    setDragStartX(e.clientX);
    setDragStartTime(currentStartTime);
    setHasDragged(false);
  };

  // Use multi-track audio player for simultaneous playback
  const multiTrackPlayer = useMultiTrackAudioPlayer({
    clips: timelineClips,
    onComplete: () => setCurrentPlayingClipIndex(-1),
  });

  // Keep single track player for backward compatibility (for clip highlighting)
  const audioPlayer = useAudioPlayer({
    clips: timelineClips,
    onClipChange: (index) => setCurrentPlayingClipIndex(index),
    onComplete: () => setCurrentPlayingClipIndex(-1),
  });

  // Use multi-track player for actual playback
  const activePlayer = multiTrackPlayer;

  // Handle clip drag
  useEffect(() => {
    if (!draggingClipId) return;

    const handleMouseMove = (e: MouseEvent) => {
      const clip = timelineClips.find(c => c.id === draggingClipId);
      if (!clip || clip.trackIndex === undefined) return;

      const trackIndex = clip.trackIndex;
      const container = timelineContainerRefs.current.get(trackIndex);
      if (!container) return;

      const deltaX = e.clientX - dragStartX;
      // Only consider it a drag if moved more than 5 pixels
      if (Math.abs(deltaX) > 5) {
        setHasDragged(true);
      }

      const deltaTime = deltaX / (50 * zoom); // pixelsPerSecond = 50 * zoom
      const newStartTime = Math.max(0, dragStartTime + deltaTime);

      // Update clip position immediately for visual feedback
      if (onClipPositionUpdate) {
        onClipPositionUpdate(draggingClipId, newStartTime);
      }
    };

    const handleMouseUp = () => {
      setDraggingClipId(null);
      // Reset hasDragged after a short delay to allow click handler to check it
      setTimeout(() => setHasDragged(false), 0);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingClipId, dragStartX, dragStartTime, zoom, timelineClips, onClipPositionUpdate]);

  // Handle playhead drag
  const handlePlayheadDragStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsDraggingPlayhead(true);
  };

  useEffect(() => {
    if (!isDraggingPlayhead) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!timelineWrapperRef.current) return;
      
      // Try to get the container that has the timeline content
      const timelineContainer = timelineWrapperRef.current.querySelector('[style*="width"]') as HTMLElement;
      if (!timelineContainer) return;
      
      const containerRect = timelineContainer.getBoundingClientRect();
      const scrollLeft = timelineWrapperRef.current.scrollLeft || 0;
      const x = e.clientX - containerRect.left + scrollLeft;
      const pixelsPerSecond = 50 * zoom;
      const time = Math.max(0, x / pixelsPerSecond);
      
      activePlayer.seekToTime(time);
    };

    const handleMouseUp = () => {
      setIsDraggingPlayhead(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingPlayhead, zoom, activePlayer]);

  // Group clips by track for display
  const clipsByTrack = new Map<number, AudioClip[]>();
  timelineClips.forEach(clip => {
    const trackIndex = clip.trackIndex ?? 0;
    if (!clipsByTrack.has(trackIndex)) {
      clipsByTrack.set(trackIndex, []);
    }
    clipsByTrack.get(trackIndex)!.push(clip);
  });

  const videoExport = useVideoExport({
    videoFile: selectedVideo,
    audioClips: timelineClips,
    getTrackVolume: multiTrackPlayer ? multiTrackPlayer.getTrackVolume : undefined,
  });

  // Extract audio from video when video is selected
  useEffect(() => {
    if (selectedVideo && !videoAudioClip) {
      setExtractingAudio(true);
      Promise.all([
        extractAudioFromVideo(selectedVideo).catch(() => null),
        getVideoDuration(selectedVideo)
      ]).then(([audioUrl, duration]) => {
        if (audioUrl) {
          const clip: AudioClip = {
            id: `video-audio-${Date.now()}`,
            name: `${selectedVideo.name} (Audio)`,
            duration: duration || 0,
            waveformData: Array(10).fill(0).map(() => Math.random()),
            audioUrl: audioUrl,
            isVideoAudio: true,
            trackIndex: 0,
            trackVolume: 1.0
          };
          setVideoAudioClip(clip);
          onVideoAudioExtracted?.(clip);
          // Don't auto-add - user can drag it manually
        }
        setExtractingAudio(false);
      }).catch((err) => {
        console.error('Failed to extract video audio:', err);
        setExtractingAudio(false);
        toast({
          title: "Audio Extraction Failed",
          description: "Could not extract audio from video. You can still add other audio tracks.",
          variant: "destructive",
        });
      });
    } else if (!selectedVideo) {
      if (videoAudioClip?.audioUrl) {
        URL.revokeObjectURL(videoAudioClip.audioUrl);
      }
      setVideoAudioClip(null);
    }
  }, [selectedVideo, videoAudioClip, toast]);

  // Sync video with audio playback
  useEffect(() => {
    if (!videoRef.current || !selectedVideo || !videoSyncEnabled) return;

    const video = videoRef.current;
    
    if (activePlayer.isPlaying) {
      video.currentTime = activePlayer.globalTime;
      video.play().catch(() => {});
    } else {
      video.pause();
      video.currentTime = activePlayer.globalTime;
    }
  }, [activePlayer.isPlaying, activePlayer.globalTime, selectedVideo, videoSyncEnabled]);

  // Show export error
  useEffect(() => {
    if (videoExport.exportError) {
      toast({
        title: "Export Error",
        description: videoExport.exportError,
        variant: "destructive",
      });
    }
  }, [videoExport.exportError, toast]);

  // Show export success
  useEffect(() => {
    if (videoExport.exportProgress === 100 && !videoExport.isExporting) {
      toast({
        title: "Export Complete",
        description: "Your video has been exported successfully!",
      });
    }
  }, [videoExport.exportProgress, videoExport.isExporting, toast]);

  const handleVideoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('video/')) {
      onVideoSelect(file);
    }
  };

  const handleChooseVideoClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Top Toolbar */}
      <div className="bg-card border-b border-border p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {!leftSidebarOpen && (
            <Button variant="ghost" size="sm" onClick={onToggleLeftSidebar}>
              <PanelLeftOpen className="h-4 w-4" />
            </Button>
          )}
          <h1 className="text-lg font-semibold">Documentary Voice-Over Studio</h1>
        </div>
        
        <div className="flex items-center gap-2">
          {!rightSidebarOpen && (
            <Button variant="ghost" size="sm" onClick={onToggleRightSidebar}>
              <PanelRightOpen className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        {/* Video Preview */}
        <Card>
          <CardContent className="p-6">
            <div className="aspect-video bg-muted rounded-lg flex items-center justify-center border-2 border-dashed border-border overflow-hidden">
              {selectedVideo ? (
                <div className="w-full h-full relative group">
                  <DraggableVideoClip videoFile={selectedVideo} />
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2 pointer-events-none">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => onVideoSelect(null)}
                      className="h-8 w-8 p-0 pointer-events-auto"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleChooseVideoClick}
                      className="bg-background/80 backdrop-blur-sm pointer-events-auto"
                    >
                      Change Video
                    </Button>
                  </div>
                  {/* Sync indicator */}
                  <div className="absolute top-2 left-2 pointer-events-none">
                    <Button
                      size="sm"
                      variant={videoSyncEnabled ? "default" : "outline"}
                      onClick={handleVideoSyncToggle}
                      className="h-7 text-xs pointer-events-auto"
                    >
                      {videoSyncEnabled ? "Synced" : "Unsync"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">Upload Video</h3>
                  <p className="text-muted-foreground mb-4">
                    Drag and drop your video file here or click to browse
                  </p>
                  <Button onClick={handleChooseVideoClick}>Choose Video File</Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/*"
                    onChange={handleVideoUpload}
                    className="hidden"
                  />
                </div>
              )}
            </div>
            
            {/* Playback Progress Bar */}
            {timelineClips.filter(c => c.audioUrl).length > 0 && (
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{formatDuration(activePlayer.globalTime)}</span>
                  <span>{formatDuration(activePlayer.totalDuration)}</span>
                </div>
                <Slider
                  value={[activePlayer.globalTime]}
                  onValueChange={(value) => activePlayer.seekToTime(value[0])}
                  max={activePlayer.totalDuration || 1}
                  step={0.1}
                  className="w-full"
                />
              </div>
            )}

            {/* Export Section */}
            {selectedVideo && timelineClips.filter(c => c.audioUrl).length > 0 && (
              <div className="mt-4 p-4 bg-muted/50 rounded-lg border border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium">Export Video</h4>
                    <p className="text-xs text-muted-foreground">
                      Combine video with audio timeline and download
                    </p>
                  </div>
                  <Button
                    onClick={videoExport.isExporting ? videoExport.cancelExport : videoExport.exportVideo}
                    disabled={false}
                    variant={videoExport.isExporting ? "outline" : "default"}
                    size="sm"
                  >
                    {videoExport.isExporting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Cancel
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        Export
                      </>
                    )}
                  </Button>
                </div>
                {videoExport.isExporting && (
                  <div className="mt-3 space-y-1">
                    <Progress value={videoExport.exportProgress} className="h-2" />
                    <p className="text-xs text-muted-foreground text-center">
                      {videoExport.exportProgress < 20 
                        ? "Preparing audio..." 
                        : videoExport.exportProgress < 95 
                          ? "Rendering video..." 
                          : "Finalizing..."}
                      {" "}{videoExport.exportProgress}%
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Audio Controller */}
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {/* Controls */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={activePlayer.togglePlayPause}
                    className="h-8 w-8 p-0"
                    disabled={timelineClips.filter(c => c.audioUrl).length === 0}
                  >
                    {activePlayer.isPlaying ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={activePlayer.reset}
                    className="h-8 w-8 p-0"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                  
                  {/* Playback status */}
                  {timelineClips.length > 0 && (
                    <span className="text-xs text-muted-foreground ml-2">
                      {activePlayer.isPlaying ? (
                        <>Playing {clipsByTrack.size} track(s)</>
                      ) : (
                        <>Ready ({timelineClips.filter(c => c.audioUrl).length} playable clips)</>
                      )}
                    </span>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
                    className="h-8 w-8 p-0"
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium w-12 text-center">
                    {Math.round(zoom * 100)}%
                  </span>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => setZoom(Math.min(3, zoom + 0.25))}
                    className="h-8 w-8 p-0"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Video Audio Track (if available) */}
              {videoAudioClip && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium">Video Audio Track</h3>
                    {extractingAudio && (
                      <span className="text-xs text-muted-foreground">Extracting audio...</span>
                    )}
                  </div>
                  <div className="p-3 bg-muted/30 rounded-lg border border-border">
                    <DraggableVideoAudio videoAudioClip={videoAudioClip} />
                    <p className="text-xs text-muted-foreground mt-2">
                      Drag this to add video audio to timeline
                    </p>
                  </div>
                </div>
              )}

              {/* Timeline with Layers */}
              <div className="w-full">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium">Audio Timeline</h3>
  
                </div>
                
                {/* Time Ruler */}
                {(() => {
                  const tracks = new Map<number, AudioClip[]>();
                  timelineClips.forEach(clip => {
                    const trackIndex = clip.trackIndex ?? 0;
                    if (!tracks.has(trackIndex)) {
                      tracks.set(trackIndex, []);
                    }
                    tracks.get(trackIndex)!.push(clip);
                  });
                  
                  const maxTrackDuration = Math.max(
                    ...Array.from(tracks.values()).map(trackClips => {
                      if (trackClips.length === 0) return 10;
                      return Math.max(
                        ...trackClips.map(clip => {
                          const startTime = clip.startTime ?? 0;
                          return startTime + clip.duration;
                        }),
                        10
                      );
                    }),
                    10
                  );
                  
                  const pixelsPerSecond = 50 * zoom;
                  const timelineWidth = maxTrackDuration * pixelsPerSecond;
                  
                  // Generate time markers
                  const timeMarkers = [];
                  const markerInterval = zoom < 0.5 ? 10 : zoom < 1 ? 5 : zoom < 2 ? 2 : 1;
                  for (let t = 0; t <= maxTrackDuration + 5; t += markerInterval) {
                    timeMarkers.push(t);
                  }
                  
                  const playheadPosition = activePlayer.globalTime * pixelsPerSecond;
                  
                  return (
                    <div className="mb-2 border-b border-border pb-1">
                      <div className="relative" style={{ height: '24px', marginLeft: '160px' }}>
                        <div style={{ width: `${timelineWidth}px` }}>
                          {timeMarkers.map((t) => (
                            <div
                              key={t}
                              className="absolute bottom-0 flex flex-col items-center"
                              style={{ left: `${t * pixelsPerSecond}px` }}
                            >
                              <span className="text-[10px] text-muted-foreground mb-0.5">
                                {formatDuration(t)}
                              </span>
                              <div className="w-px h-2 bg-border" />
                            </div>
                          ))}
                          
                          {/* Playhead line on ruler */}
                          {activePlayer.globalTime >= 0 && (
                            <div
                              className={`absolute top-0 bottom-0 w-0.5 z-20 ${isDraggingPlayhead ? 'bg-primary cursor-ew-resize' : 'bg-primary cursor-ew-resize'}`}
                              style={{ left: `${Math.min(playheadPosition, timelineWidth)}px` }}
                              onMouseDown={handlePlayheadDragStart}
                            >
                              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-primary rounded-full border-2 border-background shadow-sm" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}
                
                {/* Group clips by track */}
                <div ref={timelineWrapperRef} className="overflow-x-auto w-full relative">
                {(() => {
                  const tracks = new Map<number, AudioClip[]>();
                  timelineClips.forEach(clip => {
                    const trackIndex = clip.trackIndex ?? 0;
                    if (!tracks.has(trackIndex)) {
                      tracks.set(trackIndex, []);
                    }
                    tracks.get(trackIndex)!.push(clip);
                  });
                  
                  const trackIndices = Array.from(tracks.keys()).sort((a, b) => a - b);
                  
                  // Always show at least track 0, plus show empty tracks up to the max
                  const maxTrackIndex = trackIndices.length > 0 ? Math.max(...trackIndices) : -1;
                  const tracksToShow: number[] = [];
                  // Show tracks from 0 to maxTrackIndex + 1 (to allow adding to next track)
                  for (let i = 0; i <= Math.max(maxTrackIndex + 1, 0); i++) {
                    tracksToShow.push(i);
                  }
                  
                  // Calculate total duration across all tracks for timeline width
                  const maxTrackDuration = Math.max(
                    ...Array.from(tracks.values()).map(trackClips => {
                      if (trackClips.length === 0) return 10;
                      return Math.max(
                        ...trackClips.map(clip => {
                          const startTime = clip.startTime ?? 0;
                          return startTime + clip.duration;
                        }),
                        10
                      );
                    }),
                    10 // Minimum 10 seconds
                  );
                  
                  // Pixels per second based on zoom
                  const pixelsPerSecond = 50 * zoom;
                  const timelineWidth = maxTrackDuration * pixelsPerSecond;
                  
                  const playheadPosition = activePlayer.globalTime * pixelsPerSecond;
                  
                  return (
                    <div className="relative">
                      {tracksToShow.map(trackIndex => {
                        const trackClips = tracks.get(trackIndex) || [];
                        const trackName = trackIndex === 0 ? 'Track 1' : `Track ${trackIndex + 1}`;
                        const trackVolume = activePlayer.getTrackVolume(trackIndex);
                        const trackDuration = trackClips.reduce((sum, clip) => sum + clip.duration, 0);
                        
                        return (
                          <div key={trackIndex} className="relative border-b border-border last:border-b-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-muted-foreground w-32">{trackName}</span>
                              <span className="text-xs text-muted-foreground w-16">
                                {formatDuration(trackDuration)}
                              </span>
                              <div className="flex-1 h-px bg-border" />
                              {/* Track Volume Control */}
                              <div className="flex items-center gap-2">
                                <Volume2 className="h-3 w-3 text-muted-foreground" />
                                <Slider
                                  value={[trackVolume * 100]}
                                  onValueChange={(value) => activePlayer.setTrackVolume(trackIndex, value[0] / 100)}
                                  max={100}
                                  step={1}
                                  className="w-20"
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <span className="text-xs text-muted-foreground w-8">
                                  {Math.round(trackVolume * 100)}%
                                </span>
                              </div>
                            </div>
                            <TimelineDropZone trackId={`timeline-track-${trackIndex}`} contentWidth={trackClips.length > 0 ? timelineWidth : undefined}>
                              {trackClips.length === 0 ? (
                                <div className="text-center py-4 text-muted-foreground text-xs relative" style={{ minHeight: '60px' }}>
                                  {/* Playhead line for empty track */}
                                  {activePlayer.globalTime >= 0 && (
                                    <div
                                      className={`absolute top-0 bottom-0 w-0.5 z-20 ${isDraggingPlayhead ? 'bg-primary cursor-ew-resize' : 'bg-primary pointer-events-none'}`}
                                      style={{ 
                                        left: `${Math.min(playheadPosition, timelineWidth)}px`,
                                      }}
                                      onMouseDown={handlePlayheadDragStart}
                                    >
                                      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-primary rounded-full border-2 border-background shadow-sm" />
                                    </div>
                                  )}
                                  Drop audio or video clips here
                                </div>
                              ) : (
                                <div 
                                  ref={(el) => {
                                    if (el) {
                                      timelineContainerRefs.current.set(trackIndex, el);
                                    } else {
                                      timelineContainerRefs.current.delete(trackIndex);
                                    }
                                  }}
                                  className="relative"
                                  style={{ 
                                    width: `${timelineWidth}px`,
                                    minHeight: '60px',
                                    height: 'auto',
                                    overflow: 'hidden'
                                  }}
                                >
                                  {/* Playhead line for track */}
                                  {activePlayer.globalTime >= 0 && (
                                    <div
                                      className={`absolute top-0 bottom-0 w-0.5 z-20 ${isDraggingPlayhead ? 'bg-primary cursor-ew-resize' : 'bg-primary pointer-events-none'}`}
                                      style={{ 
                                        left: `${Math.min(playheadPosition, timelineWidth)}px`,
                                      }}
                                      onMouseDown={handlePlayheadDragStart}
                                    >
                                      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-primary rounded-full border-2 border-background shadow-sm" />
                                    </div>
                                  )}
                                  {trackClips
                                    .sort((a, b) => {
                                      // Sort by startTime if available, otherwise by original order
                                      const aStart = a.startTime ?? 0;
                                      const bStart = b.startTime ?? 0;
                                      return aStart - bStart;
                                    })
                                    .map((clip, index) => {
                                    const hasAudio = !!clip.audioUrl;
                                    const isVideo = !!clip.isVideo;
                                    // Calculate clip start time - use startTime if available, otherwise sequential
                                    let clipStartTime: number;
                                    if (clip.startTime !== undefined) {
                                      clipStartTime = clip.startTime;
                                    } else {
                                      // Fallback to sequential positioning
                                      const sortedClips = [...trackClips].sort((a, b) => {
                                        const aStart = a.startTime ?? 0;
                                        const bStart = b.startTime ?? 0;
                                        return aStart - bStart;
                                      });
                                      const clipIndex = sortedClips.findIndex(c => c.id === clip.id);
                                      const trackClipsBefore = sortedClips.slice(0, clipIndex);
                                      clipStartTime = trackClipsBefore.reduce((sum, c) => {
                                        const cStart = c.startTime ?? 0;
                                        const cEnd = cStart + c.duration;
                                        return Math.max(sum, cEnd);
                                      }, 0);
                                    }
                                    const clipLeft = clipStartTime * pixelsPerSecond;
                                    const clipWidth = clip.duration * pixelsPerSecond;
                                    // Ensure clip doesn't exceed container bounds
                                    const maxClipWidth = Math.max(0, timelineWidth - clipLeft);
                                    const finalClipWidth = Math.min(Math.max(clipWidth, 80), maxClipWidth);
                                    const isCurrentlyPlaying = activePlayer.isPlaying && 
                                      activePlayer.globalTime >= clipStartTime && 
                                      activePlayer.globalTime < clipStartTime + clip.duration;
                                    const isDragging = draggingClipId === clip.id;
                                    
                                    return (
                                      <div
                                        key={`${clip.id}-${index}`}
                                        onClick={(e) => {
                                          if (isDragging || hasDragged) return;
                                          if (hasAudio || isVideo) {
                                            activePlayer.seekToTime(clipStartTime);
                                            if (!activePlayer.isPlaying) {
                                              activePlayer.play();
                                            }
                                          }
                                        }}
                                        onMouseDown={(e) => {
                                          if (e.button === 0) { // Left mouse button
                                            handleClipDragStart(e, clip, clipStartTime);
                                          }
                                        }}
                                        className={`absolute rounded-lg p-2 group transition-all ${
                                          isDragging
                                            ? 'cursor-grabbing z-50 opacity-80'
                                            : 'cursor-grab'
                                        } ${
                                          isCurrentlyPlaying 
                                            ? 'bg-primary/40 border-2 border-primary ring-2 ring-primary/30 z-10' 
                                            : isVideo
                                              ? 'bg-green-500/20 border border-green-500/30 hover:bg-green-500/30'
                                              : hasAudio
                                                ? clip.isVideoAudio
                                                  ? 'bg-blue-500/20 border border-blue-500/30 hover:bg-blue-500/30'
                                                  : 'bg-primary/20 border border-primary/30 hover:bg-primary/30'
                                                : 'bg-muted/50 border border-border opacity-60'
                                        }`}
                                        style={{
                                          left: `${Math.min(clipLeft, timelineWidth)}px`,
                                          width: `${finalClipWidth}px`,
                                          minHeight: '56px'
                                        }}
                                      >
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onRemoveClip(clip.id);
                                          }}
                                          className="absolute -top-1 -right-1 h-5 w-5 p-0 bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity z-20"
                                        >
                                          <X className="h-3 w-3" />
                                        </Button>
                                        
                                        <div className="flex flex-col gap-1 h-full">
                                          <div className="flex items-center gap-1 flex-shrink-0">
                                            {isCurrentlyPlaying && (
                                              <div className="flex items-center gap-0.5">
                                                <div className="w-1 h-2 bg-primary animate-pulse rounded-full" />
                                                <div className="w-1 h-3 bg-primary animate-pulse rounded-full" style={{ animationDelay: '0.1s' }} />
                                                <div className="w-1 h-1.5 bg-primary animate-pulse rounded-full" style={{ animationDelay: '0.2s' }} />
                                              </div>
                                            )}
                                            {isVideo && (
                                              <span className="text-[10px] text-green-600 font-medium">VIDEO</span>
                                            )}
                                            <div className="flex-1 min-w-0">
                                              <div className="text-xs font-medium truncate">{clip.name}</div>
                                              <div className="text-[10px] text-muted-foreground">{formatDuration(clip.duration)}</div>
                                            </div>
                                          </div>
                                          
                                          {/* Mini waveform or video indicator */}
                                          {isVideo ? (
                                            <div className="flex items-center justify-center h-3 text-[10px] text-green-600 flex-shrink-0">
                                              🎬
                                            </div>
                                          ) : (
                                            <div className="flex items-end gap-[1px] h-3 flex-shrink-0">
                                              {clip.waveformData.slice(0, Math.min(clip.waveformData.length, Math.floor(clipWidth / 4))).map((height, waveIndex) => (
                                                <div
                                                  key={waveIndex}
                                                  className={`w-[2px] rounded-sm transition-colors ${
                                                    isCurrentlyPlaying ? 'bg-primary' : 'bg-primary/60'
                                                  }`}
                                                  style={{ 
                                                    height: `${Math.max(height * 100, 20)}%`
                                                  }}
                                                />
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </TimelineDropZone>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};