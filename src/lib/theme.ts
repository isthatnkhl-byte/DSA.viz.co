export type ThemeColor =
  | "purple"
  | "cyan"
  | "emerald"
  | "amber"
  | "crimson"
  | "rose"
  | "blue"
  | "obsidian"
  | "solar"
  | "aether"
  | "cyberpunk"
  | "sage";

export type ThemeMode = "dark" | "light";

export interface ThemeOption {
  id: ThemeColor;
  name: string;
  label: string;
  previewColor: string;
  accentColor: string;
  complementColor?: string;
  tertiaryColor?: string;
  gradient?: string;
  category?: "Vibrant" | "Neon" | "Monochrome" | "Nature";
}

export const THEME_COLOR_KEY = "dsaviz:theme_color";
export const THEME_MODE_KEY = "dsaviz:color_mode_print_tech";
export const DEFAULT_COLOR: ThemeColor = "purple";
export const DEFAULT_MODE: ThemeMode = "light";
export const THEME_CHANGE_EVENT = "dsaviz:theme-change";

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: "amber",
    name: "Print-Tech Vermilion",
    label: "Burnt Vermilion & Prussian Teal",
    previewColor: "oklch(0.63 0.21 38)",
    accentColor: "oklch(0.60 0.16 215)",
    complementColor: "oklch(0.60 0.16 215)",
    gradient: "linear-gradient(135deg in oklab, oklch(0.63 0.21 38) 0%, oklch(0.60 0.16 215) 100%)",
    category: "Vibrant",
  },
  {
    id: "purple",
    name: "Royal Amethyst",
    label: "Royal Violet & Marigold Gold",
    previewColor: "oklch(0.62 0.24 292)",
    accentColor: "oklch(0.76 0.19 75)",
    complementColor: "oklch(0.76 0.19 75)",
    gradient: "linear-gradient(135deg in oklab, oklch(0.62 0.24 292) 0%, oklch(0.76 0.19 75) 100%)",
    category: "Vibrant",
  },
  {
    id: "cyan",
    name: "Cerulean & Coral",
    label: "Electric Cerulean & Warm Coral",
    previewColor: "oklch(0.64 0.18 208)",
    accentColor: "oklch(0.65 0.22 32)",
    complementColor: "oklch(0.65 0.22 32)",
    gradient: "linear-gradient(135deg in oklab, oklch(0.64 0.18 208) 0%, oklch(0.65 0.22 32) 100%)",
    category: "Neon",
  },
  {
    id: "emerald",
    name: "Viridian & Berry",
    label: "Viridian Emerald & Berry Magenta",
    previewColor: "oklch(0.62 0.19 158)",
    accentColor: "oklch(0.62 0.24 345)",
    complementColor: "oklch(0.62 0.24 345)",
    gradient: "linear-gradient(135deg in oklab, oklch(0.62 0.19 158) 0%, oklch(0.62 0.24 345) 100%)",
    category: "Nature",
  },
  {
    id: "crimson",
    name: "Crimson & Gold",
    label: "Crimson Ruby & Imperial Gold",
    previewColor: "oklch(0.65 0.24 25)",
    accentColor: "oklch(0.79 0.175 68)",
    complementColor: "oklch(0.79 0.175 68)",
    gradient: "linear-gradient(135deg in oklab, oklch(0.65 0.24 25) 0%, oklch(0.79 0.175 68) 100%)",
    category: "Vibrant",
  },
  {
    id: "blue",
    name: "Cobalt & Tangerine",
    label: "Ultramarine Cobalt & Warm Ochre",
    previewColor: "oklch(0.58 0.22 255)",
    accentColor: "oklch(0.68 0.20 55)",
    complementColor: "oklch(0.68 0.20 55)",
    gradient: "linear-gradient(135deg in oklab, oklch(0.58 0.22 255) 0%, oklch(0.68 0.20 55) 100%)",
    category: "Vibrant",
  },
  {
    id: "rose",
    name: "Carmine & Jade",
    label: "Rose Carmine & Forest Jade",
    previewColor: "oklch(0.62 0.24 348)",
    accentColor: "oklch(0.64 0.18 165)",
    complementColor: "oklch(0.64 0.18 165)",
    gradient: "linear-gradient(135deg in oklab, oklch(0.62 0.24 348) 0%, oklch(0.64 0.18 165) 100%)",
    category: "Neon",
  },
  {
    id: "cyberpunk",
    name: "Cyberpunk Synth",
    label: "Laser Magenta & Acid Cyan",
    previewColor: "oklch(0.64 0.27 328)",
    accentColor: "oklch(0.74 0.19 195)",
    complementColor: "oklch(0.74 0.19 195)",
    gradient: "linear-gradient(135deg in oklab, oklch(0.64 0.27 328) 0%, oklch(0.74 0.19 195) 100%)",
    category: "Neon",
  },
  {
    id: "solar",
    name: "Solar & Ultramarine",
    label: "Ochre Gold & Deep Indigo",
    previewColor: "oklch(0.68 0.19 70)",
    accentColor: "oklch(0.56 0.23 275)",
    complementColor: "oklch(0.56 0.23 275)",
    gradient: "linear-gradient(135deg in oklab, oklch(0.68 0.19 70) 0%, oklch(0.56 0.23 275) 100%)",
    category: "Vibrant",
  },
  {
    id: "sage",
    name: "Botanical & Terracotta",
    label: "Forest Sage & Copper Rust",
    previewColor: "oklch(0.58 0.15 162)",
    accentColor: "oklch(0.62 0.20 38)",
    complementColor: "oklch(0.62 0.20 38)",
    gradient: "linear-gradient(135deg in oklab, oklch(0.58 0.15 162) 0%, oklch(0.62 0.20 38) 100%)",
    category: "Nature",
  },
  {
    id: "aether",
    name: "Iris & Apricot",
    label: "Iris Violet & Warm Apricot",
    previewColor: "oklch(0.60 0.22 278)",
    accentColor: "oklch(0.68 0.19 48)",
    complementColor: "oklch(0.68 0.19 48)",
    gradient: "linear-gradient(135deg in oklab, oklch(0.60 0.22 278) 0%, oklch(0.68 0.19 48) 100%)",
    category: "Vibrant",
  },
  {
    id: "obsidian",
    name: "Obsidian & Vermilion",
    label: "Carbon Ink & Vermilion Spark",
    previewColor: "oklch(0.62 0.21 35)",
    accentColor: "oklch(0.64 0.16 215)",
    complementColor: "oklch(0.64 0.16 215)",
    gradient: "linear-gradient(135deg in oklab, oklch(0.62 0.21 35) 0%, oklch(0.64 0.16 215) 100%)",
    category: "Monochrome",
  },
];

