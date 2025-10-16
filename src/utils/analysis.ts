/**
 * Layered Analysis Engine for Data-Ink Ratio Calculator
 * 
 * Core Logic:
 * - Each selection box is a layer
 * - Last-drawn (highest index) layer takes priority in overlaps
 * - No pixel is counted twice
 * - Uses Set<string> to track processed pixels
 */

import { SelectionBox, LayerResult, AnalysisResult } from "../types";

/**
 * Determines if a pixel contains "ink" based on color distance from background
 */
function isInkPixel(
  r: number, 
  g: number, 
  b: number, 
  a: number,
  bgColor: { r: number; g: number; b: number } = { r: 255, g: 255, b: 255 }
): boolean {
  // If alpha is very low, it's transparent (no ink)
  if (a < 13) return false; // 0.05 * 255 ≈ 13
  
  // Calculate color distance from background using Euclidean distance
  const distance = Math.sqrt(
    Math.pow(r - bgColor.r, 2) +
    Math.pow(g - bgColor.g, 2) +
    Math.pow(b - bgColor.b, 2)
  );
  
  // If distance is significant, it's ink (threshold ~30 works for most cases)
  return distance > 30;
}

/**
 * Get pixel data at specific coordinates
 */
function getPixelData(
  imageData: ImageData,
  x: number,
  y: number
): [number, number, number, number] {
  const idx = (y * imageData.width + x) * 4;
  return [
    imageData.data[idx],     // R
    imageData.data[idx + 1], // G
    imageData.data[idx + 2], // B
    imageData.data[idx + 3], // A
  ];
}

/**
 * Main analysis function implementing layered pixel counting
 * 
 * @param imageData - Canvas ImageData from the uploaded image
 * @param selections - Array of selection boxes (order matters: last = topmost)
 * @returns Analysis results with per-layer and aggregate metrics
 */
export function analyzeImage(
  imageData: ImageData,
  selections: SelectionBox[],
  backgroundColor?: { r: number; g: number; b: number }
): AnalysisResult {
  const { width, height } = imageData;
  const totalImagePixels = width * height;
  
  // Track which pixels have been processed (belong to a layer)
  const processedPixels = new Set<string>();
  
  // Calculate total ink pixels in the entire image (for efficiency ratio)
  let totalInkPixels = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixelData(imageData, x, y);
      if (isInkPixel(r, g, b, a, backgroundColor)) {
        totalInkPixels++;
      }
    }
  }
  
  // Process selections in reverse order (last drawn = topmost layer)
  const layers: LayerResult[] = [];
  
  for (let i = selections.length - 1; i >= 0; i--) {
    const selection = selections[i];
    const { x, y, width: w, height: h, id, label, color, isData, countFullArea } = selection;
    
    // Calculate bounds (clamp to image dimensions)
    const x1 = Math.max(0, Math.floor(x));
    const y1 = Math.max(0, Math.floor(y));
    const x2 = Math.min(width, Math.ceil(x + w));
    const y2 = Math.min(height, Math.ceil(y + h));
    
    let totalPixels = 0;
    let inkPixels = 0;
    
    // Iterate through all pixels in this selection's rectangle
    for (let py = y1; py < y2; py++) {
      for (let px = x1; px < x2; px++) {
        const pixelKey = `${px},${py}`;
        
        // Skip if this pixel was already counted by a higher layer
        if (processedPixels.has(pixelKey)) continue;
        
        // Mark as processed
        processedPixels.add(pixelKey);
        totalPixels++;
        
        // Count ink pixels (or all if countFullArea is checked)
        if (countFullArea) {
          inkPixels++;
        } else {
          const [r, g, b, a] = getPixelData(imageData, px, py);
          if (isInkPixel(r, g, b, a, backgroundColor)) {
            inkPixels++;
          }
        }
      }
    }
    
    // Add result for this layer (maintain original order in results)
    layers.unshift({
      id,
      label,
      color,
      isData,
      totalPixels,
      inkPixels,
      countFullArea,
    });
  }
  
  // Calculate aggregate metrics
  let totalDataPixels = 0;
  let totalNonDataPixels = 0;
  
  layers.forEach(layer => {
    if (layer.isData) {
      totalDataPixels += layer.inkPixels;
    } else {
      totalNonDataPixels += layer.inkPixels;
    }
  });
  
  // Calculate ratios
  const densityRatio = totalImagePixels > 0 
    ? totalDataPixels / totalImagePixels 
    : 0;
  
  const efficiencyRatio = totalInkPixels > 0 
    ? totalDataPixels / totalInkPixels 
    : 0;
  
  return {
    layers,
    totalImagePixels,
    totalInkPixels,
    totalDataPixels,
    totalNonDataPixels,
    densityRatio,
    efficiencyRatio,
  };
}

/**
 * Export results to JSON format
 */
export function exportToJSON(result: AnalysisResult): string {
  return JSON.stringify(result, null, 2);
}

/**
 * Export results to CSV format
 */
export function exportToCSV(result: AnalysisResult): string {
  const headers = [
    "Layer ID",
    "Label",
    "Classification",
    "Total Pixels",
    "Ink Pixels",
    "Count Full Area",
  ];
  
  const rows = result.layers.map(layer => [
    layer.id,
    layer.label,
    layer.isData ? "Data" : "Non-Data",
    layer.totalPixels.toString(),
    layer.inkPixels.toString(),
    layer.countFullArea ? "Yes" : "No",
  ]);
  
  const summaryRows = [
    [""],
    ["Summary"],
    ["Total Image Pixels", result.totalImagePixels.toString()],
    ["Total Ink Pixels", result.totalInkPixels.toString()],
    ["Total Data Pixels", result.totalDataPixels.toString()],
    ["Total Non-Data Pixels", result.totalNonDataPixels.toString()],
    ["Density Ratio", result.densityRatio.toFixed(4)],
    ["Efficiency Ratio", result.efficiencyRatio.toFixed(4)],
  ];
  
  const allRows = [headers, ...rows, ...summaryRows];
  return allRows.map(row => row.join(",")).join("\n");
}
