import { AnalysisResult, RatioType } from "../types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Info } from "lucide-react";
import { exportToJSON, exportToCSV } from "../utils/analysis";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ResultsPanelProps {
  result: AnalysisResult | null;
  ratioType: RatioType;
  onRatioTypeChange: (type: RatioType) => void;
}

export function ResultsPanel({
  result,
  ratioType,
  onRatioTypeChange,
}: ResultsPanelProps) {
  const handleExport = (format: "json" | "csv") => {
    if (!result) return;

    const content = format === "json" ? exportToJSON(result) : exportToCSV(result);
    const blob = new Blob([content], {
      type: format === "json" ? "application/json" : "text/csv",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analysis-results.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!result) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">
          Run analysis to see results
        </p>
      </Card>
    );
  }

  const displayedRatio =
    ratioType === "density" ? result.densityRatio : result.efficiencyRatio;
  const percentage = (displayedRatio * 100).toFixed(2);

  return (
    <div className="space-y-4">
      {/* Ratio Type Selector */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-foreground">Ratio Type</h3>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="w-4 h-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-sm">
                  <strong>Density Ratio:</strong> Data pixels / Total image pixels
                  <br />
                  <strong>Efficiency Ratio:</strong> Data pixels / Total ink pixels
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="flex gap-2">
          <Button
            variant={ratioType === "density" ? "default" : "outline"}
            onClick={() => onRatioTypeChange("density")}
            className="flex-1"
          >
            Density
          </Button>
          <Button
            variant={ratioType === "efficiency" ? "default" : "outline"}
            onClick={() => onRatioTypeChange("efficiency")}
            className="flex-1"
          >
            Efficiency
          </Button>
        </div>
      </Card>

      {/* Main Ratio Display */}
      <Card className="p-6 bg-primary/5 border-primary/20">
        <div className="text-center">
          <div className="text-sm font-medium text-muted-foreground mb-2">
            {ratioType === "density" ? "Density Ratio" : "Efficiency Ratio"}
          </div>
          <div className="text-5xl font-bold text-primary mb-2">
            {percentage}%
          </div>
          <div className="text-xs text-muted-foreground">
            {result.totalDataPixels.toLocaleString()} data pixels /{" "}
            {ratioType === "density"
              ? result.totalImagePixels.toLocaleString()
              : result.totalInkPixels.toLocaleString()}{" "}
            {ratioType === "density" ? "total" : "ink"} pixels
          </div>
        </div>
      </Card>

      {/* Layer Results */}
      <Card className="p-4">
        <h3 className="font-semibold text-foreground mb-3">Layer Breakdown</h3>
        <div className="space-y-2">
          {result.layers.map((layer) => (
            <div
              key={layer.id}
              className="flex items-center justify-between p-2 rounded border"
              style={{ borderColor: layer.color + "40" }}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded"
                  style={{ backgroundColor: layer.color }}
                />
                <span className="text-sm font-medium">{layer.label}</span>
                <span
                  className={`text-xs px-2 py-0.5 rounded ${
                    layer.isData
                      ? "bg-data/20 text-data"
                      : "bg-non-data/20 text-non-data"
                  }`}
                >
                  {layer.isData ? "Data" : "Non-Data"}
                </span>
              </div>
              <div className="text-sm text-muted-foreground">
                {layer.inkPixels.toLocaleString()} px
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Summary Stats */}
      <Card className="p-4">
        <h3 className="font-semibold text-foreground mb-3">Summary</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total Image Pixels</span>
            <span className="font-medium">
              {result.totalImagePixels.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total Ink Pixels</span>
            <span className="font-medium">
              {result.totalInkPixels.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-data">Data Pixels</span>
            <span className="font-medium text-data">
              {result.totalDataPixels.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-non-data">Non-Data Pixels</span>
            <span className="font-medium text-non-data">
              {result.totalNonDataPixels.toLocaleString()}
            </span>
          </div>
        </div>
      </Card>

      {/* Export Buttons */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={() => handleExport("json")}
          className="flex-1"
        >
          <Download className="w-4 h-4 mr-2" />
          Export JSON
        </Button>
        <Button
          variant="outline"
          onClick={() => handleExport("csv")}
          className="flex-1"
        >
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>
    </div>
  );
}
