import { Upload, Play, Pipette, Wand2, MousePointer2, Download, FolderOpen, Undo2, Redo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChartProfile, ComponentDefinition } from "@/types";
import { chartProfiles } from "@/utils/benchmarks";

interface ToolbarProps {
  onImageUpload: (file: File) => void;
  onRunAnalysis: () => void;
  hasImage: boolean;
  hasSelections: boolean;
  isAnalyzing: boolean;
  toolMode: "select" | "eyedropper" | "magicwand";
  onToolModeChange: (mode: "select" | "eyedropper" | "magicwand") => void;
  onExportSelections: () => void;
  onImportSelections: (file: File) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  backgroundColor: { r: number; g: number; b: number };
  selectedProfile: ChartProfile | null;
  onProfileChange: (profile: ChartProfile) => void;
  currentComponent: ComponentDefinition | null;
  onComponentSelect: (component: ComponentDefinition | null) => void;
}

export function Toolbar({
  onImageUpload,
  onRunAnalysis,
  hasImage,
  hasSelections,
  isAnalyzing,
  toolMode,
  onToolModeChange,
  onExportSelections,
  onImportSelections,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  backgroundColor,
  selectedProfile,
  onProfileChange,
  currentComponent,
  onComponentSelect,
}: ToolbarProps) {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      onImageUpload(file);
    }
    e.target.value = "";
  };

  const handleImportChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === "application/json") {
      onImportSelections(file);
    }
    e.target.value = "";
  };

  return (
    <header className="border-b bg-card">
      <div className="container mx-auto px-6 py-4 space-y-4">
        {/* Top Row: Title and Main Actions */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Data-Ink Ratio Calculator
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Design Analysis Workbench
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Chart Profile Selection */}
            <Select
              value={selectedProfile?.id}
              onValueChange={(value) => {
                const profile = chartProfiles.find(p => p.id === value);
                if (profile) onProfileChange(profile);
              }}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select chart type" />
              </SelectTrigger>
              <SelectContent>
                {chartProfiles.map((profile) => (
                  <SelectItem key={profile.id} value={profile.id}>
                    {profile.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Separator orientation="vertical" className="h-8" />

            {/* File Operations */}
            <label>
              <Input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                id="image-upload"
              />
              <Button asChild variant="secondary">
                <span className="cursor-pointer">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload
                </span>
              </Button>
            </label>

            <label>
              <Input
                type="file"
                accept="application/json"
                onChange={handleImportChange}
                className="hidden"
                id="import-selections"
              />
              <Button 
                asChild 
                variant="outline" 
                size="sm"
                disabled={!hasImage}
              >
                <span className="cursor-pointer">
                  <FolderOpen className="w-4 h-4 mr-2" />
                  Import
                </span>
              </Button>
            </label>

            <Button
              variant="outline"
              size="sm"
              onClick={onExportSelections}
              disabled={!hasSelections}
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>

            <Separator orientation="vertical" className="h-8" />

            {/* Undo/Redo */}
            <Button
              variant="ghost"
              size="sm"
              onClick={onUndo}
              disabled={!canUndo}
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="w-4 h-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={onRedo}
              disabled={!canRedo}
              title="Redo (Ctrl+Shift+Z)"
            >
              <Redo2 className="w-4 h-4" />
            </Button>

            <Separator orientation="vertical" className="h-8" />

            {/* Tool Selection */}
            <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
              <Button
                variant={toolMode === "select" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => onToolModeChange("select")}
                title="Select Tool"
              >
                <MousePointer2 className="w-4 h-4" />
              </Button>

              <Button
                variant={toolMode === "eyedropper" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => onToolModeChange("eyedropper")}
                disabled={!hasImage}
                title="Eyedropper - Sample background color"
              >
                <Pipette className="w-4 h-4" />
              </Button>

              <Button
                variant={toolMode === "magicwand" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => onToolModeChange("magicwand")}
                disabled={!hasImage}
                title="Magic Wand - Auto-select region"
              >
                <Wand2 className="w-4 h-4" />
              </Button>
            </div>

            {/* Background Color Indicator */}
            {hasImage && (
              <div 
                className="w-8 h-8 rounded border-2 border-border shadow-sm"
                style={{ 
                  backgroundColor: `rgb(${backgroundColor.r}, ${backgroundColor.g}, ${backgroundColor.b})` 
                }}
                title={`Background: rgb(${backgroundColor.r}, ${backgroundColor.g}, ${backgroundColor.b})`}
              />
            )}

            <Separator orientation="vertical" className="h-8" />

            {/* Analysis */}
            <Button
              onClick={onRunAnalysis}
              disabled={!hasImage || !hasSelections || isAnalyzing}
              className="min-w-[140px]"
            >
              <Play className="w-4 h-4 mr-2" />
              {isAnalyzing ? "Analyzing..." : "Run Analysis"}
            </Button>
          </div>
        </div>

        {/* Bottom Row: Smart Component Palette */}
        {hasImage && selectedProfile && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground mr-2">
              Quick Select:
            </span>
            {selectedProfile.components.map((component) => (
              <Button
                key={component.name}
                variant={currentComponent?.name === component.name ? "default" : "outline"}
                size="sm"
                onClick={() => onComponentSelect(
                  currentComponent?.name === component.name ? null : component
                )}
                className="gap-2"
              >
                <div
                  className="w-3 h-3 rounded"
                  style={{ backgroundColor: component.color }}
                />
                {component.name}
              </Button>
            ))}
            {currentComponent && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onComponentSelect(null)}
              >
                Clear Selection
              </Button>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
