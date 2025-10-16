import { Upload, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ToolbarProps {
  onImageUpload: (file: File) => void;
  onRunAnalysis: () => void;
  hasImage: boolean;
  hasSelections: boolean;
  isAnalyzing: boolean;
}

export function Toolbar({
  onImageUpload,
  onRunAnalysis,
  hasImage,
  hasSelections,
  isAnalyzing,
}: ToolbarProps) {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      onImageUpload(file);
    }
  };

  return (
    <header className="border-b bg-card">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Data-Ink Ratio Calculator
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Upload a chart, draw selections, and analyze data-ink ratios
            </p>
          </div>

          <div className="flex items-center gap-3">
            <label>
              <Input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                id="image-upload"
              />
              <Button asChild variant="secondary">
                <span className="cursor-pointer">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Image
                </span>
              </Button>
            </label>

            <Button
              onClick={onRunAnalysis}
              disabled={!hasImage || !hasSelections || isAnalyzing}
              className="min-w-[140px]"
            >
              <Play className="w-4 h-4 mr-2" />
              {isAnalyzing ? "Analyzing..." : "Run Analysis"}
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
