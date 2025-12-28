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
}

const TimelineDropZone: React.FC<{ children: React.ReactNode; trackId?: string; contentWidth?: number }> = ({ children, trackId = 'timeline', contentWidth }) => {
  const { isOver, setNodeRef } = useDroppable({
    id: trackId,
  });

  // p-4 = 16px padding on each side = 32px total
  const padding = 32;

  return (
    <div
      ref={setNodeRef}
      className={`transition-colors ${isOver ? 'bg-primary/10 border-primary' : 'bg-card border-border'} border-2 border-dashed rounded-lg p-4 min-h-32`}
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
  onVideoSelect
}) => {
  const [zoom, setZoom] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentPlayingClipIndex, setCurrentPlayingClipIndex] = useState(-1);
  const [videoSyncEnabled, setVideoSyncEnabled] = useState(true);
  const [videoAudioClip, setVideoAudioClip] = useState<AudioClip | null>(null);
  const [extractingAudio, setExtractingAudio] = useState(false);
  const { toast } = useToast();
  
  const handleVideoSyncToggle = () => {
    setVideoSyncEnabled(!videoSyncEnabled);
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
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      onAddTrack?.();
                    }}
                    className="text-xs"
                  >
                    + Add Track
                  </Button>
                </div>
                
                {/* Group clips by track */}
                <div className="overflow-x-auto w-full">
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
                    ...Array.from(tracks.values()).map(trackClips => 
                      trackClips.reduce((sum, clip) => sum + clip.duration, 0)
                    ),
                    10 // Minimum 10 seconds
                  );
                  
                  // Pixels per second based on zoom
                  const pixelsPerSecond = 50 * zoom;
                  const timelineWidth = maxTrackDuration * pixelsPerSecond;
                  
                  return (
                    <div className="space-y-3">
                      {tracksToShow.map(trackIndex => {
                        const trackClips = tracks.get(trackIndex) || [];
                        const trackName = trackIndex === 0 ? 'Track 1 (Video Audio)' : `Track ${trackIndex + 1}`;
                        const trackVolume = activePlayer.getTrackVolume(trackIndex);
                        const trackDuration = trackClips.reduce((sum, clip) => sum + clip.duration, 0);
                        
                        return (
                          <div key={trackIndex} className="space-y-2">
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
                                <div className="text-center py-4 text-muted-foreground text-xs" style={{ minHeight: '60px' }}>
                                  Drop audio or video clips here
                                </div>
                              ) : (
                                <div 
                                  className="relative"
                                  style={{ 
                                    width: `${timelineWidth}px`,
                                    minHeight: '60px',
                                    height: 'auto',
                                    overflow: 'hidden'
                                  }}
                                >
                                  {trackClips.map((clip, index) => {
                                    const hasAudio = !!clip.audioUrl;
                                    const isVideo = !!clip.isVideo;
                                    // Calculate clip start time and position within its track
                                    const trackClipsBefore = trackClips.slice(0, index);
                                    const clipStartTime = trackClipsBefore.reduce((sum, c) => sum + c.duration, 0);
                                    const clipLeft = clipStartTime * pixelsPerSecond;
                                    const clipWidth = clip.duration * pixelsPerSecond;
                                    // Ensure clip doesn't exceed container bounds
                                    const maxClipWidth = Math.max(0, timelineWidth - clipLeft);
                                    const finalClipWidth = Math.min(Math.max(clipWidth, 80), maxClipWidth);
                                    const isCurrentlyPlaying = activePlayer.isPlaying && 
                                      activePlayer.globalTime >= clipStartTime && 
                                      activePlayer.globalTime < clipStartTime + clip.duration;
                                    
                                    return (
                                      <div
                                        key={`${clip.id}-${index}`}
                                        onClick={() => {
                                          if (hasAudio || isVideo) {
                                            activePlayer.seekToTime(clipStartTime);
                                            if (!activePlayer.isPlaying) {
                                              activePlayer.play();
                                            }
                                          }
                                        }}
                                        className={`absolute rounded-lg p-2 group cursor-pointer transition-all ${
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