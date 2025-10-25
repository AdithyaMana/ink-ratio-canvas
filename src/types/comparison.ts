/**
 * Comparison feature type definitions
 */

import { AnalysisResult } from "./index";

export type ReferenceType = "ideal" | "common" | "best-practice" | "custom";

export interface ReferenceVisualization {
  id: string;
  name: string;
  description: string;
  chartType: string;
  type: ReferenceType;
  efficiencyRatio: number;
  analysisResult: AnalysisResult;
  imageUrl?: string;
  metadata: {
    dataInkPixels: number;
    totalInkPixels: number;
    redundancyPixels: number;
    chartjunkPixels: number;
  };
}

export interface ComparisonResult {
  userResult: AnalysisResult;
  referenceResult: AnalysisResult;
  reference: ReferenceVisualization;
  metrics: {
    absoluteDifference: number;
    relativeDifference: number; // percentage
    efficiencyGap: number;
    userEfficiency: number;
    referenceEfficiency: number;
  };
  breakdown: {
    dataInkDiff: number;
    redundancyDiff: number;
    chartjunkDiff: number;
  };
  interpretation: {
    summary: string;
    grade: "excellent" | "good" | "fair" | "poor";
    insights: string[];
    recommendations: string[];
  };
}

export interface ComparisonMode {
  type: ReferenceType;
  label: string;
  description: string;
}
