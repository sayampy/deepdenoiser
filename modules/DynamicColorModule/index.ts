import { Platform } from "react-native";

import NativeDynamicColorModule from "./src/DynamicColorModule";
import type {
  DynamicColorModuleEvents,
  DynamicPaletteMap,
  WallpaperSeeds,
} from "./src/DynamicColorModule.types";

export * from "./src/DynamicColorModule.types";

/** Material You wallpaper colors require Android 12 (API 31) or newer. */
export function isDynamicColorSupported(): boolean {
  return Platform.OS === "android" && Number(Platform.Version) >= 31;
}

/** Returns null whenever a wallpaper-derived palette is unavailable. */
export async function getDynamicPalette(isDark: boolean): Promise<DynamicPaletteMap | null> {
  if (!isDynamicColorSupported()) return null;
  try {
    return await NativeDynamicColorModule.getDynamicPalette(isDark);
  } catch (error) {
    console.warn("[DynamicColorModule] getDynamicPalette failed", error);
    return null;
  }
}

export async function getWallpaperSeedColors(): Promise<WallpaperSeeds | null> {
  if (!isDynamicColorSupported()) return null;
  try {
    return await NativeDynamicColorModule.getWallpaperSeedColors();
  } catch (error) {
    console.warn("[DynamicColorModule] getWallpaperSeedColors failed", error);
    return null;
  }
}

/** Match the Android system bars to the active palette so they do not stay
 * light gray while the app itself is dark. */
export async function setSystemBarTone(color: string, isDark: boolean): Promise<void> {
  if (Platform.OS !== "android") return;
  if (typeof NativeDynamicColorModule.setSystemBarTone !== "function") return;
  try {
    await NativeDynamicColorModule.setSystemBarTone(color, isDark);
  } catch (error) {
    console.warn("[DynamicColorModule] setSystemBarTone failed", error);
  }
}

export function addWallpaperColorsListener(
  listener: DynamicColorModuleEvents["onWallpaperColorsChanged"],
): () => void {
  if (!isDynamicColorSupported()) return () => {};
  const subscription = NativeDynamicColorModule.addListener("onWallpaperColorsChanged", listener);
  return () => subscription.remove();
}
