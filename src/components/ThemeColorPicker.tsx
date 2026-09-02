import { useState, useRef, useEffect } from "react";
import { Palette, Check, Sun, Moon } from "lucide-react";
import { THEME_OPTIONS } from "@/lib/theme";
import { useThemeColor } from "@/hooks/useThemeColor";

interface ThemeColorPickerProps {
  compact?: boolean;
  align?: "left" | "right";
}

export function ThemeColorPicker({ compact = false, align = "right" }: ThemeColorPickerProps) {
  const { theme, setTheme, mode, setMode, toggleMode } = useThemeColor();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeOption = THEME_OPTIONS.find((t) => t.id === theme) ?? THEME_OPTIONS[0]!;

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isOpen]);

  return (
    <div className="relative inline-flex items-center gap-1 shrink-0" ref={containerRef}>
      {/* 1. Dedicated Light / Dark Mode Toggle Button */}
      <button
        type="button"
        onClick={toggleMode}
        className="flex size-8 items-center justify-center rounded-xl border border-border/70 bg-card/60 text-muted-foreground transition-all hover:bg-secondary hover:text-foreground active:scale-95 shadow-xs shrink-0"
        title={mode === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
        aria-label="Toggle dark and light appearance mode"
      >
        {mode === "dark" ? (
          <Sun className="size-3.5 text-amber-400 hover:rotate-45 transition-transform" />
        ) : (
          <Moon className="size-3.5 text-primary hover:-rotate-12 transition-transform" />
        )}
      </button>

      {/* 2. Color Palette Selector Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex h-8 items-center gap-1.5 rounded-xl border border-border/70 bg-card/60 px-2 text-xs font-mono font-semibold transition-all hover:bg-secondary hover:text-foreground active:scale-95 shadow-xs shrink-0 ${
          isOpen ? "ring-2 ring-primary/40 border-primary/50" : ""
        }`}
        title={`Accent Color: ${activeOption.label}`}
      >
        <span
          className="size-3 rounded-full shadow-xs"
          style={{ backgroundColor: activeOption.previewColor }}
        />
        {!compact && (
          <span className="hidden xl:inline text-[11px] text-muted-foreground hover:text-foreground font-sans">
            {activeOption.name}
          </span>
        )}
        <Palette className="size-3 text-muted-foreground shrink-0" />
      </button>

      {/* Floating Theme & Appearance Selector Popover */}
      {isOpen && (
        <div
          className={`absolute top-full mt-2 z-50 w-56 max-w-[calc(100vw-1.5rem)] rounded-2xl border border-border/80 bg-popover/95 p-3 shadow-2xl backdrop-blur-xl animate-fade ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {/* Section A: Appearance Mode (Dark vs Light) */}
          <div className="mb-3 border-b border-border/60 pb-2.5">
            <span className="mb-2 block text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
              Appearance Mode
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => setMode("dark")}
                className={`flex items-center justify-center gap-1.5 rounded-xl py-1.5 text-xs font-mono transition-all ${
                  mode === "dark"
                    ? "bg-primary text-primary-foreground font-bold shadow-xs"
                    : "bg-secondary/60 text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                <Moon className="size-3.5" />
                <span>Dark</span>
              </button>

              <button
                type="button"
                onClick={() => setMode("light")}
                className={`flex items-center justify-center gap-1.5 rounded-xl py-1.5 text-xs font-mono transition-all ${
                  mode === "light"
                    ? "bg-primary text-primary-foreground font-bold shadow-xs"
                    : "bg-secondary/60 text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                <Sun className="size-3.5" />
                <span>Light</span>
              </button>
            </div>
          </div>

          {/* Section B: Color Glow & Accent Palette */}
          <div>
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Palette className="size-3 text-primary" /> Accent Color
              </span>
              <span className="text-[10px] font-mono text-primary font-bold">
                {activeOption.name}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-1 max-h-56 overflow-y-auto pr-1">
              {THEME_OPTIONS.map((opt) => {
                const isSelected = opt.id === theme;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setTheme(opt.id);
                      setIsOpen(false);
                    }}
                    className={`flex items-center justify-between rounded-xl px-2.5 py-1.5 text-xs font-mono transition-all text-left ${
                      isSelected
                        ? "bg-primary/20 text-foreground font-bold border border-primary/40 shadow-xs"
                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className="size-3.5 rounded-full border border-white/20 shadow-xs"
                        style={{ backgroundColor: opt.previewColor }}
                      />
                      <span>{opt.name}</span>
                    </div>
                    {isSelected && <Check className="size-3.5 text-primary" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
