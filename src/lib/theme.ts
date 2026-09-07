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
  category?: "Vibrant" | "Neon" | "Monochrome" | "Nature";
}

export const THEME_COLOR_KEY = "dsaviz:theme_color";
export const THEME_MODE_KEY = "dsaviz:color_mode";
export const DEFAULT_COLOR: ThemeColor = "purple";
export const DEFAULT_MODE: ThemeMode = "dark";

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: "purple",
    name: "Royal Purple",
    label: "Royal Purple & Amethyst",
    previewColor: "oklch(0.74 0.20 295)",
    accentColor: "oklch(0.72 0.16 230)",
    category: "Vibrant",
  },
  {
    id: "cyan",
    name: "Electric Cyan",
    label: "Electric Cyan & Neon Teal",
    previewColor: "oklch(0.78 0.15 205)",
    accentColor: "oklch(0.70 0.17 275)",
    category: "Neon",
  },
  {
    id: "emerald",
    name: "Matrix Green",
    label: "Matrix Green & Jade",
    previewColor: "oklch(0.76 0.18 150)",
    accentColor: "oklch(0.74 0.16 200)",
    category: "Nature",
  },
  {
    id: "amber",
    name: "Sunset Amber",
    label: "Sunset Amber & Fire Orange",
    previewColor: "oklch(0.80 0.17 65)",
    accentColor: "oklch(0.70 0.20 340)",
    category: "Vibrant",
  },
  {
    id: "crimson",
    name: "Crimson Red",
    label: "Crimson Red & Ruby Magenta",
    previewColor: "oklch(0.70 0.22 25)",
    accentColor: "oklch(0.65 0.22 345)",
    category: "Vibrant",
  },
  {
    id: "rose",
    name: "Neon Rose",
    label: "Neon Rose & Hot Pink",
    previewColor: "oklch(0.75 0.22 345)",
    accentColor: "oklch(0.76 0.16 200)",
    category: "Neon",
  },
  {
    id: "blue",
    name: "Sapphire Blue",
    label: "Sapphire Blue & Sky Azure",
    previewColor: "oklch(0.72 0.18 245)",
    accentColor: "oklch(0.78 0.15 190)",
    category: "Vibrant",
  },
  {
    id: "cyberpunk",
    name: "Cyberpunk Neon",
    label: "Hot Magenta & Cyan Glow",
    previewColor: "oklch(0.72 0.26 325)",
    accentColor: "oklch(0.80 0.18 195)",
    category: "Neon",
  },
  {
    id: "obsidian",
    name: "Midnight Stealth",
    label: "Midnight Obsidian & Platinum",
    previewColor: "oklch(0.85 0.02 260)",
    accentColor: "oklch(0.70 0.15 280)",
    category: "Monochrome",
  },
  {
    id: "solar",
    name: "Solar Flare",
    label: "Solar Gold & Neon Lime",
    previewColor: "oklch(0.85 0.19 90)",
    accentColor: "oklch(0.78 0.20 130)",
    category: "Vibrant",
  },
  {
    id: "aether",
    name: "Aether Violet",
    label: "Lavender Mist & Iris Glow",
    previewColor: "oklch(0.78 0.16 280)",
    accentColor: "oklch(0.76 0.22 320)",
    category: "Vibrant",
  },
  {
    id: "sage",
    name: "Forest Sage",
    label: "Deep Pine & Sage Mint",
    previewColor: "oklch(0.75 0.14 165)",
    accentColor: "oklch(0.72 0.18 140)",
    category: "Nature",
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
