import React, { useState } from 'react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent } from '@dnd-kit/core';
import { LeftSidebar } from './LeftSidebar';
import { RightSidebar } from './RightSidebar';
import { MainArea } from './MainArea';

export interface AudioClip {
  id: string;
  name: string;
  duration: number;
  waveformData: number[];
}

export const DocumentaryStudio: React.FC = () => {
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);
  const [timelineClips, setTimelineClips] = useState<AudioClip[]>([]);
  const [draggedClip, setDraggedClip] = useState<AudioClip | null>(null);

  const handleDragStart = (event: DragStartEvent) => {
    const clipId = event.active.id as string;
    const clip = mockAudioClips.find(c => c.id === clipId);
    if (clip) {
      setDraggedClip(clip);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setDraggedClip(null);
    
    if (event.over && event.over.id === 'timeline') {
      const clipId = event.active.id as string;
      const clip = mockAudioClips.find(c => c.id === clipId);
      
      if (clip && !timelineClips.find(c => c.id === clipId)) {
        setTimelineClips(prev => [...prev, clip]);
      }
    }
  };

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex h-screen bg-background">
        {/* Left Sidebar */}
        <div className={`transition-all duration-300 ${leftSidebarOpen ? 'w-80' : 'w-0'} overflow-hidden`}>
          <LeftSidebar 
            isOpen={leftSidebarOpen} 
            onToggle={() => setLeftSidebarOpen(!leftSidebarOpen)} 
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
          />
        </div>

        {/* Right Sidebar */}
        <div className={`transition-all duration-300 ${rightSidebarOpen ? 'w-80' : 'w-0'} overflow-hidden`}>
          <RightSidebar 
            isOpen={rightSidebarOpen} 
            onToggle={() => setRightSidebarOpen(!rightSidebarOpen)}
            audioClips={mockAudioClips}
          />
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {draggedClip && (
            <div className="bg-card border border-border rounded-lg p-3 shadow-lg opacity-90">
              <div className="text-sm font-medium">{draggedClip.name}</div>
              <div className="text-xs text-muted-foreground">{draggedClip.duration}s</div>
            </div>
          )}
        </DragOverlay>
      </div>
    </DndContext>
  );
};

// Mock data for audio clips
const mockAudioClips: AudioClip[] = [
  {
    id: '1',
    name: 'Narrator Intro',
    duration: 15.5,
    waveformData: [0.2, 0.4, 0.8, 0.6, 0.3, 0.7, 0.5, 0.9, 0.4, 0.2]
  },
  {
    id: '2',
    name: 'Chapter 1',
    duration: 32.1,
    waveformData: [0.3, 0.6, 0.4, 0.8, 0.5, 0.7, 0.6, 0.4, 0.8, 0.3]
  },
  {
    id: '3',
    name: 'Background Music',
    duration: 120.0,
    waveformData: [0.1, 0.2, 0.3, 0.2, 0.4, 0.3, 0.2, 0.1, 0.2, 0.3]
  },
  {
    id: '4',
    name: 'Interview Clip',
    duration: 45.7,
    waveformData: [0.5, 0.7, 0.6, 0.8, 0.4, 0.6, 0.7, 0.5, 0.3, 0.4]
  }
];