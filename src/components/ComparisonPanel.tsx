import { useState, useEffect } from "react"; // <-- Import useState and useEffect
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
// import { Separator } from "@/components/ui/separator"; // Separator seems unused now
import { ComparisonResult, ReferenceVisualization } from "@/types/comparison";
import { AnalysisResult, ChartProfile } from "@/types";
import { compareToReference } from "@/utils/comparison";
import { getReferencesForChartType } from "@/utils/references";
import {
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  TrendingUp,
  // TrendingDown, // Seems unused
  Lightbulb,
  AlertCircle,
  CheckCircle2,
  Target
} from "lucide-react";
// import { Slider } from "@/components/ui/slider"; // Seems unused
// import { Label } from "@/components/ui/label"; // Seems unused

interface ComparisonPanelProps {
  result: AnalysisResult | null; // Allow null for result
  selectedProfile: ChartProfile | null;
}

export function ComparisonPanel({ result, selectedProfile }: ComparisonPanelProps) {
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [selectedReferenceId, setSelectedReferenceId] = useState<string>("");

  const references = selectedProfile
    ? getReferencesForChartType(selectedProfile.id)
    : [];

  // Reset comparison when profile or result changes
  useEffect(() => {
    setComparison(null);
    setSelectedReferenceId("");
  }, [selectedProfile, result]); // Added result dependency


  const handleCompare = () => {
    if (!selectedReferenceId) return;

    const reference = references.find((r) => r.id === selectedReferenceId);
    if (!reference || !result) { // Check for result here too
        console.error("Cannot compare: Reference or User Result is missing.");
        return;
    };

    try {
        const comparisonResult = compareToReference(result, reference);
        setComparison(comparisonResult);
    } catch (error) {
        console.error("Error during comparison:", error);
        // Optionally show a toast message to the user here
        setComparison(null); // Reset comparison on error
    }
  };

  const getGradeColor = (grade: ComparisonResult["interpretation"]["grade"] | undefined) => { // Allow undefined
    switch (grade) {
      case "excellent": return "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/20";
      case "good": return "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20";
      case "fair": return "text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/20";
      case "poor": return "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20";
      default: return "text-muted-foreground";
    }
  };

  const getGradeIcon = (grade: ComparisonResult["interpretation"]["grade"] | undefined) => { // Allow undefined
    switch (grade) {
      case "excellent": return <CheckCircle2 className="w-5 h-5 flex-shrink-0" />;
      case "good": return <TrendingUp className="w-5 h-5 flex-shrink-0" />;
      case "fair": return <Minus className="w-5 h-5 flex-shrink-0" />;
      case "poor": return <AlertCircle className="w-5 h-5 flex-shrink-0" />;
      default: return null;
    }
  };


  if (!selectedProfile) {
    return (
      <Card className="p-6">
        <p className="text-muted-foreground text-center text-sm">
          Select a chart type profile in the toolbar to enable comparison features.
        </p>
      </Card>
    );
  }

   if (!result) {
    return (
      <Card className="p-6">
        <p className="text-muted-foreground text-center text-sm">
          Run analysis first to enable comparison.
        </p>
      </Card>
    );
  }


  return (
    <div className="space-y-4">
      {/* Comparison Controls */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm">
          <Target className="w-4 h-4" />
          Compare Against Reference
        </h3>
        <div className="space-y-3">
          <Select value={selectedReferenceId} onValueChange={setSelectedReferenceId}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Select reference type..." />
            </SelectTrigger>
            <SelectContent>
              {references.length > 0 ? (
                 references.map((ref) => (
                  <SelectItem key={ref.id} value={ref.id}>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="capitalize text-xs">
                        {ref.type.replace('-', ' ')}
                      </Badge>
                      <span className="text-sm">{ref.name}</span>
                    </div>
                  </SelectItem>
                 ))
               ) : (
                 <div className="p-4 text-sm text-muted-foreground">No references available for '{selectedProfile.name}'.</div>
               )
              }
            </SelectContent>
          </Select>
          <Button
            onClick={handleCompare}
            disabled={!selectedReferenceId || references.length === 0}
            className="w-full h-9 text-sm"
            variant="default"
          >
            Run Comparison
          </Button>
        </div>
      </Card>

      {/* Comparison Results */}
      {comparison && (
        <>
          {/* Summary Card */}
          <Card className={`p-4 ${getGradeColor(comparison.interpretation.grade)} border-current/30`}>
            <div className="flex items-start gap-3">
              <div className="mt-0.5"> {/* Adjusted alignment */}
                {getGradeIcon(comparison.interpretation.grade)}
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-2"> {/* Allow wrapping */}
                  <h3 className="font-semibold text-base sm:text-lg capitalize leading-tight"> {/* Adjusted size/leading */}
                    {comparison.interpretation.grade} Match
                  </h3>
                  <Badge variant="outline" className="capitalize text-xs border-current/50">
                    vs {comparison.reference.type.replace('-', ' ')}
                  </Badge>
                </div>
                <p className="text-sm leading-relaxed opacity-90">
                  {comparison.interpretation.summary}
                </p>
              </div>
            </div>
          </Card>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-3 sm:p-4"> {/* Adjusted padding */}
              <div className="text-xs text-muted-foreground mb-1">Your Efficiency</div>
              <div className="text-xl sm:text-2xl font-bold text-primary">
                {(comparison.metrics.userEfficiency * 100).toFixed(1)}%
              </div>
            </Card>
            <Card className="p-3 sm:p-4">
              <div className="text-xs text-muted-foreground mb-1">Reference Efficiency</div>
              <div className="text-xl sm:text-2xl font-bold">
                {(comparison.metrics.referenceEfficiency * 100).toFixed(1)}%
              </div>
            </Card>
            <Card className="p-3 sm:p-4">
              <div className="text-xs text-muted-foreground mb-1">Difference</div>
              <div className="flex items-center gap-1 sm:gap-2">
                <span className={`text-xl sm:text-2xl font-bold ${
                    comparison.metrics.relativeDifference === 0 ? '' :
                    comparison.metrics.relativeDifference > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {comparison.metrics.relativeDifference >= 0 ? "+" : ""}
                  {isFinite(comparison.metrics.relativeDifference) ? comparison.metrics.relativeDifference.toFixed(1) : '∞'}%
                </span>
                {comparison.metrics.relativeDifference > 0 ? (
                  <ArrowUpRight className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                ) : comparison.metrics.relativeDifference < 0 ? (
                  <ArrowDownRight className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
                ) : (
                  <Minus className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
                )}
              </div>
            </Card>
            <Card className="p-3 sm:p-4">
              <div className="text-xs text-muted-foreground mb-1">Absolute Gap</div>
              <div className="text-xl sm:text-2xl font-bold">
                {(comparison.metrics.efficiencyGap * 100).toFixed(1)}%
              </div>
            </Card>
          </div>

          {/* Component Breakdown */}
          <Card className="p-4">
            <h3 className="font-semibold mb-3 text-sm">Component Breakdown (vs Reference)</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center p-2 rounded bg-muted/50 text-xs sm:text-sm">
                <span>Data Ink Difference</span>
                <span className={`font-medium ${comparison.breakdown.dataInkDiff >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`}>
                  {comparison.breakdown.dataInkDiff >= 0 ? "+" : ""}
                  {comparison.breakdown.dataInkDiff.toLocaleString()} px
                </span>
              </div>
              <div className="flex justify-between items-center p-2 rounded bg-muted/50 text-xs sm:text-sm">
                <span>Non-Data Ink Difference</span>
                <span className={`font-medium ${comparison.breakdown.nonDataInkDiff >= 0 ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400'}`}>
                   {comparison.breakdown.nonDataInkDiff >= 0 ? "+" : ""}
                  {comparison.breakdown.nonDataInkDiff.toLocaleString()} px
                </span>
              </div>
              <div className="flex justify-between items-center p-2 rounded bg-muted/50 text-xs sm:text-sm">
                <span>Excess Non-Data Ink Diff.</span>
                 <span className={`font-medium ${comparison.breakdown.excessNonDataInkDifference > 0 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'}`}>
                  {comparison.breakdown.excessNonDataInkDifference > 0 ? "+" : ""}
                  {comparison.breakdown.excessNonDataInkDifference.toLocaleString()} px
                </span>
              </div>
            </div>
             <p className="text-xs text-muted-foreground mt-3">
                "Excess Non-Data Ink Diff." estimates the difference in potentially unnecessary ink compared to the reference.
             </p>
          </Card>

          {/* Insights */}
          {comparison.interpretation.insights.length > 0 && (
            <Card className="p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm">
                <Lightbulb className="w-4 h-4" />
                Key Insights
              </h3>
              <ul className="space-y-2 pl-5 list-disc list-outside"> {/* Use list style */}
                {comparison.interpretation.insights.map((insight, index) => (
                  <li key={index} className="text-sm">
                    {insight}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Recommendations */}
          {comparison.interpretation.recommendations.length > 0 && (
              <Card className="p-4 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
                <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm text-blue-900 dark:text-blue-100">
                  <TrendingUp className="w-4 h-4" />
                  Recommendations
                </h3>
                <ul className="space-y-2 pl-5 list-disc list-outside"> {/* Use list style */}
                  {comparison.interpretation.recommendations.map((rec, index) => (
                    <li key={index} className="text-sm text-blue-800 dark:text-blue-200">
                      {rec}
                    </li>
                  ))}
                </ul>
              </Card>
          )}

          {/* Reference Details */}
          <Card className="p-4 bg-muted/30">
            <h3 className="font-semibold mb-2 text-sm">About Reference: '{comparison.reference.name}'</h3>
            <p className="text-xs text-muted-foreground mb-2">
              <strong className="capitalize">{comparison.reference.type.replace('-', ' ')}:</strong>{' '}
              {comparison.reference.description}
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mt-3 border-t pt-2">
              <div><span className="text-muted-foreground">Efficiency:</span> <span className="font-medium">{(comparison.reference.analysisResult.efficiencyRatio * 100).toFixed(1)}%</span></div>
              <div><span className="text-muted-foreground">Data Pixels:</span> <span className="font-medium">{comparison.reference.metadata.dataInkPixels.toLocaleString()}</span></div>
              <div><span className="text-muted-foreground">Total Ink:</span> <span className="font-medium">{comparison.reference.metadata.totalInkPixels.toLocaleString()}</span></div>
              <div><span className="text-muted-foreground">Non-Data:</span> <span className="font-medium">{comparison.reference.analysisResult.totalNonDataPixels.toLocaleString()}</span></div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}