export function getStoredThemeColor(): ThemeColor {
  if (typeof window === "undefined") return DEFAULT_COLOR;
  try {
    const raw = window.localStorage.getItem(THEME_COLOR_KEY) as ThemeColor | null;
    if (raw && THEME_OPTIONS.some((t) => t.id === raw)) {
      return raw;
    }
  } catch {
    /* fallback */
  }
  return DEFAULT_COLOR;
}

export function getStoredThemeMode(): ThemeMode {
  if (typeof window === "undefined") return DEFAULT_MODE;
  try {
    const raw = window.localStorage.getItem(THEME_MODE_KEY) as ThemeMode | null;
    if (raw === "dark" || raw === "light") {
      return raw;
    }
  } catch {
    /* fallback */
  }
  return DEFAULT_MODE;
}

// Backwards-compatible aliases
export const getStoredTheme = getStoredThemeColor;
export const THEME_STORAGE_KEY = THEME_COLOR_KEY;
export const DEFAULT_THEME = DEFAULT_COLOR;

export function applyThemeColor(color: ThemeColor) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", color);
  try {
    window.localStorage.setItem(THEME_COLOR_KEY, color);
    window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { detail: { color } }));
  } catch {
    /* ignore */
  }
}

export function applyThemeMode(mode: ThemeMode) {
  if (typeof document === "undefined") return;
  if (mode === "light") {
    document.documentElement.classList.remove("dark");
    document.documentElement.classList.add("light");
  } else {
    document.documentElement.classList.remove("light");
    document.documentElement.classList.add("dark");
  }
  try {
    window.localStorage.setItem(THEME_MODE_KEY, mode);
    window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { detail: { mode } }));
  } catch {
    /* ignore */
  }
}

export function applyTheme(color: ThemeColor, mode?: ThemeMode) {
  applyThemeColor(color);
  if (mode) {
    applyThemeMode(mode);
  }
}
