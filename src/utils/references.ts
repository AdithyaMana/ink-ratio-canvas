/**
 * Reference Visualization Library
 * Contains ideal, common, and best-practice references for each chart type
 */

import { ReferenceVisualization, ReferenceType } from "@/types/comparison";
import { AnalysisResult } from "@/types";

/**
 * Creates a reference analysis result with predefined metrics
 */
function createReferenceAnalysis(
  chartType: string,
  type: ReferenceType,
  dataPixels: number,
  inkPixels: number
): AnalysisResult {
  const nonDataPixels = inkPixels - dataPixels;
  
  return {
    layers: [
      {
        id: "ref-data",
        label: "Data Layer",
        color: "#3b82f6",
        isData: true,
        totalPixels: dataPixels,
        inkPixels: dataPixels,
        countFullArea: false,
      },
      {
        id: "ref-nondata",
        label: "Non-Data Layer",
        color: "#64748b",
        isData: false,
        totalPixels: nonDataPixels,
        inkPixels: nonDataPixels,
        countFullArea: false,
      },
    ],
    totalImagePixels: 640 * 480, // Standard reference size
    totalInkPixels: inkPixels,
    totalDataPixels: dataPixels,
    totalNonDataPixels: nonDataPixels,
    densityRatio: dataPixels / (640 * 480),
    efficiencyRatio: dataPixels / inkPixels,
  };
}

/**
 * Reference library organized by chart type
 */
