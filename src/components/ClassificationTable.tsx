import { useState, useEffect, useRef } from "react";
import { SelectionBox } from "../types";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { GripVertical, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface ClassificationTableProps {
  selections: SelectionBox[];
  onSelectionsChange: (selections: SelectionBox[]) => void;
  hoveredLayerId: string | null;
  onHoverLayer: (id: string | null) => void;
  onDeleteSelected: (ids: Set<string>) => void;
}

interface SortableItemProps {
  selection: SelectionBox;
  index: number;
  isSelected: boolean;
  isHovered: boolean;
  onToggleSelect: (id: string, shiftKey: boolean, ctrlKey: boolean) => void;
  onUpdate: (id: string, updates: Partial<SelectionBox>) => void;
  onDelete: (id: string) => void;
  onHover: (id: string | null) => void;
  selectionsLength: number;
}

function SortableItem({
  selection,
  index,
  isSelected,
  isHovered,
  onToggleSelect,
  onUpdate,
  onDelete,
  onHover,
  selectionsLength,
}: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: selection.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`overflow-hidden transition-all ${
        isSelected ? "ring-2 ring-primary" : ""
      } ${isHovered ? "ring-2 ring-accent" : ""}`}
      onMouseEnter={() => onHover(selection.id)}
      onMouseLeave={() => onHover(null)}
      onClick={(e) => onToggleSelect(selection.id, e.shiftKey, e.ctrlKey || e.metaKey)}
    >
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Drag Handle and Header */}
          <div className="flex items-center gap-3">
            <button
              className="cursor-grab active:cursor-grabbing touch-none"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="w-5 h-5 text-muted-foreground" />
            </button>

            <Input
              type="color"
              value={selection.color}
              onChange={(e) =>
                onUpdate(selection.id, { color: e.target.value })
              }
              className="w-12 h-10 cursor-pointer"
              onClick={(e) => e.stopPropagation()}
            />

            <Input
              value={selection.label}
              onChange={(e) =>
                onUpdate(selection.id, { label: e.target.value })
              }
              className="flex-1"
              placeholder="Selection label"
              onClick={(e) => e.stopPropagation()}
            />

            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(selection.id);
              }}
              className="h-8 w-8 p-0"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>

          {/* Dimensions */}
          <div className="text-sm text-muted-foreground pl-8">
            Area: {Math.round(selection.width)} × {Math.round(selection.height)} ={" "}
            {Math.round(selection.width * selection.height)} pixels
          </div>

          {/* Classification */}
          <div className="flex items-center gap-6 pl-8" onClick={(e) => e.stopPropagation()}>
            <Label className="text-sm font-medium">Classification:</Label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name={`classification-${selection.id}`}
                checked={selection.isData}
                onChange={() => onUpdate(selection.id, { isData: true })}
                className="w-4 h-4 text-data accent-data"
              />
              <span className="text-sm">Data</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name={`classification-${selection.id}`}
                checked={!selection.isData}
                onChange={() => onUpdate(selection.id, { isData: false })}
                className="w-4 h-4 text-non-data accent-non-data"
              />
              <span className="text-sm">Non-Data</span>
            </label>
          </div>

          {/* Count Full Area checkbox */}
          <div className="flex items-center gap-2 pl-8" onClick={(e) => e.stopPropagation()}>
            <Checkbox
              id={`full-area-${selection.id}`}
              checked={selection.countFullArea}
              onCheckedChange={(checked) =>
                onUpdate(selection.id, {
                  countFullArea: checked as boolean,
                })
              }
            />
            <Label
              htmlFor={`full-area-${selection.id}`}
              className="text-sm cursor-pointer"
            >
              Count Full Area (ignore ink detection)
            </Label>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ClassificationTable({
  selections,
  onSelectionsChange,
  hoveredLayerId,
  onHoverLayer,
  onDeleteSelected,
}: ClassificationTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const lastSelectedIndex = useRef<number>(-1);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Clear selection when selections array changes significantly
  useEffect(() => {
    setSelectedIds((prev) => {
      const filtered = new Set(Array.from(prev).filter((id) => selections.some((s) => s.id === id)));
      return filtered.size === prev.size ? prev : filtered;
    });
  }, [selections]);

  const toggleSelection = (id: string, shiftKey: boolean, ctrlKey: boolean) => {
    const clickedIndex = selections.findIndex((s) => s.id === id);

    if (shiftKey && lastSelectedIndex.current !== -1) {
      // Shift+Click: Select range
      const start = Math.min(lastSelectedIndex.current, clickedIndex);
      const end = Math.max(lastSelectedIndex.current, clickedIndex);
      const rangeIds = selections.slice(start, end + 1).map((s) => s.id);
      setSelectedIds(new Set([...selectedIds, ...rangeIds]));
    } else if (ctrlKey) {
      // Ctrl+Click: Toggle individual
      const newSet = new Set(selectedIds);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      setSelectedIds(newSet);
      lastSelectedIndex.current = clickedIndex;
    } else {
      // Regular click: Select only this one
      setSelectedIds(new Set([id]));
      lastSelectedIndex.current = clickedIndex;
    }
  };

  const selectAll = () => {
    setSelectedIds(new Set(selections.map((s) => s.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
    lastSelectedIndex.current = -1;
  };

  const applyBulkEdit = (changes: Partial<SelectionBox>) => {
    onSelectionsChange(
      selections.map((sel) =>
        selectedIds.has(sel.id) ? { ...sel, ...changes } : sel
      )
    );
  };

  const updateSelection = (id: string, updates: Partial<SelectionBox>) => {
    onSelectionsChange(
      selections.map((sel) => (sel.id === id ? { ...sel, ...updates } : sel))
    );
  };

  const deleteSelection = (id: string) => {
    onSelectionsChange(selections.filter((sel) => sel.id !== id));
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = selections.findIndex((s) => s.id === active.id);
      const newIndex = selections.findIndex((s) => s.id === over.id);
      onSelectionsChange(arrayMove(selections, oldIndex, newIndex));
    }
  };

  const hasSelection = selectedIds.size > 0;

  if (selections.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">
          Draw selection boxes on the canvas to classify them
        </p>
      </Card>
    );
  }

  // Group selections by label
  const groupedSelections = selections.reduce((acc, sel) => {
    if (!acc[sel.label]) {
      acc[sel.label] = [];
    }
    acc[sel.label].push(sel);
    return acc;
  }, {} as Record<string, SelectionBox[]>);

  return (
    <div className="space-y-3">
      {/* Bulk Edit Panel */}
      {hasSelection && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-medium">
                {selectedIds.size} layer{selectedIds.size !== 1 ? "s" : ""} selected
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={deselectAll}
                >
                  Clear
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    onDeleteSelected(selectedIds);
                    deselectAll();
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => applyBulkEdit({ isData: true })}
              >
                Mark as Data
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => applyBulkEdit({ isData: false })}
              >
                Mark as Non-Data
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => applyBulkEdit({ countFullArea: true })}
              >
                Enable Full Area
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => applyBulkEdit({ countFullArea: false })}
              >
                Disable Full Area
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Selection Controls */}
      {selections.length > 0 && (
        <div className="flex items-center justify-between text-sm">
          <div className="text-muted-foreground">
            Click to select, Ctrl+Click to multi-select, Shift+Click for range
          </div>
          <Button variant="ghost" size="sm" onClick={selectAll}>
            Select All
          </Button>
        </div>
      )}

      {/* Grouped Selections with Drag and Drop */}
      {Object.entries(groupedSelections).map(([label, groupSelections]) => (
        <div key={label} className="space-y-2">
          <div className="flex items-center gap-2 px-2">
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: groupSelections[0].color }}
            />
            <h4 className="font-semibold text-sm text-foreground">
              {label} ({groupSelections.length})
            </h4>
          </div>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={groupSelections.map((s) => s.id)}
              strategy={verticalListSortingStrategy}
            >
              {groupSelections.map((selection) => {
                const index = selections.findIndex((s) => s.id === selection.id);
                return (
                  <SortableItem
                    key={selection.id}
                    selection={selection}
                    index={index}
                    isSelected={selectedIds.has(selection.id)}
                    isHovered={hoveredLayerId === selection.id}
                    onToggleSelect={toggleSelection}
                    onUpdate={updateSelection}
                    onDelete={deleteSelection}
                    onHover={onHoverLayer}
                    selectionsLength={selections.length}
                  />
                );
              })}
            </SortableContext>
          </DndContext>
        </div>
      ))}
    </div>
  );
}
