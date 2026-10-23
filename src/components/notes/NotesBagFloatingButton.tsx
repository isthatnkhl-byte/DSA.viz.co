import React, { useState } from "react";
import { useLocation } from "@tanstack/react-router";
import { useNotesBag } from "@/context/NotesBagContext";
import { NotesBagDrawer } from "./NotesBagDrawer";
import { SingleLineBagIcon } from "./SingleLineBagIcon";

export const NotesBagFloatingButton: React.FC = () => {
  const location = useLocation();
  const { items, toggleDrawer } = useNotesBag();
  const [isHovered, setIsHovered] = useState(false);

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
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className="group relative flex items-center h-12 rounded-full border-2 border-border bg-card/95 hover:bg-card text-foreground shadow-2xl backdrop-blur-md transition-all duration-300 hover:scale-105 hover:border-primary active:scale-95 cursor-pointer font-mono px-3.5 focus:outline-none focus:ring-2 focus:ring-primary/40"
          aria-label="AI Notes Bag"
          title="AI Notes Bag"
        >
          {/* Single-line bag logo */}
          <div className="relative flex items-center justify-center text-foreground group-hover:text-primary transition-colors">
            <SingleLineBagIcon className="size-5.5 transition-transform duration-300 group-hover:scale-110" />

            {/* Micro badge count */}
            {items.length > 0 && (
              <span className="absolute -top-2 -right-2 min-w-4 h-4 px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-extrabold flex items-center justify-center border border-card shadow-xs animate-in zoom-in-50">
                {items.length}
              </span>
            )}
          </div>

          {/* Hover expansion label: says "AI Notes Bag" */}
          <div
            className={`overflow-hidden transition-all duration-300 ease-out flex items-center whitespace-nowrap ${
              isHovered ? "max-w-48 opacity-100 ml-2.5" : "max-w-0 opacity-0 ml-0"
            }`}
          >
            <span className="text-xs font-bold tracking-tight text-foreground flex items-center gap-1.5">
              <span>AI Notes Bag</span>
              {items.length > 0 && (
                <span className="text-[10px] font-mono px-1 py-0.2 bg-primary/20 text-primary rounded-xs">
                  {items.length}
                </span>
              )}
            </span>
          </div>

          {/* Floating pill tooltip above on hover for extra visual clarity */}
          <div
            className={`absolute -top-9 left-1/2 -translate-x-1/2 pointer-events-none transition-all duration-200 z-50 ${
              isHovered ? "opacity-100 -translate-y-1" : "opacity-0 translate-y-1"
            }`}
          >
            <div className="px-2.5 py-1 rounded-md bg-foreground text-background text-[10px] font-mono font-bold uppercase tracking-wider shadow-lg whitespace-nowrap flex items-center gap-1">
              <span>AI Notes Bag</span>
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-foreground" />
            </div>
          </div>
        </button>
      </div>

      {/* Slide-out quick drawer with direct JSON/file upload */}
      <NotesBagDrawer />
    </>
  );
};

export default NotesBagFloatingButton;