const referenceLibrary: Record<string, ReferenceVisualization[]> = {
  "bar-chart": [
    {
      id: "bar-ideal",
      name: "Ideal Bar Chart",
      description: "Theoretical minimum: only bars with minimal axis labels",
      chartType: "bar-chart",
      type: "ideal",
      efficiencyRatio: 0.85,
      analysisResult: createReferenceAnalysis("bar-chart", "ideal", 68000, 80000),
      metadata: {
        dataInkPixels: 68000,
        totalInkPixels: 80000,
        redundancyPixels: 0,
        chartjunkPixels: 0,
      },
    },
    {
      id: "bar-common",
      name: "Common Bar Chart",
      description: "Typical Excel/Tableau style with gridlines and legends",
      chartType: "bar-chart",
      type: "common",
      efficiencyRatio: 0.45,
      analysisResult: createReferenceAnalysis("bar-chart", "common", 54000, 120000),
      metadata: {
        dataInkPixels: 54000,
        totalInkPixels: 120000,
        redundancyPixels: 35000,
        chartjunkPixels: 31000,
      },
    },
    {
      id: "bar-best-practice",
      name: "Best Practice Bar Chart",
      description: "Tufte-style: clean, minimal, data-focused design",
      chartType: "bar-chart",
      type: "best-practice",
      efficiencyRatio: 0.72,
      analysisResult: createReferenceAnalysis("bar-chart", "best-practice", 64800, 90000),
      metadata: {
        dataInkPixels: 64800,
        totalInkPixels: 90000,
        redundancyPixels: 12000,
        chartjunkPixels: 13200,
      },
    },
  ],
  "line-chart": [
    {
      id: "line-ideal",
      name: "Ideal Line Chart",
      description: "Theoretical minimum: clean lines with essential markers",
      chartType: "line-chart",
      type: "ideal",
      efficiencyRatio: 0.80,
      analysisResult: createReferenceAnalysis("line-chart", "ideal", 56000, 70000),
      metadata: {
        dataInkPixels: 56000,
        totalInkPixels: 70000,
        redundancyPixels: 0,
        chartjunkPixels: 0,
      },
    },
    {
      id: "line-common",
      name: "Common Line Chart",
      description: "Standard line chart with full gridlines and decorations",
      chartType: "line-chart",
      type: "common",
      efficiencyRatio: 0.38,
      analysisResult: createReferenceAnalysis("line-chart", "common", 42000, 110000),
      metadata: {
        dataInkPixels: 42000,
        totalInkPixels: 110000,
        redundancyPixels: 40000,
        chartjunkPixels: 28000,
      },
    },
    {
      id: "line-best-practice",
      name: "Best Practice Line Chart",
      description: "Minimalist design emphasizing trend clarity",
      chartType: "line-chart",
      type: "best-practice",
      efficiencyRatio: 0.68,
      analysisResult: createReferenceAnalysis("line-chart", "best-practice", 54400, 80000),
      metadata: {
        dataInkPixels: 54400,
        totalInkPixels: 80000,
        redundancyPixels: 14000,
        chartjunkPixels: 11600,
      },
    },
  ],
  "scatter-plot": [
    {
      id: "scatter-ideal",
      name: "Ideal Scatter Plot",
      description: "Pure data points with minimal axis infrastructure",
      chartType: "scatter-plot",
      type: "ideal",
      efficiencyRatio: 0.78,
      analysisResult: createReferenceAnalysis("scatter-plot", "ideal", 46800, 60000),
      metadata: {
        dataInkPixels: 46800,
        totalInkPixels: 60000,
        redundancyPixels: 0,
        chartjunkPixels: 0,
      },
    },
    {
      id: "scatter-common",
      name: "Common Scatter Plot",
      description: "Standard scatter with gridlines and regression line",
      chartType: "scatter-plot",
      type: "common",
      efficiencyRatio: 0.35,
      analysisResult: createReferenceAnalysis("scatter-plot", "common", 38500, 110000),
      metadata: {
        dataInkPixels: 38500,
        totalInkPixels: 110000,
        redundancyPixels: 42000,
        chartjunkPixels: 29500,
      },
    },
    {
      id: "scatter-best-practice",
      name: "Best Practice Scatter Plot",
      description: "Clean, focused scatter emphasizing data patterns",
      chartType: "scatter-plot",
      type: "best-practice",
      efficiencyRatio: 0.65,
      analysisResult: createReferenceAnalysis("scatter-plot", "best-practice", 48750, 75000),
      metadata: {
        dataInkPixels: 48750,
        totalInkPixels: 75000,
        redundancyPixels: 15000,
        chartjunkPixels: 11250,
      },
    },
  ],
  "pie-chart": [
    {
      id: "pie-ideal",
      name: "Ideal Pie Chart",
      description: "Simple slices with minimal labeling",
      chartType: "pie-chart",
      type: "ideal",
      efficiencyRatio: 0.82,
      analysisResult: createReferenceAnalysis("pie-chart", "ideal", 65600, 80000),
      metadata: {
        dataInkPixels: 65600,
        totalInkPixels: 80000,
        redundancyPixels: 0,
        chartjunkPixels: 0,
      },
    },
    {
      id: "pie-common",
      name: "Common Pie Chart",
      description: "Typical pie with 3D effects and external legends",
      chartType: "pie-chart",
      type: "common",
      efficiencyRatio: 0.40,
      analysisResult: createReferenceAnalysis("pie-chart", "common", 52000, 130000),
      metadata: {
        dataInkPixels: 52000,
        totalInkPixels: 130000,
        redundancyPixels: 38000,
        chartjunkPixels: 40000,
      },
    },
    {
      id: "pie-best-practice",
      name: "Best Practice Pie Chart",
      description: "Clean, 2D slices with integrated labels",
      chartType: "pie-chart",
      type: "best-practice",
      efficiencyRatio: 0.70,
      analysisResult: createReferenceAnalysis("pie-chart", "best-practice", 63000, 90000),
      metadata: {
        dataInkPixels: 63000,
        totalInkPixels: 90000,
        redundancyPixels: 13500,
        chartjunkPixels: 13500,
      },
    },
  ],
};

/**
 * Get all references for a specific chart type
 */
export function getReferencesForChartType(chartType: string): ReferenceVisualization[] {
  return referenceLibrary[chartType] || [];
}

/**
 * Get a specific reference by ID
 */
export function getReferenceById(id: string): ReferenceVisualization | null {
  for (const refs of Object.values(referenceLibrary)) {
    const found = refs.find((ref) => ref.id === id);
    if (found) return found;
  }
  return null;
}

/**
 * Get reference by type and chart type
 */
export function getReferenceByType(
  chartType: string,
  type: ReferenceType
): ReferenceVisualization | null {
  const refs = referenceLibrary[chartType] || [];
  return refs.find((ref) => ref.type === type) || null;
}

/**
 * Get all available chart types
 */
export function getAvailableChartTypes(): string[] {
  return Object.keys(referenceLibrary);
}
