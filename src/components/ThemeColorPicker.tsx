import { useState, useRef, useEffect } from "react";
import { AiWord } from "@/components/brand/AiWord";
import { Palette, Check, Sun, Moon } from "lucide-react";
import { THEME_OPTIONS, ThemeOption } from "@/lib/theme";
import { useThemeColor } from "@/hooks/useThemeColor";

interface ThemeColorPickerProps {
  compact?: boolean;
  align?: "left" | "right";
}

export function ThemeColorPicker({ compact = false, align = "right" }: ThemeColorPickerProps) {
  const { theme, setTheme, mode, setMode, toggleMode } = useThemeColor();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("All");
  const containerRef = useRef<HTMLDivElement>(null);

  const activeOption = THEME_OPTIONS.find((t) => t.id === theme) ?? THEME_OPTIONS[0]!;

  const categories = ["All", "Vibrant", "Neon", "Monochrome", "Nature"];

  const filteredOptions = activeTab === "All" 
    ? THEME_OPTIONS 
    : THEME_OPTIONS.filter(opt => opt.category === activeTab);

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
    <div
      className="relative inline-flex items-center gap-1.5 shrink-0"
      ref={containerRef}
      data-allow-guest="true"
    >
      {/* 1. Light / Dark Mode Toggle Button */}
      <button
        type="button"
        onClick={toggleMode}
        className="flex size-9 items-center justify-center rounded-none border border-[#625B52] bg-[#2C2724] text-[#EAE6DF] transition-all hover:border-primary hover:text-white active:scale-95 shrink-0 cursor-pointer"
        title={mode === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
        aria-label="Toggle dark and light appearance mode"
      >
        {mode === "dark" ? (
          <Sun className="size-4 text-primary hover:rotate-45 transition-transform" />
        ) : (
          <Moon className="size-4 text-[#EAE6DF] hover:-rotate-12 transition-transform" />
        )}
      </button>

      {/* 2. Color Palette Selector Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex size-9 items-center justify-center rounded-none border border-[#625B52] bg-[#2C2724] text-[#EAE6DF] transition-all hover:border-primary hover:text-white active:scale-95 shrink-0 cursor-pointer ${
          isOpen ? "ring-1 ring-primary border-primary" : ""
        }`}
        title={`Theme Accent: ${activeOption.name} (${activeOption.label})`}
        aria-label="Select Color Theme"
      >
        <span className="flex items-center justify-center gap-1">
          <span
            className="relative size-2.5 rounded-none shadow-xs ring-1 ring-white/25 shrink-0"
            style={{ backgroundColor: activeOption.previewColor }}
          >
            <span
              className="absolute -bottom-0.5 -right-0.5 size-1.5 rounded-full border border-black/40"
              style={{ backgroundColor: activeOption.complementColor }}
            />
          </span>
          <Palette className="size-3 text-[#EAE6DF] shrink-0" />
        </span>
      </button>

      {/* Expanded Theme Popover */}
      {isOpen && (
        <div
          data-modal-overlay="true"
          className={`absolute top-full mt-2 z-[100] w-72 max-w-[calc(100vw-1.5rem)] rounded-2xl border border-border/80 bg-popover/98 p-3.5 shadow-2xl backdrop-blur-2xl animate-fade ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {/* Header & Appearance Mode Toggle */}
          <div className="mb-3 border-b border-border/60 pb-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <AiWord className="size-3 text-primary" /> Appearance & Theme
              </span>
              <span className="text-[10px] font-mono font-bold text-primary">
                {THEME_OPTIONS.length} Themes
              </span>
            </div>

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
                <span>Dark Mode</span>
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
                <span>Light Mode</span>
              </button>
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto pb-2 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveTab(cat)}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-mono whitespace-nowrap transition-all ${
                  activeTab === cat
                    ? "bg-primary/20 text-primary font-bold border border-primary/30"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* 12 Color Theme Options Grid */}
          <div className="grid grid-cols-1 gap-1 max-h-64 overflow-y-auto pr-1">
            {filteredOptions.map((opt) => {
              const isSelected = opt.id === theme;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setTheme(opt.id);
                    setIsOpen(false);
                  }}
                  className={`group flex items-center justify-between rounded-xl px-2.5 py-2 text-xs font-mono transition-all text-left ${
                    isSelected
                      ? "bg-primary/20 text-foreground font-bold border border-primary/40 shadow-xs"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="relative flex items-center justify-center size-4 shrink-0">
                      <span
                        className="absolute size-4 rounded-full border border-white/20 shadow-xs transition-transform group-hover:scale-110"
                        style={{ background: opt.gradient || opt.previewColor }}
                      />
                      <span
                        className="absolute -bottom-1 -right-1 size-2 rounded-full border border-background shadow-xs"
                        style={{ backgroundColor: opt.complementColor }}
                        title={`Pairs with complementary ${opt.complementColor}`}
                      />
                    </span>
                    <div className="min-w-0">
                      <div className="truncate font-sans font-semibold text-xs leading-tight">
                        {opt.name}
                      </div>
                      <div className="text-[10px] text-muted-foreground/80 font-mono truncate">
                        {opt.label}
                      </div>
                    </div>
                  </div>

                  {isSelected && <Check className="size-3.5 text-primary shrink-0 ml-2" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
