import { useRef, useEffect, useState, useCallback } from "react";
import { SelectionBox } from "../types";
import { Trash2, Move, Edit3, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ImageCanvasProps {
  imageUrl: string | null;
  imageWidth: number;
  imageHeight: number;
  selections: SelectionBox[];
  onSelectionsChange: (selections: SelectionBox[]) => void;
  onImageReady: (imageData: ImageData) => void;
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
}: ImageCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [dragMode, setDragMode] = useState<DragMode>(null);
  const [startPoint, setStartPoint] = useState({ x: 0, y: 0 });
  const [currentBox, setCurrentBox] = useState<SelectionBox | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [resizeHandle, setResizeHandle] = useState<ResizeHandle>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Calculate scale to fit canvas in container
  useEffect(() => {
    if (!containerRef.current || !imageWidth || !imageHeight) return;

    const container = containerRef.current;
    const containerWidth = container.clientWidth - 32; // padding
    const containerHeight = container.clientHeight - 32;

    const scaleX = containerWidth / imageWidth;
    const scaleY = containerHeight / imageHeight;
    setScale(Math.min(scaleX, scaleY, 1));
  }, [imageWidth, imageHeight]);

  // Load image and extract ImageData
  useEffect(() => {
    if (!imageUrl || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      
      const imageData = ctx.getImageData(0, 0, img.width, img.height);
      onImageReady(imageData);
    };
    img.src = imageUrl;
  }, [imageUrl, onImageReady]);

  // Redraw canvas with selections
  useEffect(() => {
    if (!canvasRef.current || !imageUrl) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      // Draw selections
      selections.forEach((sel) => {
        ctx.strokeStyle = sel.color;
        ctx.lineWidth = 3;
        ctx.strokeRect(sel.x, sel.y, sel.width, sel.height);
        
        // Fill with semi-transparent color
        ctx.fillStyle = sel.color + "20"; // 20 = ~12% opacity
        ctx.fillRect(sel.x, sel.y, sel.width, sel.height);

        // Draw label
        ctx.fillStyle = sel.color;
        ctx.font = "14px sans-serif";
        ctx.fillText(sel.label, sel.x + 5, sel.y + 20);

        // Draw resize handles if selected
        if (sel.id === selectedId) {
          const handleSize = 8;
          ctx.fillStyle = sel.color;
          
          // Corner handles
          ctx.fillRect(sel.x - handleSize / 2, sel.y - handleSize / 2, handleSize, handleSize);
          ctx.fillRect(sel.x + sel.width - handleSize / 2, sel.y - handleSize / 2, handleSize, handleSize);
          ctx.fillRect(sel.x - handleSize / 2, sel.y + sel.height - handleSize / 2, handleSize, handleSize);
          ctx.fillRect(sel.x + sel.width - handleSize / 2, sel.y + sel.height - handleSize / 2, handleSize, handleSize);
        }
      });

      // Draw current box being drawn
      if (currentBox) {
        ctx.strokeStyle = currentBox.color;
        ctx.lineWidth = 3;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(currentBox.x, currentBox.y, currentBox.width, currentBox.height);
        ctx.setLineDash([]);
      }
    };
    img.src = imageUrl;
  }, [imageUrl, selections, selectedId, currentBox]);

  // Convert screen coordinates to image coordinates
  const screenToImage = useCallback((screenX: number, screenY: number) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (screenX - rect.left) / scale;
    const y = (screenY - rect.top) / scale;
    
    return { x, y };
  }, [scale]);

  // Find which selection is at a point
  const findSelectionAt = useCallback((x: number, y: number): SelectionBox | null => {
    // Check in reverse order (topmost first)
    for (let i = selections.length - 1; i >= 0; i--) {
      const sel = selections[i];
      if (x >= sel.x && x <= sel.x + sel.width &&
          y >= sel.y && y <= sel.y + sel.height) {
        return sel;
      }
    }
    return null;
  }, [selections]);

  // Find which resize handle is at a point
  const findResizeHandle = useCallback((selection: SelectionBox, x: number, y: number): ResizeHandle => {
    const threshold = 10 / scale; // 10px hit area
    const { x: sx, y: sy, width: sw, height: sh } = selection;

    // Check corners first
    if (Math.abs(x - sx) < threshold && Math.abs(y - sy) < threshold) return "nw";
    if (Math.abs(x - (sx + sw)) < threshold && Math.abs(y - sy) < threshold) return "ne";
    if (Math.abs(x - sx) < threshold && Math.abs(y - (sy + sh)) < threshold) return "sw";
    if (Math.abs(x - (sx + sw)) < threshold && Math.abs(y - (sy + sh)) < threshold) return "se";

    // Check edges
    if (Math.abs(y - sy) < threshold && x > sx && x < sx + sw) return "n";
    if (Math.abs(y - (sy + sh)) < threshold && x > sx && x < sx + sw) return "s";
    if (Math.abs(x - sx) < threshold && y > sy && y < sy + sh) return "w";
    if (Math.abs(x - (sx + sw)) < threshold && y > sy && y < sy + sh) return "e";

    return null;
  }, [scale]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = screenToImage(e.clientX, e.clientY);
    const selection = findSelectionAt(x, y);

    if (selection) {
      const handle = findResizeHandle(selection, x, y);
      
      if (handle) {
        setDragMode("resize");
        setResizeHandle(handle);
        setSelectedId(selection.id);
      } else {
        setDragMode("move");
        setSelectedId(selection.id);
      }
      
      setStartPoint({ x, y });
    } else {
      // Start drawing new selection
      setDragMode("draw");
      setSelectedId(null);
      
      const newBox: SelectionBox = {
        id: `sel-${Date.now()}`,
        x,
        y,
        width: 0,
        height: 0,
        label: `Selection ${selections.length + 1}`,
        color: "#3b82f6",
        isData: true,
        countFullArea: false,
      };
      
      setCurrentBox(newBox);
      setStartPoint({ x, y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = screenToImage(e.clientX, e.clientY);

    if (dragMode === "draw" && currentBox) {
      setCurrentBox({
        ...currentBox,
        width: x - currentBox.x,
        height: y - currentBox.y,
      });
    } else if (dragMode === "move" && selectedId) {
      const dx = x - startPoint.x;
      const dy = y - startPoint.y;
      
      onSelectionsChange(
        selections.map(sel =>
          sel.id === selectedId
            ? { ...sel, x: sel.x + dx, y: sel.y + dy }
            : sel
        )
      );
      
      setStartPoint({ x, y });
    } else if (dragMode === "resize" && selectedId && resizeHandle) {
      onSelectionsChange(
        selections.map(sel => {
          if (sel.id !== selectedId) return sel;

          const dx = x - startPoint.x;
          const dy = y - startPoint.y;
          let newSel = { ...sel };

          switch (resizeHandle) {
            case "nw":
              newSel.x += dx;
              newSel.y += dy;
              newSel.width -= dx;
              newSel.height -= dy;
              break;
            case "ne":
              newSel.y += dy;
              newSel.width += dx;
              newSel.height -= dy;
              break;
            case "sw":
              newSel.x += dx;
              newSel.width -= dx;
              newSel.height += dy;
              break;
            case "se":
              newSel.width += dx;
              newSel.height += dy;
              break;
            case "n":
              newSel.y += dy;
              newSel.height -= dy;
              break;
            case "s":
              newSel.height += dy;
              break;
            case "w":
              newSel.x += dx;
              newSel.width -= dx;
              break;
            case "e":
              newSel.width += dx;
              break;
          }

          return newSel;
        })
      );
      
      setStartPoint({ x, y });
    } else {
      // Update cursor based on hover
      const selection = findSelectionAt(x, y);
      setHoveredId(selection?.id || null);
      
      if (selection) {
        const handle = findResizeHandle(selection, x, y);
        if (handle) {
          const cursors: Record<string, string> = {
            nw: "nw-resize",
            ne: "ne-resize",
            sw: "sw-resize",
            se: "se-resize",
            n: "n-resize",
            s: "s-resize",
            e: "e-resize",
            w: "w-resize",
          };
          e.currentTarget.style.cursor = cursors[handle];
        } else {
          e.currentTarget.style.cursor = "move";
        }
      } else {
        e.currentTarget.style.cursor = "crosshair";
      }
    }
  };

  const handleMouseUp = () => {
    if (dragMode === "draw" && currentBox) {
      // Normalize dimensions (handle negative width/height)
      let { x, y, width, height } = currentBox;
      
      if (width < 0) {
        x += width;
        width = Math.abs(width);
      }
      if (height < 0) {
        y += height;
        height = Math.abs(height);
      }

      // Only add if box has meaningful size
      if (width > 5 && height > 5) {
        onSelectionsChange([
          ...selections,
          { ...currentBox, x, y, width, height },
        ]);
      }
      
      setCurrentBox(null);
    }

    setDragMode(null);
    setResizeHandle(null);
  };

  const handleDelete = () => {
    if (selectedId) {
      onSelectionsChange(selections.filter(sel => sel.id !== selectedId));
      setSelectedId(null);
    }
  };

  if (!imageUrl) {
    return (
      <div ref={containerRef} className="flex-1 flex items-center justify-center bg-canvas rounded-lg border-2 border-dashed border-border">
        <div className="text-center p-8">
          <Upload className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <p className="text-lg font-medium text-foreground mb-2">No image loaded</p>
          <p className="text-sm text-muted-foreground">
            Upload a chart image to begin analysis
          </p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex-1 flex flex-col bg-canvas rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm text-muted-foreground">
          {selections.length} selection{selections.length !== 1 ? "s" : ""}
        </div>
        
        {selectedId && (
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Selected
          </Button>
        )}
      </div>

      <div className="flex-1 flex items-center justify-center">
        <canvas
          ref={canvasRef}
          style={{
            width: imageWidth * scale,
            height: imageHeight * scale,
            boxShadow: "var(--shadow-lg)",
          }}
          className="rounded border border-border cursor-crosshair"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
      </div>
    </div>
  );
}
