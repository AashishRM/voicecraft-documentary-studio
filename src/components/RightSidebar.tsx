import React, { useState, useRef } from "react";
import { ChevronLeft, ChevronRight, Search, Music, Upload } from "lucide-react";
import { useDraggable } from "@dnd-kit/core";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader } from "./ui/card";
import { Input } from "./ui/input";
import { AudioClip } from "./DocumentaryStudio";

interface RightSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  audioClips: AudioClip[];
  onAudioUpload: (files: FileList) => void;
}

interface DraggableAudioClipProps {
  clip: AudioClip;
}

const DraggableAudioClip: React.FC<DraggableAudioClipProps> = ({ clip }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: clip.id,
    });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`p-3 rounded-lg border border-border hover:bg-accent cursor-grab active:cursor-grabbing transition-all ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0">
          <Music className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{clip.name}</p>
          <p className="text-xs text-muted-foreground">{clip.duration}s</p>

          {/* Waveform Preview */}
          <div className="flex items-end gap-px mt-2 h-8">
            {clip.waveformData.map((height, index) => (
              <div
                key={index}
                className="bg-primary/60 w-1 rounded-sm"
                style={{ height: `${height * 100}%` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export const RightSidebar: React.FC<RightSidebarProps> = ({
  isOpen,
  onToggle,
  audioClips,
  onAudioUpload,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      onAudioUpload(files);
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const filteredClips = audioClips.filter((clip) =>
    clip.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) {
    return (
      <div className="w-12 h-full bg-sidebar border-l border-sidebar-border flex flex-col">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className="m-2 p-2 h-8 w-8"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="w-80 h-full bg-sidebar border-l border-sidebar-border flex flex-col">
      {/* Header with toggle */}
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
        <h2 className="text-lg font-semibold text-sidebar-foreground">
          Audio Library
        </h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className="p-2 h-8 w-8"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {/* Search/Filter Bar */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search audio clips..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Upload Button */}
        <Button onClick={triggerFileUpload} className="w-full mb-4">
          <Upload className="h-4 w-4 mr-2" />
          Import Audio Files
        </Button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          multiple
          accept="audio/*"
          className="hidden"
        />

        {/* Audio Clip Library */}
        <Card>
          <CardHeader>
            <h3 className="text-sm font-medium">
              Available Clips ({filteredClips.length})
            </h3>
            <p className="text-xs text-muted-foreground">
              Drag clips to the timeline below
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto">
              {filteredClips.length > 0 ? (
                filteredClips.map((clip) => (
                  <DraggableAudioClip key={clip.id} clip={clip} />
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Music className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No clips found</p>
                  <p className="text-xs">Try adjusting your search</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
