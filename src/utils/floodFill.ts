/**
 * Flood Fill Algorithm for Magic Wand Selection
 * Finds a contiguous region of similar color starting from a seed point.
 */

interface Point {
  x: number;
  y: number;
}

interface BoundingBox {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

/**
 * Calculate the Euclidean distance between two colors in RGB space.
 */
function colorDistance(
  r1: number, g1: number, b1: number,
  r2: number, g2: number, b2: number
): number {
  // Simple Euclidean distance
  return Math.sqrt(
    Math.pow(r1 - r2, 2) +
    Math.pow(g1 - g2, 2) +
    Math.pow(b1 - b2, 2)
  );
}

/**
 * Performs a flood fill (scanline variant for potential performance improvement, though simpler 4-way used here)
 * to find a contiguous region of pixels similar in color to the starting pixel.
 * Ignores transparency and respects a color tolerance threshold.
 *
 * @param imageData - The ImageData object of the image.
 * @param startX - The starting X coordinate for the fill.
 * @param startY - The starting Y coordinate for the fill.
 * @param tolerance - The maximum color distance allowed for pixels to be included in the region.
 * @param minRegionSize - The minimum number of pixels required for a region to be considered valid.
 * @returns A BoundingBox object encompassing the filled region, or null if the region is too small or invalid.
 */
export function floodFill(
  imageData: ImageData,
  startX: number,
  startY: number,
  tolerance: number = 30, // Default tolerance
  minRegionSize: number = 10 // Minimum pixels for a valid region
): BoundingBox | null {
  const { width, height, data } = imageData;

  // Ensure start point is within image bounds
  if (startX < 0 || startX >= width || startY < 0 || startY >= height) {
    console.error("Flood fill start point out of bounds.");
    return null;
  }

  // Get the color and alpha of the starting pixel
  const startIdx = (startY * width + startX) * 4;
  const targetR = data[startIdx];
  const targetG = data[startIdx + 1];
  const targetB = data[startIdx + 2];
  const targetA = data[startIdx + 3];

  // Do not fill from a transparent or nearly transparent area
  if (targetA < 13) { // ~5% opacity threshold
    console.warn("Flood fill cannot start on a transparent pixel.");
    return null;
  }

  // Use a Set to keep track of visited pixels efficiently (key: "x,y")
  const visited = new Set<string>();
  // Use a stack for the iterative flood fill process
  const stack: Point[] = [{ x: startX, y: startY }];

  // Initialize bounding box coordinates
  let minX = startX;
  let maxX = startX;
  let minY = startY;
  let maxY = startY;

  // Flood fill algorithm (4-connectivity)
  while (stack.length > 0) {
    const point = stack.pop()!; // Non-null assertion as stack.length > 0
    const { x, y } = point;

    // 1. Boundary Check: Skip if pixel is outside image bounds
    if (x < 0 || x >= width || y < 0 || y >= height) continue;

    // 2. Visited Check: Skip if pixel has already been processed
    const key = `${x},${y}`;
    if (visited.has(key)) continue;

    // 3. Color Check: Get current pixel's color and alpha
    const idx = (y * width + x) * 4;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    const a = data[idx + 3];

    // 4. Transparency Check: Skip transparent pixels
    if (a < 13) continue; // ~5% opacity

    // 5. Tolerance Check: Calculate color distance and skip if too different
    const distance = colorDistance(r, g, b, targetR, targetG, targetB);
    if (distance > tolerance) continue; // Use the tolerance parameter

    // --- Pixel is valid ---

    // 6. Mark as visited
    visited.add(key);

    // 7. Update Bounding Box: Expand bounds if necessary
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);

    // 8. Add Neighbors: Push adjacent pixels (up, down, left, right) onto the stack
    stack.push({ x: x + 1, y });
    stack.push({ x: x - 1, y });
    stack.push({ x, y: y + 1 });
    stack.push({ x, y: y - 1 });
  }

  // 9. Minimum Size Check: If the filled region is too small, return null
  if (visited.size < minRegionSize) {
    console.log(`Flood fill region too small: ${visited.size} pixels (min ${minRegionSize})`);
    return null;
  }

  // 10. Return Bounding Box: Add a small padding for the selection box
  const padding = 2; // Small padding around the detected region
  return {
    minX: Math.max(0, minX - padding),
    maxX: Math.min(width - 1, maxX + padding),
    minY: Math.max(0, minY - padding),
    maxY: Math.min(height - 1, maxY + padding),
  };
}