import React, { useRef, useEffect, useState } from 'react';
import { PanelLeftOpen, PanelRightOpen, Upload, Play, Pause, RotateCcw, ZoomIn, ZoomOut, X, Volume2, VolumeX, Download, Loader2 } from 'lucide-react';
import { useDroppable } from '@dnd-kit/core';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { AudioClip } from './DocumentaryStudio';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { useVideoExport } from '@/hooks/useVideoExport';
import { formatDuration } from '@/lib/timeUtils';
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
  selectedVideo: File | null;
  onVideoSelect: (file: File | null) => void;
}

const TimelineDropZone: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isOver, setNodeRef } = useDroppable({
    id: 'timeline',
  });

  return (
    <div
      ref={setNodeRef}
      className={`transition-colors ${isOver ? 'bg-primary/10 border-primary' : 'bg-card border-border'} border-2 border-dashed rounded-lg p-4 min-h-32`}
    >
      {children}
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
  selectedVideo,
  onVideoSelect
}) => {
  const [zoom, setZoom] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentPlayingClipIndex, setCurrentPlayingClipIndex] = useState(-1);
  const [videoSyncEnabled, setVideoSyncEnabled] = useState(true);
  const { toast } = useToast();

  const audioPlayer = useAudioPlayer({
    clips: timelineClips,
    onClipChange: (index) => setCurrentPlayingClipIndex(index),
    onComplete: () => setCurrentPlayingClipIndex(-1),
  });

  const videoExport = useVideoExport({
    videoFile: selectedVideo,
    audioClips: timelineClips,
  });

  // Sync video with audio playback
  useEffect(() => {
    if (!videoRef.current || !selectedVideo || !videoSyncEnabled) return;

    const video = videoRef.current;
    
    if (audioPlayer.isPlaying) {
      video.currentTime = audioPlayer.globalTime;
      video.play().catch(() => {});
    } else {
      video.pause();
      video.currentTime = audioPlayer.globalTime;
    }
  }, [audioPlayer.isPlaying, audioPlayer.globalTime, selectedVideo, videoSyncEnabled]);

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
                  <video
                    ref={videoRef}
                    className="w-full h-full object-contain rounded-lg"
                    src={URL.createObjectURL(selectedVideo)}
                    muted
                  >
                    Your browser does not support the video tag.
                  </video>
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => onVideoSelect(null)}
                      className="h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleChooseVideoClick}
                      className="bg-background/80 backdrop-blur-sm"
                    >
                      Change Video
                    </Button>
                  </div>
                  {/* Sync indicator */}
                  <div className="absolute top-2 left-2">
                    <Button
                      size="sm"
                      variant={videoSyncEnabled ? "default" : "outline"}
                      onClick={() => setVideoSyncEnabled(!videoSyncEnabled)}
                      className="h-7 text-xs"
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
                  <span>{formatDuration(audioPlayer.globalTime)}</span>
                  <span>{formatDuration(audioPlayer.totalDuration)}</span>
                </div>
                <Slider
                  value={[audioPlayer.globalTime]}
                  onValueChange={(value) => audioPlayer.seekToTime(value[0])}
                  max={audioPlayer.totalDuration || 1}
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
                    onClick={audioPlayer.togglePlayPause}
                    className="h-8 w-8 p-0"
                    disabled={timelineClips.filter(c => c.audioUrl).length === 0}
                  >
                    {audioPlayer.isPlaying ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={audioPlayer.reset}
                    className="h-8 w-8 p-0"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                  
                  {/* Playback status */}
                  {timelineClips.length > 0 && (
                    <span className="text-xs text-muted-foreground ml-2">
                      {audioPlayer.isPlaying ? (
                        <>Playing: {timelineClips.filter(c => c.audioUrl)[audioPlayer.currentClipIndex]?.name || 'No audio'}</>
                      ) : (
                        <>Ready ({timelineClips.filter(c => c.audioUrl).length} playable clips)</>
                      )}
                    </span>
                  )}
                  
                  {/* Volume control */}
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => audioPlayer.setVolume(audioPlayer.volume > 0 ? 0 : 1)}
                      className="h-8 w-8 p-0"
                    >
                      {audioPlayer.volume === 0 ? (
                        <VolumeX className="h-4 w-4" />
                      ) : (
                        <Volume2 className="h-4 w-4" />
                      )}
                    </Button>
                    <Slider
                      value={[audioPlayer.volume * 100]}
                      onValueChange={(value) => audioPlayer.setVolume(value[0] / 100)}
                      max={100}
                      step={1}
                      className="w-24"
                    />
                  </div>
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

              {/* Timeline */}
              <div>
                <h3 className="text-sm font-medium mb-3">Audio Timeline</h3>
                <TimelineDropZone>
                  {timelineClips.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <div className="text-sm">Drop audio clips here to start building your timeline</div>
                    </div>
                  ) : (
                    <div className="flex gap-2 flex-wrap">
                      {timelineClips.map((clip, index) => {
                        const playableClips = timelineClips.filter(c => c.audioUrl);
                        const playableIndex = playableClips.findIndex(c => c.id === clip.id);
                        const isCurrentlyPlaying = audioPlayer.isPlaying && playableIndex === audioPlayer.currentClipIndex;
                        const hasAudio = !!clip.audioUrl;
                        
                        return (
                          <div
                            key={`${clip.id}-${index}`}
                            onClick={() => {
                              if (hasAudio && playableIndex !== -1) {
                                audioPlayer.seekToClip(playableIndex);
                                if (!audioPlayer.isPlaying) {
                                  audioPlayer.play();
                                }
                              }
                            }}
                            className={`rounded-lg p-3 min-w-32 group relative cursor-pointer transition-all ${
                              isCurrentlyPlaying 
                                ? 'bg-primary/40 border-2 border-primary ring-2 ring-primary/30' 
                                : hasAudio
                                  ? 'bg-primary/20 border border-primary/30 hover:bg-primary/30'
                                  : 'bg-muted/50 border border-border opacity-60'
                            }`}
                          >
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                onRemoveClip(clip.id);
                              }}
                              className="absolute -top-2 -right-2 h-6 w-6 p-0 bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                            
                            <div className="flex items-center gap-2">
                              {isCurrentlyPlaying && (
                                <div className="flex items-center gap-0.5">
                                  <div className="w-1 h-3 bg-primary animate-pulse rounded-full" />
                                  <div className="w-1 h-4 bg-primary animate-pulse rounded-full" style={{ animationDelay: '0.1s' }} />
                                  <div className="w-1 h-2 bg-primary animate-pulse rounded-full" style={{ animationDelay: '0.2s' }} />
                                </div>
                              )}
                              {!hasAudio && !isCurrentlyPlaying && (
                                <span className="text-xs text-muted-foreground">(no audio)</span>
                              )}
                              <div className="flex-1">
                                <div className="text-sm font-medium">{clip.name}</div>
                                <div className="text-xs text-muted-foreground">{formatDuration(clip.duration)}</div>
                              </div>
                            </div>
                            
                            {/* Mini waveform */}
                            <div className="flex items-end gap-px mt-2 h-4">
                              {clip.waveformData.map((height, waveIndex) => (
                                <div
                                  key={waveIndex}
                                  className={`w-1 rounded-sm transition-colors ${
                                    isCurrentlyPlaying ? 'bg-primary' : 'bg-primary/60'
                                  }`}
                                  style={{ 
                                    height: `${height * 100}%`,
                                    transform: `scaleX(${zoom})`
                                  }}
                                />
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </TimelineDropZone>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};