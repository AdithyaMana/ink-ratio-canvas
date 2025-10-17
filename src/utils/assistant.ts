/**
 * Improvement Assistant - Rule-Based Suggestion Engine
 * 
 * Analyzes results and provides actionable advice
 */

import { AnalysisResult, ChartProfile, Suggestion } from "@/types";

export function generateSuggestions(
  result: AnalysisResult,
  profile: ChartProfile | null
): Suggestion[] {
  const suggestions: Suggestion[] = [];

  if (!profile) {
    return suggestions;
  }

  const { efficiencyRatio, layers, totalNonDataPixels } = result;
  const { benchmarks } = profile;

  // Rule 1: Check if efficiency is below "good" benchmark
  if (efficiencyRatio < benchmarks.efficiency.good) {
    // Find the largest non-data layer
    const nonDataLayers = layers.filter(l => !l.isData);
    if (nonDataLayers.length > 0) {
      const largestNonData = nonDataLayers.reduce((max, layer) =>
        layer.inkPixels > max.inkPixels ? layer : max
      );

      suggestions.push({
        type: "critical",
        message: `Your '${largestNonData.label}' layer (${largestNonData.inkPixels.toLocaleString()} pixels) is the biggest contributor to non-data ink. Consider removing or minimizing it to improve your efficiency ratio from ${(efficiencyRatio * 100).toFixed(1)}% to potentially ${((result.totalDataPixels / (result.totalInkPixels - largestNonData.inkPixels)) * 100).toFixed(1)}%.`,
      });
    }
  }

  // Rule 2: Check for gridlines contributing more than 20% of non-data ink
  const gridlineLayer = layers.find(l => 
    l.label.toLowerCase().includes("gridline") || 
    l.label.toLowerCase().includes("grid")
  );

  if (gridlineLayer && !gridlineLayer.isData) {
    const gridlinePercentage = totalNonDataPixels > 0 
      ? (gridlineLayer.inkPixels / totalNonDataPixels) 
      : 0;

    if (gridlinePercentage > 0.2) {
      suggestions.push({
        type: "warning",
        message: `Gridlines account for ${(gridlinePercentage * 100).toFixed(1)}% of your non-data ink. Consider using lighter colors, fewer lines, or removing them entirely to improve clarity.`,
      });
    }
  }

  // Rule 3: Check for 3D effects or shadows
  const threeDLayer = layers.find(l => 
    l.label.toLowerCase().includes("3d") || 
    l.label.toLowerCase().includes("shadow") ||
    l.label.toLowerCase().includes("effect")
  );

  if (threeDLayer && !threeDLayer.isData) {
    suggestions.push({
      type: "warning",
      message: `The '${threeDLayer.label}' layer adds visual complexity without conveying data. Removing decorative effects like shadows and 3D styling will improve your data-ink ratio and chart readability.`,
    });
  }

  // Rule 4: Check for excessive background
  const backgroundLayer = layers.find(l => 
    l.label.toLowerCase().includes("background") || 
    l.label.toLowerCase().includes("bg")
  );

  if (backgroundLayer && !backgroundLayer.isData) {
    const bgPercentage = totalNonDataPixels > 0 
      ? (backgroundLayer.inkPixels / totalNonDataPixels) 
      : 0;

    if (bgPercentage > 0.3) {
      suggestions.push({
        type: "tip",
        message: `Background elements consume ${(bgPercentage * 100).toFixed(1)}% of non-data ink. Consider using a transparent or white background to let the data stand out.`,
      });
    }
  }

  // Rule 5: Check if very close to excellent benchmark
  const excellentGap = benchmarks.efficiency.excellent - efficiencyRatio;
  if (excellentGap > 0 && excellentGap < 0.1) {
    suggestions.push({
      type: "tip",
      message: `You're only ${(excellentGap * 100).toFixed(1)}% away from an excellent rating! Small refinements to non-data elements could push you over the threshold.`,
    });
  }

  // Rule 6: Provide positive feedback for excellent performance
  if (efficiencyRatio >= benchmarks.efficiency.excellent) {
    suggestions.push({
      type: "tip",
      message: `Excellent work! Your chart achieves a ${(efficiencyRatio * 100).toFixed(1)}% efficiency ratio, demonstrating strong adherence to data-ink ratio principles.`,
    });
  }

  // Rule 7: Check for too many non-data layers
  const nonDataCount = layers.filter(l => !l.isData).length;
  const dataCount = layers.filter(l => l.isData).length;

  if (nonDataCount > dataCount * 2) {
    suggestions.push({
      type: "warning",
      message: `You have ${nonDataCount} non-data layers compared to ${dataCount} data layers. Consider consolidating or removing decorative elements to maintain focus on the data.`,
    });
  }

  return suggestions;
}
