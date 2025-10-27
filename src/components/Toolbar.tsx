import { Upload, Play, Pipette, Wand2, MousePointer2, Download, FolderOpen, Undo2, Redo2, Settings2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ChartProfile, ComponentDefinition } from "@/types";
import { chartProfiles } from "@/utils/benchmarks";
import { useState } from "react";

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
  inkThreshold: number;
  onInkThresholdChange: (value: number) => void;
  magicWandTolerance: number;
  onMagicWandToleranceChange: (value: number) => void;
  selectedProfile: ChartProfile | null;
  onProfileChange: (profile: ChartProfile) => void;
  currentComponent: ComponentDefinition | null;
  onComponentSelect: (component: ComponentDefinition | null) => void;
  onClearAll: () => void;
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
  inkThreshold,
  onInkThresholdChange,
  magicWandTolerance,
  onMagicWandToleranceChange,
  selectedProfile,
  onProfileChange,
  currentComponent,
  onComponentSelect,
  onClearAll,
}: ToolbarProps) {

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      onImageUpload(file);
    }
    e.target.value = ""; // Reset file input
  };

  const handleImportChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === "application/json") {
      onImportSelections(file);
    }
    e.target.value = ""; // Reset file input
  };

   const handleSliderChange = (setter: (value: number) => void) => (value: number[]) => {
      if (value.length > 0) {
        setter(value[0]);
      }
   };

  return (
    <header className="border-b bg-card print:hidden">
      <div className="container mx-auto px-4 sm:px-6 py-3 space-y-3">

        {/* Top Row: Title, File, Undo/Redo, Tools, Settings, Analysis */}
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          {/* Title and Profile */}
          <div className="flex items-center gap-4 flex-shrink-0">
             <div className="flex-shrink-0">
                <h1 className="text-xl md:text-2xl font-bold text-foreground leading-tight">
                Data-Ink Tool
                </h1>
             </div>
              <Select
                value={selectedProfile?.id ?? ""} // Ensure value is not null/undefined
                onValueChange={(value) => {
                    const profile = chartProfiles.find(p => p.id === value);
                    if (profile) onProfileChange(profile);
                }}
                >
                <SelectTrigger className="w-[150px] sm:w-[180px] h-9">
                    <SelectValue placeholder="Chart Type..." />
                </SelectTrigger>
                <SelectContent>
                    {chartProfiles.map((profile) => (
                    <SelectItem key={profile.id} value={profile.id}>
                        {profile.name}
                    </SelectItem>
                    ))}
                </SelectContent>
                </Select>
          </div>

           {/* Center Section: Tools & Actions */}
          <div className="flex items-center gap-1 sm:gap-2 flex-wrap justify-center">
             <TooltipProvider delayDuration={300}>
                {/* File Upload */}
                <Tooltip>
                    <TooltipTrigger asChild>
                         <label htmlFor="image-upload" className="cursor-pointer"> {/* Use htmlFor */}
                            <Input
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                className="hidden"
                                id="image-upload"
                            />
                            {/* Button acts as the trigger via asChild on the label */}
                            <Button asChild variant="outline" size="sm" className="h-9 pointer-events-none">
                                <span className="flex items-center gap-1.5">
                                <Upload className="w-4 h-4" /> <span className="hidden sm:inline">Upload</span>
                                </span>
                            </Button>
                        </label>
                    </TooltipTrigger>
                    <TooltipContent>Upload Chart Image</TooltipContent>
                </Tooltip>

                {/* Import */}
                <Tooltip>
                    <TooltipTrigger asChild>
                         <label htmlFor="import-selections" className="cursor-pointer"> {/* Use htmlFor */}
                            <Input
                                type="file"
                                accept="application/json"
                                onChange={handleImportChange}
                                className="hidden"
                                id="import-selections"
                            />
                            {/* *** CORRECTED JSX ***
                                Button is the trigger via asChild on the label.
                                The span is the actual content rendered AS the button.
                                No need for </Button> here. */}
                            <Button
                                asChild
                                variant="outline"
                                size="sm"
                                disabled={!hasImage} // Keep disabled logic for import relevant to image context
                                className="h-9 pointer-events-none" // Prevent button click
                            >
                                <span className="flex items-center gap-1.5">
                                <FolderOpen className="w-4 h-4" /> <span className="hidden sm:inline">Import</span>
                                </span>
                            </Button>
                        </label>
                     </TooltipTrigger>
                     <TooltipContent>Import Session (.json)</TooltipContent>
                </Tooltip>

                {/* Export */}
                 <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onExportSelections}
                            disabled={!hasImage && !hasSelections} // Correct logic: disable only if no image AND no selections
                            className="h-9"
                        >
                            <Download className="w-4 h-4" /> <span className="hidden sm:inline ml-1.5">Export</span>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Export Session (.json)</TooltipContent>
                 </Tooltip>

                 <Separator orientation="vertical" className="h-6 mx-1 hidden sm:block" />

                {/* Undo/Redo */}
                 <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="sm" onClick={onUndo} disabled={!canUndo} className="h-9 w-9 p-0">
                            <Undo2 className="w-4 h-4" />
                        </Button>
                    </TooltipTrigger>
                     <TooltipContent>Undo (Ctrl+Z)</TooltipContent>
                </Tooltip>
                 <Tooltip>
                     <TooltipTrigger asChild>
                        <Button variant="ghost" size="sm" onClick={onRedo} disabled={!canRedo} className="h-9 w-9 p-0">
                            <Redo2 className="w-4 h-4" />
                        </Button>
                     </TooltipTrigger>
                     <TooltipContent>Redo (Ctrl+Shift+Z)</TooltipContent>
                </Tooltip>

                <Separator orientation="vertical" className="h-6 mx-1 hidden sm:block" />

                {/* Tool Selection */}
                <div className="flex items-center gap-0.5 bg-muted rounded-md p-0.5">
                    <Tooltip>
                        <TooltipTrigger asChild>
                             <Button variant={toolMode === "select" ? "secondary" : "ghost"} size="sm" onClick={() => onToolModeChange("select")} className="h-8 w-8 p-0">
                                <MousePointer2 className="w-4 h-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Select Tool (Default)</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant={toolMode === "eyedropper" ? "secondary" : "ghost"} size="sm" onClick={() => onToolModeChange("eyedropper")} disabled={!hasImage} className="h-8 w-8 p-0">
                                <Pipette className="w-4 h-4" />
                            </Button>
                        </TooltipTrigger>
                         <TooltipContent>Eyedropper (Sample Background)</TooltipContent>
                    </Tooltip>
                     <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant={toolMode === "magicwand" ? "secondary" : "ghost"} size="sm" onClick={() => onToolModeChange("magicwand")} disabled={!hasImage} className="h-8 w-8 p-0">
                                <Wand2 className="w-4 h-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Magic Wand (Auto-Select)</TooltipContent>
                    </Tooltip>
                </div>

                 {/* Settings Popover */}
                 <Popover open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <PopoverTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-9 w-9 p-0" disabled={!hasImage}>
                                    <Settings2 className="w-4 h-4" />
                                </Button>
                            </PopoverTrigger>
                        </TooltipTrigger>
                         <TooltipContent>Analysis Settings</TooltipContent>
                    </Tooltip>
                    <PopoverContent className="w-64 p-4" sideOffset={8}>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="ink-threshold" className="text-xs font-medium">Ink Sensitivity</Label>
                                <div className="flex items-center gap-2">
                                    <Slider id="ink-threshold" min={1} max={100} step={1} value={[inkThreshold]} onValueChange={handleSliderChange(onInkThresholdChange)} className="flex-1"/>
                                    <span className="text-xs font-mono w-8 text-right tabular-nums">{inkThreshold}</span>
                                </div>
                                <p className="text-xs text-muted-foreground">Lower = more sensitive to slight color changes vs background.</p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="wand-tolerance" className="text-xs font-medium">Wand Tolerance</Label>
                                <div className="flex items-center gap-2">
                                    <Slider id="wand-tolerance" min={1} max={100} step={1} value={[magicWandTolerance]} onValueChange={handleSliderChange(onMagicWandToleranceChange)} className="flex-1"/>
                                    <span className="text-xs font-mono w-8 text-right tabular-nums">{magicWandTolerance}</span>
                                </div>
                                <p className="text-xs text-muted-foreground">Color similarity range for Magic Wand tool.</p>
                            </div>
                        </div>
                    </PopoverContent>
                </Popover>

                {/* Background Color Indicator */}
                 {hasImage && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="w-7 h-7 rounded border border-border shadow-sm flex-shrink-0" style={{ backgroundColor: `rgb(${backgroundColor.r}, ${backgroundColor.g}, ${backgroundColor.b})` }} />
                         </TooltipTrigger>
                         <TooltipContent>{`Current Background: rgb(${backgroundColor.r}, ${backgroundColor.g}, ${backgroundColor.b})`}</TooltipContent>
                    </Tooltip>
                 )}
            </TooltipProvider> {/* End TooltipProvider */}
          </div>

          {/* Right Section: Analysis Button */}
          <div className="flex items-center gap-2 flex-shrink-0">
             <Button variant="outline" size="sm" onClick={onClearAll} className="h-9 text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/50">
                <Trash2 className="w-4 h-4 mr-1.5" /> Clear All
             </Button>
            <Button onClick={onRunAnalysis} disabled={!hasImage || !hasSelections || isAnalyzing} className="min-w-[120px] h-9">
              <Play className="w-4 h-4 mr-2" />
              {isAnalyzing ? "Analyzing..." : "Analyze"}
            </Button>
          </div>
        </div>

        {/* Bottom Row: Smart Component Palette */}
        {hasImage && selectedProfile && selectedProfile.components.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap border-t pt-3 mt-2">
            <span className="text-xs font-medium text-muted-foreground mr-1 flex-shrink-0">
              Quick Select Component:
            </span>
            {selectedProfile.components.map((component) => (
             <TooltipProvider key={component.name} delayDuration={100}>
               <Tooltip>
                  <TooltipTrigger asChild>
                      <Button
                        variant={currentComponent?.name === component.name ? "default" : "outline"}
                        size="sm"
                        onClick={() => onComponentSelect( currentComponent?.name === component.name ? null : component )}
                        className="gap-2 h-7 px-2 py-1 text-xs"
                      >
                        <div className="w-2.5 h-2.5 rounded-sm border border-black/20 dark:border-white/20 flex-shrink-0" style={{ backgroundColor: component.color }}/>
                         <span className="truncate">{component.name}</span>
                      </Button>
                  </TooltipTrigger>
                   <TooltipContent side="bottom">
                     <p>{component.isData ? 'Mark as Data' : 'Mark as Non-Data'}</p>
                   </TooltipContent>
               </Tooltip>
             </TooltipProvider>
            ))}
            {currentComponent && (
              <Button variant="ghost" size="sm" onClick={() => onComponentSelect(null)} className="h-7 px-2 py-1 text-xs">
                Clear
              </Button>
            )}
          </div>
        )}
      </div>
    </header>
  );
}