import { useState, useCallback, useEffect, useRef } from "react";
import { Toolbar } from "../components/Toolbar";
import { ImageCanvas } from "../components/ImageCanvas";
import { ClassificationTable } from "../components/ClassificationTable";
import { ResultsPanel } from "../components/ResultsPanel";
import { SelectionBox, AnalysisResult, ChartProfile, ComponentDefinition, ImageData as AppImageData } from "../types"; // Renamed ImageData to avoid conflict
import { analyzeImage } from "../utils/analysis";
import { useToast } from "@/hooks/use-toast";
import { chartProfiles } from "../utils/benchmarks";

const STORAGE_KEY = "data-ink-calculator-session";
const DEFAULT_INK_THRESHOLD = 30;
const DEFAULT_WAND_TOLERANCE = 30;

const Index = () => {
  const { toast } = useToast();

  // Image state
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageData, setImageData] = useState<ImageData | null>(null); // Actual ImageData
  const [appImageData, setAppImageData] = useState<AppImageData | null>(null); // App's ImageData type
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [isImageLoading, setIsImageLoading] = useState(false); // New loading state

  // Selection and analysis state
  const [selections, setSelections] = useState<SelectionBox[]>([]);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Tool state
  const [toolMode, setToolMode] = useState<"select" | "eyedropper" | "magicwand">("select");
  const [backgroundColor, setBackgroundColor] = useState({ r: 255, g: 255, b: 255 });

  // Thresholds State
  const [inkThreshold, setInkThreshold] = useState(DEFAULT_INK_THRESHOLD);
  const [magicWandTolerance, setMagicWandTolerance] = useState(DEFAULT_WAND_TOLERANCE);

  // Profile and component state
  const [selectedProfile, setSelectedProfile] = useState<ChartProfile | null>(chartProfiles[0]);
  const [currentComponent, setCurrentComponent] = useState<ComponentDefinition | null>(null);

  // Undo/Redo state
  const [history, setHistory] = useState<SelectionBox[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const isUpdatingFromHistory = useRef(false);

  // --- ORDER CORRECTION: Define handleUndo/handleRedo *before* the useEffect that uses them ---
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      isUpdatingFromHistory.current = true;
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setSelections(history[newIndex]); // Set to previous state
      setAnalysisResult(null); // Clear analysis result on undo/redo
    }
  }, [historyIndex, history]); // Dependencies


  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      isUpdatingFromHistory.current = true;
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setSelections(history[newIndex]); // Set to next state
      setAnalysisResult(null); // Clear analysis result on undo/redo
    }
  }, [historyIndex, history]); // Dependencies

  // Save to localStorage whenever relevant state changes
  useEffect(() => {
    if (imageUrl) {
      const session = {
        imageUrl,
        selections,
        backgroundColor,
        selectedProfileId: selectedProfile?.id,
        inkThreshold,
        magicWandTolerance,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [imageUrl, selections, backgroundColor, selectedProfile, inkThreshold, magicWandTolerance]);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const session = JSON.parse(saved);
        if (session.imageUrl) {
          if (session.backgroundColor) setBackgroundColor(session.backgroundColor);
          if (session.selectedProfileId) {
            const profile = chartProfiles.find(p => p.id === session.selectedProfileId);
            if (profile) setSelectedProfile(profile);
          }
          setInkThreshold(session.inkThreshold ?? DEFAULT_INK_THRESHOLD);
          setMagicWandTolerance(session.magicWandTolerance ?? DEFAULT_WAND_TOLERANCE);

          const loadImage = (url: string) => {
             setImageUrl(url);
             setIsImageLoading(true);
             if (session.selections && Array.isArray(session.selections)) {
                 setSelections(session.selections);
                 setHistory([session.selections]); // Initialize history correctly
                 setHistoryIndex(0);
             } else {
                 setSelections([]);
                 setHistory([[]]);
                 setHistoryIndex(0);
             }

             const img = new Image();
             img.onload = () => {
                 setImageDimensions({ width: img.width, height: img.height });
             };
             img.onerror = () => {
                 console.error("Failed to load image from restored session URL.");
                 toast({ title: "Session Restore Error", description: "Could not load the previous image.", variant: "destructive" });
                 handleClearAll();
             };
             img.src = url;
          };

          loadImage(session.imageUrl);

          toast({
            title: "Session restored",
            description: "Loading your previous image and selections...",
          });
        }
      } catch (error) {
        console.error("Failed to parse or restore session:", error);
        localStorage.removeItem(STORAGE_KEY);
      }
    }
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast]); // Run only once on mount, handleClearAll defined below won't change

  // Update history when selections change (not via undo/redo)
   useEffect(() => {
    if (!isUpdatingFromHistory.current && selections !== history[historyIndex]) {
        const newHistory = history.slice(0, historyIndex + 1);
        // Deep comparison might be too slow, rely on reference or shallow check if performance becomes an issue
        if (JSON.stringify(newHistory[newHistory.length - 1]) !== JSON.stringify(selections)) {
            newHistory.push(selections);
            setHistory(newHistory);
            setHistoryIndex(newHistory.length - 1);
        }
    }
    isUpdatingFromHistory.current = false;
}, [selections, history, historyIndex]);


  // Keyboard shortcuts useEffect (Now placed AFTER handleUndo/handleRedo)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
       if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
           return;
       }
      const isModifier = e.ctrlKey || e.metaKey;
      if (isModifier && !e.shiftKey && e.key === "z") {
        e.preventDefault();
        handleUndo();
      } else if (isModifier && e.shiftKey && (e.key === "z" || e.key === "Z")) {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleUndo, handleRedo]); // Dependencies are correct here

  // Handles new image upload
  const handleImageUpload = useCallback((file: File) => {
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    setIsImageLoading(true);
    setSelections([]);
    setAnalysisResult(null);
    setAppImageData(null);
    setImageData(null);
    setBackgroundColor({ r: 255, g: 255, b: 255 });
    setInkThreshold(DEFAULT_INK_THRESHOLD);
    setMagicWandTolerance(DEFAULT_WAND_TOLERANCE);
    setHistory([[]]);
    setHistoryIndex(0);

    const img = new Image();
    img.onload = () => {
      setImageDimensions({ width: img.width, height: img.height });
    };
    img.onerror = () => {
      console.error("Failed to load uploaded image.");
      toast({ title: "Image Load Error", description: "Could not load the selected file.", variant: "destructive" });
      setImageUrl(null);
      setIsImageLoading(false);
    }
    img.src = url;

    toast({
      title: "Image loading",
      description: "Processing image for analysis...",
    });
  }, [toast]);

  // Callback from ImageCanvas when ImageData is ready
  const handleImageReady = useCallback((data: ImageData | null, bitmap: ImageBitmap | null) => {
     if (data && bitmap) {
        setImageData(data);
        setAppImageData({
            url: imageUrl!,
            width: data.width,
            height: data.height,
            bitmap: bitmap,
        });
        setIsImageLoading(false);
        toast({
            title: "Image ready",
            description: "You can now draw selection boxes.",
        });
     } else {
        // Handle the case where image loading failed in ImageCanvas
        setIsImageLoading(false);
        // Optionally show an error toast here as well, though ImageCanvas might handle it too
     }
  }, [imageUrl, toast]);

  // Runs the analysis
  const handleRunAnalysis = useCallback(() => {
    if (!imageData) {
      toast({ title: "Cannot analyze", description: "Image data is not ready yet.", variant: "destructive" });
      return;
    }
     if (selections.length === 0) {
      toast({ title: "Cannot analyze", description: "Please draw at least one selection box.", variant: "destructive" });
      return;
    }
    setIsAnalyzing(true);
    setTimeout(() => {
      try {
        const result = analyzeImage(imageData, selections, backgroundColor, inkThreshold);
        setAnalysisResult(result);
        toast({
          title: "Analysis complete",
          description: `Efficiency: ${(result.efficiencyRatio * 100).toFixed(1)}%. Found ${result.totalDataPixels.toLocaleString()} data pixels.`,
        });
      } catch (error) {
        console.error("Analysis error:", error);
        toast({ title: "Analysis failed", description: error instanceof Error ? error.message : "An unknown error occurred.", variant: "destructive" });
        setAnalysisResult(null);
      } finally {
        setIsAnalyzing(false);
      }
    }, 50);
  }, [imageData, selections, backgroundColor, inkThreshold, toast]);

  // Handles background color sampling
  const handleBackgroundColorSample = useCallback((color: { r: number; g: number; b: number }) => {
    setBackgroundColor(color);
    setToolMode("select");
    toast({ title: "Background color updated", description: `Set to RGB(${color.r}, ${color.g}, ${color.b})` });
     setAnalysisResult(null); // Clear results as background change affects analysis
  }, [toast]);

  // Exports selections and settings
  const handleExportSelections = useCallback(() => {
     if (selections.length === 0 && !imageUrl) { // Check if there's anything to export
        toast({ title: "Nothing to Export", description: "Upload an image or draw selections first.", variant: "destructive" });
        return;
     }
    const data = {
      version: "1.1",
      imageUrl: imageUrl,
      imageDimensions: imageDimensions,
      selections,
      backgroundColor,
      inkThreshold,
      magicWandTolerance,
      selectedProfileId: selectedProfile?.id,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const filename = `data-ink-session-${new Date().toISOString().substring(0, 10)}.json`;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: "Session exported", description: `Saved settings${selections.length > 0 ? ` and ${selections.length} selections` : ''} to ${filename}` });
  }, [selections, backgroundColor, inkThreshold, magicWandTolerance, selectedProfile, imageUrl, imageDimensions, toast]);

 // Imports selections and settings
  const handleImportSelections = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (!data || typeof data !== 'object') throw new Error("Invalid file content.");

        let loadedSelections: SelectionBox[] = [];
        if (data.selections && Array.isArray(data.selections)) {
           loadedSelections = data.selections;
        }

        let urlToLoad = imageUrl; // Start with current URL
        let dimensions = imageDimensions;

        // Check if import data includes an image URL
        if (data.imageUrl && typeof data.imageUrl === 'string') {
            urlToLoad = data.imageUrl;
            // Reset state if the image URL is different or no image is currently loaded
            if (urlToLoad !== imageUrl || !imageUrl) {
                setImageUrl(urlToLoad);
                setIsImageLoading(true);
                setAnalysisResult(null);
                setAppImageData(null);
                setImageData(null);
                setSelections([]); // Clear current selections
                setHistory([[]]);
                setHistoryIndex(0);
                 // Reset dimensions until new image loads
                dimensions = { width: 0, height: 0 };
                setImageDimensions(dimensions);

                const img = new Image();
                img.onload = () => setImageDimensions({ width: img.width, height: img.height });
                img.onerror = () => { console.error("Failed to load image from imported session."); toast({ title: "Import Error", description: "Could not load image specified in file.", variant: "destructive" }); handleClearAll(); };
                img.src = urlToLoad;
            }
        }
         // Restore dimensions if present in file and match the current/loading image
         if (data.imageDimensions && data.imageDimensions.width && data.imageDimensions.height && urlToLoad === imageUrl) {
            dimensions = data.imageDimensions;
            setImageDimensions(dimensions);
         }


        if (!urlToLoad) {
            throw new Error("Cannot import selections without an active image or an image URL in the file.");
        }

        setBackgroundColor(data.backgroundColor ?? backgroundColor);
        setInkThreshold(data.inkThreshold ?? inkThreshold);
        setMagicWandTolerance(data.magicWandTolerance ?? magicWandTolerance);

        if (data.selectedProfileId) {
            const profile = chartProfiles.find(p => p.id === data.selectedProfileId);
            setSelectedProfile(profile ?? selectedProfile);
        }

        // Apply selections (might happen slightly after image starts loading if URL changed)
        setSelections(loadedSelections);
        setHistory([loadedSelections]);
        setHistoryIndex(0);
        setAnalysisResult(null);

        toast({
          title: "Session imported",
          description: `Loaded settings${loadedSelections.length > 0 ? ` and ${loadedSelections.length} selections` : ''}.${urlToLoad !== imageUrl ? ' Loading image...' : ''}`,
        });

      } catch (error) {
        console.error("Import failed:", error);
        toast({ title: "Import failed", description: error instanceof Error ? error.message : "Could not read/parse JSON.", variant: "destructive" });
      }
    };
    reader.onerror = () => {
         toast({ title: "Import failed", description: "Could not read the selected file.", variant: "destructive" });
    }
    reader.readAsText(file);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast, imageUrl, backgroundColor, inkThreshold, magicWandTolerance, selectedProfile, imageDimensions]); // Added imageDimensions


  // Clear All state function
   const handleClearAll = useCallback(() => {
        // Revoke previous object URL if it exists to prevent memory leaks
        if (imageUrl && imageUrl.startsWith('blob:')) {
            URL.revokeObjectURL(imageUrl);
        }

        setImageUrl(null);
        setIsImageLoading(false);
        setSelections([]);
        setAnalysisResult(null);
        setAppImageData(null);
        setImageData(null);
        setImageDimensions({ width: 0, height: 0 }); // Reset dimensions
        setBackgroundColor({ r: 255, g: 255, b: 255 });
        setInkThreshold(DEFAULT_INK_THRESHOLD);
        setMagicWandTolerance(DEFAULT_WAND_TOLERANCE);
        setHistory([[]]);
        setHistoryIndex(0);
        setSelectedProfile(chartProfiles[0]);
        setCurrentComponent(null);
        localStorage.removeItem(STORAGE_KEY);
         toast({ title: "Workspace Cleared", description: "Image, selections, and settings have been reset."});
    }, [imageUrl, toast]); // Need imageUrl to revoke blob


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
        inkThreshold={inkThreshold}
        onInkThresholdChange={setInkThreshold}
        magicWandTolerance={magicWandTolerance}
        onMagicWandToleranceChange={setMagicWandTolerance}
        selectedProfile={selectedProfile}
        onProfileChange={setSelectedProfile}
        currentComponent={currentComponent}
        onComponentSelect={setCurrentComponent}
         onClearAll={handleClearAll}
      />

      <main className="flex-1 container mx-auto px-4 sm:px-6 py-4 md:py-6 overflow-hidden flex flex-col"> {/* Use flex-col */}
        {/* Adjusted height calculation, ensure grid takes available space */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 xl:gap-6 flex-1 min-h-0"> {/* Use flex-1 and min-h-0 */}

          {/* Canvas */}
          <div className="lg:col-span-2 flex flex-col min-h-0">
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
              magicWandTolerance={magicWandTolerance}
              isImageLoading={isImageLoading}
            />
          </div>

          {/* Right Panel */}
          <div className="flex flex-col gap-4 xl:gap-6 overflow-y-auto min-h-0 pr-1 scrollbar-thin scrollbar-thumb-muted-foreground/50 scrollbar-track-transparent"> {/* Added scrollbar styling */}
            <div>
              <h2 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3 px-1 sticky top-0 bg-background/80 backdrop-blur-sm z-10 py-1">Classifications</h2> {/* Make header sticky */}
              <ClassificationTable
                selections={selections}
                onSelectionsChange={setSelections}
              />
            </div>

            <div className="mt-2"> {/* Added margin top */}
              <h2 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3 px-1 sticky top-0 bg-background/80 backdrop-blur-sm z-10 py-1">Results & Comparison</h2> {/* Make header sticky */}
              <ResultsPanel
                result={analysisResult}
                selectedProfile={selectedProfile}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;