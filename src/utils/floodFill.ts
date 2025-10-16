/**
 * Flood Fill Algorithm for Magic Wand Selection
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
 * Calculate color distance between two pixels
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
 * Perform flood fill to find contiguous region
 * Returns a bounding box around the filled region
 */
export function floodFill(
  imageData: ImageData,
  startX: number,
  startY: number,
  tolerance: number = 30
): BoundingBox | null {
  const { width, height, data } = imageData;
  
  // Bounds check
  if (startX < 0 || startX >= width || startY < 0 || startY >= height) {
    return null;
  }
  
  // Get starting pixel color
  const startIdx = (startY * width + startX) * 4;
  const targetR = data[startIdx];
  const targetG = data[startIdx + 1];
  const targetB = data[startIdx + 2];
  const targetA = data[startIdx + 3];
  
  // Skip if transparent
  if (targetA < 13) return null;
  
  // Track visited pixels
  const visited = new Set<string>();
  const stack: Point[] = [{ x: startX, y: startY }];
  
  let minX = startX;
  let maxX = startX;
  let minY = startY;
  let maxY = startY;
  
  while (stack.length > 0) {
    const point = stack.pop()!;
    const { x, y } = point;
    
    // Skip if out of bounds
    if (x < 0 || x >= width || y < 0 || y >= height) continue;
    
    // Skip if already visited
    const key = `${x},${y}`;
    if (visited.has(key)) continue;
    
    // Get pixel color
    const idx = (y * width + x) * 4;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    const a = data[idx + 3];
    
    // Skip if transparent
    if (a < 13) continue;
    
    // Check if color is similar
    const distance = colorDistance(r, g, b, targetR, targetG, targetB);
    if (distance > tolerance) continue;
    
    // Mark as visited
    visited.add(key);
    
    // Update bounding box
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
    
    // Add neighbors to stack
    stack.push({ x: x + 1, y });
    stack.push({ x: x - 1, y });
    stack.push({ x, y: y + 1 });
    stack.push({ x, y: y - 1 });
  }
  
  // Return null if region too small
  if (visited.size < 10) return null;
  
  // Add small padding to bounding box
  const padding = 2;
  return {
    minX: Math.max(0, minX - padding),
    maxX: Math.min(width - 1, maxX + padding),
    minY: Math.max(0, minY - padding),
    maxY: Math.min(height - 1, maxY + padding),
  };
}
