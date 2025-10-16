import { SelectionBox } from "../types";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ArrowUp, ArrowDown, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ClassificationTableProps {
  selections: SelectionBox[];
  onSelectionsChange: (selections: SelectionBox[]) => void;
}

export function ClassificationTable({
  selections,
  onSelectionsChange,
}: ClassificationTableProps) {
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
      {selections.map((selection, index) => (
        <Card key={selection.id} className="p-4">
          <div className="space-y-4">
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
        </Card>
      ))}
    </div>
  );
}
