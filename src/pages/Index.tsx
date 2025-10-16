import { useState, useCallback } from "react";
import { Toolbar } from "../components/Toolbar";
import { ImageCanvas } from "../components/ImageCanvas";
import { ClassificationTable } from "../components/ClassificationTable";
import { ResultsPanel } from "../components/ResultsPanel";
import { SelectionBox, AnalysisResult, RatioType } from "../types";
import { analyzeImage } from "../utils/analysis";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageData, setImageData] = useState<ImageData | null>(null);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [selections, setSelections] = useState<SelectionBox[]>([]);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [ratioType, setRatioType] = useState<RatioType>("density");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { toast } = useToast();

  const handleImageUpload = useCallback((file: File) => {
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    setSelections([]);
    setAnalysisResult(null);

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
        const result = analyzeImage(imageData, selections);
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
  }, [imageData, selections, toast]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Toolbar
        onImageUpload={handleImageUpload}
        onRunAnalysis={handleRunAnalysis}
        hasImage={!!imageUrl}
        hasSelections={selections.length > 0}
        isAnalyzing={isAnalyzing}
      />

      <main className="flex-1 container mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-140px)]">
          {/* Canvas - Takes up 2 columns on large screens */}
          <div className="lg:col-span-2 flex">
            <ImageCanvas
              imageUrl={imageUrl}
              imageWidth={imageDimensions.width}
              imageHeight={imageDimensions.height}
              selections={selections}
              onSelectionsChange={setSelections}
              onImageReady={handleImageReady}
            />
          </div>

          {/* Right Panel - Classifications and Results */}
          <div className="flex flex-col gap-6 overflow-y-auto">
            <div>
              <h2 className="text-lg font-semibold mb-3">Classifications</h2>
              <ClassificationTable
                selections={selections}
                onSelectionsChange={setSelections}
              />
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-3">Results</h2>
              <ResultsPanel
                result={analysisResult}
                ratioType={ratioType}
                onRatioTypeChange={setRatioType}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
