import React, { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useNotesBag } from "@/context/NotesBagContext";
import {
  X,
  Trash2,
  FileText,
  ArrowRight,
  Upload,
  Download,
  FileCode,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { SingleLineBagIcon } from "./SingleLineBagIcon";
import { parseNotesFromJson } from "@/lib/notes/json-importer";
import { AiWord } from "@/components/brand/AiWord";

interface NotesBagDrawerProps {
  onOpenPdfModal?: () => void;
}

export const NotesBagDrawer: React.FC<NotesBagDrawerProps> = ({ onOpenPdfModal }) => {
  const { items, isDrawerOpen, setIsDrawerOpen, removeItem, clearBag, addItems } = useNotesBag();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);

  if (!isDrawerOpen) return null;

  const handleFileUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file) return;

    if (!file.name.endsWith(".json") && file.type !== "application/json" && !file.name.endsWith(".txt")) {
      toast.error("Please upload a .json file (LeetCode visualization, Notes Bag export, or algorithm spec)");
      return;
    }

    setIsProcessingFile(true);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const result = parseNotesFromJson(content, file.name);

        if (!result.success || result.importedItems.length === 0) {
          toast.error(result.errorMessage || "Could not parse valid note data from file.");
        } else {
          addItems(result.importedItems);
          toast.success(`Successfully imported ${result.importedItems.length} note(s) from "${file.name}"!`);
        }
      } catch (err: any) {
        toast.error(`Import failed: ${err?.message || "Invalid file content"}`);
      } finally {
        setIsProcessingFile(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };

    reader.onerror = () => {
      toast.error("Failed to read the file");
      setIsProcessingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    };

    reader.readAsText(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFileUpload(e.dataTransfer.files);
  };

  const handleExportJson = () => {
    if (items.length === 0) {
      toast.error("Notes Bag is empty");
      return;
    }
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(items, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `ai-notes-bag-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast.success("Exported Notes Bag as JSON file.");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs font-mono animate-in fade-in duration-200"
      onClick={() => setIsDrawerOpen(false)}
    >
      <div
        className="w-full max-w-md bg-card border-l-2 border-border h-full flex flex-col shadow-2xl p-5 text-card-foreground overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between pb-4 border-b-2 border-border">
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center text-primary font-bold">
              <SingleLineBagIcon className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <AiWord variant="badge" />
                <h2 className="font-extrabold text-sm uppercase tracking-wider text-foreground">Notes Bag</h2>
              </div>
              <p className="text-[10px] text-muted-foreground">{items.length} items collected across sessions</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsDrawerOpen(false)}
            className="p-1.5 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            aria-label="Close drawer"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Action Buttons Top Strip */}
        <div className="py-3 flex items-center justify-between gap-2 border-b border-border">
          <Link
            to={"/ai-notes" as any}
            onClick={() => setIsDrawerOpen(false)}
            className="flex-1 py-2 px-3 rounded-lg border border-primary bg-primary text-primary-foreground font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-primary/90 transition-all cursor-pointer shadow-xs"
          >
            <span>Open AI Notes Dashboard</span>
            <ArrowRight className="size-3.5" />
          </Link>
          {items.length > 0 && (
            <>
              <button
                type="button"
                onClick={handleExportJson}
                className="p-2 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Export Notes as JSON"
              >
                <Download className="size-4" />
              </button>
              <button
                type="button"
                onClick={clearBag}
                className="p-2 rounded-lg border border-border hover:border-rose-500/60 hover:text-rose-500 text-muted-foreground transition-colors cursor-pointer"
                title="Clear all collected notes"
              >
                <Trash2 className="size-4" />
              </button>
            </>
          )}
        </div>

        {/* Direct Upload JSON / Files Option */}
        <div className="pt-3 pb-2">
          <input
            ref={fileInputRef}
            type="file"
            aria-label="Upload JSON algorithm notes or problem visualizer files"
            accept=".json,application/json,.txt"
            onChange={(e) => handleFileUpload(e.target.files)}
            className="hidden"
          />
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-3 text-center cursor-pointer transition-all duration-200 ${
              isDragging
                ? "border-primary bg-primary/10 text-primary scale-[1.01]"
                : "border-border hover:border-primary/60 bg-muted/40 hover:bg-muted/70 text-muted-foreground hover:text-foreground"
            }`}
          >
            <div className="flex items-center justify-center gap-2 text-xs font-bold">
              <Upload className={`size-4 ${isDragging ? "text-primary animate-bounce" : "text-primary"}`} />
              <span>{isProcessingFile ? "Reading file..." : "Upload JSON or Files Directly"}</span>
            </div>
            <p className="text-[10px] mt-1 text-muted-foreground">
              Drop LeetCode visualizer JSON, notes export, or click to browse
            </p>
          </div>
        </div>

        {/* Item List */}
        <div className="flex-1 overflow-y-auto py-2 space-y-2.5 scrollbar-thin">
          {items.length === 0 ? (
            <div className="h-56 flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
              <div className="size-12 rounded-full bg-muted/60 border border-border flex items-center justify-center text-primary mb-3">
                <SingleLineBagIcon className="size-6" />
              </div>
              <p className="font-bold text-xs text-foreground">Your Notes Bag is Empty</p>
              <p className="text-[11px] mt-1.5 max-w-xs leading-relaxed">
                Click <strong>"Add to Notes Bag"</strong> across the platform, or click the upload box above to import your algorithm JSON files directly.
              </p>
            </div>
          ) : (
            items.map((item, idx) => (
              <div
                key={item.id}
                className="p-3 rounded-lg border border-border bg-background flex flex-col gap-2 relative group hover:border-primary/50 transition-all shadow-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                    <span className="text-primary font-mono text-[11px]">#{idx + 1}</span>
                    <span className="truncate max-w-[260px]">{item.title}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="opacity-60 hover:opacity-100 text-muted-foreground hover:text-rose-500 transition-opacity p-0.5 cursor-pointer"
                    title="Remove item"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>

                {/* Content Peek */}
                {item.codeSnippet && (
                  <pre className="text-[10px] font-mono bg-muted/60 p-2 rounded border border-border/80 text-foreground overflow-x-hidden max-h-16 line-clamp-2">
                    <code>{item.codeSnippet.slice(0, 100)}...</code>
                  </pre>
                )}

                {item.invariantText && (
                  <div className="text-[10px] font-mono text-amber-600 dark:text-amber-400 bg-amber-500/10 p-1.5 rounded border border-amber-500/30">
                    📌 {item.invariantText.slice(0, 90)}...
                  </div>
                )}

                <div className="flex items-center justify-between text-[9px] text-muted-foreground pt-1 border-t border-border/60">
                  <span className="uppercase font-semibold tracking-wider">{item.sourceType}</span>
                  <span>{new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Drawer Bottom Action: Quick Synthesis */}
        {items.length > 0 && (
          <div className="pt-3 border-t-2 border-border flex flex-col gap-2">
            <Link
              to={"/ai-notes" as any}
              onClick={() => setIsDrawerOpen(false)}
              className="w-full py-2.5 rounded-lg border border-border bg-card hover:bg-muted font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer text-foreground shadow-xs"
            >
              <FileText className="size-4 text-primary" />
              <span>Compile Handwritten PDF ({items.length} items)</span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotesBagDrawer;
