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
import { APIChatWithHuggingFace } from '@/api/chatbot';

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
  const [newMessage, setNewMessage] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [huggingFaceApiKey, setHuggingFaceApiKey] = useState<string>("");
  const chatMessagesEndRef = React.useRef<HTMLDivElement>(null);
  const lastRequestTimeRef = React.useRef<number>(0);
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

  // Load Hugging Face API key from environment variable or localStorage on mount
  useEffect(() => {
    const apiKey = 
      import.meta.env.VITE_HUGGINGFACE_API_KEY || 
      localStorage.getItem('huggingface_api_key') || 
      '';
    setHuggingFaceApiKey(apiKey);
  }, []);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isChatLoading]);

  const sendChatMessage = async () => {
    const messageText = chatInput.trim();
    if (!messageText) return;

    // Rate limiting: Prevent requests faster than once per 2 seconds
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTimeRef.current;
    const minDelay = 2000; // 2 seconds between requests
    
    if (timeSinceLastRequest < minDelay && lastRequestTimeRef.current > 0) {
      const waitTime = Math.ceil((minDelay - timeSinceLastRequest) / 1000);
      alert(`Please wait ${waitTime} more second(s) before sending another message to avoid rate limits.`);
      return;
    }

    // Get API key from state, environment variable, or localStorage
    const apiKey = 
      huggingFaceApiKey || 
      import.meta.env.VITE_HUGGINGFACE_API_KEY || 
      localStorage.getItem('huggingface_api_key') || 
      '';

    if (!apiKey) {
      alert("Please set your Hugging Face API key:\n1. Add VITE_HUGGINGFACE_API_KEY to your .env file, or\n2. Set it in localStorage as 'huggingface_api_key'");
      return;
    }

    // Update last request time
    lastRequestTimeRef.current = now;

    // Add user message to chat
    const userMessage = { role: 'user' as const, content: messageText };
    const updatedMessages = [...chatMessages, userMessage];
    setChatMessages(updatedMessages);
    setChatInput("");
    setIsChatLoading(true);

    try {
      // Get response from Hugging Face
      const response = await APIChatWithHuggingFace(updatedMessages, apiKey);
      
      // Add assistant response to chat
      const assistantMessage = { role: 'assistant' as const, content: response };
      setChatMessages([...updatedMessages, assistantMessage]);
    } catch (error: any) {
      console.error("Chatbot error:", error);
      const errorMessage = { 
        role: 'assistant' as const, 
        content: `त्रुटि: ${error.message || 'च्याटबटबाट प्रतिक्रिया प्राप्त गर्न असफल भयो।'}` 
      };
      setChatMessages([...updatedMessages, errorMessage]);
    } finally {
      setIsChatLoading(false);
    }
  };

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
                Chat with AI - Get elaborate responses in Devanagari Nepali
              </p>
              
              {/* Chat Messages Display */}
              <div className="border rounded-lg p-3 mb-3 bg-background min-h-[200px] max-h-[300px] overflow-y-auto space-y-3">
                {chatMessages.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Start a conversation with the chatbot...
                  </p>
                ) : (
                  chatMessages.map((msg, index) => (
                    <div
                      key={index}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-2 text-sm ${
                          msg.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                  ))
                )}
                {isChatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-lg p-2 text-sm text-muted-foreground">
                      <p>प्रतिक्रिया आउँदैछ...</p>
                    </div>
                  </div>
                )}
                <div ref={chatMessagesEndRef} />
              </div>

              {/* Chat Input */}
              <div className="space-y-2">
                <Textarea
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Type your message here in English"
                  className="min-h-24 resize-none"
                  disabled={isChatLoading}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendChatMessage();
                    }
                  }}
                />
                <div className="flex gap-2">
                  <Button 
                    className="flex-1" 
                    variant="secondary" 
                    onClick={sendChatMessage}
                    disabled={isChatLoading || !chatInput.trim() || !(huggingFaceApiKey || import.meta.env.VITE_HUGGINGFACE_API_KEY)}
                  >
                    {isChatLoading ? 'प्रतिक्रिया आउँदैछ...' : 'Send the prompt'}
                  </Button>
                  {chatMessages.length > 0 && (
                    <Button 
                      variant="outline" 
                      onClick={() => setChatMessages([])}
                      disabled={isChatLoading}
                    >
                      Clear
                    </Button>
                  )}
                </div>
                {!(huggingFaceApiKey || import.meta.env.VITE_HUGGINGFACE_API_KEY) && (
                  <p className="text-xs text-destructive">
                    Warning: Hugging Face API key not found. Please set VITE_HUGGINGFACE_API_KEY in your .env file or store it in localStorage as 'huggingface_api_key'
                  </p>
                )}
              </div>
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