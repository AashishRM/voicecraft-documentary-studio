import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, PenTool, Bot, Edit2, Check, X, Music, Trash2, Play, Pause } from 'lucide-react';
import { formatDuration } from '@/lib/timeUtils';
import { useDraggable } from '@dnd-kit/core';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader } from './ui/card';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { Input } from './ui/input';
import { APISendMessage } from '@/api/message';
import { APISendPrompt } from '@/api/prompt';

interface LeftSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  selectedVideo?: File | null;
  generatedClips: GeneratedClip[];
  onDeleteGeneratedClip: (clipId: string) => void;
  onAddGeneratedClip: (clip: GeneratedClip) => void;
}

interface GeneratedClip {
  id: string;
  name: string;
  duration: number;
  status: string;
  audioUrl?: string;
}

interface DraggableGeneratedClipProps {
  clip: GeneratedClip;
  onDelete: (clipId: string) => void;
}

const DraggableGeneratedClip: React.FC<DraggableGeneratedClipProps> = ({ clip, onDelete }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (clip.audioUrl) {
      const audioElement = new Audio(clip.audioUrl);
      audioElement.addEventListener('ended', () => setIsPlaying(false));
      setAudio(audioElement);
      
      return () => {
        audioElement.pause();
        audioElement.src = '';
      };
    }
  }, [clip.audioUrl]);

  const togglePlayback = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play();
      setIsPlaying(true);
    }
  };

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `generated-${clip.id}`,
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
      className={`flex items-center justify-between p-2 rounded-lg border border-border hover:bg-accent cursor-grab active:cursor-grabbing transition-all ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      <div className="flex items-center gap-2 flex-1">
        <Music className="h-4 w-4 text-muted-foreground" />
        <div className="flex-1">
          <p className="text-sm font-medium">{clip.name}</p>
          <p className="text-xs text-muted-foreground">{formatDuration(clip.duration)}</p>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Badge variant="outline" className="text-xs">
          {clip.status}
        </Badge>
        {clip.audioUrl && clip.status === 'Ready' && (
          <Button
            variant="ghost"
            size="sm"
            className="p-1 h-6 w-6"
            onClick={togglePlayback}
          >
            {isPlaying ? (
              <Pause className="h-3 w-3" />
            ) : (
              <Play className="h-3 w-3" />
            )}
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="p-1 h-6 w-6 text-destructive hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(clip.id);
          }}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
};

export const LeftSidebar: React.FC<LeftSidebarProps> = ({ 
  isOpen, 
  onToggle, 
  selectedVideo, 
  generatedClips, 
  onDeleteGeneratedClip,
  onAddGeneratedClip 
}) => {
  const [projectInfoOpen, setProjectInfoOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('script');
  const [scriptContent, setScriptContent] = useState('');
  const [promptContent, setPromptContent] = useState('');
  const [newMessage, setNewMessage] = useState("");
  const [newPrompt, setNewPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingEditor, setIsEditingEditor] = useState(false);
  const [projectName, setProjectName] = useState('Ocean Documentary');
  const [editorName, setEditorName] = useState('John Doe');
  const [createdAt] = useState(() => new Date().toISOString().split('T')[0]);
  const [lastModified, setLastModified] = useState(() => new Date().toISOString().split('T')[0]);

  const getAudioDuration = (audioBlob: Blob): Promise<number> => {
    return new Promise((resolve) => {
      const audio = new Audio();
      const url = URL.createObjectURL(audioBlob);
      
      audio.addEventListener('loadedmetadata', () => {
        resolve(audio.duration);
        URL.revokeObjectURL(url);
      });
      
      audio.addEventListener('error', () => {
        resolve(0);
        URL.revokeObjectURL(url);
      });
      
      audio.src = url;
    });
  };

  const sendMessage = async () => {
    const msgText = newMessage?.toString().trim();
    if (!msgText) return;

    setIsGenerating(true);
    
    try {
      const audioBlob = await APISendMessage({ text: msgText });
      
      // Get duration from the audio blob
      const duration = await getAudioDuration(audioBlob);
      
      // Create object URL for the audio blob
      const audioUrl = URL.createObjectURL(audioBlob);
      
      // Create new generated clip
      const newClip: GeneratedClip = {
        id: `clip-${Date.now()}`,
        name: msgText.substring(0, 30) + (msgText.length > 30 ? '...' : ''),
        duration: duration,
        status: 'Ready',
        audioUrl: audioUrl
      };
      console.log("22");
      onAddGeneratedClip(newClip);
      setScriptContent(prev => prev + msgText + '\n\n');
      setNewMessage("");
    } catch (err) {
      console.error("Failed to generate voice:", err);
      alert("Failed to generate voice. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const sendPrompt = async () => {
    const promptText = newPrompt?.toString().trim();
    if (!promptText) return;

    setIsGenerating(true);
    
    try {
      const response = await APISendPrompt({ text: promptText });
      
      setPromptContent(prev => prev + response + '\n\n');
      setNewMessage(response); // Populate script tab with generated text
      setNewPrompt("");
      setActiveTab('script'); // Switch to script tab
    } catch (err) {
      console.error("Failed to generate script:", err);
      alert("Failed to generate script. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const fileSize = selectedVideo ? formatFileSize(selectedVideo.size) : '0 B';

  useEffect(() => {
    if (scriptContent) {
      setLastModified(new Date().toISOString().split('T')[0]);
    }
  }, [scriptContent]);

  useEffect(() => {
    setLastModified(new Date().toISOString().split('T')[0]);
  }, [projectName, editorName]);

  const handleNameSave = () => {
    setIsEditingName(false);
  };

  const handleNameCancel = () => {
    setProjectName('Ocean Documentary');
    setIsEditingName(false);
  };

  const handleEditorSave = () => {
    setIsEditingEditor(false);
  };

  const handleEditorCancel = () => {
    setEditorName('John Doe');
    setIsEditingEditor(false);
  };

  if (!isOpen) {
    return (
      <div className="w-12 h-full bg-sidebar border-r border-sidebar-border flex flex-col">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className="m-2 p-2 h-8 w-8"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="w-80 h-full bg-sidebar border-r border-sidebar-border flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
        <h2 className="text-lg font-semibold text-sidebar-foreground">Project</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className="p-2 h-8 w-8"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <Collapsible open={projectInfoOpen} onOpenChange={setProjectInfoOpen}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer pb-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">Project Info</h3>
                  {projectInfoOpen ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0 space-y-2">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Name:</span>
                    {isEditingName ? (
                      <div className="flex items-center gap-1 mt-1">
                        <Input
                          value={projectName}
                          onChange={(e) => setProjectName(e.target.value)}
                          className="h-6 text-xs"
                          autoFocus
                        />
                        <Button
                          size="sm"
                          onClick={handleNameSave}
                          className="h-6 w-6 p-0"
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleNameCancel}
                          className="h-6 w-6 p-0"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between group">
                        <p className="font-medium">{projectName}</p>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setIsEditingName(true)}
                          className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Size:</span>
                    <p className="font-medium">{fileSize}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Editor:</span>
                    {isEditingEditor ? (
                      <div className="flex items-center gap-1 mt-1">
                        <Input
                          value={editorName}
                          onChange={(e) => setEditorName(e.target.value)}
                          className="h-6 text-xs"
                          autoFocus
                        />
                        <Button
                          size="sm"
                          onClick={handleEditorSave}
                          className="h-6 w-6 p-0"
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleEditorCancel}
                          className="h-6 w-6 p-0"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between group">
                        <p className="font-medium">{editorName}</p>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setIsEditingEditor(true)}
                          className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Created:</span>
                    <p className="font-medium">{createdAt}</p>
                  </div>
                </div>
                <div className="pt-1">
                  <span className="text-muted-foreground text-xs">Last Modified:</span>
                  <p className="font-medium text-xs">{lastModified}</p>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="script" className="flex items-center gap-2">
              <PenTool className="h-4 w-4" />
              <span className="hidden sm:inline">Script</span>
            </TabsTrigger>
            <TabsTrigger value="ai" className="flex items-center gap-2">
              <Bot className="h-4 w-4" />
              <span className="hidden sm:inline">AI</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="script" className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-3">
                Write or edit your script manually
              </p>
              <Textarea
                placeholder="Enter your script here..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                className="min-h-32 resize-none"
                disabled={isGenerating}
              />
              <Button 
                className="w-full mt-3" 
                onClick={sendMessage}
                disabled={isGenerating || !newMessage.trim()}
              >
                {isGenerating ? 'Generating...' : 'Generate Voice'}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="ai" className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-3">
                Generate a script automatically
              </p>
              <Textarea
                value={newPrompt}
                onChange={(e) => setNewPrompt(e.target.value)}
                placeholder="Describe what you want the AI to write about..."
                className="min-h-32 resize-none"
                disabled={isGenerating}
              />
              <Button 
                className="w-full mt-3" 
                variant="secondary" 
                onClick={sendPrompt}
                disabled={isGenerating || !newPrompt.trim()}
              >
                {isGenerating ? 'Generating...' : 'Generate Script'}
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        <Card>
          <CardHeader>
            <h3 className="text-sm font-medium">Generated Clips</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {generatedClips.length > 0 ? (
                generatedClips.map((clip) => (
                  <DraggableGeneratedClip
                    key={clip.id}
                    clip={clip}
                    onDelete={onDeleteGeneratedClip}
                  />
                ))
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  <Music className="h-6 w-6 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No clips generated yet</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};