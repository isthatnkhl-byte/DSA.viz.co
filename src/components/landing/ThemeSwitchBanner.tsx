import { Moon, Sun } from "lucide-react";
import { useThemeColor } from "@/hooks/useThemeColor";
import { THEME_OPTIONS, type ThemeColor } from "@/lib/theme";

// The 7 curated signature hues showcased in the hero pill (matches reference screenshot)
const HERO_THEME_IDS: ThemeColor[] = [
  "purple",
  "cyan",
  "emerald",
  "amber",
  "crimson",
  "rose",
  "blue",
];

export function ThemeSwitchBanner() {
  const { theme, setTheme, mode, setMode } = useThemeColor();

  const heroThemes = HERO_THEME_IDS.map(
    (id) => THEME_OPTIONS.find((t) => t.id === id) || THEME_OPTIONS[0]!
  );

  return (
    <div className="inline-flex items-center gap-2.5 sm:gap-3.5 rounded-full border border-border/80 bg-card/90 px-3.5 sm:px-4 py-1.5 shadow-sm backdrop-blur-md transition-all">
      {/* Segmented Dark / Light Mode Pill */}
      <div className="inline-flex items-center gap-1 rounded-full bg-background/80 p-0.5 border border-border/60 shrink-0">
        <button
          type="button"
          onClick={() => setMode("dark")}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium transition-all ${
            mode === "dark"
              ? "bg-primary text-primary-foreground font-bold shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
          title="Switch to Dark Mode"
          aria-label="Dark Mode"
        >
          <Moon className="size-3.5" />
          <span>Dark</span>
        </button>

        <button
          type="button"
          onClick={() => setMode("light")}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium transition-all ${
            mode === "light"
              ? "bg-primary text-primary-foreground font-bold shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
          title="Switch to Light Mode"
          aria-label="Light Mode"
        >
          <Sun className="size-3.5" />
          <span>Light</span>
        </button>
      </div>

      <div className="h-4 w-px bg-border/60 shrink-0" />

      {/* 7 Clean Circular Color Palette Dots */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {heroThemes.map((opt) => {
          const isSelected = opt.id === theme;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => setTheme(opt.id)}
              className={`relative size-4.5 sm:size-5 rounded-full transition-all duration-200 cursor-pointer flex items-center justify-center shrink-0 ${
                isSelected
                  ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-110 shadow-xs"
                  : "opacity-80 hover:opacity-100 hover:scale-110"
              }`}
              style={{ background: opt.previewColor }}
              title={`${opt.name}: ${opt.label}`}
              aria-label={`Select ${opt.name} theme`}
            />
          );
        })}
      </div>
    </div>
  );
}
