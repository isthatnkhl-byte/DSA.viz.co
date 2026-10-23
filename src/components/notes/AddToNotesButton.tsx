import React, { useState } from "react";
import { useNotesBag } from "@/context/NotesBagContext";
import { NotesBagItem, NoteSourceType } from "@/lib/notes/types";
import { BookmarkPlus, Check, Sparkles } from "lucide-react";

interface AddToNotesButtonProps {
  item?: Partial<NotesBagItem>;
  getItem?: () => Partial<NotesBagItem> | Promise<Partial<NotesBagItem>>;
  sourceType?: NoteSourceType;
  title?: string;
  className?: string;
  variant?: "default" | "compact" | "icon" | "pill";
  label?: string;
}

export const AddToNotesButton: React.FC<AddToNotesButtonProps> = ({
  item,
  getItem,
  sourceType = "CUSTOM_NOTE",
  title = "Untitled Note",
  className = "",
  variant = "default",
  label = "Add to Notes Bag",
}) => {
  const { addItem } = useNotesBag();
  const [justAdded, setJustAdded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (isProcessing) return;

    try {
      setIsProcessing(true);
      const data = getItem ? await getItem() : item || {};

      addItem({
        title: data.title || title,
        sourceType: data.sourceType || sourceType,
        sourceUrl: typeof window !== "undefined" ? window.location.pathname : undefined,
        problemSlug: data.problemSlug,
        tags: data.tags || ["StudyNotes"],
        codeSnippet: data.codeSnippet,
        codeLanguage: data.codeLanguage || "cpp",
        compilerOutput: data.compilerOutput,
        canvasSnapshotUrl: data.canvasSnapshotUrl,
        whiteboardElements: data.whiteboardElements,
        stateJson: data.stateJson,
        activePointers: data.activePointers,
        invariantText: data.invariantText,
        explanation: data.explanation,
        userNotes: data.userNotes,
        aiTakeaway: data.aiTakeaway,
      });

      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 2200);
    } catch (err) {
      console.error("[AddToNotesButton] Error resolving note data:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={`p-2 rounded-lg border-2 border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer flex items-center justify-center ${
          justAdded ? "!border-emerald-500 !text-emerald-500 !bg-emerald-500/10" : ""
        } ${className}`}
        title="Save to AI Notes Bag"
      >
        {justAdded ? <Check className="size-4 text-emerald-500" /> : <BookmarkPlus className="size-4" />}
      </button>
    );
  }

  if (variant === "compact" || variant === "pill") {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold border-2 transition-all cursor-pointer ${
          justAdded
            ? "border-emerald-500 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
            : "border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary/60"
        } ${className}`}
        title="Add to Notes Bag for Handwritten PDF"
      >
        {justAdded ? (
          <>
            <Check className="size-3 text-emerald-500" />
            <span>Saved to Bag</span>
          </>
        ) : (
          <>
            <BookmarkPlus className="size-3 text-primary" />
            <span>{label}</span>
          </>
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 font-mono text-xs font-bold transition-all shadow-xs cursor-pointer ${
        justAdded
          ? "border-emerald-500 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
          : "border-border bg-card hover:bg-muted text-foreground hover:border-primary/80"
      } ${className}`}
      title="Add to Notes Bag for Multi-Page Handwritten PDF Synthesis"
    >
      {justAdded ? (
        <>
          <Check className="size-3.5 text-emerald-500" />
          <span>Saved to Notes Bag</span>
        </>
      ) : (
        <>
          <BookmarkPlus className="size-3.5 text-primary" />
          <span>{label}</span>
        </>
      )}
    </button>
  );
};
