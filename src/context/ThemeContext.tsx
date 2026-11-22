// Render-phase palette application is intentional (see `applyPalette` below),
// so keep React Compiler from memoizing this provider away.
"use no memo";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AppState, useColorScheme } from "react-native";

import {
  addWallpaperColorsListener,
  getDynamicPalette,
  setSystemBarTone,
} from "@/modules/DynamicColorModule";
import {
  applyPalette,
  getPalette,
  type ColorMode,
  type PaletteColors,
} from "@/src/constants/theme";
import {
  getSettings,
  updateSettings,
  type AppSettings,
  type ThemeMode,
  type ThemePalette,
} from "@/src/scripts/settings";

interface ThemeContextValue {
  /** Resolved appearance, after applying system/light/dark preference. */
  isDark: boolean;
  colorScheme: ColorMode;
  palette: PaletteColors;
  /** True when wallpaper colors were successfully obtained for the current mode. */
  dynamicActive: boolean;
  useSystemTheme: boolean;
  themePalette: ThemePalette;
  themeMode: ThemeMode;
  setUseSystemTheme: (value: boolean) => Promise<void>;
  setThemePalette: (value: ThemePalette) => Promise<void>;
  setThemeMode: (value: ThemeMode) => Promise<void>;
}

interface DynamicResult {
  palette: PaletteColors;
  dark: boolean;
}

const PALETTE_KEYS: (keyof PaletteColors)[] = [
  "primary",
  "primaryContainer",
  "onPrimaryContainer",
  "secondary",
  "accent",
  "background",
  "surface",
  "surfaceContainer",
  "surfaceContainerHigh",
  "surfaceContainerHighest",
  "text",
  "subtext",
  "white",
  "error",
  "success",
  "border",
  "outlineVariant",
  "glow",
];

function isPaletteColors(value: unknown): value is PaletteColors {
  if (!value || typeof value !== "object") return false;
  return PALETTE_KEYS.every((key) => typeof (value as Record<string, unknown>)[key] === "string");
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [dynamic, setDynamic] = useState<DynamicResult | null>(null);
  const requestIdRef = useRef(0);
  const systemScheme = useColorScheme();

  const themeMode: ThemeMode = settings?.themeMode ?? "system";
  const themePalette: ThemePalette = settings?.themePalette ?? "cyan";
  const useSystemTheme = settings?.useSystemTheme ?? true;
  const isDark = themeMode === "system" ? systemScheme === "dark" : themeMode === "dark";

  useEffect(() => {
    let mounted = true;
    getSettings().then((loaded) => {
      if (mounted) setSettings(loaded);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const refreshDynamic = useCallback(async (dark: boolean) => {
    const requestId = ++requestIdRef.current;
    const native = await getDynamicPalette(dark);
    // Ignore a late response from a previous mode / a previous toggle.
    if (requestId !== requestIdRef.current) return;
    setDynamic(native && isPaletteColors(native) ? { palette: native, dark } : null);
  }, []);

  useEffect(() => {
    if (!settings) return;
    if (!useSystemTheme) {
      // Invalidate in-flight results so re-enabling does not restore stale colors.
      requestIdRef.current++;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sync external native state
      setDynamic(null);
      return;
    }
    // Async query to the native wallpaper-color service, not a sync state update.
    void refreshDynamic(isDark);
  }, [settings, useSystemTheme, isDark, refreshDynamic]);

  useEffect(() => {
    if (!settings || !useSystemTheme) return;
    const unsubscribe = addWallpaperColorsListener(() => void refreshDynamic(isDark));
    const appState = AppState.addEventListener("change", (state) => {
      if (state === "active") void refreshDynamic(isDark);
    });
    return () => {
      unsubscribe();
      appState.remove();
    };
  }, [settings, useSystemTheme, isDark, refreshDynamic]);

  const dynamicForMode = useSystemTheme && dynamic?.dark === isDark ? dynamic.palette : null;
  const palette = dynamicForMode ?? getPalette(themePalette, isDark ? "dark" : "light");
  // Apply before children render. `useStyles` memoizes on palette identity, so
  // all RN styles see the same palette as the native `colorScheme` prop.
  applyPalette(palette);

  useEffect(() => {
    // Keep the Android status/navigation bars in the same tone as the app.
    void setSystemBarTone(palette.background, isDark);
  }, [palette, isDark]);

  const setValue = useCallback(
    async <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
      const updated = await updateSettings({ [key]: value } as Partial<AppSettings>);
      setSettings(updated);
    },
    [],
  );

  const value = useMemo<ThemeContextValue>(
    () => ({
      isDark,
      colorScheme: isDark ? "dark" : "light",
      palette,
      dynamicActive: !!dynamicForMode,
      useSystemTheme,
      themePalette,
      themeMode,
      setUseSystemTheme: (v) => setValue("useSystemTheme", v),
      setThemePalette: (v) => setValue("themePalette", v),
      setThemeMode: (v) => setValue("themeMode", v),
    }),
    [isDark, palette, dynamicForMode, useSystemTheme, themePalette, themeMode, setValue],
  );

  if (!settings) return null;

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useTheme must be used inside <ThemeProvider>");
  return value;
}
