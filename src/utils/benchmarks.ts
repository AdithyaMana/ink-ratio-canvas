/**
 * Chart Profiles and Benchmark Definitions
 * 
 * Each profile defines typical components for a chart type
 * and benchmark ranges for quality assessment
 */

import { ChartProfile } from "@/types";

export const chartProfiles: ChartProfile[] = [
  {
    id: "bar-chart",
    name: "Bar Chart",
    components: [
      { name: "Bars", isData: true, color: "#3b82f6" },
      { name: "X-Axis", isData: false, color: "#64748b" },
      { name: "Y-Axis", isData: false, color: "#64748b" },
      { name: "Gridlines", isData: false, color: "#94a3b8" },
      { name: "Legend", isData: false, color: "#475569" },
      { name: "Title", isData: false, color: "#1e293b" },
      { name: "Background", isData: false, color: "#f1f5f9" },
    ],
    benchmarks: {
      density: { good: 0.3, excellent: 0.5 },
      efficiency: { good: 0.6, excellent: 0.8 },
    },
  },
  {
    id: "line-chart",
    name: "Line Chart",
    components: [
      { name: "Lines", isData: true, color: "#3b82f6" },
      { name: "Data Points", isData: true, color: "#2563eb" },
      { name: "X-Axis", isData: false, color: "#64748b" },
      { name: "Y-Axis", isData: false, color: "#64748b" },
      { name: "Gridlines", isData: false, color: "#94a3b8" },
      { name: "Legend", isData: false, color: "#475569" },
      { name: "Title", isData: false, color: "#1e293b" },
      { name: "Background", isData: false, color: "#f1f5f9" },
    ],
    benchmarks: {
      density: { good: 0.2, excellent: 0.4 },
      efficiency: { good: 0.5, excellent: 0.75 },
    },
  },
  {
    id: "scatter-plot",
    name: "Scatter Plot",
    components: [
      { name: "Data Points", isData: true, color: "#3b82f6" },
      { name: "X-Axis", isData: false, color: "#64748b" },
      { name: "Y-Axis", isData: false, color: "#64748b" },
      { name: "Gridlines", isData: false, color: "#94a3b8" },
      { name: "Legend", isData: false, color: "#475569" },
      { name: "Title", isData: false, color: "#1e293b" },
      { name: "Background", isData: false, color: "#f1f5f9" },
    ],
    benchmarks: {
      density: { good: 0.15, excellent: 0.35 },
      efficiency: { good: 0.5, excellent: 0.75 },
    },
  },
  {
    id: "pie-chart",
    name: "Pie Chart",
    components: [
      { name: "Slices", isData: true, color: "#3b82f6" },
      { name: "Labels", isData: false, color: "#475569" },
      { name: "Legend", isData: false, color: "#64748b" },
      { name: "Title", isData: false, color: "#1e293b" },
      { name: "Background", isData: false, color: "#f1f5f9" },
    ],
    benchmarks: {
      density: { good: 0.4, excellent: 0.6 },
      efficiency: { good: 0.7, excellent: 0.85 },
    },
  },
  {
    id: "data-table",
    name: "Data Table",
    components: [
      { name: "Cell Text", isData: true, color: "#1e293b" },
      { name: "Headers", isData: false, color: "#475569" },
      { name: "Borders", isData: false, color: "#94a3b8" },
      { name: "Background", isData: false, color: "#f1f5f9" },
    ],
    benchmarks: {
      density: { good: 0.5, excellent: 0.7 },
      efficiency: { good: 0.75, excellent: 0.9 },
    },
  },
  {
    id: "heatmap",
    name: "Heatmap",
    components: [
      { name: "Cells", isData: true, color: "#3b82f6" },
      { name: "X-Axis Labels", isData: false, color: "#64748b" },
      { name: "Y-Axis Labels", isData: false, color: "#64748b" },
      { name: "Color Scale", isData: false, color: "#475569" },
      { name: "Title", isData: false, color: "#1e293b" },
      { name: "Background", isData: false, color: "#f1f5f9" },
    ],
    benchmarks: {
      density: { good: 0.5, excellent: 0.7 },
      efficiency: { good: 0.75, excellent: 0.9 },
    },
  },
  {
    id: "custom",
    name: "Custom Chart",
    components: [
      { name: "Data Element", isData: true, color: "#3b82f6" },
      { name: "Axis", isData: false, color: "#64748b" },
      { name: "Label", isData: false, color: "#475569" },
      { name: "Decoration", isData: false, color: "#94a3b8" },
    ],
    benchmarks: {
      density: { good: 0.3, excellent: 0.5 },
      efficiency: { good: 0.6, excellent: 0.8 },
    },
  },
];

/**
 * Get verdict text based on ratio and benchmarks
 */
export function getVerdictText(
  ratio: number,
  benchmarks: { good: number; excellent: number },
  ratioType: "density" | "efficiency",
  chartName: string
): { text: string; color: string } {
  if (ratio >= benchmarks.excellent) {
    return {
      text: `Excellent for a ${chartName}`,
      color: "text-green-600 dark:text-green-400",
    };
  } else if (ratio >= benchmarks.good) {
    return {
      text: `Good for a ${chartName}`,
      color: "text-blue-600 dark:text-blue-400",
    };
  } else if (ratio >= benchmarks.good * 0.7) {
    return {
      text: `Fair for a ${chartName}`,
      color: "text-yellow-600 dark:text-yellow-400",
    };
  } else {
    return {
      text: `Poor for a ${chartName}`,
      color: "text-red-600 dark:text-red-400",
    };
  }
}
