/**
 * Layered Analysis Engine for Data-Ink Ratio Calculator
 *
 * Core Logic:
 * - Each selection box defines a layer.
 * - Layers are processed from top (last drawn) to bottom.
 * - Pixels are counted only once, assigned to the topmost layer they fall within.
 * - Ink detection is based on color distance from a specified background color.
 */

import { SelectionBox, LayerResult, AnalysisResult } from "../types";

/**
 * Calculates the Euclidean distance between two colors in RGB space.
 * Used to determine if a pixel color is significantly different from the background.
 */
function colorDistance(
  r1: number, g1: number, b1: number,
  r2: number, g2: number, b2: number
): number {
  return Math.sqrt(
    Math.pow(r1 - r2, 2) +
    Math.pow(g1 - g2, 2) +
    Math.pow(b1 - b2, 2)
  );
}


/**
 * Determines if a pixel contains "ink" based on its color distance
 * from the specified background color and an alpha threshold.
 *
 * @param r - Red channel value (0-255)
 * @param g - Green channel value (0-255)
 * @param b - Blue channel value (0-255)
 * @param a - Alpha channel value (0-255)
 * @param bgColor - The background color to compare against. Defaults to white.
 * @param inkThreshold - The minimum color distance from background to be considered ink.
 * @returns True if the pixel is considered ink, false otherwise.
 */
function isInkPixel(
  r: number,
  g: number,
  b: number,
  a: number,
  bgColor: { r: number; g: number; b: number } = { r: 255, g: 255, b: 255 },
  inkThreshold: number // Added parameter
): boolean {
  // If alpha is very low (nearly transparent), it's not ink.
  // Threshold of 13 corresponds to ~5% opacity (0.05 * 255).
  if (a < 13) return false;

  // Calculate color distance from the background color.
  const distance = colorDistance(r, g, b, bgColor.r, bgColor.g, bgColor.b);

  // Consider it ink if the distance exceeds the threshold.
  return distance > inkThreshold; // Use the parameter
}

/**
 * Retrieves the RGBA color data for a pixel at the given coordinates.
 */
function getPixelData(
  imageData: ImageData,
  x: number,
  y: number
): [number, number, number, number] {
   // Ensure coordinates are within bounds
   const clampedX = Math.max(0, Math.min(imageData.width - 1, Math.floor(x)));
   const clampedY = Math.max(0, Math.min(imageData.height - 1, Math.floor(y)));

  // Calculate the index for the start of the pixel data (R channel)
  const idx = (clampedY * imageData.width + clampedX) * 4;
  return [
    imageData.data[idx],     // R
    imageData.data[idx + 1], // G
    imageData.data[idx + 2], // B
    imageData.data[idx + 3], // A
  ];
}

/**
 * Performs the main layered analysis of the image based on user selections.
 * Calculates data-ink ratios and per-layer statistics.
 *
 * @param imageData - The ImageData object of the chart image.
 * @param selections - An array of user-defined selection boxes (order defines layering).
 * @param backgroundColor - The detected or specified background color of the chart.
 * @param inkThreshold - The sensitivity threshold for detecting ink pixels.
 * @returns An AnalysisResult object containing detailed metrics.
 */
