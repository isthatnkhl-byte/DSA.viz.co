import React from "react";
import { useLocation } from "@tanstack/react-router";
import { useNotesBag } from "@/context/NotesBagContext";
import { NotesBagDrawer } from "./NotesBagDrawer";
import { BookmarkCheck, Sparkles } from "lucide-react";

export const NotesBagFloatingButton: React.FC = () => {
  const location = useLocation();
  const { items, toggleDrawer } = useNotesBag();

  // EXCLUSION RULE: Strictly exclude from AI Interview (/live-interview)
  if (location.pathname.startsWith("/live-interview")) {
    return null;
  }

  return (
    <>
      <div className="fixed bottom-6 left-6 z-40 select-none">
        <button
          type="button"
          onClick={toggleDrawer}
          className="group flex items-center gap-2 px-3.5 py-2.5 rounded-full border-2 border-border bg-card/95 hover:bg-card text-foreground shadow-2xl backdrop-blur-md transition-all hover:scale-105 hover:border-primary active:scale-95 cursor-pointer font-mono"
          title="Open Notes Bag & Handwritten PDF Compiler"
        >
          <div className="relative flex items-center justify-center size-6 rounded-full bg-primary/15 text-primary text-xs font-bold">
            🎒
            {items.length > 0 && (
              <span className="absolute -top-1 -right-1.5 size-4 rounded-full bg-primary text-primary-foreground text-[9px] font-extrabold flex items-center justify-center border border-card shadow-xs">
                {items.length}
              </span>
            )}
          </div>
          <div className="flex flex-col text-left">
            <span className="text-xs font-bold leading-tight flex items-center gap-1 text-foreground">
              <span>Notes Bag</span>
              <span className="text-[10px] text-primary font-semibold">({items.length})</span>
            </span>
            <span className="text-[9px] text-muted-foreground leading-none">
              AI Handwritten PDF
            </span>
          </div>
        </button>
      </div>

      {/* Slide-out quick drawer */}
      <NotesBagDrawer />
    </>
  );
};
