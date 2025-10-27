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
): ComparisonResult["metrics"] { // Explicit return type
  const userEfficiency = userResult.efficiencyRatio;
  const referenceEfficiency = referenceResult.efficiencyRatio;

  const absoluteDifference = userEfficiency - referenceEfficiency;
  // Calculate the relative difference as a percentage compared to the reference
  // Handle division by zero case
  const relativeDifference = referenceEfficiency === 0
    ? (userEfficiency > 0 ? Infinity : 0) // Assign Infinity if user is better than zero, else 0
    : (absoluteDifference / referenceEfficiency) * 100;
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
 * Calculate component-level breakdown differences.
 */
function calculateBreakdown(
  userResult: AnalysisResult,
  referenceResult: AnalysisResult
): ComparisonResult["breakdown"] { // Explicit return type
  const dataInkDiff = userResult.totalDataPixels - referenceResult.totalDataPixels;
  // Difference in non-data ink (can be negative if user has less)
  const nonDataInkDiff = userResult.totalNonDataPixels - referenceResult.totalNonDataPixels;

  // Estimate the difference in potentially unnecessary non-data ink (comparative chartjunk).
  // This is a heuristic based on the *difference* compared to the reference,
  // focusing only on the excess amount the user might have.
  const excessNonDataInkDifference = Math.max(0, nonDataInkDiff);

  return {
    dataInkDiff,
    nonDataInkDiff, // Renamed from redundancyDiff for clarity
    excessNonDataInkDifference, // Renamed from chartjunkDiff
  };
}

/**
 * Generate human-readable interpretation based on comparison metrics, breakdown,
 * and the user's analysis result for more specific insights.
 */
function generateInterpretation(
  metrics: ComparisonResult["metrics"],
  breakdown: ComparisonResult["breakdown"],
  reference: ReferenceVisualization,
  userResult: AnalysisResult // Add userResult as input
): ComparisonResult["interpretation"] {
  const { relativeDifference, userEfficiency, referenceEfficiency } = metrics;

  // --- Determine Grade ---
  let grade: ComparisonResult["interpretation"]["grade"];
  if (relativeDifference >= -10) grade = "excellent"; // Within 10% or better than reference
  else if (relativeDifference >= -25) grade = "good";  // Between 10% and 25% worse
  else if (relativeDifference >= -40) grade = "fair";   // Between 25% and 40% worse
  else grade = "poor";                                // More than 40% worse

  // --- Generate Summary Text ---
  let summary: string;
  const absRelativeDiff = Math.abs(relativeDifference);
  const diffDesc = isFinite(absRelativeDiff) ? `${absRelativeDiff.toFixed(1)}%` : 'infinitely';

  if (relativeDifference > 5) {
      summary = `Significantly exceeds the '${reference.name}' (${reference.type}) reference efficiency by ${diffDesc}. Excellent work!`;
  } else if (relativeDifference >= -5) {
      summary = `Efficiency is very close to the '${reference.name}' (${reference.type}) reference (within ${diffDesc}). ${relativeDifference >= 0 ? 'Great job!' : ''}`;
  } else {
      summary = `Efficiency is ${diffDesc} lower than the '${reference.name}' (${reference.type}) reference.`;
  }

  // --- Generate Insights (using user layers) ---
  const insights: string[] = [];
  const nonDataLayers = userResult.layers
    .filter(l => !l.isData && l.inkPixels > 0) // Filter out zero-ink layers
    .sort((a, b) => b.inkPixels - a.inkPixels); // Sort descending by ink amount

  // Data Ink Insights
  if (breakdown.dataInkDiff < -5000) {
    insights.push(`Contains ~${Math.abs(breakdown.dataInkDiff).toLocaleString()} fewer data pixels than reference. Ensure essential data ink is present and clearly visible.`);
  } else if (breakdown.dataInkDiff > 5000) {
    insights.push(`Contains ~${breakdown.dataInkDiff.toLocaleString()} more data pixels than reference. Check for potential data ink redundancy (e.g., labels duplicating bar heights).`);
  }

  // Non-Data Ink Insights
  if (breakdown.nonDataInkDiff > 10000) {
    insights.push(`Has significantly more non-data ink (~${breakdown.nonDataInkDiff.toLocaleString()} px) than the reference, indicating high clutter or decoration.`);
    if (nonDataLayers.length > 0) {
        const topContributor = nonDataLayers[0];
        let contributorText = `The largest non-data contributor is '${topContributor.label}' (${topContributor.inkPixels.toLocaleString()} px).`;
        if (nonDataLayers.length > 1 && nonDataLayers[1].inkPixels > 0) { // Check if second contributor exists and has ink
            contributorText += ` Followed by '${nonDataLayers[1].label}' (${nonDataLayers[1].inkPixels.toLocaleString()} px).`;
        }
        insights.push(contributorText);
    }
  } else if (breakdown.nonDataInkDiff > 3000) {
     insights.push(`Includes noticeably more non-data ink (~${breakdown.nonDataInkDiff.toLocaleString()} px). Review non-essential elements.`);
     if (nonDataLayers.length > 0) {
        insights.push(`The '${nonDataLayers[0].label}' layer (${nonDataLayers[0].inkPixels.toLocaleString()} px) contributes most to non-data ink.`);
     }
  } else if (breakdown.nonDataInkDiff < -3000) {
      insights.push(`Contains significantly less non-data ink (~${Math.abs(breakdown.nonDataInkDiff).toLocaleString()} px) than the reference, suggesting a potentially very minimalist design.`);
  }

  // Excess / Chartjunk Insight
  if (breakdown.excessNonDataInkDifference > 15000) {
    insights.push(`High amount of excess non-data ink (~${breakdown.excessNonDataInkDifference.toLocaleString()} px) suggests significant chartjunk or unnecessary decoration compared to the reference.`);
  } else if (breakdown.excessNonDataInkDifference > 5000) {
     insights.push(`Contains a notable amount of potentially excess non-data ink (~${breakdown.excessNonDataInkDifference.toLocaleString()} px). Review decorative elements.`);
  }

  // Overall Efficiency Insight
  const userEffPercent = (userEfficiency * 100).toFixed(1);
  const refEffPercent = (referenceEfficiency * 100).toFixed(1);
  if (grade === 'poor') {
     insights.push(`Overall efficiency (${userEffPercent}%) is low compared to the reference (${refEffPercent}%). A redesign focusing on maximizing data-ink ratio may be beneficial.`);
  } else if (userEfficiency < referenceEfficiency * 0.7 && grade === 'fair') { // Check for 'fair' grade specifically
    insights.push(`Efficiency (${userEffPercent}%) is considerably below the reference standard (${refEffPercent}%). Review fundamental design choices affecting ink usage.`);
  }

  // --- Generate Recommendations ---
  const recommendations: string[] = [];

  // General recommendations based on high non-data ink
   if (breakdown.nonDataInkDiff > 5000 || breakdown.excessNonDataInkDifference > 3000) {
      recommendations.push("Identify and remove redundant or purely decorative non-data elements (e.g., excessive/dark gridlines, heavy borders, complex backgrounds, 3D effects).");
       if (nonDataLayers.length > 0) {
           recommendations.push(`Target the '${nonDataLayers[0].label}' layer first for ink reduction.`);
           // Add specific advice based on common non-data labels
           const topLabelLower = nonDataLayers[0].label.toLowerCase();
           if (topLabelLower.includes("grid")) recommendations.push("Try using lighter gridlines, fewer lines, dashed lines, or removing them if possible.");
           if (topLabelLower.includes("background")) recommendations.push("Consider using a transparent or plain white/light background.");
           if (topLabelLower.includes("border") || topLabelLower.includes("frame")) recommendations.push("Remove or lighten chart borders/frames.");
           if (topLabelLower.includes("legend")) recommendations.push("Explore direct labeling of data series instead of using a separate legend.");
       }
      recommendations.push("Simplify axis labels, titles, and annotations. Ensure they add necessary context without excessive ink.");
   }

  // Specific recommendations based on comparison type and gap
  if (reference.type === "ideal" && grade !== 'excellent') {
      recommendations.push("Strive for maximal minimalism: ensure almost all ink directly represents data values.");
  } else if (reference.type === "common" && grade === 'poor') {
      recommendations.push("Your design appears less efficient than typical examples. Review standard chart conventions for this type.");
  } else if (reference.type === "best-practice" && (grade === 'fair' || grade === 'poor')) {
       recommendations.push("Apply Tufte's principles rigorously: erase non-data ink, erase redundant data ink.");
       recommendations.push("Use subtle visual cues (light gray, thin lines) for necessary structural elements like axes or minimal gridlines.");
  }

  // Add encouraging/summary message
  if (recommendations.length === 0) {
      if (grade === 'excellent') recommendations.push(`Excellent efficiency compared to the ${reference.type} reference! Maintain focus on clarity.`);
      else recommendations.push(`Good efficiency relative to the ${reference.type} reference. Minor tweaks might further optimize.`);
  } else if (grade === 'excellent' && recommendations.length > 0) {
      // If grade is excellent but there were still suggestions (e.g., minor non-data ink)
      recommendations.push("While efficiency is excellent, consider these minor refinements for potentially even greater clarity.");
  }


  return {
    summary,
    grade,
    insights: insights.length > 0 ? insights : ["Ink distribution appears relatively balanced compared to this reference."],
    recommendations,
  };
}

/**
 * Compare user analysis result against a specific reference visualization.
 */
export function compareToReference(
  userResult: AnalysisResult,
  reference: ReferenceVisualization
): ComparisonResult {
  if (!userResult || !reference?.analysisResult) {
      throw new Error("Cannot perform comparison with invalid input results.");
  }
  const metrics = calculateMetrics(userResult, reference.analysisResult);
  const breakdown = calculateBreakdown(userResult, reference.analysisResult);
  const interpretation = generateInterpretation(metrics, breakdown, reference, userResult); // Pass userResult

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
 * Create a custom reference visualization object from an existing analysis result.
 */
export function createCustomReference(
  name: string,
  description: string,
  chartType: string,
  analysisResult: AnalysisResult,
  imageUrl?: string
): ReferenceVisualization {
   // Basic estimation for metadata
   const estimatedEssentialNonData = analysisResult.totalDataPixels * 0.25; // Assume essential non-data is ~25% of data ink
   const redundancyPixels = Math.max(0, analysisResult.totalNonDataPixels - estimatedEssentialNonData);
   const chartjunkPixels = 0; // Hard to estimate chartjunk automatically

  return {
    id: `custom-${Date.now()}-${Math.random().toString(16).slice(2)}`, // More unique ID
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
      redundancyPixels: Math.round(redundancyPixels),
      chartjunkPixels: chartjunkPixels,
    },
  };
}