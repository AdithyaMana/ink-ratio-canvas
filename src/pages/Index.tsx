import { useState, useCallback, useEffect, useRef } from "react";
import { Toolbar } from "../components/Toolbar";
import { ImageCanvas } from "../components/ImageCanvas";
import { ClassificationTable } from "../components/ClassificationTable";
import { ResultsPanel } from "../components/ResultsPanel";
import { SelectionBox, AnalysisResult, RatioType, ChartProfile, ComponentDefinition } from "../types";
import { analyzeImage } from "../utils/analysis";
import { useToast } from "@/hooks/use-toast";
import { chartProfiles } from "../utils/benchmarks";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const STORAGE_KEY = "data-ink-calculator-session";

const Index = () => {
  const { toast } = useToast();
  
  // Image state
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageData, setImageData] = useState<ImageData | null>(null);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  
  // Selection and analysis state
  const [selections, setSelections] = useState<SelectionBox[]>([]);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [ratioType, setRatioType] = useState<RatioType>("density");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Tool state
  const [toolMode, setToolMode] = useState<"select" | "eyedropper" | "magicwand">("select");
  const [backgroundColor, setBackgroundColor] = useState({ r: 255, g: 255, b: 255 });
  
  // Profile and component state
  const [selectedProfile, setSelectedProfile] = useState<ChartProfile | null>(chartProfiles[0]);
  const [currentComponent, setCurrentComponent] = useState<ComponentDefinition | null>(null);

  // Undo/Redo state
  const [history, setHistory] = useState<SelectionBox[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const isUpdatingFromHistory = useRef(false);

  // Hover state for bi-directional highlighting
  const [hoveredLayerId, setHoveredLayerId] = useState<string | null>(null);

  // Save to localStorage whenever state changes
  useEffect(() => {
    if (imageUrl && selections.length > 0) {
      const session = {
        imageUrl,
        selections,
        backgroundColor,
        selectedProfileId: selectedProfile?.id,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    }
  }, [imageUrl, selections, backgroundColor, selectedProfile]);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const session = JSON.parse(saved);
        if (session.imageUrl && session.selections) {
          setImageUrl(session.imageUrl);
          setSelections(session.selections);
          if (session.backgroundColor) {
            setBackgroundColor(session.backgroundColor);
          }
          if (session.selectedProfileId) {
            const profile = chartProfiles.find(p => p.id === session.selectedProfileId);
            if (profile) setSelectedProfile(profile);
          }

          // Load image dimensions
          const img = new Image();
          img.onload = () => {
            setImageDimensions({ width: img.width, height: img.height });
          };
          img.src = session.imageUrl;

          toast({
            title: "Session restored",
            description: "Your previous work has been loaded",
          });
        }
      } catch (error) {
        console.error("Failed to restore session:", error);
      }
    }
  }, [toast]);

  // Update history when selections change (except when undoing/redoing)
  useEffect(() => {
    if (!isUpdatingFromHistory.current && selections.length >= 0) {
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push([...selections]);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    }
    isUpdatingFromHistory.current = false;
  }, [selections]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === "z") {
        e.preventDefault();
        handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "z") {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [historyIndex, history]);

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      isUpdatingFromHistory.current = true;
      setHistoryIndex(historyIndex - 1);
      setSelections(history[historyIndex - 1]);
    }
  }, [historyIndex, history]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      isUpdatingFromHistory.current = true;
      setHistoryIndex(historyIndex + 1);
      setSelections(history[historyIndex + 1]);
    }
  }, [historyIndex, history]);

  const handleImageUpload = useCallback((file: File) => {
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    setSelections([]);
    setAnalysisResult(null);
    setBackgroundColor({ r: 255, g: 255, b: 255 });
    setHistory([[]]);
    setHistoryIndex(0);

    // Get image dimensions
    const img = new Image();
    img.onload = () => {
      setImageDimensions({ width: img.width, height: img.height });
    };
    img.src = url;

    toast({
      title: "Image loaded",
      description: "Draw selection boxes to begin analysis",
    });
  }, [toast]);

  const handleImageReady = useCallback((data: ImageData) => {
    setImageData(data);
  }, []);

  const handleRunAnalysis = useCallback(() => {
    if (!imageData || selections.length === 0) {
      toast({
        title: "Cannot analyze",
        description: "Please upload an image and draw at least one selection",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);

    // Run analysis in next tick to allow UI update
    setTimeout(() => {
      try {
        const result = analyzeImage(imageData, selections, backgroundColor);
        setAnalysisResult(result);
        
        toast({
          title: "Analysis complete",
          description: `Analyzed ${result.layers.length} layers with ${result.totalDataPixels.toLocaleString()} data pixels`,
        });
      } catch (error) {
        console.error("Analysis error:", error);
        toast({
          title: "Analysis failed",
          description: "An error occurred during analysis",
          variant: "destructive",
        });
      } finally {
        setIsAnalyzing(false);
      }
    }, 100);
  }, [imageData, selections, backgroundColor, toast]);

  const handleBackgroundColorSample = useCallback((color: { r: number; g: number; b: number }) => {
    setBackgroundColor(color);
    setToolMode("select");
    toast({
      title: "Background color sampled",
      description: `RGB(${color.r}, ${color.g}, ${color.b})`,
    });
  }, [toast]);

  const handleExportSelections = useCallback(() => {
    const data = {
      version: "1.0",
      selections,
      backgroundColor,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `data-ink-selections-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Selections exported",
      description: "Your selections have been saved to a JSON file",
    });
  }, [selections, backgroundColor, toast]);

  const handleImportSelections = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (data.selections && Array.isArray(data.selections)) {
          setSelections(data.selections);
          if (data.backgroundColor) {
            setBackgroundColor(data.backgroundColor);
          }
          toast({
            title: "Selections imported",
            description: `Loaded ${data.selections.length} selections`,
          });
        } else {
          throw new Error("Invalid format");
        }
      } catch (error) {
        toast({
          title: "Import failed",
          description: "Invalid JSON file format",
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);
  }, [toast]);

  const handleClearSelections = useCallback(() => {
    setSelections([]);
    setAnalysisResult(null);
    toast({
      title: "Selections cleared",
      description: "All selections have been removed",
    });
  }, [toast]);

  const handleDeleteSelected = useCallback((ids: Set<string>) => {
    setSelections(prev => prev.filter(sel => !ids.has(sel.id)));
    toast({
      title: "Selections deleted",
      description: `Removed ${ids.size} selection(s)`,
    });
  }, [toast]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Toolbar
        onImageUpload={handleImageUpload}
        onRunAnalysis={handleRunAnalysis}
        hasImage={!!imageUrl}
        hasSelections={selections.length > 0}
        isAnalyzing={isAnalyzing}
        toolMode={toolMode}
        onToolModeChange={setToolMode}
        onExportSelections={handleExportSelections}
        onImportSelections={handleImportSelections}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        backgroundColor={backgroundColor}
        selectedProfile={selectedProfile}
        onProfileChange={setSelectedProfile}
        currentComponent={currentComponent}
        onComponentSelect={setCurrentComponent}
        onClearSelections={handleClearSelections}
      />

      <main className="flex-1 container mx-auto px-6 py-6">
        <ResizablePanelGroup direction="horizontal" className="h-[calc(100vh-140px)] w-full">
          {/* Canvas Panel */}
          <ResizablePanel defaultSize={65} minSize={40}>
            <ImageCanvas
              imageUrl={imageUrl}
              imageWidth={imageDimensions.width}
              imageHeight={imageDimensions.height}
              selections={selections}
              onSelectionsChange={setSelections}
              onImageReady={handleImageReady}
              toolMode={toolMode}
              onBackgroundColorSample={handleBackgroundColorSample}
              currentComponent={currentComponent}
              hoveredLayerId={hoveredLayerId}
              onHoverLayer={setHoveredLayerId}
            />
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Analysis Hub Panel */}
          <ResizablePanel defaultSize={35} minSize={25}>
            <div className="h-full flex flex-col">
              <Tabs defaultValue="layers" className="flex-1 flex flex-col">
                <TabsList className="mx-4 mt-4">
                  <TabsTrigger value="layers" className="flex-1">Layers</TabsTrigger>
                  <TabsTrigger value="results" className="flex-1">Results</TabsTrigger>
                </TabsList>
                
                <TabsContent value="layers" className="flex-1 overflow-y-auto px-4 pb-4">
                  <ClassificationTable
                    selections={selections}
                    onSelectionsChange={setSelections}
                    hoveredLayerId={hoveredLayerId}
                    onHoverLayer={setHoveredLayerId}
                    onDeleteSelected={handleDeleteSelected}
                  />
                </TabsContent>
                
                <TabsContent value="results" className="flex-1 overflow-y-auto px-4 pb-4">
                  <ResultsPanel 
                    result={analysisResult} 
                    ratioType={ratioType}
                    onRatioTypeChange={setRatioType}
                    selectedProfile={selectedProfile}
                  />
                </TabsContent>
              </Tabs>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </main>
    </div>
  );
};

export default Index;
