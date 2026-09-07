import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { TestDataset } from "@/lib/problems";
import { toast } from "sonner";

interface CustomDatasetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: TestDataset;
  onSubmit: (dataset: TestDataset) => void;
}

export function CustomDatasetModal({ open, onOpenChange, template, onSubmit }: CustomDatasetModalProps) {
  const [arrayStr, setArrayStr] = useState(template.array ? JSON.stringify(template.array) : "");
  const [secondaryArrayStr, setSecondaryArrayStr] = useState(template.secondaryArray ? JSON.stringify(template.secondaryArray) : "");
  const [matrixStr, setMatrixStr] = useState(template.matrix ? JSON.stringify(template.matrix) : "");
  const [treeStr, setTreeStr] = useState(template.tree ? JSON.stringify(template.tree) : "");
  const [targetStr, setTargetStr] = useState(template.target !== undefined ? String(template.target) : "");
  const [kStr, setKStr] = useState(template.k !== undefined ? String(template.k) : "");

  const handleSubmit = () => {
    try {
      const custom: TestDataset = {
        id: "custom_" + Date.now(),
        label: "Custom Dataset",
        description: "User defined custom input.",
        category: "custom",
      };

      if (template.array) {
        const parsed = JSON.parse(arrayStr);
        if (!Array.isArray(parsed)) throw new Error("Array must be a valid JSON array.");
        custom.array = parsed;
      }
      if (template.secondaryArray) {
        const parsed = JSON.parse(secondaryArrayStr);
        if (!Array.isArray(parsed)) throw new Error("Secondary Array must be a valid JSON array.");
        custom.secondaryArray = parsed;
      }
      if (template.matrix) {
        const parsed = JSON.parse(matrixStr);
        if (!Array.isArray(parsed) || (parsed.length > 0 && !Array.isArray(parsed[0]))) {
           throw new Error("Matrix must be a valid 2D JSON array.");
        }
        custom.matrix = parsed;
      }
      if (template.tree) {
        const parsed = JSON.parse(treeStr);
        if (!Array.isArray(parsed)) throw new Error("Tree must be a valid JSON array.");
        custom.tree = parsed;
      }
      if (template.target !== undefined) {
        custom.target = isNaN(Number(targetStr)) ? targetStr : Number(targetStr);
      }
      if (template.k !== undefined) {
        custom.k = Number(kStr);
      }
      onSubmit(custom);
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "Invalid input format");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Custom Dataset</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4">
          {template.array && (
            <div className="flex flex-col gap-2">
              <Label>Array (JSON format, e.g. [1,2,3])</Label>
              <Input value={arrayStr} onChange={e => setArrayStr(e.target.value)} />
            </div>
          )}
          {template.secondaryArray && (
            <div className="flex flex-col gap-2">
              <Label>Secondary Array (JSON format)</Label>
              <Input value={secondaryArrayStr} onChange={e => setSecondaryArrayStr(e.target.value)} />
            </div>
          )}
          {template.matrix && (
            <div className="flex flex-col gap-2">
              <Label>Matrix (JSON 2D Array)</Label>
              <Textarea value={matrixStr} onChange={e => setMatrixStr(e.target.value)} className="font-mono text-sm" rows={4} />
            </div>
          )}
          {template.tree && (
            <div className="flex flex-col gap-2">
              <Label>Tree (Level-order JSON Array)</Label>
              <Input value={treeStr} onChange={e => setTreeStr(e.target.value)} />
            </div>
          )}
          {template.target !== undefined && (
            <div className="flex flex-col gap-2">
              <Label>Target</Label>
              <Input value={targetStr} onChange={e => setTargetStr(e.target.value)} />
            </div>
          )}
          {template.k !== undefined && (
            <div className="flex flex-col gap-2">
              <Label>k</Label>
              <Input value={kStr} onChange={e => setKStr(e.target.value)} />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit}>Run with Custom Data</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
