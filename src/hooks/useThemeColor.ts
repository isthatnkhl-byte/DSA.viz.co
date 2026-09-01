import { useEffect, useState, useCallback } from "react";
import {
  type ThemeColor,
  type ThemeMode,
  THEME_COLOR_KEY,
  THEME_MODE_KEY,
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
        applyThemeColor(e.newValue as ThemeColor);
      } else if (e.key === THEME_MODE_KEY && e.newValue) {
        setModeState(e.newValue as ThemeMode);
        applyThemeMode(e.newValue as ThemeMode);
      }
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
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
