/**
 * Comparison Engine
 * Compares user visualizations against reference visualizations
 */

import { AnalysisResult } from "@/types";
import { ComparisonResult, ReferenceVisualization } from "@/types/comparison";

/**
 * Calculate comparison metrics between user and reference results
 */
function calculateMetrics(
  userResult: AnalysisResult,
  referenceResult: AnalysisResult
) {
  const userEfficiency = userResult.efficiencyRatio;
  const referenceEfficiency = referenceResult.efficiencyRatio;
  
  const absoluteDifference = userEfficiency - referenceEfficiency;
  const relativeDifference = (absoluteDifference / referenceEfficiency) * 100;
  const efficiencyGap = Math.abs(absoluteDifference);

  return {
    absoluteDifference,
    relativeDifference,
    efficiencyGap,
    userEfficiency,
    referenceEfficiency,
  };
}

/**
 * Calculate component-level breakdown
 */
function calculateBreakdown(
  userResult: AnalysisResult,
  referenceResult: AnalysisResult
) {
  const dataInkDiff = userResult.totalDataPixels - referenceResult.totalDataPixels;
  const redundancyDiff = userResult.totalNonDataPixels - referenceResult.totalNonDataPixels;
  
  // Chartjunk is estimated as excess non-data ink
  const userChartjunk = Math.max(0, userResult.totalNonDataPixels - referenceResult.totalNonDataPixels);
  const refChartjunk = 0;
  const chartjunkDiff = userChartjunk - refChartjunk;

  return {
    dataInkDiff,
    redundancyDiff,
    chartjunkDiff,
  };
}

/**
 * Generate human-readable interpretation
 */
function generateInterpretation(
  metrics: ReturnType<typeof calculateMetrics>,
  breakdown: ReturnType<typeof calculateBreakdown>,
  reference: ReferenceVisualization
): ComparisonResult["interpretation"] {
  const { relativeDifference, userEfficiency, referenceEfficiency } = metrics;
  
  // Determine grade
  let grade: "excellent" | "good" | "fair" | "poor";
  if (relativeDifference >= -10) {
    grade = "excellent";
  } else if (relativeDifference >= -25) {
    grade = "good";
  } else if (relativeDifference >= -40) {
    grade = "fair";
  } else {
    grade = "poor";
  }

  // Generate summary
  let summary: string;
  if (relativeDifference > 0) {
    summary = `Your visualization exceeds the ${reference.type} reference by ${Math.abs(relativeDifference).toFixed(1)}%. Excellent work!`;
  } else if (Math.abs(relativeDifference) < 10) {
    summary = `Your visualization is very close to the ${reference.type} reference (within ${Math.abs(relativeDifference).toFixed(1)}%).`;
  } else {
    summary = `Your visualization is ${Math.abs(relativeDifference).toFixed(1)}% less efficient than the ${reference.type} reference.`;
  }

  // Generate insights
  const insights: string[] = [];
  
  if (breakdown.dataInkDiff < -5000) {
    insights.push(`You're showing ${Math.abs(breakdown.dataInkDiff).toLocaleString()} fewer data pixels than the reference. Consider if all data is visible.`);
  } else if (breakdown.dataInkDiff > 5000) {
    insights.push(`You have ${breakdown.dataInkDiff.toLocaleString()} more data pixels than typical. This may indicate redundant data representation.`);
  }

  if (breakdown.redundancyDiff > 10000) {
    insights.push(`Your chart has ${breakdown.redundancyDiff.toLocaleString()} more non-data pixels, suggesting potential for simplification.`);
  }

  if (breakdown.chartjunkDiff > 15000) {
    insights.push(`Significant chartjunk detected: ${breakdown.chartjunkDiff.toLocaleString()} excess decorative pixels.`);
  }

  if (userEfficiency < referenceEfficiency * 0.7) {
    insights.push(`Efficiency is notably below reference standards. Major redesign may be beneficial.`);
  }

  // Generate recommendations
  const recommendations: string[] = [];
  
  if (reference.type === "ideal") {
    if (relativeDifference < -20) {
      recommendations.push("Remove non-essential gridlines and reduce axis decorations");
      recommendations.push("Simplify or remove the legend if categories are self-explanatory");
      recommendations.push("Eliminate background fills and reduce border weights");
    } else if (relativeDifference < -10) {
      recommendations.push("Consider lighter gridlines or removing them entirely");
      recommendations.push("Reduce non-data ink in axis labels and titles");
    }
  } else if (reference.type === "common") {
    if (relativeDifference < -15) {
      recommendations.push("Your design is below typical industry standards");
      recommendations.push("Review for excessive decorative elements or redundant labels");
      recommendations.push("Consider adopting common conventions for clarity");
    }
  } else if (reference.type === "best-practice") {
    if (relativeDifference < -20) {
      recommendations.push("Apply Tufte principles: maximize data-ink ratio");
      recommendations.push("Remove chart borders, background fills, and heavy gridlines");
      recommendations.push("Use direct labeling instead of legends where possible");
      recommendations.push("Lighten axis lines and reduce tick marks");
    } else if (relativeDifference < -10) {
      recommendations.push("Fine-tune by reducing axis decoration weight");
      recommendations.push("Consider removing or lightening gridlines further");
    } else {
      recommendations.push("Your design is approaching best practices!");
      recommendations.push("Minor refinements can push you closer to the ideal");
    }
  }

  if (recommendations.length === 0) {
    recommendations.push("Your visualization is well-optimized for this comparison.");
    recommendations.push("Maintain focus on data clarity and avoid adding decorative elements.");
  }

  return {
    summary,
    grade,
    insights: insights.length > 0 ? insights : ["Your visualization is well-balanced for this comparison."],
    recommendations,
  };
}

/**
 * Compare user analysis result against a reference
 */
export function compareToReference(
  userResult: AnalysisResult,
  reference: ReferenceVisualization
): ComparisonResult {
  const metrics = calculateMetrics(userResult, reference.analysisResult);
  const breakdown = calculateBreakdown(userResult, reference.analysisResult);
  const interpretation = generateInterpretation(metrics, breakdown, reference);

  return {
    userResult,
    referenceResult: reference.analysisResult,
    reference,
    metrics,
    breakdown,
    interpretation,
  };
}

/**
 * Create a custom reference from an uploaded image analysis
 */
export function createCustomReference(
  name: string,
  description: string,
  chartType: string,
  analysisResult: AnalysisResult,
  imageUrl?: string
): ReferenceVisualization {
  return {
    id: `custom-${Date.now()}`,
    name,
    description,
    chartType,
    type: "custom",
    efficiencyRatio: analysisResult.efficiencyRatio,
    analysisResult,
    imageUrl,
    metadata: {
      dataInkPixels: analysisResult.totalDataPixels,
      totalInkPixels: analysisResult.totalInkPixels,
      redundancyPixels: analysisResult.totalNonDataPixels,
      chartjunkPixels: Math.max(0, analysisResult.totalNonDataPixels - analysisResult.totalDataPixels * 0.3),
    },
  };
}
