import React, { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  PenTool,
  Bot,
} from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader } from "./ui/card";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible";

interface LeftSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  selectedVideo?: File | null;
}

interface GeneratedClip {
  id: string;
  name: string;
  duration: number;
  status: string;
}

interface DraggableGeneratedClipProps {
  clip: GeneratedClip;
}

const DraggableGeneratedClip: React.FC<DraggableGeneratedClipProps> = ({
  clip,
}) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `generated-${clip.id}`,
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
      className={`flex items-center justify-between p-2 rounded-lg border border-border hover:bg-accent cursor-grab active:cursor-grabbing transition-all ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      <div className="flex items-center gap-2 flex-1">
        <Music className="h-4 w-4 text-muted-foreground" />
        <div className="flex-1">
          <p className="text-sm font-medium">{clip.name}</p>
          <p className="text-xs text-muted-foreground">{clip.duration}s</p>
        </div>
      </div>
      <Badge variant="outline" className="text-xs">
        {clip.status}
      </Badge>
    </div>
  );
};

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  isOpen,
  onToggle,
  selectedVideo,
}) => {
  const [projectInfoOpen, setProjectInfoOpen] = useState(true);
  const [activeTab, setActiveTab] = useState("script");
  const [scriptContent, setScriptContent] = useState("");

  const projectInfo = {
    name: "Ocean Documentary",
    size: "2.4 GB",
    editor: "John Doe",
    createdAt: "2024-01-15",
    lastModified: "2024-01-18",
  };

  const handleNameSave = () => {
    setIsEditingName(false);
  };

  const handleNameCancel = () => {
    setProjectName("Ocean Documentary"); // Reset to original
    setIsEditingName(false);
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
      {/* Header with toggle */}
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
        <h2 className="text-lg font-semibold text-sidebar-foreground">
          Project
        </h2>
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
        {/* Project Info Box */}
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
                  <span className="text-muted-foreground text-xs">
                    Last Modified:
                  </span>
                  <p className="font-medium text-xs">{lastModified}</p>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Tabs Section */}
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
                value={scriptContent}
                onChange={(e) => setScriptContent(e.target.value)}
                className="min-h-32 resize-none"
              />
              <Button className="w-full mt-3">Generate Voice</Button>
            </div>
          </TabsContent>

          <TabsContent value="ai" className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-3">
                Generate a script automatically
              </p>
              <Textarea
                placeholder="Describe what you want the AI to write about..."
                className="min-h-32 resize-none"
              />
              <Button className="w-full mt-3">Generate Script</Button>
            </div>
          </TabsContent>
        </Tabs>

        {/* Audio Clip Preview */}
        <Card>
          <CardHeader>
            <h3 className="text-sm font-medium">Generated Clips</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {mockGeneratedClips.map((clip) => (
                <DraggableGeneratedClip key={clip.id} clip={clip} />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const mockGeneratedClips = [
  { id: "1", name: "Introduction", duration: 15.5, status: "Ready" },
  { id: "2", name: "Chapter 1", duration: 32.1, status: "Processing" },
  { id: "3", name: "Conclusion", duration: 12.3, status: "Ready" },
];
