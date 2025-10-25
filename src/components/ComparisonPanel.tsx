import { useState } from "react";
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
import { Separator } from "@/components/ui/separator";
import { ComparisonResult, ReferenceVisualization } from "@/types/comparison";
import { AnalysisResult, ChartProfile } from "@/types";
import { compareToReference } from "@/utils/comparison";
import { getReferencesForChartType } from "@/utils/references";
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  Minus, 
  TrendingUp, 
  TrendingDown,
  Lightbulb,
  AlertCircle,
  CheckCircle2,
  Target
} from "lucide-react";

interface ComparisonPanelProps {
  result: AnalysisResult;
  selectedProfile: ChartProfile | null;
}

export function ComparisonPanel({ result, selectedProfile }: ComparisonPanelProps) {
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [selectedReferenceId, setSelectedReferenceId] = useState<string>("");

  const references = selectedProfile
    ? getReferencesForChartType(selectedProfile.id)
    : [];

  const handleCompare = () => {
    if (!selectedReferenceId) return;

    const reference = references.find((r) => r.id === selectedReferenceId);
    if (!reference) return;

    const comparisonResult = compareToReference(result, reference);
    setComparison(comparisonResult);
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case "excellent":
        return "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/20";
      case "good":
        return "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20";
      case "fair":
        return "text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/20";
      case "poor":
        return "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20";
      default:
        return "text-muted-foreground";
    }
  };

  const getGradeIcon = (grade: string) => {
    switch (grade) {
      case "excellent":
        return <CheckCircle2 className="w-5 h-5" />;
      case "good":
        return <TrendingUp className="w-5 h-5" />;
      case "fair":
        return <Minus className="w-5 h-5" />;
      case "poor":
        return <AlertCircle className="w-5 h-5" />;
      default:
        return null;
    }
  };

  if (!selectedProfile) {
    return (
      <Card className="p-6">
        <p className="text-muted-foreground text-center">
          Select a chart type to enable comparison
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Comparison Controls */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Target className="w-4 h-4" />
          Compare Against Reference
        </h3>
        <div className="space-y-3">
          <Select value={selectedReferenceId} onValueChange={setSelectedReferenceId}>
            <SelectTrigger>
              <SelectValue placeholder="Select reference type..." />
            </SelectTrigger>
            <SelectContent>
              {references.map((ref) => (
                <SelectItem key={ref.id} value={ref.id}>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="capitalize">
                      {ref.type}
                    </Badge>
                    <span>{ref.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={handleCompare}
            disabled={!selectedReferenceId}
            className="w-full"
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
          <Card className={`p-4 ${getGradeColor(comparison.interpretation.grade)}`}>
            <div className="flex items-start gap-3">
              <div className="mt-1">
                {getGradeIcon(comparison.interpretation.grade)}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold text-lg capitalize">
                    {comparison.interpretation.grade} Match
                  </h3>
                  <Badge variant="outline" className="capitalize">
                    vs {comparison.reference.type}
                  </Badge>
                </div>
                <p className="text-sm leading-relaxed">
                  {comparison.interpretation.summary}
                </p>
              </div>
            </div>
          </Card>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-4">
              <div className="text-xs text-muted-foreground mb-1">Your Efficiency</div>
              <div className="text-2xl font-bold text-primary">
                {(comparison.metrics.userEfficiency * 100).toFixed(1)}%
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-muted-foreground mb-1">Reference Efficiency</div>
              <div className="text-2xl font-bold">
                {(comparison.metrics.referenceEfficiency * 100).toFixed(1)}%
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-muted-foreground mb-1">Difference</div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">
                  {comparison.metrics.relativeDifference > 0 ? "+" : ""}
                  {comparison.metrics.relativeDifference.toFixed(1)}%
                </span>
                {comparison.metrics.relativeDifference > 0 ? (
                  <ArrowUpRight className="w-5 h-5 text-green-600" />
                ) : comparison.metrics.relativeDifference < 0 ? (
                  <ArrowDownRight className="w-5 h-5 text-red-600" />
                ) : (
                  <Minus className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-muted-foreground mb-1">Efficiency Gap</div>
              <div className="text-2xl font-bold">
                {(comparison.metrics.efficiencyGap * 100).toFixed(1)}%
              </div>
            </Card>
          </div>

          {/* Component Breakdown */}
          <Card className="p-4">
            <h3 className="font-semibold mb-3">Component Breakdown</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-2 rounded bg-muted/50">
                <span className="text-sm">Data Ink Difference</span>
                <span className={`font-medium ${comparison.breakdown.dataInkDiff > 0 ? 'text-blue-600' : 'text-muted-foreground'}`}>
                  {comparison.breakdown.dataInkDiff > 0 ? "+" : ""}
                  {comparison.breakdown.dataInkDiff.toLocaleString()} px
                </span>
              </div>
              <div className="flex justify-between items-center p-2 rounded bg-muted/50">
                <span className="text-sm">Redundancy Difference</span>
                <span className={`font-medium ${comparison.breakdown.redundancyDiff > 0 ? 'text-orange-600' : 'text-muted-foreground'}`}>
                  {comparison.breakdown.redundancyDiff > 0 ? "+" : ""}
                  {comparison.breakdown.redundancyDiff.toLocaleString()} px
                </span>
              </div>
              <div className="flex justify-between items-center p-2 rounded bg-muted/50">
                <span className="text-sm">Chartjunk Difference</span>
                <span className={`font-medium ${comparison.breakdown.chartjunkDiff > 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                  {comparison.breakdown.chartjunkDiff > 0 ? "+" : ""}
                  {comparison.breakdown.chartjunkDiff.toLocaleString()} px
                </span>
              </div>
            </div>
          </Card>

          {/* Insights */}
          {comparison.interpretation.insights.length > 0 && (
            <Card className="p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Lightbulb className="w-4 h-4" />
                Key Insights
              </h3>
              <ul className="space-y-2">
                {comparison.interpretation.insights.map((insight, index) => (
                  <li key={index} className="text-sm flex gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>{insight}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Recommendations */}
          <Card className="p-4 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
            <h3 className="font-semibold mb-3 flex items-center gap-2 text-blue-900 dark:text-blue-100">
              <TrendingUp className="w-4 h-4" />
              Recommendations
            </h3>
            <ul className="space-y-2">
              {comparison.interpretation.recommendations.map((rec, index) => (
                <li key={index} className="text-sm flex gap-2 text-blue-900 dark:text-blue-100">
                  <span className="text-blue-600 dark:text-blue-400 mt-1">→</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </Card>

          {/* Reference Details */}
          <Card className="p-4 bg-muted/30">
            <h3 className="font-semibold mb-2 text-sm">About This Reference</h3>
            <p className="text-xs text-muted-foreground mb-2">
              <strong className="capitalize">{comparison.reference.type}:</strong>{" "}
              {comparison.reference.description}
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">Data Ink:</span>{" "}
                <span className="font-medium">{comparison.reference.metadata.dataInkPixels.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Total Ink:</span>{" "}
                <span className="font-medium">{comparison.reference.metadata.totalInkPixels.toLocaleString()}</span>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
