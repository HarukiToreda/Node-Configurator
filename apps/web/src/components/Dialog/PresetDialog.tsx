import { Button } from "@components/UI/Button.tsx";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@components/UI/Dialog.tsx";
import { Label } from "@components/UI/Label.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@components/UI/Select.tsx";
import type { PresetDefinition } from "@core/presets.ts";
import { presetCatalog } from "@core/presets.ts";
import { useEffect, useMemo, useState } from "react";

interface PresetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (presetId: string) => void;
}

export function PresetDialog({
  open,
  onOpenChange,
  onApply,
}: PresetDialogProps) {
  const [selectedId, setSelectedId] = useState(presetCatalog[0]?.id ?? "");

  useEffect(() => {
    if (open && presetCatalog[0] && !selectedId) {
      setSelectedId(presetCatalog[0].id);
    }
  }, [open, selectedId]);

  const selectedPreset = useMemo<PresetDefinition | undefined>(
    () => presetCatalog.find((preset) => preset.id === selectedId),
    [selectedId],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogClose />
        <DialogHeader>
          <DialogTitle>Apply Preset</DialogTitle>
          <DialogDescription>
            Load a preset into the same draft editor used by the normal web
            client, then use the usual Save button to push everything to the
            connected node.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Preset</Label>
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a preset" />
              </SelectTrigger>
              <SelectContent>
                {presetCatalog.map((preset) => (
                  <SelectItem key={preset.id} value={preset.id}>
                    {preset.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedPreset && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-700 dark:bg-slate-900/60">
              <p className="font-medium">{selectedPreset.description}</p>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-slate-600 dark:text-slate-300">
                {selectedPreset.highlights.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            onClick={() => selectedPreset && onApply(selectedPreset.id)}
            disabled={!selectedPreset}
          >
            Load Preset
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
