import { useEffect, useState, useCallback } from "react";
import {
  type ThemeColor,
  type ThemeMode,
  THEME_COLOR_KEY,
  THEME_MODE_KEY,
  THEME_CHANGE_EVENT,
  getStoredThemeColor,
  getStoredThemeMode,
  applyThemeColor,
  applyThemeMode,
} from "@/lib/theme";

export function useThemeColor() {
  const [theme, setThemeState] = useState<ThemeColor>(getStoredThemeColor);
  const [mode, setModeState] = useState<ThemeMode>(getStoredThemeMode);

  useEffect(() => {
    const currentColor = getStoredThemeColor();
    const currentMode = getStoredThemeMode();

    setThemeState(currentColor);
    setModeState(currentMode);

    applyThemeColor(currentColor);
    applyThemeMode(currentMode);

    const onStorage = (e: StorageEvent) => {
      if (e.key === THEME_COLOR_KEY && e.newValue) {
        setThemeState(e.newValue as ThemeColor);
        document.documentElement.setAttribute("data-theme", e.newValue);
      } else if (e.key === THEME_MODE_KEY && e.newValue) {
        const nextMode = e.newValue as ThemeMode;
        setModeState(nextMode);
        document.documentElement.classList.remove("dark", "light");
        document.documentElement.classList.add(nextMode);
      }
    };

    const onCustomThemeChange = (e: Event) => {
      const detail = (e as CustomEvent<{ color?: ThemeColor; mode?: ThemeMode }>).detail;
      if (detail?.color) {
        setThemeState(detail.color);
      }
      if (detail?.mode) {
        setModeState(detail.mode);
      }
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener(THEME_CHANGE_EVENT, onCustomThemeChange);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(THEME_CHANGE_EVENT, onCustomThemeChange);
    };
  }, []);

  const setTheme = useCallback((newTheme: ThemeColor) => {
    setThemeState(newTheme);
    applyThemeColor(newTheme);
  }, []);

  const setMode = useCallback((newMode: ThemeMode) => {
    setModeState(newMode);
    applyThemeMode(newMode);
  }, []);

  const toggleMode = useCallback(() => {
    const nextMode = mode === "dark" ? "light" : "dark";
    setModeState(nextMode);
    applyThemeMode(nextMode);
  }, [mode]);

  return {
    theme,
    setTheme,
    mode,
    setMode,
    toggleMode,
    isDark: mode === "dark",
    isLight: mode === "light",
  };
}
