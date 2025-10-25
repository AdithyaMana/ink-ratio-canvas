import { AnalysisResult, ChartProfile } from "../types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Lightbulb, AlertTriangle, AlertCircle } from "lucide-react";
import { exportToJSON, exportToCSV } from "../utils/analysis";
import { getVerdictText } from "../utils/benchmarks";
import { generateSuggestions } from "../utils/assistant";

interface ResultsPanelProps {
  result: AnalysisResult | null;
  selectedProfile: ChartProfile | null;
}

export function ResultsPanel({
  result,
  selectedProfile,
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

  const displayedRatio = result.efficiencyRatio;
  const percentage = (displayedRatio * 100).toFixed(2);

  // Get verdict and suggestions
  const verdict = selectedProfile
    ? getVerdictText(
        displayedRatio,
        selectedProfile.benchmarks.efficiency,
        "efficiency",
        selectedProfile.name
      )
    : null;

  const suggestions = generateSuggestions(result, selectedProfile);

  return (
    <div className="space-y-4">
      {/* Main Ratio Display with Verdict */}
      <Card className="p-6 bg-primary/5 border-primary/20">
        <div className="text-center">
          <div className="text-sm font-medium text-muted-foreground mb-2">
            Data-Ink Efficiency Ratio
          </div>
          <div className="text-5xl font-bold text-primary mb-2">
            {percentage}%
          </div>
          <div className="text-xs text-muted-foreground mb-3">
            {result.totalDataPixels.toLocaleString()} data pixels /{" "}
            {result.totalInkPixels.toLocaleString()} ink pixels
          </div>
          {verdict && (
            <div className={`text-sm font-semibold ${verdict.color}`}>
              {verdict.text}
            </div>
          )}
        </div>
      </Card>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <Card className="p-4">
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <Lightbulb className="w-4 h-4" />
            Improvement Suggestions
          </h3>
          <div className="space-y-3">
            {suggestions.map((suggestion, index) => (
              <div
                key={index}
                className={`flex gap-3 p-3 rounded-lg border ${
                  suggestion.type === "critical"
                    ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900"
                    : suggestion.type === "warning"
                    ? "bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-900"
                    : "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900"
                }`}
              >
                {suggestion.type === "critical" ? (
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                ) : suggestion.type === "warning" ? (
                  <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <Lightbulb className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                )}
                <p className="text-sm text-foreground">{suggestion.message}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

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
