/**
 * Type definitions for Data-Ink Ratio Calculator
 */

export interface SelectionBox {
  id: string;
  x: number; // Pixel coordinates in original image
  y: number;
  width: number;
  height: number;
  label: string;
  color: string;
  isData: boolean;
  countFullArea: boolean;
}

export interface LayerResult {
  id: string;
  label: string;
  color: string;
  isData: boolean;
  totalPixels: number;
  inkPixels: number;
  countFullArea: boolean;
}

export interface AnalysisResult {
  layers: LayerResult[];
  totalImagePixels: number;
  totalInkPixels: number;
  totalDataPixels: number;
  totalNonDataPixels: number;
  densityRatio: number; // DataPixels / TotalImagePixels
  efficiencyRatio: number; // DataPixels / TotalInkPixels
}

export interface ImageData {
  url: string;
  width: number;
  height: number;
  bitmap: ImageBitmap;
}

export type RatioType = "density" | "efficiency";
