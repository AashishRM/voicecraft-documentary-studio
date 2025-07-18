import React from 'react';
import { PanelLeftOpen, PanelRightOpen, Upload, Play, Pause, RotateCcw, ZoomIn, ZoomOut, X } from 'lucide-react';
import { useDroppable } from '@dnd-kit/core';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { AudioClip } from './DocumentaryStudio';

interface MainAreaProps {
  leftSidebarOpen: boolean;
  rightSidebarOpen: boolean;
  onToggleLeftSidebar: () => void;
  onToggleRightSidebar: () => void;
  timelineClips: AudioClip[];
  onRemoveClip: (clipId: string) => void;
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
  onRemoveClip
}) => {
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [zoom, setZoom] = React.useState(1);

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
            <div className="aspect-video bg-muted rounded-lg flex items-center justify-center border-2 border-dashed border-border">
              <div className="text-center">
                <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">Upload Video</h3>
                <p className="text-muted-foreground mb-4">
                  Drag and drop your video file here or click to browse
                </p>
                <Button>Choose Video File</Button>
              </div>
            </div>
            
            {/* Timeline Markers */}
            <div className="mt-4 h-8 bg-muted rounded border relative">
              <div className="absolute inset-0 flex items-center px-2">
                {[0, 10, 20, 30, 40, 50, 60].map((time) => (
                  <div key={time} className="flex-1 flex flex-col items-center">
                    <div className="w-px h-2 bg-border"></div>
                    <span className="text-xs text-muted-foreground mt-1">{time}s</span>
                  </div>
                ))}
              </div>
            </div>
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
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="h-8 w-8 p-0"
                  >
                    {isPlaying ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 w-8 p-0">
                    <RotateCcw className="h-4 w-4" />
                  </Button>
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
                      {timelineClips.map((clip, index) => (
                        <div
                          key={`${clip.id}-${index}`}
                          className="bg-primary/20 border border-primary/30 rounded-lg p-3 min-w-32 group relative"
                        >
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onRemoveClip(clip.id)}
                            className="absolute -top-2 -right-2 h-6 w-6 p-0 bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                          <div className="text-sm font-medium">{clip.name}</div>
                          <div className="text-xs text-muted-foreground">{clip.duration}s</div>
                          
                          {/* Mini waveform */}
                          <div className="flex items-end gap-px mt-2 h-4">
                            {clip.waveformData.map((height, waveIndex) => (
                              <div
                                key={waveIndex}
                                className="bg-primary w-1 rounded-sm"
                                style={{ 
                                  height: `${height * 100}%`,
                                  transform: `scaleX(${zoom})`
                                }}
                              />
                            ))}
                          </div>
                        </div>
                      ))}
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