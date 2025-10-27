import { useRef, useEffect, useState, useCallback } from "react";
// *** ADD cn import ***
import { cn } from "@/lib/utils"; // <--- ADD THIS LINE
import { SelectionBox, ComponentDefinition, ImageData as AppImageData } from "../types";
import { Trash2, Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { floodFill } from "../utils/floodFill";

// Define Point type locally if not imported
interface Point {
  x: number;
  y: number;
}


interface ImageCanvasProps {
  imageUrl: string | null;
  imageWidth: number;
  imageHeight: number;
  selections: SelectionBox[];
  onSelectionsChange: (selections: SelectionBox[]) => void;
  onImageReady: (imageData: ImageData | null, bitmap: ImageBitmap | null) => void; // Allow null on error
  toolMode: "select" | "eyedropper" | "magicwand";
  onBackgroundColorSample: (color: { r: number; g: number; b: number }) => void;
  currentComponent: ComponentDefinition | null;
  magicWandTolerance: number;
  isImageLoading: boolean;
}

type DragMode = "draw" | "move" | "resize" | null;
type ResizeHandle = "nw" | "ne" | "sw" | "se" | "n" | "s" | "e" | "w" | null;

export function ImageCanvas({
  imageUrl,
  imageWidth,
  imageHeight,
  selections,
  onSelectionsChange,
  onImageReady,
  toolMode,
  onBackgroundColorSample,
  currentComponent,
  magicWandTolerance,
  isImageLoading,
}: ImageCanvasProps) {
  // Use separate refs for display and offscreen data canvas
  const displayCanvasRef = useRef<HTMLCanvasElement>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null); // Ref for the zoom/pan container

  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [dragMode, setDragMode] = useState<DragMode>(null);
  const [startPoint, setStartPoint] = useState({ x: 0, y: 0 }); // In image coordinates
  const [currentBox, setCurrentBox] = useState<SelectionBox | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [resizeHandle, setResizeHandle] = useState<ResizeHandle>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [imageBitmap, setImageBitmap] = useState<ImageBitmap | null>(null);

  // Recalculate Scale and Centering
  useEffect(() => {
    // Check if containerRef.current exists before accessing clientWidth/clientHeight
    if (!containerRef.current || !imageWidth || !imageHeight || imageWidth === 0 || imageHeight === 0) return;

    const container = containerRef.current;
    const padding = 16; // Adjust if container has padding (e.g., p-4 -> 16px)
    const containerWidth = container.clientWidth - padding * 2;
    const containerHeight = container.clientHeight - padding * 2;

    if (containerWidth <= 0 || containerHeight <= 0) return;

    const scaleX = containerWidth / imageWidth;
    const scaleY = containerHeight / imageHeight;
    const newScale = Math.min(scaleX, scaleY, 1);
    setScale(newScale);

    // Center the image initially within the container
    const centeredX = (container.clientWidth - imageWidth * newScale) / 2;
    const centeredY = (container.clientHeight - imageHeight * newScale) / 2;
    setOffset({ x: centeredX, y: centeredY });

  }, [imageWidth, imageHeight]); // Removed containerRef from dependencies - size changes handled implicitly


  // Load image, extract ImageData, create ImageBitmap
  useEffect(() => {
    if (!imageUrl) {
        setImageBitmap(null);
        if (offscreenCanvasRef.current) {
            const ctx = offscreenCanvasRef.current.getContext('2d');
            ctx?.clearRect(0, 0, offscreenCanvasRef.current.width, offscreenCanvasRef.current.height);
        }
        return;
    };

    let isCancelled = false;
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = async () => {
       if (isCancelled) return;
       try {
           const bitmap = await createImageBitmap(img);
           if (isCancelled) return;
           setImageBitmap(bitmap);

           if (!offscreenCanvasRef.current) {
               offscreenCanvasRef.current = document.createElement('canvas');
           }
           const offscreenCanvas = offscreenCanvasRef.current;
           offscreenCanvas.width = img.width;
           offscreenCanvas.height = img.height;
           const ctx = offscreenCanvas.getContext("2d", { willReadFrequently: true });
           if (!ctx) throw new Error("Failed to get offscreen 2D context");

           ctx.drawImage(img, 0, 0);
           const imageData = ctx.getImageData(0, 0, img.width, img.height);
           onImageReady(imageData, bitmap);

       } catch (error) {
           console.error("Error creating ImageBitmap or getting ImageData:", error);
           onImageReady(null, null); // Notify parent of error
       }
    };
    img.onerror = (e) => {
      if (isCancelled) return;
      console.error("Error loading image:", e);
      onImageReady(null, null); // Notify parent of error
    };
    img.src = imageUrl;

    return () => { isCancelled = true; };
  }, [imageUrl, onImageReady]);

  // Redraw canvas with image and selections
  useEffect(() => {
    if (!displayCanvasRef.current || !imageBitmap || !imageWidth || !imageHeight) return;

    const canvas = displayCanvasRef.current;
     canvas.width = imageWidth;
     canvas.height = imageHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(imageBitmap, 0, 0);

    selections.forEach((sel) => {
        const isSelected = sel.id === selectedId;
        ctx.strokeStyle = sel.color;
        ctx.lineWidth = isSelected ? (3 / scale) : (2 / scale); // Scale line width
        ctx.fillStyle = sel.color + (isSelected ? "40" : "20"); // Adjusted opacity

        ctx.fillRect(sel.x, sel.y, sel.width, sel.height);
        ctx.strokeRect(sel.x, sel.y, sel.width, sel.height);

        // --- Draw Label ---
        ctx.font = `bold ${13 / scale}px sans-serif`; // Scale font size
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        const text = sel.label;
        const textMetrics = ctx.measureText(text);
        const textPadding = 4 / scale; // Scaled padding
        const textHeight = 14 / scale; // Approximate scaled height

        // Label Background
        ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
        ctx.fillRect(sel.x + textPadding, sel.y + textPadding, textMetrics.width + textPadding * 2, textHeight + textPadding);

        // Label Text
        ctx.fillStyle = sel.color;
        ctx.fillText(text, sel.x + textPadding * 2, sel.y + textPadding + (2 / scale));
        // ---------------

        if (isSelected) {
            const handleSize = 8 / scale;
            const halfHandle = handleSize / 2;
            ctx.fillStyle = sel.color;
            ctx.strokeStyle = "white";
            ctx.lineWidth = 1 / scale;

            const handles = [
                { x: sel.x, y: sel.y }, { x: sel.x + sel.width, y: sel.y },
                { x: sel.x, y: sel.y + sel.height }, { x: sel.x + sel.width, y: sel.y + sel.height },
            ];
            handles.forEach(handle => {
                 ctx.fillRect(handle.x - halfHandle, handle.y - halfHandle, handleSize, handleSize);
                 ctx.strokeRect(handle.x - halfHandle, handle.y - halfHandle, handleSize, handleSize);
            });
        }
    });

    if (currentBox) {
      ctx.strokeStyle = currentComponent?.color || "#3b82f6";
      ctx.lineWidth = 2 / scale;
      ctx.setLineDash([6 / scale, 4 / scale]);
      ctx.strokeRect(currentBox.x, currentBox.y, currentBox.width, currentBox.height);
      ctx.setLineDash([]);
    }
  }, [imageBitmap, selections, selectedId, currentBox, scale, imageWidth, imageHeight, currentComponent]);


  // Screen to Image Coordinates
  const screenToImageCoords = useCallback((screenX: number, screenY: number): Point => {
     // Use containerRef for bounding rect as canvas itself moves
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    const imageX = (screenX - rect.left - offset.x) / scale;
    const imageY = (screenY - rect.top - offset.y) / scale;
    return { x: imageX, y: imageY };
  }, [scale, offset]);

 // Find Selection/Handle at Point
 const findSelectionAt = useCallback((imgX: number, imgY: number): SelectionBox | null => {
    for (let i = selections.length - 1; i >= 0; i--) {
      const sel = selections[i];
      // Use simple bounding box check
      if (imgX >= sel.x && imgX <= sel.x + sel.width && imgY >= sel.y && imgY <= sel.y + sel.height) {
        return sel;
      }
    }
    return null;
  }, [selections]);

 const findResizeHandle = useCallback((selection: SelectionBox, imgX: number, imgY: number): ResizeHandle => {
    const handleHitboxSize = 12 / scale;
    const threshold = handleHitboxSize / 2;
    const { x: sx, y: sy, width: sw, height: sh } = selection;
    const nearLeft = Math.abs(imgX - sx) < threshold;
    const nearRight = Math.abs(imgX - (sx + sw)) < threshold;
    const nearTop = Math.abs(imgY - sy) < threshold;
    const nearBottom = Math.abs(imgY - (sy + sh)) < threshold;
    if (nearLeft && nearTop) return "nw";
    if (nearRight && nearTop) return "ne";
    if (nearLeft && nearBottom) return "sw";
    if (nearRight && nearBottom) return "se";
    return null;
  }, [scale]);

  // Mouse Down Handler
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
     if (!imageBitmap || isImageLoading) return;
     const target = e.target as HTMLElement;
     // Check if the click target is the container itself or the canvas
     if (target !== containerRef.current && target !== displayCanvasRef.current) return;

    if (e.button === 1 || (e.button === 0 && (e.metaKey || e.ctrlKey || e.shiftKey))) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
      (e.currentTarget as HTMLDivElement).style.cursor = 'grabbing';
      return;
    }

     if (e.button === 0) {
        const { x: imgX, y: imgY } = screenToImageCoords(e.clientX, e.clientY);

        if (toolMode === "eyedropper" && offscreenCanvasRef.current) {
            const offscreenCtx = offscreenCanvasRef.current.getContext('2d', { willReadFrequently: true });
            if (offscreenCtx) {
                 const pixelData = offscreenCtx.getImageData(Math.floor(imgX), Math.floor(imgY), 1, 1).data;
                 onBackgroundColorSample({ r: pixelData[0], g: pixelData[1], b: pixelData[2] });
            }
            return;
        }

        if (toolMode === "magicwand" && offscreenCanvasRef.current) {
            const offscreenCtx = offscreenCanvasRef.current.getContext('2d', { willReadFrequently: true });
            if (offscreenCtx) {
                const imgData = offscreenCtx.getImageData(0, 0, offscreenCanvasRef.current.width, offscreenCanvasRef.current.height);
                const bbox = floodFill(imgData, Math.floor(imgX), Math.floor(imgY), magicWandTolerance);
                 if (bbox && bbox.maxX > bbox.minX && bbox.maxY > bbox.minY) {
                    const newBox: SelectionBox = {
                        id: `sel-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                        x: bbox.minX, y: bbox.minY,
                        width: bbox.maxX - bbox.minX + 1, height: bbox.maxY - bbox.minY + 1,
                        label: currentComponent?.name || `Region ${selections.length + 1}`,
                        color: currentComponent?.color || "#3b82f6",
                        isData: currentComponent?.isData ?? true,
                        countFullArea: false,
                    };
                    onSelectionsChange([...selections, newBox]);
                    setSelectedId(newBox.id);
                } else { console.log("Magic wand didn't find a significant region."); }
            }
            return;
        }

        if (toolMode === 'select') {
            const selection = findSelectionAt(imgX, imgY);
            const handle = selection ? findResizeHandle(selection, imgX, imgY) : null;
             if (handle && selection) {
                setDragMode("resize"); setResizeHandle(handle); setSelectedId(selection.id);
            } else if (selection) {
                setDragMode("move"); setSelectedId(selection.id);
            } else {
                setDragMode("draw"); setSelectedId(null);
                const newBox: SelectionBox = {
                    id: `sel-drawing-${Date.now()}`, x: imgX, y: imgY, width: 0, height: 0,
                    label: currentComponent?.name || `Selection ${selections.length + 1}`,
                    color: currentComponent?.color || "#3b82f6",
                    isData: currentComponent?.isData ?? true, countFullArea: false,
                };
                setCurrentBox(newBox);
            }
            setStartPoint({ x: imgX, y: imgY });
        }
     }
  }, [imageBitmap, isImageLoading, toolMode, currentComponent, selections, onBackgroundColorSample, onSelectionsChange, findSelectionAt, findResizeHandle, screenToImageCoords, offset, magicWandTolerance]);

  // Mouse Move Handler
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
     if (!imageBitmap || isImageLoading) return;
     const currentCursorTarget = e.currentTarget as HTMLDivElement;

    if (isPanning) {
      setOffset({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
      return;
    }

     const { x: imgX, y: imgY } = screenToImageCoords(e.clientX, e.clientY);

    if (dragMode === "draw" && currentBox) {
        setCurrentBox(prev => prev ? { ...prev, width: imgX - prev.x, height: imgY - prev.y } : null);
    } else if (dragMode === "move" && selectedId) {
         const dx = imgX - startPoint.x; const dy = imgY - startPoint.y;
         onSelectionsChange(prev => prev.map(sel => sel.id === selectedId ? { ...sel, x: sel.x + dx, y: sel.y + dy } : sel));
         setStartPoint({ x: imgX, y: imgY });
    } else if (dragMode === "resize" && selectedId && resizeHandle) {
         const dx = imgX - startPoint.x; const dy = imgY - startPoint.y;
         onSelectionsChange(prev => prev.map(sel => {
             if (sel.id !== selectedId) return sel;
             let { x, y, width, height } = sel;
             switch (resizeHandle) {
                 case "nw": x += dx; y += dy; width -= dx; height -= dy; break;
                 case "ne": y += dy; width += dx; height -= dy; break;
                 case "sw": x += dx; width -= dx; height += dy; break;
                 case "se": width += dx; height += dy; break;
             }
             return { ...sel, x, y, width, height };
         }));
        setStartPoint({ x: imgX, y: imgY });
    } else {
        // Handle Hover Effects and Cursor Changes
        let cursor = 'default';
        let newHoveredId: string | null = null;
        if (toolMode === "eyedropper" || toolMode === 'magicwand') { cursor = "crosshair"; }
        else if (toolMode === 'select') {
            const selection = findSelectionAt(imgX, imgY);
             newHoveredId = selection?.id || null;
            if (selection) {
                const handle = selectedId === selection.id ? findResizeHandle(selection, imgX, imgY) : null;
                if (handle) {
                    const cursors: Record<string | symbol, string> = { nw: "nwse-resize", ne: "nesw-resize", sw: "nesw-resize", se: "nwse-resize", n: "ns-resize", s: "ns-resize", e: "ew-resize", w: "ew-resize" };
                    cursor = cursors[handle] || 'move';
                } else { cursor = 'move'; }
            } else { cursor = 'crosshair'; }
        }
        if (newHoveredId !== hoveredId) setHoveredId(newHoveredId);
        // Only set cursor if it's different to avoid unnecessary style updates
        if (currentCursorTarget.style.cursor !== cursor) {
             currentCursorTarget.style.cursor = cursor;
        }
    }
  }, [imageBitmap, isImageLoading, isPanning, panStart, dragMode, toolMode, selectedId, resizeHandle, currentBox, startPoint, scale, screenToImageCoords, onSelectionsChange, findSelectionAt, findResizeHandle, hoveredId]);

  // Mouse Up Handler
  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
     // Determine default cursor based on tool mode for reset
     const defaultCursor = toolMode === 'select' ? 'crosshair' : (toolMode === 'eyedropper' || toolMode === 'magicwand' ? 'crosshair' : 'default');
     (e.currentTarget as HTMLDivElement).style.cursor = defaultCursor;

    if (isPanning) { setIsPanning(false); return; }

    if (dragMode === "draw" && currentBox) {
      let { id: _, ...boxData } = currentBox;
      let { x, y, width, height } = boxData;
      if (width < 0) { x += width; width = Math.abs(width); }
      if (height < 0) { y += height; height = Math.abs(height); }
      if (width > 5 && height > 5) {
        const finalBox: SelectionBox = { ...boxData, id: `sel-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`, x, y, width, height };
        onSelectionsChange([...selections, finalBox]);
        setSelectedId(finalBox.id);
      }
      setCurrentBox(null);
    }
    setDragMode(null);
    setResizeHandle(null);
  }, [isPanning, dragMode, currentBox, selections, onSelectionsChange, toolMode]);

  // Mouse Leave Handler
    const handleMouseLeave = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (dragMode) handleMouseUp(e); // Treat leave as mouse up if dragging
        if (isPanning) setIsPanning(false);
        (e.currentTarget as HTMLDivElement).style.cursor = 'default';
        setHoveredId(null);
    }, [dragMode, isPanning, handleMouseUp]);


  // Delete Handler
  const handleDelete = useCallback(() => {
    if (selectedId) {
      onSelectionsChange(selections.filter(sel => sel.id !== selectedId));
      setSelectedId(null);
    }
  }, [selectedId, selections, onSelectionsChange]);

  // Delete Key Listener
   useEffect(() => {
     const handleKeyDown = (e: KeyboardEvent) => {
       if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
          if (e.key === 'Backspace' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) ) { e.preventDefault(); }
          handleDelete();
       }
     };
     window.addEventListener('keydown', handleKeyDown);
     return () => window.removeEventListener('keydown', handleKeyDown);
   }, [selectedId, handleDelete]);

  // Wheel Handler (Zoom)
  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    if (!imageBitmap || !containerRef.current) return;
    e.preventDefault();

    const zoomIntensity = 0.1;
    const delta = e.deltaY > 0 ? (1 - zoomIntensity) : (1 + zoomIntensity);
    const newScale = Math.max(0.1, Math.min(10, scale * delta));

     const rect = containerRef.current.getBoundingClientRect();
     const mouseX = e.clientX - rect.left;
     const mouseY = e.clientY - rect.top;

     const imageX = (mouseX - offset.x) / scale;
     const imageY = (mouseY - offset.y) / scale;

     const newOffsetX = mouseX - imageX * newScale;
     const newOffsetY = mouseY - imageY * newScale;

    setScale(newScale);
    setOffset({ x: newOffsetX, y: newOffsetY });

  }, [scale, offset, imageBitmap]);

  // Dynamic Class Names for Container
  // *** USE cn() HERE ***
  const canvasContainerClasses = cn(
       "flex-1 relative overflow-hidden bg-canvas rounded border border-border", // Base
       // Cursors based on state/tool
       isPanning ? 'cursor-grabbing' :
       toolMode === 'eyedropper' ? 'cursor-crosshair' :
       toolMode === 'magicwand' ? 'cursor-crosshair' : // Could use url(wand.cur), crosshair
       toolMode === 'select' ? 'cursor-crosshair' : // Default select cursor (changes on hover)
       'cursor-default',
       // Border feedback for tools
       toolMode === 'eyedropper' && 'ring-2 ring-blue-500 ring-offset-1',
       toolMode === 'magicwand' && 'ring-2 ring-purple-500 ring-offset-1',
   );

  // Render Logic
   if (isImageLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-canvas rounded-lg border-2 border-dashed border-border p-4">
        <div className="text-center text-muted-foreground"><Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin" /><p>Loading Image...</p></div>
      </div>
    );
  }

  if (!imageUrl || !imageBitmap) {
    return (
      <div className="flex-1 flex items-center justify-center bg-canvas rounded-lg border-2 border-dashed border-border p-4">
        <div className="text-center p-8"><Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" /><p className="text-lg font-medium text-foreground mb-2">No Image Loaded</p><p className="text-sm text-muted-foreground">Click "Upload" in the toolbar to begin.</p></div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-background rounded-lg border">
        <div className="flex items-center justify-between p-2 border-b text-xs text-muted-foreground">
            <span>Zoom: {Math.round(scale * 100)}% | {selections.length} selection{selections.length !== 1 ? "s" : ""}</span>
            {selectedId && <Button variant="destructive" size="xs" onClick={handleDelete} className="gap-1 h-6 px-1.5 py-0.5"><Trash2 className="w-3 h-3" />Delete</Button>}
        </div>
      {/* Container handles events and provides bounds for absolute canvas */}
      <div ref={containerRef} className={canvasContainerClasses} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseLeave} onWheel={handleWheel}>
        {/* Canvas is absolutely positioned within the container */}
        <canvas
            ref={displayCanvasRef}
            style={{
                position: 'absolute',
                left: `${offset.x}px`,
                top: `${offset.y}px`,
                width: `${imageWidth * scale}px`,
                height: `${imageHeight * scale}px`,
                imageRendering: scale > 3 ? 'pixelated' : 'auto',
                willChange: 'transform',
            }}
          />
      </div>
    </div>
  );
}