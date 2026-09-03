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

function parseTolerantArray(input: string): (number | string)[] {
  const trimmed = input.trim();
  if (!trimmed) return [];

  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // continue to tolerant parsing
    }
  }

  const clean = trimmed.replace(/^\[|\]$/g, "").trim();
  const tokens = clean.split(/[,;\s]+/).map((t) => t.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
  return tokens.map((token) => {
    const num = Number(token);
    return !isNaN(num) && token !== "" ? num : token;
  });
}

function parseTolerantMatrix(input: string): (number | string)[][] {
  const trimmed = input.trim();
  if (!trimmed) return [];

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed) && parsed.every((r) => Array.isArray(r))) {
      return parsed;
    }
  } catch {
    // continue
  }

  if (trimmed.includes("[") && trimmed.includes("]")) {
    const rowMatches = trimmed.match(/\[[^[\]]*\]/g);
    if (rowMatches && rowMatches.length > 0) {
      return rowMatches.map((r) => parseTolerantArray(r));
    }
  }

  const lines = trimmed.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length > 0) {
    return lines.map((l) => parseTolerantArray(l));
  }

  return [];
}

function parseTolerantTree(input: string): (number | string | null)[] {
  const trimmed = input.trim();
  if (!trimmed) return [];

  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // continue
    }
  }

  const clean = trimmed.replace(/^\[|\]$/g, "").trim();
  const tokens = clean.split(/[,;\s]+/).map((t) => t.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
  return tokens.map((t) => {
    const lower = t.toLowerCase();
    if (lower === "null" || lower === "none" || lower === "#") return null;
    const num = Number(t);
    return !isNaN(num) && t !== "" ? num : t;
  });
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

      if (template.array || arrayStr.trim()) {
        const parsed = parseTolerantArray(arrayStr);
        if (parsed.length === 0 && template.array) throw new Error("Array cannot be empty.");
        custom.array = parsed;
      }
      if (template.secondaryArray || secondaryArrayStr.trim()) {
        const parsed = parseTolerantArray(secondaryArrayStr);
        if (parsed.length === 0 && template.secondaryArray) throw new Error("Secondary Array cannot be empty.");
        custom.secondaryArray = parsed;
      }
      if (template.matrix || matrixStr.trim()) {
        const parsed = parseTolerantMatrix(matrixStr);
        if (parsed.length === 0 && template.matrix) {
          throw new Error("Matrix must contain at least one valid row.");
        }
        custom.matrix = parsed;
      }
      if (template.tree || treeStr.trim()) {
        const parsed = parseTolerantTree(treeStr);
        if (parsed.length === 0 && template.tree) throw new Error("Tree must contain at least one valid node.");
        custom.tree = parsed;
      }
      if (targetStr.trim() !== "") {
        custom.target = isNaN(Number(targetStr.trim())) ? targetStr.trim() : Number(targetStr.trim());
      } else if (template.target !== undefined) {
        custom.target = template.target;
      }
      if (kStr.trim() !== "") {
        custom.k = Number(kStr.trim());
      } else if (template.k !== undefined) {
        custom.k = template.k;
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
