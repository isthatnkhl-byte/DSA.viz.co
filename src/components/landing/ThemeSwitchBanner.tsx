import { Moon, Sun, Sparkles } from "lucide-react";
import { useThemeColor } from "@/hooks/useThemeColor";
import { THEME_OPTIONS } from "@/lib/theme";

export function ThemeSwitchBanner() {
  const { theme, setTheme, mode, setMode } = useThemeColor();

  const activeOption = THEME_OPTIONS.find((t) => t.id === theme) ?? THEME_OPTIONS[0]!;

  return (
    <div className="inline-flex flex-wrap items-center justify-center gap-2.5 rounded-2xl border border-border/80 bg-card/85 px-3 py-1.5 backdrop-blur-md shadow-lg transition-all">
      {/* Appearance Mode Pill Switch (Dark / Light) */}
      <div className="inline-flex items-center gap-1 rounded-xl bg-background/80 p-0.5 border border-border/60 shrink-0">
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
          title="Switch to Light Mode"
        >
          <Sun className="size-3.5" />
          <span>Light</span>
        </button>
      </div>

      <div className="hidden sm:block h-4 w-px bg-border/60" />

      {/* Color Palette Dots */}
      <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 max-w-full">
        <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground hidden lg:flex items-center gap-1 mr-1 shrink-0">
          <Sparkles className="size-3 text-primary" /> {activeOption.name}
        </span>
        <div className="flex items-center gap-1.5">
          {THEME_OPTIONS.map((opt) => {
            const isSelected = opt.id === theme;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setTheme(opt.id)}
                className={`group relative size-5 rounded-full transition-all flex items-center justify-center shrink-0 ${
                  isSelected
                    ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-110 shadow-md"
                    : "opacity-75 hover:opacity-100 hover:scale-110"
                }`}
                style={{ background: opt.gradient || opt.previewColor }}
                title={`${opt.name}: ${opt.label}`}
              >
                <span 
                  className="absolute bottom-0 right-0 size-2 rounded-full border border-background shadow-2xs"
                  style={{ backgroundColor: opt.accentColor }}
                />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
