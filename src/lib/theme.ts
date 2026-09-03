export type ThemeColor =
  | "purple"
  | "cyan"
  | "emerald"
  | "amber"
  | "crimson"
  | "rose"
  | "blue";

export type ThemeMode = "dark" | "light";

export interface ThemeOption {
  id: ThemeColor;
  name: string;
  label: string;
  previewColor: string;
  accentColor: string;
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
  },
  {
    id: "cyan",
    name: "Electric Cyan",
    label: "Electric Cyan & Neon Teal",
    previewColor: "oklch(0.78 0.15 205)",
    accentColor: "oklch(0.70 0.17 275)",
  },
  {
    id: "emerald",
    name: "Matrix Green",
    label: "Matrix Green & Jade",
    previewColor: "oklch(0.76 0.18 150)",
    accentColor: "oklch(0.74 0.16 200)",
  },
  {
    id: "amber",
    name: "Sunset Amber",
    label: "Sunset Amber & Magenta",
    previewColor: "oklch(0.80 0.17 65)",
    accentColor: "oklch(0.70 0.20 340)",
  },
  {
    id: "crimson",
    name: "Crimson Red",
    label: "Crimson Red & Magenta",
    previewColor: "oklch(0.70 0.22 25)",
    accentColor: "oklch(0.65 0.22 345)",
  },
  {
    id: "rose",
    name: "Neon Rose",
    label: "Neon Rose & Pink",
    previewColor: "oklch(0.75 0.22 345)",
    accentColor: "oklch(0.76 0.16 200)",
  },
  {
    id: "blue",
    name: "Sapphire Blue",
    label: "Sapphire Blue & Sky",
    previewColor: "oklch(0.72 0.18 245)",
    accentColor: "oklch(0.78 0.15 190)",
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
