import { Moon, Sun, Palette } from "lucide-react";
import { useThemeColor } from "@/hooks/useThemeColor";
import { THEME_OPTIONS } from "@/lib/theme";

export function ThemeSwitchBanner() {
  const { theme, setTheme, mode, setMode } = useThemeColor();

  return (
    <div className="inline-flex flex-wrap items-center gap-2 rounded-2xl border border-border/80 bg-card/85 p-1.5 backdrop-blur-md shadow-sm">
      {/* Appearance Mode Pill Switch (Dark / Light) */}
      <div className="inline-flex items-center gap-1 rounded-xl bg-background/80 p-0.5 border border-border/60">
        <button
          type="button"
          onClick={() => setMode("dark")}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono transition-all ${
            mode === "dark"
              ? "bg-primary text-primary-foreground font-bold shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
          title="Switch to Dark Mode"
        >
          <Moon className="size-3.5" />
          <span>Dark</span>
        </button>

        <button
          type="button"
          onClick={() => setMode("light")}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono transition-all ${
            mode === "light"
              ? "bg-primary text-primary-foreground font-bold shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
          title="Switch to Light / Warm Crème Mode"
        >
          <Sun className="size-3.5" />
          <span>Light</span>
        </button>
      </div>

      <div className="hidden sm:block h-4 w-px bg-border/60" />

      {/* Color Palette Dots */}
      <div className="flex items-center gap-1 px-1">
        <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground hidden md:inline mr-1">
          Glow:
        </span>
        {THEME_OPTIONS.slice(0, 5).map((opt) => {
          const isSelected = opt.id === theme;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => setTheme(opt.id)}
              className={`size-5 rounded-full transition-all flex items-center justify-center ${
                isSelected
                  ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-110 shadow-sm"
                  : "opacity-70 hover:opacity-100 hover:scale-105"
              }`}
              style={{ backgroundColor: opt.previewColor }}
              title={`Accent Color: ${opt.name}`}
            />
          );
        })}
      </div>
    </div>
  );
}