export function analyzeImage( // analyzeImage is already exported correctly
  imageData: ImageData,
  selections: SelectionBox[],
  backgroundColor: { r: number; g: number; b: number } = { r: 255, g: 255, b: 255 }, // Default background to white
  inkThreshold: number // Added parameter
): AnalysisResult {
  const { width, height } = imageData;
  const totalImagePixels = width * height;

  // Use a Set to efficiently track pixels that have already been assigned to a layer.
  // Key format: "x,y"
  const processedPixels = new Set<string>();

  // Pre-calculate total ink pixels in the entire image for the efficiency ratio denominator.
  // This is done once for performance.
  let totalInkPixels = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixelData(imageData, x, y);
      // Use the inkThreshold parameter here
      if (isInkPixel(r, g, b, a, backgroundColor, inkThreshold)) {
        totalInkPixels++;
      }
    }
  }

  // Initialize results array for each layer.
  const layers: LayerResult[] = [];

  // Process selections in reverse order (last drawn = topmost layer).
  // This ensures correct handling of overlapping selections.
  for (let i = selections.length - 1; i >= 0; i--) {
    const selection = selections[i];
    const { x, y, width: w, height: h, id, label, color, isData, countFullArea } = selection;

    // Calculate the integer pixel bounds for the current selection, clamped to image dimensions.
    const x1 = Math.max(0, Math.floor(x));
    const y1 = Math.max(0, Math.floor(y));
    const x2 = Math.min(width, Math.ceil(x + w)); // Use ceil for end boundary
    const y2 = Math.min(height, Math.ceil(y + h)); // Use ceil for end boundary


    let layerTotalPixels = 0; // Pixels exclusively assigned to this layer
    let layerInkPixels = 0;   // Ink pixels exclusively assigned to this layer

    // Iterate over every pixel within the selection's bounding box.
    for (let py = y1; py < y2; py++) {
      for (let px = x1; px < x2; px++) {
        const pixelKey = `${px},${py}`;

        // IMPORTANT: Skip if this pixel has already been claimed by a layer above (processed earlier in this loop).
        if (processedPixels.has(pixelKey)) continue;

        // Mark this pixel as processed and assign it to the current layer.
        processedPixels.add(pixelKey);
        layerTotalPixels++;

        // Determine if this pixel counts as ink for this layer.
        if (countFullArea) {
          // If 'Count Full Area' is checked, every pixel in the layer counts as ink.
          layerInkPixels++;
        } else {
          // Otherwise, check if the pixel's color qualifies as ink.
          const [r, g, b, a] = getPixelData(imageData, px, py);
          // Use the inkThreshold parameter here as well
          if (isInkPixel(r, g, b, a, backgroundColor, inkThreshold)) {
            layerInkPixels++;
          }
        }
      }
    }

    // Store the results for this layer. Insert at the beginning to maintain original selection order.
    layers.unshift({
      id,
      label,
      color,
      isData,
      totalPixels: layerTotalPixels, // Use the count of exclusively assigned pixels
      inkPixels: layerInkPixels,     // Use the count of exclusively assigned ink pixels
      countFullArea,
    });
  }

  // Aggregate results across all layers.
  let totalDataPixels = 0;
  let totalNonDataPixels = 0;

  layers.forEach(layer => {
    if (layer.isData) {
      totalDataPixels += layer.inkPixels;
    } else {
      totalNonDataPixels += layer.inkPixels;
    }
  });

  // Calculate overall ratios. Avoid division by zero.
  const densityRatio = totalImagePixels > 0
    ? totalDataPixels / totalImagePixels
    : 0;

   // Efficiency Ratio = Data Ink / Total Ink (calculated earlier across the whole image)
  const efficiencyRatio = totalInkPixels > 0
    ? totalDataPixels / totalInkPixels
    : 0;

  return {
    layers,
    totalImagePixels,
    totalInkPixels, // Use the pre-calculated total ink across the image
    totalDataPixels,
    totalNonDataPixels,
    densityRatio,
    efficiencyRatio,
  };
}

/**
 * Export results to JSON format
 */
// *** ADD export HERE ***
export function exportToJSON(result: AnalysisResult): string {
  return JSON.stringify(result, null, 2);
}

/**
 * Export results to CSV format
 */
// *** ADD export HERE ***
export function exportToCSV(result: AnalysisResult): string {
  const headers = [
    "Layer ID",
    "Label",
    "Classification",
    "Total Pixels (Exclusive)", // Clarified header
    "Ink Pixels (Exclusive)", // Clarified header
    "Count Full Area",
  ];

  const rows = result.layers.map(layer => [
    `"${layer.id.replace(/"/g, '""')}"`, // Quote IDs in case they contain commas
    `"${layer.label.replace(/"/g, '""')}"`, // Quote labels
    layer.isData ? "Data" : "Non-Data",
    layer.totalPixels.toString(),
    layer.inkPixels.toString(),
    layer.countFullArea ? "Yes" : "No",
  ]);

  const summaryRows = [
    [], // Empty row for separation
    ["Summary"],
    ["Total Image Pixels", result.totalImagePixels.toString()],
    ["Total Ink Pixels (Entire Image)", result.totalInkPixels.toString()], // Clarified header
    ["Total Data Pixels (Sum of Layers)", result.totalDataPixels.toString()], // Clarified header
    ["Total Non-Data Pixels (Sum of Layers)", result.totalNonDataPixels.toString()], // Clarified header
    ["Density Ratio (Data/Image)", result.densityRatio.toFixed(4)],
    ["Efficiency Ratio (Data/Total Ink)", result.efficiencyRatio.toFixed(4)],
  ];

  // Combine headers, layer rows, and summary rows
  const allRows = [headers, ...rows, ...summaryRows];

  // Map each row array to a CSV string, ensuring proper quoting for fields containing commas or quotes
  return allRows.map(row =>
    row.map(field => {
       // Basic CSV quoting: if field contains comma, quote, or newline, wrap in double quotes and escape internal quotes
       if (field && typeof field === 'string' && (field.includes(',') || field.includes('"') || field.includes('\n'))) {
           return `"${field.replace(/"/g, '""')}"`;
       }
       return field;
    }).join(",")
  ).join("\n");
}