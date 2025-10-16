import { useState } from "react";
import { SelectionBox } from "../types";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ArrowUp, ArrowDown, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface ClassificationTableProps {
  selections: SelectionBox[];
  onSelectionsChange: (selections: SelectionBox[]) => void;
}

export function ClassificationTable({
  selections,
  onSelectionsChange,
}: ClassificationTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const selectAll = () => {
    setSelectedIds(new Set(selections.map(s => s.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const applyBulkEdit = (changes: Partial<SelectionBox>) => {
    onSelectionsChange(
      selections.map(sel =>
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
  };

  const moveSelection = (id: string, direction: "up" | "down") => {
    const index = selections.findIndex((sel) => sel.id === id);
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === selections.length - 1)
    ) {
      return;
    }

    const newSelections = [...selections];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    [newSelections[index], newSelections[targetIndex]] = [
      newSelections[targetIndex],
      newSelections[index],
    ];

    onSelectionsChange(newSelections);
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
              <Button
                variant="ghost"
                size="sm"
                onClick={deselectAll}
              >
                Clear
              </Button>
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
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={selectAll}
            >
              Select All
            </Button>
            {hasSelection && (
              <Button
                variant="ghost"
                size="sm"
                onClick={deselectAll}
              >
                Deselect All
              </Button>
            )}
          </div>
        </div>
      )}

      {selections.map((selection, index) => (
        <Card 
          key={selection.id} 
          className={`overflow-hidden ${selectedIds.has(selection.id) ? "ring-2 ring-primary" : ""}`}
        >
          <CardContent className="p-4">
            <div className="space-y-4">
              {/* Selection Checkbox */}
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedIds.has(selection.id)}
                  onCheckedChange={() => toggleSelection(selection.id)}
                />
                <span className="text-sm text-muted-foreground">
                  Select for bulk edit
                </span>
              </div>

              <Separator />

              {/* Header with color and label */}
            <div className="flex items-center gap-3">
              <Input
                type="color"
                value={selection.color}
                onChange={(e) =>
                  updateSelection(selection.id, { color: e.target.value })
                }
                className="w-12 h-10 cursor-pointer"
              />

              <Input
                value={selection.label}
                onChange={(e) =>
                  updateSelection(selection.id, { label: e.target.value })
                }
                className="flex-1"
                placeholder="Selection label"
              />

              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => moveSelection(selection.id, "up")}
                  disabled={index === 0}
                  className="h-8 w-8 p-0"
                >
                  <ArrowUp className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => moveSelection(selection.id, "down")}
                  disabled={index === selections.length - 1}
                  className="h-8 w-8 p-0"
                >
                  <ArrowDown className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => deleteSelection(selection.id)}
                  className="h-8 w-8 p-0"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Dimensions */}
            <div className="text-sm text-muted-foreground">
              Area: {Math.round(selection.width)} × {Math.round(selection.height)} ={" "}
              {Math.round(selection.width * selection.height)} pixels
            </div>

            {/* Classification */}
            <div className="flex items-center gap-6">
              <Label className="text-sm font-medium">Classification:</Label>
              
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name={`classification-${selection.id}`}
                  checked={selection.isData}
                  onChange={() => updateSelection(selection.id, { isData: true })}
                  className="w-4 h-4 text-data accent-data"
                />
                <span className="text-sm">Data</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name={`classification-${selection.id}`}
                  checked={!selection.isData}
                  onChange={() => updateSelection(selection.id, { isData: false })}
                  className="w-4 h-4 text-non-data accent-non-data"
                />
                <span className="text-sm">Non-Data</span>
              </label>
            </div>

            {/* Count Full Area checkbox */}
            <div className="flex items-center gap-2">
              <Checkbox
                id={`full-area-${selection.id}`}
                checked={selection.countFullArea}
                onCheckedChange={(checked) =>
                  updateSelection(selection.id, {
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
      ))}
    </div>
  );
}
