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
export const THEME_MODE_KEY = "dsaviz:color_mode";
export const DEFAULT_COLOR: ThemeColor = "purple";
export const DEFAULT_MODE: ThemeMode = "dark";

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: "crimson",
    name: "Crimson Red",
    label: "Crimson Red & Electric Teal",
    previewColor: "oklch(0.72 0.25 25)",
    accentColor: "oklch(0.80 0.18 190)",
    complementColor: "oklch(0.80 0.18 190)",
    tertiaryColor: "oklch(0.84 0.20 160)",
    gradient: "linear-gradient(135deg, oklch(0.76 0.24 20) 0%, oklch(0.70 0.26 355) 45%, oklch(0.80 0.18 190) 100%)",
    category: "Vibrant",
  },
  {
    id: "purple",
    name: "Royal Purple",
    label: "Royal Purple & Sun Amber",
    previewColor: "oklch(0.76 0.24 295)",
    accentColor: "oklch(0.84 0.20 85)",
    complementColor: "oklch(0.84 0.20 85)",
    tertiaryColor: "oklch(0.78 0.18 220)",
    gradient: "linear-gradient(135deg, oklch(0.80 0.24 285) 0%, oklch(0.72 0.26 315) 50%, oklch(0.84 0.20 85) 100%)",
    category: "Vibrant",
  },
  {
    id: "cyan",
    name: "Electric Cyan",
    label: "Electric Cyan & Sunset Coral",
    previewColor: "oklch(0.80 0.18 205)",
    accentColor: "oklch(0.76 0.24 35)",
    complementColor: "oklch(0.76 0.24 35)",
    tertiaryColor: "oklch(0.82 0.20 65)",
    gradient: "linear-gradient(135deg, oklch(0.84 0.18 190) 0%, oklch(0.78 0.17 220) 45%, oklch(0.76 0.24 35) 100%)",
    category: "Neon",
  },
  {
    id: "emerald",
    name: "Matrix Green",
    label: "Matrix Green & Neon Fuchsia",
    previewColor: "oklch(0.78 0.22 155)",
    accentColor: "oklch(0.74 0.26 340)",
    complementColor: "oklch(0.74 0.26 340)",
    tertiaryColor: "oklch(0.80 0.18 205)",
    gradient: "linear-gradient(135deg, oklch(0.84 0.20 145) 0%, oklch(0.78 0.22 165) 50%, oklch(0.74 0.26 340) 100%)",
    category: "Nature",
  },
  {
    id: "amber",
    name: "Sunset Amber",
    label: "Sunset Amber & Sapphire Azure",
    previewColor: "oklch(0.82 0.20 65)",
    accentColor: "oklch(0.74 0.22 255)",
    complementColor: "oklch(0.74 0.22 255)",
    tertiaryColor: "oklch(0.78 0.22 345)",
    gradient: "linear-gradient(135deg, oklch(0.86 0.19 80) 0%, oklch(0.78 0.22 45) 50%, oklch(0.74 0.22 255) 100%)",
    category: "Vibrant",
  },
  {
    id: "rose",
    name: "Neon Rose",
    label: "Neon Rose & Arctic Mint",
    previewColor: "oklch(0.76 0.25 345)",
    accentColor: "oklch(0.82 0.20 165)",
    complementColor: "oklch(0.82 0.20 165)",
    tertiaryColor: "oklch(0.80 0.18 205)",
    gradient: "linear-gradient(135deg, oklch(0.80 0.23 340) 0%, oklch(0.72 0.26 360) 50%, oklch(0.82 0.20 165) 100%)",
    category: "Neon",
  },
  {
    id: "blue",
    name: "Sapphire Blue",
    label: "Sapphire Blue & Solar Amber",
    previewColor: "oklch(0.74 0.22 250)",
    accentColor: "oklch(0.84 0.20 75)",
    complementColor: "oklch(0.84 0.20 75)",
    tertiaryColor: "oklch(0.80 0.18 205)",
    gradient: "linear-gradient(135deg, oklch(0.78 0.20 240) 0%, oklch(0.70 0.24 270) 50%, oklch(0.84 0.20 75) 100%)",
    category: "Vibrant",
  },
  {
    id: "cyberpunk",
    name: "Cyberpunk Neon",
    label: "Hot Magenta & Laser Cyan",
    previewColor: "oklch(0.74 0.28 325)",
    accentColor: "oklch(0.84 0.20 195)",
    complementColor: "oklch(0.84 0.20 195)",
    tertiaryColor: "oklch(0.82 0.22 135)",
    gradient: "linear-gradient(135deg, oklch(0.76 0.28 325) 0%, oklch(0.72 0.26 290) 45%, oklch(0.84 0.20 195) 100%)",
    category: "Neon",
  },
  {
    id: "obsidian",
    name: "Midnight Stealth",
    label: "Titanium Stealth & Prismatic Cyan",
    previewColor: "oklch(0.92 0.02 260)",
    accentColor: "oklch(0.82 0.16 200)",
    complementColor: "oklch(0.82 0.16 200)",
    tertiaryColor: "oklch(0.76 0.22 295)",
    gradient: "linear-gradient(135deg, oklch(0.96 0.01 260) 0%, oklch(0.82 0.05 270) 50%, oklch(0.82 0.16 200) 100%)",
    category: "Monochrome",
  },
  {
    id: "solar",
    name: "Solar Flare",
    label: "Solar Gold & Cosmic Violet",
    previewColor: "oklch(0.86 0.22 90)",
    accentColor: "oklch(0.72 0.24 280)",
    complementColor: "oklch(0.72 0.24 280)",
    tertiaryColor: "oklch(0.82 0.24 65)",
    gradient: "linear-gradient(135deg, oklch(0.90 0.20 95) 0%, oklch(0.82 0.24 65) 50%, oklch(0.72 0.24 280) 100%)",
    category: "Vibrant",
  },
  {
    id: "aether",
    name: "Aether Violet",
    label: "Lavender Mist & Champagne Gold",
    previewColor: "oklch(0.80 0.18 280)",
    accentColor: "oklch(0.85 0.16 95)",
    complementColor: "oklch(0.85 0.16 95)",
    tertiaryColor: "oklch(0.76 0.22 305)",
    gradient: "linear-gradient(135deg, oklch(0.84 0.18 270) 0%, oklch(0.76 0.22 305) 50%, oklch(0.85 0.16 95) 100%)",
    category: "Vibrant",
  },
  {
    id: "sage",
    name: "Forest Sage",
    label: "Alpine Pine & Warm Terracotta",
    previewColor: "oklch(0.78 0.16 165)",
    accentColor: "oklch(0.78 0.20 35)",
    complementColor: "oklch(0.78 0.20 35)",
    tertiaryColor: "oklch(0.80 0.18 195)",
    gradient: "linear-gradient(135deg, oklch(0.82 0.16 160) 0%, oklch(0.76 0.18 140) 50%, oklch(0.78 0.20 35) 100%)",
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
